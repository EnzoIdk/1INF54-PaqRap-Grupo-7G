package pe.edu.pucp.paqrap.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.edu.pucp.paqrap.enums.EstadoUnidad;
import pe.edu.pucp.paqrap.enums.TipoAveria;
import pe.edu.pucp.paqrap.model.Averia;
import pe.edu.pucp.paqrap.model.UnidadTransporte;
import pe.edu.pucp.paqrap.repository.UnidadTransporteRepository;

/**
 * Registra averias de unidades de transporte y dispara la reasignacion de
 * la carga critica que quede pendiente (STD 4.3, 4.4.3).
 */
@Service
public class AveriaService {

    private static final Logger log = LoggerFactory.getLogger(AveriaService.class);

    private final UnidadTransporteRepository unidadTransporteRepository;

    public AveriaService(UnidadTransporteRepository unidadTransporteRepository) {
        this.unidadTransporteRepository = unidadTransporteRepository;
    }

    public Averia registrarAveria(UnidadTransporte unidadTransporte, TipoAveria tipo, int minutoSimulacion) {
        unidadTransporte.setEstado(EstadoUnidad.AVERIADA);
        unidadTransporteRepository.save(unidadTransporte);
        log.warn("Unidad {} sufrio averia {} en el minuto {}", unidadTransporte.getCodigo(), tipo, minutoSimulacion);
        return new Averia(unidadTransporte, tipo, minutoSimulacion);
    }

    public void reasignarCargaCritica(Averia averia) {
        log.info("Reasignando carga critica de la unidad {}", averia.getUnidadTransporte().getCodigo());
        // La logica de reasignacion se resuelve en conjunto con el planificador activo.
    }
}
