import { useMemo } from "react";
import { useSimulacionStore } from "../store/simulacionStore";
import type { AveriaSolicitada } from "../types/Experimentacion";

/**
 * Averías inyectadas en la corrida que se está mostrando, expresadas siempre
 * en minuto de simulación, sea cual sea el modo en que se registraron.
 */
export function useAveriasDeLaCorrida(): AveriaSolicitada[] {
  const modoSimulacion = useSimulacionStore((estado) => estado.modoSimulacion);
  const parametros = useSimulacionStore((estado) => estado.parametros);
  const parametros5D = useSimulacionStore((estado) => estado.parametros5D);
  const parametrosColapso = useSimulacionStore((estado) => estado.parametrosColapso);

  return useMemo(() => {
    if (modoSimulacion === "COLAPSO" || modoSimulacion === "5D") {
      const averias = modoSimulacion === "COLAPSO" ? parametrosColapso.averias : parametros5D.averias;
      return (averias ?? []).map((averia) => ({
        codigoUnidad: averia.codigoUnidad,
        tipo: averia.tipo,
        minutoSimulacion: (averia.dia - 1) * 1440 + averia.hora * 60,
      }));
    }
    if (modoSimulacion === "DIA") {
      return [];
    }
    return parametros.averias ?? [];
  }, [modoSimulacion, parametros.averias, parametros5D.averias, parametrosColapso.averias]);
}
