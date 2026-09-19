import MapaCiudad from "../components/mapa/MapaCiudad";
import PanelFlota from "../components/paneles/PanelFlota";
import RelojSimulacion from "../components/comunes/RelojSimulacion";
import { useSimulacion } from "../hooks/useSimulacion";
import { useEventosFlota } from "../hooks/useEventosFlota";
import { useSimulacionStore } from "../store/simulacionStore";

/** Vista principal: mapa en tiempo real y estado de la flota. */
const CentroControlPage = () => {
  const { minutoSimulacionActual } = useSimulacion();
  const unidadesFlota = useSimulacionStore((state) => state.unidadesFlota);
  useEventosFlota("DIA_A_DIA");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, padding: 16 }}>
      <div>
        <RelojSimulacion minutoSimulacionActual={minutoSimulacionActual} segundosRealesTranscurridos={0} />
        <MapaCiudad />
      </div>
      <PanelFlota unidades={unidadesFlota} />
    </div>
  );
};

export default CentroControlPage;
