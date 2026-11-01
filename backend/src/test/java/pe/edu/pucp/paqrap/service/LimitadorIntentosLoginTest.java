package pe.edu.pucp.paqrap.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Pruebas de seguridad del login: limite de intentos fallidos y bloqueo temporal. */
class LimitadorIntentosLoginTest {

    private static final String IP = "10.0.0.7";

    private final RelojManual reloj = new RelojManual();
    private final LimitadorIntentosLogin limitador = new LimitadorIntentosLogin(
            5, 20, Duration.ofMinutes(15), Duration.ofMinutes(15), reloj);

    @Test
    @DisplayName("Avisa cuantos intentos quedan y bloquea al quinto fallo")
    void bloqueaAlQuintoFallo() {
        for (int intento = 1; intento <= 4; intento++) {
            assertEquals(5 - intento, limitador.registrarFallo("operador", IP));
            assertTrue(limitador.bloqueoVigente("operador", IP).isEmpty());
        }
        assertEquals(0, limitador.registrarFallo("operador", IP));
        assertTrue(limitador.bloqueoVigente("operador", IP).isPresent());
    }

    @Test
    @DisplayName("El bloqueo dura lo configurado y luego se puede volver a intentar")
    void elBloqueoVence() {
        for (int intento = 0; intento < 5; intento++) {
            limitador.registrarFallo("operador", IP);
        }
        reloj.avanzar(Duration.ofMinutes(14));
        assertTrue(limitador.bloqueoVigente("operador", IP).isPresent());
        reloj.avanzar(Duration.ofMinutes(1));
        assertTrue(limitador.bloqueoVigente("operador", IP).isEmpty());
        assertEquals(4, limitador.registrarFallo("operador", IP));
    }

    @Test
    @DisplayName("Los fallos fuera de la ventana no se acumulan")
    void laVentanaReiniciaElConteo() {
        for (int intento = 0; intento < 4; intento++) {
            limitador.registrarFallo("operador", IP);
        }
        reloj.avanzar(Duration.ofMinutes(16));
        assertEquals(4, limitador.registrarFallo("operador", IP));
    }

    @Test
    @DisplayName("Un ingreso correcto limpia los fallos del usuario, sin distinguir mayusculas")
    void elExitoLimpiaLosFallos() {
        limitador.registrarFallo("Operador", IP);
        limitador.registrarFallo("operador ", IP);
        limitador.registrarExito("OPERADOR");
        assertEquals(4, limitador.registrarFallo("operador", IP));
    }

    @Test
    @DisplayName("Una misma IP que prueba muchos usuarios tambien queda bloqueada")
    void bloqueaPorIp() {
        for (int intento = 0; intento < 20; intento++) {
            limitador.registrarFallo("usuario" + intento, IP);
        }
        assertTrue(limitador.bloqueoVigente("otro.usuario", IP).isPresent());
        assertFalse(limitador.bloqueoVigente("otro.usuario", "10.0.0.8").isPresent());
    }

    /** Reloj que solo avanza cuando la prueba lo pide. */
    private static final class RelojManual extends Clock {

        private Instant ahora = Instant.parse("2026-10-31T12:00:00Z");

        void avanzar(Duration duracion) {
            ahora = ahora.plus(duracion);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return ahora;
        }
    }
}
