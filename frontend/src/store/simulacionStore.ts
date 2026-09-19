import { create } from "zustand";
import type { UnidadTransporteEstado } from "../types/EstadoUnidad";

interface SimulacionState {
  minutoSimulacionActual: number;
  enEjecucion: boolean;
  unidadesFlota: UnidadTransporteEstado[];
  setMinutoSimulacionActual: (minuto: number) => void;
  setEnEjecucion: (enEjecucion: boolean) => void;
  setUnidadesFlota: (unidades: UnidadTransporteEstado[]) => void;
}

/**
 * Estado global de la simulacion, compartido entre el mapa y los paneles
 * (STD 5.3). El estado local de una vista permanece en ella.
 */
export const useSimulacionStore = create<SimulacionState>((set) => ({
  minutoSimulacionActual: 0,
  enEjecucion: false,
  unidadesFlota: [],
  setMinutoSimulacionActual: (minuto) => set({ minutoSimulacionActual: minuto }),
  setEnEjecucion: (enEjecucion) => set({ enEjecucion }),
  setUnidadesFlota: (unidades) => set({ unidadesFlota: unidades }),
}));
