import Boton from "../components/comunes/Boton";
import { useSimulacion } from "../hooks/useSimulacion";
import type { TipoEscenario } from "../services/simulacionService";

const ESCENARIOS: { tipo: TipoEscenario; etiqueta: string }[] = [
  { tipo: "DIA_A_DIA", etiqueta: "Operacion dia a dia" },
  { tipo: "SIMULACION_5D", etiqueta: "Simulacion 5 dias" },
  { tipo: "COLAPSO", etiqueta: "Simulacion hasta el colapso" },
];

/** Consola para iniciar los escenarios de simulacion. */
const ConsolaSimulacionPage = () => {
  const { enEjecucion, handleIniciarSimulacion } = useSimulacion();

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <h1>Consola de simulacion</h1>
      {ESCENARIOS.map((escenario) => (
        <Boton key={escenario.tipo} disabled={enEjecucion} onClick={() => handleIniciarSimulacion(escenario.tipo)}>
          {escenario.etiqueta}
        </Boton>
      ))}
    </div>
  );
};

export default ConsolaSimulacionPage;
