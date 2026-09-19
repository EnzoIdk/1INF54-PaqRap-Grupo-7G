package pe.edu.pucp.paqrap.model;

import pe.edu.pucp.paqrap.config.ConstantesPaqrap;

/**
 * Calle entre dos nodos contiguos: arista de 1 km, siempre de doble sentido
 * (STD 2.2). No se persiste como tabla propia; se reconstruye en memoria a
 * partir de la reticula para uso del planificador.
 */
public class Tramo {

    private final Nodo origen;
    private final Nodo destino;

    public Tramo(Nodo origen, Nodo destino) {
        this.origen = origen;
        this.destino = destino;
    }

    public Nodo getOrigen() {
        return origen;
    }

    public Nodo getDestino() {
        return destino;
    }

    public int getLongitudKm() {
        return ConstantesPaqrap.LONGITUD_TRAMO_KM;
    }
}
