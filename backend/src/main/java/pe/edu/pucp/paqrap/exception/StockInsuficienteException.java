package pe.edu.pucp.paqrap.exception;

/**
 * Se lanza cuando un almacen intermedio no tiene stock suficiente para
 * atender la carga solicitada.
 */
public class StockInsuficienteException extends RuntimeException {

    public StockInsuficienteException(String mensaje) {
        super(mensaje);
    }

    public StockInsuficienteException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
