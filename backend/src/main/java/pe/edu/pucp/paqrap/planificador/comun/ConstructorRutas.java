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

    public ConstructorRutas(EvaluadorCosto evaluadorCosto) {
        this.evaluadorCosto = evaluadorCosto;
    }

    public Ruta construir(UnidadTransporte unidad,
                          Almacen almacenOrigen,
                          List<Pedido> pedidosEnOrden,
                          int minutoPlanificacion,
                          Grafo grafo) {
        Ruta ruta = new Ruta(unidad, almacenOrigen, minutoPlanificacion);

        Nodo posicion = almacenOrigen.getUbicacion();
        double reloj = minutoPlanificacion;

        List<Nodo> recorrido = new ArrayList<>();
        List<Integer> minutos = new ArrayList<>();
        recorrido.add(posicion);
        minutos.add(minutoPlanificacion);

        for (Pedido pedido : pedidosEnOrden) {
            Nodo destino = pedido.getUbicacion();
            double distanciaKm = grafo.distanciaKm(posicion, destino);
            double minutosViaje = evaluadorCosto.minutosDeViaje(unidad.getTipoUnidad(), distanciaKm);

            double minutoLlegadaExacto = reloj + minutosViaje;
            int minutoLlegada = (int) Math.round(minutoLlegadaExacto);
            int minutoSalida = minutoLlegada + ConstantesPaqrap.MINUTOS_ENTREGA_DESTINATARIO;
            ruta.agregarParada(new ParadaRuta(pedido, distanciaKm, minutoLlegada, minutoSalida));

            agregarTramoAlRecorrido(grafo, posicion, destino, reloj, minutoLlegadaExacto, recorrido, minutos);

            // El nodo del cliente se repite: la unidad permanece alli durante
            // la hora de entrega, que ocupa su reloj pero no cuenta en el plazo.
            recorrido.add(destino);
            minutos.add(minutoSalida);

            reloj = minutoSalida;
            posicion = destino;
        }

        ruta.definirRecorrido(recorrido, minutos);
        return ruta;
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
