import { memo } from "react";
import { aCoordenadaPantalla } from "../../utils/coordenadas";

interface CapaBloqueosProps {
  bloqueos: Array<{ id: number; nodos: Array<[number, number]> }>;
}

/**
 * Dibuja los tramos bloqueados vigentes como una polilinea sobre el mapa.
 */
const CapaBloqueos = ({ bloqueos }: CapaBloqueosProps) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
  >
    {bloqueos.map((bloqueo) => {
      const puntos = bloqueo.nodos
        .map(([x, y]) => {
          const posicion = aCoordenadaPantalla(x, y);
          return `${posicion.left},${posicion.top}`;
        })
        .join(" ");
      return (
        <polyline
          key={bloqueo.id}
          points={puntos}
          stroke="var(--color-semaforo-rojo)"
          strokeWidth={3}
          fill="none"
        />
      );
    })}
  </svg>
);

export default memo(CapaBloqueos);
