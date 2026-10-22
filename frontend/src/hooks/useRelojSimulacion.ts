import { useEffect, useRef } from "react";
import { useSimulacionStore } from "../store/simulacionStore";

/**
 * Motor del tiempo simulado. Convierte los segundos reales que transcurren
 * en la pantalla en minutos de simulacion, segun la velocidad elegida, y
 * hace avanzar el reloj global.
 *
 * <p>Se apoya en `requestAnimationFrame` y no en un `setInterval`, para que
 * el movimiento de las unidades sobre el mapa sea continuo y se detenga
 * solo cuando el supervisor lo pide. El navegador congela los fotogramas de
 * una pestaña oculta, asi que el salto que se acumula mientras tanto se
 * acota: al volver, la simulacion sigue desde donde estaba y no da un
 * brinco de varios dias.</p>
 */
const MAXIMO_SEGUNDOS_POR_FOTOGRAMA = 0.5;

export function useRelojSimulacion(): void {
  const reproduciendo = useSimulacionStore((estado) => estado.reproduciendo);
  const minutosPorSegundo = useSimulacionStore((estado) => estado.minutosPorSegundo);
  const avanzarMinutos = useSimulacionStore((estado) => estado.avanzarMinutos);
  // En tiempo real el reloj lo fija useOperacionDiaADia con la hora de Lima.
  const tiempoReal = useSimulacionStore((estado) => estado.tiempoReal);

  const instantePrevioRef = useRef<number | null>(null);

  useEffect(() => {
    if (!reproduciendo || tiempoReal) {
      instantePrevioRef.current = null;
      return;
    }

    let solicitud = 0;

    const paso = (instante: number) => {
      const previo = instantePrevioSeguro(instantePrevioRef, instante);
      const segundos = Math.min((instante - previo) / 1000, MAXIMO_SEGUNDOS_POR_FOTOGRAMA);
      instantePrevioRef.current = instante;

      if (segundos > 0) {
        avanzarMinutos(segundos * minutosPorSegundo, segundos);
      }
      solicitud = window.requestAnimationFrame(paso);
    };

    solicitud = window.requestAnimationFrame(paso);
    return () => window.cancelAnimationFrame(solicitud);
  }, [reproduciendo, tiempoReal, minutosPorSegundo, avanzarMinutos]);
}

function instantePrevioSeguro(referencia: { current: number | null }, instante: number): number {
  if (referencia.current === null) {
    referencia.current = instante;
  }
  return referencia.current;
}
