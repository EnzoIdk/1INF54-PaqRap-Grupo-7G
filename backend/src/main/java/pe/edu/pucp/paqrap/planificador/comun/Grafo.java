package pe.edu.pucp.paqrap.planificador.comun;

import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Nodo;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;

/**
 * Representacion del mapa reticulado de la ciudad compartida por ambos
 * algoritmos metaheuristicos (STD 4.6.1). No debe duplicarse en los
 * subpaquetes {@code iaco} ni {@code agaestw}.
 *
 * <p>Las calles son de doble sentido y no existen diagonales, por lo que la
 * unidad de bloqueo es el <em>tramo</em>: la arista de 1 km entre dos nodos
 * contiguos, junto con los nodos interiores que conforman la polilinea
 * cerrada. Un registro de bloqueo describe un poligono abierto cuyos
 * vertices pueden estar separados por varios kilometros, de modo que cada
 * lado del poligono se descompone en los tramos unitarios y nodos que lo
 * componen; asi ninguna unidad puede recorrer ni cruzar transversalmente un
 * bloqueo activo.</p>
 *
 * <p>Cada instancia describe el estado de la red en un instante concreto de
 * la simulacion, por lo que se construye dentro de la ejecucion del
 * planificador y no se comparte entre hilos. Las claves de tramo y de
 * distancia se empaquetan en enteros porque las metaheuristicas consultan
 * estas estructuras cientos de miles de veces por ejecucion.</p>
 */
public class Grafo {

    private static final int ANCHO_NODOS = ConstantesPaqrap.ANCHO_RETICULA_KM + 1;
    private static final int ALTO_NODOS = ConstantesPaqrap.ALTO_RETICULA_KM + 1;
    private static final int TOTAL_NODOS = ANCHO_NODOS * ALTO_NODOS;
    private static final int[] DX = {1, -1, 0, 0};
    private static final int[] DY = {0, 0, 1, -1};

    private final Set<Integer> tramosBloqueados = new HashSet<>();
    private final boolean[] nodosBloqueados = new boolean[TOTAL_NODOS];
    private final Map<Integer, Double> distanciasMemorizadas = new HashMap<>();
    private final Map<Integer, List<Nodo>> caminosMemorizados = new HashMap<>();

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
     * 1 km y marca sus nodos para impedir cruces transversales.
     */
    public void aplicarBloqueosVigentes(Iterable<Bloqueo> bloqueosVigentes) {
        tramosBloqueados.clear();
        Arrays.fill(nodosBloqueados, false);
        distanciasMemorizadas.clear();
        caminosMemorizados.clear();
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
        marcarNodoBloqueado(x, y);
        while (x != hastaX) {
            int siguiente = x + (hastaX > x ? 1 : -1);
            tramosBloqueados.add(claveTramo(x, y, siguiente, y));
            x = siguiente;
            marcarNodoBloqueado(x, y);
        }
        while (y != hastaY) {
            int siguiente = y + (hastaY > y ? 1 : -1);
            tramosBloqueados.add(claveTramo(x, y, x, siguiente));
            y = siguiente;
            marcarNodoBloqueado(x, y);
        }
    }

    private void marcarNodoBloqueado(int x, int y) {
        if (x >= 0 && x < ANCHO_NODOS && y >= 0 && y < ALTO_NODOS) {
            nodosBloqueados[y * ANCHO_NODOS + x] = true;
        }
    }

    private boolean esNodoBloqueado(int x, int y) {
        return x >= 0 && x < ANCHO_NODOS && y >= 0 && y < ALTO_NODOS
                && nodosBloqueados[y * ANCHO_NODOS + x];
    }

    public boolean estaTramoBloqueado(Nodo a, Nodo b) {
        return tramosBloqueados.contains(claveTramo(a.getX(), a.getY(), b.getX(), b.getY()))
                || esNodoBloqueado(a.getX(), a.getY())
                || esNodoBloqueado(b.getX(), b.getY());
    }

    public int getCantidadTramosBloqueados() {
        return tramosBloqueados.size();
    }

    public boolean esNodoTransitable(Nodo nodo) {
        return nodo.getX() >= 0 && nodo.getX() <= ConstantesPaqrap.ANCHO_RETICULA_KM
                && nodo.getY() >= 0 && nodo.getY() <= ConstantesPaqrap.ALTO_RETICULA_KM
                && !esNodoBloqueado(nodo.getX(), nodo.getY());
    }

    /**
     * Trayectoria ortogonal entre dos nodos sobre la reticula que rodea
     * cualquier bloqueo vigente. Si no hay bloqueos en el camino directo,
     * emplea la trayectoria en L; si un bloqueo se interpone, calcula el
     * camino mas corto libre de bloqueos sobre la reticula para que ninguna
     * unidad cruce por encima de un tramo bloqueado.
     */
    public List<Nodo> caminoEnL(Nodo origen, Nodo destino) {
        if (origen.equals(destino)) {
            List<Nodo> unico = new ArrayList<>(1);
            unico.add(origen);
            return unico;
        }
        if (tramosBloqueados.isEmpty() || esCaminoLimpioHV(origen, destino)) {
            return construirCaminoHV(origen, destino);
        }
        if (esCaminoLimpioVH(origen, destino)) {
            return construirCaminoVH(origen, destino);
        }
        return new ArrayList<>(obtenerOCalcularCamino(origen, destino));
    }

    /**
     * Cuenta los tramos o nodos bloqueados que atravesaria la trayectoria en L
     * directa, sin materializar el camino.
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
            if (tramosBloqueados.contains(claveTramo(x, y, siguiente, y)) || esNodoBloqueado(siguiente, y)) {
                bloqueados++;
            }
            x = siguiente;
        }
        while (y != destino.getY()) {
            int siguiente = y + (destino.getY() > y ? 1 : -1);
            if (tramosBloqueados.contains(claveTramo(x, y, x, siguiente)) || esNodoBloqueado(x, siguiente)) {
                bloqueados++;
            }
            y = siguiente;
        }
        return bloqueados;
    }

    /**
     * Distancia efectiva en kilometros siguiendo la ruta ortogonal libre de
     * bloqueos mas corta sobre la reticula (la misma que devuelve
     * {@link #caminoEnL}).
     *
     * <p>El resultado se memoriza: el par de nodos se repite constantemente
     * dentro de una misma ejecucion y el estado de la red no cambia mientras
     * dura.</p>
     */
    public double distanciaKm(Nodo origen, Nodo destino) {
        int manhattan = origen.distanciaKmHasta(destino);
        if (manhattan == 0 || tramosBloqueados.isEmpty()) {
            return manhattan;
        }
        int clave = claveOrientada(origen, destino);
        Double memorizada = distanciasMemorizadas.get(clave);
        if (memorizada != null) {
            return memorizada;
        }
        double distancia;
        if (esCaminoLimpioHV(origen, destino) || esCaminoLimpioVH(origen, destino)) {
            distancia = manhattan;
            distanciasMemorizadas.put(clave, distancia);
        } else {
            obtenerOCalcularCamino(origen, destino);
            distancia = distanciasMemorizadas.getOrDefault(clave, (double) manhattan);
        }
        return distancia;
    }

    private boolean esCaminoLimpioHV(Nodo origen, Nodo destino) {
        int x = origen.getX();
        int y = origen.getY();
        if (esNodoBloqueado(x, y) || esNodoBloqueado(destino.getX(), destino.getY())) {
            return false;
        }
        while (x != destino.getX()) {
            int siguiente = x + (destino.getX() > x ? 1 : -1);
            if (esNodoBloqueado(siguiente, y) || tramosBloqueados.contains(claveTramo(x, y, siguiente, y))) {
                return false;
            }
            x = siguiente;
        }
        while (y != destino.getY()) {
            int siguiente = y + (destino.getY() > y ? 1 : -1);
            if (esNodoBloqueado(x, siguiente) || tramosBloqueados.contains(claveTramo(x, y, x, siguiente))) {
                return false;
            }
            y = siguiente;
        }
        return true;
    }

    private boolean esCaminoLimpioVH(Nodo origen, Nodo destino) {
        int x = origen.getX();
        int y = origen.getY();
        if (esNodoBloqueado(x, y) || esNodoBloqueado(destino.getX(), destino.getY())) {
            return false;
        }
        while (y != destino.getY()) {
            int siguiente = y + (destino.getY() > y ? 1 : -1);
            if (esNodoBloqueado(x, siguiente) || tramosBloqueados.contains(claveTramo(x, y, x, siguiente))) {
                return false;
            }
            y = siguiente;
        }
        while (x != destino.getX()) {
            int siguiente = x + (destino.getX() > x ? 1 : -1);
            if (esNodoBloqueado(siguiente, y) || tramosBloqueados.contains(claveTramo(x, y, siguiente, y))) {
                return false;
            }
            x = siguiente;
        }
        return true;
    }

    private static List<Nodo> construirCaminoHV(Nodo origen, Nodo destino) {
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

    private static List<Nodo> construirCaminoVH(Nodo origen, Nodo destino) {
        List<Nodo> camino = new ArrayList<>();
        camino.add(origen);
        int x = origen.getX();
        int y = origen.getY();
        while (y != destino.getY()) {
            y += destino.getY() > y ? 1 : -1;
            camino.add(new Nodo(x, y));
        }
        while (x != destino.getX()) {
            x += destino.getX() > x ? 1 : -1;
            camino.add(new Nodo(x, y));
        }
        return camino;
    }

    private List<Nodo> obtenerOCalcularCamino(Nodo origen, Nodo destino) {
        int clave = claveOrientada(origen, destino);
        List<Nodo> existente = caminosMemorizados.get(clave);
        if (existente != null) {
            return existente;
        }
        List<Nodo> calculado = buscarCaminoLimpioBfs(origen, destino);
        if (calculado != null) {
            caminosMemorizados.put(clave, calculado);
            distanciasMemorizadas.put(clave, (double) (calculado.size() - 1));
            return calculado;
        }
        return buscarCaminoMinimaPenalidad(origen, destino, clave);
    }

    /**
     * Busqueda en anchura (BFS) sobre la reticula de 71x51 nodos que evita
     * todos los tramos y nodos bloqueados y minimiza los giros para producir
     * desvios ortogonales limpios alrededor del bloqueo.
     */
    private List<Nodo> buscarCaminoLimpioBfs(Nodo origen, Nodo destino) {
        int ox = origen.getX();
        int oy = origen.getY();
        int dx = destino.getX();
        int dy = destino.getY();
        if (ox < 0 || ox >= ANCHO_NODOS || oy < 0 || oy >= ALTO_NODOS
                || dx < 0 || dx >= ANCHO_NODOS || dy < 0 || dy >= ALTO_NODOS) {
            return null;
        }

        int idxOrigen = oy * ANCHO_NODOS + ox;
        int idxDestino = dy * ANCHO_NODOS + dx;

        int[] dist = new int[TOTAL_NODOS];
        int[] giros = new int[TOTAL_NODOS];
        int[] padre = new int[TOTAL_NODOS];
        int[] dirLlegada = new int[TOTAL_NODOS];
        int[] cola = new int[TOTAL_NODOS];

        Arrays.fill(dist, -1);
        Arrays.fill(giros, Integer.MAX_VALUE);
        Arrays.fill(padre, -1);
        Arrays.fill(dirLlegada, -1);

        dist[idxOrigen] = 0;
        giros[idxOrigen] = 0;
        cola[0] = idxOrigen;
        int cabeza = 0;
        int fin = 1;

        while (cabeza < fin) {
            int u = cola[cabeza++];
            if (dist[idxDestino] != -1 && dist[u] >= dist[idxDestino]) {
                break;
            }
            int ux = u % ANCHO_NODOS;
            int uy = u / ANCHO_NODOS;

            for (int d = 0; d < 4; d++) {
                int nx = ux + DX[d];
                int ny = uy + DY[d];
                if (nx < 0 || nx >= ANCHO_NODOS || ny < 0 || ny >= ALTO_NODOS) {
                    continue;
                }
                int v = ny * ANCHO_NODOS + nx;
                if (tramosBloqueados.contains(claveTramo(ux, uy, nx, ny))) {
                    continue;
                }
                if (v != idxDestino && nodosBloqueados[v]) {
                    continue;
                }

                int nuevaDist = dist[u] + 1;
                int nuevosGiros = giros[u] + (dirLlegada[u] != -1 && dirLlegada[u] != d ? 1 : 0);

                if (dist[v] == -1) {
                    dist[v] = nuevaDist;
                    giros[v] = nuevosGiros;
                    padre[v] = u;
                    dirLlegada[v] = d;
                    cola[fin++] = v;
                } else if (dist[v] == nuevaDist && nuevosGiros < giros[v]) {
                    giros[v] = nuevosGiros;
                    padre[v] = u;
                    dirLlegada[v] = d;
                }
            }
        }

        if (dist[idxDestino] == -1) {
            return null;
        }

        List<Nodo> camino = reconstruirCamino(idxOrigen, idxDestino, padre);
        return Collections.unmodifiableList(camino);
    }

    /**
     * Respaldo cuando un pedido o almacen queda completamente encerrado por un
     * bloqueo: busca el camino que minimiza la cantidad de pasos bloqueados.
     */
    private List<Nodo> buscarCaminoMinimaPenalidad(Nodo origen, Nodo destino, int clave) {
        int ox = origen.getX();
        int oy = origen.getY();
        int dx = destino.getX();
        int dy = destino.getY();
        if (ox < 0 || ox >= ANCHO_NODOS || oy < 0 || oy >= ALTO_NODOS
                || dx < 0 || dx >= ANCHO_NODOS || dy < 0 || dy >= ALTO_NODOS) {
            List<Nodo> respaldo = construirCaminoHV(origen, destino);
            caminosMemorizados.put(clave, respaldo);
            distanciasMemorizadas.put(clave, (double) origen.distanciaKmHasta(destino));
            return respaldo;
        }

        int idxOrigen = oy * ANCHO_NODOS + ox;
        int idxDestino = dy * ANCHO_NODOS + dx;

        long[] costo = new long[TOTAL_NODOS];
        int[] padre = new int[TOTAL_NODOS];
        Arrays.fill(costo, Long.MAX_VALUE);
        Arrays.fill(padre, -1);

        PriorityQueue<long[]> cola = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        costo[idxOrigen] = 0L;
        cola.offer(new long[]{0L, idxOrigen});

        while (!cola.isEmpty()) {
            long[] actual = cola.poll();
            long c = actual[0];
            int u = (int) actual[1];
            if (u == idxDestino) {
                break;
            }
            if (c > costo[u]) {
                continue;
            }
            int ux = u % ANCHO_NODOS;
            int uy = u / ANCHO_NODOS;
            for (int d = 0; d < 4; d++) {
                int nx = ux + DX[d];
                int ny = uy + DY[d];
                if (nx < 0 || nx >= ANCHO_NODOS || ny < 0 || ny >= ALTO_NODOS) {
                    continue;
                }
                int v = ny * ANCHO_NODOS + nx;
                boolean aristaBloqueada = tramosBloqueados.contains(claveTramo(ux, uy, nx, ny));
                boolean nodoIntBloqueado = v != idxDestino && nodosBloqueados[v];
                long peso = 1L + (aristaBloqueada ? 100_000L : (nodoIntBloqueado ? 10_000L : 0L));
                long nuevoCosto = c + peso;
                if (nuevoCosto < costo[v]) {
                    costo[v] = nuevoCosto;
                    padre[v] = u;
                    cola.offer(new long[]{nuevoCosto, v});
                }
            }
        }

        if (padre[idxDestino] == -1 && idxOrigen != idxDestino) {
            List<Nodo> respaldo = construirCaminoHV(origen, destino);
            caminosMemorizados.put(clave, respaldo);
            distanciasMemorizadas.put(clave, (double) origen.distanciaKmHasta(destino));
            return respaldo;
        }

        List<Nodo> camino = Collections.unmodifiableList(reconstruirCamino(idxOrigen, idxDestino, padre));
        int pasosBloqueados = 0;
        for (int i = 0; i < camino.size() - 1; i++) {
            Nodo a = camino.get(i);
            Nodo b = camino.get(i + 1);
            if (tramosBloqueados.contains(claveTramo(a.getX(), a.getY(), b.getX(), b.getY()))
                    || (i + 1 < camino.size() - 1 && esNodoBloqueado(b.getX(), b.getY()))) {
                pasosBloqueados++;
            }
        }
        double distancia = (camino.size() - 1)
                + pasosBloqueados * ConstantesPaqrap.KM_DESVIO_POR_TRAMO_BLOQUEADO;
        caminosMemorizados.put(clave, camino);
        distanciasMemorizadas.put(clave, distancia);
        return camino;
    }

    private static List<Nodo> reconstruirCamino(int idxOrigen, int idxDestino, int[] padre) {
        List<Nodo> invertido = new ArrayList<>();
        int actual = idxDestino;
        while (actual != -1) {
            invertido.add(new Nodo(actual % ANCHO_NODOS, actual / ANCHO_NODOS));
            if (actual == idxOrigen) {
                break;
            }
            actual = padre[actual];
        }
        Collections.reverse(invertido);
        return invertido;
    }

    /**
     * Clave orientada: la trayectoria entre (a, b) y (b, a) se memoriza por
     * separado.
     */
    private static int claveOrientada(Nodo origen, Nodo destino) {
        return (origen.getX() << 24) | (origen.getY() << 16) | (destino.getX() << 8) | destino.getY();
    }
}
