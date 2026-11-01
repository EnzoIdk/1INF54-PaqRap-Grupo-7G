package pe.edu.pucp.paqrap.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.edu.pucp.paqrap.service.LimitadorIntentosLogin;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

/**
 * Corta con 429 los intentos de inicio de sesion de un usuario o una IP
 * bloqueados por exceso de fallos, antes de comprobar la contrasena.
 */
public class FiltroIntentosLogin extends OncePerRequestFilter {

    private final LimitadorIntentosLogin limitador;
    private final ObjectMapper objectMapper;
    private final String rutaLogin;

    public FiltroIntentosLogin(LimitadorIntentosLogin limitador, ObjectMapper objectMapper, String rutaLogin) {
        this.limitador = limitador;
        this.objectMapper = objectMapper;
        this.rutaLogin = rutaLogin;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String ruta = request.getRequestURI().substring(request.getContextPath().length());
        return !"POST".equals(request.getMethod()) || !rutaLogin.equals(ruta);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Optional<Duration> bloqueo = limitador.bloqueoVigente(request.getParameter("username"), request.getRemoteAddr());
        if (bloqueo.isEmpty()) {
            chain.doFilter(request, response);
            return;
        }
        responderBloqueo(objectMapper, response, bloqueo.get());
    }

    static void responderBloqueo(ObjectMapper mapper, HttpServletResponse response, Duration restante)
            throws IOException {
        long segundos = Math.max(1, restante.toSeconds());
        long minutos = Math.max(1, (segundos + 59) / 60);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(segundos));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getWriter(), Map.of(
                "message", "Demasiados intentos fallidos. Por seguridad, el acceso queda bloqueado "
                        + minutos + (minutos == 1 ? " minuto." : " minutos."),
                "reintentarEnSegundos", segundos));
    }
}
