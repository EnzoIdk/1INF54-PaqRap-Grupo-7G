package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ParametrosPlanificador;

import java.util.Random;

/**
 * Unica fuente de aleatoriedad admitida dentro del planificador, construida
 * con la semilla de {@code paqrap.planificador.semillaAleatoria}. Ningun
 * algoritmo debe usar {@code Math.random()} (STD 4.6.3), de modo que la
 * comparacion entre el I-ACO y el AGA-ES-TW sea reproducible.
 */
@Component
public class GeneradorAleatorio {

    private final long semillaPorDefecto;
    private final Random random;

    public GeneradorAleatorio(ParametrosPlanificador parametrosPlanificador) {
        this.semillaPorDefecto = parametrosPlanificador.semillaAleatoria();
        this.random = new Random(semillaPorDefecto);
    }

    public Random obtener() {
        return random;
    }

    public long getSemillaPorDefecto() {
        return semillaPorDefecto;
    }

    /**
     * Genera una fuente independiente para una ejecucion concreta. Cada
     * ejecucion de la experimentacion numerica parte de su propia semilla,
     * de forma que repetir la ejecucion con la misma semilla devuelve
     * exactamente el mismo plan.
     */
    public Random crear(long semilla) {
        return new Random(semilla);
    }
}
