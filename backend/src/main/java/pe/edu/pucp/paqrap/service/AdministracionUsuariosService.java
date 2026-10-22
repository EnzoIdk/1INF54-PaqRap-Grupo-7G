package pe.edu.pucp.paqrap.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pe.edu.pucp.paqrap.dto.CrearUsuarioRequest;
import pe.edu.pucp.paqrap.enums.RolUsuario;
import pe.edu.pucp.paqrap.model.Usuario;
import pe.edu.pucp.paqrap.repository.UsuarioRepository;

import java.util.List;

@Service
public class AdministracionUsuariosService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public AdministracionUsuariosService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<Usuario> listar() {
        return usuarioRepository.findAllByOrderByUsernameAsc();
    }

    @Transactional
    public Usuario crear(CrearUsuarioRequest request) {
        String username = request.username().trim();
        if (usuarioRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese usuario ya existe");
        }
        return usuarioRepository.save(new Usuario(
                username,
                passwordEncoder.encode(request.password()),
                request.rol()));
    }

    @Transactional
    public Usuario cambiarEstado(Long id, boolean activo, String usuarioActual) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontro el usuario"));
        if (!activo && usuario.getUsername().equals(usuarioActual)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes desactivar tu propia cuenta");
        }
        if (!activo && usuario.isActivo() && usuario.getRol() == RolUsuario.ADMIN
                && usuarioRepository.countByRolAndActivoTrue(RolUsuario.ADMIN) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Debe quedar al menos un administrador activo");
        }
        usuario.setActivo(activo);
        return usuario;
    }
}
