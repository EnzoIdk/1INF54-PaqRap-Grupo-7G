package pe.edu.pucp.paqrap.planificador.comun;

import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.model.Pedido;

import java.util.List;

/**
 * Reloj de una ruta mientras una metaheuristica la construye parada a parada.
 *
 * <p>Ninguna entrega puede ocurrir antes de que su pedido se registre
 * (RF-04): la unidad sale del almacen cuando ya existen todos los pedidos que
 * lleva, y nunca antes de quedar libre de su ruta anterior. Si el pedido que
 * se agrega se registra despues de la salida prevista, la salida se posterga
 * y todas las paradas ya aceptadas se corren el mismo tiempo; por eso se
 * lleva la holgura minima de esas paradas frente a su plazo.</p>
 *
 * <p>El I-ACO y el AGA-ES-TW construyen sus rutas con esta misma clase, y
 * {@link EnsambladorPlan} y {@link ConstructorRutas} fijan la salida con
 * {@link #minutoSalida}: los dos algoritmos se miden con la misma regla de
 * tiempo, como exige la comparacion numerica (STD 4.6.1).</p>
 */
public final class RelojRuta {

    private double minutoSalida;
    private double minuto;
    private double minutosTrabajados;
    private double holguraMinima = Double.POSITIVE_INFINITY;

    /** @param minutoDisponible primer minuto en que la unidad puede salir del almacen */
    public RelojRuta(double minutoDisponible) {
        this.minutoSalida = minutoDisponible;
        this.minuto = minutoDisponible;
    }

    /**
     * Minuto de salida de una ruta ya decidida: el mayor entre el minuto en que
     * la unidad puede salir y el registro del ultimo de sus pedidos.
     */
    public static int minutoSalida(int minutoDisponible, List<Pedido> pedidos) {
        int salida = minutoDisponible;
        for (Pedido pedido : pedidos) {
            salida = Math.max(salida, pedido.getMinutoSimulacion());
        }
        return salida;
    }

    /** Minutos que habria que postergar la salida para llevar tambien este pedido. */
    public double postergacionPara(Pedido pedido) {
        return Math.max(0.0, pedido.getMinutoSimulacion() - minutoSalida);
    }

    /** Las paradas ya aceptadas siguen en plazo aunque la salida se postergue por este pedido. */
    public boolean admitePostergacion(Pedido pedido) {
        return postergacionPara(pedido) <= holguraMinima;
    }

    /** Minuto de llegada al pedido si se agrega ahora, con la salida ya postergada. */
    public double llegadaA(Pedido pedido, double minutosViaje) {
        return minuto + postergacionPara(pedido) + minutosViaje;
    }

    /**
     * Agrega la parada: posterga la salida si hace falta y avanza el reloj con
     * el viaje y la hora de entrega, que ocupa a la unidad pero no cuenta en el plazo.
     */
    public void agregar(Pedido pedido, double minutosViaje) {
        double postergacion = postergacionPara(pedido);
        minutoSalida += postergacion;
        minuto += postergacion;
        holguraMinima -= postergacion;

        double llegada = minuto + minutosViaje;
        holguraMinima = Math.min(holguraMinima, pedido.getMinutoLimiteEntrega() - llegada);
        minuto = llegada + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;
        minutosTrabajados += minutosViaje + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;
    }

    /** Minuto en que la unidad queda libre tras la ultima parada aceptada. */
    public double getMinuto() {
        return minuto;
    }

    public double getMinutoSalida() {
        return minutoSalida;
    }

    /** Viaje y entregas acumulados; la espera en el almacen no es trabajo de la jornada. */
    public double getMinutosTrabajados() {
        return minutosTrabajados;
    }
}
