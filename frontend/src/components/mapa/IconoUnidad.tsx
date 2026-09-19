import { Bike, Car, Motorbike } from "lucide-react";
import type { TipoUnidad } from "../../types/Experimentacion";
import { COLOR_TIPO_UNIDAD } from "../../utils/constants";

const ICONO_POR_TIPO = {
  AUTO: Car,
  MOTO: Motorbike,
  BICICLETA: Bike,
} as const;

interface IconoUnidadProps {
  tipoUnidad: TipoUnidad;
  tamano?: number;
  /** Deja el icono en gris, para una unidad en mantenimiento. */
  apagado?: boolean;
}

/**
 * Icono propio de cada tipo de unidad, en su color (STD 2.1, 2.6.3). Es el
 * unico punto donde se decide que dibujo corresponde a un auto, a una moto
 * o a una bicicleta.
 */
const IconoUnidad = ({ tipoUnidad, tamano = 18, apagado = false }: IconoUnidadProps) => {
  const Icono = ICONO_POR_TIPO[tipoUnidad];
  return (
    <Icono
      size={tamano}
      color={apagado ? "var(--color-texto-tenue)" : COLOR_TIPO_UNIDAD[tipoUnidad]}
      strokeWidth={2}
      aria-hidden
    />
  );
};

export default IconoUnidad;
