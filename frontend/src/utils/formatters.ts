import { MINUTOS_POR_DIA, MINUTOS_POR_HORA } from "./constants";

/**
 * Formatea un minuto de simulacion como `##d ##h ##m`, el mismo formato con
 * el que los archivos del cliente expresan los instantes (STD 4.7.2). El dia
 * empieza en 1, igual que en los registros de ventas y de bloqueos.
 */
export function formatearTiempoSimulado(minutoSimulacion: number): string {
  const minutos = Math.max(0, Math.round(minutoSimulacion));
  const dia = Math.floor(minutos / MINUTOS_POR_DIA) + 1;
  const resto = minutos % MINUTOS_POR_DIA;
  const hora = Math.floor(resto / MINUTOS_POR_HORA);
  const minuto = resto % MINUTOS_POR_HORA;
  return `${dosDigitos(dia)}d ${dosDigitos(hora)}h ${dosDigitos(minuto)}m`;
}

/** Solo la hora del dia, para cuando el dia ya esta en el contexto. */
export function formatearHoraDelDia(minutoSimulacion: number): string {
  const resto = Math.max(0, Math.round(minutoSimulacion)) % MINUTOS_POR_DIA;
  return `${dosDigitos(Math.floor(resto / MINUTOS_POR_HORA))}:${dosDigitos(resto % MINUTOS_POR_HORA)}`;
}

/** Tiempo real transcurrido desde que arranco la reproduccion, en hh:mm:ss. */
export function formatearTiempoReal(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(total % 60)}`;
}

/**
 * Cuenta regresiva del plazo comprometido. Devuelve el texto y la urgencia,
 * que determina el color de la celda (STD 2.5.4).
 */
export function formatearRestante(minutosRestantes: number): {
  texto: string;
  urgencia: "vencido" | "critica" | "proxima" | "holgada";
} {
  // El reloj de la simulacion avanza en fracciones de minuto, asi que la
  // cuenta regresiva se redondea antes de descomponerla en horas y minutos.
  const restantes = Math.floor(minutosRestantes);
  if (restantes < 0) {
    return { texto: "Vencido", urgencia: "vencido" };
  }
  const horas = Math.floor(restantes / MINUTOS_POR_HORA);
  const minutos = restantes % MINUTOS_POR_HORA;
  const texto = `${dosDigitos(horas)} h ${dosDigitos(minutos)} m`;

  if (restantes < MINUTOS_POR_HORA) {
    return { texto, urgencia: "critica" };
  }
  if (restantes < 2 * MINUTOS_POR_HORA) {
    return { texto, urgencia: "proxima" };
  }
  return { texto, urgencia: "holgada" };
}

/** Formatea un monto en soles con dos decimales. */
export function formatearSoles(monto: number): string {
  return `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatearKm(distancia: number): string {
  return `${distancia.toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function formatearMilisegundos(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function dosDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** Limpia el texto de motivo de colapso para que muestre la fecha en vez del minuto bruto */
export function formatearMotivoColapso(motivo?: string | null): string {
  if (!motivo) return "";
  return motivo
    .replace(/vence en el minuto \d+ \((\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})\)/g, "vence el $1 a las $2")
    .replace(/vence en el minuto \d+ \((.*?)\)/g, "vence el $1")
    .replace(/vence el (\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/g, "vence el $1 a las $2")
    .replace(/llega en el minuto \d+ \((\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})\)/g, "llega el $1 a las $2")
    .replace(/llega en el minuto \d+ \((.*?)\)/g, "llega el $1")
    .replace(/llega el (\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/g, "llega el $1 a las $2");
}
