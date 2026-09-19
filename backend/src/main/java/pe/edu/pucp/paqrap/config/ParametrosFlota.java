package pe.edu.pucp.paqrap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Enlaza los parametros de {@code paqrap.flota}: velocidades, capacidades,
 * costo por kilometro y tamano de la flota por tipo de unidad de transporte
 * (STD 2.3). Estos valores pueden modificarse sin recompilar; un cambio de
 * velocidad aplicado en ejecucion surte efecto desde la siguiente iteracion
 * de planificacion.
 *
 * @param velocidadKmhAuto velocidad promedio del auto
 * @param velocidadKmhMoto velocidad promedio de la moto
 * @param velocidadKmhBicicleta velocidad promedio de la bicicleta
 * @param capacidadAuto paquetes que transporta un auto
 * @param capacidadMoto paquetes que transporta una moto
 * @param capacidadBicicleta paquetes que transporta una bicicleta
 * @param costoKmAuto costo por kilometro recorrido de un auto, en soles
 * @param costoKmMoto costo por kilometro recorrido de una moto, en soles
 * @param costoKmBicicleta costo por kilometro recorrido de una bicicleta, en soles
 * @param cantidadAutos autos de la flota; fijo durante una ejecucion
 * @param cantidadMotos motos de la flota; fijo durante una ejecucion
 * @param cantidadBicicletas bicicletas de la flota; fijo durante una ejecucion
 */
@ConfigurationProperties(prefix = "paqrap.flota")
public record ParametrosFlota(
        int velocidadKmhAuto,
        int velocidadKmhMoto,
        int velocidadKmhBicicleta,
        int capacidadAuto,
        int capacidadMoto,
        int capacidadBicicleta,
        double costoKmAuto,
        double costoKmMoto,
        double costoKmBicicleta,
        int cantidadAutos,
        int cantidadMotos,
        int cantidadBicicletas) {
}
