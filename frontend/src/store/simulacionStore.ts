import { create } from "zustand";
import type {
  AlgoritmoSolicitado,
  AveriaSolicitada,
  AveriaSolicitada5D,
  ConjuntoDatos,
  EjecucionDto,
  EscenarioDto,
  ExperimentacionResponse,
  ParametrosCincoDias,
  ParametrosColapso,
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

const PARAMETROS_5D_INICIALES: ParametrosCincoDias = {
  archivoVentas: "ventas.202601.txt",
  diaInicio: 1,
  horaInicio: 7,
  maximoPedidosPorTurno: 60,
  algoritmo: "AMBOS",
  semilla: null,
  cantidadAutos: null,
  cantidadMotos: null,
  cantidadBicicletas: null,
  averias: [],
};

const PARAMETROS_COLAPSO_INICIALES: ParametrosColapso = {
  archivoVentas: "ventas.202601.txt",
  diaInicio: 1,
  horaInicio: 7,
  maximoPedidosPorTurno: 60,
  algoritmo: "AMBOS",
  semilla: null,
  cantidadAutos: null,
  cantidadMotos: null,
  cantidadBicicletas: null,
  averias: [],
};

interface SimulacionState {
  // --- Modo de simulacion ---
  modoSimulacion: "1D" | "5D" | "COLAPSO";

  // --- Catalogo y parametros de entrada ---
  conjuntos: ConjuntoDatos[];
  parametros: ParametrosEjecucion;
  parametros5D: ParametrosCincoDias;
  parametrosColapso: ParametrosColapso;

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
  setModoSimulacion: (modo: "1D" | "5D" | "COLAPSO") => void;
  setConjuntos: (conjuntos: ConjuntoDatos[]) => void;
  actualizarParametros: (cambios: Partial<ParametrosEjecucion>) => void;
  actualizarParametros5D: (cambios: Partial<ParametrosCincoDias>) => void;
  actualizarParametrosColapso: (cambios: Partial<ParametrosColapso>) => void;
  agregarAveria: (averia: AveriaSolicitada) => void;
  quitarAveria: (indice: number) => void;
  agregarAveria5D: (averia: AveriaSolicitada5D) => void;
  quitarAveria5D: (indice: number) => void;
  agregarAveriaColapso: (averia: AveriaSolicitada5D) => void;
  quitarAveriaColapso: (indice: number) => void;
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
  modoSimulacion: "1D",
  conjuntos: [],
  parametros: PARAMETROS_INICIALES,
  parametros5D: PARAMETROS_5D_INICIALES,
  parametrosColapso: PARAMETROS_COLAPSO_INICIALES,

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

  setModoSimulacion: (modoSimulacion) => set({ modoSimulacion }),

  setConjuntos: (conjuntos) =>
    set((estado) => {
      const archivoPorDefecto = conjuntos[0]?.archivoVentas ?? "ventas.202601.txt";
      const arch1D = conjuntos.some((c) => c.archivoVentas === estado.parametros.archivoVentas)
        ? estado.parametros.archivoVentas
        : archivoPorDefecto;
      const arch5D = conjuntos.some((c) => c.archivoVentas === estado.parametros5D.archivoVentas)
        ? estado.parametros5D.archivoVentas
        : archivoPorDefecto;
      const archColapso = conjuntos.some((c) => c.archivoVentas === estado.parametrosColapso.archivoVentas)
        ? estado.parametrosColapso.archivoVentas
        : archivoPorDefecto;
      return {
        conjuntos,
        parametros: { ...estado.parametros, archivoVentas: arch1D },
        parametros5D: { ...estado.parametros5D, archivoVentas: arch5D },
        parametrosColapso: { ...estado.parametrosColapso, archivoVentas: archColapso },
      };
    }),

  actualizarParametros: (cambios) =>
    set((estado) => ({ parametros: { ...estado.parametros, ...cambios } })),

  actualizarParametros5D: (cambios) =>
    set((estado) => ({ parametros5D: { ...estado.parametros5D, ...cambios } })),

  actualizarParametrosColapso: (cambios) =>
    set((estado) => ({ parametrosColapso: { ...estado.parametrosColapso, ...cambios } })),

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

  agregarAveria5D: (averia) =>
    set((estado) => ({
      parametros5D: { ...estado.parametros5D, averias: [...(estado.parametros5D.averias ?? []), averia] },
    })),

  quitarAveria5D: (indice) =>
    set((estado) => ({
      parametros5D: {
        ...estado.parametros5D,
        averias: (estado.parametros5D.averias ?? []).filter((_, i) => i !== indice),
      },
    })),

  agregarAveriaColapso: (averia) =>
    set((estado) => ({
      parametrosColapso: { ...estado.parametrosColapso, averias: [...(estado.parametrosColapso.averias ?? []), averia] },
    })),

  quitarAveriaColapso: (indice) =>
    set((estado) => ({
      parametrosColapso: {
        ...estado.parametrosColapso,
        averias: (estado.parametrosColapso.averias ?? []).filter((_, i) => i !== indice),
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

    // Si llegamos o pasamos el momento del colapso, detener la reproduccion en el instante exacto del colapso
    const minColapso = estado.escenario?.minutoColapso;
    if (estado.escenario?.colapsoOcurrido && minColapso !== null && minColapso !== undefined) {
      if (estado.minutoActual < minColapso && siguiente >= minColapso) {
        set({
          minutoActual: minColapso,
          reproduciendo: false,
          segundosReales: estado.segundosReales + segundosTranscurridos,
        });
        return;
      }
    }

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
