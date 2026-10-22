package pe.edu.pucp.paqrap.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.paqrap.config.ParametrosAlmacen;
import pe.edu.pucp.paqrap.config.ParametrosFlota;
import pe.edu.pucp.paqrap.config.ParametrosOperacion;
import pe.edu.pucp.paqrap.config.ParametrosPlanificador;

/**
 * Cambio "en caliente" de los parametros de la flota y de los almacenes:
 * velocidades, capacidades y costos por tipo de unidad, tamano de flota por
 * defecto, stock y rangos del semaforo (RF-39, RF-60, RF-61; Q&A 6 y 15).
 *
 * <p>Vive bajo {@code /api/admin}, de modo que {@code SeguridadConfig} solo
 * lo permite al rol ADMIN (RF-56). Un usuario normal solo puede leer los
 * valores vigentes en {@code GET /api/experimentacion/parametros}.</p>
 */
@RestController
@RequestMapping("/api/admin/parametros")
public class AdministracionParametrosController {

    private final ParametrosOperacion parametrosOperacion;
    private final ParametrosPlanificador parametrosPlanificador;

    public AdministracionParametrosController(ParametrosOperacion parametrosOperacion,
                                              ParametrosPlanificador parametrosPlanificador) {
        this.parametrosOperacion = parametrosOperacion;
        this.parametrosPlanificador = parametrosPlanificador;
    }

    @PutMapping
    public ExperimentacionController.ParametrosVigentes actualizar(@RequestBody ActualizarParametrosRequest request) {
        parametrosOperacion.actualizar(request.flota(), request.almacen());
        return vigentes();
    }

    @PostMapping("/restablecer")
    public ExperimentacionController.ParametrosVigentes restablecer() {
        parametrosOperacion.restablecer();
        return vigentes();
    }

    private ExperimentacionController.ParametrosVigentes vigentes() {
        return new ExperimentacionController.ParametrosVigentes(
                parametrosPlanificador, parametrosOperacion.flota(), parametrosOperacion.almacen());
    }

    /**
     * @param flota velocidades, capacidades, costos y tamano de flota por defecto
     * @param almacen stock, rangos del semaforo y ubicaciones de los almacenes
     */
    public record ActualizarParametrosRequest(ParametrosFlota flota, ParametrosAlmacen almacen) {
    }
}
