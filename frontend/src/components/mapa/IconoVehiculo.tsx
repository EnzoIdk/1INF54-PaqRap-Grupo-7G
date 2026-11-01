import type { Rumbo } from "../../hooks/usePosicionesFlota";
import type { TipoUnidad } from "../../types/Experimentacion";

/**
 * Silueta de cada tipo de unidad vista de costado, con el frente (y su faro)
 * a la derecha, en una caja de 24 × 24. Al dibujarla se orienta según el
 * rumbo del tramo que recorre (rúbrica C30): hacia la derecha tal cual, hacia
 * la izquierda reflejada, hacia arriba o hacia abajo girada 90°.
 */
const ORIENTACION: Record<Rumbo, string> = {
  E: "",
  O: "translate(24 0) scale(-1 1)",
  N: "rotate(-90 12 12)",
  S: "rotate(90 12 12)",
};

/**
 * Tamaño en el mapa: el auto es el más grande y la bicicleta la más chica
 * (rúbrica C24), y todos quedan claramente por debajo de los almacenes.
 */
export const LADO_VEHICULO: Record<TipoUnidad, number> = {
  AUTO: 19,
  MOTO: 17,
  BICICLETA: 15,
};

interface IconoVehiculoProps {
  tipoUnidad: TipoUnidad;
  cx: number;
  cy: number;
  rumbo: Rumbo;
  color: string;
}

const IconoVehiculo = ({ tipoUnidad, cx, cy, rumbo, color }: IconoVehiculoProps) => {
  const lado = LADO_VEHICULO[tipoUnidad];
  return (
    <g transform={`translate(${cx - lado / 2} ${cy - lado / 2}) scale(${lado / 24})`} pointerEvents="none">
      <g transform={ORIENTACION[rumbo]}>
        {tipoUnidad === "AUTO" && <Auto color={color} />}
        {tipoUnidad === "MOTO" && <Moto color={color} />}
        {tipoUnidad === "BICICLETA" && <Bicicleta color={color} />}
      </g>
    </g>
  );
};

const RUEDA = "var(--color-texto)";
const FARO = "#fde047";

const Auto = ({ color }: { color: string }) => (
  <>
    <path
      d="M2.4 15.6 V12.4 L5.2 11.6 L7.8 7.8 H14.4 L17.8 11.3 L20.9 12 Q21.8 12.3 21.8 13.3 V15.6 Z"
      fill={color}
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
    <path d="M8.7 9 H11.1 V11.2 H7.2 Z M12.3 9 H14 L16.1 11.2 H12.3 Z" fill="var(--color-superficie)" />
    <rect x={20.3} y={12.5} width={1.4} height={1.1} rx={0.3} fill={FARO} />
    <circle cx={7} cy={16} r={2.2} fill={RUEDA} stroke="var(--color-superficie)" strokeWidth={0.9} />
    <circle cx={17.4} cy={16} r={2.2} fill={RUEDA} stroke="var(--color-superficie)" strokeWidth={0.9} />
  </>
);

const Moto = ({ color }: { color: string }) => (
  <>
    <circle cx={5} cy={16} r={3.1} fill="none" stroke={RUEDA} strokeWidth={1.8} />
    <circle cx={19} cy={16} r={3.1} fill="none" stroke={RUEDA} strokeWidth={1.8} />
    <path d="M5 16 L9.2 11.4 H14.6 L17 8.6 M19 16 L16.4 8.4" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.4 11.6 H15 L13.2 14.4 H9.8 Z" fill={color} />
    <path d="M8 10.4 H12.2" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <path d="M15.6 7.6 H18.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <circle cx={18.7} cy={9.4} r={1} fill={FARO} />
  </>
);

const Bicicleta = ({ color }: { color: string }) => (
  <>
    <circle cx={5.4} cy={15.6} r={3.5} fill="none" stroke={RUEDA} strokeWidth={1.7} />
    <circle cx={18.6} cy={15.6} r={3.5} fill="none" stroke={RUEDA} strokeWidth={1.7} />
    <path
      d="M5.4 15.6 L9.6 9.6 H15.8 L18.6 15.6 M9.6 9.6 L12.2 15.6 H5.4 M12.2 15.6 L15.8 9.6"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8.2 8.2 H11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <path d="M15.8 9.6 L15.2 6.8 H17.6" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </>
);

export default IconoVehiculo;
