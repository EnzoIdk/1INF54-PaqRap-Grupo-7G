package pe.edu.pucp.paqrap.planificador.comun;

import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

import java.util.ArrayList;
import java.util.List;

/**
 * Decision que toma una metaheuristica: que unidad sale de que almacen y en
 * que orden atiende sus pedidos. Es el lenguaje comun entre los dos
 * algoritmos y {@link EnsambladorPlan}, que se encarga de traducirla a un
 * plan con tiempos y recorridos.
 */
public class AsignacionUnidad {

    private final UnidadTransporte unidad;
    private final Almacen almacenOrigen;
    private final List<Pedido> pedidos;

    public AsignacionUnidad(UnidadTransporte unidad, Almacen almacenOrigen) {
        this(unidad, almacenOrigen, new ArrayList<>());
    }

    public AsignacionUnidad(UnidadTransporte unidad, Almacen almacenOrigen, List<Pedido> pedidos) {
        this.unidad = unidad;
        this.almacenOrigen = almacenOrigen;
        this.pedidos = new ArrayList<>(pedidos);
    }

    public AsignacionUnidad copiar() {
        return new AsignacionUnidad(unidad, almacenOrigen, pedidos);
    }

    public void agregar(Pedido pedido) {
        pedidos.add(pedido);
    }

    public void insertar(int posicion, Pedido pedido) {
        pedidos.add(posicion, pedido);
    }

    public void vaciar() {
        pedidos.clear();
    }

    public UnidadTransporte getUnidad() {
        return unidad;
    }

    public Almacen getAlmacenOrigen() {
        return almacenOrigen;
    }

    public List<Pedido> getPedidos() {
        return pedidos;
    }

    public boolean estaVacia() {
        return pedidos.isEmpty();
    }

    public int getCarga() {
        return pedidos.stream().mapToInt(Pedido::getCantidadProducto).sum();
    }
}
