package pe.edu.pucp.paqrap.experimentacion;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.exception.CargaArchivoException;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Interpreta el nombre de los archivos del cliente y relaciona entre si los
 * tres juegos de datos de un mismo mes (STD 4.7.1).
 *
 * <p>Las tres convenciones de nombre son distintas: las ventas llevan el ano
 * completo ({@code ventas.202601.txt}), los bloqueos lo llevan abreviado
 * ({@code bloqueo.2601.txt}) y el plan de mantenimiento preventivo cubre dos
 * meses y se repite cada dos ({@code mant.preventivo.09.10.txt}), por lo que
 * se aplica por el dia del mes que corresponda.</p>
 */
@Component
public class CatalogoDatos {

    private static final Pattern PATRON_VENTAS = Pattern.compile("ventas\\.(\\d{4})(\\d{2})\\.txt");
    private static final Pattern PATRON_BLOQUEOS = Pattern.compile("bloqueo\\.(\\d{2})(\\d{2})\\.txt");
    private static final Pattern PATRON_MANTENIMIENTO = Pattern.compile("mant\\.preventivo\\.(\\d{2})\\.(\\d{2})\\.txt");

    private final LocalizadorArchivosDatos localizador;

    public CatalogoDatos(LocalizadorArchivosDatos localizador) {
        this.localizador = localizador;
    }

    /**
     * Un mes de operacion: el archivo de ventas y los de bloqueos y
     * mantenimiento que le corresponden.
     *
     * @param archivoVentas nombre del archivo de ventas
     * @param archivoBloqueos nombre del archivo de bloqueos del mismo mes, o nulo si no existe
     * @param archivoMantenimiento plan de mantenimiento preventivo aplicable, o nulo si no existe
     * @param anio ano al que pertenecen los datos
     * @param mes mes al que pertenecen los datos
     */
    public record ConjuntoDatos(
            String archivoVentas,
            String archivoBloqueos,
            String archivoMantenimiento,
            int anio,
            int mes) {

        public String etiqueta() {
            return String.format("%02d/%d", mes, anio);
        }
    }

    /** Conjuntos de datos disponibles, ordenados cronologicamente. */
    public List<ConjuntoDatos> listarConjuntos() {
        List<String> nombres = localizador.listarNombres();
        return nombres.stream()
                .map(PATRON_VENTAS::matcher)
                .filter(Matcher::matches)
                .map(coincidencia -> construirConjunto(
                        Integer.parseInt(coincidencia.group(1)),
                        Integer.parseInt(coincidencia.group(2)),
                        nombres))
                .toList();
    }

    public ConjuntoDatos buscarPorArchivoVentas(String archivoVentas) {
        Matcher coincidencia = PATRON_VENTAS.matcher(archivoVentas);
        if (!coincidencia.matches()) {
            throw new CargaArchivoException(
                    "El nombre del archivo de ventas debe seguir el patron ventas.aaaamm.txt: " + archivoVentas);
        }
        return construirConjunto(
                Integer.parseInt(coincidencia.group(1)),
                Integer.parseInt(coincidencia.group(2)),
                localizador.listarNombres());
    }

    private ConjuntoDatos construirConjunto(int anio, int mes, List<String> nombres) {
        String archivoVentas = String.format("ventas.%04d%02d.txt", anio, mes);
        String archivoBloqueos = String.format("bloqueo.%02d%02d.txt", anio % 100, mes);
        if (!nombres.contains(archivoBloqueos)) {
            archivoBloqueos = null;
        }
        return new ConjuntoDatos(archivoVentas, archivoBloqueos, buscarMantenimiento(mes, nombres), anio, mes);
    }

    /**
     * El plan de mantenimiento cubre dos meses y se repite cada dos, asi que
     * un plan {@code MM.MM} aplica a cualquier mes con la misma paridad. Si
     * no hay ninguno con esa paridad se usa el primero disponible.
     */
    private String buscarMantenimiento(int mes, List<String> nombres) {
        String primero = null;
        for (String nombre : nombres) {
            Matcher coincidencia = PATRON_MANTENIMIENTO.matcher(nombre);
            if (!coincidencia.matches()) {
                continue;
            }
            if (primero == null) {
                primero = nombre;
            }
            int primerMes = Integer.parseInt(coincidencia.group(1));
            int segundoMes = Integer.parseInt(coincidencia.group(2));
            if (mes % 2 == primerMes % 2 || mes % 2 == segundoMes % 2) {
                return nombre;
            }
        }
        return primero;
    }

    /** Comprueba que el nombre corresponda a un archivo de bloqueos valido. */
    public boolean esArchivoDeBloqueos(String nombre) {
        return PATRON_BLOQUEOS.matcher(nombre).matches();
    }
}
