package pe.edu.pucp.paqrap.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita los intentos fallidos de inicio de sesion para frenar la fuerza
 * bruta. Cuenta los fallos por usuario y por direccion IP dentro de una
 * ventana de tiempo; al llegar al maximo, bloquea temporalmente esa clave.
 *
 * <p>El conteo vive en memoria: basta para una sola instancia del backend y
 * se reinicia con el proceso, igual que las sesiones. Los fallos sobre
 * usuarios que no existen cuentan igual, para no revelar cuales existen.
 */
@Component
public class LimitadorIntentosLogin {

    /** Por encima de este tamano se purgan las claves cuya ventana y bloqueo ya vencieron. */
    private static final int CLAVES_ANTES_DE_PURGAR = 10_000;

    private final int maximoPorUsuario;
    private final int maximoPorIp;
    private final Duration ventana;
    private final Duration bloqueo;
    private final Clock reloj;

    private final Map<String, Registro> porUsuario = new ConcurrentHashMap<>();
    private final Map<String, Registro> porIp = new ConcurrentHashMap<>();

    @Autowired
    public LimitadorIntentosLogin(
            @Value("${paqrap.seguridad.login.maximo-intentos-usuario:5}") int maximoPorUsuario,
            @Value("${paqrap.seguridad.login.maximo-intentos-ip:20}") int maximoPorIp,
            @Value("${paqrap.seguridad.login.ventana-minutos:15}") long ventanaMinutos,
            @Value("${paqrap.seguridad.login.bloqueo-minutos:15}") long bloqueoMinutos) {
        this(maximoPorUsuario, maximoPorIp, Duration.ofMinutes(ventanaMinutos),
                Duration.ofMinutes(bloqueoMinutos), Clock.systemUTC());
    }

    LimitadorIntentosLogin(int maximoPorUsuario, int maximoPorIp, Duration ventana, Duration bloqueo, Clock reloj) {
        this.maximoPorUsuario = maximoPorUsuario;
        this.maximoPorIp = maximoPorIp;
        this.ventana = ventana;
        this.bloqueo = bloqueo;
        this.reloj = reloj;
    }

    /** Tiempo que falta para poder intentarlo de nuevo, si el usuario o la IP estan bloqueados. */
    public Optional<Duration> bloqueoVigente(String usuario, String ip) {
        Instant ahora = reloj.instant();
        Instant hasta = mayor(
                bloqueadoHasta(porUsuario, claveUsuario(usuario), ahora),
                bloqueadoHasta(porIp, claveIp(ip), ahora));
        return Optional.ofNullable(hasta).map(instante -> Duration.between(ahora, instante));
    }

    /**
     * Anota un intento fallido y devuelve cuantos le quedan a ese usuario
     * antes del bloqueo (0 = acaba de quedar bloqueado).
     */
    public int registrarFallo(String usuario, String ip) {
        Instant ahora = reloj.instant();
        purgarSiCrece(ahora);
        porIp.computeIfAbsent(claveIp(ip), clave -> new Registro()).fallar(ahora, maximoPorIp, ventana, bloqueo);
        return porUsuario.computeIfAbsent(claveUsuario(usuario), clave -> new Registro())
                .fallar(ahora, maximoPorUsuario, ventana, bloqueo);
    }

    /** Un ingreso correcto limpia los fallos acumulados de ese usuario. */
    public void registrarExito(String usuario) {
        porUsuario.remove(claveUsuario(usuario));
    }

    public Duration getBloqueo() {
        return bloqueo;
    }

    private static Instant bloqueadoHasta(Map<String, Registro> registros, String clave, Instant ahora) {
        Registro registro = registros.get(clave);
        return registro == null ? null : registro.bloqueadoHasta(ahora);
    }

    private static Instant mayor(Instant a, Instant b) {
        if (a == null) {
            return b;
        }
        return b == null || a.isAfter(b) ? a : b;
    }

    private void purgarSiCrece(Instant ahora) {
        if (porUsuario.size() + porIp.size() < CLAVES_ANTES_DE_PURGAR) {
            return;
        }
        porUsuario.values().removeIf(registro -> registro.vencido(ahora, ventana));
        porIp.values().removeIf(registro -> registro.vencido(ahora, ventana));
    }

    private static String claveUsuario(String usuario) {
        String limpio = usuario == null ? "" : usuario.trim().toLowerCase(Locale.ROOT);
        return limpio.length() > 80 ? limpio.substring(0, 80) : limpio;
    }

    private static String claveIp(String ip) {
        return ip == null ? "desconocida" : ip;
    }

    /** Fallos de una clave dentro de la ventana vigente y, si corresponde, hasta cuando esta bloqueada. */
    private static final class Registro {

        private int fallos;
        private Instant inicioVentana;
        private Instant bloqueadoHasta;

        synchronized Instant bloqueadoHasta(Instant ahora) {
            return bloqueadoHasta != null && ahora.isBefore(bloqueadoHasta) ? bloqueadoHasta : null;
        }

        synchronized int fallar(Instant ahora, int maximo, Duration ventana, Duration bloqueo) {
            if (bloqueadoHasta != null && !ahora.isBefore(bloqueadoHasta)) {
                bloqueadoHasta = null;
                inicioVentana = null;
            }
            if (inicioVentana == null || !ahora.isBefore(inicioVentana.plus(ventana))) {
                inicioVentana = ahora;
                fallos = 0;
            }
            fallos++;
            if (fallos >= maximo) {
                bloqueadoHasta = ahora.plus(bloqueo);
            }
            return Math.max(0, maximo - fallos);
        }

        synchronized boolean vencido(Instant ahora, Duration ventana) {
            boolean sinBloqueo = bloqueadoHasta == null || !ahora.isBefore(bloqueadoHasta);
            boolean sinVentana = inicioVentana == null || !ahora.isBefore(inicioVentana.plus(ventana));
            return sinBloqueo && sinVentana;
        }
    }
}
