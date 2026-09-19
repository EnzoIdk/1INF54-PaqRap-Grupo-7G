package pe.edu.pucp.paqrap.planificador.comun;

import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Nodo;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Representacion del mapa reticulado de la ciudad compartida por ambos
 * algoritmos metaheuristicos (STD 4.6.1). No debe duplicarse en los
 * subpaquetes {@code iaco} ni {@code agaestw}.
 *
 * <p>Las calles son de doble sentido y no existen diagonales, por lo que la
 * unidad de bloqueo es el <em>tramo</em>: la arista de 1 km entre dos nodos
 * contiguos. Un registro de bloqueo describe un poligono abierto cuyos
 * vertices pueden estar separados por varios kilometros, de modo que cada
 * lado del poligono se descompone en los tramos unitarios que lo componen;
 * de lo contrario un bloqueo de, por ejemplo, {@code 25,45,45,45} no
 * coincidiria con ninguno de los tramos que la ruta recorre.</p>
 *
 * <p>Cada instancia describe el estado de la red en un instante concreto de
 * la simulacion, por lo que se construye dentro de la ejecucion del
 * planificador y no se comparte entre hilos. Las claves de tramo y de
 * distancia se empaquetan en enteros porque las metaheuristicas consultan
 * estas estructuras cientos de miles de veces por ejecucion.</p>
 */
public class Grafo {

    private final Set<Integer> tramosBloqueados = new HashSet<>();
    private final Map<Integer, Double> distanciasMemorizadas = new HashMap<>();

    /**
     * Clave simetrica de un tramo: la calle es de doble sentido, asi que el
     * tramo (a, b) y el tramo (b, a) son el mismo.
     */
    static int claveTramo(int xa, int ya, int xb, int yb) {
        int primero = (xa << 8) | ya;
        int segundo = (xb << 8) | yb;
        return primero <= segundo ? (primero << 16) | segundo : (segundo << 16) | primero;
    }

    /**
     * Reemplaza los tramos bloqueados por los que definen los bloqueos
     * recibidos. Cada lado del poligono abierto se descompone en tramos de
     * 1 km.
     */
    public void aplicarBloqueosVigentes(Iterable<Bloqueo> bloqueosVigentes) {
        tramosBloqueados.clear();
        distanciasMemorizadas.clear();
        for (Bloqueo bloqueo : bloqueosVigentes) {
            List<Bloqueo.NodoBloqueo> nodos = bloqueo.getNodos();
            for (int i = 0; i < nodos.size() - 1; i++) {
                bloquearTramosEntre(
                        nodos.get(i).getX(), nodos.get(i).getY(),
                        nodos.get(i + 1).getX(), nodos.get(i + 1).getY());
            }
        }
    }

    private void bloquearTramosEntre(int desdeX, int desdeY, int hastaX, int hastaY) {
        int x = desdeX;
        int y = desdeY;
        while (x != hastaX) {
            int siguiente = x + (hastaX > x ? 1 : -1);
            tramosBloqueados.add(claveTramo(x, y, siguiente, y));
            x = siguiente;
        }
        while (y != hastaY) {
            int siguiente = y + (hastaY > y ? 1 : -1);
            tramosBloqueados.add(claveTramo(x, y, x, siguiente));
            y = siguiente;
        }
    }

    public boolean estaTramoBloqueado(Nodo a, Nodo b) {
        return tramosBloqueados.contains(claveTramo(a.getX(), a.getY(), b.getX(), b.getY()));
    }

    public int getCantidadTramosBloqueados() {
        return tramosBloqueados.size();
    }

    public boolean esNodoTransitable(Nodo nodo) {
        return nodo.getX() >= 0 && nodo.getX() <= ConstantesPaqrap.ANCHO_RETICULA_KM
                && nodo.getY() >= 0 && nodo.getY() <= ConstantesPaqrap.ALTO_RETICULA_KM;
    }

    /**
     * Trayectoria en L entre dos nodos: primero el desplazamiento horizontal
     * y despues el vertical. Es la misma que recorre {@link #distanciaKm} y
     * la que el visualizador dibuja, de modo que el kilometraje del plan y el
     * trazo del mapa nunca se contradicen.
     */
    public List<Nodo> caminoEnL(Nodo origen, Nodo destino) {
        List<Nodo> camino = new ArrayList<>();
        camino.add(origen);
        int x = origen.getX();
        int y = origen.getY();
        while (x != destino.getX()) {
            x += destino.getX() > x ? 1 : -1;
            camino.add(new Nodo(x, y));
        }
        while (y != destino.getY()) {
            y += destino.getY() > y ? 1 : -1;
            camino.add(new Nodo(x, y));
        }
        return camino;
    }

    /**
     * Cuenta los tramos bloqueados que atraviesa la trayectoria en L, sin
     * materializar el camino.
     */
    public int contarTramosBloqueados(Nodo origen, Nodo destino) {
        if (tramosBloqueados.isEmpty()) {
            return 0;
        }
        int bloqueados = 0;
        int x = origen.getX();
        int y = origen.getY();
        while (x != destino.getX()) {
            int siguiente = x + (destino.getX() > x ? 1 : -1);
            if (tramosBloqueados.contains(claveTramo(x, y, siguiente, y))) {
                bloqueados++;
            }
            x = siguiente;
        }
        while (y != destino.getY()) {
            int siguiente = y + (destino.getY() > y ? 1 : -1);
            if (tramosBloqueados.contains(claveTramo(x, y, x, siguiente))) {
                bloqueados++;
            }
            y = siguiente;
        }
        return bloqueados;
    }

    /**
     * Distancia efectiva en kilometros: la distancia Manhattan mas el desvio
     * que impone cada tramo bloqueado, porque la unidad que llega a un nodo
     * bloqueado debe retornar por el mismo tramo por el que llego. Una unidad
     * averiada no bloquea la via, por lo que no interviene en este calculo.
     *
     * <p>El resultado se memoriza: el par de nodos se repite constantemente
     * dentro de una misma ejecucion y el estado de la red no cambia mientras
     * dura.</p>
     */
    public double distanciaKm(Nodo origen, Nodo destino) {
        int manhattan = origen.distanciaKmHasta(destino);
        if (tramosBloqueados.isEmpty()) {
            return manhattan;
        }
        int clave = claveOrientada(origen, destino);
        Double memorizada = distanciasMemorizadas.get(clave);
        if (memorizada != null) {
            return memorizada;
        }
        double distancia = manhattan
                + contarTramosBloqueados(origen, destino) * ConstantesPaqrap.KM_DESVIO_POR_TRAMO_BLOQUEADO;
        distanciasMemorizadas.put(clave, distancia);
        return distancia;
    }

    /**
     * Clave orientada: la trayectoria en L de (a, b) no es la misma que la de
     * (b, a), asi que ambas se memorizan por separado.
     */
    private static int claveOrientada(Nodo origen, Nodo destino) {
        return (origen.getX() << 24) | (origen.getY() << 16) | (destino.getX() << 8) | destino.getY();
    }
}
