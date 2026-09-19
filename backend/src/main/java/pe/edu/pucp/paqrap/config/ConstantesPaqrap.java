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

    private ConstantesPaqrap() {
    }
}
