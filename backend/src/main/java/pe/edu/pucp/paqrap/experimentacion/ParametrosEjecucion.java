package pe.edu.pucp.paqrap.experimentacion;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

/**
 * Parametros con los que el visualizador lanza una corrida de la
 * experimentacion numerica: que mes se consume, que turno se planifica, con
 * que flota y con que semilla.
 *
 * <p>Los campos opcionales se resuelven en {@link ServicioExperimentacion}
 * con los valores de {@code application.yml}, de modo que el frontend no
 * tenga que conocerlos.</p>
 *
 * @param archivoVentas archivo de ventas del mes, con el patron ventas.aaaamm.txt
 * @param dia dia del mes que se planifica
 * @param horaInicio hora de inicio del turno
 * @param ventanaHoras amplitud en horas de la ventana de pedidos
 * @param maximoPedidos tope de pedidos del turno, para acotar el tiempo de computo
 * @param algoritmo IACO, AGAESTW o AMBOS
 * @param semilla semilla de la aleatoriedad; nula para usar la configurada
 * @param cantidadAutos autos de la flota; nulo para usar la configurada
 * @param cantidadMotos motos de la flota; nulo para usar la configurada
 * @param cantidadBicicletas bicicletas de la flota; nulo para usar la configurada
 * @param averias averias que se inyectan dentro del turno
 * @param pedidosAdicionales pedidos registrados por el usuario (manual o archivo)
 */
public record ParametrosEjecucion(
        @NotBlank String archivoVentas,
        @Min(1) @Max(31) int dia,
        @Min(0) @Max(23) int horaInicio,
        @Min(0) @Max(59) Integer minutoDeInicio,
        @Min(0) @Max(59) Integer segundoDeInicio,
        @Min(1) @Max(24) int ventanaHoras,
        @Min(1) @Max(400) int maximoPedidos,
        String algoritmo,
        Long semilla,
        @Min(0) @Max(1000) Integer cantidadAutos,
        @Min(0) @Max(1000) Integer cantidadMotos,
        @Min(0) @Max(1000) Integer cantidadBicicletas,
        List<AveriaSolicitada> averias,
        @Valid List<PedidoAdicional> pedidosAdicionales,
        List<BloqueoSolicitado> bloqueosAdicionales) {

    /** Constructor sin pedidos ni bloqueos adicionales, compatible con las llamadas previas. */
    public ParametrosEjecucion(String archivoVentas, int dia, int horaInicio, int ventanaHoras,
                               int maximoPedidos, String algoritmo, Long semilla, Integer cantidadAutos,
                               Integer cantidadMotos, Integer cantidadBicicletas, List<AveriaSolicitada> averias) {
        this(archivoVentas, dia, horaInicio, 0, 0, ventanaHoras, maximoPedidos, algoritmo, semilla,
                cantidadAutos, cantidadMotos, cantidadBicicletas, averias, List.of(), List.of());
    }

    /** Constructor sin bloqueos adicionales, compatible con las llamadas previas. */
    public ParametrosEjecucion(String archivoVentas, int dia, int horaInicio, int ventanaHoras,
                               int maximoPedidos, String algoritmo, Long semilla, Integer cantidadAutos,
                               Integer cantidadMotos, Integer cantidadBicicletas, List<AveriaSolicitada> averias,
                               List<PedidoAdicional> pedidosAdicionales) {
        this(archivoVentas, dia, horaInicio, 0, 0, ventanaHoras, maximoPedidos, algoritmo, semilla,
                cantidadAutos, cantidadMotos, cantidadBicicletas, averias, pedidosAdicionales, List.of());
    }

    /** Constructor con bloqueos adicionales y sin minuto/segundo personalizados. */
    public ParametrosEjecucion(String archivoVentas, int dia, int horaInicio, int ventanaHoras,
                               int maximoPedidos, String algoritmo, Long semilla, Integer cantidadAutos,
                               Integer cantidadMotos, Integer cantidadBicicletas, List<AveriaSolicitada> averias,
                               List<PedidoAdicional> pedidosAdicionales, List<BloqueoSolicitado> bloqueosAdicionales) {
        this(archivoVentas, dia, horaInicio, 0, 0, ventanaHoras, maximoPedidos, algoritmo, semilla,
                cantidadAutos, cantidadMotos, cantidadBicicletas, averias, pedidosAdicionales, bloqueosAdicionales);
    }

    public int minutoDeInicioEfectivo() {
        return minutoDeInicio != null ? Math.max(0, Math.min(59, minutoDeInicio)) : 0;
    }

    public int segundoDeInicioEfectivo() {
        return segundoDeInicio != null ? Math.max(0, Math.min(59, segundoDeInicio)) : 0;
    }

    public List<PedidoAdicional> pedidosAdicionalesSeguros() {
        return pedidosAdicionales == null ? List.of() : pedidosAdicionales;
    }

    public List<BloqueoSolicitado> bloqueosAdicionalesSeguros() {
        return bloqueosAdicionales == null ? List.of() : bloqueosAdicionales;
    }

    /**
     * Bloqueo registrado manualmente en el mapa durante la operación.
     *
     * @param inicioMinuto minuto de simulación en que inicia el bloqueo
     * @param finMinuto minuto de simulación en que termina el bloqueo
     * @param nodos secuencia de coordenadas [x, y] del tramo bloqueado
     */
    public record BloqueoSolicitado(int inicioMinuto, int finMinuto, List<List<Integer>> nodos) {
    }

    /**
     * Averia que el supervisor inyecta para observar la reasignacion de la
     * carga critica.
     *
     * @param codigoUnidad codigo TTNN de la unidad afectada
     * @param tipo TIPO_1, TIPO_2 o TIPO_3
     * @param minutoSimulacion minuto de simulacion en que ocurre
     */
    public record AveriaSolicitada(String codigoUnidad, String tipo, int minutoSimulacion) {
    }

    public List<AveriaSolicitada> averiasSeguras() {
        return averias == null ? List.of() : averias;
    }

    public String algoritmoSolicitado() {
        return algoritmo == null || algoritmo.isBlank() ? "AMBOS" : algoritmo.toUpperCase();
    }
}
