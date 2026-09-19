package pe.edu.pucp.paqrap.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * Datos requeridos para registrar un nuevo pedido desde el visualizador.
 */
public record RegistrarPedidoRequest(
        @NotBlank String clienteId,
        @Min(0) @Max(70) int posX,
        @Min(0) @Max(50) int posY,
        @Min(1) @Max(10) int cantidadProducto,
        int plazoHoras) {
}
