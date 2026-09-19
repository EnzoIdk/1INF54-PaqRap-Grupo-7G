package pe.edu.pucp.paqrap.model;

import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.enums.TipoAveria;

/**
 * Averia sufrida por una unidad de transporte: indisponibilidad temporal
 * cuya duracion depende del tipo (STD 4.4.3). Una unidad averiada no bloquea
 * la via, de modo que las demas unidades siguen circulando por ese tramo.
 *
 * <ul>
 *   <li>Tipo 1 o menor: indisponibilidad de 2 horas.</li>
 *   <li>Tipo 2 o intermedia: hasta el final del siguiente turno, con un
 *       maximo de 4 horas.</li>
 *   <li>Tipo 3 o mayor: al menos 2 dias, con retorno en el turno de las
 *       15:00 a las 23:00.</li>
 * </ul>
 */
public class Averia {

    private static final int MINUTOS_TIPO_1 = 2 * ConstantesPaqrap.MINUTOS_POR_HORA;
    private static final int MAXIMO_MINUTOS_TIPO_2 = 4 * ConstantesPaqrap.MINUTOS_POR_HORA;
    private static final int MINUTOS_MINIMOS_TIPO_3 = 2 * ConstantesPaqrap.MINUTOS_POR_DIA;
    private static final int MINUTO_TURNO_TARDE = 15 * ConstantesPaqrap.MINUTOS_POR_HORA;

    private final UnidadTransporte unidadTransporte;
    private final TipoAveria tipo;
    private final int minutoSimulacion;
    private boolean aplicada;

    public Averia(UnidadTransporte unidadTransporte, TipoAveria tipo, int minutoSimulacion) {
        this.unidadTransporte = unidadTransporte;
        this.tipo = tipo;
        this.minutoSimulacion = minutoSimulacion;
    }

    /** Minuto de simulacion en que la unidad vuelve a estar operativa. */
    public int calcularMinutoDisponibilidad() {
        return switch (tipo) {
            case TIPO_1 -> minutoSimulacion + MINUTOS_TIPO_1;
            case TIPO_2 -> Math.min(finDelSiguienteTurno(minutoSimulacion),
                    minutoSimulacion + MAXIMO_MINUTOS_TIPO_2);
            case TIPO_3 -> inicioDelTurnoTarde(minutoSimulacion + MINUTOS_MINIMOS_TIPO_3);
        };
    }

    private static int finDelSiguienteTurno(int minutoOcurrencia) {
        int minutoDelDia = minutoOcurrencia % ConstantesPaqrap.MINUTOS_POR_DIA;
        int inicioDelDia = minutoOcurrencia - minutoDelDia;
        for (int horaCambio : ConstantesPaqrap.HORAS_CAMBIO_TURNO) {
            int minutoCambio = horaCambio * ConstantesPaqrap.MINUTOS_POR_HORA;
            if (minutoCambio > minutoDelDia) {
                return inicioDelDia + minutoCambio;
            }
        }
        // Despues del ultimo cambio de turno del dia, el siguiente es el de las 07:00.
        return inicioDelDia + ConstantesPaqrap.MINUTOS_POR_DIA
                + ConstantesPaqrap.HORAS_CAMBIO_TURNO[0] * ConstantesPaqrap.MINUTOS_POR_HORA;
    }

    private static int inicioDelTurnoTarde(int minutoMinimo) {
        int minutoDelDia = minutoMinimo % ConstantesPaqrap.MINUTOS_POR_DIA;
        int inicioDelDia = minutoMinimo - minutoDelDia;
        return minutoDelDia <= MINUTO_TURNO_TARDE
                ? inicioDelDia + MINUTO_TURNO_TARDE
                : inicioDelDia + ConstantesPaqrap.MINUTOS_POR_DIA + MINUTO_TURNO_TARDE;
    }

    public UnidadTransporte getUnidadTransporte() {
        return unidadTransporte;
    }

    public TipoAveria getTipo() {
        return tipo;
    }

    public int getMinutoSimulacion() {
        return minutoSimulacion;
    }

    public boolean isAplicada() {
        return aplicada;
    }

    public void marcarAplicada() {
        this.aplicada = true;
    }
}
