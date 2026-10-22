import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AlmacenDto } from "../../types/Experimentacion";
import SemaforoStock from "./SemaforoStock";
import "./PanelAlmacenes.css";

interface PanelAlmacenesProps {
  almacenes: AlmacenDto[];
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

/**
 * Inventario de los almacenes. El central se presenta como permanentemente
 * abastecido; los intermedios, con su semaforo de stock sobre el limite de
 * 1 000 unidades (STD 2.2, 2.6.5).
 */
const PanelAlmacenes = ({ almacenes, umbralAmbarPorcentaje, umbralRojoPorcentaje }: PanelAlmacenesProps) => {
  const [colapsado, setColapsado] = useState(false);

  return (
    <section className="tarjeta panel-almacenes">
      <header
        className="tarjeta__encabezado panel-almacenes__encabezado"
        onClick={() => setColapsado((c) => !c)}
        role="button"
        tabIndex={0}
      >
        <div>
          <h2 className="tarjeta__titulo">Almacenes</h2>
          <p className="tarjeta__contexto">Capacidad e inventario</p>
        </div>
        <button
          type="button"
          className="panel-almacenes__toggle"
          aria-label={colapsado ? "Expandir almacenes" : "Contraer almacenes"}
        >
          {colapsado ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </header>

      {!colapsado && (
        <ul className="panel-almacenes__lista">
          {almacenes.map((almacen) => (
            <li key={almacen.codigo}>
              <div className="panel-almacenes__cabecera">
                <span className="panel-almacenes__codigo">{almacen.codigo}</span>
                <span className="cifra texto-tenue">
                  ({almacen.posX}, {almacen.posY})
                </span>
              </div>
              {almacen.tipo === "CENTRAL" ? (
                <p className="panel-almacenes__central">Inventario permanentemente abastecido</p>
              ) : (
                <SemaforoStock
                  stockActual={almacen.stockActual}
                  stockMaximo={almacen.stockMaximo}
                  umbralAmbarPorcentaje={umbralAmbarPorcentaje}
                  umbralRojoPorcentaje={umbralRojoPorcentaje}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default PanelAlmacenes;
