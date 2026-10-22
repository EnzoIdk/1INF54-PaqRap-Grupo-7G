package pe.edu.pucp.paqrap.exception;

/**
 * Se lanza cuando un administrador intenta grabar parametros de operacion
 * fuera de rango (velocidades, capacidades, costos, umbrales del semaforo).
 */
public class ParametrosInvalidosException extends RuntimeException {

    public ParametrosInvalidosException(String mensaje) {
        super(mensaje);
    }
}
