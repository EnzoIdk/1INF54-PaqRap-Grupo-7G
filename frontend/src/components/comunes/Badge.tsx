import {
  COLOR_ESTADO_PEDIDO,
  ETIQUETA_ESTADO_PEDIDO,
  FONDO_ESTADO_PEDIDO,
  type EstadoPedidoVisual,
} from "../../utils/constants";
import "./Badge.css";

interface BadgeProps {
  texto: string;
  /** Color de acento: tiñe el punto y el texto. */
  color: string;
  /** Fondo suave del distintivo. */
  colorFondo: string;
}

/**
 * Distintivo compacto de 20 px de alto y 10 px de radio, que combina un
 * fondo suave, un punto de color de 7 px y un texto SemiBold de 11 px en el
 * color de acento (STD 2.5.6).
 */
const Badge = ({ texto, color, colorFondo }: BadgeProps) => (
  <span className="badge" style={{ backgroundColor: colorFondo, color }}>
    <span className="badge__punto" style={{ backgroundColor: color }} />
    {texto}
  </span>
);

/** Distintivo del estado de un pedido, con los colores del estandar. */
export const BadgeEstadoPedido = ({ estado }: { estado: EstadoPedidoVisual }) => (
  <Badge
    texto={ETIQUETA_ESTADO_PEDIDO[estado]}
    color={COLOR_ESTADO_PEDIDO[estado]}
    colorFondo={FONDO_ESTADO_PEDIDO[estado]}
  />
);

export default Badge;
