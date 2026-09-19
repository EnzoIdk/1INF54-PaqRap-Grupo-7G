package pe.edu.pucp.paqrap.experimentacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import pe.edu.pucp.paqrap.carga.ResultadoCarga;
import pe.edu.pucp.paqrap.config.ParametrosAlmacen;
import pe.edu.pucp.paqrap.dto.ExperimentacionResponse;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.ParadaRuta;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.PlanRutas;
import pe.edu.pucp.paqrap.model.Ruta;
import pe.edu.pucp.paqrap.model.UnidadTransporte;
import pe.edu.pucp.paqrap.planificador.agaestw.PlanificadorAgaEsTw;
import pe.edu.pucp.paqrap.planificador.comun.ContextoPlanificacion;
import pe.edu.pucp.paqrap.planificador.comun.EvaluadorCosto;
import pe.edu.pucp.paqrap.planificador.comun.GeneradorAleatorio;
import pe.edu.pucp.paqrap.planificador.iaco.PlanificadorIACO;

import java.util.ArrayList;
import java.util.List;

/**
 * Ejecuta la experimentacion numerica: carga un turno de los archivos del
 * cliente y resuelve ese mismo turno con el I-ACO, con el AGA-ES-TW o con
 * ambos, para poder compararlos (requisito no funcional (a) del caso).
 *
 * <p>Los dos algoritmos reciben un contexto construido una sola vez, con la
 * misma flota, los mismos pedidos y los mismos bloqueos. Lo unico que los
 * distingue es como deciden la asignacion.</p>
 */
@Service
public class ServicioExperimentacion {

    private static final Logger log = LoggerFactory.getLogger(ServicioExperimentacion.class);

    private static final int MAXIMO_RECHAZOS_REPORTADOS = 10;

    private final CatalogoDatos catalogoDatos;
    private final CargadorEscenario cargadorEscenario;
    private final PlanificadorIACO planificadorIACO;
    private final PlanificadorAgaEsTw planificadorAgaEsTw;
    private final EvaluadorCosto evaluadorCosto;
    private final GeneradorAleatorio generadorAleatorio;
    private final ParametrosAlmacen parametrosAlmacen;

    public ServicioExperimentacion(CatalogoDatos catalogoDatos,
                                   CargadorEscenario cargadorEscenario,
                                   PlanificadorIACO planificadorIACO,
                                   PlanificadorAgaEsTw planificadorAgaEsTw,
                                   EvaluadorCosto evaluadorCosto,
                                   GeneradorAleatorio generadorAleatorio,
                                   ParametrosAlmacen parametrosAlmacen) {
        this.catalogoDatos = catalogoDatos;
        this.cargadorEscenario = cargadorEscenario;
        this.planificadorIACO = planificadorIACO;
        this.planificadorAgaEsTw = planificadorAgaEsTw;
        this.evaluadorCosto = evaluadorCosto;
        this.generadorAleatorio = generadorAleatorio;
        this.parametrosAlmacen = parametrosAlmacen;
    }

    public List<CatalogoDatos.ConjuntoDatos> listarConjuntos() {
        return catalogoDatos.listarConjuntos();
    }

    public ExperimentacionResponse ejecutar(ParametrosEjecucion parametros) {
        EscenarioTurno escenario = cargadorEscenario.cargar(parametros);
        long semilla = parametros.semilla() != null
                ? parametros.semilla() : generadorAleatorio.getSemillaPorDefecto();

        ContextoPlanificacion contexto = ContextoPlanificacion.crear(
                escenario.pedidosDelTurno(),
                escenario.flota(),
                escenario.almacenes(),
                escenario.bloqueosVigentes(),
                escenario.averias(),
                escenario.minutoInicio());

        List<ExperimentacionResponse.EjecucionDto> ejecuciones = new ArrayList<>();
        String algoritmo = parametros.algoritmoSolicitado();

        if (algoritmo.equals("IACO") || algoritmo.equals("AMBOS")) {
            ejecuciones.add(aEjecucionDto(planificadorIACO.ejecutar(contexto, semilla), escenario));
        }
        if (algoritmo.equals("AGAESTW") || algoritmo.equals("AMBOS")) {
            ejecuciones.add(aEjecucionDto(planificadorAgaEsTw.ejecutar(contexto, semilla), escenario));
        }
        if (ejecuciones.isEmpty()) {
            throw new IllegalArgumentException("Algoritmo no reconocido: " + algoritmo);
        }

        log.info("Experimentacion sobre {} dia {}: {} algoritmo(s) con semilla {}",
                escenario.conjunto().archivoVentas(), escenario.dia(), ejecuciones.size(), semilla);

        return new ExperimentacionResponse(aEscenarioDto(escenario, semilla), ejecuciones);
    }

    // ============================================================ MAPEO A DTO

    private ExperimentacionResponse.EscenarioDto aEscenarioDto(EscenarioTurno escenario, long semilla) {
        List<ExperimentacionResponse.CargaDto> cargas = new ArrayList<>();
        cargas.add(aCargaDto(escenario.conjunto().archivoVentas(), escenario.resumenVentas()));
        if (escenario.conjunto().archivoBloqueos() != null) {
            cargas.add(aCargaDto(escenario.conjunto().archivoBloqueos(), escenario.resumenBloqueos()));
        }
        if (escenario.conjunto().archivoMantenimiento() != null) {
            cargas.add(aCargaDto(escenario.conjunto().archivoMantenimiento(), escenario.resumenMantenimiento()));
        }

        return new ExperimentacionResponse.EscenarioDto(
                escenario.conjunto().archivoVentas(),
                escenario.conjunto().archivoBloqueos(),
                escenario.conjunto().archivoMantenimiento(),
                escenario.conjunto().anio(),
                escenario.conjunto().mes(),
                escenario.dia(),
                escenario.minutoInicio(),
                escenario.minutoFin(),
                escenario.pedidosDelTurno().size(),
                escenario.pedidosDelMes(),
                escenario.bloqueosVigentes().size(),
                escenario.bloqueosDelMes(),
                semilla,
                cargas,
                escenario.almacenes().stream().map(this::aAlmacenDto).toList(),
                escenario.bloqueosVigentes().stream().map(this::aBloqueoDto).toList(),
                escenario.flota().stream().map(this::aUnidadDto).toList(),
                escenario.unidadesEnMantenimiento());
    }

    private ExperimentacionResponse.CargaDto aCargaDto(String archivo, ResultadoCarga resumen) {
        return new ExperimentacionResponse.CargaDto(
                archivo,
                resumen.getRegistrosLeidos(),
                resumen.getRegistrosAceptados(),
                resumen.getRegistrosRechazados(),
                resumen.getDetalleRechazos().stream().limit(MAXIMO_RECHAZOS_REPORTADOS).toList());
    }

    private ExperimentacionResponse.AlmacenDto aAlmacenDto(Almacen almacen) {
        return new ExperimentacionResponse.AlmacenDto(
                almacen.getCodigo(),
                almacen.getTipoAlmacen().name(),
                almacen.getUbicacion().getX(),
                almacen.getUbicacion().getY(),
                almacen.getStockActual(),
                parametrosAlmacen.stockMaximo());
    }

    private ExperimentacionResponse.BloqueoDto aBloqueoDto(Bloqueo bloqueo) {
        List<int[]> nodos = bloqueo.getNodos().stream()
                .map(nodo -> new int[]{nodo.getX(), nodo.getY()})
                .toList();
        return new ExperimentacionResponse.BloqueoDto(
                bloqueo.getInicioMinuto(), bloqueo.getFinMinuto(), nodos);
    }

    private ExperimentacionResponse.UnidadDto aUnidadDto(UnidadTransporte unidad) {
        Nodo ubicacion = unidad.getUbicacion();
        return new ExperimentacionResponse.UnidadDto(
                unidad.getCodigo(),
                unidad.getTipoUnidad().name(),
                unidad.getEstado().name(),
                evaluadorCosto.obtenerCapacidad(unidad.getTipoUnidad()),
                evaluadorCosto.obtenerVelocidadKmH(unidad.getTipoUnidad()),
                evaluadorCosto.obtenerCostoPorKm(unidad.getTipoUnidad()),
                ubicacion != null ? ubicacion.getX() : 0,
                ubicacion != null ? ubicacion.getY() : 0);
    }

    private ExperimentacionResponse.EjecucionDto aEjecucionDto(PlanRutas plan, EscenarioTurno escenario) {
        List<ExperimentacionResponse.RutaDto> rutas = plan.getRutasConCarga().stream()
                .map(this::aRutaDto)
                .toList();

        ExperimentacionResponse.MetricasDto metricas = new ExperimentacionResponse.MetricasDto(
                escenario.pedidosDelTurno().size(),
                plan.getPedidosAtendidos(),
                plan.getPedidosNoAsignados().size(),
                plan.getEntregasFueraDePlazo(),
                rutas.size(),
                escenario.unidadesOperativas().size(),
                plan.getDistanciaTotalKm(),
                plan.getCostoOperativoTotal(),
                plan.getMultas(),
                plan.getFitness(),
                plan.getDuracionComputoMs());

        return new ExperimentacionResponse.EjecucionDto(
                plan.getAlgoritmo(),
                metricas,
                rutas,
                plan.getPedidosNoAsignados().stream().map(this::aPedidoPendienteDto).toList(),
                plan.getRiesgosDeColapso());
    }

    private ExperimentacionResponse.RutaDto aRutaDto(Ruta ruta) {
        List<int[]> recorrido = ruta.getSecuenciaNodos().stream()
                .map(nodo -> new int[]{nodo.getX(), nodo.getY()})
                .toList();

        return new ExperimentacionResponse.RutaDto(
                ruta.getUnidadTransporte().getCodigo(),
                ruta.getUnidadTransporte().getTipoUnidad().name(),
                ruta.getAlmacenOrigen().getCodigo(),
                ruta.getCargaTotal(),
                evaluadorCosto.obtenerCapacidad(ruta.getUnidadTransporte().getTipoUnidad()),
                ruta.getDistanciaKm(),
                evaluadorCosto.calcularCostoOperativo(ruta),
                ruta.getMinutoSalidaAlmacen(),
                ruta.getMinutoFin(),
                recorrido,
                ruta.getMinutosPorNodo(),
                ruta.getParadas().stream().map(this::aParadaDto).toList());
    }

    private ExperimentacionResponse.ParadaDto aParadaDto(ParadaRuta parada) {
        Pedido pedido = parada.getPedido();
        return new ExperimentacionResponse.ParadaDto(
                pedido.getCodigo(),
                pedido.getClienteId(),
                pedido.getUbicacion().getX(),
                pedido.getUbicacion().getY(),
                pedido.getCantidadProducto(),
                pedido.getPlazoHoras(),
                pedido.getMinutoSimulacion(),
                pedido.getMinutoLimiteEntrega(),
                parada.getMinutoLlegada(),
                parada.getMinutoSalida(),
                parada.cumplePlazo(),
                parada.getHolguraMinutos());
    }

    private ExperimentacionResponse.PedidoPendienteDto aPedidoPendienteDto(Pedido pedido) {
        return new ExperimentacionResponse.PedidoPendienteDto(
                pedido.getCodigo(),
                pedido.getClienteId(),
                pedido.getUbicacion().getX(),
                pedido.getUbicacion().getY(),
                pedido.getCantidadProducto(),
                pedido.getPlazoHoras(),
                pedido.getMinutoSimulacion(),
                pedido.getMinutoLimiteEntrega());
    }
}
