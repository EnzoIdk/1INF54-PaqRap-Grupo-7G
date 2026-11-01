import type { EjecucionDto, TipoUnidad } from "../types/Experimentacion";
import { ETIQUETA_TIPO_UNIDAD } from "./constants";
import { formatearSoles } from "./formatters";
import { calcularCuellosDeBotella, calcularIndicadores } from "./reportes";

/**
 * Lectura automática de una ejecución: convierte los indicadores en
 * hallazgos con su gravedad y una recomendación concreta, para que el
 * Analytics diga qué significa cada número y qué hacer con él.
 */
export type GravedadHallazgo = "critico" | "atencion" | "bien";

export interface Hallazgo {
  id: string;
  gravedad: GravedadHallazgo;
  titulo: string;
  detalle: string;
  recomendacion?: string;
}

const ORDEN: Record<GravedadHallazgo, number> = { critico: 0, atencion: 1, bien: 2 };
const porcentaje = (valor: number) => `${Math.round(valor * 100)} %`;

/** Umbral de holgura bajo el cual una entrega queda "al límite" (min). */
const HOLGURA_AJUSTADA_MIN = 60;

export function generarHallazgos(ejecucion: EjecucionDto): Hallazgo[] {
  const datos = calcularIndicadores(ejecucion);
  const cuellos = calcularCuellosDeBotella(ejecucion);
  const hallazgos: Hallazgo[] = [];
  const totalPedidos = datos.entregas + datos.sinAtender;

  // 1. Nivel de servicio.
  if (totalPedidos > 0) {
    const gravedad: GravedadHallazgo =
      datos.tasaCumplimiento >= 0.98 ? "bien" : datos.tasaCumplimiento >= 0.9 ? "atencion" : "critico";
    hallazgos.push({
      id: "servicio",
      gravedad,
      titulo: `Nivel de servicio: ${porcentaje(datos.tasaCumplimiento)} de pedidos a tiempo`,
      detalle: `${datos.aTiempo} a tiempo, ${datos.fueraDePlazo} fuera de plazo y ${datos.sinAtender} sin atender de ${totalPedidos}.`,
      recomendacion:
        gravedad === "bien"
          ? undefined
          : "La política exige el 100 %: revise los cuellos de botella de abajo antes de ampliar la flota.",
    });
  }

  // 2. Pedidos sin atender: dónde y cuándo se concentran.
  if (datos.sinAtender > 0) {
    const plazo = [...cuellos.sinAtenderPorPlazo].sort((a, b) => b.cantidad - a.cantidad)[0];
    const zona = cuellos.sinAtenderPorZona[0];
    const franja = cuellos.sinAtenderPorFranja[0];
    hallazgos.push({
      id: "sin-atender",
      gravedad: "critico",
      titulo: `${datos.sinAtender} pedidos quedaron sin unidad factible`,
      detalle:
        `Se concentran en el plazo de ${plazo?.plazoHoras ?? "—"} h (${plazo?.cantidad ?? 0}), ` +
        `la zona ${zona?.zona ?? "—"} (${zona?.cantidad ?? 0}) y el ${franja?.franja.toLowerCase() ?? "—"} (${franja?.cantidad ?? 0}).`,
      recomendacion:
        cuellos.unidadesUsadas >= cuellos.unidadesDisponibles
          ? "Toda la flota disponible ya está en ruta: hace falta más capacidad en esa franja o adelantar despachos."
          : `${cuellos.unidadesDisponibles - cuellos.unidadesUsadas} unidades no salieron en todo el periodo: más que la ` +
            "cantidad de flota, pesan el plazo y la ubicación de esos pedidos. Priorícelos o despáchelos desde el almacén más cercano.",
    });
  }

  // 3. Robustez: entregas con poca holgura.
  const paradas = ejecucion.rutas.flatMap((ruta) => ruta.paradas);
  const ajustadas = paradas.filter(
    (parada) => parada.cumplePlazo && parada.holguraMinutos < HOLGURA_AJUSTADA_MIN,
  ).length;
  if (paradas.length > 0) {
    const fraccion = ajustadas / paradas.length;
    hallazgos.push({
      id: "holgura",
      gravedad: fraccion > 0.25 ? "atencion" : "bien",
      titulo: `Holgura promedio de ${datos.holguraPromedioHoras.toFixed(1)} h antes del plazo`,
      detalle: `${ajustadas} entregas (${porcentaje(fraccion)}) llegan con menos de 1 h de margen.`,
      recomendacion:
        fraccion > 0.25
          ? "El plan es frágil: una avería o un bloqueo nuevo convertiría esas entregas en incumplimientos. " +
            "Conviene reservar unidades de respaldo en esas horas."
          : undefined,
    });
  }

  // 4. Aprovechamiento de la capacidad de la flota.
  if (datos.porTipo.some((tipo) => tipo.rutas > 0)) {
    const usados = datos.porTipo.filter((tipo) => tipo.capacidadOfrecida > 0);
    const peor = [...usados].sort(
      (a, b) => a.paquetes / a.capacidadOfrecida - b.paquetes / b.capacidadOfrecida,
    )[0];
    const util = datos.utilizacionCapacidad;
    hallazgos.push({
      id: "capacidad",
      gravedad: util < 0.5 || util > 0.95 ? "atencion" : "bien",
      titulo: `Las unidades salen con el ${porcentaje(util)} de su capacidad`,
      detalle: usados
        .map((tipo) => `${ETIQUETA_TIPO_UNIDAD[tipo.tipo]}: ${porcentaje(tipo.paquetes / tipo.capacidadOfrecida)}`)
        .join(" · "),
      recomendacion:
        util < 0.5
          ? `Hay espacio ocioso, sobre todo en ${ETIQUETA_TIPO_UNIDAD[peor.tipo].toLowerCase()}: consolidar envíos ` +
            "por zona o usar unidades más pequeñas bajaría el costo por pedido."
          : util > 0.95
            ? "La flota va casi llena: cualquier pedido extra o avería obliga a abrir otra ruta."
            : undefined,
    });
  }

  // 5. Costo: qué tipo de unidad encarece el plan.
  const conPaquetes = datos.porTipo.filter((tipo) => tipo.paquetes > 0);
  if (conPaquetes.length > 0) {
    const costoPorPaquete = (tipo: { costo: number; paquetes: number }) => tipo.costo / tipo.paquetes;
    const caro = [...conPaquetes].sort((a, b) => costoPorPaquete(b) - costoPorPaquete(a))[0];
    const barato = [...conPaquetes].sort((a, b) => costoPorPaquete(a) - costoPorPaquete(b))[0];
    const participacion = datos.costoTotal > 0 ? caro.costo / datos.costoTotal : 0;
    hallazgos.push({
      id: "costo",
      gravedad: "bien",
      titulo: `Costo por pedido: ${formatearSoles(datos.costoPorPedido)} (${formatearSoles(datos.costoPorKm)} por km)`,
      detalle:
        `${ETIQUETA_TIPO_UNIDAD[caro.tipo as TipoUnidad]} es el más caro por paquete ` +
        `(${formatearSoles(costoPorPaquete(caro))}) y representa el ${porcentaje(participacion)} del costo; ` +
        `${ETIQUETA_TIPO_UNIDAD[barato.tipo as TipoUnidad].toLowerCase()} el más barato (${formatearSoles(costoPorPaquete(barato))}).`,
      recomendacion:
        caro.tipo !== barato.tipo && participacion > 0.5
          ? `Mover pedidos cortos y de poca carga a ${ETIQUETA_TIPO_UNIDAD[barato.tipo as TipoUnidad].toLowerCase()} reduciría el costo total.`
          : undefined,
    });
  }

  // 6. Dependencia de un almacén.
  const despachoTotal = datos.porAlmacen.reduce((total, almacen) => total + almacen.despachado, 0);
  const principal = [...datos.porAlmacen].sort((a, b) => b.despachado - a.despachado)[0];
  if (principal && despachoTotal > 0 && datos.porAlmacen.length > 0) {
    const fraccion = principal.despachado / despachoTotal;
    hallazgos.push({
      id: "almacenes",
      gravedad: fraccion > 0.8 && datos.porAlmacen.length > 1 ? "atencion" : "bien",
      titulo: `${principal.codigo} despacha el ${porcentaje(fraccion)} de los paquetes`,
      detalle: datos.porAlmacen.map((almacen) => `${almacen.codigo}: ${almacen.despachado} paq. en ${almacen.rutas} rutas`).join(" · "),
      recomendacion:
        fraccion > 0.8 && datos.porAlmacen.length > 1
          ? "La operación depende de un solo almacén: los intermedios podrían atender las zonas lejanas al central."
          : undefined,
    });
  }

  // 7. Averías absorbidas.
  if (datos.reasignados > 0) {
    hallazgos.push({
      id: "averias",
      gravedad: "bien",
      titulo: `${datos.reasignados} pedidos se reasignaron por averías`,
      detalle: "Otra unidad los recogió y el plan siguió en marcha.",
    });
  }

  // 8. Refrigerio de los conductores.
  if (datos.refrigerios.total > 0 && datos.refrigerios.enVentana < datos.refrigerios.total) {
    hallazgos.push({
      id: "refrigerios",
      gravedad: "atencion",
      titulo: `${datos.refrigerios.total - datos.refrigerios.enVentana} refrigerios fuera de su ventana`,
      detalle: `De ${datos.refrigerios.total} rutas con refrigerio, ${datos.refrigerios.enVentana} lo toman a la hora prevista.`,
      recomendacion: "Revise las rutas largas del mediodía: el conductor no alcanza a parar a tiempo.",
    });
  }

  // 9. Reserva de flota.
  const { unidadesEnRuta, unidadesDisponibles } = ejecucion.metricas;
  if (unidadesDisponibles > 0) {
    const uso = unidadesEnRuta / unidadesDisponibles;
    hallazgos.push({
      id: "reserva",
      gravedad: uso > 0.9 ? "atencion" : "bien",
      titulo: `${unidadesEnRuta} de ${unidadesDisponibles} unidades salieron a ruta`,
      detalle:
        uso > 0.9
          ? "Casi no queda reserva para cubrir averías o pedidos urgentes."
          : `Quedan ${unidadesDisponibles - unidadesEnRuta} unidades de reserva para averías o pedidos urgentes.`,
    });
  }

  return hallazgos.sort((a, b) => ORDEN[a.gravedad] - ORDEN[b.gravedad]);
}

/* ============================================================ EVOLUCIÓN */

export interface TramoOperacion {
  etiqueta: string;
  entregas: number;
  aTiempo: number;
  fueraDePlazo: number;
  sinAtender: number;
  costo: number;
  km: number;
  rutas: number;
}

/**
 * Entregas, costo y pedidos sin atender por día (planes de varios días) o
 * por franja de 2 horas (un solo turno).
 */
export function evolucionOperacion(ejecucion: EjecucionDto, minutoInicio: number, minutoFin: number): TramoOperacion[] {
  const variosDias = minutoFin - minutoInicio > 1440;
  const anchoTramo = variosDias ? 1440 : 120;
  const inicioTramo = variosDias ? Math.floor(minutoInicio / 1440) * 1440 : Math.floor(minutoInicio / 120) * 120;
  const finUltimo = Math.max(
    minutoFin,
    ...ejecucion.rutas.map((ruta) => ruta.minutoFin),
  );
  const cantidad = Math.max(1, Math.min(60, Math.ceil((finUltimo - inicioTramo) / anchoTramo)));
  const dos = (valor: number) => String(valor).padStart(2, "0");
  const tramos: TramoOperacion[] = Array.from({ length: cantidad }, (_, indice) => {
    const desde = inicioTramo + indice * anchoTramo;
    const etiqueta = variosDias
      ? `Día ${Math.floor(desde / 1440) + 1}`
      : `${dos(Math.floor((desde % 1440) / 60))}:00`;
    return { etiqueta, entregas: 0, aTiempo: 0, fueraDePlazo: 0, sinAtender: 0, costo: 0, km: 0, rutas: 0 };
  });
  const indiceDe = (minuto: number) =>
    Math.max(0, Math.min(cantidad - 1, Math.floor((minuto - inicioTramo) / anchoTramo)));

  ejecucion.rutas.forEach((ruta) => {
    const tramo = tramos[indiceDe(ruta.minutoSalida)];
    tramo.costo += ruta.costoSoles;
    tramo.km += ruta.distanciaKm;
    tramo.rutas += 1;
    ruta.paradas.forEach((parada) => {
      const destino = tramos[indiceDe(parada.minutoLlegada)];
      destino.entregas += 1;
      if (parada.cumplePlazo) {
        destino.aTiempo += 1;
      } else {
        destino.fueraDePlazo += 1;
      }
    });
  });
  ejecucion.pedidosSinAtender.forEach((pedido) => {
    tramos[indiceDe(pedido.minutoRegistro)].sinAtender += 1;
  });
  // Sin cola vacía al final: el último tramo con actividad cierra el gráfico.
  let ultimo = tramos.length - 1;
  while (ultimo > 0 && tramos[ultimo].entregas + tramos[ultimo].rutas + tramos[ultimo].sinAtender === 0) {
    ultimo -= 1;
  }
  return tramos.slice(0, ultimo + 1);
}

export interface FranjaHolgura {
  etiqueta: string;
  cantidad: number;
  color: string;
}

/** Distribución del margen con que llegan las entregas antes de su plazo. */
export function distribucionHolgura(ejecucion: EjecucionDto): FranjaHolgura[] {
  const paradas = ejecucion.rutas.flatMap((ruta) => ruta.paradas);
  const franjas: (FranjaHolgura & { cumple: (minutos: number, aTiempo: boolean) => boolean })[] = [
    { etiqueta: "Fuera de plazo", cantidad: 0, color: "var(--color-semaforo-rojo)", cumple: (_, aTiempo) => !aTiempo },
    { etiqueta: "< 1 h", cantidad: 0, color: "var(--color-semaforo-ambar)", cumple: (m) => m < 60 },
    { etiqueta: "1–2 h", cantidad: 0, color: "var(--color-tipo-moto)", cumple: (m) => m < 120 },
    { etiqueta: "2–4 h", cantidad: 0, color: "var(--color-tipo-auto)", cumple: (m) => m < 240 },
    { etiqueta: "> 4 h", cantidad: 0, color: "var(--color-semaforo-verde)", cumple: () => true },
  ];
  paradas.forEach((parada) => {
    const franja = franjas.find((candidata) => candidata.cumple(parada.holguraMinutos, parada.cumplePlazo));
    if (franja) {
      franja.cantidad += 1;
    }
  });
  return franjas.map(({ etiqueta, cantidad, color }) => ({ etiqueta, cantidad, color }));
}
