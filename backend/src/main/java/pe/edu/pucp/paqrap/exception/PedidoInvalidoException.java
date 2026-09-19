package pe.edu.pucp.paqrap.exception;

/**
 * Se lanza cuando un pedido no cumple las reglas de validacion del dominio
 * (coordenadas fuera de la reticula, cantidad de producto invalida o plazo
 * no permitido).
 */
public class PedidoInvalidoException extends RuntimeException {

    public PedidoInvalidoException(String mensaje) {
        super(mensaje);
    }

    public PedidoInvalidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
