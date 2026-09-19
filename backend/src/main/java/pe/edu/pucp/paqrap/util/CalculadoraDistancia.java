package pe.edu.pucp.paqrap.util;

import pe.edu.pucp.paqrap.model.Nodo;

/**
 * Calcula distancias sobre la reticula de la ciudad. Al no existir
 * diagonales, la distancia entre dos nodos es la distancia Manhattan
 * expresada en kilometros (STD 3.3.1, 4.6.1).
 */
public final class CalculadoraDistancia {

    private CalculadoraDistancia() {
    }

    public static int distanciaKm(Nodo origen, Nodo destino) {
        return origen.distanciaKmHasta(destino);
    }
}
