import { memo } from "react";
import { ALTO_MAPA_KM, ANCHO_MAPA_KM } from "../../utils/constants";
import type { EscalaMapa } from "../../utils/coordenadas";

interface CapaReticulaProps {
  escala: EscalaMapa;
}

const PASO_MENOR_KM = 5;
const PASO_MAYOR_KM = 10;

/**
 * Retícula de la ciudad: lineas de guia cada 5 km y cada 10 km, con
 * rotulos numericos en los bordes inferior e izquierdo (STD 2.6.3).
 */
const CapaReticula = ({ escala }: CapaReticulaProps) => {
  const verticales = [];
  const horizontales = [];
  const rotulosX = [];
  const rotulosY = [];

  for (let x = 0; x <= ANCHO_MAPA_KM; x += PASO_MENOR_KM) {
    const esMayor = x % PASO_MAYOR_KM === 0;
    verticales.push(
      <line
        key={`v-${x}`}
        x1={escala.aX(x)}
        y1={escala.aY(ALTO_MAPA_KM)}
        x2={escala.aX(x)}
        y2={escala.aY(0)}
        stroke={esMayor ? "var(--color-reticula-mayor)" : "var(--color-reticula-menor)"}
        strokeWidth={1}
      />,
    );
    if (esMayor) {
      rotulosX.push(
        <text key={`rx-${x}`} x={escala.aX(x)} y={escala.aY(0) + 16} className="mapa__rotulo-eje">
          {x}
        </text>,
      );
    }
  }

  for (let y = 0; y <= ALTO_MAPA_KM; y += PASO_MENOR_KM) {
    const esMayor = y % PASO_MAYOR_KM === 0;
    horizontales.push(
      <line
        key={`h-${y}`}
        x1={escala.aX(0)}
        y1={escala.aY(y)}
        x2={escala.aX(ANCHO_MAPA_KM)}
        y2={escala.aY(y)}
        stroke={esMayor ? "var(--color-reticula-mayor)" : "var(--color-reticula-menor)"}
        strokeWidth={1}
      />,
    );
    if (esMayor) {
      rotulosY.push(
        <text
          key={`ry-${y}`}
          x={escala.aX(0) - 8}
          y={escala.aY(y) + 3}
          className="mapa__rotulo-eje mapa__rotulo-eje--y"
        >
          {y}
        </text>,
      );
    }
  }

  return (
    <g>
      <rect
        x={escala.aX(0)}
        y={escala.aY(ALTO_MAPA_KM)}
        width={escala.anchoUtil}
        height={escala.altoUtil}
        fill="var(--color-fondo)"
      />
      {verticales}
      {horizontales}
      <rect
        x={escala.aX(0)}
        y={escala.aY(ALTO_MAPA_KM)}
        width={escala.anchoUtil}
        height={escala.altoUtil}
        fill="none"
        stroke="var(--color-borde)"
        strokeWidth={1}
      />
      {rotulosX}
      {rotulosY}
      <text
        x={escala.aX(ANCHO_MAPA_KM / 2)}
        y={escala.aY(0) + 30}
        className="mapa__rotulo-eje mapa__rotulo-eje--titulo"
      >
        Eje X (km)
      </text>
    </g>
  );
};

export default memo(CapaReticula);
