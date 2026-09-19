package pe.edu.pucp.paqrap.planificador;

import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.PlanRutas;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

import java.util.List;

/**
 * Interfaz comun que deben implementar los dos algoritmos metaheuristicos
 * del caso (I-ACO y AGA-ES-TW). Ningun otro componente del sistema debe
 * depender de una implementacion concreta; la instancia activa se resuelve
 * mediante {@link SelectorPlanificador} (STD 4.6.1).
 */
public interface Planificador {

    /**
     * Calcula un plan de rutas para la flota disponible que atienda, en la
     * medida de lo posible, los pedidos pendientes dentro de su plazo
     * comprometido.
     *
     * @param pedidosPendientes pedidos aun no asignados a una ruta
     * @param unidadesDisponibles flota disponible para el minuto de planificacion
     * @param almacenes almacen central e intermedios con su stock actual
     * @param bloqueosVigentes bloqueos vigentes al minuto de planificacion
     * @param minutoSimulacion minuto de simulacion en que se ejecuta la planificacion
     * @return plan de rutas resultante
     */
    PlanRutas planificarRutas(
            List<Pedido> pedidosPendientes,
            List<UnidadTransporte> unidadesDisponibles,
            List<Almacen> almacenes,
            List<Bloqueo> bloqueosVigentes,
            int minutoSimulacion);

    /**
     * Recalcula el plan de rutas vigente ante un bloqueo que invalida uno o
     * mas tramos ya planificados.
     *
     * @param planVigente plan de rutas que se ve afectado por el bloqueo
     * @param bloqueo bloqueo que origina la replanificacion
     * @param minutoSimulacion minuto de simulacion en que se detecta el bloqueo
     * @return plan de rutas recalculado
     */
    PlanRutas replanificarPorBloqueo(PlanRutas planVigente, Bloqueo bloqueo, int minutoSimulacion);
}
