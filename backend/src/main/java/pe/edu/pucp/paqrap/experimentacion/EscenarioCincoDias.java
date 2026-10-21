package pe.edu.pucp.paqrap.experimentacion;

import java.util.List;

import pe.edu.pucp.paqrap.carga.MantenimientoProgramado;
import pe.edu.pucp.paqrap.model.Bloqueo;

/**
 * Fotografia del escenario de 5 dias continuos, con el escenario global
 * de la ventana y los registros completos de mantenimiento y bloqueos
 * necesarios para la resolucion turno a turno.
 *
 * @param escenario escenario global de los 5 dias
 * @param mantenimientos registros de mantenimiento preventivo del periodo
 * @param bloqueosDelMes bloqueos registrados para el mes
 */
public record EscenarioCincoDias(
        EscenarioTurno escenario,
        List<MantenimientoProgramado> mantenimientos,
        List<Bloqueo> bloqueosDelMes) {
}
