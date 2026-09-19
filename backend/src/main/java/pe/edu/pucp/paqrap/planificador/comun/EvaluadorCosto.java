package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ParametrosFlota;
import pe.edu.pucp.paqrap.enums.TipoUnidad;
import pe.edu.pucp.paqrap.model.Ruta;

/**
 * Evaluacion del costo operativo de una ruta, comun a ambos algoritmos
 * (STD 4.6.1). El costo por kilometro depende del tipo de unidad de
 * transporte.
 */
@Component
public class EvaluadorCosto {

    private final ParametrosFlota parametrosFlota;

    public EvaluadorCosto(ParametrosFlota parametrosFlota) {
        this.parametrosFlota = parametrosFlota;
    }

    public double calcularCostoOperativo(Ruta ruta) {
        int distanciaKm = ruta.calcularDistanciaKm();
        double velocidadKmH = obtenerVelocidadKmH(ruta.getUnidadTransporte().getTipoUnidad());
        return distanciaKm / velocidadKmH;
    }

    private double obtenerVelocidadKmH(TipoUnidad tipoUnidad) {
        return switch (tipoUnidad) {
            case AUTO -> parametrosFlota.velocidadKmhAuto();
            case MOTO -> parametrosFlota.velocidadKmhMoto();
            case BICICLETA -> parametrosFlota.velocidadKmhBicicleta();
        };
    }
}
