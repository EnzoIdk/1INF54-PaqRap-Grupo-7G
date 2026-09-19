package pe.edu.pucp.paqrap.model;

import pe.edu.pucp.paqrap.enums.TipoAveria;

/**
 * Averia sufrida por una unidad de transporte durante un turno, con el
 * minuto de simulacion en que ocurrio.
 */
public class Averia {

    private final UnidadTransporte unidadTransporte;
    private final TipoAveria tipo;
    private final int minutoSimulacion;

    public Averia(UnidadTransporte unidadTransporte, TipoAveria tipo, int minutoSimulacion) {
        this.unidadTransporte = unidadTransporte;
        this.tipo = tipo;
        this.minutoSimulacion = minutoSimulacion;
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
}
