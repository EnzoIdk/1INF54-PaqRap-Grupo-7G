import { memo, useMemo } from "react";
import type { PosicionUnidad } from "../../hooks/usePosicionesFlota";
import { COLOR_TIPO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from "../../utils/constants";
import type { EscalaMapa } from "../../utils/coordenadas";
import { COLOR_TIPO_AVERIA, type AveriaVigente } from "../../utils/averias";
import { COLOR_NIVEL, ETIQUETA_NIVEL, type UmbralesSemaforo } from "../../utils/semaforo";
import IconoVehiculo, { LADO_VEHICULO } from "./IconoVehiculo";
import { agruparSuperpuestas, describirSituacion, estadoUnidad } from "./estadoUnidad";

interface CapaUnidadesProps {
  unidades: PosicionUnidad[];
  escala: EscalaMapa;
  /** Averías activas en este instante, con su tipo y su fin (rúbrica D10-D13). */
  averias: AveriaVigente[];
  /** Codigos de las unidades inmovilizadas por mantenimiento preventivo. */
  unidadesEnMantenimiento: string[];
  unidadEnfocada: string | null;
  onEnfocar: (codigoUnidad: string | null) => void;
  umbrales: UmbralesSemaforo;
  /** Cursor sobre una unidad: todas las que comparten ese punto y dónde mostrarlas. */
  onSobrevolar?: (codigos: string[], x: number, y: number) => void;
  onDejarDeSobrevolar?: () => void;
}

/**
 * Unidades de transporte sobre el mapa, animadas según la ruta que el
 * algoritmo encontró (STD 2.6.4).
 *
 * - El icono es la silueta del tipo de unidad, orientada según su rumbo.
 * - El anillo que lo rodea es el semáforo + vacío de su ocupación (C27).
 * - Una avería cambia el anillo al color de su tipo y muestra el número del
 *   tipo, solo mientras dura (D10-D13).
 * - En el almacén o con la ruta terminada, el icono se atenúa.
 * - Si varias unidades coinciden en un punto, una insignia «+N» lo indica y
 *   al pasar el cursor se listan todas.
 */
const CapaUnidades = ({
  unidades,
  escala,
  averias,
  unidadesEnMantenimiento,
  unidadEnfocada,
  onEnfocar,
  umbrales,
  onSobrevolar,
  onDejarDeSobrevolar,
}: CapaUnidadesProps) => {
  const grupos = useMemo(() => agruparSuperpuestas(unidades, escala.aX, escala.aY), [unidades, escala]);
  // La unidad seleccionada se dibuja al final para que quede encima de las demás.
  const ordenadas = useMemo(
    () =>
      unidadEnfocada === null
        ? unidades
        : [
            ...unidades.filter((unidad) => unidad.codigoUnidad !== unidadEnfocada),
            ...unidades.filter((unidad) => unidad.codigoUnidad === unidadEnfocada),
          ],
    [unidades, unidadEnfocada],
  );
  // Una insignia por grupo, sobre la unidad que queda arriba.
  const encimaDeGrupo = new Map<string, string>();
  ordenadas.forEach((unidad) => {
    const grupo = grupos.get(unidad.codigoUnidad);
    if (grupo && grupo.length > 1) {
      encimaDeGrupo.set(grupo[0], unidad.codigoUnidad);
    }
  });

  return (
    <g>
      <defs>
        {/* Trama diagonal de una unidad en mantenimiento (STD 2.6.4). */}
        <pattern id="trama-mantenimiento" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="var(--color-superficie)" />
          <line x1="0" y1="0" x2="0" y2="4" stroke="var(--color-texto-tenue)" strokeWidth="1.6" />
        </pattern>
      </defs>
      {ordenadas.map((unidad) => {
        const cx = escala.aX(unidad.x);
        const cy = escala.aY(unidad.y);
        const { averia, enMantenimiento, nivel, ocupacion } = estadoUnidad(
          unidad,
          averias,
          unidadesEnMantenimiento,
          umbrales,
        );
        const enfocada = unidadEnfocada === unidad.codigoUnidad;
        const atenuada = unidadEnfocada !== null && !enfocada;
        const radio = LADO_VEHICULO[unidad.tipoUnidad] / 2 + 3;
        const colorAnillo = averia ? COLOR_TIPO_AVERIA[averia.tipo] : COLOR_NIVEL[nivel];
        const opacidad = atenuada ? 0.2 : unidad.enAlmacen || unidad.finalizada ? 0.6 : 1;
        const grupo = grupos.get(unidad.codigoUnidad) ?? [unidad.codigoUnidad];
        const conInsignia = grupo.length > 1 && encimaDeGrupo.get(grupo[0]) === unidad.codigoUnidad;

        return (
          <g
            key={unidad.codigoUnidad}
            className="mapa__unidad"
            opacity={opacidad}
            data-unidad={unidad.codigoUnidad}
            role="button"
            aria-label={
              `${unidad.codigoUnidad}, ${ETIQUETA_TIPO_UNIDAD[unidad.tipoUnidad]}, ocupación ${Math.round(ocupacion * 100)} % ` +
              `(${ETIQUETA_NIVEL[nivel]}), ${describirSituacion(unidad, enMantenimiento)}`
            }
            onClick={(evento) => {
              evento.stopPropagation();
              onEnfocar(enfocada ? null : unidad.codigoUnidad);
            }}
            onPointerEnter={() => onSobrevolar?.(grupo, cx, cy)}
            onPointerLeave={() => onDejarDeSobrevolar?.()}
          >
            {enfocada && <circle cx={cx} cy={cy} r={radio + 6} fill="var(--color-azul-suave)" opacity={0.85} />}

            <circle
              cx={cx}
              cy={cy}
              r={radio}
              fill={enMantenimiento ? "url(#trama-mantenimiento)" : "var(--color-superficie)"}
              fillOpacity={0.94}
              stroke={enMantenimiento ? "var(--color-texto-tenue)" : colorAnillo}
              strokeWidth={averia ? 2.8 : 2.2}
              strokeDasharray={!averia && nivel === "VACIO" ? "3 2" : undefined}
              className={averia ? "mapa__anillo-averia" : undefined}
            />

            <IconoVehiculo
              tipoUnidad={unidad.tipoUnidad}
              cx={cx}
              cy={cy}
              rumbo={unidad.rumbo}
              color={enMantenimiento ? "var(--color-texto-tenue)" : COLOR_TIPO_UNIDAD[unidad.tipoUnidad]}
            />

            {averia && (
              <g>
                <circle cx={cx + radio * 0.8} cy={cy - radio * 0.8} r={6} fill={COLOR_TIPO_AVERIA[averia.tipo]} />
                <text x={cx + radio * 0.8} y={cy - radio * 0.8 + 3} className="mapa__insignia-averia">
                  {averia.tipo.replace("TIPO_", "")}
                </text>
              </g>
            )}

            {conInsignia && (
              <g className="mapa__insignia-grupo">
                <rect x={cx - radio - 12} y={cy - radio - 7} width={20} height={13} rx={6.5} />
                <text x={cx - radio - 2} y={cy - radio + 2.6}>
                  +{grupo.length - 1}
                </text>
              </g>
            )}

            {(enfocada || unidad.entregando) && (
              <text x={cx} y={cy + radio + 12} className="mapa__etiqueta-unidad">
                {unidad.codigoUnidad}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default memo(CapaUnidades);
