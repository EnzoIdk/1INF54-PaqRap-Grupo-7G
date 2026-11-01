package pe.edu.pucp.paqrap.experimentacion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.dto.ExperimentacionResponse;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Simulaciones planificadas recientemente, compartidas entre navegadores
 * (rubrica C05, C06, G06): un planificador resuelve el periodo una sola vez
 * y cualquier otro visualizador, desde otro dispositivo y en otro momento,
 * puede abrir ese mismo plan y reproducirlo con su propio reloj, filtros y
 * selecciones, sin afectar a los demas.
 *
 * <p>Se guardan en memoria las ultimas corridas (el plan completo pesa
 * algunos MB en 5D); al reiniciar el backend la lista empieza vacia.
 */
@Component
public class RegistroSimulaciones {

    private final int maximo;
    private final Deque<SimulacionCompartida> simulaciones = new ArrayDeque<>();

    public RegistroSimulaciones(@Value("${paqrap.concurrencia.simulaciones-compartidas:6}") int maximo) {
        this.maximo = Math.max(1, maximo);
    }

    /** Guarda el plan y devuelve el identificador con el que otros navegadores lo abren. */
    public synchronized String registrar(String modo, String autor, ExperimentacionResponse resultado) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        simulaciones.addFirst(new SimulacionCompartida(id, modo, autor, Instant.now(), resultado));
        while (simulaciones.size() > maximo) {
            simulaciones.removeLast();
        }
        return id;
    }

    public synchronized List<ResumenSimulacion> listar() {
        return simulaciones.stream().map(ResumenSimulacion::desde).toList();
    }

    public synchronized Optional<SimulacionCompartida> obtener(String id) {
        return simulaciones.stream().filter(simulacion -> simulacion.id().equals(id)).findFirst();
    }

    public record SimulacionCompartida(
            String id, String modo, String autor, Instant creada, ExperimentacionResponse resultado) {
    }

    /**
     * Lo que la Consola muestra de cada simulacion compartida, sin el plan completo.
     *
     * @param modo 1D, 5D, COLAPSO o DIA_A_DIA
     * @param mejorCosto costo operativo del mejor algoritmo de la corrida
     */
    public record ResumenSimulacion(
            String id, String modo, String autor, Instant creada,
            String archivoVentas, int anio, int mes, int dia, int minutoInicio, int minutoFin, int pedidos,
            List<String> algoritmos, double mejorCosto, boolean colapso) {

        static ResumenSimulacion desde(SimulacionCompartida simulacion) {
            ExperimentacionResponse.EscenarioDto escenario = simulacion.resultado().escenario();
            List<ExperimentacionResponse.EjecucionDto> ejecuciones = simulacion.resultado().ejecuciones();
            double mejorCosto = ejecuciones.stream()
                    .map(ejecucion -> ejecucion.metricas().costoOperativoTotal())
                    .min(Comparator.naturalOrder())
                    .orElse(0.0);
            boolean colapso = Boolean.TRUE.equals(escenario.colapsoOcurrido())
                    || ejecuciones.stream().anyMatch(ejecucion -> Boolean.TRUE.equals(ejecucion.colapsoOcurrido()));
            return new ResumenSimulacion(
                    simulacion.id(), simulacion.modo(), simulacion.autor(), simulacion.creada(),
                    escenario.archivoVentas(), escenario.anio(), escenario.mes(), escenario.dia(),
                    escenario.minutoInicio(), escenario.minutoFin(),
                    escenario.pedidosDelTurno(),
                    ejecuciones.stream().map(ExperimentacionResponse.EjecucionDto::algoritmo).toList(),
                    mejorCosto, colapso);
        }
    }
}
