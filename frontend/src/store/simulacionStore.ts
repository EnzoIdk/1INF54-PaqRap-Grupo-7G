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
  ParametrosVigentes,
  PedidoAdicional,
  TipoUnidad,
} from "../types/Experimentacion";

/** "DIA" es la operación día a día en tiempo real (RF-44). */
export type ModoSimulacion = "1D" | "5D" | "COLAPSO" | "DIA";

/** Velocidad del modo día a día: un segundo real es un segundo simulado. */
export const MINUTOS_POR_SEGUNDO_TIEMPO_REAL = 1 / 60;
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
  modoSimulacion: ModoSimulacion;
  /** El reloj sigue la hora real de Lima en lugar de avanzar a una velocidad elegida. */
  tiempoReal: boolean;
  // --- Pedidos registrados por el usuario (RF-01, RF-54) ---
  pedidosAdicionales: PedidoAdicional[];
  // --- Parametros vigentes del backend, compartidos por todas las pantallas ---
  parametrosVigentes: ParametrosVigentes | null;
  // --- Tipos de unidad visibles en el mapa (RF-59) ---
  tiposVisibles: TipoUnidad[];

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
  setModoSimulacion: (modo: ModoSimulacion) => void;
  activarTiempoReal: (minutoActual: number) => void;
  sincronizarTiempoReal: (minutoActual: number) => void;
  agregarPedidosAdicionales: (pedidos: PedidoAdicional[]) => void;
  quitarPedidoAdicional: (indice: number) => void;
  limpiarPedidosAdicionales: () => void;
  setParametrosVigentes: (parametros: ParametrosVigentes) => void;
  alternarTipoVisible: (tipo: TipoUnidad) => void;
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
  /** Descarta la corrida anterior y los datos inyectados antes de un nuevo escenario (RF-50). */
  reiniciarDatos: () => void;
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
  tiempoReal: false,
  pedidosAdicionales: [],
  parametrosVigentes: null,
  tiposVisibles: ["AUTO", "MOTO", "BICICLETA"],
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
  activarTiempoReal: (minutoActual) =>
    set({
      tiempoReal: true,
      reproduciendo: true,
      minutoActual,
      minutosPorSegundo: MINUTOS_POR_SEGUNDO_TIEMPO_REAL,
      segundosReales: 0,
    }),
  sincronizarTiempoReal: (minutoActual) => {
    const estado = get();
    if (!estado.tiempoReal || !estado.reproduciendo || !estado.escenario) {
      return;
    }
    const limite = calcularMinutoFinal(estado);
    set({
      minutoActual: Math.min(Math.max(minutoActual, estado.escenario.minutoInicio), limite),
      segundosReales: estado.segundosReales + 1,
    });
  },
  agregarPedidosAdicionales: (pedidos) =>
    set((estado) => ({ pedidosAdicionales: [...estado.pedidosAdicionales, ...pedidos] })),
  quitarPedidoAdicional: (indice) =>
    set((estado) => ({ pedidosAdicionales: estado.pedidosAdicionales.filter((_, i) => i !== indice) })),
  limpiarPedidosAdicionales: () => set({ pedidosAdicionales: [] }),
  setParametrosVigentes: (parametrosVigentes) => set({ parametrosVigentes }),
  alternarTipoVisible: (tipo) =>
    set((estado) => ({
      tiposVisibles: estado.tiposVisibles.includes(tipo)
        ? estado.tiposVisibles.filter((candidato) => candidato !== tipo)
        : [...estado.tiposVisibles, tipo],
    })),

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
      tiempoReal: false,
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
      tiempoReal: false,
      minutoActual: estado.escenario?.minutoInicio ?? 0,
      segundosReales: 0,
    })),

  reiniciar: () =>
    set((estado) => ({
      minutoActual: estado.escenario?.minutoInicio ?? 0,
      segundosReales: 0,
    })),

  // Conserva el archivo, el dia y la flota elegidos: solo se descarta lo que
  // la corrida anterior dejo (plan, reloj, averias y pedidos registrados).
  reiniciarDatos: () =>
    set((estado) => ({
      pedidosAdicionales: [],
      parametros: { ...estado.parametros, averias: [] },
      parametros5D: { ...estado.parametros5D, averias: [] },
      parametrosColapso: { ...estado.parametrosColapso, averias: [] },
      escenario: null,
      ejecuciones: [],
      algoritmoVisible: null,
      error: null,
      minutoActual: 0,
      reproduciendo: false,
      tiempoReal: false,
      segundosReales: 0,
      unidadEnfocada: null,
    })),

  // Elegir una velocidad abandona el seguimiento de la hora real.
  setMinutosPorSegundo: (minutosPorSegundo) =>
    set({ minutosPorSegundo, tiempoReal: minutosPorSegundo === MINUTOS_POR_SEGUNDO_TIEMPO_REAL && get().tiempoReal }),

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
