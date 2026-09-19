import SemaforoStock from "./SemaforoStock";

interface AlmacenPanel {
  id: number;
  nombre: string;
  stockActual: number;
  stockMaximo: number;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

interface PanelAlmacenesProps {
  almacenes: AlmacenPanel[];
}

/** Lista el estado de stock de cada almacen intermedio. */
const PanelAlmacenes = ({ almacenes }: PanelAlmacenesProps) => (
  <section>
    <h2>Almacenes</h2>
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {almacenes.map((almacen) => (
        <li key={almacen.id}>
          <div>{almacen.nombre}</div>
          <SemaforoStock
            stockActual={almacen.stockActual}
            stockMaximo={almacen.stockMaximo}
            umbralAmbarPorcentaje={almacen.umbralAmbarPorcentaje}
            umbralRojoPorcentaje={almacen.umbralRojoPorcentaje}
          />
        </li>
      ))}
    </ul>
  </section>
);

export default PanelAlmacenes;
