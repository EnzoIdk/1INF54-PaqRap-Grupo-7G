package pe.edu.pucp.paqrap.experimentacion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import pe.edu.pucp.paqrap.dto.ExperimentacionResponse;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Comprueba que la experimentacion numerica resuelve un turno real de los
 * archivos del cliente con los dos algoritmos, y que el plan que devuelve es
 * coherente: sin entregas fuera de plazo, sin exceder la capacidad de las
 * unidades y con un recorrido fechado que el visualizador pueda animar.
 */
@SpringBootTest
@ActiveProfiles("local")
class ExperimentacionIT {

    @Autowired
    private ServicioExperimentacion servicioExperimentacion;

    private static ParametrosEjecucion parametrosDePrueba(String archivoVentas, int dia, int ventanaHoras) {
        return new ParametrosEjecucion(
                archivoVentas, dia, 7, ventanaHoras, 60, "AMBOS",
                20260917L, null, null, null, List.of());
    }

    @Test
    @DisplayName("El catalogo relaciona cada mes de ventas con sus bloqueos y su plan de mantenimiento")
    void elCatalogoRelacionaLosTresJuegosDeDatos() {
        List<CatalogoDatos.ConjuntoDatos> conjuntos = servicioExperimentacion.listarConjuntos();

        assertEquals(36, conjuntos.size(), "hay 36 meses de ventas en la carpeta de datos");
        conjuntos.forEach(conjunto -> {
            assertTrue(conjunto.archivoVentas().matches("ventas\\.\\d{6}\\.txt"));
            assertTrue(conjunto.archivoBloqueos() != null && conjunto.archivoBloqueos().matches("bloqueo\\.\\d{4}\\.txt"),
                    "cada mes de ventas tiene su archivo de bloqueos: " + conjunto.archivoVentas());
            assertTrue(conjunto.archivoMantenimiento() != null,
                    "el plan de mantenimiento aplica a todos los meses");
        });
    }

    @Test
    @DisplayName("Los dos algoritmos resuelven el mismo turno y entregan un plan factible")
    void losDosAlgoritmosResuelvenElMismoTurno() {
        ExperimentacionResponse respuesta =
                servicioExperimentacion.ejecutar(parametrosDePrueba("ventas.202601.txt", 1, 12));

        ExperimentacionResponse.EscenarioDto escenario = respuesta.escenario();
        assertEquals("bloqueo.2601.txt", escenario.archivoBloqueos());
        assertTrue(escenario.pedidosDelTurno() > 0, "el turno debe traer pedidos");
        escenario.cargas().forEach(carga -> assertEquals(0, carga.rechazados(),
                "ningun registro de " + carga.archivo() + " deberia rechazarse"));

        assertEquals(2, respuesta.ejecuciones().size());
        respuesta.ejecuciones().forEach(this::verificarEjecucion);
    }

    @Test
    @DisplayName("Una misma semilla devuelve exactamente el mismo plan")
    void laSemillaHaceReproducibleLaEjecucion() {
        ParametrosEjecucion parametros = parametrosDePrueba("ventas.202602.txt", 2, 8);

        ExperimentacionResponse primera = servicioExperimentacion.ejecutar(parametros);
        ExperimentacionResponse segunda = servicioExperimentacion.ejecutar(parametros);

        for (int i = 0; i < primera.ejecuciones().size(); i++) {
            ExperimentacionResponse.MetricasDto unas = primera.ejecuciones().get(i).metricas();
            ExperimentacionResponse.MetricasDto otras = segunda.ejecuciones().get(i).metricas();
            assertEquals(unas.costoOperativoTotal(), otras.costoOperativoTotal(), 1e-9,
                    "el algoritmo " + primera.ejecuciones().get(i).algoritmo() + " no es reproducible");
            assertEquals(unas.pedidosAtendidos(), otras.pedidosAtendidos());
        }
    }

    @Test
    @DisplayName("Una averia dentro del turno deja a la unidad sin carga y la reasigna a las operativas")
    void laAveriaReasignaLaCargaCritica() {
        String archivo = "ventas.202602.txt";
        int dia = 3;
        int minutoDelTurno = (dia - 1) * 1440 + 60;

        ExperimentacionResponse sinAverias = servicioExperimentacion.ejecutar(
                new ParametrosEjecucion(archivo, dia, 0, 24, 120, "AMBOS", 20260917L, null, null, null, List.of()));
        ExperimentacionResponse conAverias = servicioExperimentacion.ejecutar(
                new ParametrosEjecucion(archivo, dia, 0, 24, 120, "AMBOS", 20260917L, null, null, null,
                        List.of(new ParametrosEjecucion.AveriaSolicitada("TA01", "TIPO_2", minutoDelTurno))));

        assertTrue(unidadesConCarga(sinAverias, 0).contains("TA01"),
                "sin averías, TA01 debería salir con carga y hacer comparable la prueba");

        for (int i = 0; i < conAverias.ejecuciones().size(); i++) {
            ExperimentacionResponse.EjecucionDto ejecucion = conAverias.ejecuciones().get(i);
            assertFalse(unidadesConCarga(conAverias, i).contains("TA01"),
                    ejecucion.algoritmo() + " no debe dejar carga en una unidad averiada");
            assertEquals(ejecucion.metricas().pedidosDelTurno(), ejecucion.metricas().pedidosAtendidos(),
                    ejecucion.algoritmo() + " debe reubicar toda la carga de la unidad averiada");
            assertEquals(0, ejecucion.metricas().entregasFueraDePlazo(),
                    ejecucion.algoritmo() + " debe respetar los plazos tras reasignar la carga");
        }
    }

    @Test
    @DisplayName("La simulacion de 5 dias resuelve los turnos continuos para ambos algoritmos")
    void simulacionCincoDiasEjecutaCorrectamente() {
        ParametrosCincoDias parametros = new ParametrosCincoDias(
                "ventas.202601.txt", 1, 7, 30, "AMBOS", 20260917L, null, null, null, List.of());

        ExperimentacionResponse respuesta = servicioExperimentacion.ejecutarCincoDias(parametros);

        assertNotNull(respuesta);
        assertEquals(parametros.minutoInicio(), respuesta.escenario().minutoInicio());
        assertEquals(parametros.minutoFin(), respuesta.escenario().minutoFin());
        assertTrue(respuesta.escenario().pedidosDelTurno() > 0);
        assertEquals(2, respuesta.ejecuciones().size());

        for (ExperimentacionResponse.EjecucionDto ejecucion : respuesta.ejecuciones()) {
            assertTrue(ejecucion.metricas().pedidosAtendidos() > 0);
            assertFalse(ejecucion.rutas().isEmpty());
            assertTrue(ejecucion.metricas().costoOperativoTotal() > 0);
        }
    }

    @Test
    @DisplayName("La simulacion hasta el colapso detecta y reporta la fecha y motivo del colapso")
    void simulacionHastaColapsoEjecutaCorrectamente() {
        ParametrosColapso parametros = new ParametrosColapso(
                "ventas.202601.txt", 1, 7, 20, "IACO", 20260917L, null, null, null, List.of());

        ExperimentacionResponse respuesta = servicioExperimentacion.ejecutarColapso(parametros);

        assertNotNull(respuesta);
        assertNotNull(respuesta.escenario());
        assertEquals(1, respuesta.ejecuciones().size());

        ExperimentacionResponse.EjecucionDto ejecucion = respuesta.ejecuciones().get(0);
        assertNotNull(ejecucion.colapsoOcurrido());
        if (Boolean.TRUE.equals(ejecucion.colapsoOcurrido())) {
            assertNotNull(ejecucion.minutoColapso());
            assertNotNull(ejecucion.fechaHoraColapso());
            assertNotNull(ejecucion.motivoColapso());
            assertTrue(ejecucion.fechaHoraColapso().contains("Día"));
            assertTrue(ejecucion.motivoColapso().length() > 10);
        }
    }

    @Test
    @DisplayName("Ninguna entrega ocurre antes del registro del pedido ni una unidad recorre dos rutas a la vez")
    void ningunaEntregaAntesDelRegistro() {
        ExperimentacionResponse unTurno = servicioExperimentacion.ejecutar(parametrosDePrueba("ventas.202601.txt", 1, 12));
        ExperimentacionResponse cincoDias = servicioExperimentacion.ejecutarCincoDias(new ParametrosCincoDias(
                "ventas.202601.txt", 1, 7, 60, "AMBOS", 20260917L, null, null, null, List.of()));

        for (ExperimentacionResponse respuesta : List.of(unTurno, cincoDias)) {
            for (ExperimentacionResponse.EjecucionDto ejecucion : respuesta.ejecuciones()) {
                assertTrue(ejecucion.metricas().pedidosAtendidos() > 0, ejecucion.algoritmo() + " debe atender pedidos");
                ejecucion.rutas().forEach(ruta -> ruta.paradas().forEach(parada -> {
                    assertTrue(parada.minutoLlegada() >= parada.minutoRegistro(),
                            ejecucion.algoritmo() + ": " + parada.codigoPedido() + " llega antes de registrarse");
                    assertTrue(ruta.minutoSalida() >= parada.minutoRegistro(),
                            ejecucion.algoritmo() + ": " + ruta.codigoUnidad() + " sale sin tener " + parada.codigoPedido());
                }));

                Map<String, List<ExperimentacionResponse.RutaDto>> rutasPorUnidad = ejecucion.rutas().stream()
                        .collect(Collectors.groupingBy(ExperimentacionResponse.RutaDto::codigoUnidad));
                rutasPorUnidad.forEach((unidad, rutas) -> {
                    List<ExperimentacionResponse.RutaDto> ordenadas = rutas.stream()
                            .sorted(Comparator.comparingInt(ExperimentacionResponse.RutaDto::minutoSalida))
                            .toList();
                    for (int i = 1; i < ordenadas.size(); i++) {
                        assertTrue(ordenadas.get(i).minutoSalida() >= ordenadas.get(i - 1).minutoFin(),
                                ejecucion.algoritmo() + ": " + unidad + " sale antes de volver de su ruta anterior");
                    }
                });
            }
        }
    }

    private static List<String> unidadesConCarga(ExperimentacionResponse respuesta, int indiceEjecucion) {
        return respuesta.ejecuciones().get(indiceEjecucion).rutas().stream()
                .map(ExperimentacionResponse.RutaDto::codigoUnidad)
                .toList();
    }

    private void verificarEjecucion(ExperimentacionResponse.EjecucionDto ejecucion) {
        String algoritmo = ejecucion.algoritmo();
        ExperimentacionResponse.MetricasDto metricas = ejecucion.metricas();

        assertEquals(0, metricas.entregasFueraDePlazo(),
                algoritmo + " no debe planificar entregas fuera del plazo comprometido");
        assertEquals(metricas.pedidosDelTurno(), metricas.pedidosAtendidos() + metricas.pedidosSinAtender(),
                algoritmo + " debe dar cuenta de todos los pedidos del turno");
        assertTrue(metricas.costoOperativoTotal() > 0, algoritmo + " debe reportar un costo operativo");
        assertFalse(ejecucion.rutas().isEmpty(), algoritmo + " debe producir al menos una ruta con carga");

        ejecucion.rutas().forEach(ruta -> {
            assertTrue(ruta.cargaTotal() <= ruta.capacidad(),
                    algoritmo + ": la unidad " + ruta.codigoUnidad() + " excede su capacidad");
            assertEquals(ruta.recorrido().size(), ruta.minutosPorNodo().size(),
                    algoritmo + ": el recorrido necesita un minuto por nodo");
            assertFalse(ruta.paradas().isEmpty());

            // El recorrido avanza en el tiempo: el visualizador interpola entre nodos.
            for (int i = 1; i < ruta.minutosPorNodo().size(); i++) {
                assertTrue(ruta.minutosPorNodo().get(i) >= ruta.minutosPorNodo().get(i - 1),
                        algoritmo + ": los minutos del recorrido deben ser crecientes");
            }
            // Cada parada cae sobre un nodo del recorrido.
            ruta.paradas().forEach(parada -> {
                boolean visitado = ruta.recorrido().stream()
                        .anyMatch(nodo -> nodo[0] == parada.posX() && nodo[1] == parada.posY());
                assertTrue(visitado,
                        algoritmo + ": la parada " + parada.codigoPedido() + " no aparece en el recorrido");
                assertTrue(parada.cumplePlazo());
            });
        });
    }
}
