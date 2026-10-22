package pe.edu.pucp.paqrap.config;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.paqrap.exception.ParametrosInvalidosException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Cambio en caliente de los parametros de flota y almacenes (RF-39, RF-60, RF-61). */
class ParametrosOperacionTest {

    private static ParametrosFlota flota(int velocidadMoto) {
        return new ParametrosFlota(40, velocidadMoto, 12, 24, 8, 4, 8.0, 6.0, 3.0, 10, 15, 12);
    }

    private static ParametrosAlmacen almacen(double ambar, double rojo) {
        return new ParametrosAlmacen(1000, 0, ambar, rojo, 27, 14, 12, 38, 57, 27);
    }

    @Test
    void aplicaYRestableceLosValores() {
        ParametrosOperacion parametros = new ParametrosOperacion(flota(25), almacen(0.33, 0.66));
        parametros.actualizar(flota(30), almacen(0.4, 0.8));
        assertEquals(30, parametros.flota().velocidadKmhMoto());
        assertEquals(0.4, parametros.almacen().umbralAmbarPorcentaje());

        parametros.restablecer();
        assertEquals(25, parametros.flota().velocidadKmhMoto());
        assertEquals(0.33, parametros.almacen().umbralAmbarPorcentaje());
    }

    @Test
    void rechazaValoresFueraDeRangoSinCambiarNada() {
        ParametrosOperacion parametros = new ParametrosOperacion(flota(25), almacen(0.33, 0.66));
        assertThrows(ParametrosInvalidosException.class, () -> parametros.actualizar(flota(0), almacen(0.33, 0.66)));
        assertThrows(ParametrosInvalidosException.class, () -> parametros.actualizar(flota(25), almacen(0.7, 0.6)));
        assertEquals(25, parametros.flota().velocidadKmhMoto());
    }
}
