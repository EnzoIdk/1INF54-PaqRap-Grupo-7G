import type { AveriaSolicitada, TipoAveria } from "../types/Experimentacion";

/**
 * Duración de cada tipo de avería, con la misma regla que el backend
 * (`model/Averia.calcularMinutoDisponibilidad`, Q&A 3):
 * - Tipo 1: 2 horas fuera de servicio.
 * - Tipo 2: hasta el fin del turno siguiente, con un máximo de 4 horas.
 * - Tipo 3: al menos 2 días; vuelve en el turno de las 15:00.
 */
const HORAS_CAMBIO_TURNO = [7, 15, 23];

export function minutoFinDeAveria(tipo: TipoAveria, minutoInicio: number): number {
  switch (tipo) {
    case "TIPO_1":
      return minutoInicio + 120;
    case "TIPO_2":
      return Math.min(finDelSiguienteTurno(minutoInicio), minutoInicio + 240);
    case "TIPO_3": {
      const minimo = minutoInicio + 2 * 1440;
      const minutoDelDia = minimo % 1440;
      const inicioDelDia = minimo - minutoDelDia;
      return minutoDelDia <= 15 * 60 ? inicioDelDia + 15 * 60 : inicioDelDia + 1440 + 15 * 60;
    }
    default:
      return minutoInicio + 120;
  }
}

function finDelSiguienteTurno(minuto: number): number {
  const minutoDelDia = minuto % 1440;
  const inicioDelDia = minuto - minutoDelDia;
  for (const hora of HORAS_CAMBIO_TURNO) {
    if (hora * 60 > minutoDelDia) {
      return inicioDelDia + hora * 60;
    }
  }
  return inicioDelDia + 1440 + HORAS_CAMBIO_TURNO[0] * 60;
}

export interface AveriaVigente {
  codigoUnidad: string;
  tipo: TipoAveria;
  minutoInicio: number;
  minutoFin: number;
}

/** Averías activas en el minuto dado: solo se muestran el tiempo que duran (rúbrica D13). */
export function averiasVigentes(averias: AveriaSolicitada[], minutoActual: number): AveriaVigente[] {
  return averias
    .map((averia) => ({
      codigoUnidad: averia.codigoUnidad,
      tipo: averia.tipo,
      minutoInicio: averia.minutoSimulacion,
      minutoFin: minutoFinDeAveria(averia.tipo, averia.minutoSimulacion),
    }))
    .filter((averia) => minutoActual >= averia.minutoInicio && minutoActual < averia.minutoFin);
}

/** Color propio de cada tipo de avería, distinto del semáforo de stock (rúbrica D11). */
export const COLOR_TIPO_AVERIA: Record<TipoAveria, string> = {
  TIPO_1: "var(--color-averia-1)",
  TIPO_2: "var(--color-averia-2)",
  TIPO_3: "var(--color-averia-3)",
};

export const ETIQUETA_TIPO_AVERIA: Record<TipoAveria, string> = {
  TIPO_1: "Tipo 1 · menor (2 h)",
  TIPO_2: "Tipo 2 · intermedia (≤ 4 h)",
  TIPO_3: "Tipo 3 · mayor (2 días)",
};
