package pe.edu.pucp.paqrap.experimentacion;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.exception.CargaArchivoException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * Localiza los archivos del cliente dentro de {@code resources/datos} y los
 * entrega como rutas del sistema de archivos, que es lo que esperan los
 * lectores de {@code carga} (STD 4.7).
 *
 * <p>Cuando la aplicacion corre empaquetada en un jar el recurso no es un
 * fichero, asi que se copia a una carpeta temporal conservando su nombre:
 * los lectores validan el nombre del archivo antes de leerlo, de modo que
 * renombrarlo lo invalidaria.</p>
 */
@Component
public class LocalizadorArchivosDatos {

    private static final String PATRON_RECURSOS = "classpath*:datos/*.txt";

    private final PathMatchingResourcePatternResolver resolvedor = new PathMatchingResourcePatternResolver();
    private Path carpetaTemporal;

    /** Nombres de los archivos disponibles, en orden alfabetico. */
    public List<String> listarNombres() {
        try {
            return Arrays.stream(resolvedor.getResources(PATRON_RECURSOS))
                    .map(Resource::getFilename)
                    .filter(nombre -> nombre != null && !nombre.isBlank())
                    .sorted(Comparator.naturalOrder())
                    .toList();
        } catch (IOException e) {
            throw new CargaArchivoException("No se pudo listar la carpeta de datos", e);
        }
    }

    public boolean existe(String nombreArchivo) {
        return resolvedor.getResource("classpath:datos/" + nombreArchivo).exists();
    }

    public Path localizar(String nombreArchivo) {
        Resource recurso = resolvedor.getResource("classpath:datos/" + nombreArchivo);
        if (!recurso.exists()) {
            throw new CargaArchivoException("No se encontro el archivo de datos: " + nombreArchivo);
        }
        try {
            return recurso.getFile().toPath();
        } catch (IOException noEsUnFichero) {
            return copiarATemporal(recurso, nombreArchivo);
        }
    }

    private Path copiarATemporal(Resource recurso, String nombreArchivo) {
        try {
            if (carpetaTemporal == null) {
                carpetaTemporal = Files.createTempDirectory("paqrap-datos");
                carpetaTemporal.toFile().deleteOnExit();
            }
            Path destino = carpetaTemporal.resolve(nombreArchivo);
            if (!Files.exists(destino)) {
                try (InputStream entrada = recurso.getInputStream()) {
                    Files.copy(entrada, destino);
                }
                destino.toFile().deleteOnExit();
            }
            return destino;
        } catch (IOException e) {
            throw new CargaArchivoException("No se pudo preparar el archivo de datos: " + nombreArchivo, e);
        }
    }
}
