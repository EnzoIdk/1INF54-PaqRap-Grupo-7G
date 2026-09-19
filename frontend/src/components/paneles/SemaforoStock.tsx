import { useSemaforoAlmacen } from "../../hooks/useSemaforoAlmacen";
import "./SemaforoStock.css";

interface SemaforoStockProps {
  stockActual: number;
  stockMaximo: number;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

/**
 * Indicador de semaforo del stock de un almacen intermedio. El color no es
 * el unico portador de informacion: siempre lo acompañan la cifra de
 * existencias y el porcentaje disponible (STD 2.2, 5.6).
 */
const SemaforoStock = ({ stockActual, stockMaximo, ...umbrales }: SemaforoStockProps) => {
  const semaforo = useSemaforoAlmacen(stockActual, stockMaximo, umbrales);

  return (
    <div className="semaforo">
      <div className="semaforo__cabecera">
        <span className="semaforo__punto" style={{ backgroundColor: semaforo.colorCss }} />
        <span className="cifra semaforo__cifra">
          {stockActual} / {stockMaximo} u
        </span>
        <span className="texto-tenue">{Math.round(semaforo.porcentajeDisponible * 100)} % disponible</span>
      </div>
      <div className="semaforo__barra">
        <span
          className="semaforo__relleno"
          style={{
            width: `${semaforo.porcentajeDisponible * 100}%`,
            backgroundColor: semaforo.colorCss,
          }}
        />
      </div>
    </div>
  );
};

export default SemaforoStock;
