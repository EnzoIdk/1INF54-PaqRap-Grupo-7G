package pe.edu.pucp.paqrap.planificador.agaestw;

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
 * Adaptive Genetic Algorithm with Elastic Strategy and Time Windows
 * (AGA-ES-TW), la segunda solucion algoritmica metaheuristica exigida por
 * el caso (STD 4.6). Los parametros {@code tamanoPoblacion},
 * {@code numGeneraciones}, {@code porcentajeElitismo},
 * {@code penalidadPlazo} y {@code penalidadCapacidad} se toman de
 * {@link ParametrosPlanificador} y respetan la nomenclatura fijada en
 * STD 4.6.2.
 *
 * <p>No debe referenciar al subpaquete {@code planificador.iaco}.</p>
 */
@Component
public class PlanificadorAgaEsTw implements Planificador {

    private final ParametrosPlanificador parametrosPlanificador;
    private final Grafo grafo;
    private final EvaluadorCosto evaluadorCosto;
    private final RestriccionesPlanificacion restriccionesPlanificacion;
    private final GeneradorAleatorio generadorAleatorio;

    public PlanificadorAgaEsTw(
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
        // TODO: evolucion de la poblacion de individuos durante numGeneraciones,
        // aplicando porcentajeElitismo y las penalidades de plazo y capacidad
        // (informe 21.dis.selec.algoritmos).
        return new PlanRutas(minutoSimulacion);
    }

    @Override
    public PlanRutas replanificarPorBloqueo(PlanRutas planVigente, Bloqueo bloqueo, int minutoSimulacion) {
        grafo.aplicarBloqueosVigentes(List.of(bloqueo));
        // TODO: reconstruccion parcial de las rutas afectadas por el tramo bloqueado.
        return new PlanRutas(minutoSimulacion);
    }
}
