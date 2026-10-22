package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.config.ParametrosOperacion;
import pe.edu.pucp.paqrap.enums.TipoAlmacen;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.Ruta;
import pe.edu.pucp.paqrap.exception.PlazoIncumplibleException;

import java.util.Map;

/**
 * Verificacion de plazos, capacidades, stock de almacen, turnos y pausas de
 * alimentacion, compartida por ambos algoritmos (STD 4.6.1).
 *
 * <p>Las cuatro condiciones son restricciones duras: el algoritmo no debe
 * construir una asignacion que las incumpla, en lugar de construirla y
 * multarla despues.</p>
 */
@Component
public class RestriccionesPlanificacion {

    private final EvaluadorCosto evaluadorCosto;
    private final ParametrosOperacion parametrosOperacion;

    public RestriccionesPlanificacion(EvaluadorCosto evaluadorCosto, ParametrosOperacion parametrosOperacion) {
        this.evaluadorCosto = evaluadorCosto;
        this.parametrosOperacion = parametrosOperacion;
    }

    /**
     * Minutos de trabajo efectivo de una jornada: el turno de 8 horas menos
     * la hora de alimentacion que debe respetarse dentro de el.
     */
    public int getMinutosUtilesDeJornada() {
        return ConstantesPaqrap.MINUTOS_DURACION_TURNO - ConstantesPaqrap.MINUTOS_PAUSA_ALIMENTACION;
    }

    public boolean cabeEnLaUnidad(Ruta ruta, int cantidadProducto) {
        int capacidad = evaluadorCosto.obtenerCapacidad(ruta.getUnidadTransporte().getTipoUnidad());
        return ruta.getCargaTotal() + cantidadProducto <= capacidad;
    }

    public boolean cabeEnLaUnidad(pe.edu.pucp.paqrap.enums.TipoUnidad tipoUnidad, int cargaActual, int cantidad) {
        return cargaActual + cantidad <= evaluadorCosto.obtenerCapacidad(tipoUnidad);
    }

    /**
     * El almacen central esta permanentemente abastecido; un almacen
     * intermedio no puede despachar mas unidades de las que tiene, ni bajar
     * de su stock minimo configurado.
     */
    public boolean hayStockDisponible(Almacen almacen, int cantidadProducto, Map<Almacen, Integer> yaDespachado) {
        if (almacen.getTipoAlmacen() == TipoAlmacen.CENTRAL) {
            return true;
        }
        int comprometido = yaDespachado.getOrDefault(almacen, 0);
        return almacen.getStockActual() - comprometido - cantidadProducto >= parametrosOperacion.almacen().stockMinimo();
    }

    /**
     * El plazo se compara contra el minuto de llegada al cliente: la hora de
     * entrega al destinatario ocupa a la unidad, pero queda fuera del plazo
     * comprometido.
     */
    public boolean cumpleElPlazo(Pedido pedido, double minutoLlegada) {
        return minutoLlegada <= pedido.getMinutoLimiteEntrega();
    }

    /**
     * La unidad no puede exceder las horas utiles de su jornada, contando el
     * viaje y la hora de entrega de cada parada.
     */
    public boolean cabeEnLaJornada(double minutosTrabajados, double minutosViaje) {
        return minutosTrabajados + minutosViaje + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO
                <= getMinutosUtilesDeJornada();
    }

    public boolean esPedidoPriorizado(Pedido pedido, int minutoSimulacionActual) {
        int minutosRestantes = pedido.getMinutoLimiteEntrega() - minutoSimulacionActual;
        return minutosRestantes <= ConstantesPaqrap.MINUTOS_POR_HORA;
    }

    public void validarPlazoEntrega(Pedido pedido, int minutoLlegadaEstimado) {
        if (!cumpleElPlazo(pedido, minutoLlegadaEstimado)) {
            throw new PlazoIncumplibleException(
                    "El pedido " + pedido.getClienteId() + " incumpliria su plazo comprometido");
        }
    }
}
