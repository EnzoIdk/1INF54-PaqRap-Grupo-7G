package pe.edu.pucp.paqrap.controller;

import java.security.Principal;
import java.util.List;
import java.util.function.Supplier;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import pe.edu.pucp.paqrap.config.ParametrosAlmacen;
import pe.edu.pucp.paqrap.config.ParametrosFlota;
import pe.edu.pucp.paqrap.config.ParametrosOperacion;
import pe.edu.pucp.paqrap.config.ParametrosPlanificador;
import pe.edu.pucp.paqrap.dto.ExperimentacionResponse;
import pe.edu.pucp.paqrap.experimentacion.CatalogoDatos;
import pe.edu.pucp.paqrap.experimentacion.LimitadorPlanificador;
import pe.edu.pucp.paqrap.experimentacion.RegistroSimulaciones;
import pe.edu.pucp.paqrap.experimentacion.ParametrosEjecucion;
import pe.edu.pucp.paqrap.experimentacion.ServicioExperimentacion;

/**
 * Expone la experimentacion numerica al visualizador: que conjuntos de
 * datos del cliente estan disponibles, con que parametros trabaja el
 * planificador y cual es el resultado de resolver un turno con cada
 * algoritmo. No contiene logica de negocio; delega en
 * {@link ServicioExperimentacion} (STD 4.3).
 *
 * <p>Cada corrida pasa por {@link LimitadorPlanificador}, que acota cuantas
 * se resuelven a la vez, y queda en {@link RegistroSimulaciones} para que
 * otros navegadores la abran; su identificador va en la cabecera
 * {@code X-Simulacion-Id}.
 */
@RestController
@RequestMapping("/api/experimentacion")
public class ExperimentacionController {

    private final ServicioExperimentacion servicioExperimentacion;
    private final ParametrosPlanificador parametrosPlanificador;
    private final ParametrosOperacion parametrosOperacion;
    private final LimitadorPlanificador limitador;
    private final RegistroSimulaciones registro;

    public ExperimentacionController(ServicioExperimentacion servicioExperimentacion,
                                     ParametrosPlanificador parametrosPlanificador,
                                     ParametrosOperacion parametrosOperacion,
                                     LimitadorPlanificador limitador,
                                     RegistroSimulaciones registro) {
        this.servicioExperimentacion = servicioExperimentacion;
        this.parametrosPlanificador = parametrosPlanificador;
        this.parametrosOperacion = parametrosOperacion;
        this.limitador = limitador;
        this.registro = registro;
    }

    /** Conjuntos de datos del cliente disponibles, ordenados cronologicamente. */
    @GetMapping("/datos")
    public List<CatalogoDatos.ConjuntoDatos> listarConjuntos() {
        return servicioExperimentacion.listarConjuntos();
    }

    /**
     * Parametros vigentes del planificador, de la flota y de los almacenes.
     * El visualizador los muestra en la pantalla de configuracion y nunca
     * los declara por su cuenta (STD 5.6).
     */
    @GetMapping("/parametros")
    public ParametrosVigentes obtenerParametros() {
        return new ParametrosVigentes(
                parametrosPlanificador, parametrosOperacion.flota(), parametrosOperacion.almacen());
    }

    /** Resuelve un turno con el I-ACO, con el AGA-ES-TW o con ambos. */
    @PostMapping("/ejecutar")
    public ResponseEntity<ExperimentacionResponse> ejecutar(
            @Valid @RequestBody ParametrosEjecucion parametros,
            @RequestParam(name = "modo", defaultValue = "1D") String modo,
            Principal usuario) {
        String modoRegistrado = "DIA_A_DIA".equals(modo) ? "DIA_A_DIA" : "1D";
        return planificarYCompartir(modoRegistrado, usuario, () -> servicioExperimentacion.ejecutar(parametros));
    }

    /** Resuelve una simulacion continua de 5 dias con el I-ACO, con el AGA-ES-TW o con ambos. */
    @PostMapping("/ejecutar-5d")
    public ResponseEntity<ExperimentacionResponse> ejecutarCincoDias(
            @Valid @RequestBody pe.edu.pucp.paqrap.experimentacion.ParametrosCincoDias parametros,
            Principal usuario) {
        return planificarYCompartir("5D", usuario, () -> servicioExperimentacion.ejecutarCincoDias(parametros));
    }

    /** Resuelve una simulacion continua hasta alcanzar el colapso con el I-ACO, con el AGA-ES-TW o con ambos. */
    @PostMapping("/ejecutar-colapso")
    public ResponseEntity<ExperimentacionResponse> ejecutarColapso(
            @Valid @RequestBody pe.edu.pucp.paqrap.experimentacion.ParametrosColapso parametros,
            Principal usuario) {
        return planificarYCompartir("COLAPSO", usuario, () -> servicioExperimentacion.ejecutarColapso(parametros));
    }

    private ResponseEntity<ExperimentacionResponse> planificarYCompartir(
            String modo, Principal usuario, Supplier<ExperimentacionResponse> corrida) {
        ExperimentacionResponse resultado = limitador.ejecutar(corrida);
        String id = registro.registrar(modo, usuario != null ? usuario.getName() : "anonimo", resultado);
        return ResponseEntity.ok()
                .header("X-Simulacion-Id", id)
                .body(resultado);
    }

    /**
     * @param planificador parametros de las dos metaheuristicas
     * @param flota velocidades, capacidades, costos y tamano de la flota
     * @param almacen ubicaciones, stock y umbrales del semaforo
     */
    public record ParametrosVigentes(
            ParametrosPlanificador planificador,
            ParametrosFlota flota,
            ParametrosAlmacen almacen) {
    }
}
