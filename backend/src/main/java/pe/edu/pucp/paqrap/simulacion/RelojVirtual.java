package pe.edu.pucp.paqrap.simulacion;

import org.springframework.stereotype.Component;

/**
 * Reloj de la simulacion: mantiene el minuto simulado transcurrido desde el
 * inicio del mes, independiente del reloj real de la maquina (STD 3.3.1).
 */
@Component
public class RelojVirtual {

    private int minutoSimulacionActual;

    public void reiniciar(int minutoInicial) {
        this.minutoSimulacionActual = minutoInicial;
    }

    public void avanzar(int minutos) {
        this.minutoSimulacionActual += minutos;
    }

    public int getMinutoSimulacionActual() {
        return minutoSimulacionActual;
    }
}
