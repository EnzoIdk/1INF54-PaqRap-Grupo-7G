package pe.edu.pucp.paqrap.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Pruebas de seguridad del login: politica de contrasena segura. */
class PoliticaContrasenaTest {

    @Test
    @DisplayName("Acepta una contrasena larga con minuscula, mayuscula, numero y simbolo")
    void aceptaContrasenaSegura() {
        assertTrue(PoliticaContrasena.incumplimientos("operador", "Rutas.Lima-2026#").isEmpty());
        assertDoesNotThrow(() -> PoliticaContrasena.exigir("operador", "Rutas.Lima-2026#"));
    }

    @ParameterizedTest(name = "{1} -> falta: {2}")
    @CsvSource({
            "operador, Ab1#corta, entre 12",
            "operador, rutaslima-2026#, mayúscula",
            "operador, RUTASLIMA-2026#, minúscula",
            "operador, Rutas.Lima-Sur#, número",
            "operador, RutasLima20261, símbolo",
            "operador, Rutaaaas.Lima-2026, repetir",
            "operador, Mi.Operador-2026, nombre de usuario",
            "operador, MiPassword.2026, palabras comunes",
            "operador, Admin.Lima-2026, palabras comunes",
    })
    void rechazaContrasenaDebil(String usuario, String contrasena, String reglaEsperada) {
        assertTrue(PoliticaContrasena.incumplimientos(usuario, contrasena).stream()
                .anyMatch(regla -> regla.contains(reglaEsperada)));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> PoliticaContrasena.exigir(usuario, contrasena));
        assertTrue(error.getReason().startsWith("La contraseña no es segura"));
    }

    @Test
    @DisplayName("Un nombre de usuario muy corto no invalida la contrasena por contenerlo")
    void ignoraUsuariosMuyCortos() {
        assertFalse(PoliticaContrasena.incumplimientos("ab", "Rutas.Lima-2026#ab").stream()
                .anyMatch(regla -> regla.contains("nombre de usuario")));
    }
}
