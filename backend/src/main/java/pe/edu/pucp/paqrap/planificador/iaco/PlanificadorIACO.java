package pe.edu.pucp.paqrap.planificador.iaco;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ParametrosPlanificador;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.PlanRutas;
import pe.edu.pucp.paqrap.model.UnidadTransporte;
import pe.edu.pucp.paqrap.planificador.Planificador;
import pe.edu.pucp.paqrap.planificador.comun.EvaluadorCosto;
import pe.edu.pucp.paqrap.planificador.comun.GeneradorAleatorio;
import pe.edu.pucp.paqrap.planificador.comun.Grafo;
import pe.edu.pucp.paqrap.planificador.comun.RestriccionesPlanificacion;

import java.util.List;

/**
 * Improved Ant Colony Optimization (I-ACO), una de las dos soluciones
 * algoritmicas metaheuristicas exigidas por el caso (STD 4.6). Los
 * parametros {@code pesoFeromona}, {@code pesoHeuristicaCosto},
 * {@code pesoUrgencia}, {@code tasaEvaporacion}, {@code recompensaGlobal} y
 * {@code feromonaInicial} se toman de {@link ParametrosPlanificador} y
 * respetan la nomenclatura fijada en STD 4.6.2.
 *
 * <p>No debe referenciar al subpaquete {@code planificador.agaestw}.</p>
 */
@Component
public class PlanificadorIACO implements Planificador {

    private final ParametrosPlanificador parametrosPlanificador;
    private final Grafo grafo;
    private final EvaluadorCosto evaluadorCosto;
    private final RestriccionesPlanificacion restriccionesPlanificacion;
    private final GeneradorAleatorio generadorAleatorio;

    public PlanificadorIACO(
            ParametrosPlanificador parametrosPlanificador,
            Grafo grafo,
            EvaluadorCosto evaluadorCosto,
            RestriccionesPlanificacion restriccionesPlanificacion,
            GeneradorAleatorio generadorAleatorio) {
        this.parametrosPlanificador = parametrosPlanificador;
        this.grafo = grafo;
        this.evaluadorCosto = evaluadorCosto;
        this.restriccionesPlanificacion = restriccionesPlanificacion;
        this.generadorAleatorio = generadorAleatorio;
    }

    @Override
    public PlanRutas planificarRutas(
            List<Pedido> pedidosPendientes,
            List<UnidadTransporte> unidadesDisponibles,
            List<Almacen> almacenes,
            List<Bloqueo> bloqueosVigentes,
            int minutoSimulacion) {
        grafo.aplicarBloqueosVigentes(bloqueosVigentes);
        // TODO: construccion de soluciones por hormigas, actualizacion de
        // feromona con pesoFeromona, pesoHeuristicaCosto y pesoUrgencia, y
        // evaporacion segun tasaEvaporacion (informe 21.dis.selec.algoritmos).
        return new PlanRutas(minutoSimulacion);
    }

    @Override
    public PlanRutas replanificarPorBloqueo(PlanRutas planVigente, Bloqueo bloqueo, int minutoSimulacion) {
        grafo.aplicarBloqueosVigentes(List.of(bloqueo));
        // TODO: reconstruccion parcial de las rutas afectadas por el tramo bloqueado.
        return new PlanRutas(minutoSimulacion);
    }
}
