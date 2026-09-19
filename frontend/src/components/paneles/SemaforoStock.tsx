import { useSemaforoAlmacen } from "../../hooks/useSemaforoAlmacen";

interface SemaforoStockProps {
  stockActual: number;
  stockMaximo: number;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

/**
 * Indicador de semaforo con el porcentaje de stock despachado. El color no
 * es el unico portador de informacion (STD 5.6).
 */
const SemaforoStock = ({ stockActual, stockMaximo, ...umbrales }: SemaforoStockProps) => {
  const semaforo = useSemaforoAlmacen(stockActual, stockMaximo, umbrales);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: semaforo.colorCss }} />
      <span>
        {stockActual} / {stockMaximo} ({Math.round(semaforo.porcentajeDespachado * 100)}% despachado)
      </span>
    </div>
  );
};

export default SemaforoStock;
