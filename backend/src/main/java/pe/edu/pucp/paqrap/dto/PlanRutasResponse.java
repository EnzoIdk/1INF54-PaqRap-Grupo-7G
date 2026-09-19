package pe.edu.pucp.paqrap.dto;

import java.util.List;

/**
 * Resultado de una planificacion expuesto al visualizador.
 */
public record PlanRutasResponse(
        int minutoSimulacion,
        double costoOperativoTotal,
        List<RutaDto> rutas) {

    public record RutaDto(String codigoUnidad, List<int[]> secuenciaNodos, List<Long> pedidoIds) {
    }
}
