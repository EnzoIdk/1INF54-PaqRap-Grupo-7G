package pe.edu.pucp.paqrap.dto;

import pe.edu.pucp.paqrap.enums.EstadoPedido;

/**
 * Representacion inmutable de un {@code Pedido} expuesta al frontend. Los
 * nombres de campo deben coincidir con la interfaz espejo declarada en
 * {@code frontend/src/types} (STD 5.1).
 */
public record PedidoDto(
        Long id,
        String clienteId,
        int posX,
        int posY,
        int cantidadProducto,
        int plazoHoras,
        int minutoSimulacion,
        EstadoPedido estado) {
}
