package pe.edu.pucp.paqrap.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ConversorInstanteTest {

    @Test
    void convierteElPrimerMinutoDelMesCorrectamente() {
        assertEquals(0, ConversorInstante.aMinutoSimulacion("01d00h00m"));
    }

    @Test
    void aplicaLaFormulaDiaHoraMinuto() {
        // dia 2, hora 3, minuto 4 -> (2-1)*1440 + 3*60 + 4 = 1624
        assertEquals(1624, ConversorInstante.aMinutoSimulacion("02d03h04m"));
    }

    @Test
    void rechazaUnFormatoInvalido() {
        assertThrows(IllegalArgumentException.class, () -> ConversorInstante.aMinutoSimulacion("formato-invalido"));
    }
}
