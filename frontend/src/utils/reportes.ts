import type {
  AveriaSolicitada,
  EjecucionDto,
  EscenarioDto,
  RutaDto,
  TipoUnidad,
} from "../types/Experimentacion";
import type { EstadoPedidoEnMapa } from "../hooks/usePosicionesFlota";
import { descargarCsv, descargarTexto } from "./exportacion";
import { formatearTiempoSimulado } from "./formatters";
import { ETIQUETA_TIPO_UNIDAD } from "./constants";

/** Plazos del caso, de menor a mayor (RF-02, RF-03). */
export const PLAZOS_HORAS = [4, 8, 12, 18, 36] as const;

const HORAS_CAMBIO_TURNO = [7, 15, 23];

/* ============================================================ ITINERARIO (RF-58) */

/**
 * Itinerario detallado de una unidad, en texto simple: cada salida, cada
 * entrega con su hora y su plazo, la hora de alimentación y los cambios de
 * conductor en ruta (RF-24, RF-25: el relevo es en el punto, sin demora).
 */
export function generarItinerario(codigoUnidad: string, rutas: RutaDto[], escenario: EscenarioDto | null): string {
  const propias = rutas
    .filter((ruta) => ruta.codigoUnidad === codigoUnidad)
    .sort((a, b) => a.minutoSalida - b.minutoSalida);
  const lineas: string[] = [];
  lineas.push(`ITINERARIO DE LA UNIDAD ${codigoUnidad}`);
  if (escenario) {
    lineas.push(`Datos: ${escenario.archivoVentas} · semilla ${escenario.semilla}`);
  }
  lineas.push(`Generado: ${new Date().toLocaleString("es-PE")}`);
  lineas.push("=".repeat(64));
  if (propias.length === 0) {
    lineas.push("La unidad no tiene rutas con carga en esta ejecución.");
    return lineas.join("\r\n");
  }
  propias.forEach((ruta, indice) => {
    lineas.push("");
    lineas.push(
      `RUTA ${indice + 1} · ${ETIQUETA_TIPO_UNIDAD[ruta.tipoUnidad]} · sale de ${ruta.almacenOrigen} ` +
        `el ${formatearTiempoSimulado(ruta.minutoSalida)}`,
    );
    lineas.push(
      `Carga ${ruta.cargaTotal}/${ruta.capacidad} paquetes · ${ruta.distanciaKm.toFixed(1)} km · ` +
        `S/ ${ruta.costoSoles.toFixed(2)}`,
    );
    lineas.push("-".repeat(64));
    ruta.paradas.forEach((parada, posicion) => {
      lineas.push(
        `${String(posicion + 1).padStart(2, "0")}. ${parada.codigoPedido} · cliente ${parada.clienteId} · ` +
          `(${parada.posX},${parada.posY}) · ${parada.cantidadProducto} u`,
      );
      lineas.push(
        `    Llega ${formatearTiempoSimulado(parada.minutoLlegada)} · sale ${formatearTiempoSimulado(parada.minutoSalida)} · ` +
          `plazo ${parada.plazoHoras} h (límite ${formatearTiempoSimulado(parada.minutoLimite)}) · ` +
          `${parada.cumplePlazo ? "a tiempo" : "FUERA DE PLAZO"}${parada.reasignado ? " · REASIGNADO por avería" : ""}`,
      );
    });
    if (ruta.minutoInicioAlimentacion !== null && ruta.minutoInicioAlimentacion !== undefined) {
      lineas.push(
        `Alimentación: ${formatearTiempoSimulado(ruta.minutoInicioAlimentacion)} a ` +
          `${formatearTiempoSimulado(ruta.minutoFinAlimentacion ?? ruta.minutoInicioAlimentacion + 60)}` +
          `${ruta.alimentacionEnVentana ? "" : " (fuera de la ventana de turno)"}`,
      );
    }
    cambiosDeTurnoEnRuta(ruta).forEach((minuto) =>
      lineas.push(`Cambio de conductor en ruta: ${formatearTiempoSimulado(minuto)} (relevo en el punto, sin demora)`),
    );
    if (ruta.minutoInicioRetorno !== undefined && ruta.minutoInicioRetorno < ruta.minutoFin) {
      lineas.push(
        `Retorno a ${ruta.almacenDestino ?? ruta.almacenOrigen} para recargar: sale ` +
          `${formatearTiempoSimulado(ruta.minutoInicioRetorno)} · llega ${formatearTiempoSimulado(ruta.minutoFin)}`,
      );
    }
    lineas.push(`Termina: ${formatearTiempoSimulado(ruta.minutoFin)}`);
  });
  return lineas.join("\r\n");
}

export function descargarItinerario(codigoUnidad: string, rutas: RutaDto[], escenario: EscenarioDto | null): void {
  descargarTexto(`itinerario_${codigoUnidad}.txt`, generarItinerario(codigoUnidad, rutas, escenario));
}

/** Minutos en que la ruta cruza un cambio de turno (07:00, 15:00, 23:00). */
export function cambiosDeTurnoEnRuta(ruta: RutaDto): number[] {
  const cambios: number[] = [];
  const primerDia = Math.floor(ruta.minutoSalida / 1440);
  const ultimoDia = Math.floor(ruta.minutoFin / 1440);
  for (let dia = primerDia; dia <= ultimoDia; dia++) {
    HORAS_CAMBIO_TURNO.forEach((hora) => {
      const minuto = dia * 1440 + hora * 60;
      if (minuto > ruta.minutoSalida && minuto < ruta.minutoFin) {
        cambios.push(minuto);
      }
    });
  }
  return cambios;
}

/* ============================================================ INDICADORES */

export interface ResumenPlazo {
  plazoHoras: number;
  entregas: number;
  promedioHoras: number;
  maximoHoras: number;
  fueraDePlazo: number;
}

export interface ResumenTipo {
  tipo: TipoUnidad;
  rutas: number;
  unidades: number;
  km: number;
  costo: number;
  paquetes: number;
  capacidadOfrecida: number;
}

export interface IndicadoresEjecucion {
  entregas: number;
  /** Entregas planificadas antes de que el pedido se registrara. */
  entregasAnticipadas: number;
  aTiempo: number;
  fueraDePlazo: number;
  reasignados: number;
  sinAtender: number;
  tasaCumplimiento: number;
  costoTotal: number;
  kmTotales: number;
  costoPorKm: number;
  costoPorPedido: number;
  kmPorPedido: number;
  paquetesPorKm: number;
  utilizacionCapacidad: number;
  entregasPorUnidad: number;
  holguraPromedioHoras: number;
  porPlazo: ResumenPlazo[];
  porTipo: ResumenTipo[];
  porAlmacen: { codigo: string; despachado: number; rutas: number }[];
  refrigerios: { total: number; enVentana: number };
}

/** Indicadores de desempeño de una ejecución (RF-49, RF-65, RF-68, RF-71, RF-73, RF-75). */
export function calcularIndicadores(ejecucion: EjecucionDto): IndicadoresEjecucion {
  const paradas = ejecucion.rutas.flatMap((ruta) => ruta.paradas);
  const entregas = paradas.length;
  const aTiempo = paradas.filter((parada) => parada.cumplePlazo).length;
  const reasignados = paradas.filter((parada) => parada.reasignado).length;
  const kmTotales = ejecucion.rutas.reduce((suma, ruta) => suma + ruta.distanciaKm, 0);
  const costoTotal = ejecucion.rutas.reduce((suma, ruta) => suma + ruta.costoSoles, 0);
  const paquetes = ejecucion.rutas.reduce((suma, ruta) => suma + ruta.cargaTotal, 0);
  const capacidad = ejecucion.rutas.reduce((suma, ruta) => suma + ruta.capacidad, 0);
  const unidades = new Set(ejecucion.rutas.map((ruta) => ruta.codigoUnidad)).size;

  const porPlazo: ResumenPlazo[] = PLAZOS_HORAS.map((plazo) => {
    const delPlazo = paradas.filter((parada) => parada.plazoHoras === plazo);
    // Una llegada anterior al registro (limitación del modelo por turnos) cuenta como 0 h.
    const horas = delPlazo.map((parada) => Math.max(0, parada.minutoLlegada - parada.minutoRegistro) / 60);
    return {
      plazoHoras: plazo,
      entregas: delPlazo.length,
      promedioHoras: horas.length ? horas.reduce((a, b) => a + b, 0) / horas.length : 0,
      maximoHoras: horas.length ? Math.max(...horas) : 0,
      fueraDePlazo: delPlazo.filter((parada) => !parada.cumplePlazo).length,
    };
  });

  const tipos: TipoUnidad[] = ["AUTO", "MOTO", "BICICLETA"];
  const porTipo: ResumenTipo[] = tipos.map((tipo) => {
    const delTipo = ejecucion.rutas.filter((ruta) => ruta.tipoUnidad === tipo);
    return {
      tipo,
      rutas: delTipo.length,
      unidades: new Set(delTipo.map((ruta) => ruta.codigoUnidad)).size,
      km: delTipo.reduce((suma, ruta) => suma + ruta.distanciaKm, 0),
      costo: delTipo.reduce((suma, ruta) => suma + ruta.costoSoles, 0),
      paquetes: delTipo.reduce((suma, ruta) => suma + ruta.cargaTotal, 0),
      capacidadOfrecida: delTipo.reduce((suma, ruta) => suma + ruta.capacidad, 0),
    };
  });

  const almacenes = new Map<string, { despachado: number; rutas: number }>();
  ejecucion.rutas.forEach((ruta) => {
    const actual = almacenes.get(ruta.almacenOrigen) ?? { despachado: 0, rutas: 0 };
    almacenes.set(ruta.almacenOrigen, { despachado: actual.despachado + ruta.cargaTotal, rutas: actual.rutas + 1 });
  });

  const conRefrigerio = ejecucion.rutas.filter(
    (ruta) => ruta.minutoInicioAlimentacion !== null && ruta.minutoInicioAlimentacion !== undefined,
  );

  return {
    entregas,
    entregasAnticipadas: paradas.filter((parada) => parada.minutoLlegada < parada.minutoRegistro).length,
    aTiempo,
    fueraDePlazo: entregas - aTiempo,
    reasignados,
    sinAtender: ejecucion.pedidosSinAtender.length,
    tasaCumplimiento: entregas + ejecucion.pedidosSinAtender.length > 0
      ? aTiempo / (entregas + ejecucion.pedidosSinAtender.length)
      : 0,
    costoTotal,
    kmTotales,
    costoPorKm: kmTotales > 0 ? costoTotal / kmTotales : 0,
    costoPorPedido: entregas > 0 ? costoTotal / entregas : 0,
    kmPorPedido: entregas > 0 ? kmTotales / entregas : 0,
    paquetesPorKm: kmTotales > 0 ? paquetes / kmTotales : 0,
    utilizacionCapacidad: capacidad > 0 ? paquetes / capacidad : 0,
    entregasPorUnidad: unidades > 0 ? entregas / unidades : 0,
    holguraPromedioHoras: entregas > 0
      ? paradas.reduce((suma, parada) => suma + parada.holguraMinutos, 0) / entregas / 60
      : 0,
    porPlazo,
    porTipo,
    porAlmacen: [...almacenes.entries()].map(([codigo, datos]) => ({ codigo, ...datos })),
    refrigerios: {
      total: conRefrigerio.length,
      enVentana: conRefrigerio.filter((ruta) => ruta.alimentacionEnVentana).length,
    },
  };
}

/* ============================================================ CUELLOS DE BOTELLA (RF-72) */

export interface CuellosDeBotella {
  sinAtenderPorPlazo: { plazoHoras: number; cantidad: number }[];
  sinAtenderPorZona: { zona: string; cantidad: number }[];
  sinAtenderPorFranja: { franja: string; cantidad: number }[];
  unidadesUsadas: number;
  unidadesDisponibles: number;
}

/** Dónde se concentran los pedidos que no se pudieron atender. */
export function calcularCuellosDeBotella(ejecucion: EjecucionDto): CuellosDeBotella {
  const pendientes = ejecucion.pedidosSinAtender;
  const zona = (x: number, y: number) => `${y >= 25 ? "Norte" : "Sur"}-${x >= 35 ? "Este" : "Oeste"}`;
  const franja = (minuto: number) => {
    const hora = Math.floor((minuto % 1440) / 60);
    if (hora >= 7 && hora < 15) return "Turno 07:00–15:00";
    if (hora >= 15 && hora < 23) return "Turno 15:00–23:00";
    return "Turno 23:00–07:00";
  };
  const contar = (claves: string[]) => {
    const conteo = new Map<string, number>();
    claves.forEach((clave) => conteo.set(clave, (conteo.get(clave) ?? 0) + 1));
    return [...conteo.entries()].sort((a, b) => b[1] - a[1]);
  };
  return {
    sinAtenderPorPlazo: PLAZOS_HORAS.map((plazo) => ({
      plazoHoras: plazo,
      cantidad: pendientes.filter((pedido) => pedido.plazoHoras === plazo).length,
    })),
    sinAtenderPorZona: contar(pendientes.map((pedido) => zona(pedido.posX, pedido.posY))).map(([z, cantidad]) => ({
      zona: z,
      cantidad,
    })),
    sinAtenderPorFranja: contar(pendientes.map((pedido) => franja(pedido.minutoRegistro))).map(([f, cantidad]) => ({
      franja: f,
      cantidad,
    })),
    unidadesUsadas: ejecucion.metricas.unidadesEnRuta,
    unidadesDisponibles: ejecucion.metricas.unidadesDisponibles,
  };
}

/* ============================================================ EXPORTACIONES */

/** Resultados completos de la ejecución, en CSV que Excel abre directamente (RF-69). */
export function exportarResultados(escenario: EscenarioDto, ejecuciones: EjecucionDto[]): void {
  const resumen = ejecuciones.map((ejecucion) => {
    const indicadores = calcularIndicadores(ejecucion);
    return [
      ejecucion.algoritmo,
      ejecucion.metricas.pedidosDelTurno,
      ejecucion.metricas.pedidosAtendidos,
      ejecucion.metricas.pedidosSinAtender,
      ejecucion.metricas.entregasFueraDePlazo,
      indicadores.reasignados,
      Math.round(indicadores.tasaCumplimiento * 1000) / 10,
      ejecucion.metricas.distanciaTotalKm,
      ejecucion.metricas.costoOperativoTotal,
      indicadores.costoPorKm,
      ejecucion.metricas.unidadesEnRuta,
      ejecucion.metricas.duracionComputoMs,
      ejecucion.colapsoOcurrido ? ejecucion.fechaHoraColapso ?? "Sí" : "No",
    ];
  });
  const rutas = ejecuciones.flatMap((ejecucion) =>
    ejecucion.rutas.map((ruta) => [
      ejecucion.algoritmo,
      ruta.codigoUnidad,
      ruta.tipoUnidad,
      ruta.almacenOrigen,
      ruta.almacenDestino ?? ruta.almacenOrigen,
      ruta.cargaTotal,
      ruta.capacidad,
      ruta.paradas.length,
      ruta.distanciaKm,
      ruta.costoSoles,
      formatearTiempoSimulado(ruta.minutoSalida),
      formatearTiempoSimulado(ruta.minutoFin),
    ]),
  );
  const entregas = ejecuciones.flatMap((ejecucion) =>
    ejecucion.rutas.flatMap((ruta) =>
      ruta.paradas.map((parada) => [
        ejecucion.algoritmo,
        parada.codigoPedido,
        parada.clienteId,
        ruta.codigoUnidad,
        parada.cantidadProducto,
        parada.plazoHoras,
        formatearTiempoSimulado(parada.minutoRegistro),
        formatearTiempoSimulado(parada.minutoLlegada),
        formatearTiempoSimulado(parada.minutoLimite),
        parada.cumplePlazo ? "A tiempo" : "Fuera de plazo",
        parada.reasignado ? "Sí" : "No",
      ]),
    ),
  );
  descargarCsv(`resultados_${escenario.archivoVentas.replace(".txt", "")}_dia${escenario.dia}.csv`, [
    {
      titulo: `Resultados · ${escenario.archivoVentas} · día ${escenario.dia} · semilla ${escenario.semilla}`,
      encabezados: [
        "Algoritmo", "Pedidos", "Atendidos", "Sin atender", "Fuera de plazo", "Reasignados", "Cumplimiento %",
        "Km", "Costo S/", "Costo por km S/", "Unidades en ruta", "Cómputo ms", "Colapso",
      ],
      filas: resumen,
    },
    {
      titulo: "Rutas",
      encabezados: ["Algoritmo", "Unidad", "Tipo", "Sale de", "Retorna a", "Carga", "Capacidad", "Paradas", "Km", "Costo S/", "Salida", "Termina"],
      filas: rutas,
    },
    {
      titulo: "Entregas",
      encabezados: ["Algoritmo", "Pedido", "Cliente", "Unidad", "Cantidad", "Plazo h", "Registro", "Llegada", "Límite", "Resultado", "Reasignado"],
      filas: entregas,
    },
  ]);
}

/** Historial de averías, mantenimientos y bloqueos de calles (RF-67). */
export function exportarIncidencias(escenario: EscenarioDto, averias: AveriaSolicitada[]): void {
  descargarCsv(`incidencias_${escenario.archivoVentas.replace(".txt", "")}.csv`, [
    {
      titulo: "Averías",
      encabezados: ["Unidad", "Tipo", "Momento"],
      filas: averias.map((averia) => [averia.codigoUnidad, averia.tipo, formatearTiempoSimulado(averia.minutoSimulacion)]),
    },
    {
      titulo: "Mantenimiento preventivo",
      encabezados: ["Unidad", "Día", "Desde", "Hasta"],
      filas: (escenario.mantenimientosProgramados ?? []).map((mantenimiento) => [
        mantenimiento.codigoUnidad,
        mantenimiento.dia,
        formatearTiempoSimulado(mantenimiento.minutoInicio),
        formatearTiempoSimulado(mantenimiento.minutoFin),
      ]),
    },
    {
      titulo: "Bloqueos de calles",
      encabezados: ["Desde", "Hasta", "Tramo (nodos)"],
      filas: escenario.bloqueos.map((bloqueo) => [
        formatearTiempoSimulado(bloqueo.inicioMinuto),
        formatearTiempoSimulado(bloqueo.finMinuto),
        bloqueo.nodos.map(([x, y]) => `(${x},${y})`).join(" - "),
      ]),
    },
  ]);
}

/** Horas de alimentación de los conductores (RF-74). */
export function exportarRefrigerios(ejecuciones: EjecucionDto[]): void {
  descargarCsv("refrigerios.csv", [
    {
      encabezados: ["Algoritmo", "Unidad", "Inicio", "Fin", "Dentro de la ventana del turno"],
      filas: ejecuciones.flatMap((ejecucion) =>
        ejecucion.rutas
          .filter((ruta) => ruta.minutoInicioAlimentacion !== null && ruta.minutoInicioAlimentacion !== undefined)
          .map((ruta) => [
            ejecucion.algoritmo,
            ruta.codigoUnidad,
            formatearTiempoSimulado(ruta.minutoInicioAlimentacion ?? 0),
            formatearTiempoSimulado(ruta.minutoFinAlimentacion ?? 0),
            ruta.alimentacionEnVentana ? "Sí" : "No",
          ]),
      ),
    },
  ]);
}

/** Lista de pedidos tal como se ve (filtrada) en Gestión de Pedidos. */
export function exportarPedidos(pedidos: EstadoPedidoEnMapa[]): void {
  descargarCsv("pedidos.csv", [
    {
      encabezados: ["Pedido", "Cliente", "X", "Y", "Cantidad", "Plazo h", "Unidad", "Registro", "Entrega", "Límite", "Estado", "Reasignado"],
      filas: pedidos.map((pedido) => [
        pedido.codigoPedido,
        pedido.clienteId,
        pedido.x,
        pedido.y,
        pedido.cantidadProducto,
        pedido.plazoHoras,
        pedido.codigoUnidad ?? "",
        formatearTiempoSimulado(pedido.minutoRegistro),
        pedido.minutoLlegada === null ? "" : formatearTiempoSimulado(pedido.minutoLlegada),
        formatearTiempoSimulado(pedido.minutoLimite),
        pedido.estado,
        pedido.reasignado ? "Sí" : "No",
      ]),
    },
  ]);
}
