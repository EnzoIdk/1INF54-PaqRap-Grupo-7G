package pe.edu.pucp.paqrap.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.edu.pucp.paqrap.config.ParametrosAlmacen;
import pe.edu.pucp.paqrap.config.ParametrosOperacion;
import pe.edu.pucp.paqrap.exception.StockInsuficienteException;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.repository.AlmacenRepository;

/**
 * Control del stock de los almacenes intermedios y calculo del color de
 * semaforo correspondiente (STD 5.6). El frontend nunca fija los umbrales;
 * los obtiene de este servicio.
 */
@Service
public class AlmacenService {

    private static final Logger log = LoggerFactory.getLogger(AlmacenService.class);

    public enum ColorSemaforo {
        VERDE, AMBAR, ROJO
    }

    private final AlmacenRepository almacenRepository;
    private final ParametrosOperacion parametrosOperacion;

    public AlmacenService(AlmacenRepository almacenRepository, ParametrosOperacion parametrosOperacion) {
        this.almacenRepository = almacenRepository;
        this.parametrosOperacion = parametrosOperacion;
    }

    public void despacharStock(Almacen almacen, int cantidadProducto) {
        if (almacen.getStockActual() < cantidadProducto) {
            throw new StockInsuficienteException(
                    "El almacen " + almacen.getId() + " no tiene stock suficiente para despachar " + cantidadProducto);
        }
        almacen.setStockActual(almacen.getStockActual() - cantidadProducto);
        almacenRepository.save(almacen);
        log.info("Almacen {} despacho {} unidades, stock restante {}", almacen.getId(), cantidadProducto,
                almacen.getStockActual());
    }

    public ColorSemaforo calcularColorSemaforo(Almacen almacen) {
        ParametrosAlmacen parametrosAlmacen = parametrosOperacion.almacen();
        double porcentajeDespachado = 1.0 - ((double) almacen.getStockActual() / parametrosAlmacen.stockMaximo());
        if (porcentajeDespachado >= parametrosAlmacen.umbralRojoPorcentaje()) {
            return ColorSemaforo.ROJO;
        }
        if (porcentajeDespachado >= parametrosAlmacen.umbralAmbarPorcentaje()) {
            return ColorSemaforo.AMBAR;
        }
        return ColorSemaforo.VERDE;
    }
}
