import { MINUTOS_POR_DIA, MINUTOS_POR_HORA } from "./constants";

/**
 * Hora oficial de la operación: la empresa trabaja con la hora de Lima,
 * sin importar la zona horaria del navegador del usuario (RF-44).
 */
export const ZONA_HORARIA_OPERACION = "America/Lima";

export interface InstanteOperacion {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

const FORMATO_LIMA = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA_HORARIA_OPERACION,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function ahoraEnLima(fecha: Date = new Date()): InstanteOperacion {
  const partes = Object.fromEntries(
    FORMATO_LIMA.formatToParts(fecha).map((parte) => [parte.type, parte.value]),
  );
  return {
    anio: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour) % 24,
    minuto: Number(partes.minute),
    segundo: Number(partes.second),
  };
}

/** Minuto de simulación (desde el inicio del mes) que corresponde a un instante real. */
export function minutoDelMes(instante: InstanteOperacion): number {
  return (
    (instante.dia - 1) * MINUTOS_POR_DIA +
    instante.hora * MINUTOS_POR_HORA +
    instante.minuto +
    instante.segundo / 60
  );
}

export interface TurnoOperacion {
  /** Día del mes en que empezó el turno vigente. */
  dia: number;
  /** Hora de inicio del turno: 07, 15 o 23 (RF-25). */
  horaInicio: number;
  /** Horas que restan del turno a partir de su inicio; normalmente 8. */
  ventanaHoras: number;
}

/**
 * Turno vigente según los cambios de turno fijos de las 07:00, 15:00 y 23:00.
 * Antes de las 07:00 el turno empezó a las 23:00 del día anterior; el día 1
 * no tiene día anterior en el archivo del mes, así que se toma desde las 00:00.
 */
export function turnoVigente(instante: InstanteOperacion): TurnoOperacion {
  if (instante.hora >= 23) {
    return { dia: instante.dia, horaInicio: 23, ventanaHoras: 8 };
  }
  if (instante.hora >= 15) {
    return { dia: instante.dia, horaInicio: 15, ventanaHoras: 8 };
  }
  if (instante.hora >= 7) {
    return { dia: instante.dia, horaInicio: 7, ventanaHoras: 8 };
  }
  if (instante.dia > 1) {
    return { dia: instante.dia - 1, horaInicio: 23, ventanaHoras: 8 };
  }
  return { dia: 1, horaInicio: 0, ventanaHoras: 7 };
}

export function formatearFechaHoraLima(instante: InstanteOperacion): string {
  const dos = (valor: number) => String(valor).padStart(2, "0");
  return `${dos(instante.dia)}/${dos(instante.mes)}/${instante.anio} ${dos(instante.hora)}:${dos(instante.minuto)}`;
}
