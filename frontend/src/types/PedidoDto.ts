export type EstadoPedido = "PENDIENTE" | "PLANIFICADO" | "EN_RUTA" | "ENTREGADO" | "NO_ENTREGADO";

/** Espejo de `pe.edu.pucp.paqrap.dto.PedidoDto` (STD 5.1). */
export interface PedidoDto {
  id: number;
  clienteId: string;
  posX: number;
  posY: number;
  cantidadProducto: number;
  plazoHoras: number;
  minutoSimulacion: number;
  estado: EstadoPedido;
}

/** Espejo de `pe.edu.pucp.paqrap.dto.RegistrarPedidoRequest`. */
export interface RegistrarPedidoRequest {
  clienteId: string;
  posX: number;
  posY: number;
  cantidadProducto: number;
  plazoHoras: number;
}
