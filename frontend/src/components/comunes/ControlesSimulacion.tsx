import { Pause, Play, RotateCcw } from "lucide-react";
import Boton from "./Boton";
import {
  VELOCIDADES_REPRODUCCION,
  formatearEtiquetaVelocidad,
} from "../../utils/constants";
import { MINUTOS_POR_SEGUNDO_TIEMPO_REAL, useSimulacionStore } from "../../store/simulacionStore";
import "./ControlesSimulacion.css";

interface ControlesSimulacionProps {
  reproduciendo: boolean;
  habilitado: boolean;
  minutosPorSegundo: number;
  modoSimulacion?: "1D" | "5D" | "COLAPSO";
  onAlternar: () => void;
  onReiniciar: () => void;
  onDetener: () => void;
  onCambiarVelocidad: (minutosPorSegundo: number) => void;
}

/**
 * Controles de la simulacion del encabezado de mapa. Pausa y reinicio usan
 * botones de solo icono; "Detener" usa la variante destructiva con texto
 * explicito, al ser la accion que descarta la reproduccion en curso
 * (STD 2.6.2).
 */
const ControlesSimulacion = ({
  reproduciendo,
  habilitado,
  minutosPorSegundo,
  modoSimulacion,
  onAlternar,
  onReiniciar,
  onDetener,
  onCambiarVelocidad,
}: ControlesSimulacionProps) => {
  const modoStore = useSimulacionStore((estado) => estado.modoSimulacion);
  const tiempoReal = useSimulacionStore((estado) => estado.tiempoReal);
  const modoActivo = modoSimulacion ?? modoStore;

  return (
    <div className="controles">
      <label className="controles__velocidad">
        <span className="controles__rotulo">Velocidad</span>
        <select
          value={minutosPorSegundo}
          disabled={!habilitado}
          onChange={(evento) => onCambiarVelocidad(Number(evento.target.value))}
          aria-label="Minutos simulados por segundo real"
        >
          {tiempoReal && (
            <option value={MINUTOS_POR_SEGUNDO_TIEMPO_REAL}>Tiempo real · hora de Lima</option>
          )}
          {VELOCIDADES_REPRODUCCION.map((velocidad) => (
            <option key={velocidad.minutosPorSegundo} value={velocidad.minutosPorSegundo}>
              {formatearEtiquetaVelocidad(velocidad, modoActivo)}
            </option>
          ))}
        </select>
      </label>

    <Boton
      variante="secundario"
      soloIcono
      disabled={!habilitado}
      onClick={onAlternar}
      title={reproduciendo ? "Pausar la simulación" : "Reanudar la simulación"}
      aria-label={reproduciendo ? "Pausar la simulación" : "Reanudar la simulación"}
      icono={reproduciendo ? <Pause size={16} /> : <Play size={16} />}
    />

    <Boton
      variante="secundario"
      soloIcono
      disabled={!habilitado}
      onClick={onReiniciar}
      title="Volver al inicio del turno"
      aria-label="Volver al inicio del turno"
      icono={<RotateCcw size={16} />}
    />

    <Boton variante="destructivo" disabled={!habilitado} onClick={onDetener}>
      Detener
    </Boton>
  </div>
  );
};

export default ControlesSimulacion;
