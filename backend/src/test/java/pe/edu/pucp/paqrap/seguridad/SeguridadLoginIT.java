package pe.edu.pucp.paqrap.seguridad;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de seguridad del login de punta a punta (MockMvc sobre la cadena
 * de filtros real): contrasena segura en el alta, autenticacion obligatoria
 * para la API y limite de intentos con bloqueo temporal.
 *
 * <p>Usa su propia base H2 para que el administrador inicial que crea no
 * dependa del orden de las demas pruebas de integracion.
 */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:seguridad-login;DB_CLOSE_DELAY=-1;MODE=PostgreSQL")
@AutoConfigureMockMvc
@ActiveProfiles("local")
class SeguridadLoginIT {

    private static final String ADMIN = "admin.seguridad";
    private static final String CLAVE_SEGURA = "Rutas.Lima-2026#";

    @Autowired
    private MockMvc mvc;

    @Test
    @DisplayName("Sin sesion, la API y /api/auth/me responden 401 (no 500)")
    void exigeAutenticacion() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/experimentacion/datos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/parametros")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Alta con contrasena debil rechazada, login correcto, y bloqueo tras 5 fallos")
    void flujoCompletoDelLogin() throws Exception {
        mvc.perform(post("/api/auth/setup").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + ADMIN + "\",\"password\":\"clavesinmayusculas1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("no es segura")));

        mvc.perform(post("/api/auth/setup").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + ADMIN + "\",\"password\":\"" + CLAVE_SEGURA + "\"}"))
                .andExpect(status().isOk());

        MockHttpSession sesion = new MockHttpSession();
        mvc.perform(login(ADMIN, CLAVE_SEGURA).session(sesion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("ADMIN"));
        mvc.perform(get("/api/auth/me").session(sesion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(ADMIN));

        for (int intento = 1; intento <= 4; intento++) {
            mvc.perform(login(ADMIN, "Equivocada.2026#"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message", containsString("Te queda")));
        }
        mvc.perform(login(ADMIN, "Equivocada.2026#"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));

        // Bloqueado: ni siquiera la contrasena correcta entra hasta que venza el bloqueo.
        mvc.perform(login(ADMIN, CLAVE_SEGURA))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message", containsString("bloqueado")));
    }

    private static MockHttpServletRequestBuilder login(String usuario, String clave) {
        return post("/api/auth/login").with(csrf())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("username", usuario)
                .param("password", clave);
    }
}
