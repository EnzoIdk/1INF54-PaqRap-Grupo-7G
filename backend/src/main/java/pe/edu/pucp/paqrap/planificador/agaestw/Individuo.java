package pe.edu.pucp.paqrap.planificador.agaestw;

import pe.edu.pucp.paqrap.model.UnidadTransporte;
import pe.edu.pucp.paqrap.planificador.comun.AsignacionUnidad;

import java.util.ArrayList;
import java.util.List;

/**
 * Cromosoma del AGA-ES-TW: el conjunto completo de rutas asignadas a la
 * flota en un turno, junto con el valor de aptitud que la poblacion usa para
 * seleccionarlo (STD 4.6.2).
 */
class Individuo {

    private List<AsignacionUnidad> asignaciones = new ArrayList<>();
    private double costoPenalizado;
    private double fitness;

    void agregar(AsignacionUnidad asignacion) {
        asignaciones.add(asignacion);
    }

    AsignacionUnidad buscarPorUnidad(UnidadTransporte unidad) {
        for (AsignacionUnidad asignacion : asignaciones) {
            if (asignacion.getUnidad() == unidad) {
                return asignacion;
            }
        }
        return null;
    }

    Individuo copiar() {
        Individuo copia = new Individuo();
        List<AsignacionUnidad> copiaAsignaciones = new ArrayList<>(asignaciones.size());
        asignaciones.forEach(asignacion -> copiaAsignaciones.add(asignacion.copiar()));
        copia.asignaciones = copiaAsignaciones;
        copia.costoPenalizado = costoPenalizado;
        copia.fitness = fitness;
        return copia;
    }

    List<AsignacionUnidad> getAsignaciones() {
        return asignaciones;
    }

    double getCostoPenalizado() {
        return costoPenalizado;
    }

    void setCostoPenalizado(double costoPenalizado) {
        this.costoPenalizado = costoPenalizado;
    }

    double getFitness() {
        return fitness;
    }

    void setFitness(double fitness) {
        this.fitness = fitness;
    }
}
