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
}

/**
 * Rutas sobre la reticula. Lo pendiente se dibuja como una polilinea de
 * 2 px en el color de la unidad que la recorre; lo ya ejecutado, en gris,
 * para distinguirlo de un vistazo (STD 2.6.3).
 */
const CapaRutas = ({ rutas, posiciones, escala, unidadEnfocada }: CapaRutasProps) => (
  <g>
    {rutas.map((ruta) => {
      const posicion = posiciones.find((candidata) => candidata.codigoUnidad === ruta.codigoUnidad);
      const atenuada = unidadEnfocada !== null && unidadEnfocada !== ruta.codigoUnidad;
      const corte = posicion?.indiceNodoActual ?? 0;

      const recorrido = ruta.recorrido.map(([x, y]) => `${escala.aX(x)},${escala.aY(y)}`);
      const yaRecorrido = recorrido.slice(0, corte + 1);
      const pendiente = recorrido.slice(corte);

      if (posicion) {
        // El tramo ya recorrido llega hasta donde esta la unidad ahora mismo.
        const puntoActual = `${escala.aX(posicion.x)},${escala.aY(posicion.y)}`;
        yaRecorrido.push(puntoActual);
        pendiente[0] = puntoActual;
      }

      return (
        <g key={ruta.codigoUnidad} opacity={atenuada ? 0.18 : 1}>
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

export default memo(CapaRutas);
