package pe.edu.pucp.paqrap.exception;

/**
 * Se lanza cuando un archivo de datos mensual (ventas, bloqueos o
 * mantenimiento preventivo) no puede leerse o procesarse.
 */
public class CargaArchivoException extends RuntimeException {

    public CargaArchivoException(String mensaje) {
        super(mensaje);
    }

    public CargaArchivoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
