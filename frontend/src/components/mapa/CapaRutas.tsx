import { memo } from "react";
import type { RutaDto } from "../../types/Experimentacion";
import type { PosicionUnidad } from "../../hooks/usePosicionesFlota";
import { COLOR_TIPO_UNIDAD } from "../../utils/constants";
import type { EscalaMapa } from "../../utils/coordenadas";

interface CapaRutasProps {
  rutas: RutaDto[];
  posiciones: PosicionUnidad[];
  escala: EscalaMapa;
  /** Cuando hay una unidad enfocada, las demas rutas se atenuan. */
  unidadEnfocada: string | null;
  minutoActual?: number;
}

/**
 * Rutas sobre la reticula. Lo pendiente se dibuja como una polilinea de
 * 2 px en el color de la unidad que la recorre; lo ya ejecutado, en gris,
 * para distinguirlo de un vistazo (STD 2.6.3).
 */
const CapaRutas = ({ rutas, posiciones, escala, unidadEnfocada, minutoActual }: CapaRutasProps) => {
  const rutasVisibles = rutas.filter((ruta) => {
    if (minutoActual === undefined || rutas.length <= 25) {
      return true;
    }
    if (unidadEnfocada && ruta.codigoUnidad === unidadEnfocada) {
      return true;
    }
    if (minutoActual >= ruta.minutoSalida && minutoActual <= ruta.minutoFin) {
      return true;
    }
    if (minutoActual < ruta.minutoSalida && ruta.minutoSalida - minutoActual <= 180) {
      return true;
    }
    if (minutoActual > ruta.minutoFin && minutoActual - ruta.minutoFin <= 60) {
      return true;
    }
    return false;
  });

  return (
    <g>
      {rutasVisibles.map((ruta) => {
        const posicion = posiciones.find((candidata) => candidata.codigoUnidad === ruta.codigoUnidad);
        const atenuada = unidadEnfocada !== null && unidadEnfocada !== ruta.codigoUnidad;
        const recorrido = ruta.recorrido.map(([x, y]) => `${escala.aX(x)},${escala.aY(y)}`);

        const esRutaActiva =
          minutoActual !== undefined
            ? minutoActual >= ruta.minutoSalida && minutoActual <= ruta.minutoFin
            : true;

        let yaRecorrido: string[] = [];
        let pendiente: string[] = [];

        if (minutoActual !== undefined && minutoActual < ruta.minutoSalida) {
          pendiente = recorrido;
        } else if (minutoActual !== undefined && minutoActual > ruta.minutoFin) {
          yaRecorrido = recorrido;
        } else {
          const corte = posicion?.indiceNodoActual ?? 0;
          yaRecorrido = recorrido.slice(0, corte + 1);
          pendiente = recorrido.slice(corte);

          if (posicion && esRutaActiva) {
            const puntoActual = `${escala.aX(posicion.x)},${escala.aY(posicion.y)}`;
            yaRecorrido.push(puntoActual);
            pendiente[0] = puntoActual;
          }
        }

        return (
          <g key={`${ruta.codigoUnidad}-${ruta.minutoSalida}`} opacity={atenuada ? 0.18 : 1}>
            {pendiente.length > 1 && (
              <polyline
                points={pendiente.join(" ")}
                fill="none"
                stroke={COLOR_TIPO_UNIDAD[ruta.tipoUnidad]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {yaRecorrido.length > 1 && (
              <polyline
                points={yaRecorrido.join(" ")}
                fill="none"
                stroke="var(--color-ruta-recorrida)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

export default memo(CapaRutas);
