package pe.edu.pucp.paqrap.planificador.comun;

import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Averia;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

import java.util.List;

/**
 * Datos de entrada de una ejecucion del planificador, agrupados para que las
 * dos metaheuristicas compartan exactamente el mismo enunciado del problema
 * (STD 4.6.1). Es el unico punto donde se construye el {@link Grafo} con los
 * bloqueos vigentes del instante que se planifica.
 *
 * @param pedidos pedidos a asignar en este turno
 * @param unidades flota disponible
 * @param almacenes almacen central e intermedios con su stock actual
 * @param averias averias programadas que ocurren dentro del turno planificado
 * @param grafo red de la ciudad con los tramos bloqueados ya aplicados
 * @param minutoPlanificacion minuto de simulacion en que arranca el turno
 */
public record ContextoPlanificacion(
        List<Pedido> pedidos,
        List<UnidadTransporte> unidades,
        List<Almacen> almacenes,
        List<Averia> averias,
        Grafo grafo,
        int minutoPlanificacion) {

    public static ContextoPlanificacion crear(
            List<Pedido> pedidos,
            List<UnidadTransporte> unidades,
            List<Almacen> almacenes,
            List<Bloqueo> bloqueosVigentes,
            int minutoPlanificacion) {
        return crear(pedidos, unidades, almacenes, bloqueosVigentes, List.of(), minutoPlanificacion);
    }

    public static ContextoPlanificacion crear(
            List<Pedido> pedidos,
            List<UnidadTransporte> unidades,
            List<Almacen> almacenes,
            List<Bloqueo> bloqueosVigentes,
            List<Averia> averias,
            int minutoPlanificacion) {
        Grafo grafo = new Grafo();
        grafo.aplicarBloqueosVigentes(bloqueosVigentes);
        return new ContextoPlanificacion(
                List.copyOf(pedidos), List.copyOf(unidades), List.copyOf(almacenes),
                List.copyOf(averias), grafo, minutoPlanificacion);
    }

    public List<UnidadTransporte> unidadesOperativas() {
        return unidades.stream().filter(unidad -> unidad.estaOperativa(minutoPlanificacion)).toList();
    }

    /**
     * Averias que caen dentro del turno planificado: la unidad sale del
     * almacen, pero queda fuera de servicio antes de terminar su ruta.
     */
    public List<Averia> averiasDelTurno() {
        return averias.stream()
                .filter(averia -> averia.getMinutoSimulacion() >= minutoPlanificacion)
                .toList();
    }
}
