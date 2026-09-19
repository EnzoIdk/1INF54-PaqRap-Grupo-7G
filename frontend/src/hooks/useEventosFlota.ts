import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import { WEBSOCKET_URL } from "../utils/constants";
import type { UnidadTransporteEstado } from "../types/EstadoUnidad";
import type { TipoEscenario } from "../services/simulacionService";

/**
 * Se suscribe al canal `/topic/{escenario}/unidades` para recibir el estado
 * de la flota que publica {@code MotorSimulacion} (STD 4.2).
 *
 * <p>Alimenta los escenarios que corren en el servidor -día a día, 5D y
 * colapso-, donde el backend hace avanzar el reloj. La experimentación
 * numérica no pasa por aquí: el plan llega completo por HTTP y el reloj lo
 * lleva el visualizador, de modo que el supervisor puede pausarlo y
 * adelantarlo.</p>
 */
export function useEventosFlota(tipoEscenario: TipoEscenario): UnidadTransporteEstado[] {
  const [unidades, setUnidades] = useState<UnidadTransporteEstado[]>([]);

  useEffect(() => {
    const cliente = new Client({
      brokerURL: new URL(WEBSOCKET_URL, window.location.origin).toString().replace(/^http/, "ws"),
      reconnectDelay: 5000,
    });

    cliente.onConnect = () => {
      cliente.subscribe(`/topic/${tipoEscenario.toLowerCase()}/unidades`, (mensaje) => {
        setUnidades(JSON.parse(mensaje.body) as UnidadTransporteEstado[]);
      });
    };

    cliente.activate();
    return () => {
      void cliente.deactivate();
    };
  }, [tipoEscenario]);

  return unidades;
}
