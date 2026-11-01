import { memo } from "react";
import type { AlmacenDto } from "../../types/Experimentacion";
import { calcularSemaforoAlmacen } from "../../hooks/useSemaforoAlmacen";
import { ETIQUETA_NIVEL } from "../../utils/semaforo";
import type { EscalaMapa } from "../../utils/coordenadas";

interface CapaAlmacenesProps {
  almacenes: AlmacenDto[];
  escala: EscalaMapa;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
  almacenEnfocado?: string | null;
  /** Clic sobre un almacén: lo muestra en el panel (rúbrica F05, vuelta). */
  onSeleccionar?: (codigoAlmacen: string | null) => void;
}

/** Los almacenes son bastante más grandes que los vehículos para distinguirlos de un vistazo (C18). */
const LADO_CENTRAL = 40;
const LADO_INTERMEDIO = 34;

/**
 * Almacenes sobre el mapa (STD 2.6.3): el central en azul oscuro y los
 * intermedios con el semáforo + vacío de su stock (C21) y la cifra de
 * unidades disponibles siempre visible (C22).
 */
const CapaAlmacenes = ({
  almacenes,
  escala,
  umbralAmbarPorcentaje,
  umbralRojoPorcentaje,
  almacenEnfocado = null,
  onSeleccionar,
}: CapaAlmacenesProps) => (
  <g>
    {almacenes.map((almacen) => (
      <MarcadorAlmacen
        key={almacen.codigo}
        almacen={almacen}
        escala={escala}
        umbralAmbarPorcentaje={umbralAmbarPorcentaje}
        umbralRojoPorcentaje={umbralRojoPorcentaje}
        enfocado={almacenEnfocado === almacen.codigo}
        atenuado={almacenEnfocado !== null && almacenEnfocado !== almacen.codigo}
        onSeleccionar={onSeleccionar}
      />
    ))}
  </g>
);

interface MarcadorProps {
  almacen: AlmacenDto;
  escala: EscalaMapa;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
  enfocado: boolean;
  atenuado: boolean;
  onSeleccionar?: (codigoAlmacen: string | null) => void;
}

const MarcadorAlmacen = ({
  almacen,
  escala,
  umbralAmbarPorcentaje,
  umbralRojoPorcentaje,
  enfocado,
  atenuado,
  onSeleccionar,
}: MarcadorProps) => {
  const esCentral = almacen.tipo === "CENTRAL";
  const lado = esCentral ? LADO_CENTRAL : LADO_INTERMEDIO;
  const cx = escala.aX(almacen.posX);
  const cy = escala.aY(almacen.posY);
  const semaforo = calcularSemaforoAlmacen(almacen.stockActual, almacen.stockMaximo, {
    umbralAmbarPorcentaje,
    umbralRojoPorcentaje,
  });

  return (
    <g
      className="mapa__almacen"
      opacity={atenuado ? 0.45 : 1}
      onClick={(evento) => {
        evento.stopPropagation();
        onSeleccionar?.(enfocado ? null : almacen.codigo);
      }}
    >
      {enfocado && (
        <rect
          x={cx - lado / 2 - 6}
          y={cy - lado / 2 - 6}
          width={lado + 12}
          height={lado + 12}
          rx={8}
          fill="var(--color-azul-suave)"
          stroke="var(--color-azul-accion)"
          strokeWidth={2}
        />
      )}
      <rect
        x={cx - lado / 2}
        y={cy - lado / 2}
        width={lado}
        height={lado}
        rx={6}
        fill={esCentral ? "var(--color-azul-paqrap)" : "var(--color-azul-accion)"}
        stroke={esCentral ? "var(--color-azul-paqrap)" : semaforo.colorCss}
        strokeWidth={esCentral ? 0 : 3}
      />
      {/* Nave con techo a dos aguas y portón: un almacén, no una casa. */}
      <path
        d={`M ${cx - lado * 0.3} ${cy + lado * 0.28}
            L ${cx - lado * 0.3} ${cy - lado * 0.04}
            L ${cx} ${cy - lado * 0.28}
            L ${cx + lado * 0.3} ${cy - lado * 0.04}
            L ${cx + lado * 0.3} ${cy + lado * 0.28} Z
            M ${cx - lado * 0.13} ${cy + lado * 0.28}
            L ${cx - lado * 0.13} ${cy + lado * 0.06}
            L ${cx + lado * 0.13} ${cy + lado * 0.06}
            L ${cx + lado * 0.13} ${cy + lado * 0.28}`}
        fill="none"
        stroke="var(--color-texto-sobre-color)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <text x={cx} y={cy + lado / 2 + 13} className="mapa__etiqueta-almacen">
        {esCentral ? "Central · ∞" : `${almacen.stockActual} u`}
      </text>
      <title>
        {`${almacen.codigo} (${almacen.posX}, ${almacen.posY})\n` +
          (esCentral
            ? "Almacén central · inventario permanentemente abastecido"
            : `${almacen.stockActual} / ${almacen.stockMaximo} u disponibles · semáforo ${ETIQUETA_NIVEL[semaforo.color].toLowerCase()}`) +
          "\nClic para ver su detalle en el panel"}
      </title>
    </g>
  );
};

export default memo(CapaAlmacenes);
