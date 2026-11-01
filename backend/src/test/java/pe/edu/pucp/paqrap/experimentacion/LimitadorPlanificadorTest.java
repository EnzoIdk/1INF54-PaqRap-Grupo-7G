package pe.edu.pucp.paqrap.experimentacion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Accesos simultaneos al planificador: nunca mas corridas a la vez que la capacidad. */
class LimitadorPlanificadorTest {

    @Test
    @DisplayName("Con 8 navegadores a la vez y capacidad 2, solo 2 corridas se resuelven en paralelo")
    void respetaLaCapacidad() throws Exception {
        LimitadorPlanificador limitador = new LimitadorPlanificador(2, 30);
        AtomicInteger enParalelo = new AtomicInteger();
        AtomicInteger maximoObservado = new AtomicInteger();
        ExecutorService navegadores = Executors.newFixedThreadPool(8);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Integer>> resultados = new ArrayList<>();
        for (int navegador = 0; navegador < 8; navegador++) {
            int id = navegador;
            resultados.add(navegadores.submit(() -> {
                salida.await();
                return limitador.ejecutar(() -> {
                    int actuales = enParalelo.incrementAndGet();
                    maximoObservado.accumulateAndGet(actuales, Math::max);
                    dormir(60);
                    enParalelo.decrementAndGet();
                    return id;
                });
            }));
        }
        salida.countDown();
        for (Future<Integer> resultado : resultados) {
            resultado.get(10, TimeUnit.SECONDS);
        }
        navegadores.shutdown();

        assertTrue(maximoObservado.get() <= 2, "corridas en paralelo: " + maximoObservado.get());
        assertEquals(8, limitador.estado().atendidas());
        assertEquals(0, limitador.estado().enCurso());
    }

    @Test
    @DisplayName("Si la espera supera el limite, la corrida se rechaza con 503 en vez de colgarse")
    void rechazaCuandoLaEsperaSeAlarga() throws Exception {
        LimitadorPlanificador limitador = new LimitadorPlanificador(1, 0);
        CountDownLatch ocupado = new CountDownLatch(1);
        CountDownLatch liberar = new CountDownLatch(1);
        Thread larga = new Thread(() -> limitador.ejecutar(() -> {
            ocupado.countDown();
            esperar(liberar);
            return null;
        }));
        larga.start();
        ocupado.await(5, TimeUnit.SECONDS);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> limitador.ejecutar(() -> "no deberia correr"));
        assertEquals(503, error.getStatusCode().value());
        assertEquals(1, limitador.estado().rechazadas());

        liberar.countDown();
        larga.join(5000);
    }

    private static void dormir(long milisegundos) {
        try {
            Thread.sleep(milisegundos);
        } catch (InterruptedException interrupcion) {
            Thread.currentThread().interrupt();
        }
    }

    private static void esperar(CountDownLatch senal) {
        try {
            senal.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException interrupcion) {
            Thread.currentThread().interrupt();
        }
    }
}
