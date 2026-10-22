package pe.edu.pucp.paqrap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pe.edu.pucp.paqrap.enums.RolUsuario;

public record CrearUsuarioRequest(
        @NotBlank @Size(min = 3, max = 40) String username,
        @NotBlank @Size(min = 12, max = 72) String password,
        @NotNull RolUsuario rol) {
}
