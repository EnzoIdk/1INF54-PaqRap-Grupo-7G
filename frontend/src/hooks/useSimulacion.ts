import { useCallback, useState } from "react";
import { simulacionService, type TipoEscenario } from "../services/simulacionService";

/**
 * Control de los escenarios que corren en el servidor: la operación día a
 * día, la simulación de cinco días y la simulación hasta el colapso
 * (STD 4.2, 5.3). El backend hace avanzar el reloj y publica los eventos
 * por WebSocket, que {@code useEventosFlota} recibe.
 *
 * <p>La experimentación numérica de la Consola de Simulación no usa este
 * hook: allí el plan se pide por HTTP y el reloj lo lleva el visualizador
 * ({@code useRelojSimulacion}).</p>
 */
export function useSimulacion() {
  const [enEjecucion, setEnEjecucion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIniciarSimulacion = useCallback(async (tipoEscenario: TipoEscenario) => {
    try {
      await simulacionService.iniciarEscenario(tipoEscenario);
      setEnEjecucion(true);
      setError(null);
    } catch (causa: unknown) {
      setError(causa instanceof Error ? causa.message : "No se pudo iniciar el escenario");
      setEnEjecucion(false);
    }
  }, []);

  return { enEjecucion, error, handleIniciarSimulacion };
}
