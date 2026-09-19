package pe.edu.pucp.paqrap.planificador.comun;

import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Nodo;

import java.util.HashSet;
import java.util.Set;

/**
 * Representacion del mapa reticulado de la ciudad compartida por ambos
 * algoritmos metaheuristicos (STD 4.6.1). No debe duplicarse en los
 * subpaquetes {@code iaco} ni {@code agaestw}.
 */
public class Grafo {

    private final Set<Nodo> tramosBloqueados = new HashSet<>();

    public void aplicarBloqueosVigentes(Iterable<Bloqueo> bloqueosVigentes) {
        tramosBloqueados.clear();
        for (Bloqueo bloqueo : bloqueosVigentes) {
            bloqueo.getNodos().forEach(nodo -> tramosBloqueados.add(new Nodo(nodo.getX(), nodo.getY())));
        }
    }

    public boolean esNodoTransitable(Nodo nodo) {
        return !tramosBloqueados.contains(nodo)
                && nodo.getX() >= 0 && nodo.getX() <= ConstantesPaqrap.ANCHO_RETICULA_KM
                && nodo.getY() >= 0 && nodo.getY() <= ConstantesPaqrap.ALTO_RETICULA_KM;
    }

    public int distanciaKm(Nodo origen, Nodo destino) {
        return origen.distanciaKmHasta(destino);
    }
}
