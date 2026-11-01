package pe.edu.pucp.paqrap.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import pe.edu.pucp.paqrap.dto.ExperimentacionResponse;
import pe.edu.pucp.paqrap.experimentacion.LimitadorPlanificador;
import pe.edu.pucp.paqrap.experimentacion.RegistroSimulaciones;

import java.util.List;

/**
 * Simulaciones planificadas que otros navegadores pueden abrir y reproducir
 * de forma independiente (rubrica C05, C06, G06), y la carga actual del
 * planificador.
 */
@RestController
@RequestMapping("/api/simulaciones-compartidas")
public class SimulacionesCompartidasController {

    private final RegistroSimulaciones registro;
    private final LimitadorPlanificador limitador;

    public SimulacionesCompartidasController(RegistroSimulaciones registro, LimitadorPlanificador limitador) {
        this.registro = registro;
        this.limitador = limitador;
    }

    @GetMapping
    public List<RegistroSimulaciones.ResumenSimulacion> listar() {
        return registro.listar();
    }

    @GetMapping("/estado")
    public LimitadorPlanificador.Estado estado() {
        return limitador.estado();
    }

    @GetMapping("/{id}")
    public ExperimentacionResponse obtener(@PathVariable String id) {
        return registro.obtener(id)
                .map(RegistroSimulaciones.SimulacionCompartida::resultado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Esa simulación ya no está disponible; ejecuta una nueva desde la Consola."));
    }
}
