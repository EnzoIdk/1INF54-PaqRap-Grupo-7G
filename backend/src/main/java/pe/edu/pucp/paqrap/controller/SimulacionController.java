package pe.edu.pucp.paqrap.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.paqrap.enums.TipoEscenario;
import pe.edu.pucp.paqrap.simulacion.MotorSimulacion;

/**
 * Recibe las solicitudes del visualizador para iniciar y controlar los
 * escenarios de simulacion. No contiene logica de negocio; delega en
 * {@link MotorSimulacion} (STD 4.3).
 */
@RestController
@RequestMapping("/api/simulacion")
public class SimulacionController {

    private final MotorSimulacion motorSimulacion;

    public SimulacionController(MotorSimulacion motorSimulacion) {
        this.motorSimulacion = motorSimulacion;
    }

    @PostMapping("/{tipoEscenario}/iniciar")
    public ResponseEntity<Void> iniciarEscenario(@PathVariable TipoEscenario tipoEscenario) {
        motorSimulacion.iniciarEscenario(tipoEscenario);
        return ResponseEntity.accepted().build();
    }
}
