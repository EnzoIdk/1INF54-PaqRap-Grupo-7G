import { memo } from "react";
import type { BloqueoDto } from "../../types/Experimentacion";
import type { EscalaMapa } from "../../utils/coordenadas";

interface CapaBloqueosProps {
  bloqueos: BloqueoDto[];
  escala: EscalaMapa;
  /** Minuto de simulacion actual: solo se dibuja lo que esta vigente. */
  minutoActual: number;
}

/**
 * Tramos cerrados por la municipalidad: polilinea de 3 px en rojo con trazo
 * discontinuo, sobre la secuencia de nodos del bloqueo (STD 2.6.3).
 *
 * <p>Solo se dibujan los bloqueos vigentes en el minuto que se esta
 * reproduciendo: un bloqueo que ya termino deja de condicionar la
 * circulacion y no debe seguir en el mapa.</p>
 */
const CapaBloqueos = ({ bloqueos, escala, minutoActual }: CapaBloqueosProps) => (
  <g>
    {bloqueos
      .filter((bloqueo) => minutoActual >= bloqueo.inicioMinuto && minutoActual < bloqueo.finMinuto)
      .map((bloqueo, indice) => (
        <polyline
          key={`${bloqueo.inicioMinuto}-${indice}`}
          points={bloqueo.nodos.map(([x, y]) => `${escala.aX(x)},${escala.aY(y)}`).join(" ")}
          fill="none"
          stroke="var(--color-semaforo-rojo)"
          strokeWidth={3}
          strokeDasharray="6 4"
          strokeLinecap="round"
        >
          <title>
            {`Tramo bloqueado (${bloqueo.nodos.map(([x, y]) => `${x},${y}`).join(") - (")})`}
          </title>
        </polyline>
      ))}
  </g>
);

export default memo(CapaBloqueos);
