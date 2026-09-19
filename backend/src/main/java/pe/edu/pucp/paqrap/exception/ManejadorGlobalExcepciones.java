package pe.edu.pucp.paqrap.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Traduce las excepciones del dominio a respuestas HTTP. Los controladores
 * no deben construir respuestas de error por su cuenta (STD 4.8.1).
 */
@RestControllerAdvice
public class ManejadorGlobalExcepciones {

    private static final Logger log = LoggerFactory.getLogger(ManejadorGlobalExcepciones.class);

    @ExceptionHandler(PedidoInvalidoException.class)
    public ResponseEntity<Object> manejarPedidoInvalido(PedidoInvalidoException ex) {
        log.warn("Pedido invalido: {}", ex.getMessage());
        return construirRespuesta(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(StockInsuficienteException.class)
    public ResponseEntity<Object> manejarStockInsuficiente(StockInsuficienteException ex) {
        log.warn("Stock insuficiente: {}", ex.getMessage());
        return construirRespuesta(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(PlazoIncumplibleException.class)
    public ResponseEntity<Object> manejarPlazoIncumplible(PlazoIncumplibleException ex) {
        log.warn("Plazo incumplible: {}", ex.getMessage());
        return construirRespuesta(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(CargaArchivoException.class)
    public ResponseEntity<Object> manejarCargaArchivo(CargaArchivoException ex) {
        log.error("Error al cargar archivo de datos: {}", ex.getMessage(), ex);
        return construirRespuesta(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    }

    private ResponseEntity<Object> construirRespuesta(HttpStatus estado, String mensaje) {
        Map<String, Object> cuerpo = Map.of(
                "instante", LocalDateTime.now().toString(),
                "estado", estado.value(),
                "mensaje", mensaje);
        return ResponseEntity.status(estado).body(cuerpo);
    }
}
