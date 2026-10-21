package pe.edu.pucp.paqrap.experimentacion;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;

/**
 * Parametros con los que el visualizador lanza la simulacion continua
 * hasta alcanzar el colapso logistico.
 *
 * <p>La simulacion arranca en el dia y hora seleccionados y se ejecuta
 * turno a turno (8 horas cada uno) de forma continua. Se detiene unicamente
 * cuando el sistema o la flota ya no son capaces de asegurar que los pedidos
 * lleguen dentro del plazo comprometido (maximo 36 h para regulares, o
 * 4, 8, 12 o 18 h para entregas priorizadas).</p>
 *
 * @param archivoVentas archivo de ventas del mes (ventas.aaaamm.txt)
 * @param diaInicio dia del mes en que arranca la simulacion (1 a 31)
 * @param horaInicio hora de inicio del primer turno (0 a 23, por defecto 7)
 * @param maximoPedidosPorTurno tope de pedidos por turno (por defecto 60)
 * @param algoritmo IACO, AGAESTW o AMBOS
 * @param semilla semilla de la aleatoriedad; nula para usar la configurada
 * @param cantidadAutos autos de la flota; nulo para usar la configurada
 * @param cantidadMotos motos de la flota; nulo para usar la configurada
 * @param cantidadBicicletas bicicletas de la flota; nulo para usar la configurada
 * @param averias averias programadas a lo largo de la simulacion
 */
public record ParametrosColapso(
        @NotBlank String archivoVentas,
        @Min(1) @Max(31) int diaInicio,
        @Min(0) @Max(23) Integer horaInicio,
        @Min(1) @Max(400) Integer maximoPedidosPorTurno,
        String algoritmo,
        Long semilla,
        @Min(0) @Max(60) Integer cantidadAutos,
        @Min(0) @Max(60) Integer cantidadMotos,
        @Min(0) @Max(60) Integer cantidadBicicletas,
        List<ParametrosCincoDias.AveriaSolicitada5D> averias) {

    public int horaInicioEfectiva() {
        return horaInicio != null ? horaInicio : 7;
    }

    public int maximoPedidosPorTurnoEfectivo() {
        return maximoPedidosPorTurno != null ? maximoPedidosPorTurno : 60;
    }

    public int minutoInicio() {
        return (diaInicio - 1) * ConstantesPaqrap.MINUTOS_POR_DIA
                + horaInicioEfectiva() * ConstantesPaqrap.MINUTOS_POR_HORA;
    }

    public String algoritmoSolicitado() {
        return algoritmo == null || algoritmo.isBlank() ? "AMBOS" : algoritmo.toUpperCase();
    }

    public List<ParametrosCincoDias.AveriaSolicitada5D> averiasSeguras() {
        return averias == null ? List.of() : averias;
    }
}
