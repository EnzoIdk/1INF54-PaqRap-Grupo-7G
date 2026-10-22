package pe.edu.pucp.paqrap.dto;

import pe.edu.pucp.paqrap.enums.RolUsuario;
import pe.edu.pucp.paqrap.model.Usuario;

public record UsuarioResponse(Long id, String username, RolUsuario rol, boolean activo) {

    public static UsuarioResponse desde(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getUsername(), usuario.getRol(), usuario.isActivo());
    }
}
