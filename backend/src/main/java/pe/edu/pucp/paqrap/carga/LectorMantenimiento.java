package pe.edu.pucp.paqrap.carga;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.exception.CargaArchivoException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Lee el archivo {@code mant_preventivo_m1_m2.txt} con el formato de
 * registro {@code aaaammdd:TTNN} (STD 4.7), donde TT es el tipo de unidad
 * (TA, TB o TM) y NN el correlativo.
 */
@Component
public class LectorMantenimiento {

    private static final Logger log = LoggerFactory.getLogger(LectorMantenimiento.class);

    private static final Pattern PATRON_MANTENIMIENTO = Pattern.compile("(\\d{8}):((?:TA|TM|TB)\\d{2})");

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("yyyyMMdd");

    public record Resultado(List<MantenimientoProgramado> mantenimientos, ResultadoCarga resumen) {
    }

    public Resultado leer(Path archivo) {
        List<MantenimientoProgramado> mantenimientos = new ArrayList<>();
        ResultadoCarga resumen = new ResultadoCarga();

        try (Stream<String> lineas = Files.lines(archivo)) {
            lineas.map(String::strip)
                    .filter(linea -> !linea.isBlank())
                    .forEach(linea -> procesarLinea(linea, mantenimientos, resumen));
        } catch (IOException e) {
            throw new CargaArchivoException("No se pudo leer el archivo de mantenimiento: " + archivo, e);
        } catch (UncheckedIOException e) {
            throw new CargaArchivoException("No se pudo leer el archivo de mantenimiento: " + archivo, e.getCause());
        }

        return new Resultado(mantenimientos, resumen);
    }

    private void procesarLinea(String linea, List<MantenimientoProgramado> mantenimientos, ResultadoCarga resumen) {
        Matcher matcher = PATRON_MANTENIMIENTO.matcher(linea);
        if (!matcher.matches()) {
            resumen.registrarRechazado("Linea con formato invalido: " + linea);
            log.warn("Registro de mantenimiento descartado por formato invalido: {}", linea);
            return;
        }

        try {
            LocalDate fecha = LocalDate.parse(matcher.group(1), FORMATO_FECHA);
            String codigoUnidad = matcher.group(2);
            mantenimientos.add(new MantenimientoProgramado(fecha, codigoUnidad));
            resumen.registrarAceptado();
        } catch (DateTimeParseException e) {
            resumen.registrarRechazado(linea + " -> fecha invalida");
            log.warn("Registro de mantenimiento rechazado (fecha invalida): {}", linea);
        }
    }
}
