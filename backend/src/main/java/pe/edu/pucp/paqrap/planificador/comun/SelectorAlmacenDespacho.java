package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

import java.util.List;
import java.util.Map;

/**
 * Elige el almacen desde el que una unidad se abastece: el mas cercano que
 * todavia tenga existencias. Una unidad no puede abastecerse en un almacen
 * sin stock, y el almacen central esta permanentemente abastecido
 * (STD 2.2, 4.6.1).
 */
@Component
public class SelectorAlmacenDespacho {

    private final RestriccionesPlanificacion restricciones;

    public SelectorAlmacenDespacho(RestriccionesPlanificacion restricciones) {
        this.restricciones = restricciones;
    }

    public Almacen seleccionar(UnidadTransporte unidad,
                               List<Almacen> almacenes,
                               Map<Almacen, Integer> despachado,
                               Grafo grafo) {
        Almacen elegido = null;
        double menorDistancia = Double.MAX_VALUE;

        for (Almacen almacen : almacenes) {
            if (!restricciones.hayStockDisponible(almacen, 1, despachado)) {
                continue;
            }
            double distancia = grafo.distanciaKm(unidad.getUbicacion(), almacen.getUbicacion());
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                elegido = almacen;
            }
        }
        return elegido != null ? elegido : almacenes.get(0);
    }
}
