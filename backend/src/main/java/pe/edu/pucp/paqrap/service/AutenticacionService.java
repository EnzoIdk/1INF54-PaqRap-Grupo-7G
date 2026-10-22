package pe.edu.pucp.paqrap.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pe.edu.pucp.paqrap.dto.CredencialesRequest;
import pe.edu.pucp.paqrap.enums.RolUsuario;
import pe.edu.pucp.paqrap.model.EstadoInicial;
import pe.edu.pucp.paqrap.model.Usuario;
import pe.edu.pucp.paqrap.repository.EstadoInicialRepository;
import pe.edu.pucp.paqrap.repository.UsuarioRepository;

@Service
public class AutenticacionService {

    private final EstadoInicialRepository estadoInicialRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public AutenticacionService(EstadoInicialRepository estadoInicialRepository,
                               UsuarioRepository usuarioRepository,
                               PasswordEncoder passwordEncoder) {
        this.estadoInicialRepository = estadoInicialRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public boolean requiereConfiguracionInicial() {
        return estadoInicialRepository.findById(1)
                .map(estado -> !estado.isCompletado())
                .orElseThrow(() -> new IllegalStateException("No se inicializo el estado de autenticacion"));
    }

    @Transactional
    public void crearAdministradorInicial(CredencialesRequest credenciales) {
        EstadoInicial estado = estadoInicialRepository.findForUpdate()
                .orElseThrow(() -> new IllegalStateException("No se inicializo el estado de autenticacion"));
        if (estado.isCompletado() || usuarioRepository.count() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La configuración inicial ya fue completada");
        }

        String username = credenciales.username().trim();
        if (usuarioRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese usuario ya existe");
        }

        usuarioRepository.save(new Usuario(
                username,
                passwordEncoder.encode(credenciales.password()),
                RolUsuario.ADMIN));
        estado.completar();
    }
}
