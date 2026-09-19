package pe.edu.pucp.paqrap.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Resultado de una ejecucion del planificador: el conjunto de rutas
 * asignadas a la flota, los pedidos que ninguna unidad pudo atender y los
 * indicadores con los que se compara un algoritmo contra el otro en la
 * experimentacion numerica (STD 4.6).
 */
public class PlanRutas {

    private final int minutoSimulacion;
    private final List<Ruta> rutas = new ArrayList<>();
    private final List<Pedido> pedidosNoAsignados = new ArrayList<>();
    private final List<String> riesgosDeColapso = new ArrayList<>();
    private String algoritmo;
    private double costoOperativoTotal;
    private double multas;
    private double fitness;
    private long duracionComputoMs;

    public PlanRutas(int minutoSimulacion) {
        this.minutoSimulacion = minutoSimulacion;
    }

    public void agregarRuta(Ruta ruta) {
        rutas.add(ruta);
    }

    public void agregarPedidoNoAsignado(Pedido pedido) {
        if (!pedidosNoAsignados.contains(pedido)) {
            pedidosNoAsignados.add(pedido);
        }
    }

    public void agregarRiesgoDeColapso(String descripcion) {
        riesgosDeColapso.add(descripcion);
    }

    public int getMinutoSimulacion() {
        return minutoSimulacion;
    }

    public List<Ruta> getRutas() {
        return rutas;
    }

    public List<Ruta> getRutasConCarga() {
        return rutas.stream().filter(ruta -> !ruta.estaVacia()).toList();
    }

    public List<Pedido> getPedidosNoAsignados() {
        return Collections.unmodifiableList(pedidosNoAsignados);
    }

    public List<String> getRiesgosDeColapso() {
        return Collections.unmodifiableList(riesgosDeColapso);
    }

    public String getAlgoritmo() {
        return algoritmo;
    }

    public void setAlgoritmo(String algoritmo) {
        this.algoritmo = algoritmo;
    }

    public double getCostoOperativoTotal() {
        return costoOperativoTotal;
    }

    public void setCostoOperativoTotal(double costoOperativoTotal) {
        this.costoOperativoTotal = costoOperativoTotal;
    }

    public double getMultas() {
        return multas;
    }

    public void setMultas(double multas) {
        this.multas = multas;
    }

    public double getFitness() {
        return fitness;
    }

    public void setFitness(double fitness) {
        this.fitness = fitness;
    }

    public long getDuracionComputoMs() {
        return duracionComputoMs;
    }

    public void setDuracionComputoMs(long duracionComputoMs) {
        this.duracionComputoMs = duracionComputoMs;
    }

    public double getDistanciaTotalKm() {
        return rutas.stream().mapToDouble(Ruta::getDistanciaKm).sum();
    }

    public int getPedidosAtendidos() {
        return rutas.stream().mapToInt(ruta -> ruta.getParadas().size()).sum();
    }

    public long getEntregasFueraDePlazo() {
        return rutas.stream().mapToLong(Ruta::contarParadasFueraDePlazo).sum();
    }
}
