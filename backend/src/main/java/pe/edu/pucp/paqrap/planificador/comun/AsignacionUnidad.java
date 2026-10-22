package pe.edu.pucp.paqrap.planificador.comun;

import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Decision que toma una metaheuristica: que unidad sale de que almacen y en
 * que orden atiende sus pedidos. Es el lenguaje comun entre los dos
 * algoritmos y {@link EnsambladorPlan}, que se encarga de traducirla a un
 * plan con tiempos y recorridos.
 *
 * <p>Tambien recuerda que pedidos llegaron a ella por la reasignacion de la
 * carga de una unidad averiada, para que el visualizador pueda resaltarlos
 * (RF-43, RF-68). La marca no interviene en ninguna decision del algoritmo.</p>
 */
public class AsignacionUnidad {

    private final UnidadTransporte unidad;
    private final Almacen almacenOrigen;
    private final List<Pedido> pedidos;
    private final Set<Pedido> reasignados;

    public AsignacionUnidad(UnidadTransporte unidad, Almacen almacenOrigen) {
        this(unidad, almacenOrigen, new ArrayList<>());
    }

    public AsignacionUnidad(UnidadTransporte unidad, Almacen almacenOrigen, List<Pedido> pedidos) {
        this(unidad, almacenOrigen, pedidos, Set.of());
    }

    private AsignacionUnidad(UnidadTransporte unidad, Almacen almacenOrigen,
                             List<Pedido> pedidos, Set<Pedido> reasignados) {
        this.unidad = unidad;
        this.almacenOrigen = almacenOrigen;
        this.pedidos = new ArrayList<>(pedidos);
        this.reasignados = new HashSet<>(reasignados);
    }

    public AsignacionUnidad copiar() {
        return new AsignacionUnidad(unidad, almacenOrigen, pedidos, reasignados);
    }

    public void agregar(Pedido pedido) {
        pedidos.add(pedido);
    }

    /** Agrega un pedido que proviene de una unidad averiada. */
    public void agregarReasignado(Pedido pedido) {
        pedidos.add(pedido);
        reasignados.add(pedido);
    }

    /** Agrega un pedido tomado de otra asignacion conservando su marca de reasignado. */
    public void agregarDesde(AsignacionUnidad origen, Pedido pedido) {
        pedidos.add(pedido);
        if (origen.esReasignado(pedido)) {
            reasignados.add(pedido);
        }
    }

    public void insertar(int posicion, Pedido pedido) {
        pedidos.add(posicion, pedido);
    }

    public void vaciar() {
        pedidos.clear();
        reasignados.clear();
    }

    public boolean esReasignado(Pedido pedido) {
        return reasignados.contains(pedido);
    }

    public Set<Pedido> getReasignados() {
        return reasignados;
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
