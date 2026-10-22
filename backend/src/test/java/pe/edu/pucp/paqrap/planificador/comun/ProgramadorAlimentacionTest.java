package pe.edu.pucp.paqrap.planificador.comun;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.ParadaRuta;
import pe.edu.pucp.paqrap.model.Pedido;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Reglas de la hora de alimentacion (RF-26, RF-27): una hora completa, al
 * menos una hora despues del cambio de turno y terminando al menos una hora
 * antes del siguiente, sin dejar fuera de plazo ninguna entrega.
 */
class ProgramadorAlimentacionTest {

    private static final int SIETE = 7 * 60;
    private final ProgramadorAlimentacion programador = new ProgramadorAlimentacion();

    private static ParadaRuta parada(int llegada, int plazoHoras, int registro) {
        Pedido pedido = new Pedido("c1", new Nodo(1, 1), 1, plazoHoras, registro);
        return new ParadaRuta(pedido, 1.0, llegada, llegada + 60);
    }

    @Test
    void inicioDelTurnoRespetaLosCambiosFijos() {
        assertEquals(SIETE, ProgramadorAlimentacion.inicioDelTurno(SIETE + 30));
        assertEquals(15 * 60, ProgramadorAlimentacion.inicioDelTurno(16 * 60));
        assertEquals(23 * 60, ProgramadorAlimentacion.inicioDelTurno(23 * 60 + 5));
        // Antes de las 07:00 del dia 2, el turno empezo a las 23:00 del dia 1.
        assertEquals(23 * 60, ProgramadorAlimentacion.inicioDelTurno(1440 + 3 * 60));
    }

    @Test
    void sinEntregasNoSeProgramaPausa() {
        assertNull(programador.programar(List.of(), SIETE));
    }

    @Test
    void siLaRutaTerminaDentroDeLaVentanaSeComeAlFinal() {
        // Turno 07:00-15:00: la ventana de inicio va de 08:00 a 13:00.
        var pausa = programador.programar(List.of(parada(SIETE + 120, 36, 0)), SIETE);
        assertEquals(SIETE + 180, pausa.minutoInicio());
        assertTrue(pausa.dentroDeVentana());
        assertFalse(pausa.desplazaParadas());
    }

    @Test
    void siLaRutaTerminaJustoAlAbrirLaVentanaSeComeEnEseMomento() {
        // Una entrega ocupa una hora: la ruta mas corta posible termina a las 08:00.
        var pausa = programador.programar(List.of(parada(SIETE, 36, 0)), SIETE);
        assertEquals(SIETE + 60, pausa.minutoInicio());
        assertTrue(pausa.dentroDeVentana());
        assertFalse(pausa.desplazaParadas());
    }

    @Test
    void siLaRutaEsLargaSeIntercalaSinPerjudicarEntregas() {
        // Termina a las 14:00, fuera de la ventana; la segunda entrega tiene holgura de sobra.
        var paradas = List.of(parada(SIETE + 90, 36, 0), parada(SIETE + 360, 36, 0));
        var pausa = programador.programar(paradas, SIETE);
        assertTrue(pausa.dentroDeVentana());
        assertTrue(pausa.desplazaParadas());
        assertEquals(0, pausa.despuesDeParada());
        assertEquals(SIETE + 150, pausa.minutoInicio());
    }

    @Test
    void conRetornoLargoSeComeAntesDeVolverAlAlmacen() {
        // Ultima entrega sale a las 12:00 y el retorno toma 2 h: llegaria a las 14:00,
        // fuera de la ventana; la pausa se toma al salir del cliente y solo retrasa el retorno.
        var paradas = List.of(parada(SIETE + 240, 36, 0));
        var pausa = programador.programar(paradas, SIETE, 120);
        assertTrue(pausa.dentroDeVentana());
        assertTrue(pausa.desplazaParadas());
        assertEquals(0, pausa.despuesDeParada());
        assertEquals(SIETE + 300, pausa.minutoInicio());
    }

    @Test
    void siSeLlegaAlAlmacenDentroDeLaVentanaSeComeEstacionado() {
        var pausa = programador.programar(List.of(parada(SIETE + 60, 36, 0)), SIETE, 45);
        assertEquals(SIETE + 165, pausa.minutoInicio());
        assertFalse(pausa.desplazaParadas());
    }

    @Test
    void siLaUnidadEsperaElRegistroDeSusPedidosSeComeDuranteLaEspera() {
        // Disponible a las 15:00, sale a las 17:30 porque su pedido se registra entonces;
        // termina a las 22:00, fuera de la ventana 16:00-21:00 del turno de las 15:00.
        int quince = 15 * 60;
        var paradas = List.of(parada(quince + 180, 36, quince + 150));
        var pausa = programador.programar(paradas, quince + 150, 180, quince);
        assertEquals(ProgramadorAlimentacion.EN_EL_ALMACEN, pausa.despuesDeParada());
        assertEquals(quince + 60, pausa.minutoInicio());
        assertTrue(pausa.dentroDeVentana());
        assertFalse(pausa.desplazaParadas(), "comer mientras espera no retrasa ninguna entrega");
    }

    @Test
    void siLaRutaCruzaElCambioDeTurnoComeElConductorSiguienteEnSuVentana() {
        // Sale a las 13:30 y vuelve a las 19:00: el conductor del turno de las 15:00
        // toma la unidad (Q&A 12) y come al llegar, dentro de su ventana 16:00-21:00.
        int salida = 13 * 60 + 30;
        var paradas = List.of(parada(14 * 60 + 30, 36, salida), parada(17 * 60, 36, salida));
        var pausa = programador.programar(paradas, salida, 60);
        assertEquals(19 * 60, pausa.minutoInicio());
        assertTrue(pausa.dentroDeVentana());
        assertFalse(pausa.desplazaParadas());
    }

    @Test
    void nuncaVuelveTardiaUnaEntregaQueCumplia() {
        // La segunda entrega llega 10 minutos antes de su limite: retrasarla una hora la incumpliria.
        int limite = SIETE + 370;
        var paradas = List.of(parada(SIETE + 90, 36, 0), parada(SIETE + 360, 4, limite - 4 * 60));
        var pausa = programador.programar(paradas, SIETE);
        assertFalse(pausa.desplazaParadas());
        assertFalse(pausa.dentroDeVentana());
        assertEquals(1, pausa.despuesDeParada());
    }
}
