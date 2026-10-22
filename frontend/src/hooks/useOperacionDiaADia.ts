import { useEffect, useRef } from "react";
import { useSimulacionStore } from "../store/simulacionStore";
import type { AlgoritmoSolicitado } from "../types/Experimentacion";
import { ahoraEnLima, minutoDelMes } from "../utils/tiempoReal";
import { useExperimentacion } from "./useExperimentacion";

const SEGUNDOS_ENTRE_COMPROBACIONES = 30;

/**
 * Mantiene viva la operación día a día (RF-44) mientras el usuario navega
 * por cualquier pantalla: el reloj sigue la hora de Lima segundo a segundo y,
 * cuando el turno vigente termina (07:00, 15:00 o 23:00), se planifica solo
 * el turno siguiente con el mismo algoritmo.
 */
export function useOperacionDiaADia(): void {
  const tiempoReal = useSimulacionStore((estado) => estado.tiempoReal);
  const sincronizarTiempoReal = useSimulacionStore((estado) => estado.sincronizarTiempoReal);
  const { ejecutarDiaADia } = useExperimentacion();
  const replanificandoRef = useRef(false);

  useEffect(() => {
    if (!tiempoReal) {
      return;
    }
    sincronizarTiempoReal(minutoDelMes(ahoraEnLima()));
    const reloj = window.setInterval(() => sincronizarTiempoReal(minutoDelMes(ahoraEnLima())), 1000);
    return () => window.clearInterval(reloj);
  }, [tiempoReal, sincronizarTiempoReal]);

  useEffect(() => {
    if (!tiempoReal) {
      return;
    }
    const comprobar = window.setInterval(() => {
      const estado = useSimulacionStore.getState();
      if (!estado.tiempoReal || !estado.escenario || estado.cargando || replanificandoRef.current) {
        return;
      }
      if (minutoDelMes(ahoraEnLima()) < estado.escenario.minutoFin) {
        return;
      }
      replanificandoRef.current = true;
      void ejecutarDiaADia(algoritmoDeLaCorrida(estado.ejecuciones.map((ejecucion) => ejecucion.algoritmo)))
        .finally(() => {
          replanificandoRef.current = false;
        });
    }, SEGUNDOS_ENTRE_COMPROBACIONES * 1000);
    return () => window.clearInterval(comprobar);
  }, [tiempoReal, ejecutarDiaADia]);
}

function algoritmoDeLaCorrida(algoritmos: string[]): AlgoritmoSolicitado {
  if (algoritmos.length !== 1) {
    return "AMBOS";
  }
  return algoritmos[0] === "I-ACO" ? "IACO" : "AGAESTW";
}
