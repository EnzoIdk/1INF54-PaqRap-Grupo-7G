package pe.edu.pucp.paqrap.carga;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.exception.CargaArchivoException;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.util.ConversorInstante;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Lee el archivo mensual {@code bloqueo_aamm.txt} con el formato de registro
 * {@code ##d##h##m-##d##h##m:x1,y1,x2,y2,...} (STD 4.7). Cada par
 * consecutivo de nodos identifica un tramo bloqueado.
 */
@Component
public class LectorBloqueos {

    private static final Logger log = LoggerFactory.getLogger(LectorBloqueos.class);

    private static final Pattern PATRON_BLOQUEO = Pattern.compile(
            "(\\d{2}d\\d{2}h\\d{2}m)-(\\d{2}d\\d{2}h\\d{2}m):(.+)");

    public record Resultado(List<Bloqueo> bloqueos, ResultadoCarga resumen) {
    }

    public Resultado leer(Path archivo) {
        List<Bloqueo> bloqueos = new ArrayList<>();
        ResultadoCarga resumen = new ResultadoCarga();

        try (Stream<String> lineas = Files.lines(archivo)) {
            lineas.map(String::strip)
                    .filter(linea -> !linea.isBlank())
                    .forEach(linea -> procesarLinea(linea, bloqueos, resumen));
        } catch (IOException e) {
            throw new CargaArchivoException("No se pudo leer el archivo de bloqueos: " + archivo, e);
        } catch (UncheckedIOException e) {
            throw new CargaArchivoException("No se pudo leer el archivo de bloqueos: " + archivo, e.getCause());
        }

        return new Resultado(bloqueos, resumen);
    }

    private void procesarLinea(String linea, List<Bloqueo> bloqueos, ResultadoCarga resumen) {
        Matcher matcher = PATRON_BLOQUEO.matcher(linea);
        if (!matcher.matches()) {
            resumen.registrarRechazado("Linea con formato invalido: " + linea);
            log.warn("Registro de bloqueo descartado por formato invalido: {}", linea);
            return;
        }

        try {
            int inicioMinuto = ConversorInstante.aMinutoSimulacion(matcher.group(1));
            int finMinuto = ConversorInstante.aMinutoSimulacion(matcher.group(2));
            List<Nodo> secuenciaNodos = parsearNodos(matcher.group(3));

            if (secuenciaNodos.size() < 2) {
                throw new IllegalArgumentException("secuencia de nodos insuficiente");
            }

            bloqueos.add(new Bloqueo(inicioMinuto, finMinuto, secuenciaNodos));
            resumen.registrarAceptado();
        } catch (IllegalArgumentException e) {
            resumen.registrarRechazado(linea + " -> " + e.getMessage());
            log.warn("Registro de bloqueo rechazado ({}): {}", e.getMessage(), linea);
        }
    }

    private List<Nodo> parsearNodos(String listaNodos) {
        List<Nodo> nodos = new ArrayList<>();
        String[] valores = listaNodos.split(",");
        if (valores.length % 2 != 0) {
            throw new IllegalArgumentException("cantidad impar de coordenadas");
        }
        for (int i = 0; i < valores.length; i += 2) {
            int x = Integer.parseInt(valores[i].strip());
            int y = Integer.parseInt(valores[i + 1].strip());
            if (x < 0 || x > ConstantesPaqrap.ANCHO_RETICULA_KM || y < 0 || y > ConstantesPaqrap.ALTO_RETICULA_KM) {
                throw new IllegalArgumentException("nodo fuera de la reticula");
            }
            nodos.add(new Nodo(x, y));
        }
        return nodos;
    }
}
