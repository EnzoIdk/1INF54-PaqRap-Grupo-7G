import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { WEBSOCKET_URL } from "../utils/constants";
import { useSimulacionStore } from "../store/simulacionStore";
import type { UnidadTransporteEstado } from "../types/EstadoUnidad";
import type { TipoEscenario } from "../services/simulacionService";

/**
 * Se suscribe al canal `/topic/{escenario}/unidades` para recibir el estado
 * de la flota en tiempo real durante una simulacion (STD 4.2).
 */
export function useEventosFlota(tipoEscenario: TipoEscenario): void {
  const setUnidadesFlota = useSimulacionStore((state) => state.setUnidadesFlota);
  const clienteRef = useRef<Client | null>(null);

  useEffect(() => {
    const cliente = new Client({
      brokerURL: new URL(WEBSOCKET_URL, window.location.origin).toString().replace(/^http/, "ws"),
      reconnectDelay: 5000,
    });

    cliente.onConnect = () => {
      cliente.subscribe(`/topic/${tipoEscenario.toLowerCase()}/unidades`, (mensaje) => {
        const unidades = JSON.parse(mensaje.body) as UnidadTransporteEstado[];
        setUnidadesFlota(unidades);
      });
    };

    cliente.activate();
    clienteRef.current = cliente;

    return () => {
      void cliente.deactivate();
    };
  }, [tipoEscenario, setUnidadesFlota]);
}
