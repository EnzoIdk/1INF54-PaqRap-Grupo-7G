package pe.edu.pucp.paqrap.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

/**
 * Calle cerrada por la municipalidad durante un periodo de vigencia,
 * definida por la secuencia de nodos del poligono abierto que afecta
 * (STD 2.2, 4.7.1).
 */
@Entity
@Table(name = "bloqueo")
public class Bloqueo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bloqueo_id")
    private Long id;

    @Column(name = "inicio_minuto", nullable = false)
    private int inicioMinuto;

    @Column(name = "fin_minuto", nullable = false)
    private int finMinuto;

    @ElementCollection
    @CollectionTable(name = "bloqueo_nodo", joinColumns = @JoinColumn(name = "bloqueo_id"))
    @OrderColumn(name = "orden")
    private List<NodoBloqueo> nodos = new ArrayList<>();

    protected Bloqueo() {
    }

    public Bloqueo(int inicioMinuto, int finMinuto, List<Nodo> secuenciaNodos) {
        this.inicioMinuto = inicioMinuto;
        this.finMinuto = finMinuto;
        secuenciaNodos.forEach(nodo -> this.nodos.add(new NodoBloqueo(nodo.getX(), nodo.getY())));
    }

    public boolean estaVigenteEn(int minutoSimulacion) {
        return minutoSimulacion >= inicioMinuto && minutoSimulacion < finMinuto;
    }

    public Long getId() {
        return id;
    }

    public int getInicioMinuto() {
        return inicioMinuto;
    }

    public int getFinMinuto() {
        return finMinuto;
    }

    public List<NodoBloqueo> getNodos() {
        return nodos;
    }

    /**
     * Version embebible de {@link Nodo}, usada solo para persistir la
     * secuencia de nodos de un bloqueo como coleccion de elementos.
     */
    @Embeddable
    public static class NodoBloqueo {

        @Column(name = "pos_x", nullable = false)
        private int x;

        @Column(name = "pos_y", nullable = false)
        private int y;

        protected NodoBloqueo() {
        }

        public NodoBloqueo(int x, int y) {
            this.x = x;
            this.y = y;
        }

        public int getX() {
            return x;
        }

        public int getY() {
            return y;
        }
    }
}
