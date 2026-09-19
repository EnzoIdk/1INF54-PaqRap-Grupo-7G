import { memo } from "react";
import type { AlmacenDto } from "../../types/Experimentacion";
import { useSemaforoAlmacen } from "../../hooks/useSemaforoAlmacen";
import type { EscalaMapa } from "../../utils/coordenadas";

interface CapaAlmacenesProps {
  almacenes: AlmacenDto[];
  escala: EscalaMapa;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

const LADO_CENTRAL = 16;
const LADO_INTERMEDIO = 13;

/**
 * Almacenes sobre el mapa: el central es un cuadrado de 16 px en azul
 * PaqRap y los intermedios, cuadrados de 13 px en azul accion, ambos con el
 * icono de almacen en blanco (STD 2.6.3).
 *
 * <p>El almacen intermedio lleva ademas el punto del semaforo de stock. El
 * color no es el unico portador de informacion: la etiqueta emergente
 * indica siempre la cifra de existencias (STD 5.6).</p>
 */
const CapaAlmacenes = ({ almacenes, escala, umbralAmbarPorcentaje, umbralRojoPorcentaje }: CapaAlmacenesProps) => (
  <g>
    {almacenes.map((almacen) => (
      <MarcadorAlmacen
        key={almacen.codigo}
        almacen={almacen}
        escala={escala}
        umbralAmbarPorcentaje={umbralAmbarPorcentaje}
        umbralRojoPorcentaje={umbralRojoPorcentaje}
      />
    ))}
  </g>
);

interface MarcadorProps {
  almacen: AlmacenDto;
  escala: EscalaMapa;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

const MarcadorAlmacen = ({ almacen, escala, umbralAmbarPorcentaje, umbralRojoPorcentaje }: MarcadorProps) => {
  const esCentral = almacen.tipo === "CENTRAL";
  const lado = esCentral ? LADO_CENTRAL : LADO_INTERMEDIO;
  const cx = escala.aX(almacen.posX);
  const cy = escala.aY(almacen.posY);

  const semaforo = useSemaforoAlmacen(almacen.stockActual, almacen.stockMaximo, {
    umbralAmbarPorcentaje,
    umbralRojoPorcentaje,
  });

  return (
    <g>
      <rect
        x={cx - lado / 2}
        y={cy - lado / 2}
        width={lado}
        height={lado}
        rx={3}
        fill={esCentral ? "var(--color-azul-paqrap)" : "var(--color-azul-accion)"}
      />
      {/* Icono de almacen simplificado, en blanco */}
      <path
        d={`M ${cx - lado * 0.26} ${cy + lado * 0.24}
            L ${cx - lado * 0.26} ${cy - lado * 0.04}
            L ${cx} ${cy - lado * 0.26}
            L ${cx + lado * 0.26} ${cy - lado * 0.04}
            L ${cx + lado * 0.26} ${cy + lado * 0.24} Z`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {!esCentral && (
        <circle cx={cx + lado / 2} cy={cy - lado / 2} r={3.5} fill={semaforo.colorCss} stroke="#ffffff" strokeWidth={1.2} />
      )}
      <title>
        {`${almacen.codigo} (${almacen.posX}, ${almacen.posY})\n` +
          (esCentral
            ? "Almacén central · inventario permanentemente abastecido"
            : `${almacen.stockActual} / ${almacen.stockMaximo} u disponibles · semáforo ${semaforo.color.toLowerCase()}`)}
      </title>
    </g>
  );
};

export default memo(CapaAlmacenes);
