package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.config.ParametrosFlota;
import pe.edu.pucp.paqrap.enums.TipoUnidad;
import pe.edu.pucp.paqrap.model.Ruta;

/**
 * Evaluacion del costo operativo de una ruta, comun a ambos algoritmos
 * (STD 4.6.1). El costo total por kilometro recorrido depende del tipo de
 * unidad de transporte: S/ 8.00 el auto, S/ 6.00 la moto y S/ 3.00 la
 * bicicleta, segun los valores configurados en {@code paqrap.flota}.
 */
@Component
public class EvaluadorCosto {

    private final ParametrosFlota parametrosFlota;

    public EvaluadorCosto(ParametrosFlota parametrosFlota) {
        this.parametrosFlota = parametrosFlota;
    }

    public double calcularCostoOperativo(Ruta ruta) {
        return ruta.getDistanciaKm() * obtenerCostoPorKm(ruta.getUnidadTransporte().getTipoUnidad());
    }

    public double calcularCostoTramo(TipoUnidad tipoUnidad, double distanciaKm) {
        return distanciaKm * obtenerCostoPorKm(tipoUnidad);
    }

    public double obtenerCostoPorKm(TipoUnidad tipoUnidad) {
        return switch (tipoUnidad) {
            case AUTO -> parametrosFlota.costoKmAuto();
            case MOTO -> parametrosFlota.costoKmMoto();
            case BICICLETA -> parametrosFlota.costoKmBicicleta();
        };
    }

    public double obtenerVelocidadKmH(TipoUnidad tipoUnidad) {
        return switch (tipoUnidad) {
            case AUTO -> parametrosFlota.velocidadKmhAuto();
            case MOTO -> parametrosFlota.velocidadKmhMoto();
            case BICICLETA -> parametrosFlota.velocidadKmhBicicleta();
        };
    }

    public int obtenerCapacidad(TipoUnidad tipoUnidad) {
        return switch (tipoUnidad) {
            case AUTO -> parametrosFlota.capacidadAuto();
            case MOTO -> parametrosFlota.capacidadMoto();
            case BICICLETA -> parametrosFlota.capacidadBicicleta();
        };
    }

    /** Minutos que una unidad tarda en recorrer una distancia dada. */
    public double minutosDeViaje(TipoUnidad tipoUnidad, double distanciaKm) {
        return distanciaKm / obtenerVelocidadKmH(tipoUnidad) * ConstantesPaqrap.MINUTOS_POR_HORA;
    }
}
