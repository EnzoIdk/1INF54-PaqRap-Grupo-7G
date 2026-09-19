package pe.edu.pucp.paqrap.experimentacion;

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
 */
public record ParametrosEjecucion(
        @NotBlank String archivoVentas,
        @Min(1) @Max(31) int dia,
        @Min(0) @Max(23) int horaInicio,
        @Min(1) @Max(24) int ventanaHoras,
        @Min(1) @Max(400) int maximoPedidos,
        String algoritmo,
        Long semilla,
        @Min(0) @Max(60) Integer cantidadAutos,
        @Min(0) @Max(60) Integer cantidadMotos,
        @Min(0) @Max(60) Integer cantidadBicicletas,
        List<AveriaSolicitada> averias) {

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
