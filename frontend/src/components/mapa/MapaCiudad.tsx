import { useSimulacionStore } from "../../store/simulacionStore";
import CapaUnidades from "./CapaUnidades";
import CapaBloqueos from "./CapaBloqueos";
import CapaAlmacenes from "./CapaAlmacenes";

/**
 * Mapa interactivo del reticulado de la ciudad. Compone las capas de
 * unidades, bloqueos y almacenes (STD 5.3, 5.6). El origen (0,0) se
 * representa en la esquina inferior izquierda.
 */
const MapaCiudad = () => {
  const unidadesFlota = useSimulacionStore((state) => state.unidadesFlota);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "70 / 50",
        backgroundColor: "var(--color-superficie)",
        border: "1px solid var(--color-borde)",
      }}
    >
      <CapaBloqueos bloqueos={[]} />
      <CapaAlmacenes almacenes={[]} />
      <CapaUnidades unidades={unidadesFlota} />
    </div>
  );
};

export default MapaCiudad;
