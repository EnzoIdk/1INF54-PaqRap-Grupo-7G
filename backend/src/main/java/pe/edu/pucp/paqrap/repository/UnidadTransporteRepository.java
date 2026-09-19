package pe.edu.pucp.paqrap.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

import java.util.Optional;

public interface UnidadTransporteRepository extends JpaRepository<UnidadTransporte, Long> {

    Optional<UnidadTransporte> findByCodigo(String codigo);
}
