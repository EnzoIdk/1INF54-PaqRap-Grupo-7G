package pe.edu.pucp.paqrap.experimentacion;

import pe.edu.pucp.paqrap.carga.ResultadoCarga;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Averia;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

import java.util.List;

/**
 * Fotografia del problema que se entrega al planificador: los datos del mes
 * ya leidos y validados, recortados al turno que se quiere planificar.
 *
 * @param conjunto archivos del cliente de los que proviene el escenario
 * @param dia dia del mes que se planifica
 * @param minutoInicio minuto de simulacion en que arranca el turno
 * @param minutoFin minuto de simulacion en que termina la ventana de pedidos
 * @param pedidosDelTurno pedidos registrados dentro de la ventana
 * @param pedidosDelMes total de pedidos aceptados del archivo de ventas
 * @param bloqueosVigentes bloqueos que solapan con la ventana planificada
 * @param bloqueosDelMes total de bloqueos aceptados del archivo
 * @param almacenes almacen central e intermedios
 * @param flota unidades de transporte, con su mantenimiento ya aplicado
 * @param unidadesEnMantenimiento codigos de las unidades fuera de servicio ese dia
 * @param averias averias inyectadas para observar la reasignacion de carga
 * @param resumenVentas conteo de registros leidos, aceptados y rechazados
 * @param resumenBloqueos conteo de registros leidos, aceptados y rechazados
 * @param resumenMantenimiento conteo de registros leidos, aceptados y rechazados
 */
public record EscenarioTurno(
        CatalogoDatos.ConjuntoDatos conjunto,
        int dia,
        int minutoInicio,
        int minutoFin,
        List<Pedido> pedidosDelTurno,
        int pedidosDelMes,
        List<Bloqueo> bloqueosVigentes,
        int bloqueosDelMes,
        List<Almacen> almacenes,
        List<UnidadTransporte> flota,
        List<String> unidadesEnMantenimiento,
        List<Averia> averias,
        ResultadoCarga resumenVentas,
        ResultadoCarga resumenBloqueos,
        ResultadoCarga resumenMantenimiento) {

    public List<UnidadTransporte> unidadesOperativas() {
        return flota.stream().filter(unidad -> unidad.estaOperativa(minutoInicio)).toList();
    }
}
