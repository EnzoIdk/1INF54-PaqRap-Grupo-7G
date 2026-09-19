package pe.edu.pucp.paqrap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Enlaza los parametros de {@code paqrap.almacen}: ubicaciones, rangos de
 * stock y umbrales del semaforo de los almacenes intermedios (STD 2.3 y 5.6).
 * El frontend nunca fija estos umbrales; los obtiene del backend a traves del
 * servicio correspondiente.
 *
 * @param stockMaximo capacidad maxima de un almacen intermedio
 * @param stockMinimo stock por debajo del cual el almacen no puede despachar
 * @param umbralAmbarPorcentaje fraccion despachada a partir de la cual el semaforo pasa a ambar
 * @param umbralRojoPorcentaje fraccion despachada a partir de la cual el semaforo pasa a rojo
 * @param centralX coordenada X del almacen central
 * @param centralY coordenada Y del almacen central
 * @param noroesteX coordenada X del almacen intermedio Nor-Oeste
 * @param noroesteY coordenada Y del almacen intermedio Nor-Oeste
 * @param esteX coordenada X del almacen intermedio Este
 * @param esteY coordenada Y del almacen intermedio Este
 */
@ConfigurationProperties(prefix = "paqrap.almacen")
public record ParametrosAlmacen(
        int stockMaximo,
        int stockMinimo,
        double umbralAmbarPorcentaje,
        double umbralRojoPorcentaje,
        int centralX,
        int centralY,
        int noroesteX,
        int noroesteY,
        int esteX,
        int esteY) {
}
