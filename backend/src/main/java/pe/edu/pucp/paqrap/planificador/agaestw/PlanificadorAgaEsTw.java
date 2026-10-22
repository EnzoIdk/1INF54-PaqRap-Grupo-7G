package pe.edu.pucp.paqrap.planificador.agaestw;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.config.ParametrosPlanificador;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Averia;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.PlanRutas;
import pe.edu.pucp.paqrap.model.UnidadTransporte;
import pe.edu.pucp.paqrap.planificador.Planificador;
import pe.edu.pucp.paqrap.planificador.comun.AsignacionUnidad;
import pe.edu.pucp.paqrap.planificador.comun.ContextoPlanificacion;
import pe.edu.pucp.paqrap.planificador.comun.EnsambladorPlan;
import pe.edu.pucp.paqrap.planificador.comun.EvaluadorCosto;
import pe.edu.pucp.paqrap.planificador.comun.GeneradorAleatorio;
import pe.edu.pucp.paqrap.planificador.comun.RestriccionesPlanificacion;
import pe.edu.pucp.paqrap.planificador.comun.SelectorAlmacenDespacho;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Adaptive Genetic Algorithm with Elastic Strategy and Time Windows
 * (AGA-ES-TW), la segunda solucion algoritmica metaheuristica exigida por
 * el caso (STD 4.6). Los parametros {@code tamanoPoblacion},
 * {@code numGeneraciones}, {@code porcentajeElitismo},
 * {@code penalidadPlazo} y {@code penalidadCapacidad} se toman de
 * {@link ParametrosPlanificador} y respetan la nomenclatura fijada en
 * STD 4.6.2.
 *
 * <p>El cromosoma es el conjunto completo de rutas de la flota. Lo
 * <em>adaptativo</em> esta en que las probabilidades de cruce y mutacion se
 * calculan por individuo contra el promedio de la poblacion: baja el cruce
 * de los individuos ya buenos y sube la mutacion cuando la poblacion se
 * vuelve homogenea. La <em>estrategia elastica</em> reasigna la carga de las
 * unidades que caen dentro del turno, atendiendo primero al pedido con el
 * plazo mas critico.</p>
 *
 * <p>No debe referenciar al subpaquete {@code planificador.iaco}.</p>
 */
@Component
public class PlanificadorAgaEsTw implements Planificador {

    private static final Logger log = LoggerFactory.getLogger(PlanificadorAgaEsTw.class);

    public static final String NOMBRE = "AGA-ES-TW";

    private final ParametrosPlanificador parametrosPlanificador;
    private final EvaluadorCosto evaluadorCosto;
    private final RestriccionesPlanificacion restricciones;
    private final SelectorAlmacenDespacho selectorAlmacenDespacho;
    private final EnsambladorPlan ensambladorPlan;
    private final GeneradorAleatorio generadorAleatorio;

    public PlanificadorAgaEsTw(
            ParametrosPlanificador parametrosPlanificador,
            EvaluadorCosto evaluadorCosto,
            RestriccionesPlanificacion restricciones,
            SelectorAlmacenDespacho selectorAlmacenDespacho,
            EnsambladorPlan ensambladorPlan,
            GeneradorAleatorio generadorAleatorio) {
        this.parametrosPlanificador = parametrosPlanificador;
        this.evaluadorCosto = evaluadorCosto;
        this.restricciones = restricciones;
        this.selectorAlmacenDespacho = selectorAlmacenDespacho;
        this.ensambladorPlan = ensambladorPlan;
        this.generadorAleatorio = generadorAleatorio;
    }

    @Override
    public PlanRutas planificarRutas(
            List<Pedido> pedidosPendientes,
            List<UnidadTransporte> unidadesDisponibles,
            List<Almacen> almacenes,
            List<Bloqueo> bloqueosVigentes,
            int minutoSimulacion) {
        ContextoPlanificacion contexto = ContextoPlanificacion.crear(
                pedidosPendientes, unidadesDisponibles, almacenes, bloqueosVigentes, minutoSimulacion);
        return ejecutar(contexto, generadorAleatorio.getSemillaPorDefecto());
    }

    /**
     * Evoluciona la poblacion sobre un contexto ya construido. La semilla se
     * recibe explicitamente para que la experimentacion numerica pueda
     * reproducir una corrida.
     */
    public PlanRutas ejecutar(ContextoPlanificacion contexto, long semilla) {
        long inicioMs = System.currentTimeMillis();
        Random aleatorio = generadorAleatorio.crear(semilla);

        List<Individuo> poblacion = generarPoblacionInicial(contexto, aleatorio);
        evaluarAptitud(poblacion, contexto);
        Individuo mejorPlanGlobal = obtenerMejorIndividuo(poblacion);

        List<Averia> averiasDelTurno = contexto.averiasDelTurno();

        for (int generacion = 1; generacion <= parametrosPlanificador.numGeneraciones(); generacion++) {
            List<Individuo> nuevaPoblacion = conservarElite(poblacion);
            double fitnessPromedio = calcularFitnessPromedio(poblacion);

            while (nuevaPoblacion.size() < parametrosPlanificador.tamanoPoblacion()) {
                Individuo padre1 = seleccionPorTorneo(poblacion, aleatorio);
                Individuo padre2 = seleccionPorTorneo(poblacion, aleatorio);

                double probCruce = calcularProbabilidadCruce(padre1, padre2, fitnessPromedio, mejorPlanGlobal);
                double probMutacion = calcularProbabilidadMutacion(padre1, fitnessPromedio, mejorPlanGlobal);

                Individuo hijo = aleatorio.nextDouble() < probCruce
                        ? cruzarRutas(padre1, padre2, aleatorio)
                        : padre1.copiar();

                if (aleatorio.nextDouble() < probMutacion) {
                    mutarRutas(hijo, aleatorio);
                }

                evaluarIndividuo(hijo, contexto);
                if (hijo.getFitness() > fitnessPromedio) {
                    aplicarBusquedaLocal(hijo, contexto, aleatorio);
                    evaluarIndividuo(hijo, contexto);
                }
                nuevaPoblacion.add(hijo);
            }

            poblacion = nuevaPoblacion;
            evaluarAptitud(poblacion, contexto);
            mejorPlanGlobal = actualizarMejorPlan(poblacion, mejorPlanGlobal);

            // Estrategia elastica: se evalua contra eventos conocidos, no sorteados.
            if (!averiasDelTurno.isEmpty()) {
                replanificarElasticamente(poblacion, contexto, averiasDelTurno);
                evaluarAptitud(poblacion, contexto);
                mejorPlanGlobal = actualizarMejorPlan(poblacion, mejorPlanGlobal);
            }
        }

        PlanRutas plan = ensambladorPlan.ensamblar(
                NOMBRE, mejorPlanGlobal.getAsignaciones(), contexto, System.currentTimeMillis() - inicioMs);
        log.info("AGA-ES-TW planifico {} pedidos en {} rutas por S/ {} ({} ms)",
                plan.getPedidosAtendidos(), plan.getRutasConCarga().size(),
                String.format("%.2f", plan.getCostoOperativoTotal()), plan.getDuracionComputoMs());
        return plan;
    }

    @Override
    public PlanRutas replanificarPorBloqueo(PlanRutas planVigente, Bloqueo bloqueo, int minutoSimulacion) {
        List<Pedido> pendientes = new ArrayList<>(planVigente.getPedidosNoAsignados());
        List<UnidadTransporte> unidades = new ArrayList<>();
        List<Almacen> almacenes = new ArrayList<>();

        planVigente.getRutas().forEach(ruta -> {
            pendientes.addAll(ruta.getPedidosAsignados());
            unidades.add(ruta.getUnidadTransporte());
            if (!almacenes.contains(ruta.getAlmacenOrigen())) {
                almacenes.add(ruta.getAlmacenOrigen());
            }
        });

        return planificarRutas(pendientes, unidades, almacenes, List.of(bloqueo), minutoSimulacion);
    }

    // ============================================================ POBLACION INICIAL

    private List<Individuo> generarPoblacionInicial(ContextoPlanificacion contexto, Random aleatorio) {
        List<Individuo> poblacion = new ArrayList<>();
        for (int i = 0; i < parametrosPlanificador.tamanoPoblacion(); i++) {
            poblacion.add(generarAsignacionesAleatorias(contexto, aleatorio));
        }
        return poblacion;
    }

    /**
     * Genera un cromosoma factible: respeta la capacidad de la unidad, el
     * stock del almacen de despacho, el plazo comprometido y la jornada
     * laboral. El limite de 1 000 unidades del almacen intermedio se
     * verifica durante la construccion y no se multa despues.
     */
    private Individuo generarAsignacionesAleatorias(ContextoPlanificacion contexto, Random aleatorio) {
        Individuo individuo = new Individuo();
        List<Pedido> sinAsignar = new ArrayList<>(contexto.pedidos());
        Collections.shuffle(sinAsignar, aleatorio);

        Map<Almacen, Integer> despachadoPorAlmacen = new HashMap<>();

        for (UnidadTransporte unidad : contexto.unidades()) {
            if (!unidad.estaOperativa(contexto.minutoPlanificacion())) {
                continue;
            }

            Almacen almacenOrigen = selectorAlmacenDespacho.seleccionar(
                    unidad, contexto.almacenes(), despachadoPorAlmacen, contexto.grafo());
            AsignacionUnidad asignacion = new AsignacionUnidad(unidad, almacenOrigen);

            int carga = 0;
            double reloj = contexto.minutoPlanificacion();
            double minutosTrabajados = 0.0;
            Nodo posicion = almacenOrigen.getUbicacion();

            Iterator<Pedido> iterador = sinAsignar.iterator();
            while (iterador.hasNext()) {
                Pedido pedido = iterador.next();

                if (!restricciones.cabeEnLaUnidad(unidad.getTipoUnidad(), carga, pedido.getCantidadProducto())) {
                    continue;
                }
                if (!restricciones.hayStockDisponible(
                        almacenOrigen, pedido.getCantidadProducto(), despachadoPorAlmacen)) {
                    continue;
                }

                double distanciaKm = contexto.grafo().distanciaKm(posicion, pedido.getUbicacion());
                double minutosViaje = evaluadorCosto.minutosDeViaje(unidad.getTipoUnidad(), distanciaKm);

                if (!restricciones.cumpleElPlazo(pedido, reloj + minutosViaje)) {
                    continue;
                }
                if (!restricciones.cabeEnLaJornada(minutosTrabajados, minutosViaje)) {
                    continue;
                }

                asignacion.agregar(pedido);
                carga += pedido.getCantidadProducto();
                if (!almacenOrigen.esCentral()) {
                    despachadoPorAlmacen.merge(almacenOrigen, pedido.getCantidadProducto(), Integer::sum);
                }

                reloj += minutosViaje + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;
                minutosTrabajados += minutosViaje + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;
                posicion = pedido.getUbicacion();
                iterador.remove();
            }
            individuo.agregar(asignacion);
        }
        return individuo;
    }

    // ============================================================ APTITUD

    private void evaluarAptitud(List<Individuo> poblacion, ContextoPlanificacion contexto) {
        poblacion.forEach(individuo -> evaluarIndividuo(individuo, contexto));
    }

    /**
     * Fitness inversamente proporcional al costo operativo mas las multas de
     * plazo, capacidad y pedidos sin atender. Es la misma formula que evalua
     * al I-ACO, de modo que los dos resultados sean comparables.
     */
    private void evaluarIndividuo(Individuo individuo, ContextoPlanificacion contexto) {
        double costoPenalizado = ensambladorPlan.calcularCostoPenalizado(individuo.getAsignaciones(), contexto);
        individuo.setCostoPenalizado(costoPenalizado);
        individuo.setFitness(1.0 / (1.0 + costoPenalizado));
    }

    // ============================================================ OPERADORES GENETICOS

    private List<Individuo> conservarElite(List<Individuo> poblacion) {
        List<Individuo> ordenada = new ArrayList<>(poblacion);
        ordenada.sort((a, b) -> Double.compare(b.getFitness(), a.getFitness()));

        int cantidadElite = Math.max(1,
                (int) Math.round(parametrosPlanificador.tamanoPoblacion() * parametrosPlanificador.porcentajeElitismo()));

        List<Individuo> elite = new ArrayList<>();
        for (int i = 0; i < cantidadElite && i < ordenada.size(); i++) {
            elite.add(ordenada.get(i).copiar());
        }
        return elite;
    }

    private Individuo seleccionPorTorneo(List<Individuo> poblacion, Random aleatorio) {
        Individuo mejor = null;
        for (int i = 0; i < parametrosPlanificador.tamanoTorneo(); i++) {
            Individuo candidato = poblacion.get(aleatorio.nextInt(poblacion.size()));
            if (mejor == null || candidato.getFitness() > mejor.getFitness()) {
                mejor = candidato;
            }
        }
        return mejor;
    }

    /** Probabilidad adaptativa: baja para los individuos ya buenos. */
    private double calcularProbabilidadCruce(Individuo padre1, Individuo padre2,
                                             double fitnessPromedio, Individuo mejorGlobal) {
        double base = parametrosPlanificador.probCruceBase();
        double fitnessMayor = Math.max(padre1.getFitness(), padre2.getFitness());
        if (fitnessMayor < fitnessPromedio) {
            return base;
        }
        double rango = mejorGlobal.getFitness() - fitnessPromedio;
        if (rango <= 0) {
            return base;
        }
        return base * (1 - 0.5 * (fitnessMayor - fitnessPromedio) / rango);
    }

    /** Probabilidad adaptativa: sube cuando la poblacion se vuelve homogenea. */
    private double calcularProbabilidadMutacion(Individuo individuo,
                                                double fitnessPromedio, Individuo mejorGlobal) {
        double base = parametrosPlanificador.probMutacionBase();
        double rango = mejorGlobal.getFitness() - fitnessPromedio;
        if (rango <= 1e-12) {
            return Math.min(1.0, base * 3); // estancamiento: forzar exploracion
        }
        if (individuo.getFitness() < fitnessPromedio) {
            return base * 2;
        }
        return base;
    }

    /** Cruce por rutas: el hijo hereda rutas del padre 1 y completa con el padre 2. */
    private Individuo cruzarRutas(Individuo padre1, Individuo padre2, Random aleatorio) {
        Individuo hijo = new Individuo();
        Set<Pedido> tomados = new HashSet<>();

        int corte = 1 + aleatorio.nextInt(Math.max(1, padre1.getAsignaciones().size()));

        for (int i = 0; i < padre1.getAsignaciones().size(); i++) {
            AsignacionUnidad original = padre1.getAsignaciones().get(i);
            AsignacionUnidad copia = new AsignacionUnidad(original.getUnidad(), original.getAlmacenOrigen());
            if (i < corte) {
                for (Pedido pedido : original.getPedidos()) {
                    copia.agregarDesde(original, pedido);
                    tomados.add(pedido);
                }
            }
            hijo.agregar(copia);
        }

        for (AsignacionUnidad delPadre2 : padre2.getAsignaciones()) {
            AsignacionUnidad destino = hijo.buscarPorUnidad(delPadre2.getUnidad());
            if (destino == null) {
                continue;
            }
            for (Pedido pedido : delPadre2.getPedidos()) {
                if (tomados.contains(pedido)) {
                    continue;
                }
                if (restricciones.cabeEnLaUnidad(
                        destino.getUnidad().getTipoUnidad(), destino.getCarga(), pedido.getCantidadProducto())) {
                    destino.agregarDesde(delPadre2, pedido);
                    tomados.add(pedido);
                }
            }
        }
        return hijo;
    }

    /** Intercambia pedidos entre dos rutas validando que no excedan las capacidades. */
    private void mutarRutas(Individuo individuo, Random aleatorio) {
        List<AsignacionUnidad> asignaciones = individuo.getAsignaciones();
        if (asignaciones.size() < 2) {
            return;
        }
        AsignacionUnidad primera = asignaciones.get(aleatorio.nextInt(asignaciones.size()));
        AsignacionUnidad segunda = asignaciones.get(aleatorio.nextInt(asignaciones.size()));
        if (primera == segunda || primera.estaVacia() || segunda.estaVacia()) {
            return;
        }

        int indice1 = aleatorio.nextInt(primera.getPedidos().size());
        int indice2 = aleatorio.nextInt(segunda.getPedidos().size());
        Pedido pedido1 = primera.getPedidos().get(indice1);
        Pedido pedido2 = segunda.getPedidos().get(indice2);

        int cargaResultante1 = primera.getCarga() - pedido1.getCantidadProducto() + pedido2.getCantidadProducto();
        int cargaResultante2 = segunda.getCarga() - pedido2.getCantidadProducto() + pedido1.getCantidadProducto();

        boolean cabeEnPrimera = restricciones.cabeEnLaUnidad(
                primera.getUnidad().getTipoUnidad(), 0, cargaResultante1);
        boolean cabeEnSegunda = restricciones.cabeEnLaUnidad(
                segunda.getUnidad().getTipoUnidad(), 0, cargaResultante2);

        if (cabeEnPrimera && cabeEnSegunda) {
            primera.getPedidos().set(indice1, pedido2);
            segunda.getPedidos().set(indice2, pedido1);
        }
    }

    /** Busqueda local: extrae dos paradas de cada ruta y las reinserta donde menos cuestan. */
    private void aplicarBusquedaLocal(Individuo individuo, ContextoPlanificacion contexto, Random aleatorio) {
        for (AsignacionUnidad asignacion : individuo.getAsignaciones()) {
            if (asignacion.getPedidos().size() < 2) {
                continue;
            }
            Pedido primero = asignacion.getPedidos().remove(aleatorio.nextInt(asignacion.getPedidos().size()));
            Pedido segundo = asignacion.getPedidos().remove(aleatorio.nextInt(asignacion.getPedidos().size()));
            insertarEnMejorPosicion(asignacion, primero, contexto);
            insertarEnMejorPosicion(asignacion, segundo, contexto);
        }
    }

    private void insertarEnMejorPosicion(AsignacionUnidad asignacion, Pedido pedido, ContextoPlanificacion contexto) {
        int mejorPosicion = 0;
        double menorCosto = Double.MAX_VALUE;

        for (int i = 0; i <= asignacion.getPedidos().size(); i++) {
            AsignacionUnidad tentativa = asignacion.copiar();
            tentativa.insertar(i, pedido);
            double costo = ensambladorPlan.evaluarAsignacion(tentativa, contexto);
            if (costo < menorCosto) {
                menorCosto = costo;
                mejorPosicion = i;
            }
        }
        asignacion.insertar(mejorPosicion, pedido);
    }

    // ============================================================ ESTRATEGIA ELASTICA

    /**
     * Reasigna la carga de las unidades que se averian dentro del turno.
     * Al no existir unidades de reserva, el paquete que ninguna ruta sana
     * puede hospedar queda sin asignar y {@link EnsambladorPlan} lo registra
     * como riesgo de colapso logistico.
     */
    private void replanificarElasticamente(List<Individuo> poblacion,
                                           ContextoPlanificacion contexto,
                                           List<Averia> averiasDelTurno) {
        Set<UnidadTransporte> unidadesCaidas = new HashSet<>();
        averiasDelTurno.forEach(averia -> unidadesCaidas.add(averia.getUnidadTransporte()));

        for (Individuo individuo : poblacion) {
            List<AsignacionUnidad> danadas = new ArrayList<>();
            List<AsignacionUnidad> sanas = new ArrayList<>();

            for (AsignacionUnidad asignacion : individuo.getAsignaciones()) {
                if (unidadesCaidas.contains(asignacion.getUnidad())) {
                    danadas.add(asignacion);
                } else {
                    sanas.add(asignacion);
                }
            }
            if (danadas.isEmpty()) {
                continue;
            }

            List<Pedido> huerfanos = new ArrayList<>();
            for (AsignacionUnidad danada : danadas) {
                huerfanos.addAll(danada.getPedidos());
                danada.vaciar();
            }
            reasignarCargaCritica(sanas, huerfanos, contexto);
        }
    }

    /** Se atiende primero el pedido con el plazo mas critico. */
    private void reasignarCargaCritica(List<AsignacionUnidad> sanas,
                                       List<Pedido> huerfanos,
                                       ContextoPlanificacion contexto) {
        huerfanos.sort((a, b) -> Integer.compare(a.getMinutoLimiteEntrega(), b.getMinutoLimiteEntrega()));

        for (Pedido paquete : huerfanos) {
            AsignacionUnidad mejorHospedera = null;
            double menorCostoInsercion = Double.MAX_VALUE;

            for (AsignacionUnidad candidata : sanas) {
                if (!restricciones.cabeEnLaUnidad(
                        candidata.getUnidad().getTipoUnidad(), candidata.getCarga(), paquete.getCantidadProducto())) {
                    continue;
                }
                double costoInsercion = calcularAumentoDeCosto(candidata, paquete, contexto);
                if (costoInsercion < menorCostoInsercion) {
                    menorCostoInsercion = costoInsercion;
                    mejorHospedera = candidata;
                }
            }

            if (mejorHospedera != null) {
                mejorHospedera.agregarReasignado(paquete);
            }
        }
    }

    private double calcularAumentoDeCosto(AsignacionUnidad asignacion, Pedido paquete, ContextoPlanificacion contexto) {
        double costoOriginal = ensambladorPlan.evaluarAsignacion(asignacion, contexto);
        AsignacionUnidad tentativa = asignacion.copiar();
        tentativa.agregar(paquete);
        return ensambladorPlan.evaluarAsignacion(tentativa, contexto) - costoOriginal;
    }

    // ============================================================ APOYO

    private double calcularFitnessPromedio(List<Individuo> poblacion) {
        return poblacion.stream().mapToDouble(Individuo::getFitness).average().orElse(0.0);
    }

    private Individuo obtenerMejorIndividuo(List<Individuo> poblacion) {
        Individuo mejor = poblacion.get(0);
        for (Individuo individuo : poblacion) {
            if (individuo.getFitness() > mejor.getFitness()) {
                mejor = individuo;
            }
        }
        return mejor.copiar();
    }

    private Individuo actualizarMejorPlan(List<Individuo> poblacion, Individuo mejorActual) {
        Individuo mejorGeneracion = obtenerMejorIndividuo(poblacion);
        return mejorGeneracion.getFitness() > mejorActual.getFitness() ? mejorGeneracion : mejorActual;
    }
}
