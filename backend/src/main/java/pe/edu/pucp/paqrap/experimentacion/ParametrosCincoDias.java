package pe.edu.pucp.paqrap.experimentacion;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;

/**
 * Parametros con los que el visualizador lanza la simulacion de un periodo
 * de 5 dias continuos.
 *
 * <p>El periodo de 5 dias (120 horas) se ejecuta en 15 turnos de 8 horas
 * (07:00, 15:00, 23:00) o a partir de la hora configurada, aplicando
 * mantenimiento diario por paridad de mes y recargas instantaneas a las
 * 23:59:59 cada 24 horas.</p>
 *
 * @param archivoVentas archivo de ventas del mes (ventas.aaaamm.txt)
 * @param diaInicio primer dia del rango de 5 dias (1 a 27)
 * @param horaInicio hora de inicio del turno en el primer dia (0 a 23, por defecto 7)
 * @param maximoPedidosPorTurno tope de pedidos por turno (por defecto 60)
 * @param algoritmo IACO, AGAESTW o AMBOS
 * @param semilla semilla de la aleatoriedad; nula para usar la configurada
 * @param cantidadAutos autos de la flota; nulo para usar la configurada
 * @param cantidadMotos motos de la flota; nulo para usar la configurada
 * @param cantidadBicicletas bicicletas de la flota; nulo para usar la configurada
 * @param averias averias inyectadas dentro de la ventana de 5 dias
 * @param pedidosAdicionales pedidos registrados por el usuario (manual o archivo)
 */
public record ParametrosCincoDias(
        @NotBlank String archivoVentas,
        @Min(1) @Max(27) int diaInicio,
        @Min(0) @Max(23) Integer horaInicio,
        @Min(1) @Max(400) Integer maximoPedidosPorTurno,
        String algoritmo,
        Long semilla,
        @Min(0) @Max(60) Integer cantidadAutos,
        @Min(0) @Max(60) Integer cantidadMotos,
        @Min(0) @Max(60) Integer cantidadBicicletas,
        List<AveriaSolicitada5D> averias,
        @Valid List<PedidoAdicional> pedidosAdicionales) {

    /** Constructor sin pedidos adicionales, compatible con las llamadas previas. */
    public ParametrosCincoDias(String archivoVentas, int diaInicio, Integer horaInicio,
                               Integer maximoPedidosPorTurno, String algoritmo, Long semilla,
                               Integer cantidadAutos, Integer cantidadMotos, Integer cantidadBicicletas,
                               List<AveriaSolicitada5D> averias) {
        this(archivoVentas, diaInicio, horaInicio, maximoPedidosPorTurno, algoritmo, semilla,
                cantidadAutos, cantidadMotos, cantidadBicicletas, averias, List.of());
    }

    public List<PedidoAdicional> pedidosAdicionalesSeguros() {
        return pedidosAdicionales == null ? List.of() : pedidosAdicionales;
    }

    /**
     * Averia inyectada durante los 5 dias de simulacion.
     *
     * @param codigoUnidad codigo TTNN de la unidad
     * @param tipo TIPO_1, TIPO_2 o TIPO_3
     * @param dia dia en que ocurre la averia (calendario)
     * @param hora hora del dia en que ocurre (0 a 23)
     * @param minutoSimulacion minuto absoluto de simulacion (opcional si se especifica dia y hora)
     */
    public record AveriaSolicitada5D(
            String codigoUnidad,
            String tipo,
            Integer dia,
            Integer hora,
            Integer minutoSimulacion) {

        public int calcularMinutoSimulacion() {
            if (minutoSimulacion != null) {
                return minutoSimulacion;
            }
            int d = dia != null ? dia : 1;
            int h = hora != null ? hora : 0;
            return (d - 1) * ConstantesPaqrap.MINUTOS_POR_DIA + h * ConstantesPaqrap.MINUTOS_POR_HORA;
        }
    }

    public int diaFin() {
        return diaInicio + 4;
    }

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

    public int minutoFin() {
        return minutoInicio() + 5 * ConstantesPaqrap.MINUTOS_POR_DIA;
    }

    public String algoritmoSolicitado() {
        return algoritmo == null || algoritmo.isBlank() ? "AMBOS" : algoritmo.toUpperCase();
    }

    public List<AveriaSolicitada5D> averiasSeguras() {
        return averias == null ? List.of() : averias;
    }
}
