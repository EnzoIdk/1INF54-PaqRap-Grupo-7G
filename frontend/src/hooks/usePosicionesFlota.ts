import { useMemo } from "react";
import type { EjecucionDto, RutaDto, TipoUnidad, UnidadDto } from "../types/Experimentacion";
import type { EstadoPedidoVisual } from "../utils/constants";

/** Situacion de una unidad de transporte en un instante de la simulacion. */
export interface PosicionUnidad {
  codigoUnidad: string;
  tipoUnidad: TipoUnidad;
  /** Coordenadas interpoladas: pueden caer entre dos nodos de la reticula. */
  x: number;
  y: number;
  /** La unidad aun no ha salido del almacen. */
  enAlmacen: boolean;
  /** La unidad ya completo su ruta. */
  finalizada: boolean;
  /** La unidad esta detenida entregando un pedido. */
  entregando: boolean;
  entregasHechas: number;
  entregasTotales: number;
  cargaRestante: number;
  cargaTotal: number;
  /** Tramo del recorrido ya ejecutado, para dibujarlo en gris. */
  indiceNodoActual: number;
}

/** Situacion de un pedido en un instante de la simulacion. */
export interface EstadoPedidoEnMapa {
  codigoPedido: string;
  clienteId: string;
  x: number;
  y: number;
  cantidadProducto: number;
  plazoHoras: number;
  minutoLimite: number;
  minutoLlegada: number | null;
  codigoUnidad: string | null;
  estado: EstadoPedidoVisual;
}

/**
 * Calcula donde esta cada unidad y en que estado esta cada pedido en el
 * minuto simulado que se pide.
 *
 * <p>La posicion se interpola entre los dos nodos del recorrido que rodean
 * ese minuto. Como el backend repite el nodo de cada parada -una vez con el
 * minuto de llegada y otra con el de salida- la unidad se queda quieta
 * durante la hora de entrega sin necesidad de ningun caso especial
 * (STD 2.6.4).</p>
 */
export function usePosicionesFlota(
  ejecucion: EjecucionDto | null,
  minutoActual: number,
  /**
   * Flota completa del escenario. Permite dibujar tambien las unidades que
   * no salieron -las averiadas y las que estan en mantenimiento- que si no,
   * desaparecerian del mapa justo cuando hay que verlas.
   */
  flota: UnidadDto[] = [],
  unidadesInmovilizadas: string[] = [],
): { unidades: PosicionUnidad[]; pedidos: EstadoPedidoEnMapa[] } {
  return useMemo(() => {
    if (!ejecucion) {
      return { unidades: [], pedidos: [] };
    }

    const unidades = ejecucion.rutas.map((ruta) => calcularPosicion(ruta, minutoActual));

    const conRuta = new Set(unidades.map((unidad) => unidad.codigoUnidad));
    unidadesInmovilizadas
      .filter((codigo) => !conRuta.has(codigo))
      .forEach((codigo) => {
        const unidad = flota.find((candidata) => candidata.codigo === codigo);
        if (unidad) {
          unidades.push(posicionInmovilizada(unidad));
        }
      });

    const pedidos: EstadoPedidoEnMapa[] = [];

    ejecucion.rutas.forEach((ruta) => {
      ruta.paradas.forEach((parada) => {
        pedidos.push({
          codigoPedido: parada.codigoPedido,
          clienteId: parada.clienteId,
          x: parada.posX,
          y: parada.posY,
          cantidadProducto: parada.cantidadProducto,
          plazoHoras: parada.plazoHoras,
          minutoLimite: parada.minutoLimite,
          minutoLlegada: parada.minutoLlegada,
          codigoUnidad: ruta.codigoUnidad,
          estado: estadoDeParada(parada.minutoLlegada, parada.cumplePlazo, ruta.minutoSalida, minutoActual),
        });
      });
    });

    ejecucion.pedidosSinAtender.forEach((pedido) => {
      pedidos.push({
        codigoPedido: pedido.codigoPedido,
        clienteId: pedido.clienteId,
        x: pedido.posX,
        y: pedido.posY,
        cantidadProducto: pedido.cantidadProducto,
        plazoHoras: pedido.plazoHoras,
        minutoLimite: pedido.minutoLimite,
        minutoLlegada: null,
        codigoUnidad: null,
        estado: minutoActual > pedido.minutoLimite ? "INCUMPLIDO" : "PENDIENTE",
      });
    });

    return { unidades, pedidos };
  }, [ejecucion, minutoActual, flota, unidadesInmovilizadas]);
}

/**
 * Una unidad averiada o en mantenimiento no recibe carga, asi que se
 * muestra detenida en el almacen desde el que habria salido.
 */
function posicionInmovilizada(unidad: UnidadDto): PosicionUnidad {
  return {
    codigoUnidad: unidad.codigo,
    tipoUnidad: unidad.tipoUnidad,
    x: unidad.posX,
    y: unidad.posY,
    enAlmacen: true,
    finalizada: false,
    entregando: false,
    entregasHechas: 0,
    entregasTotales: 0,
    cargaRestante: 0,
    cargaTotal: 0,
    indiceNodoActual: 0,
  };
}

function calcularPosicion(ruta: RutaDto, minutoActual: number): PosicionUnidad {
  const { recorrido, minutosPorNodo } = ruta;
  const entregasHechas = ruta.paradas.filter((parada) => parada.minutoSalida <= minutoActual).length;
  const cargaEntregada = ruta.paradas
    .filter((parada) => parada.minutoSalida <= minutoActual)
    .reduce((total, parada) => total + parada.cantidadProducto, 0);

  const base = {
    codigoUnidad: ruta.codigoUnidad,
    tipoUnidad: ruta.tipoUnidad,
    entregasHechas,
    entregasTotales: ruta.paradas.length,
    cargaRestante: ruta.cargaTotal - cargaEntregada,
    cargaTotal: ruta.cargaTotal,
  };

  if (recorrido.length === 0) {
    return { ...base, x: 0, y: 0, enAlmacen: true, finalizada: false, entregando: false, indiceNodoActual: 0 };
  }

  if (minutoActual <= minutosPorNodo[0]) {
    const [x, y] = recorrido[0];
    return { ...base, x, y, enAlmacen: true, finalizada: false, entregando: false, indiceNodoActual: 0 };
  }

  const ultimo = recorrido.length - 1;
  if (minutoActual >= minutosPorNodo[ultimo]) {
    const [x, y] = recorrido[ultimo];
    return { ...base, x, y, enAlmacen: false, finalizada: true, entregando: false, indiceNodoActual: ultimo };
  }

  const indice = buscarTramo(minutosPorNodo, minutoActual);
  const minutoDesde = minutosPorNodo[indice];
  const minutoHasta = minutosPorNodo[indice + 1];
  const [xDesde, yDesde] = recorrido[indice];
  const [xHasta, yHasta] = recorrido[indice + 1];

  const duracion = minutoHasta - minutoDesde;
  const avance = duracion > 0 ? (minutoActual - minutoDesde) / duracion : 1;

  // Nodo repetido: la unidad esta detenida entregando en el domicilio.
  const entregando = xDesde === xHasta && yDesde === yHasta;

  return {
    ...base,
    x: xDesde + (xHasta - xDesde) * avance,
    y: yDesde + (yHasta - yDesde) * avance,
    enAlmacen: false,
    finalizada: false,
    entregando,
    indiceNodoActual: indice,
  };
}

/** Busqueda binaria del tramo que contiene al minuto pedido. */
function buscarTramo(minutos: number[], minutoActual: number): number {
  let inferior = 0;
  let superior = minutos.length - 1;

  while (superior - inferior > 1) {
    const medio = Math.floor((inferior + superior) / 2);
    if (minutos[medio] <= minutoActual) {
      inferior = medio;
    } else {
      superior = medio;
    }
  }
  return inferior;
}

/**
 * Estado visual de un pedido asignado: pasa de asignado a en ruta cuando la
 * unidad sale del almacen, y a entregado -o incumplido- cuando llega
 * (STD 2.1).
 */
function estadoDeParada(
  minutoLlegada: number,
  cumplePlazo: boolean,
  minutoSalidaUnidad: number,
  minutoActual: number,
): EstadoPedidoVisual {
  if (minutoActual >= minutoLlegada) {
    return cumplePlazo ? "ENTREGADO" : "INCUMPLIDO";
  }
  return minutoActual >= minutoSalidaUnidad ? "EN_RUTA" : "ASIGNADO";
}
