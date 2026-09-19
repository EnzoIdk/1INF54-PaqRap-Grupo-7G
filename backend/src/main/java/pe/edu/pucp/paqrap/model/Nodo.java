package pe.edu.pucp.paqrap.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Esquina del mapa reticulado: par de coordenadas enteras (x, y). El origen
 * (0,0) se ubica en la esquina inferior izquierda del mapa (STD 2.2, 5.6).
 */
@Embeddable
public class Nodo {

    @Column(name = "pos_x", nullable = false)
    private int x;

    @Column(name = "pos_y", nullable = false)
    private int y;

    protected Nodo() {
    }

    public Nodo(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    /**
     * Distancia Manhattan entre este nodo y otro, expresada en kilometros,
     * dado que cada tramo de la reticula mide 1 km (STD 3.3.1).
     */
    public int distanciaKmHasta(Nodo otro) {
        return Math.abs(this.x - otro.x) + Math.abs(this.y - otro.y);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof Nodo otro)) {
            return false;
        }
        return this.x == otro.x && this.y == otro.y;
    }

    @Override
    public int hashCode() {
        return 31 * x + y;
    }

    @Override
    public String toString() {
        return "(" + x + ", " + y + ")";
    }
}
