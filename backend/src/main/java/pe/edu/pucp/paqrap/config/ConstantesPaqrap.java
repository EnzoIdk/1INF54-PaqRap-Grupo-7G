package pe.edu.pucp.paqrap.config;

/**
 * Valores fijos del caso PaqRap que el enunciado no declara configurables
 * (STD 2.3). Los valores que si son configurables (velocidades, capacidades,
 * parametros de los algoritmos, umbrales de semaforo) se leen desde
 * {@code application.yml} mediante las clases {@code Parametros*}.
 */
public final class ConstantesPaqrap {

    public static final int ANCHO_RETICULA_KM = 70;
    public static final int ALTO_RETICULA_KM = 50;
    public static final int LONGITUD_TRAMO_KM = 1;

    public static final int[] PLAZOS_HORAS_VALIDOS = {4, 8, 12, 18, 36};

    public static final int CANTIDAD_PRODUCTO_MINIMA = 1;
    public static final int CANTIDAD_PRODUCTO_MAXIMA = 10;

    public static final int STOCK_ALMACEN_INTERMEDIO_MINIMO = 0;
    public static final int STOCK_ALMACEN_INTERMEDIO_MAXIMO = 1000;

    public static final int MINUTOS_POR_HORA = 60;
    public static final int MINUTOS_POR_DIA = 1440;

    /**
     * Tiempo de entrega al destinatario. Ocupa el reloj de la unidad, pero no
     * se contabiliza dentro del plazo comprometido con el cliente.
     */
    public static final int MINUTOS_ENTREGA_DESTINATARIO = 60;

    /** Los cambios de turno se realizan a las 07:00, 15:00 y 23:00. */
    public static final int MINUTOS_DURACION_TURNO = 8 * MINUTOS_POR_HORA;

    /** Hora de alimentacion obligatoria dentro de la jornada. */
    public static final int MINUTOS_PAUSA_ALIMENTACION = MINUTOS_POR_HORA;

    /** Horas de inicio de cada turno, medidas dentro del dia. */
    public static final int[] HORAS_CAMBIO_TURNO = {7, 15, 23};

    /**
     * Kilometros adicionales que impone cada tramo bloqueado: la unidad que
     * llega a un nodo bloqueado no puede atravesarlo y debe retornar por el
     * mismo tramo por el que llego.
     */
    public static final double KM_DESVIO_POR_TRAMO_BLOQUEADO = 2.0;

    /** Los almacenes intermedios se recargan cada 24 horas, a las 23:59:59. */
    public static final int MINUTO_RECARGA_ALMACEN_INTERMEDIO = 23 * MINUTOS_POR_HORA + 59;

    private ConstantesPaqrap() {
    }
}
