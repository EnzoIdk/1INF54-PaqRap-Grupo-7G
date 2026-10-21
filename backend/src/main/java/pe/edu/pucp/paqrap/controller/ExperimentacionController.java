package pe.edu.pucp.paqrap.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import pe.edu.pucp.paqrap.config.ParametrosAlmacen;
import pe.edu.pucp.paqrap.config.ParametrosFlota;
import pe.edu.pucp.paqrap.config.ParametrosPlanificador;
import pe.edu.pucp.paqrap.dto.ExperimentacionResponse;
import pe.edu.pucp.paqrap.experimentacion.CatalogoDatos;
import pe.edu.pucp.paqrap.experimentacion.ParametrosEjecucion;
import pe.edu.pucp.paqrap.experimentacion.ServicioExperimentacion;

/**
 * Expone la experimentacion numerica al visualizador: que conjuntos de
 * datos del cliente estan disponibles, con que parametros trabaja el
 * planificador y cual es el resultado de resolver un turno con cada
 * algoritmo. No contiene logica de negocio; delega en
 * {@link ServicioExperimentacion} (STD 4.3).
 */
@RestController
@RequestMapping("/api/experimentacion")
public class ExperimentacionController {

    private final ServicioExperimentacion servicioExperimentacion;
    private final ParametrosPlanificador parametrosPlanificador;
    private final ParametrosFlota parametrosFlota;
    private final ParametrosAlmacen parametrosAlmacen;

    public ExperimentacionController(ServicioExperimentacion servicioExperimentacion,
                                     ParametrosPlanificador parametrosPlanificador,
                                     ParametrosFlota parametrosFlota,
                                     ParametrosAlmacen parametrosAlmacen) {
        this.servicioExperimentacion = servicioExperimentacion;
        this.parametrosPlanificador = parametrosPlanificador;
        this.parametrosFlota = parametrosFlota;
        this.parametrosAlmacen = parametrosAlmacen;
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
        return new ParametrosVigentes(parametrosPlanificador, parametrosFlota, parametrosAlmacen);
    }

    /** Resuelve un turno con el I-ACO, con el AGA-ES-TW o con ambos. */
    @PostMapping("/ejecutar")
    public ExperimentacionResponse ejecutar(@Valid @RequestBody ParametrosEjecucion parametros) {
        return servicioExperimentacion.ejecutar(parametros);
    }

    /** Resuelve una simulacion continua de 5 dias con el I-ACO, con el AGA-ES-TW o con ambos. */
    @PostMapping("/ejecutar-5d")
    public ExperimentacionResponse ejecutarCincoDias(@Valid @RequestBody pe.edu.pucp.paqrap.experimentacion.ParametrosCincoDias parametros) {
        return servicioExperimentacion.ejecutarCincoDias(parametros);
    }

    /** Resuelve una simulacion continua hasta alcanzar el colapso con el I-ACO, con el AGA-ES-TW o con ambos. */
    @PostMapping("/ejecutar-colapso")
    public ExperimentacionResponse ejecutarColapso(@Valid @RequestBody pe.edu.pucp.paqrap.experimentacion.ParametrosColapso parametros) {
        return servicioExperimentacion.ejecutarColapso(parametros);
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
