package pe.edu.pucp.paqrap.planificador.iaco;

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
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Improved Ant Colony Optimization (I-ACO), una de las dos soluciones
 * algoritmicas metaheuristicas exigidas por el caso (STD 4.6). Los
 * parametros {@code pesoFeromona}, {@code pesoHeuristicaCosto},
 * {@code pesoUrgencia}, {@code tasaEvaporacion}, {@code recompensaGlobal} y
 * {@code feromonaInicial} se toman de {@link ParametrosPlanificador} y
 * respetan la nomenclatura fijada en STD 4.6.2.
 *
 * <p>La matriz de feromonas se indexa sobre los <em>puntos de interes</em>
 * del problema -los almacenes y los destinos de los pedidos- y no sobre los
 * 3 621 nodos de la reticula, porque el rastro representa la conveniencia de
 * encadenar dos paradas, no la de recorrer una calle concreta.</p>
 *
 * <p>Respecto del pseudocodigo original se corrigen cinco puntos: el limite
 * de 1 000 unidades del almacen intermedio es una restriccion dura de la
 * construccion y no una penalidad; la hora de entrega al destinatario ocupa
 * a la unidad pero queda fuera del plazo comprometido; los bloqueos son
 * planificados y se sincronizan contra el reloj de simulacion en lugar de
 * sortearse; no existen unidades de reserva, de modo que un paquete sin
 * vehiculo operativo se registra como riesgo de colapso logistico; y las
 * averias son eventos con tipo y duracion, no sorteos aleatorios.</p>
 *
 * <p>No debe referenciar al subpaquete {@code planificador.agaestw}.</p>
 */
@Component
public class PlanificadorIACO implements Planificador {

    private static final Logger log = LoggerFactory.getLogger(PlanificadorIACO.class);

    public static final String NOMBRE = "I-ACO";

    private static final double EPSILON = 1e-9;

    private final ParametrosPlanificador parametrosPlanificador;
    private final EvaluadorCosto evaluadorCosto;
    private final RestriccionesPlanificacion restricciones;
    private final SelectorAlmacenDespacho selectorAlmacenDespacho;
    private final EnsambladorPlan ensambladorPlan;
    private final GeneradorAleatorio generadorAleatorio;

    public PlanificadorIACO(
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
     * Ejecuta la colonia sobre un contexto ya construido. La semilla se
     * recibe explicitamente para que la experimentacion numerica pueda
     * reproducir una corrida.
     */
    public PlanRutas ejecutar(ContextoPlanificacion contexto, long semilla) {
        long inicioMs = System.currentTimeMillis();
        Random aleatorio = generadorAleatorio.crear(semilla);

        List<Nodo> puntosInteres = construirPuntosInteres(contexto);
        double[][] feromonas = inicializarFeromonas(puntosInteres.size(), contexto, puntosInteres);

        List<AsignacionUnidad> mejorPlan = new ArrayList<>();
        double menorCosto = Double.MAX_VALUE;

        for (int iteracion = 1; iteracion <= parametrosPlanificador.numIteraciones(); iteracion++) {
            List<List<AsignacionUnidad>> solucionesIteracion = new ArrayList<>();

            for (int agente = 1; agente <= parametrosPlanificador.numHormigas(); agente++) {
                List<AsignacionUnidad> solucion = construirSolucion(contexto, feromonas, aleatorio);
                solucionesIteracion.add(solucion);

                double costo = ensambladorPlan.calcularCostoPenalizado(solucion, contexto);
                if (costo < menorCosto) {
                    menorCosto = costo;
                    mejorPlan = copiar(solucion);
                }
            }
            actualizarRastrosFeromona(feromonas, solucionesIteracion, contexto);
            gestionarContingenciasDinamicas(mejorPlan, contexto);
        }

        PlanRutas plan = ensambladorPlan.ensamblar(
                NOMBRE, mejorPlan, contexto, System.currentTimeMillis() - inicioMs);
        log.info("I-ACO planifico {} pedidos en {} rutas por S/ {} ({} ms)",
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

    // ============================================================ CONTINGENCIAS

    /**
     * Reubica la carga de las unidades que se averian dentro del turno. Al
     * no existir unidades de reserva, el paquete que ninguna ruta operativa
     * puede hospedar queda sin asignar y {@link EnsambladorPlan} lo registra
     * como riesgo de colapso logistico.
     *
     * <p>Sustituye al sorteo de fallas mecanicas del pseudocodigo original:
     * las averias son eventos con tipo, instante y duracion conocidos.</p>
     */
    private void gestionarContingenciasDinamicas(List<AsignacionUnidad> planVigente, ContextoPlanificacion contexto) {
        List<Averia> averias = contexto.averiasDelTurno();
        if (averias.isEmpty() || planVigente.isEmpty()) {
            return;
        }

        Set<UnidadTransporte> unidadesCaidas = new HashSet<>();
        averias.forEach(averia -> unidadesCaidas.add(averia.getUnidadTransporte()));

        List<Pedido> huerfanos = new ArrayList<>();
        List<AsignacionUnidad> operativas = new ArrayList<>();

        for (AsignacionUnidad asignacion : planVigente) {
            if (unidadesCaidas.contains(asignacion.getUnidad())) {
                huerfanos.addAll(asignacion.getPedidos());
                asignacion.vaciar();
            } else {
                operativas.add(asignacion);
            }
        }
        if (huerfanos.isEmpty()) {
            return;
        }

        // Se atiende primero el pedido con el plazo mas critico.
        huerfanos.sort((a, b) -> Integer.compare(a.getMinutoLimiteEntrega(), b.getMinutoLimiteEntrega()));

        for (Pedido paquete : huerfanos) {
            AsignacionUnidad mejorHospedera = null;
            double menorCostoInsercion = Double.MAX_VALUE;

            for (AsignacionUnidad candidata : operativas) {
                if (!restricciones.cabeEnLaUnidad(
                        candidata.getUnidad().getTipoUnidad(), candidata.getCarga(), paquete.getCantidadProducto())) {
                    continue;
                }
                double original = ensambladorPlan.evaluarAsignacion(candidata, contexto);
                AsignacionUnidad tentativa = candidata.copiar();
                tentativa.agregar(paquete);
                double incremento = ensambladorPlan.evaluarAsignacion(tentativa, contexto) - original;

                if (incremento < menorCostoInsercion) {
                    menorCostoInsercion = incremento;
                    mejorHospedera = candidata;
                }
            }

            if (mejorHospedera != null) {
                mejorHospedera.agregar(paquete);
            }
        }
    }

    // ============================================================ FEROMONAS

    /**
     * Los puntos de interes son, en este orden, los almacenes y despues los
     * destinos de los pedidos. El indice de un pedido dentro de la matriz es
     * {@code almacenes.size() + posicion del pedido}.
     */
    private List<Nodo> construirPuntosInteres(ContextoPlanificacion contexto) {
        List<Nodo> puntos = new ArrayList<>();
        contexto.almacenes().forEach(almacen -> puntos.add(almacen.getUbicacion()));
        contexto.pedidos().forEach(pedido -> puntos.add(pedido.getUbicacion()));
        return puntos;
    }

    /**
     * Inicializa el rastro y evapora a cero el de los encadenamientos que
     * cruzan un tramo bloqueado, para que la colonia no los explore.
     */
    private double[][] inicializarFeromonas(int numPuntos, ContextoPlanificacion contexto, List<Nodo> puntos) {
        double[][] feromonas = new double[numPuntos][numPuntos];
        for (double[] fila : feromonas) {
            Arrays.fill(fila, parametrosPlanificador.feromonaInicial());
        }
        if (contexto.grafo().getCantidadTramosBloqueados() == 0) {
            return feromonas;
        }
        for (int i = 0; i < numPuntos; i++) {
            for (int j = 0; j < numPuntos; j++) {
                if (i != j && contexto.grafo().contarTramosBloqueados(puntos.get(i), puntos.get(j)) > 0) {
                    feromonas[i][j] = 0.0;
                }
            }
        }
        return feromonas;
    }

    private void actualizarRastrosFeromona(double[][] feromonas,
                                           List<List<AsignacionUnidad>> solucionesIteracion,
                                           ContextoPlanificacion contexto) {
        double tasa = parametrosPlanificador.tasaEvaporacion();
        for (double[] fila : feromonas) {
            for (int j = 0; j < fila.length; j++) {
                fila[j] = (1 - tasa) * fila[j];
            }
        }

        int desplazamiento = contexto.almacenes().size();
        for (List<AsignacionUnidad> solucion : solucionesIteracion) {
            double costoPlan = ensambladorPlan.calcularCostoPenalizado(solucion, contexto);
            if (costoPlan <= 0.0) {
                continue;
            }
            double deposito = parametrosPlanificador.recompensaGlobal() / costoPlan;

            for (AsignacionUnidad asignacion : solucion) {
                int indiceAnterior = contexto.almacenes().indexOf(asignacion.getAlmacenOrigen());
                for (Pedido pedido : asignacion.getPedidos()) {
                    int indiceActual = desplazamiento + contexto.pedidos().indexOf(pedido);
                    feromonas[indiceAnterior][indiceActual] += deposito;
                    indiceAnterior = indiceActual;
                }
            }
        }
    }

    // ============================================================ CONSTRUCCION DE SOLUCIONES

    private List<AsignacionUnidad> construirSolucion(ContextoPlanificacion contexto,
                                                     double[][] feromonas,
                                                     Random aleatorio) {
        List<AsignacionUnidad> solucion = new ArrayList<>();
        boolean[] atendido = new boolean[contexto.pedidos().size()];
        Map<Almacen, Integer> despachadoPorAlmacen = new HashMap<>();
        int desplazamiento = contexto.almacenes().size();

        for (UnidadTransporte unidad : contexto.unidades()) {
            if (!unidad.estaOperativa(contexto.minutoPlanificacion())) {
                continue; // averiada o en mantenimiento: no se le asigna carga
            }

            Almacen almacenOrigen = selectorAlmacenDespacho.seleccionar(
                    unidad, contexto.almacenes(), despachadoPorAlmacen, contexto.grafo());
            AsignacionUnidad asignacion = new AsignacionUnidad(unidad, almacenOrigen);

            int carga = 0;
            double reloj = contexto.minutoPlanificacion();
            double minutosTrabajados = 0.0;
            Nodo posicion = almacenOrigen.getUbicacion();
            int indicePuntoActual = contexto.almacenes().indexOf(almacenOrigen);

            while (true) {
                int indicePedido = seleccionarSiguientePedido(contexto, feromonas, aleatorio, atendido,
                        indicePuntoActual, posicion, unidad, almacenOrigen, despachadoPorAlmacen,
                        carga, reloj, minutosTrabajados);
                if (indicePedido < 0) {
                    break; // ninguna transicion factible
                }

                Pedido pedido = contexto.pedidos().get(indicePedido);
                double distanciaKm = contexto.grafo().distanciaKm(posicion, pedido.getUbicacion());
                double minutosViaje = evaluadorCosto.minutosDeViaje(unidad.getTipoUnidad(), distanciaKm);

                asignacion.agregar(pedido);
                atendido[indicePedido] = true;
                carga += pedido.getCantidadProducto();
                if (!almacenOrigen.esCentral()) {
                    despachadoPorAlmacen.merge(almacenOrigen, pedido.getCantidadProducto(), Integer::sum);
                }

                // La llegada define el cumplimiento del plazo; la hora de entrega
                // se suma despues, porque ocupa a la unidad pero no cuenta en el plazo.
                double minutoLlegada = reloj + minutosViaje;
                reloj = minutoLlegada + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;
                minutosTrabajados += minutosViaje + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;

                posicion = pedido.getUbicacion();
                indicePuntoActual = desplazamiento + indicePedido;
            }
            solucion.add(asignacion);
        }
        return solucion;
    }

    /**
     * Regla de transicion estocastica del I-ACO: pondera el rastro de
     * feromona, la heuristica de costo -la inversa del gasto operativo del
     * tramo- y la urgencia del pedido, que crece conforme se agota su
     * holgura frente al plazo.
     */
    private int seleccionarSiguientePedido(ContextoPlanificacion contexto,
                                           double[][] feromonas,
                                           Random aleatorio,
                                           boolean[] atendido,
                                           int indicePuntoActual,
                                           Nodo posicion,
                                           UnidadTransporte unidad,
                                           Almacen almacenOrigen,
                                           Map<Almacen, Integer> despachadoPorAlmacen,
                                           int carga,
                                           double reloj,
                                           double minutosTrabajados) {
        List<Integer> candidatos = new ArrayList<>();
        List<Double> pesos = new ArrayList<>();
        double sumaPesos = 0.0;
        int desplazamiento = contexto.almacenes().size();

        for (int i = 0; i < contexto.pedidos().size(); i++) {
            if (atendido[i]) {
                continue;
            }
            Pedido pedido = contexto.pedidos().get(i);
            if (!esPedidoAsignable(contexto, pedido, unidad, almacenOrigen, despachadoPorAlmacen,
                    posicion, carga, reloj, minutosTrabajados)) {
                continue;
            }

            double distanciaKm = contexto.grafo().distanciaKm(posicion, pedido.getUbicacion());
            double costoTramo = evaluadorCosto.calcularCostoTramo(unidad.getTipoUnidad(), distanciaKm);

            double feromona = feromonas[indicePuntoActual][desplazamiento + i];
            double heuristicaCosto = 1.0 / (costoTramo + EPSILON);
            double urgencia = calcularUrgencia(pedido, reloj);

            double peso = Math.pow(feromona + EPSILON, parametrosPlanificador.pesoFeromona())
                    * Math.pow(heuristicaCosto, parametrosPlanificador.pesoHeuristicaCosto())
                    * Math.pow(urgencia, parametrosPlanificador.pesoUrgencia());

            candidatos.add(i);
            pesos.add(peso);
            sumaPesos += peso;
        }

        if (candidatos.isEmpty()) {
            return -1;
        }

        double corte = aleatorio.nextDouble() * sumaPesos;
        double acumulado = 0.0;
        for (int k = 0; k < candidatos.size(); k++) {
            acumulado += pesos.get(k);
            if (acumulado >= corte) {
                return candidatos.get(k);
            }
        }
        return candidatos.get(candidatos.size() - 1);
    }

    /** La urgencia crece a medida que se agota la holgura frente al plazo. */
    private double calcularUrgencia(Pedido pedido, double reloj) {
        double holguraMinutos = pedido.getMinutoLimiteEntrega() - reloj;
        return 1.0 / Math.max(holguraMinutos, 1.0);
    }

    /**
     * Restricciones duras del caso: capacidad de la unidad, stock del
     * almacen de despacho, plazo comprometido -sin la hora de entrega- y
     * jornada de 8 horas con su pausa de alimentacion.
     */
    private boolean esPedidoAsignable(ContextoPlanificacion contexto,
                                      Pedido pedido,
                                      UnidadTransporte unidad,
                                      Almacen almacenOrigen,
                                      Map<Almacen, Integer> despachadoPorAlmacen,
                                      Nodo posicion,
                                      int carga,
                                      double reloj,
                                      double minutosTrabajados) {
        if (!restricciones.cabeEnLaUnidad(unidad.getTipoUnidad(), carga, pedido.getCantidadProducto())) {
            return false;
        }
        if (!restricciones.hayStockDisponible(almacenOrigen, pedido.getCantidadProducto(), despachadoPorAlmacen)) {
            return false;
        }

        double distanciaKm = contexto.grafo().distanciaKm(posicion, pedido.getUbicacion());
        double minutosViaje = evaluadorCosto.minutosDeViaje(unidad.getTipoUnidad(), distanciaKm);

        if (!restricciones.cumpleElPlazo(pedido, reloj + minutosViaje)) {
            return false;
        }
        return restricciones.cabeEnLaJornada(minutosTrabajados, minutosViaje);
    }

    private List<AsignacionUnidad> copiar(List<AsignacionUnidad> solucion) {
        return solucion.stream().map(AsignacionUnidad::copiar).toList();
    }
}
