package pe.edu.pucp.paqrap.model;

/**
 * Periodo de trabajo asignado a una unidad de transporte, delimitado por el
 * minuto de simulacion de inicio y de fin.
 */
public class Turno {

    private final UnidadTransporte unidadTransporte;
    private final int inicioMinuto;
    private final int finMinuto;

    public Turno(UnidadTransporte unidadTransporte, int inicioMinuto, int finMinuto) {
        this.unidadTransporte = unidadTransporte;
        this.inicioMinuto = inicioMinuto;
        this.finMinuto = finMinuto;
    }

    public UnidadTransporte getUnidadTransporte() {
        return unidadTransporte;
    }

    public int getInicioMinuto() {
        return inicioMinuto;
    }

    public int getFinMinuto() {
        return finMinuto;
    }
}
