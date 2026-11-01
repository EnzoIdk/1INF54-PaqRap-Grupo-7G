import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { useSimulacionStore } from "../../store/simulacionStore";
import type { TipoUnidad } from "../../types/Experimentacion";
import { COLOR_TIPO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from "../../utils/constants";
import { COLOR_NIVEL, ETIQUETA_NIVEL, NIVELES_SEMAFORO } from "../../utils/semaforo";
import { Chip } from "../comunes/Campo";
import "./FiltrosMapa.css";

const TIPOS: TipoUnidad[] = ["AUTO", "MOTO", "BICICLETA"];

/**
 * Filtros globales del mapa (rúbrica D05, D06, F16, F18): por tipo de unidad
 * y por semáforo + vacío de ocupación. Comparten estado con el panel de
 * flota, así que filtrar aquí o allí da el mismo resultado en ambos.
 */
const FiltrosMapa = () => {
  const [abierto, setAbierto] = useState(false);
  const tiposVisibles = useSimulacionStore((estado) => estado.tiposVisibles);
  const alternarTipo = useSimulacionStore((estado) => estado.alternarTipoVisible);
  const nivelesVisibles = useSimulacionStore((estado) => estado.nivelesVisibles);
  const alternarNivel = useSimulacionStore((estado) => estado.alternarNivelVisible);

  const ocultos = TIPOS.length - tiposVisibles.length + NIVELES_SEMAFORO.length - nivelesVisibles.length;

  useEffect(() => {
    if (!abierto) {
      return;
    }
    const alPulsar = (evento: KeyboardEvent) => evento.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  const restablecer = () => {
    TIPOS.filter((tipo) => !tiposVisibles.includes(tipo)).forEach(alternarTipo);
    NIVELES_SEMAFORO.filter((nivel) => !nivelesVisibles.includes(nivel)).forEach(alternarNivel);
  };

  return (
    <div className="filtros-mapa">
      <button
        type="button"
        className={`filtros-mapa__boton ${abierto || ocultos > 0 ? "filtros-mapa__boton--activo" : ""}`}
        aria-expanded={abierto}
        onClick={() => setAbierto((actual) => !actual)}
      >
        <Filter size={14} aria-hidden />
        Filtros
        {ocultos > 0 && <span className="filtros-mapa__contador">{ocultos}</span>}
        {abierto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      </button>
      {abierto && (
        <div className="filtros-mapa__panel">
          <span className="rotulo">Tipo de unidad</span>
          <div className="filtros-mapa__chips">
            {TIPOS.map((tipo) => (
              <Chip
                key={tipo}
                etiqueta={ETIQUETA_TIPO_UNIDAD[tipo]}
                color={COLOR_TIPO_UNIDAD[tipo]}
                activo={tiposVisibles.includes(tipo)}
                onClick={() => alternarTipo(tipo)}
              />
            ))}
          </div>
          <span className="rotulo">Ocupación de la unidad (semáforo + vacío)</span>
          <div className="filtros-mapa__chips">
            {NIVELES_SEMAFORO.map((nivel) => (
              <Chip
                key={nivel}
                etiqueta={ETIQUETA_NIVEL[nivel]}
                color={COLOR_NIVEL[nivel]}
                activo={nivelesVisibles.includes(nivel)}
                onClick={() => alternarNivel(nivel)}
              />
            ))}
          </div>
          <button type="button" className="filtros-mapa__restablecer" disabled={ocultos === 0} onClick={restablecer}>
            Mostrar todo
          </button>
        </div>
      )}
    </div>
  );
};

export default FiltrosMapa;
