package pe.edu.pucp.paqrap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CredencialesRequest(
        @NotBlank @Size(min = 3, max = 40) String username,
        @NotBlank @Size(min = 12, max = 72) String password) {
}
