/** Espejo de `pe.edu.pucp.paqrap.dto.ExperimentacionResponse` (STD 5.1). */

export type TipoUnidad = "AUTO" | "MOTO" | "BICICLETA";
export type TipoAlmacen = "CENTRAL" | "INTERMEDIO";
export type TipoAveria = "TIPO_1" | "TIPO_2" | "TIPO_3";
export type AlgoritmoSolicitado = "IACO" | "AGAESTW" | "AMBOS";

/** Nodo de la reticula, como par [x, y]. */
export type NodoMapa = [number, number];

export interface ConjuntoDatos {
  archivoVentas: string;
  archivoBloqueos: string | null;
  archivoMantenimiento: string | null;
  anio: number;
  mes: number;
}

export interface CargaDto {
  archivo: string;
  leidos: number;
  aceptados: number;
  rechazados: number;
  detalleRechazos: string[];
}

export interface AlmacenDto {
  codigo: string;
  tipo: TipoAlmacen;
  posX: number;
  posY: number;
  stockActual: number;
  stockMaximo: number;
}

export interface BloqueoDto {
  inicioMinuto: number;
  finMinuto: number;
  nodos: NodoMapa[];
}

export interface UnidadDto {
  codigo: string;
  tipoUnidad: TipoUnidad;
  estado: string;
  capacidad: number;
  velocidadKmh: number;
  costoKm: number;
  posX: number;
  posY: number;
}

export interface EscenarioDto {
  archivoVentas: string;
  archivoBloqueos: string | null;
  archivoMantenimiento: string | null;
  anio: number;
  mes: number;
  dia: number;
  minutoInicio: number;
  minutoFin: number;
  pedidosDelTurno: number;
  pedidosDelMes: number;
  bloqueosVigentes: number;
  bloqueosDelMes: number;
  semilla: number;
  cargas: CargaDto[];
  almacenes: AlmacenDto[];
  bloqueos: BloqueoDto[];
  flota: UnidadDto[];
  unidadesEnMantenimiento: string[];
  mantenimientosProgramados?: MantenimientoDto[];
  colapsoOcurrido?: boolean;
  minutoColapso?: number | null;
  fechaHoraColapso?: string | null;
  motivoColapso?: string | null;
}

export interface MantenimientoDto {
  codigoUnidad: string;
  dia: number;
  minutoInicio: number;
  minutoFin: number;
}

export interface ParadaDto {
  codigoPedido: string;
  clienteId: string;
  posX: number;
  posY: number;
  cantidadProducto: number;
  plazoHoras: number;
  minutoRegistro: number;
  minutoLimite: number;
  minutoLlegada: number;
  minutoSalida: number;
  cumplePlazo: boolean;
  holguraMinutos: number;
  /** El pedido llegó a esta unidad por la reasignación de una unidad averiada. */
  reasignado?: boolean;
}

export interface PedidoPendienteDto {
  codigoPedido: string;
  clienteId: string;
  posX: number;
  posY: number;
  cantidadProducto: number;
  plazoHoras: number;
  minutoRegistro: number;
  minutoLimite: number;
}

export interface RutaDto {
  codigoUnidad: string;
  tipoUnidad: TipoUnidad;
  almacenOrigen: string;
  almacenDestino?: string;
  cargaTotal: number;
  capacidad: number;
  distanciaKm: number;
  costoSoles: number;
  minutoSalida: number;
  minutoInicioRetorno?: number;
  minutoFin: number;
  /** Nodos por los que pasa la unidad, en orden. */
  recorrido: NodoMapa[];
  /** Minuto de simulacion de cada nodo del recorrido; mismo tamaño que `recorrido`. */
  minutosPorNodo: number[];
  paradas: ParadaDto[];
  /** Hora de alimentación del conductor (RF-26, RF-27). */
  minutoInicioAlimentacion?: number | null;
  minutoFinAlimentacion?: number | null;
  alimentacionEnVentana?: boolean;
}

export interface MetricasDto {
  pedidosDelTurno: number;
  pedidosAtendidos: number;
  pedidosSinAtender: number;
  entregasFueraDePlazo: number;
  unidadesEnRuta: number;
  unidadesDisponibles: number;
  distanciaTotalKm: number;
  costoOperativoTotal: number;
  multas: number;
  fitness: number;
  duracionComputoMs: number;
}

export interface EjecucionDto {
  algoritmo: string;
  metricas: MetricasDto;
  rutas: RutaDto[];
  pedidosSinAtender: PedidoPendienteDto[];
  riesgosDeColapso: string[];
  colapsoOcurrido?: boolean;
  minutoColapso?: number | null;
  fechaHoraColapso?: string | null;
  motivoColapso?: string | null;
}

export interface ExperimentacionResponse {
  escenario: EscenarioDto;
  ejecuciones: EjecucionDto[];
}

/** Espejo de `pe.edu.pucp.paqrap.experimentacion.ParametrosEjecucion`. */
export interface ParametrosEjecucion {
  archivoVentas: string;
  dia: number;
  horaInicio: number;
  ventanaHoras: number;
  maximoPedidos: number;
  algoritmo: AlgoritmoSolicitado;
  semilla?: number | null;
  cantidadAutos?: number | null;
  cantidadMotos?: number | null;
  cantidadBicicletas?: number | null;
  averias?: AveriaSolicitada[];
  pedidosAdicionales?: PedidoAdicional[];
}

/** Pedido registrado por el usuario, a mano o desde un archivo (RF-01, RF-54). */
export interface PedidoAdicional {
  clienteId: string;
  posX: number;
  posY: number;
  cantidadProducto: number;
  plazoHoras: number;
  dia: number;
  hora: number;
  minuto: number;
}

export interface AveriaSolicitada {
  codigoUnidad: string;
  tipo: TipoAveria;
  minutoSimulacion: number;
}

/** Espejo de `pe.edu.pucp.paqrap.experimentacion.ParametrosCincoDias`. */
export interface ParametrosCincoDias {
  archivoVentas: string;
  diaInicio: number;
  horaInicio: number;
  maximoPedidosPorTurno?: number | null;
  algoritmo: AlgoritmoSolicitado;
  semilla?: number | null;
  cantidadAutos?: number | null;
  cantidadMotos?: number | null;
  cantidadBicicletas?: number | null;
  averias?: AveriaSolicitada5D[];
  pedidosAdicionales?: PedidoAdicional[];
}

export interface AveriaSolicitada5D {
  codigoUnidad: string;
  tipo: TipoAveria;
  dia: number;
  hora: number;
  minutoSimulacion?: number;
}

/** Espejo de `pe.edu.pucp.paqrap.experimentacion.ParametrosColapso`. */
export interface ParametrosColapso {
  archivoVentas: string;
  diaInicio: number;
  horaInicio?: number;
  maximoPedidosPorTurno?: number | null;
  algoritmo: AlgoritmoSolicitado;
  semilla?: number | null;
  cantidadAutos?: number | null;
  cantidadMotos?: number | null;
  cantidadBicicletas?: number | null;
  averias?: AveriaSolicitada5D[];
  pedidosAdicionales?: PedidoAdicional[];
}

/** Espejo de `ExperimentacionController.ParametrosVigentes`. */
export interface ParametrosVigentes {
  planificador: Record<string, number | string>;
  flota: Record<string, number>;
  almacen: Record<string, number>;
}
