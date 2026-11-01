import type { PosicionUnidad, Rumbo } from "../../hooks/usePosicionesFlota";
import type { AveriaVigente } from "../../utils/averias";
import { nivelUnidad, ocupacionUnidad, type NivelSemaforo, type UmbralesSemaforo } from "../../utils/semaforo";

export const SENTIDO: Record<Rumbo, string> = {
  E: "hacia el este",
  O: "hacia el oeste",
  N: "hacia el norte",
  S: "hacia el sur",
};

export interface EstadoUnidad {
  averia: AveriaVigente | undefined;
  enMantenimiento: boolean;
  nivel: NivelSemaforo;
  ocupacion: number;
}

/** Avería vigente, mantenimiento y semáforo de ocupación de una unidad en este instante. */
export function estadoUnidad(
  unidad: PosicionUnidad,
  averias: AveriaVigente[],
  unidadesEnMantenimiento: string[],
  umbrales: UmbralesSemaforo,
): EstadoUnidad {
  const averia = averias.find((candidata) => candidata.codigoUnidad === unidad.codigoUnidad);
  const enMantenimiento =
    !averia &&
    unidadesEnMantenimiento.includes(unidad.codigoUnidad) &&
    unidad.enAlmacen &&
    !unidad.entregando &&
    unidad.entregasHechas === 0;
  return {
    averia,
    enMantenimiento,
    nivel: nivelUnidad(unidad.cargaRestante, unidad.capacidad, umbrales),
    ocupacion: ocupacionUnidad(unidad.cargaRestante, unidad.capacidad),
  };
}

export function describirSituacion(unidad: PosicionUnidad, enMantenimiento: boolean): string {
  if (unidad.entregando) {
    return "Entregando al cliente";
  }
  if (unidad.retornando) {
    return `Retornando a ${unidad.almacenDestino ?? "un almacén"}`;
  }
  if (!unidad.enAlmacen && !unidad.finalizada) {
    return "En ruta";
  }
  if (enMantenimiento) {
    return "En mantenimiento preventivo";
  }
  if (unidad.sinAsignacion) {
    return "Disponible en el almacén, sin asignación";
  }
  if (unidad.finalizada) {
    return "Ruta completada";
  }
  return "En el almacén";
}

/** Distancia en píxeles bajo la cual dos unidades se consideran superpuestas en el mapa. */
const DISTANCIA_GRUPO_PX = 12;

/**
 * Agrupa las unidades que quedan una sobre otra en pantalla (mismo almacén,
 * mismo cruce) para poder listarlas todas al pasar el cursor.
 */
export function agruparSuperpuestas(
  unidades: PosicionUnidad[],
  aX: (x: number) => number,
  aY: (y: number) => number,
): Map<string, string[]> {
  const grupos: { x: number; y: number; codigos: string[] }[] = [];
  unidades.forEach((unidad) => {
    const x = aX(unidad.x);
    const y = aY(unidad.y);
    const grupo = grupos.find((candidato) => Math.hypot(candidato.x - x, candidato.y - y) < DISTANCIA_GRUPO_PX);
    if (grupo) {
      grupo.codigos.push(unidad.codigoUnidad);
    } else {
      grupos.push({ x, y, codigos: [unidad.codigoUnidad] });
    }
  });
  const porUnidad = new Map<string, string[]>();
  grupos.forEach((grupo) => grupo.codigos.forEach((codigo) => porUnidad.set(codigo, grupo.codigos)));
  return porUnidad;
}
