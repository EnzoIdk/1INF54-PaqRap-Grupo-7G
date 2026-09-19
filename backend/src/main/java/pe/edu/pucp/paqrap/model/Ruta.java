package pe.edu.pucp.paqrap.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Secuencia ordenada de nodos y pedidos asignados a una unidad de transporte
 * para atender durante un turno.
 */
public class Ruta {

    private final UnidadTransporte unidadTransporte;
    private final List<Nodo> secuenciaNodos = new ArrayList<>();
    private final List<Pedido> pedidosAsignados = new ArrayList<>();

    public Ruta(UnidadTransporte unidadTransporte) {
        this.unidadTransporte = unidadTransporte;
    }

    public UnidadTransporte getUnidadTransporte() {
        return unidadTransporte;
    }

    public List<Nodo> getSecuenciaNodos() {
        return secuenciaNodos;
    }

    public List<Pedido> getPedidosAsignados() {
        return pedidosAsignados;
    }

    public int calcularDistanciaKm() {
        int distanciaKm = 0;
        for (int i = 1; i < secuenciaNodos.size(); i++) {
            distanciaKm += secuenciaNodos.get(i - 1).distanciaKmHasta(secuenciaNodos.get(i));
        }
        return distanciaKm;
    }
}
