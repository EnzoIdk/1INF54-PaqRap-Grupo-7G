package pe.edu.pucp.paqrap.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import pe.edu.pucp.paqrap.model.EstadoInicial;

import java.util.Optional;

public interface EstadoInicialRepository extends JpaRepository<EstadoInicial, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select estado from EstadoInicial estado where estado.id = 1")
    Optional<EstadoInicial> findForUpdate();
}
