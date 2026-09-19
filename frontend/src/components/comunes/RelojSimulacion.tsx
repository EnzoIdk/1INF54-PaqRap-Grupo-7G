import { Clock } from "lucide-react";
import { formatearTiempoReal, formatearTiempoSimulado } from "../../utils/formatters";
import "./RelojSimulacion.css";

interface RelojSimulacionProps {
  minutoSimulacionActual: number;
  segundosRealesTranscurridos: number;
}

/**
 * Reloj dual: muestra el tiempo simulado (##d ##h ##m) y el tiempo real
 * (hh:mm:ss) al mismo tiempo, en fuente monoespaciada para que los numeros
 * no salten al avanzar (STD 2.6.2).
 */
const RelojSimulacion = ({ minutoSimulacionActual, segundosRealesTranscurridos }: RelojSimulacionProps) => (
  <div className="reloj">
    <div className="reloj__bloque">
      <Clock size={16} aria-hidden className="reloj__icono" />
      <span>
        <span className="reloj__rotulo">Simulado</span>
        <span className="reloj__valor cifra">{formatearTiempoSimulado(minutoSimulacionActual)}</span>
      </span>
    </div>
    <div className="reloj__bloque reloj__bloque--real">
      <span>
        <span className="reloj__rotulo">Real</span>
        <span className="reloj__valor cifra">{formatearTiempoReal(segundosRealesTranscurridos)}</span>
      </span>
    </div>
  </div>
);

export default RelojSimulacion;
