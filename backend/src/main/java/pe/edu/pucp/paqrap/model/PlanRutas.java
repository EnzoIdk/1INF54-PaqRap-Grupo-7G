package pe.edu.pucp.paqrap.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Resultado de una ejecucion del planificador: el conjunto de rutas
 * asignadas a la flota junto con el costo operativo total, en un minuto de
 * simulacion dado.
 */
public class PlanRutas {

    private final int minutoSimulacion;
    private final List<Ruta> rutas = new ArrayList<>();
    private double costoOperativoTotal;

    public PlanRutas(int minutoSimulacion) {
        this.minutoSimulacion = minutoSimulacion;
    }

    public int getMinutoSimulacion() {
        return minutoSimulacion;
    }

    public List<Ruta> getRutas() {
        return rutas;
    }

    public double getCostoOperativoTotal() {
        return costoOperativoTotal;
    }

    public void setCostoOperativoTotal(double costoOperativoTotal) {
        this.costoOperativoTotal = costoOperativoTotal;
    }
}
