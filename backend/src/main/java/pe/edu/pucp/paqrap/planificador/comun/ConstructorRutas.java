package pe.edu.pucp.paqrap.planificador.comun;

import org.springframework.stereotype.Component;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.ParadaRuta;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.Ruta;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

import java.util.ArrayList;
import java.util.List;

/**
 * Convierte una asignacion ya decidida -una unidad, su almacen de origen y
 * los pedidos en el orden en que los atendera- en una {@link Ruta} completa:
 * con el instante de llegada y de salida de cada parada y con la polilinea
 * nodo a nodo, fechada, que el visualizador anima.
 *
 * <p>Vive en {@code planificador.comun} porque el I-ACO y el AGA-ES-TW solo
 * difieren en como eligen la asignacion; el calculo del tiempo y del
 * recorrido debe ser identico en ambos para que la comparacion numerica sea
 * legitima (STD 4.6.1).</p>
 *
 * <p>El nodo de cada parada aparece dos veces en el recorrido, con el minuto
 * de llegada y con el de salida. Asi la hora de entrega al destinatario se
 * representa como lo que es -la unidad detenida en el domicilio del
 * cliente- y el visualizador puede interpolar entre nodos consecutivos sin
 * ningun caso especial.</p>
 */
@Component
public class ConstructorRutas {

    private final EvaluadorCosto evaluadorCosto;
    private final ProgramadorAlimentacion programadorAlimentacion;

    public ConstructorRutas(EvaluadorCosto evaluadorCosto, ProgramadorAlimentacion programadorAlimentacion) {
        this.evaluadorCosto = evaluadorCosto;
        this.programadorAlimentacion = programadorAlimentacion;
    }

    public Ruta construir(UnidadTransporte unidad,
                          Almacen almacenOrigen,
                          List<Pedido> pedidosEnOrden,
                          int minutoPlanificacion,
                          Grafo grafo) {
        return construir(unidad, almacenOrigen, pedidosEnOrden, minutoPlanificacion, grafo, List.of(almacenOrigen));
    }

    public Ruta construir(UnidadTransporte unidad,
                          Almacen almacenOrigen,
                          List<Pedido> pedidosEnOrden,
                          int minutoPlanificacion,
                          Grafo grafo,
                          List<Almacen> almacenesDisponibles) {
        Ruta ruta = new Ruta(unidad, almacenOrigen, minutoPlanificacion);

        Nodo posicion = almacenOrigen.getUbicacion();
        double reloj = minutoPlanificacion;

        List<Nodo> recorrido = new ArrayList<>();
        List<Integer> minutos = new ArrayList<>();
        recorrido.add(posicion);
        minutos.add(minutoPlanificacion);

        List<ParadaRuta> paradas = new ArrayList<>();
        // Posicion, dentro del recorrido, del nodo con el que la unidad deja cada parada.
        List<Integer> nodoDeSalida = new ArrayList<>();

        for (Pedido pedido : pedidosEnOrden) {
            Nodo destino = pedido.getUbicacion();
            double distanciaKm = grafo.distanciaKm(posicion, destino);
            double minutosViaje = evaluadorCosto.minutosDeViaje(unidad.getTipoUnidad(), distanciaKm);

            double minutoLlegadaExacto = reloj + minutosViaje;
            int minutoLlegada = (int) Math.round(minutoLlegadaExacto);
            int minutoSalida = minutoLlegada + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;
            paradas.add(new ParadaRuta(pedido, distanciaKm, minutoLlegada, minutoSalida));

            agregarTramoAlRecorrido(grafo, posicion, destino, reloj, minutoLlegadaExacto, recorrido, minutos);

            // El nodo del cliente se repite: la unidad permanece alli durante
            // la hora de entrega, que ocupa su reloj pero no cuenta en el plazo.
            recorrido.add(destino);
            minutos.add(minutoSalida);
            nodoDeSalida.add(recorrido.size() - 1);

            reloj = minutoSalida;
            posicion = destino;
        }

        // Tramo de retorno: al completar las entregas, la unidad retorna a recargar
        // al almacen mas cercano que cuente con stock disponible o al central.
        // Se calcula antes de programar la alimentacion, porque la pausa puede
        // tomarse ya estacionada en ese almacen.
        Almacen almacenDestino = null;
        double distanciaRetorno = 0.0;
        double minutosViajeRetorno = 0.0;
        if (!pedidosEnOrden.isEmpty()) {
            almacenDestino = seleccionarAlmacenRetorno(posicion, almacenesDisponibles, almacenOrigen, grafo);
            distanciaRetorno = grafo.distanciaKm(posicion, almacenDestino.getUbicacion());
            minutosViajeRetorno = evaluadorCosto.minutosDeViaje(unidad.getTipoUnidad(), distanciaRetorno);
        }

        ProgramadorAlimentacion.Programacion pausa = programadorAlimentacion.programar(
                paradas, minutoPlanificacion, (int) Math.round(minutosViajeRetorno));
        if (pausa != null && pausa.desplazaParadas()) {
            intercalarPausa(pausa, paradas, nodoDeSalida, recorrido, minutos);
            // Todo lo que sigue a la pausa, incluido el retorno, se corre una hora.
            reloj += ConstantesPaqrap.MINUTOS_PAUSA_ALIMENTACION;
        }
        paradas.forEach(ruta::agregarParada);

        if (almacenDestino != null) {
            int minutoInicioRetorno = (int) Math.round(reloj);
            Nodo destinoRetorno = almacenDestino.getUbicacion();
            double minutoLlegadaExacto = reloj + minutosViajeRetorno;
            int minutoLlegadaAlmacen = (int) Math.round(minutoLlegadaExacto);

            agregarTramoAlRecorrido(grafo, posicion, destinoRetorno, reloj, minutoLlegadaExacto, recorrido, minutos);
            ruta.definirRetorno(almacenDestino, distanciaRetorno, minutoInicioRetorno, minutoLlegadaAlmacen);
        }
        if (pausa != null) {
            ruta.programarAlimentacion(pausa.minutoInicio(), pausa.minutoFin(), pausa.dentroDeVentana());
        }

        ruta.definirRecorrido(recorrido, minutos);
        return ruta;
    }

    /**
     * Elige el almacen de retorno mas cercano que posea stock de paquetes para recargar.
     * Si los intermedios no tienen stock, retorna al almacen central.
     */
    public static Almacen seleccionarAlmacenRetorno(Nodo posicion,
                                                    List<Almacen> almacenes,
                                                    Almacen almacenOrigen,
                                                    Grafo grafo) {
        if (almacenes == null || almacenes.isEmpty()) {
            return almacenOrigen;
        }
        List<Almacen> conStock = almacenes.stream()
                .filter(a -> a.esCentral() || a.getStockActual() > 0)
                .toList();
        List<Almacen> candidatos = conStock.isEmpty() ? almacenes : conStock;

        Almacen mejor = candidatos.get(0);
        double menorDistancia = grafo.distanciaKm(posicion, mejor.getUbicacion());
        for (int i = 1; i < candidatos.size(); i++) {
            Almacen candidata = candidatos.get(i);
            double dist = grafo.distanciaKm(posicion, candidata.getUbicacion());
            if (dist < menorDistancia) {
                menorDistancia = dist;
                mejor = candidata;
            }
        }
        return mejor;
    }

    /**
     * Detiene la unidad una hora en el punto elegido: el nodo se repite con el
     * minuto en que termina la pausa y todo lo posterior se corre una hora,
     * tanto en las paradas como en el recorrido fechado que anima el mapa.
     */
    private void intercalarPausa(ProgramadorAlimentacion.Programacion pausa,
                                 List<ParadaRuta> paradas,
                                 List<Integer> nodoDeSalida,
                                 List<Nodo> recorrido,
                                 List<Integer> minutos) {
        int desplazamiento = ConstantesPaqrap.MINUTOS_PAUSA_ALIMENTACION;
        int despuesDe = pausa.despuesDeParada();
        for (int j = despuesDe + 1; j < paradas.size(); j++) {
            ParadaRuta original = paradas.get(j);
            paradas.set(j, new ParadaRuta(original.getPedido(), original.getDistanciaKmDesdeAnterior(),
                    original.getMinutoLlegada() + desplazamiento, original.getMinutoSalida() + desplazamiento));
        }
        int nodoPausa = despuesDe == ProgramadorAlimentacion.EN_EL_ALMACEN ? 0 : nodoDeSalida.get(despuesDe);
        for (int i = nodoPausa + 1; i < minutos.size(); i++) {
            minutos.set(i, minutos.get(i) + desplazamiento);
        }
        recorrido.add(nodoPausa + 1, recorrido.get(nodoPausa));
        minutos.add(nodoPausa + 1, minutos.get(nodoPausa) + desplazamiento);
    }

    /**
     * Anade los nodos intermedios de un tramo, repartiendo el tiempo de
     * viaje de forma uniforme entre ellos. El reparto es proporcional porque
     * la distancia del tramo incluye el desvio que imponen los bloqueos,
     * mientras que la polilinea solo dibuja los nodos de la reticula.
     */
    private void agregarTramoAlRecorrido(Grafo grafo,
                                         Nodo origen,
                                         Nodo destino,
                                         double minutoSalida,
                                         double minutoLlegada,
                                         List<Nodo> recorrido,
                                         List<Integer> minutos) {
        List<Nodo> camino = grafo.caminoEnL(origen, destino);
        int pasos = camino.size() - 1;
        if (pasos <= 0) {
            recorrido.add(destino);
            minutos.add((int) Math.round(minutoLlegada));
            return;
        }
        double duracion = minutoLlegada - minutoSalida;
        // El ultimo nodo del camino es el destino: se anade fuera, junto con
        // su minuto de llegada exacto.
        for (int i = 1; i < pasos; i++) {
            recorrido.add(camino.get(i));
            minutos.add((int) Math.round(minutoSalida + duracion * i / pasos));
        }
        recorrido.add(destino);
        minutos.add((int) Math.round(minutoLlegada));
    }
}
