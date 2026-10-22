package pe.edu.pucp.paqrap.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Secuencia ordenada de paradas que una unidad de transporte atiende en un
 * turno, partiendo del almacen donde se abastecio.
 *
 * <p>Distingue dos niveles de detalle: las {@link ParadaRuta}, que son los
 * destinos de los pedidos asignados, y la {@code secuenciaNodos}, que es la
 * polilinea nodo a nodo sobre la reticula que el visualizador recorre para
 * animar el desplazamiento de la unidad.</p>
 */
public class Ruta {

    private final UnidadTransporte unidadTransporte;
    private final Almacen almacenOrigen;
    private Almacen almacenDestino;
    private final int minutoSalidaAlmacen;
    private int minutoInicioRetorno;
    private int minutoLlegadaAlmacen;
    private final List<ParadaRuta> paradas = new ArrayList<>();
    private final List<Nodo> secuenciaNodos = new ArrayList<>();
    private final List<Integer> minutosPorNodo = new ArrayList<>();
    private double distanciaKm;

    public Ruta(UnidadTransporte unidadTransporte, Almacen almacenOrigen, int minutoSalidaAlmacen) {
        this.unidadTransporte = unidadTransporte;
        this.almacenOrigen = almacenOrigen;
        this.almacenDestino = almacenOrigen;
        this.minutoSalidaAlmacen = minutoSalidaAlmacen;
        this.minutoInicioRetorno = minutoSalidaAlmacen;
        this.minutoLlegadaAlmacen = minutoSalidaAlmacen;
    }

    public void agregarParada(ParadaRuta parada) {
        paradas.add(parada);
        distanciaKm += parada.getDistanciaKmDesdeAnterior();
        this.minutoInicioRetorno = parada.getMinutoSalida();
    }

    public void definirRetorno(Almacen almacenDestino, double distanciaRetornoKm, int minutoInicioRetorno, int minutoLlegadaAlmacen) {
        this.almacenDestino = almacenDestino;
        this.distanciaKm += distanciaRetornoKm;
        this.minutoInicioRetorno = minutoInicioRetorno;
        this.minutoLlegadaAlmacen = minutoLlegadaAlmacen;
    }

    /**
     * Fija el recorrido de la unidad: la polilinea nodo a nodo y el minuto de
     * simulacion en que la unidad pasa por cada uno de esos nodos. Ambas
     * listas tienen el mismo tamano, de modo que el visualizador puede
     * interpolar la posicion de la unidad en cualquier instante.
     */
    public void definirRecorrido(List<Nodo> nodos, List<Integer> minutos) {
        if (nodos.size() != minutos.size()) {
            throw new IllegalArgumentException(
                    "El recorrido necesita un minuto por nodo: " + nodos.size() + " nodos y " + minutos.size() + " minutos");
        }
        secuenciaNodos.clear();
        secuenciaNodos.addAll(nodos);
        minutosPorNodo.clear();
        minutosPorNodo.addAll(minutos);
    }

    public UnidadTransporte getUnidadTransporte() {
        return unidadTransporte;
    }

    public Almacen getAlmacenOrigen() {
        return almacenOrigen;
    }

    public Almacen getAlmacenDestino() {
        return almacenDestino != null ? almacenDestino : almacenOrigen;
    }

    public int getMinutoInicioRetorno() {
        return minutoInicioRetorno;
    }

    public int getMinutoLlegadaAlmacen() {
        return minutoLlegadaAlmacen;
    }

    public List<ParadaRuta> getParadas() {
        return Collections.unmodifiableList(paradas);
    }

    public List<Nodo> getSecuenciaNodos() {
        return Collections.unmodifiableList(secuenciaNodos);
    }

    /** Minuto de simulacion en que la unidad alcanza cada nodo del recorrido. */
    public List<Integer> getMinutosPorNodo() {
        return Collections.unmodifiableList(minutosPorNodo);
    }

    public List<Pedido> getPedidosAsignados() {
        return paradas.stream().map(ParadaRuta::getPedido).toList();
    }

    public double getDistanciaKm() {
        return distanciaKm;
    }

    /** Paquetes del producto P que la unidad lleva a bordo al salir del almacen. */
    public int getCargaTotal() {
        return paradas.stream().mapToInt(parada -> parada.getPedido().getCantidadProducto()).sum();
    }

    public boolean estaVacia() {
        return paradas.isEmpty();
    }

    /** Minuto de simulacion en que la unidad sale del almacen de origen. */
    public int getMinutoSalidaAlmacen() {
        return minutoSalidaAlmacen;
    }

    /** Minuto de simulacion en que la unidad termina su recorrido al retornar al almacen. */
    public int getMinutoFin() {
        if (paradas.isEmpty()) {
            return minutoSalidaAlmacen;
        }
        return minutoLlegadaAlmacen > 0 ? minutoLlegadaAlmacen : paradas.get(paradas.size() - 1).getMinutoSalida();
    }

    public long contarParadasFueraDePlazo() {
        return paradas.stream().filter(parada -> !parada.cumplePlazo()).count();
    }
}
