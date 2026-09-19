package pe.edu.pucp.paqrap.carga;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.exception.CargaArchivoException;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.util.ConversorInstante;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Lee el archivo mensual {@code ventas_aaaamm.txt} con el formato de
 * registro {@code ##d##h##m:posX,posY,cIdCliente,qq,hl} (STD 4.7).
 * No procesa ningun otro formato de archivo.
 */
@Component
public class LectorVentas {

    private static final Logger log = LoggerFactory.getLogger(LectorVentas.class);

    private static final Pattern PATRON_VENTA = Pattern.compile(
            "(\\d{2}d\\d{2}h\\d{2}m):(\\d{2}),(\\d{2}),(c\\d+),(\\d{2}),(\\d{2})");

    private static final List<Integer> PLAZOS_VALIDOS = Arrays.stream(ConstantesPaqrap.PLAZOS_HORAS_VALIDOS)
            .boxed()
            .toList();

    public record Resultado(List<Pedido> pedidos, ResultadoCarga resumen) {
    }

    public Resultado leer(Path archivo) {
        List<Pedido> pedidos = new ArrayList<>();
        ResultadoCarga resumen = new ResultadoCarga();

        try (Stream<String> lineas = Files.lines(archivo)) {
            lineas.map(this::normalizar)
                    .filter(linea -> !linea.isBlank())
                    .forEach(linea -> procesarLinea(linea, pedidos, resumen));
        } catch (IOException e) {
            throw new CargaArchivoException("No se pudo leer el archivo de ventas: " + archivo, e);
        } catch (UncheckedIOException e) {
            throw new CargaArchivoException("No se pudo leer el archivo de ventas: " + archivo, e.getCause());
        }

        return new Resultado(pedidos, resumen);
    }

    private String normalizar(String linea) {
        return linea.strip();
    }

    private void procesarLinea(String linea, List<Pedido> pedidos, ResultadoCarga resumen) {
        Matcher matcher = PATRON_VENTA.matcher(linea);
        if (!matcher.matches()) {
            resumen.registrarRechazado("Linea con formato invalido: " + linea);
            log.warn("Registro de ventas descartado por formato invalido: {}", linea);
            return;
        }

        try {
            int minutoSimulacion = ConversorInstante.aMinutoSimulacion(matcher.group(1));
            int posX = Integer.parseInt(matcher.group(2));
            int posY = Integer.parseInt(matcher.group(3));
            String clienteId = matcher.group(4);
            int cantidadProducto = Integer.parseInt(matcher.group(5));
            int plazoHoras = Integer.parseInt(matcher.group(6));

            validarRegistro(posX, posY, cantidadProducto, plazoHoras);

            pedidos.add(new Pedido(clienteId, new Nodo(posX, posY), cantidadProducto, plazoHoras, minutoSimulacion));
            resumen.registrarAceptado();
        } catch (IllegalArgumentException e) {
            resumen.registrarRechazado(linea + " -> " + e.getMessage());
            log.warn("Registro de ventas rechazado ({}): {}", e.getMessage(), linea);
        }
    }

    private void validarRegistro(int posX, int posY, int cantidadProducto, int plazoHoras) {
        if (posX < 0 || posX > ConstantesPaqrap.ANCHO_RETICULA_KM || posY < 0 || posY > ConstantesPaqrap.ALTO_RETICULA_KM) {
            throw new IllegalArgumentException("coordenadas fuera de la reticula");
        }
        if (cantidadProducto < ConstantesPaqrap.CANTIDAD_PRODUCTO_MINIMA
                || cantidadProducto > ConstantesPaqrap.CANTIDAD_PRODUCTO_MAXIMA) {
            throw new IllegalArgumentException("cantidad de producto fuera de rango");
        }
        if (!PLAZOS_VALIDOS.contains(plazoHoras)) {
            throw new IllegalArgumentException("plazo de horas no permitido");
        }
    }
}
