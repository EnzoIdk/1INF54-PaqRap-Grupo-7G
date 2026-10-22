package pe.edu.pucp.paqrap.controller;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.paqrap.dto.CrearUsuarioRequest;
import pe.edu.pucp.paqrap.dto.EstadoUsuarioRequest;
import pe.edu.pucp.paqrap.dto.UsuarioResponse;
import pe.edu.pucp.paqrap.service.AdministracionUsuariosService;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdministracionUsuariosController {

    private final AdministracionUsuariosService administracionUsuariosService;

    public AdministracionUsuariosController(AdministracionUsuariosService administracionUsuariosService) {
        this.administracionUsuariosService = administracionUsuariosService;
    }

    @GetMapping
    public List<UsuarioResponse> listar() {
        return administracionUsuariosService.listar().stream().map(UsuarioResponse::desde).toList();
    }

    @PostMapping
    public UsuarioResponse crear(@Valid @RequestBody CrearUsuarioRequest request) {
        return UsuarioResponse.desde(administracionUsuariosService.crear(request));
    }

    @PatchMapping("/{id}/estado")
    public UsuarioResponse cambiarEstado(@PathVariable Long id,
                                         @Valid @RequestBody EstadoUsuarioRequest request,
                                         Authentication authentication) {
        return UsuarioResponse.desde(administracionUsuariosService.cambiarEstado(
                id, request.activo(), authentication.getName()));
    }
}
