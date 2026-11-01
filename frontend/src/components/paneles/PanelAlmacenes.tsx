import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, PackageCheck, PackageOpen, Truck } from "lucide-react";
import type { AlmacenDto, RutaDto } from "../../types/Experimentacion";
import { formatearHoraDelDia } from "../../utils/formatters";
import SemaforoStock from "./SemaforoStock";
import "./PanelAlmacenes.css";

interface PanelAlmacenesProps {
  almacenes: AlmacenDto[];
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
  /** Rutas de la ejecución visible, para los envíos de cada almacén (E20-E22). */
  rutas?: RutaDto[];
  minutoActual?: number;
  almacenEnfocado?: string | null;
  onSeleccionar?: (codigoAlmacen: string | null) => void;
}

/** Ventana de "las siguientes / las últimas x horas" de la rúbrica (x = 4 h). */
const VENTANA_MINUTOS = 4 * 60;
const MAXIMO_EN_LISTA = 6;

interface EnvioDeAlmacen {
  codigoPedido: string;
  clienteId: string;
  cantidad: number;
  unidad: string;
  minuto: number;
}

interface MovimientoAlmacen {
  enTransito: EnvioDeAlmacen[];
  porSalir: EnvioDeAlmacen[];
  entregados: EnvioDeAlmacen[];
}

/**
 * Panel de almacenes (STD 2.6.5): stock con semáforo + vacío (E18, E19) y,
 * para cada almacén, los envíos en camino, los que salen en las próximas
 * 4 horas y los entregados en las últimas 4 horas (E20-E22). Seleccionar un
 * almacén aquí lo resalta en el mapa y viceversa (F05).
 */
const PanelAlmacenes = ({
  almacenes,
  umbralAmbarPorcentaje,
  umbralRojoPorcentaje,
  rutas = [],
  minutoActual = 0,
  almacenEnfocado = null,
  onSeleccionar,
}: PanelAlmacenesProps) => {
  const [colapsado, setColapsado] = useState(false);
  const filasRef = useRef(new Map<string, HTMLElement>());

  const movimientos = useMemo(() => {
    const porAlmacen = new Map<string, MovimientoAlmacen>();
    almacenes.forEach((almacen) => porAlmacen.set(almacen.codigo, { enTransito: [], porSalir: [], entregados: [] }));
    rutas.forEach((ruta) => {
      const grupo = porAlmacen.get(ruta.almacenOrigen);
      if (!grupo) {
        return;
      }
      ruta.paradas.forEach((parada) => {
        const envio = {
          codigoPedido: parada.codigoPedido,
          clienteId: parada.clienteId,
          cantidad: parada.cantidadProducto,
          unidad: ruta.codigoUnidad,
        };
        if (minutoActual >= ruta.minutoSalida && minutoActual < parada.minutoLlegada) {
          grupo.enTransito.push({ ...envio, minuto: parada.minutoLlegada });
        } else if (ruta.minutoSalida > minutoActual && ruta.minutoSalida <= minutoActual + VENTANA_MINUTOS) {
          grupo.porSalir.push({ ...envio, minuto: ruta.minutoSalida });
        } else if (parada.minutoLlegada <= minutoActual && parada.minutoLlegada > minutoActual - VENTANA_MINUTOS) {
          grupo.entregados.push({ ...envio, minuto: parada.minutoLlegada });
        }
      });
    });
    porAlmacen.forEach((grupo) => {
      grupo.enTransito.sort((a, b) => a.minuto - b.minuto);
      grupo.porSalir.sort((a, b) => a.minuto - b.minuto);
      grupo.entregados.sort((a, b) => b.minuto - a.minuto);
    });
    return porAlmacen;
  }, [almacenes, rutas, minutoActual]);

  useEffect(() => {
    if (almacenEnfocado) {
      setColapsado(false);
      filasRef.current.get(almacenEnfocado)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [almacenEnfocado]);

  return (
    <section className="tarjeta panel-almacenes">
      <header
        className="tarjeta__encabezado panel-almacenes__encabezado"
        onClick={() => setColapsado((c) => !c)}
        role="button"
        tabIndex={0}
      >
        <div>
          <h2 className="tarjeta__titulo">Almacenes</h2>
          <p className="tarjeta__contexto">Stock, envíos en camino y movimientos de ± 4 h · clic para ver en el mapa</p>
        </div>
        <button
          type="button"
          className="panel-almacenes__toggle"
          aria-label={colapsado ? "Expandir almacenes" : "Contraer almacenes"}
        >
          {colapsado ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </header>

      {!colapsado && (
        <ul className="panel-almacenes__lista">
          {almacenes.map((almacen) => {
            const enfocado = almacenEnfocado === almacen.codigo;
            const movimiento = movimientos.get(almacen.codigo) ?? { enTransito: [], porSalir: [], entregados: [] };
            return (
              <li
                key={almacen.codigo}
                ref={(elemento) => {
                  if (elemento) {
                    filasRef.current.set(almacen.codigo, elemento);
                  } else {
                    filasRef.current.delete(almacen.codigo);
                  }
                }}
                className={`panel-almacenes__almacen ${enfocado ? "panel-almacenes__almacen--enfocado" : ""}`}
                onClick={() => onSeleccionar?.(enfocado ? null : almacen.codigo)}
              >
                <div className="panel-almacenes__cabecera">
                  <span className="panel-almacenes__codigo">{almacen.codigo}</span>
                  <span className="cifra texto-tenue">
                    ({almacen.posX}, {almacen.posY})
                  </span>
                </div>
                {almacen.tipo === "CENTRAL" ? (
                  <p className="panel-almacenes__central">Inventario permanentemente abastecido</p>
                ) : (
                  <SemaforoStock
                    stockActual={almacen.stockActual}
                    stockMaximo={almacen.stockMaximo}
                    umbralAmbarPorcentaje={umbralAmbarPorcentaje}
                    umbralRojoPorcentaje={umbralRojoPorcentaje}
                  />
                )}
                <div className="panel-almacenes__resumen">
                  <Resumen icono={<Truck size={12} aria-hidden />} rotulo="En camino" envios={movimiento.enTransito} />
                  <Resumen icono={<PackageOpen size={12} aria-hidden />} rotulo="Salen ≤ 4 h" envios={movimiento.porSalir} />
                  <Resumen icono={<PackageCheck size={12} aria-hidden />} rotulo="Entregados 4 h" envios={movimiento.entregados} />
                </div>
                {enfocado && (
                  <div className="panel-almacenes__detalle" onClick={(evento) => evento.stopPropagation()}>
                    <ListaEnvios titulo="En camino (llegada)" envios={movimiento.enTransito} />
                    <ListaEnvios titulo="Salen en las próximas 4 h (salida)" envios={movimiento.porSalir} />
                    <ListaEnvios titulo="Entregados en las últimas 4 h (entrega)" envios={movimiento.entregados} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const Resumen = ({ icono, rotulo, envios }: { icono: ReactNode; rotulo: string; envios: EnvioDeAlmacen[] }) => (
  <span className="panel-almacenes__dato" title={`${envios.length} envíos · ${sumar(envios)} paquetes`}>
    {icono}
    <span>{rotulo}</span>
    <strong className="cifra">
      {envios.length} · {sumar(envios)} u
    </strong>
  </span>
);

const ListaEnvios = ({ titulo, envios }: { titulo: string; envios: EnvioDeAlmacen[] }) => (
  <div>
    <span className="rotulo">{titulo}</span>
    {envios.length === 0 ? (
      <p className="texto-tenue panel-almacenes__vacio">Ninguno</p>
    ) : (
      <ul className="panel-almacenes__envios">
        {envios.slice(0, MAXIMO_EN_LISTA).map((envio) => (
          <li key={`${titulo}-${envio.codigoPedido}`}>
            <span className="cifra">{envio.codigoPedido}</span>
            <span>{envio.clienteId}</span>
            <span className="cifra">{envio.unidad}</span>
            <span className="cifra">{envio.cantidad} u</span>
            <span className="cifra texto-tenue">{formatearHoraDelDia(envio.minuto)}</span>
          </li>
        ))}
        {envios.length > MAXIMO_EN_LISTA && (
          <li className="texto-tenue">y {envios.length - MAXIMO_EN_LISTA} más…</li>
        )}
      </ul>
    )}
  </div>
);

function sumar(envios: EnvioDeAlmacen[]): number {
  return envios.reduce((total, envio) => total + envio.cantidad, 0);
}

export default PanelAlmacenes;
