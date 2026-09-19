package pe.edu.pucp.paqrap.exception;

/**
 * Se lanza cuando el planificador determina que el plazo comprometido de un
 * pedido no puede cumplirse con la flota y las condiciones actuales.
 */
public class PlazoIncumplibleException extends RuntimeException {

    public PlazoIncumplibleException(String mensaje) {
        super(mensaje);
    }

    public PlazoIncumplibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
