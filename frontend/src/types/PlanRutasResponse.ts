/** Espejo de `pe.edu.pucp.paqrap.dto.PlanRutasResponse`. */
export interface RutaDto {
  codigoUnidad: string;
  secuenciaNodos: Array<[number, number]>;
  pedidoIds: number[];
}

export interface PlanRutasResponse {
  minutoSimulacion: number;
  costoOperativoTotal: number;
  rutas: RutaDto[];
}
