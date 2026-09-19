import type { ReactNode } from "react";
import "./Indicador.css";

interface IndicadorProps {
  rotulo: string;
  valor: string;
  detalle?: string;
  icono?: ReactNode;
  /** Color de acento del valor; por defecto, el texto principal. */
  color?: string;
}

/**
 * Cifra destacada de un tablero. El valor va en fuente monoespaciada para
 * que los digitos queden alineados al compararlo con otro (STD 2.5.4).
 */
const Indicador = ({ rotulo, valor, detalle, icono, color }: IndicadorProps) => (
  <div className="indicador tarjeta">
    <div className="indicador__cabecera">
      <span className="rotulo">{rotulo}</span>
      {icono && <span className="indicador__icono">{icono}</span>}
    </div>
    <span className="indicador__valor cifra" style={color ? { color } : undefined}>
      {valor}
    </span>
    {detalle && <span className="indicador__detalle">{detalle}</span>}
  </div>
);

export default Indicador;
