package pe.edu.pucp.paqrap.planificador;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ParametrosPlanificador;
import pe.edu.pucp.paqrap.planificador.agaestw.PlanificadorAgaEsTw;
import pe.edu.pucp.paqrap.planificador.iaco.PlanificadorIACO;

/**
 * Resuelve la implementacion activa de {@link Planificador} a partir del
 * parametro {@code paqrap.planificador.algoritmoActivo}. Ningun componente
 * debe instanciar un algoritmo con {@code new} fuera de esta clase
 * (STD 4.6.1).
 */
@Component
public class SelectorPlanificador {

    private final ParametrosPlanificador parametrosPlanificador;
    private final PlanificadorIACO planificadorIACO;
    private final PlanificadorAgaEsTw planificadorAgaEsTw;

    public SelectorPlanificador(
            ParametrosPlanificador parametrosPlanificador,
            PlanificadorIACO planificadorIACO,
            PlanificadorAgaEsTw planificadorAgaEsTw) {
        this.parametrosPlanificador = parametrosPlanificador;
        this.planificadorIACO = planificadorIACO;
        this.planificadorAgaEsTw = planificadorAgaEsTw;
    }

    public Planificador obtenerPlanificadorActivo() {
        return switch (parametrosPlanificador.algoritmoActivo().toUpperCase()) {
            case "IACO" -> planificadorIACO;
            case "AGAESTW" -> planificadorAgaEsTw;
            default -> throw new IllegalStateException(
                    "Algoritmo activo no reconocido: " + parametrosPlanificador.algoritmoActivo());
        };
    }
}
