package pe.edu.pucp.paqrap.experimentacion;

import pe.edu.pucp.paqrap.carga.MantenimientoProgramado;
import pe.edu.pucp.paqrap.model.Bloqueo;

import java.util.List;

/**
 * Fotografia del escenario de simulacion hasta el colapso, con los pedidos
 * desde el dia de inicio y los registros completos de mantenimiento y bloqueos.
 *
 * @param escenario escenario inicial con los pedidos y flota configurados
 * @param mantenimientos registros de mantenimiento preventivo del periodo
 * @param bloqueosDelMes bloqueos registrados en todo el mes
 */
public record EscenarioColapso(
        EscenarioTurno escenario,
        List<MantenimientoProgramado> mantenimientos,
        List<Bloqueo> bloqueosDelMes) {
}
