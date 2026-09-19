package pe.edu.pucp.paqrap.carga;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.exception.CargaArchivoException;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Pedido;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Comprueba que los lectores interpretan correctamente los archivos que
 * entrega el cliente. Cada lector reconoce su tipo de archivo por el nombre
 * -ventas.aaaamm.txt, bloqueo.aamm.txt y mant.preventivo.MM.MM.txt- y
 * rechaza cualquier otro (STD 4.7).
 */
class LectoresDatosIT {

    private static final Path CARPETA_DATOS = Path.of("src/main/resources/datos");

    private static final Pattern PATRON_VENTAS = Pattern.compile("ventas\\.\\d{6}\\.txt");
    private static final Pattern PATRON_BLOQUEOS = Pattern.compile("bloqueo\\.\\d{4}\\.txt");
    private static final Pattern PATRON_MANTENIMIENTO = Pattern.compile("mant\\.preventivo\\.\\d{2}\\.\\d{2}\\.txt");

    private final LectorVentas lectorVentas = new LectorVentas();
    private final LectorBloqueos lectorBloqueos = new LectorBloqueos();
    private final LectorMantenimiento lectorMantenimiento = new LectorMantenimiento();

    @Test
    @DisplayName("Todos los archivos del cliente se leen sin rechazar un solo registro")
    void todosLosArchivosSeLeenSinRechazos() throws IOException {
        List<Path> archivos = listarArchivos();
        assertFalse(archivos.isEmpty(), "la carpeta de datos no puede estar vacía");

        Map<String, int[]> totales = new LinkedHashMap<>();
        totales.put("ventas", new int[]{0, 0, 0});
        totales.put("bloqueos", new int[]{0, 0, 0});
        totales.put("mantenimiento", new int[]{0, 0, 0});

        List<String> rechazos = new ArrayList<>();

        for (Path archivo : archivos) {
            String tipo = detectarTipoPorNombre(archivo.getFileName().toString());
            if (tipo == null) {
                continue;
            }
            ResultadoCarga resumen = leer(tipo, archivo);

            int[] acumulado = totales.get(tipo);
            acumulado[0] += 1;
            acumulado[1] += resumen.getRegistrosLeidos();
            acumulado[2] += resumen.getRegistrosAceptados();

            resumen.getDetalleRechazos()
                    .forEach(motivo -> rechazos.add(archivo.getFileName() + ": " + motivo));
        }

        totales.forEach((tipo, acumulado) -> System.out.printf(
                "%-14s %2d archivo(s) | %6d registros leídos | %6d aceptados%n",
                tipo, acumulado[0], acumulado[1], acumulado[2]));

        assertTrue(totales.get("ventas")[0] > 0, "debe haber archivos de ventas");
        assertTrue(totales.get("bloqueos")[0] > 0, "debe haber archivos de bloqueos");
        assertTrue(totales.get("mantenimiento")[0] > 0, "debe haber un plan de mantenimiento");

        assertEquals(List.of(), rechazos,
                "ningún registro de los archivos del cliente debería rechazarse");
        totales.forEach((tipo, acumulado) -> assertEquals(acumulado[1], acumulado[2],
                "todos los registros de " + tipo + " deberían aceptarse"));
    }

    @Test
    @DisplayName("Un pedido conserva cliente, destino, cantidad, plazo e instante del archivo")
    void elPedidoConservaLoQueDiceElArchivo() {
        Path archivo = CARPETA_DATOS.resolve("ventas.202601.txt");
        LectorVentas.Resultado resultado = lectorVentas.leer(archivo);

        // Primer registro: 01d01h30m:56,30,c4910,02,36
        Pedido primero = resultado.pedidos().get(0);
        assertEquals("c4910", primero.getClienteId());
        assertEquals(56, primero.getUbicacion().getX());
        assertEquals(30, primero.getUbicacion().getY());
        assertEquals(2, primero.getCantidadProducto());
        assertEquals(36, primero.getPlazoHoras());
        assertEquals(90, primero.getMinutoSimulacion(), "01d01h30m son 90 minutos desde el inicio del mes");
        assertEquals(90 + 36 * ConstantesPaqrap.MINUTOS_POR_HORA, primero.getMinutoLimiteEntrega());
    }

    @Test
    @DisplayName("Un bloqueo conserva su periodo de vigencia y su secuencia de nodos")
    void elBloqueoConservaSuPeriodoYSusNodos() {
        Path archivo = CARPETA_DATOS.resolve("bloqueo.2601.txt");
        LectorBloqueos.Resultado resultado = lectorBloqueos.leer(archivo);

        // Primer registro: 01d02h22m-01d04h42m:25,45,45,45,45,40
        Bloqueo primero = resultado.bloqueos().get(0);
        assertEquals(142, primero.getInicioMinuto());
        assertEquals(282, primero.getFinMinuto());
        assertEquals(3, primero.getNodos().size());
        assertTrue(primero.estaVigenteEn(200));
        assertFalse(primero.estaVigenteEn(300));
    }

    @Test
    @DisplayName("Cada lector rechaza un archivo que no sigue su convención de nombre")
    void cadaLectorRechazaUnNombreAjeno() {
        Path ventas = CARPETA_DATOS.resolve("ventas.202601.txt");
        Path bloqueos = CARPETA_DATOS.resolve("bloqueo.2601.txt");
        Path mantenimiento = CARPETA_DATOS.resolve("mant.preventivo.09.10.txt");

        assertThrows(CargaArchivoException.class, () -> lectorVentas.leer(bloqueos));
        assertThrows(CargaArchivoException.class, () -> lectorBloqueos.leer(ventas));
        assertThrows(CargaArchivoException.class, () -> lectorMantenimiento.leer(ventas));
        assertThrows(CargaArchivoException.class, () -> lectorVentas.leer(mantenimiento));
    }

    private List<Path> listarArchivos() throws IOException {
        try (var archivos = Files.list(CARPETA_DATOS)) {
            return archivos.filter(Files::isRegularFile).sorted().toList();
        }
    }

    private String detectarTipoPorNombre(String nombreArchivo) {
        if (PATRON_VENTAS.matcher(nombreArchivo).matches()) {
            return "ventas";
        }
        if (PATRON_BLOQUEOS.matcher(nombreArchivo).matches()) {
            return "bloqueos";
        }
        if (PATRON_MANTENIMIENTO.matcher(nombreArchivo).matches()) {
            return "mantenimiento";
        }
        return null;
    }

    private ResultadoCarga leer(String tipo, Path archivo) {
        return switch (tipo) {
            case "ventas" -> lectorVentas.leer(archivo).resumen();
            case "bloqueos" -> lectorBloqueos.leer(archivo).resumen();
            case "mantenimiento" -> lectorMantenimiento.leer(archivo).resumen();
            default -> throw new IllegalArgumentException("Tipo no soportado: " + tipo);
        };
    }
}
