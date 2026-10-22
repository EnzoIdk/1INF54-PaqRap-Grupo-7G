package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.config.ParametrosPlanificador;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.PlanRutas;
import pe.edu.pucp.paqrap.model.Ruta;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Mide y traduce el trabajo de las metaheuristicas.
 *
 * <p>Expone dos operaciones con proposito distinto. {@link #calcularCostoPenalizado}
 * es la funcion objetivo que ambos algoritmos minimizan: se invoca cientos de
 * miles de veces por ejecucion, de modo que recorre la asignacion de forma
 * analitica y no construye objetos. {@link #ensamblar} se invoca una sola vez,
 * al final, y produce el {@link PlanRutas} completo que consume el
 * visualizador, con los instantes de cada parada y la polilinea del
 * recorrido.</p>
 *
 * <p>El costo, las multas y el fitness se calculan aqui para los dos
 * algoritmos: si cada uno midiera su resultado con una formula propia, la
 * experimentacion numerica compararia dos escalas distintas y no dos
 * algoritmos (STD 4.6.1).</p>
 */
@Component
public class EnsambladorPlan {

    private final ConstructorRutas constructorRutas;
    private final EvaluadorCosto evaluadorCosto;
    private final ParametrosPlanificador parametrosPlanificador;

    public EnsambladorPlan(ConstructorRutas constructorRutas,
                           EvaluadorCosto evaluadorCosto,
                           ParametrosPlanificador parametrosPlanificador) {
        this.constructorRutas = constructorRutas;
        this.evaluadorCosto = evaluadorCosto;
        this.parametrosPlanificador = parametrosPlanificador;
    }

    /**
     * Funcion objetivo comun: costo operativo del recorrido mas las multas
     * por entrega fuera de plazo, por exceso de capacidad y por cada pedido
     * que ninguna unidad llego a atender.
     */
    public double calcularCostoPenalizado(List<AsignacionUnidad> asignaciones, ContextoPlanificacion contexto) {
        double total = 0.0;
        int atendidos = 0;

        for (AsignacionUnidad asignacion : asignaciones) {
            total += evaluarAsignacion(asignacion, contexto);
            atendidos += asignacion.getPedidos().size();
        }

        int noAsignados = Math.max(0, contexto.pedidos().size() - atendidos);
        return total + noAsignados * parametrosPlanificador.penalidadPlazo();
    }

    /**
     * Costo mas multas de una sola asignacion, sin construir la ruta. El
     * reloj avanza igual que en {@link ConstructorRutas}: la llegada define
     * el cumplimiento del plazo y la hora de entrega se suma despues.
     */
    public double evaluarAsignacion(AsignacionUnidad asignacion, ContextoPlanificacion contexto) {
        if (asignacion.estaVacia()) {
            return 0.0;
        }

        double costoPorKm = evaluadorCosto.obtenerCostoPorKm(asignacion.getUnidad().getTipoUnidad());
        double distanciaKm = 0.0;
        double multas = 0.0;
        double reloj = contexto.minutoPlanificacion();
        Nodo posicion = asignacion.getAlmacenOrigen().getUbicacion();

        for (Pedido pedido : asignacion.getPedidos()) {
            double tramoKm = contexto.grafo().distanciaKm(posicion, pedido.getUbicacion());
            distanciaKm += tramoKm;

            double minutoLlegada = reloj
                    + evaluadorCosto.minutosDeViaje(asignacion.getUnidad().getTipoUnidad(), tramoKm);
            if (minutoLlegada > pedido.getMinutoLimiteEntrega()) {
                multas += parametrosPlanificador.penalidadPlazo();
            }

            reloj = minutoLlegada + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;
            posicion = pedido.getUbicacion();
        }

        if (!asignacion.getPedidos().isEmpty()) {
            pe.edu.pucp.paqrap.model.Almacen almacenDestino = ConstructorRutas.seleccionarAlmacenRetorno(
                    posicion, contexto.almacenes(), asignacion.getAlmacenOrigen(), contexto.grafo());
            distanciaKm += contexto.grafo().distanciaKm(posicion, almacenDestino.getUbicacion());
        }

        int capacidad = evaluadorCosto.obtenerCapacidad(asignacion.getUnidad().getTipoUnidad());
        int exceso = asignacion.getCarga() - capacidad;
        if (exceso > 0) {
            multas += parametrosPlanificador.penalidadCapacidad() * exceso;
        }

        return distanciaKm * costoPorKm + multas;
    }

    /** Traduce la asignacion ganadora al plan que consume el visualizador. */
    public PlanRutas ensamblar(String algoritmo,
                               List<AsignacionUnidad> asignaciones,
                               ContextoPlanificacion contexto,
                               long duracionComputoMs) {
        PlanRutas plan = new PlanRutas(contexto.minutoPlanificacion());
        plan.setAlgoritmo(algoritmo);

        double costoTotal = 0.0;
        double multas = 0.0;
        Set<Pedido> atendidos = new HashSet<>();

        for (AsignacionUnidad asignacion : asignaciones) {
            Ruta ruta = constructorRutas.construir(
                    asignacion.getUnidad(),
                    asignacion.getAlmacenOrigen(),
                    asignacion.getPedidos(),
                    contexto.minutoPlanificacion(),
                    contexto.grafo(),
                    contexto.almacenes());
            plan.agregarRuta(ruta);

            costoTotal += evaluadorCosto.calcularCostoOperativo(ruta);
            multas += calcularMultasDeRuta(ruta);
            atendidos.addAll(ruta.getPedidosAsignados());
        }

        for (Pedido pedido : contexto.pedidos()) {
            if (!atendidos.contains(pedido)) {
                plan.agregarPedidoNoAsignado(pedido);
                plan.agregarRiesgoDeColapso(String.format(
                        "Pedido %s (%d u, plazo %d h) sin unidad operativa con capacidad disponible",
                        pedido.getCodigo(), pedido.getCantidadProducto(), pedido.getPlazoHoras()));
            }
        }
        multas += plan.getPedidosNoAsignados().size() * parametrosPlanificador.penalidadPlazo();

        plan.setCostoOperativoTotal(costoTotal);
        plan.setMultas(multas);
        plan.setFitness(1.0 / (1.0 + costoTotal + multas));
        plan.setDuracionComputoMs(duracionComputoMs);
        return plan;
    }

    private double calcularMultasDeRuta(Ruta ruta) {
        double multas = ruta.contarParadasFueraDePlazo() * parametrosPlanificador.penalidadPlazo();
        int capacidad = evaluadorCosto.obtenerCapacidad(ruta.getUnidadTransporte().getTipoUnidad());
        int exceso = ruta.getCargaTotal() - capacidad;
        if (exceso > 0) {
            multas += parametrosPlanificador.penalidadCapacidad() * exceso;
        }
        return multas;
    }
}
