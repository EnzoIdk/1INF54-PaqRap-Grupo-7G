export type TipoUnidad = "AUTO" | "MOTO" | "BICICLETA";

export type EstadoUnidad = "DISPONIBLE" | "EN_RUTA" | "EN_PAUSA" | "EN_MANTENIMIENTO" | "AVERIADA";

/** Estado de una unidad de transporte publicado por el backend via WebSocket. */
export interface UnidadTransporteEstado {
  codigo: string;
  tipoUnidad: TipoUnidad;
  estado: EstadoUnidad;
  posX: number;
  posY: number;
}
