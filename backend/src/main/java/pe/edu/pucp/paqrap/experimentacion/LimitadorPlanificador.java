package pe.edu.pucp.paqrap.experimentacion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * Acota cuantas corridas del planificador se resuelven a la vez. Cada
 * corrida ocupa un nucleo durante segundos; si muchos navegadores ejecutan
 * a la vez, las que exceden la capacidad esperan su turno (en orden de
 * llegada) y, si la espera se alarga, se rechazan con 503 en lugar de
 * degradar a todas. Las consultas (abrir un plan compartido, reproducirlo)
 * no pasan por aqui.
 */
@Component
public class LimitadorPlanificador {

    private final int capacidad;
    private final long esperaMaximaSegundos;
    private final Semaphore permisos;
    private final AtomicInteger enEspera = new AtomicInteger();
    private final AtomicLong atendidas = new AtomicLong();
    private final AtomicLong rechazadas = new AtomicLong();

    public LimitadorPlanificador(
            @Value("${paqrap.concurrencia.ejecuciones-simultaneas:0}") int ejecucionesSimultaneas,
            @Value("${paqrap.concurrencia.espera-maxima-segundos:120}") long esperaMaximaSegundos) {
        this.capacidad = ejecucionesSimultaneas > 0
                ? ejecucionesSimultaneas
                : Math.max(1, Runtime.getRuntime().availableProcessors());
        this.esperaMaximaSegundos = esperaMaximaSegundos;
        this.permisos = new Semaphore(capacidad, true);
    }

    public <T> T ejecutar(Supplier<T> corrida) {
        enEspera.incrementAndGet();
        boolean obtenido;
        try {
            obtenido = permisos.tryAcquire(esperaMaximaSegundos, TimeUnit.SECONDS);
        } catch (InterruptedException interrupcion) {
            Thread.currentThread().interrupt();
            obtenido = false;
        } finally {
            enEspera.decrementAndGet();
        }
        if (!obtenido) {
            rechazadas.incrementAndGet();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El planificador está atendiendo otras simulaciones. Vuelve a intentarlo en unos segundos.");
        }
        try {
            return corrida.get();
        } finally {
            permisos.release();
            atendidas.incrementAndGet();
        }
    }

    public Estado estado() {
        return new Estado(capacidad, capacidad - permisos.availablePermits(), enEspera.get(),
                atendidas.get(), rechazadas.get());
    }

    /** Carga del planificador, para el visualizador y las pruebas de estres. */
    public record Estado(int capacidad, int enCurso, int enEspera, long atendidas, long rechazadas) {
    }
}
