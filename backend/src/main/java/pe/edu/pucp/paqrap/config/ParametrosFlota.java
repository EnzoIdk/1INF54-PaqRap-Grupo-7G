package pe.edu.pucp.paqrap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Enlaza los parametros de {@code paqrap.flota}: velocidades y capacidades
 * por tipo de unidad de transporte (STD 2.3). Estos valores pueden
 * modificarse sin recompilar; un cambio de velocidad aplicado en ejecucion
 * surte efecto desde la siguiente iteracion de planificacion.
 */
@ConfigurationProperties(prefix = "paqrap.flota")
public record ParametrosFlota(
        int velocidadKmhAuto,
        int velocidadKmhMoto,
        int velocidadKmhBicicleta,
        int capacidadAuto,
        int capacidadMoto,
        int capacidadBicicleta) {
}
