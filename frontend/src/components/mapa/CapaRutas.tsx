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

        const minutoInicioRetorno = ruta.minutoInicioRetorno ?? ruta.minutoFin;
        let indiceRetorno = ruta.minutosPorNodo.lastIndexOf(minutoInicioRetorno);
        if (indiceRetorno === -1) {
          indiceRetorno = ruta.minutosPorNodo.findIndex((m) => m >= minutoInicioRetorno);
        }
        if (indiceRetorno === -1) {
          indiceRetorno = ruta.recorrido.length - 1;
        }

        let yaRecorrido: string[] = [];
        let pendienteEntrega: string[] = [];
        let pendienteRetorno: string[] = [];

        if (minutoActual !== undefined && minutoActual < ruta.minutoSalida) {
          pendienteEntrega = recorrido.slice(0, indiceRetorno + 1);
          pendienteRetorno = recorrido.slice(indiceRetorno);
        } else if (minutoActual !== undefined && minutoActual > ruta.minutoFin) {
          yaRecorrido = recorrido;
        } else {
          const corte = posicion?.indiceNodoActual ?? 0;
          const puntoActual =
            posicion && esRutaActiva
              ? `${escala.aX(posicion.x)},${escala.aY(posicion.y)}`
              : null;

          if (corte < indiceRetorno) {
            // Fase de entregas
            yaRecorrido = recorrido.slice(0, corte + 1);
            if (puntoActual) {
              yaRecorrido.push(puntoActual);
            }

            pendienteEntrega = (puntoActual ? [puntoActual] : []).concat(
              recorrido.slice(corte + 1, indiceRetorno + 1)
            );
            pendienteRetorno = recorrido.slice(indiceRetorno);
          } else {
            // Fase de retorno al almacén
            yaRecorrido = recorrido.slice(0, corte + 1);
            if (puntoActual) {
              yaRecorrido.push(puntoActual);
            }

            pendienteEntrega = [];
            pendienteRetorno = (puntoActual ? [puntoActual] : []).concat(
              recorrido.slice(corte + 1)
            );
          }
        }

        return (
          <g key={`${ruta.codigoUnidad}-${ruta.minutoSalida}`} opacity={atenuada ? 0.18 : 1}>
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
            {pendienteEntrega.length > 1 && (
              <polyline
                points={pendienteEntrega.join(" ")}
                fill="none"
                stroke={COLOR_TIPO_UNIDAD[ruta.tipoUnidad]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {pendienteRetorno.length > 1 && (
              <polyline
                points={pendienteRetorno.join(" ")}
                fill="none"
                stroke="var(--color-ruta-retorno)"
                strokeWidth={2.5}
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
