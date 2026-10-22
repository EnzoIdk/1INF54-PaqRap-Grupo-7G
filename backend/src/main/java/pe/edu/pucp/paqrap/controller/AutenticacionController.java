package pe.edu.pucp.paqrap.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import pe.edu.pucp.paqrap.dto.CredencialesRequest;
import pe.edu.pucp.paqrap.dto.UsuarioResponse;
import pe.edu.pucp.paqrap.model.Usuario;
import pe.edu.pucp.paqrap.repository.UsuarioRepository;
import pe.edu.pucp.paqrap.service.AutenticacionService;

@RestController
@RequestMapping("/api/auth")
public class AutenticacionController {

    private final AutenticacionService autenticacionService;
    private final UsuarioRepository usuarioRepository;

    public AutenticacionController(AutenticacionService autenticacionService,
                                   UsuarioRepository usuarioRepository) {
        this.autenticacionService = autenticacionService;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    @GetMapping("/setup-status")
    public SetupStatus estadoConfiguracion() {
        return new SetupStatus(autenticacionService.requiereConfiguracionInicial());
    }

    @PostMapping("/setup")
    public void configurar(@Valid @RequestBody CredencialesRequest credenciales) {
        autenticacionService.crearAdministradorInicial(credenciales);
    }

    @GetMapping("/me")
    public UsuarioResponse usuarioActual(Authentication authentication) {
        Usuario usuario = usuarioRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return UsuarioResponse.desde(usuario);
    }

    public record CsrfResponse(String headerName, String token) {
    }

    public record SetupStatus(boolean requiereConfiguracion) {
    }
}
