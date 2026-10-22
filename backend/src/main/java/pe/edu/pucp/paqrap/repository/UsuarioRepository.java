package pe.edu.pucp.paqrap.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.paqrap.enums.RolUsuario;
import pe.edu.pucp.paqrap.model.Usuario;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsername(String username);

    boolean existsByUsername(String username);

    List<Usuario> findAllByOrderByUsernameAsc();

    long countByRolAndActivoTrue(RolUsuario rol);
}
