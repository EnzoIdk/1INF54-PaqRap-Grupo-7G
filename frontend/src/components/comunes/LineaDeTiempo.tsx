import { formatearTiempoSimulado } from "../../utils/formatters";
import "./LineaDeTiempo.css";

interface LineaDeTiempoProps {
  minutoInicio: number;
  minutoFin: number;
  minutoActual: number;
  habilitado: boolean;
  onCambiar: (minuto: number) => void;
}

/**
 * Barra de avance del turno. Permite adelantar o retroceder la
 * reproduccion hasta cualquier instante, que es lo que necesita el
 * supervisor para revisar un momento concreto sin esperar a que la
 * simulacion vuelva a llegar.
 */
const LineaDeTiempo = ({ minutoInicio, minutoFin, minutoActual, habilitado, onCambiar }: LineaDeTiempoProps) => {
  const duracion = Math.max(1, minutoFin - minutoInicio);
  const avance = Math.min(1, Math.max(0, (minutoActual - minutoInicio) / duracion));

  return (
    <div className="linea-tiempo">
      <span className="cifra linea-tiempo__extremo">{formatearTiempoSimulado(minutoInicio)}</span>

      <span className="linea-tiempo__pista">
        <span className="linea-tiempo__avance" style={{ width: `${avance * 100}%` }} />
        <input
          type="range"
          min={minutoInicio}
          max={minutoFin}
          step={1}
          value={Math.round(minutoActual)}
          disabled={!habilitado}
          onChange={(evento) => onCambiar(Number(evento.target.value))}
          aria-label="Instante de la simulación"
        />
      </span>

      <span className="cifra linea-tiempo__extremo">{formatearTiempoSimulado(minutoFin)}</span>
    </div>
  );
};

export default LineaDeTiempo;
