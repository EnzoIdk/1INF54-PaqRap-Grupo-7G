import { useCallback } from "react";
import { simulacionService, type TipoEscenario } from "../services/simulacionService";
import { useSimulacionStore } from "../store/simulacionStore";

/**
 * Expone las acciones de control de la simulacion (inicio de escenario) y
 * el estado global asociado (STD 5.3).
 */
export function useSimulacion() {
  const minutoSimulacionActual = useSimulacionStore((state) => state.minutoSimulacionActual);
  const enEjecucion = useSimulacionStore((state) => state.enEjecucion);
  const setEnEjecucion = useSimulacionStore((state) => state.setEnEjecucion);

  const handleIniciarSimulacion = useCallback(
    async (tipoEscenario: TipoEscenario) => {
      await simulacionService.iniciarEscenario(tipoEscenario);
      setEnEjecucion(true);
    },
    [setEnEjecucion],
  );

  return { minutoSimulacionActual, enEjecucion, handleIniciarSimulacion };
}
