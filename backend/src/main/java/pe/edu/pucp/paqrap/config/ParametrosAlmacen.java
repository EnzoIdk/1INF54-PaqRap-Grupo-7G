package pe.edu.pucp.paqrap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Enlaza los parametros de {@code paqrap.almacen}: rangos de stock y
 * umbrales del semaforo de los almacenes intermedios (STD 2.3 y 5.6). El
 * frontend nunca fija estos umbrales; los obtiene del backend a traves del
 * servicio correspondiente.
 */
@ConfigurationProperties(prefix = "paqrap.almacen")
public record ParametrosAlmacen(
        int stockMaximo,
        int stockMinimo,
        double umbralAmbarPorcentaje,
        double umbralRojoPorcentaje) {
}
