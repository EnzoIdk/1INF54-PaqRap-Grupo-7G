import { create } from "zustand";
import type {
  AlgoritmoSolicitado,
  AveriaSolicitada,
  ConjuntoDatos,
  EjecucionDto,
  EscenarioDto,
  ExperimentacionResponse,
  ParametrosEjecucion,
} from "../types/Experimentacion";
import { VELOCIDADES_REPRODUCCION } from "../utils/constants";

/** Parametros por defecto del lanzador de la experimentacion numerica. */
const PARAMETROS_INICIALES: ParametrosEjecucion = {
  archivoVentas: "ventas.202601.txt",
  dia: 1,
  horaInicio: 7,
  ventanaHoras: 12,
  maximoPedidos: 60,
  algoritmo: "AMBOS",
  semilla: null,
  cantidadAutos: null,
  cantidadMotos: null,
  cantidadBicicletas: null,
  averias: [],
};

interface SimulacionState {
  // --- Catalogo y parametros de entrada ---
  conjuntos: ConjuntoDatos[];
  parametros: ParametrosEjecucion;

  // --- Resultado de la ultima corrida ---
  escenario: EscenarioDto | null;
  ejecuciones: EjecucionDto[];
  algoritmoVisible: string | null;
  cargando: boolean;
  error: string | null;

  // --- Reproduccion del tiempo simulado ---
  minutoActual: number;
  reproduciendo: boolean;
  minutosPorSegundo: number;
  segundosReales: number;
  unidadEnfocada: string | null;

  // --- Acciones ---
  setConjuntos: (conjuntos: ConjuntoDatos[]) => void;
  actualizarParametros: (cambios: Partial<ParametrosEjecucion>) => void;
  agregarAveria: (averia: AveriaSolicitada) => void;
  quitarAveria: (indice: number) => void;
  setAlgoritmo: (algoritmo: AlgoritmoSolicitado) => void;
  iniciarCarga: () => void;
  registrarResultado: (resultado: ExperimentacionResponse) => void;
  registrarError: (mensaje: string) => void;
  setAlgoritmoVisible: (algoritmo: string) => void;

  setMinutoActual: (minuto: number) => void;
  avanzarMinutos: (minutos: number, segundosTranscurridos: number) => void;
  alternarReproduccion: () => void;
  detener: () => void;
  reiniciar: () => void;
  setMinutosPorSegundo: (minutosPorSegundo: number) => void;
  enfocarUnidad: (codigoUnidad: string | null) => void;
}

/**
 * Estado global de la simulacion, compartido entre el mapa, los paneles y la
 * consola (STD 5.3). El estado local de una vista permanece en ella.
 *
 * <p>El reloj vive aqui, y no en el componente del mapa, porque el
 * encabezado, los paneles laterales y la tabla de pedidos muestran todos la
 * misma hora simulada.</p>
 */
export const useSimulacionStore = create<SimulacionState>((set, get) => ({
  conjuntos: [],
  parametros: PARAMETROS_INICIALES,

  escenario: null,
  ejecuciones: [],
  algoritmoVisible: null,
  cargando: false,
  error: null,

  minutoActual: 0,
  reproduciendo: false,
  minutosPorSegundo: VELOCIDADES_REPRODUCCION[2].minutosPorSegundo,
  segundosReales: 0,
  unidadEnfocada: null,

  setConjuntos: (conjuntos) =>
    set((estado) => ({
      conjuntos,
      parametros: conjuntos.some((conjunto) => conjunto.archivoVentas === estado.parametros.archivoVentas)
        ? estado.parametros
        : { ...estado.parametros, archivoVentas: conjuntos[0]?.archivoVentas ?? estado.parametros.archivoVentas },
    })),

  actualizarParametros: (cambios) =>
    set((estado) => ({ parametros: { ...estado.parametros, ...cambios } })),

  agregarAveria: (averia) =>
    set((estado) => ({
      parametros: { ...estado.parametros, averias: [...(estado.parametros.averias ?? []), averia] },
    })),

  quitarAveria: (indice) =>
    set((estado) => ({
      parametros: {
        ...estado.parametros,
        averias: (estado.parametros.averias ?? []).filter((_, i) => i !== indice),
      },
    })),

  setAlgoritmo: (algoritmo) => set((estado) => ({ parametros: { ...estado.parametros, algoritmo } })),

  iniciarCarga: () => set({ cargando: true, error: null }),

  registrarResultado: (resultado) =>
    set({
      cargando: false,
      error: null,
      escenario: resultado.escenario,
      ejecuciones: resultado.ejecuciones,
      algoritmoVisible: resultado.ejecuciones[0]?.algoritmo ?? null,
      minutoActual: resultado.escenario.minutoInicio,
      segundosReales: 0,
      reproduciendo: false,
      unidadEnfocada: null,
    }),

  registrarError: (mensaje) => set({ cargando: false, error: mensaje }),

  setAlgoritmoVisible: (algoritmo) => set({ algoritmoVisible: algoritmo }),

  setMinutoActual: (minuto) => set({ minutoActual: minuto }),

  avanzarMinutos: (minutos, segundosTranscurridos) => {
    const estado = get();
    const limite = calcularMinutoFinal(estado);
    const siguiente = estado.minutoActual + minutos;
    if (siguiente >= limite) {
      set({ minutoActual: limite, reproduciendo: false, segundosReales: estado.segundosReales + segundosTranscurridos });
      return;
    }
    set({ minutoActual: siguiente, segundosReales: estado.segundosReales + segundosTranscurridos });
  },

  alternarReproduccion: () => {
    const estado = get();
    if (!estado.escenario) {
      return;
    }
    const enElFinal = estado.minutoActual >= calcularMinutoFinal(estado);
    set({
      reproduciendo: !estado.reproduciendo,
      minutoActual: enElFinal ? estado.escenario.minutoInicio : estado.minutoActual,
      segundosReales: enElFinal ? 0 : estado.segundosReales,
    });
  },

  detener: () =>
    set((estado) => ({
      reproduciendo: false,
      minutoActual: estado.escenario?.minutoInicio ?? 0,
      segundosReales: 0,
    })),

  reiniciar: () =>
    set((estado) => ({
      minutoActual: estado.escenario?.minutoInicio ?? 0,
      segundosReales: 0,
    })),

  setMinutosPorSegundo: (minutosPorSegundo) => set({ minutosPorSegundo }),

  enfocarUnidad: (codigoUnidad) => set({ unidadEnfocada: codigoUnidad }),
}));

/**
 * Ultimo minuto que la reproduccion debe alcanzar: la ventana de pedidos
 * puede cerrarse antes de que la ultima unidad termine su ruta, y el
 * supervisor necesita ver esa entrega.
 */
export function calcularMinutoFinal(estado: Pick<SimulacionState, "escenario" | "ejecuciones">): number {
  if (!estado.escenario) {
    return 0;
  }
  const finDeRutas = estado.ejecuciones.flatMap((ejecucion) =>
    ejecucion.rutas.map((ruta) => ruta.minutoFin),
  );
  return Math.max(estado.escenario.minutoFin, ...finDeRutas, estado.escenario.minutoInicio + 1);
}

/** Ejecucion que el mapa y los paneles estan mostrando. */
export function seleccionarEjecucionVisible(estado: SimulacionState): EjecucionDto | null {
  if (estado.ejecuciones.length === 0) {
    return null;
  }
  return (
    estado.ejecuciones.find((ejecucion) => ejecucion.algoritmo === estado.algoritmoVisible) ??
    estado.ejecuciones[0]
  );
}
