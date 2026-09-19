package pe.edu.pucp.paqrap.carga;

import java.time.LocalDate;

/**
 * Registro del plan de mantenimiento preventivo: fecha programada y codigo
 * de la unidad de transporte afectada (formato TTNN).
 */
public record MantenimientoProgramado(LocalDate fecha, String codigoUnidad) {
}
