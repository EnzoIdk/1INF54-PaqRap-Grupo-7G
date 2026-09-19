import { formatearTiempoSimulado } from "../../utils/formatters";

interface RelojSimulacionProps {
  minutoSimulacionActual: number;
  segundosRealesTranscurridos: number;
}

/**
 * Muestra simultaneamente el tiempo simulado y el tiempo real transcurrido
 * desde el inicio de la ejecucion (STD 5.6).
 */
const RelojSimulacion = ({ minutoSimulacionActual, segundosRealesTranscurridos }: RelojSimulacionProps) => (
  <div style={{ display: "flex", gap: 16, fontVariantNumeric: "tabular-nums" }}>
    <span>Tiempo simulado: {formatearTiempoSimulado(minutoSimulacionActual)}</span>
    <span>Tiempo real: {new Date(segundosRealesTranscurridos * 1000).toISOString().substring(11, 19)}</span>
  </div>
);

export default RelojSimulacion;
