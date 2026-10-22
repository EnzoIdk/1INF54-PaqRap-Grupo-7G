package pe.edu.pucp.paqrap.experimentacion;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;

/**
 * Pedido que el usuario registra desde el visualizador, uno a uno o en
 * bloque desde un archivo con el formato de ventas (RF-01, RF-54). Se suma a
 * los pedidos del archivo del mes antes de planificar, de modo que el
 * planificador lo trata igual que a cualquier otro.
 *
 * <p>Todos los campos son obligatorios (RF-64); el plazo debe ser uno de los
 * permitidos: 36 h para un pedido regular o 4, 8, 12 o 18 h para uno
 * priorizado (RF-02, RF-03). Esa regla se valida al cargar el escenario.</p>
 *
 * @param clienteId identificador del cliente, por ejemplo {@code c9167}
 * @param posX coordenada X de entrega
 * @param posY coordenada Y de entrega
 * @param cantidadProducto unidades del producto P
 * @param plazoHoras horas limite de entrega
 * @param dia dia del mes en que llega el pedido
 * @param hora hora en que llega el pedido
 * @param minuto minuto en que llega el pedido
 */
public record PedidoAdicional(
        @NotBlank @Pattern(regexp = "c?\\d{1,8}", message = "debe tener la forma c1234") String clienteId,
        @Min(0) @Max(ConstantesPaqrap.ANCHO_RETICULA_KM) int posX,
        @Min(0) @Max(ConstantesPaqrap.ALTO_RETICULA_KM) int posY,
        @Min(1) @Max(200) int cantidadProducto,
        @NotNull Integer plazoHoras,
        @Min(1) @Max(31) int dia,
        @Min(0) @Max(23) int hora,
        @Min(0) @Max(59) int minuto) {

    public int minutoSimulacion() {
        return (dia - 1) * ConstantesPaqrap.MINUTOS_POR_DIA
                + hora * ConstantesPaqrap.MINUTOS_POR_HORA
                + minuto;
    }

    /** Identificador normalizado con la letra {@code c} delante, como en los archivos. */
    public String clienteNormalizado() {
        String limpio = clienteId.trim().toLowerCase();
        return limpio.startsWith("c") ? limpio : "c" + limpio;
    }
}
