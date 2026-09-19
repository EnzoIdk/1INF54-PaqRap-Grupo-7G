/** Formatea un minuto de simulacion como dia, hora y minuto del escenario. */
export function formatearTiempoSimulado(minutoSimulacion: number): string {
  const dia = Math.floor(minutoSimulacion / 1440) + 1;
  const hora = Math.floor((minutoSimulacion % 1440) / 60);
  const minuto = minutoSimulacion % 60;
  return `Dia ${dia} - ${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

/** Formatea un monto en soles con dos decimales. */
export function formatearSoles(monto: number): string {
  return `S/ ${monto.toFixed(2)}`;
}
