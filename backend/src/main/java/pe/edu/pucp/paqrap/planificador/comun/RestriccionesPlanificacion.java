package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.config.ParametrosFlota;
import pe.edu.pucp.paqrap.enums.TipoUnidad;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.Ruta;

/**
 * Verificacion de plazos, capacidades, turnos y pausas de alimentacion,
 * compartida por ambos algoritmos (STD 4.6.1).
 */
@Component
public class RestriccionesPlanificacion {

    private final ParametrosFlota parametrosFlota;

    public RestriccionesPlanificacion(ParametrosFlota parametrosFlota) {
        this.parametrosFlota = parametrosFlota;
    }

    public boolean esPedidoPriorizado(Pedido pedido, int minutoSimulacionActual) {
        int minutosRestantes = pedido.getMinutoSimulacion() + pedido.getPlazoHoras() * 60 - minutoSimulacionActual;
        return minutosRestantes <= ConstantesPaqrap.MINUTOS_POR_HORA;
    }

    public boolean tieneCapacidadDisponible(Ruta ruta, int cantidadProducto) {
        int cantidadAsignada = ruta.getPedidosAsignados().stream()
                .mapToInt(Pedido::getCantidadProducto)
                .sum();
        return cantidadAsignada + cantidadProducto <= obtenerCapacidad(ruta.getUnidadTransporte().getTipoUnidad());
    }

    public void validarPlazoEntrega(Pedido pedido, int minutoLlegadaEstimado) {
        int minutoLimite = pedido.getMinutoSimulacion() + pedido.getPlazoHoras() * 60;
        if (minutoLlegadaEstimado > minutoLimite) {
            throw new IllegalStateException(
                    "El pedido " + pedido.getId() + " incumpliria su plazo comprometido");
        }
    }

    private int obtenerCapacidad(TipoUnidad tipoUnidad) {
        return switch (tipoUnidad) {
            case AUTO -> parametrosFlota.capacidadAuto();
            case MOTO -> parametrosFlota.capacidadMoto();
            case BICICLETA -> parametrosFlota.capacidadBicicleta();
        };
    }
}
