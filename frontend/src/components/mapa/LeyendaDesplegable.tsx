import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ListTree } from "lucide-react";
import LeyendaMapa from "./LeyendaMapa";
import "./LeyendaDesplegable.css";

interface LeyendaDesplegableProps {
  almacenCentral?: { posX: number; posY: number };
}

/**
 * Botón flotante sobre el mapa que despliega la leyenda (STD 2.6.3). Así el
 * mapa conserva todo el espacio y la leyenda sigue a un clic; se cierra con
 * el mismo botón o con Esc.
 */
const LeyendaDesplegable = ({ almacenCentral }: LeyendaDesplegableProps) => {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!abierta) {
      return;
    }
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAbierta(false);
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierta]);

  return (
    <div className="leyenda-desplegable">
      <button
        type="button"
        className={`leyenda-desplegable__boton ${abierta ? "leyenda-desplegable__boton--abierta" : ""}`}
        aria-expanded={abierta}
        aria-controls="leyenda-del-mapa"
        onClick={() => setAbierta((actual) => !actual)}
      >
        <ListTree size={15} aria-hidden />
        Leyenda
        {abierta ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      </button>
      {abierta && (
        <div id="leyenda-del-mapa" className="leyenda-desplegable__panel">
          <LeyendaMapa almacenCentral={almacenCentral} />
        </div>
      )}
    </div>
  );
};

export default LeyendaDesplegable;
