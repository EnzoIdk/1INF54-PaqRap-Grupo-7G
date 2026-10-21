import { memo } from "react";
import { Bike, Car, Motorbike, TriangleAlert } from "lucide-react";
import type { PosicionUnidad } from "../../hooks/usePosicionesFlota";
import type { TipoUnidad } from "../../types/Experimentacion";
import { COLOR_TIPO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from "../../utils/constants";
import { formatearTiempoSimulado } from "../../utils/formatters";
import type { EscalaMapa } from "../../utils/coordenadas";

const ICONO_POR_TIPO = {
  AUTO: Car,
  MOTO: Motorbike,
  BICICLETA: Bike,
} as const;

const LADO_ICONO = 18;

interface CapaUnidadesProps {
  unidades: PosicionUnidad[];
  escala: EscalaMapa;
  /** Codigos de las unidades averiadas en este instante. */
  unidadesAveriadas: string[];
  /** Codigos de las unidades inmovilizadas por mantenimiento preventivo. */
  unidadesEnMantenimiento: string[];
  unidadEnfocada: string | null;
  onEnfocar: (codigoUnidad: string | null) => void;
  minutoActual: number;
}

/**
 * Unidades de transporte sobre el mapa, animadas segun la ruta que el
 * algoritmo encontro (STD 2.6.4).
 *
 * <ul>
 *   <li>Operativa en ruta: icono a color pleno.</li>
 *   <li>En el almacen: icono al 55 % de opacidad.</li>
 *   <li>Averiada: anillo rojo pulsante con icono de advertencia.</li>
 * </ul>
 */
const CapaUnidades = ({
  unidades,
  escala,
  unidadesAveriadas,
  unidadesEnMantenimiento,
  unidadEnfocada,
  onEnfocar,
  minutoActual,
}: CapaUnidadesProps) => (
  <g>
    <defs>
      {/* Trama diagonal de una unidad en mantenimiento (STD 2.6.4). */}
      <pattern id="trama-mantenimiento" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="var(--color-superficie)" />
        <line x1="0" y1="0" x2="0" y2="4" stroke="var(--color-texto-tenue)" strokeWidth="1.6" />
      </pattern>
    </defs>
    {unidades.map((unidad) => {
      const Icono = ICONO_POR_TIPO[unidad.tipoUnidad as TipoUnidad];
      const cx = escala.aX(unidad.x);
      const cy = escala.aY(unidad.y);
      const averiada = unidadesAveriadas.includes(unidad.codigoUnidad);
      const enMantenimiento =
        !averiada &&
        unidadesEnMantenimiento.includes(unidad.codigoUnidad) &&
        unidad.enAlmacen &&
        !unidad.entregando &&
        unidad.entregasHechas === 0;
      const enfocada = unidadEnfocada === unidad.codigoUnidad;
      const atenuada = unidadEnfocada !== null && !enfocada;

      const opacidad = atenuada ? 0.2 : unidad.enAlmacen || unidad.finalizada ? 0.55 : 1;

      return (
        <g
          key={unidad.codigoUnidad}
          className="mapa__unidad"
          opacity={opacidad}
          onClick={() => onEnfocar(enfocada ? null : unidad.codigoUnidad)}
        >
          {enfocada && <circle cx={cx} cy={cy} r={16} fill="var(--color-azul-suave)" opacity={0.85} />}

          {enMantenimiento && (
            <circle cx={cx} cy={cy} r={9} fill="url(#trama-mantenimiento)" stroke="var(--color-texto-tenue)" strokeWidth={1.2} />
          )}

          {averiada && (
            <>
              <circle
                cx={cx}
                cy={cy}
                r={9}
                fill="var(--color-rojo-suave)"
                stroke="var(--color-semaforo-rojo)"
                strokeWidth={1.5}
                className="mapa__anillo-averia"
              />
              <TriangleAlert
                x={cx + 4}
                y={cy - 14}
                width={11}
                height={11}
                color="var(--color-semaforo-rojo)"
                strokeWidth={2.5}
              />
            </>
          )}

          <Icono
            x={cx - LADO_ICONO / 2}
            y={cy - LADO_ICONO / 2}
            width={LADO_ICONO}
            height={LADO_ICONO}
            color={enMantenimiento ? "var(--color-texto-tenue)" : COLOR_TIPO_UNIDAD[unidad.tipoUnidad]}
            strokeWidth={2}
          />

          {(enfocada || unidad.entregando) && (
            <text x={cx} y={cy + 20} className="mapa__etiqueta-unidad">
              {unidad.codigoUnidad}
            </text>
          )}

          <title>
            {`${unidad.codigoUnidad} · ${ETIQUETA_TIPO_UNIDAD[unidad.tipoUnidad]}\n` +
              `Entregas ${unidad.entregasHechas}/${unidad.entregasTotales} · ` +
              `${unidad.cargaRestante}/${unidad.cargaTotal} paquetes a bordo\n` +
              `${describirSituacion(unidad, averiada, enMantenimiento)} · ${formatearTiempoSimulado(minutoActual)}`}
          </title>
        </g>
      );
    })}
  </g>
);

function describirSituacion(unidad: PosicionUnidad, averiada: boolean, enMantenimiento: boolean): string {
  if (averiada) {
    return "Averiada";
  }
  if (unidad.entregando) {
    return "Entregando al cliente";
  }
  if (!unidad.enAlmacen && !unidad.finalizada) {
    return "En ruta";
  }
  if (enMantenimiento) {
    return "En mantenimiento preventivo";
  }
  if (unidad.finalizada) {
    return "Ruta completada";
  }
  return "En el almacén";
}

export default memo(CapaUnidades);
