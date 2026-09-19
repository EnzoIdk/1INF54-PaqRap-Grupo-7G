package pe.edu.pucp.paqrap.model;

/**
 * Visita de una unidad de transporte al destino de un pedido dentro de una
 * {@link Ruta}. Guarda el instante de llegada y el de salida para que el
 * visualizador pueda reproducir el movimiento de la unidad, y el resultado
 * de la comparacion contra el plazo comprometido.
 *
 * <p>La hora de entrega al destinatario transcurre entre
 * {@code minutoLlegada} y {@code minutoSalida}: ocupa a la unidad, pero
 * queda fuera del plazo comprometido con el cliente.</p>
 */
public class ParadaRuta {

    private final Pedido pedido;
    private final double distanciaKmDesdeAnterior;
    private final int minutoLlegada;
    private final int minutoSalida;

    public ParadaRuta(Pedido pedido, double distanciaKmDesdeAnterior, int minutoLlegada, int minutoSalida) {
        this.pedido = pedido;
        this.distanciaKmDesdeAnterior = distanciaKmDesdeAnterior;
        this.minutoLlegada = minutoLlegada;
        this.minutoSalida = minutoSalida;
    }

    public Pedido getPedido() {
        return pedido;
    }

    public double getDistanciaKmDesdeAnterior() {
        return distanciaKmDesdeAnterior;
    }

    public int getMinutoLlegada() {
        return minutoLlegada;
    }

    public int getMinutoSalida() {
        return minutoSalida;
    }

    /** El plazo se cumple cuando la unidad llega antes del limite comprometido. */
    public boolean cumplePlazo() {
        return minutoLlegada <= pedido.getMinutoLimiteEntrega();
    }

    /** Minutos de holgura frente al plazo; negativo si el plazo se incumplio. */
    public int getHolguraMinutos() {
        return pedido.getMinutoLimiteEntrega() - minutoLlegada;
    }
}
