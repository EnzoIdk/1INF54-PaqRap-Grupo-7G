package pe.edu.pucp.paqrap.planificador.comun;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.Pedido;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regla de tiempo que comparten los dos algoritmos (RF-04): ninguna entrega
 * antes de que su pedido se registre, postergando la salida del almacen sin
 * dejar fuera de plazo las paradas ya aceptadas.
 */
class RelojRutaTest {

    private static final int SIETE = 7 * 60;

    private static Pedido pedido(int registro, int plazoHoras) {
        return new Pedido("c1", new Nodo(1, 1), 1, plazoHoras, registro);
    }

    @Test
    void laSalidaEsperaAlUltimoPedidoRegistrado() {
        assertEquals(SIETE + 200, RelojRuta.minutoSalida(SIETE, List.of(pedido(SIETE - 30, 36), pedido(SIETE + 200, 8))));
        assertEquals(SIETE, RelojRuta.minutoSalida(SIETE, List.of(pedido(SIETE - 30, 36))));
        assertEquals(SIETE, RelojRuta.minutoSalida(SIETE, List.of()));
    }

    @Test
    void unaUnidadOcupadaNoSaleAntesDeQuedarLibre() {
        assertEquals(SIETE + 500, RelojRuta.minutoSalida(SIETE + 500, List.of(pedido(SIETE + 100, 36))));
    }

    @Test
    void unPedidoPosteriorPostergaLaSalidaYTodasLasParadas() {
        RelojRuta reloj = new RelojRuta(SIETE);
        reloj.agregar(pedido(SIETE, 36), 30);
        assertEquals(SIETE + 90, reloj.getMinuto(), "30 min de viaje y 1 h de entrega");

        Pedido tardio = pedido(SIETE + 180, 36);
        assertEquals(180, reloj.postergacionPara(tardio));
        assertEquals(SIETE + 90 + 180 + 20, reloj.llegadaA(tardio, 20));

        reloj.agregar(tardio, 20);
        assertEquals(SIETE + 180, reloj.getMinutoSalida());
        assertEquals(SIETE + 90 + 180 + 20 + 60, reloj.getMinuto());
        assertEquals(30 + 60 + 20 + 60, reloj.getMinutosTrabajados(), "la espera en el almacen no es trabajo");
    }

    @Test
    void noAdmitePostergarSiUnaParadaAceptadaQuedariaFueraDePlazo() {
        RelojRuta reloj = new RelojRuta(SIETE);
        // Plazo de 4 h: vence a las 11:00 y se llega a las 07:30, con 210 min de holgura.
        reloj.agregar(pedido(SIETE, 4), 30);

        assertTrue(reloj.admitePostergacion(pedido(SIETE + 210, 36)), "postergar justo la holgura es valido");
        assertFalse(reloj.admitePostergacion(pedido(SIETE + 211, 36)), "un minuto mas deja fuera de plazo la primera");
    }

    @Test
    void ningunaLlegadaQuedaAntesDelRegistro() {
        RelojRuta reloj = new RelojRuta(SIETE);
        List<Pedido> pedidos = List.of(pedido(SIETE + 300, 36), pedido(SIETE, 36), pedido(SIETE + 420, 36));
        for (Pedido actual : pedidos) {
            double llegada = reloj.llegadaA(actual, 15);
            reloj.agregar(actual, 15);
            assertTrue(llegada >= actual.getMinutoSimulacion());
        }
        assertEquals(SIETE + 420, reloj.getMinutoSalida());
    }
}
