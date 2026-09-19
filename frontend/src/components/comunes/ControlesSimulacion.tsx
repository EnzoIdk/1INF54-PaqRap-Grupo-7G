import { Pause, Play, RotateCcw } from "lucide-react";
import Boton from "./Boton";
import { VELOCIDADES_REPRODUCCION } from "../../utils/constants";
import "./ControlesSimulacion.css";

interface ControlesSimulacionProps {
  reproduciendo: boolean;
  habilitado: boolean;
  minutosPorSegundo: number;
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
  onAlternar,
  onReiniciar,
  onDetener,
  onCambiarVelocidad,
}: ControlesSimulacionProps) => (
  <div className="controles">
    <label className="controles__velocidad">
      <span className="controles__rotulo">Velocidad</span>
      <select
        value={minutosPorSegundo}
        disabled={!habilitado}
        onChange={(evento) => onCambiarVelocidad(Number(evento.target.value))}
        aria-label="Minutos simulados por segundo real"
      >
        {VELOCIDADES_REPRODUCCION.map((velocidad) => (
          <option key={velocidad.etiqueta} value={velocidad.minutosPorSegundo}>
            {velocidad.etiqueta} · {velocidad.minutosPorSegundo} min/s
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

export default ControlesSimulacion;
