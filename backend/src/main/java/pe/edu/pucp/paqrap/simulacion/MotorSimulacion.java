package pe.edu.pucp.paqrap.simulacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.enums.TipoEscenario;
import pe.edu.pucp.paqrap.model.PlanRutas;
import pe.edu.pucp.paqrap.planificador.SelectorPlanificador;

/**
 * Orquesta el avance del tiempo simulado y coordina los tres escenarios
 * (dia a dia, 5D y colapso) con el planificador activo, publicando los
 * eventos resultantes al visualizador por WebSocket (STD 4.2, 4.3).
 */
@Component
public class MotorSimulacion {

    private static final Logger log = LoggerFactory.getLogger(MotorSimulacion.class);

    private final SelectorPlanificador selectorPlanificador;
    private final SimpMessagingTemplate simpMessagingTemplate;

    public MotorSimulacion(SelectorPlanificador selectorPlanificador, SimpMessagingTemplate simpMessagingTemplate) {
        this.selectorPlanificador = selectorPlanificador;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    public void iniciarEscenario(TipoEscenario tipoEscenario) {
        log.info("Inicio del escenario {}", tipoEscenario);
        // TODO: bucle de avance del reloj virtual e invocacion periodica del
        // planificador activo, publicando el plan resultante en
        // /topic/{escenario}/rutas.
    }

    void publicarPlan(TipoEscenario tipoEscenario, PlanRutas planRutas) {
        String destino = "/topic/" + tipoEscenario.name().toLowerCase() + "/rutas";
        simpMessagingTemplate.convertAndSend(destino, planRutas);
    }
}
