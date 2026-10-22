package pe.edu.pucp.paqrap.experimentacion;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import pe.edu.pucp.paqrap.carga.MantenimientoProgramado;
import pe.edu.pucp.paqrap.carga.ResultadoCarga;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.config.ParametrosAlmacen;
import pe.edu.pucp.paqrap.dto.ExperimentacionResponse;
import pe.edu.pucp.paqrap.enums.TipoAlmacen;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Averia;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.ParadaRuta;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.PlanRutas;
import pe.edu.pucp.paqrap.model.Ruta;
import pe.edu.pucp.paqrap.model.UnidadTransporte;
import pe.edu.pucp.paqrap.planificador.Planificador;
import pe.edu.pucp.paqrap.planificador.agaestw.PlanificadorAgaEsTw;
import pe.edu.pucp.paqrap.planificador.comun.ContextoPlanificacion;
import pe.edu.pucp.paqrap.planificador.comun.EvaluadorCosto;
import pe.edu.pucp.paqrap.planificador.comun.GeneradorAleatorio;
import pe.edu.pucp.paqrap.planificador.iaco.PlanificadorIACO;

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

        List<ExperimentacionResponse.MantenimientoDto> mantenimientosProgramados = escenario.unidadesEnMantenimiento().stream()
                .map(codigo -> new ExperimentacionResponse.MantenimientoDto(
                        codigo,
                        escenario.dia(),
                        (escenario.dia() - 1) * ConstantesPaqrap.MINUTOS_POR_DIA,
                        escenario.dia() * ConstantesPaqrap.MINUTOS_POR_DIA))
                .toList();

        return new ExperimentacionResponse(aEscenarioDto(escenario, semilla, mantenimientosProgramados), ejecuciones);
    }

    public ExperimentacionResponse ejecutarCincoDias(ParametrosCincoDias parametros) {
        EscenarioCincoDias datosCincoDias = cargadorEscenario.cargarCincoDias(parametros);
        EscenarioTurno escenario = datosCincoDias.escenario();
        long semilla = parametros.semilla() != null
                ? parametros.semilla() : generadorAleatorio.getSemillaPorDefecto();

        List<ExperimentacionResponse.EjecucionDto> ejecuciones = new ArrayList<>();
        String algoritmo = parametros.algoritmoSolicitado();

        if (algoritmo.equals("IACO") || algoritmo.equals("AMBOS")) {
            ejecuciones.add(simularCincoDias(
                    planificadorIACO, PlanificadorIACO.NOMBRE, datosCincoDias, parametros, semilla));
        }
        if (algoritmo.equals("AGAESTW") || algoritmo.equals("AMBOS")) {
            ejecuciones.add(simularCincoDias(
                    planificadorAgaEsTw, PlanificadorAgaEsTw.NOMBRE, datosCincoDias, parametros, semilla));
        }
        if (ejecuciones.isEmpty()) {
            throw new IllegalArgumentException("Algoritmo no reconocido: " + algoritmo);
        }

        log.info("Simulacion 5D sobre {} dias {}-{}: {} algoritmo(s) con semilla {}",
                escenario.conjunto().archivoVentas(), parametros.diaInicio(), parametros.diaFin(), ejecuciones.size(), semilla);

        List<ExperimentacionResponse.MantenimientoDto> mantenimientosProgramados = new ArrayList<>();
        for (int dia = parametros.diaInicio(); dia <= parametros.diaFin(); dia++) {
            final int d = dia;
            for (pe.edu.pucp.paqrap.carga.MantenimientoProgramado m : datosCincoDias.mantenimientos()) {
                if (m.fecha().getDayOfMonth() == d && m.fecha().getMonthValue() % 2 == escenario.conjunto().mes() % 2) {
                    mantenimientosProgramados.add(new ExperimentacionResponse.MantenimientoDto(
                            m.codigoUnidad(),
                            d,
                            (d - 1) * ConstantesPaqrap.MINUTOS_POR_DIA,
                            d * ConstantesPaqrap.MINUTOS_POR_DIA));
                }
            }
        }

        return new ExperimentacionResponse(aEscenarioDto(escenario, semilla, mantenimientosProgramados), ejecuciones);
    }

    private ExperimentacionResponse.EjecucionDto simularCincoDias(
            Planificador planificador,
            String nombreAlgoritmo,
            EscenarioCincoDias datosCincoDias,
            ParametrosCincoDias parametros,
            long semillaBase) {

        EscenarioTurno escenario = datosCincoDias.escenario();
        List<MantenimientoProgramado> mantenimientos = datosCincoDias.mantenimientos();
        List<Bloqueo> bloqueosDelMes = datosCincoDias.bloqueosDelMes();

        int minutoInicio = parametros.minutoInicio();
        int duracionTurno = 8 * ConstantesPaqrap.MINUTOS_POR_HORA; // 480 min por turno
        int numTurnos = 15; // 5 dias * 3 turnos/dia = 15 turnos (120 h)

        List<Almacen> almacenesBase = cargadorEscenario.construirAlmacenes();
        Nodo ubicacionCentral = almacenesBase.get(0).getUbicacion();

        // Stock de almacenes intermedios
        int stockNO = parametrosAlmacen.stockMaximo();
        int stockEste = parametrosAlmacen.stockMaximo();
        int diaAnterior = -1;

        List<Pedido> pedidosPendientes = new ArrayList<>();
        Set<String> codigosAtendidos = new HashSet<>();
        List<Ruta> todasLasRutas = new ArrayList<>();
        List<Pedido> pedidosNoAsignados = new ArrayList<>();
        List<String> riesgosDeColapso = new ArrayList<>();

        double costoOperativoTotal = 0;
        double multasTotales = 0;
        long duracionComputoTotalMs = 0;
        long entregasFueraDePlazoTotales = 0;
        double distanciaTotalKm = 0;

        Map<String, Almacen> almacenActualPorUnidad = new HashMap<>();

        for (int s = 0; s < numTurnos; s++) {
            int turnoInicio = minutoInicio + s * duracionTurno;
            int turnoFin = turnoInicio + duracionTurno;
            int diaActual = (turnoInicio / ConstantesPaqrap.MINUTOS_POR_DIA) + 1;

            // Recarga instantanea diaria a las 23:59:59 cada 24 horas
            if (diaAnterior != -1 && diaActual != diaAnterior) {
                stockNO = parametrosAlmacen.stockMaximo();
                stockEste = parametrosAlmacen.stockMaximo();
            }
            diaAnterior = diaActual;

            // Llegada de pedidos del turno
            for (Pedido p : escenario.pedidosDelTurno()) {
                if (p.getMinutoSimulacion() >= turnoInicio && p.getMinutoSimulacion() < turnoFin) {
                    pedidosPendientes.add(p);
                }
            }

            // Expiración de pedidos por plazo comprometido
            Iterator<Pedido> iter = pedidosPendientes.iterator();
            while (iter.hasNext()) {
                Pedido p = iter.next();
                if (p.getMinutoLimiteEntrega() <= turnoInicio) {
                    iter.remove();
                    if (!pedidosNoAsignados.contains(p)) {
                        pedidosNoAsignados.add(p);
                        riesgosDeColapso.add(String.format(
                                "Colapso logístico: Pedido %s (cliente %s, %d u) venció plazo (%d h) en minuto %d sin asignación",
                                p.getCodigo(), p.getClienteId(), p.getCantidadProducto(), p.getPlazoHoras(), p.getMinutoLimiteEntrega()));
                    }
                }
            }

            if (pedidosPendientes.isEmpty()) {
                continue;
            }

            // Priorizar pedidos mas criticos
            pedidosPendientes.sort(Comparator.comparingInt(Pedido::getMinutoLimiteEntrega));
            int maximoTurno = parametros.maximoPedidosPorTurnoEfectivo();
            List<Pedido> pedidosParaTurno = new ArrayList<>(
                    pedidosPendientes.subList(0, Math.min(pedidosPendientes.size(), maximoTurno)));

            // Flota operativa del turno considerando mantenimiento del dia y ubicacion tras retornos previos
            List<UnidadTransporte> flotaTurno = cargadorEscenario.construirFlota(
                    parametros.cantidadAutos(), parametros.cantidadMotos(), parametros.cantidadBicicletas(),
                    ubicacionCentral);
            for (UnidadTransporte unidad : flotaTurno) {
                Almacen almacenDondeEsta = almacenActualPorUnidad.get(unidad.getCodigo());
                if (almacenDondeEsta != null) {
                    unidad.setUbicacion(almacenDondeEsta.getUbicacion());
                }
            }
            cargadorEscenario.aplicarMantenimiento(flotaTurno, mantenimientos, escenario.conjunto().mes(), diaActual, turnoInicio);

            // Averias inyectadas para este turno
            List<Averia> averiasTurno = escenario.averias().stream()
                    .filter(a -> a.getMinutoSimulacion() >= turnoInicio && a.getMinutoSimulacion() < turnoFin)
                    .toList();

            // Almacenes con stock vigente
            Almacen almCentral = new Almacen("ALM-CENTRAL", TipoAlmacen.CENTRAL, almacenesBase.get(0).getUbicacion(), parametrosAlmacen.stockMaximo());
            Almacen almNO = new Almacen("ALM-NOROESTE", TipoAlmacen.INTERMEDIO, almacenesBase.get(1).getUbicacion(), stockNO);
            Almacen almEste = new Almacen("ALM-ESTE", TipoAlmacen.INTERMEDIO, almacenesBase.get(2).getUbicacion(), stockEste);
            List<Almacen> almacenesTurno = List.of(almCentral, almNO, almEste);

            // Bloqueos vigentes en la ventana del turno
            List<Bloqueo> bloqueosTurno = bloqueosDelMes.stream()
                    .filter(b -> b.getInicioMinuto() < turnoFin && b.getFinMinuto() > turnoInicio)
                    .toList();

            ContextoPlanificacion contextoTurno = ContextoPlanificacion.crear(
                    pedidosParaTurno, flotaTurno, almacenesTurno, bloqueosTurno, averiasTurno, turnoInicio);

            long semillaTurno = semillaBase + s * 37L;
            PlanRutas planTurno;
            if (planificador instanceof PlanificadorIACO iaco) {
                planTurno = iaco.ejecutar(contextoTurno, semillaTurno);
            } else if (planificador instanceof PlanificadorAgaEsTw aga) {
                planTurno = aga.ejecutar(contextoTurno, semillaTurno);
            } else {
                planTurno = planificador.planificarRutas(pedidosParaTurno, contextoTurno.unidadesOperativas(), almacenesTurno, bloqueosTurno, turnoInicio);
            }

            duracionComputoTotalMs += planTurno.getDuracionComputoMs();
            multasTotales += planTurno.getMultas();

            for (Ruta ruta : planTurno.getRutasConCarga()) {
                todasLasRutas.add(ruta);
                distanciaTotalKm += ruta.getDistanciaKm();
                costoOperativoTotal += evaluadorCosto.calcularCostoOperativo(ruta);
                entregasFueraDePlazoTotales += ruta.contarParadasFueraDePlazo();

                if (!ruta.getAlmacenOrigen().esCentral()) {
                    if ("ALM-NOROESTE".equals(ruta.getAlmacenOrigen().getCodigo())) {
                        stockNO = Math.max(0, stockNO - ruta.getCargaTotal());
                    } else if ("ALM-ESTE".equals(ruta.getAlmacenOrigen().getCodigo())) {
                        stockEste = Math.max(0, stockEste - ruta.getCargaTotal());
                    }
                }

                for (ParadaRuta parada : ruta.getParadas()) {
                    codigosAtendidos.add(parada.getPedido().getCodigo());
                    pedidosPendientes.remove(parada.getPedido());
                }

                // La unidad completó su retorno y queda estacionada en su almacenDestino
                almacenActualPorUnidad.put(ruta.getUnidadTransporte().getCodigo(), ruta.getAlmacenDestino());
            }

            // Los pedidos no asignados en este turno se evaluan:
            for (Pedido noAsignado : planTurno.getPedidosNoAsignados()) {
                if (noAsignado.getMinutoLimiteEntrega() <= turnoFin + 60) {
                    pedidosPendientes.remove(noAsignado);
                    if (!pedidosNoAsignados.contains(noAsignado)) {
                        pedidosNoAsignados.add(noAsignado);
                        riesgosDeColapso.add(String.format(
                                "Riesgo colapso: Pedido %s sin asignación factible antes de su plazo (%d h)",
                                noAsignado.getCodigo(), noAsignado.getPlazoHoras()));
                    }
                }
            }
        }

        // Al finalizar los 5 dias, los pedidos pendientes no atendidos pasan a no asignados
        for (Pedido rem : pedidosPendientes) {
            if (!pedidosNoAsignados.contains(rem)) {
                pedidosNoAsignados.add(rem);
                riesgosDeColapso.add(String.format(
                        "Pedido %s sin asignar al finalizar la simulación de 5 días", rem.getCodigo()));
            }
        }

        double fitness = 1.0 / (1.0 + costoOperativoTotal + multasTotales);
        int unidadesConRuta = (int) todasLasRutas.stream()
                .map(r -> r.getUnidadTransporte().getCodigo())
                .distinct()
                .count();

        ExperimentacionResponse.MetricasDto metricas = new ExperimentacionResponse.MetricasDto(
                escenario.pedidosDelTurno().size(),
                codigosAtendidos.size(),
                pedidosNoAsignados.size(),
                entregasFueraDePlazoTotales,
                unidadesConRuta,
                escenario.flota().size(),
                distanciaTotalKm,
                costoOperativoTotal,
                multasTotales,
                fitness,
                duracionComputoTotalMs);

        List<ExperimentacionResponse.RutaDto> rutasDto = todasLasRutas.stream()
                .map(this::aRutaDto)
                .toList();

        return new ExperimentacionResponse.EjecucionDto(
                nombreAlgoritmo,
                metricas,
                rutasDto,
                pedidosNoAsignados.stream().map(this::aPedidoPendienteDto).toList(),
                riesgosDeColapso);
    }

    public ExperimentacionResponse ejecutarColapso(ParametrosColapso parametros) {
        EscenarioColapso datosColapso = cargadorEscenario.cargarColapso(parametros);
        EscenarioTurno escenario = datosColapso.escenario();
        long semilla = parametros.semilla() != null
                ? parametros.semilla() : generadorAleatorio.getSemillaPorDefecto();

        List<ExperimentacionResponse.EjecucionDto> ejecuciones = new ArrayList<>();
        String algoritmo = parametros.algoritmoSolicitado();

        if (algoritmo.equals("IACO") || algoritmo.equals("AMBOS")) {
            ejecuciones.add(simularColapsoAlgoritmo(
                    planificadorIACO, PlanificadorIACO.NOMBRE, datosColapso, parametros, semilla));
        }
        if (algoritmo.equals("AGAESTW") || algoritmo.equals("AMBOS")) {
            ejecuciones.add(simularColapsoAlgoritmo(
                    planificadorAgaEsTw, PlanificadorAgaEsTw.NOMBRE, datosColapso, parametros, semilla));
        }
        if (ejecuciones.isEmpty()) {
            throw new IllegalArgumentException("Algoritmo no reconocido: " + algoritmo);
        }

        // Determinar colapso de referencia para el escenario
        ExperimentacionResponse.EjecucionDto colapsoRef = ejecuciones.stream()
                .filter(e -> Boolean.TRUE.equals(e.colapsoOcurrido()))
                .min(Comparator.comparingInt(e -> e.minutoColapso() != null ? e.minutoColapso() : Integer.MAX_VALUE))
                .orElse(ejecuciones.get(0));

        boolean colapsoGlobal = Boolean.TRUE.equals(colapsoRef.colapsoOcurrido());
        Integer minutoColapsoGlobal = colapsoRef.minutoColapso();
        String fechaHoraColapsoGlobal = colapsoRef.fechaHoraColapso();
        String motivoColapsoGlobal = colapsoRef.motivoColapso();

        int maxMinutoFin = ejecuciones.stream()
                .flatMap(e -> e.rutas().stream())
                .mapToInt(ExperimentacionResponse.RutaDto::minutoFin)
                .max()
                .orElse(escenario.minutoInicio() + 480);
        if (minutoColapsoGlobal != null) {
            maxMinutoFin = Math.max(maxMinutoFin, minutoColapsoGlobal);
        }

        List<ExperimentacionResponse.MantenimientoDto> mantenimientosProgramados = new ArrayList<>();
        for (int dia = parametros.diaInicio(); dia <= 31; dia++) {
            final int d = dia;
            for (pe.edu.pucp.paqrap.carga.MantenimientoProgramado m : datosColapso.mantenimientos()) {
                if (m.fecha().getDayOfMonth() == d && m.fecha().getMonthValue() % 2 == escenario.conjunto().mes() % 2) {
                    mantenimientosProgramados.add(new ExperimentacionResponse.MantenimientoDto(
                            m.codigoUnidad(),
                            d,
                            (d - 1) * ConstantesPaqrap.MINUTOS_POR_DIA,
                            d * ConstantesPaqrap.MINUTOS_POR_DIA));
                }
            }
        }

        ExperimentacionResponse.EscenarioDto escenarioDto = aEscenarioColapsoDto(
                escenario, semilla, maxMinutoFin, colapsoGlobal, minutoColapsoGlobal, fechaHoraColapsoGlobal, motivoColapsoGlobal,
                mantenimientosProgramados);

        log.info("Simulacion hasta el colapso sobre {} desde dia {}: {} algoritmo(s), colapso={}: {}",
                escenario.conjunto().archivoVentas(), parametros.diaInicio(), ejecuciones.size(), colapsoGlobal, motivoColapsoGlobal);

        return new ExperimentacionResponse(escenarioDto, ejecuciones);
    }

    private ExperimentacionResponse.EjecucionDto simularColapsoAlgoritmo(
            Planificador planificador,
            String nombreAlgoritmo,
            EscenarioColapso datosColapso,
            ParametrosColapso parametros,
            long semillaBase) {

        EscenarioTurno escenario = datosColapso.escenario();
        List<MantenimientoProgramado> mantenimientos = datosColapso.mantenimientos();
        List<Bloqueo> bloqueosDelMes = datosColapso.bloqueosDelMes();

        int minutoInicio = parametros.minutoInicio();
        int duracionTurno = 8 * ConstantesPaqrap.MINUTOS_POR_HORA; // 480 min por turno
        int diasRestantes = Math.max(1, 31 - parametros.diaInicio() + 1);
        int maxTurnos = diasRestantes * 3;

        List<Almacen> almacenesBase = cargadorEscenario.construirAlmacenes();
        Nodo ubicacionCentral = almacenesBase.get(0).getUbicacion();

        int stockNO = parametrosAlmacen.stockMaximo();
        int stockEste = parametrosAlmacen.stockMaximo();
        int diaAnterior = -1;

        List<Pedido> pedidosPendientes = new ArrayList<>();
        Set<String> codigosAtendidos = new HashSet<>();
        List<Ruta> todasLasRutas = new ArrayList<>();
        List<Pedido> pedidosNoAsignados = new ArrayList<>();
        List<String> riesgosDeColapso = new ArrayList<>();

        double costoOperativoTotal = 0;
        double multasTotales = 0;
        long duracionComputoTotalMs = 0;
        long entregasFueraDePlazoTotales = 0;
        double distanciaTotalKm = 0;

        boolean colapsado = false;
        Integer minutoColapso = null;
        String fechaHoraColapso = null;
        String motivoColapso = null;

        Map<String, Almacen> almacenActualPorUnidad = new HashMap<>();

        for (int s = 0; s < maxTurnos; s++) {
            int turnoInicio = minutoInicio + s * duracionTurno;
            int turnoFin = turnoInicio + duracionTurno;
            int diaActual = (turnoInicio / ConstantesPaqrap.MINUTOS_POR_DIA) + 1;

            if (diaActual > 31) {
                break;
            }

            // Recarga instantanea diaria a las 23:59:59 cada 24 horas
            if (diaAnterior != -1 && diaActual != diaAnterior) {
                stockNO = parametrosAlmacen.stockMaximo();
                stockEste = parametrosAlmacen.stockMaximo();
            }
            diaAnterior = diaActual;

            // Llegada de pedidos del turno
            for (Pedido p : escenario.pedidosDelTurno()) {
                if (p.getMinutoSimulacion() >= turnoInicio && p.getMinutoSimulacion() < turnoFin) {
                    pedidosPendientes.add(p);
                }
            }

            // 1. Verificacion pre-turno: pedidos vencidos antes de ser asignados
            Iterator<Pedido> iter = pedidosPendientes.iterator();
            while (iter.hasNext()) {
                Pedido p = iter.next();
                if (p.getMinutoLimiteEntrega() <= turnoInicio) {
                    iter.remove();
                    if (!pedidosNoAsignados.contains(p)) {
                        pedidosNoAsignados.add(p);
                    }
                    if (!colapsado) {
                        colapsado = true;
                        minutoColapso = p.getMinutoLimiteEntrega();
                        motivoColapso = String.format(
                                "El pedido %s (cliente %s, %d u) venció su plazo comprometido de %d horas el %s antes de recibir asignación de ruta.",
                                p.getCodigo(), p.getClienteId(), p.getCantidadProducto(), p.getPlazoHoras(),
                                formatearMinutoAFechaHora(minutoColapso, escenario.conjunto().anio(), escenario.conjunto().mes()));
                        riesgosDeColapso.add(motivoColapso);
                    }
                }
            }

            if (colapsado) {
                fechaHoraColapso = formatearFechaHoraColapso(minutoColapso, escenario.conjunto().anio(), escenario.conjunto().mes());
                break;
            }

            if (pedidosPendientes.isEmpty()) {
                continue;
            }

            // Priorizar pedidos mas criticos
            pedidosPendientes.sort(Comparator.comparingInt(Pedido::getMinutoLimiteEntrega));
            int maximoTurno = parametros.maximoPedidosPorTurnoEfectivo();
            List<Pedido> pedidosParaTurno = new ArrayList<>(
                    pedidosPendientes.subList(0, Math.min(pedidosPendientes.size(), maximoTurno)));

            // Flota operativa del turno considerando mantenimiento y ubicacion tras retornos previos
            List<UnidadTransporte> flotaTurno = cargadorEscenario.construirFlota(
                    parametros.cantidadAutos(), parametros.cantidadMotos(), parametros.cantidadBicicletas(),
                    ubicacionCentral);
            for (UnidadTransporte unidad : flotaTurno) {
                Almacen almacenDondeEsta = almacenActualPorUnidad.get(unidad.getCodigo());
                if (almacenDondeEsta != null) {
                    unidad.setUbicacion(almacenDondeEsta.getUbicacion());
                }
            }
            cargadorEscenario.aplicarMantenimiento(flotaTurno, mantenimientos, escenario.conjunto().mes(), diaActual, turnoInicio);

            // Averias inyectadas para este turno
            List<Averia> averiasTurno = escenario.averias().stream()
                    .filter(a -> a.getMinutoSimulacion() >= turnoInicio && a.getMinutoSimulacion() < turnoFin)
                    .toList();

            // Almacenes con stock vigente
            Almacen almCentral = new Almacen("ALM-CENTRAL", TipoAlmacen.CENTRAL, almacenesBase.get(0).getUbicacion(), parametrosAlmacen.stockMaximo());
            Almacen almNO = new Almacen("ALM-NOROESTE", TipoAlmacen.INTERMEDIO, almacenesBase.get(1).getUbicacion(), stockNO);
            Almacen almEste = new Almacen("ALM-ESTE", TipoAlmacen.INTERMEDIO, almacenesBase.get(2).getUbicacion(), stockEste);
            List<Almacen> almacenesTurno = List.of(almCentral, almNO, almEste);

            // Bloqueos vigentes en la ventana del turno
            List<Bloqueo> bloqueosTurno = bloqueosDelMes.stream()
                    .filter(b -> b.getInicioMinuto() < turnoFin && b.getFinMinuto() > turnoInicio)
                    .toList();

            ContextoPlanificacion contextoTurno = ContextoPlanificacion.crear(
                    pedidosParaTurno, flotaTurno, almacenesTurno, bloqueosTurno, averiasTurno, turnoInicio);

            long semillaTurno = semillaBase + s * 37L;
            PlanRutas planTurno;
            if (planificador instanceof PlanificadorIACO iaco) {
                planTurno = iaco.ejecutar(contextoTurno, semillaTurno);
            } else if (planificador instanceof PlanificadorAgaEsTw aga) {
                planTurno = aga.ejecutar(contextoTurno, semillaTurno);
            } else {
                planTurno = planificador.planificarRutas(pedidosParaTurno, contextoTurno.unidadesOperativas(), almacenesTurno, bloqueosTurno, turnoInicio);
            }

            duracionComputoTotalMs += planTurno.getDuracionComputoMs();
            multasTotales += planTurno.getMultas();

            // Evaluar rutas y paradas
            for (Ruta ruta : planTurno.getRutasConCarga()) {
                todasLasRutas.add(ruta);
                distanciaTotalKm += ruta.getDistanciaKm();
                costoOperativoTotal += evaluadorCosto.calcularCostoOperativo(ruta);
                entregasFueraDePlazoTotales += ruta.contarParadasFueraDePlazo();

                if (!ruta.getAlmacenOrigen().esCentral()) {
                    if ("ALM-NOROESTE".equals(ruta.getAlmacenOrigen().getCodigo())) {
                        stockNO = Math.max(0, stockNO - ruta.getCargaTotal());
                    } else if ("ALM-ESTE".equals(ruta.getAlmacenOrigen().getCodigo())) {
                        stockEste = Math.max(0, stockEste - ruta.getCargaTotal());
                    }
                }

                for (ParadaRuta parada : ruta.getParadas()) {
                    codigosAtendidos.add(parada.getPedido().getCodigo());
                    pedidosPendientes.remove(parada.getPedido());

                    // 2. Verificacion en ruta: parada con entrega fuera del plazo comprometido
                    if (!colapsado && (!parada.cumplePlazo() || parada.getMinutoLlegada() > parada.getPedido().getMinutoLimiteEntrega())) {
                        colapsado = true;
                        minutoColapso = parada.getMinutoLlegada();
                        motivoColapso = String.format(
                                "El pedido %s asignado a la unidad %s (%s) llega el %s, excediendo el plazo comprometido de %d horas (límite: %s).",
                                parada.getPedido().getCodigo(), ruta.getUnidadTransporte().getCodigo(), ruta.getUnidadTransporte().getTipoUnidad(),
                                formatearMinutoAFechaHora(minutoColapso, escenario.conjunto().anio(), escenario.conjunto().mes()),
                                parada.getPedido().getPlazoHoras(),
                                formatearMinutoAFechaHora(parada.getPedido().getMinutoLimiteEntrega(), escenario.conjunto().anio(), escenario.conjunto().mes()));
                        riesgosDeColapso.add(motivoColapso);
                    }
                }

                // La unidad completó su retorno y queda estacionada en su almacenDestino
                almacenActualPorUnidad.put(ruta.getUnidadTransporte().getCodigo(), ruta.getAlmacenDestino());
            }

            // 3. Verificacion post-turno: pedidos no asignados cuyo plazo expira antes o al inicio del proximo turno
            for (Pedido noAsignado : planTurno.getPedidosNoAsignados()) {
                if (noAsignado.getMinutoLimiteEntrega() <= turnoFin + 60) {
                    pedidosPendientes.remove(noAsignado);
                    if (!pedidosNoAsignados.contains(noAsignado)) {
                        pedidosNoAsignados.add(noAsignado);
                    }
                    if (!colapsado) {
                        colapsado = true;
                        minutoColapso = noAsignado.getMinutoLimiteEntrega();
                        motivoColapso = String.format(
                                "Capacidad de flota desbordada: El pedido %s no pudo ser asignado y su plazo de entrega (%d h) vence el %s sin capacidad disponible.",
                                noAsignado.getCodigo(), noAsignado.getPlazoHoras(),
                                formatearMinutoAFechaHora(minutoColapso, escenario.conjunto().anio(), escenario.conjunto().mes()));
                        riesgosDeColapso.add(motivoColapso);
                    }
                }
            }

            if (colapsado) {
                fechaHoraColapso = formatearFechaHoraColapso(minutoColapso, escenario.conjunto().anio(), escenario.conjunto().mes());
                break;
            }
        }

        for (Pedido rem : pedidosPendientes) {
            if (!pedidosNoAsignados.contains(rem)) {
                pedidosNoAsignados.add(rem);
            }
        }

        double fitness = 1.0 / (1.0 + costoOperativoTotal + multasTotales);
        int unidadesConRuta = (int) todasLasRutas.stream()
                .map(r -> r.getUnidadTransporte().getCodigo())
                .distinct()
                .count();

        ExperimentacionResponse.MetricasDto metricas = new ExperimentacionResponse.MetricasDto(
                escenario.pedidosDelTurno().size(),
                codigosAtendidos.size(),
                pedidosNoAsignados.size(),
                entregasFueraDePlazoTotales,
                unidadesConRuta,
                escenario.flota().size(),
                distanciaTotalKm,
                costoOperativoTotal,
                multasTotales,
                fitness,
                duracionComputoTotalMs);

        List<ExperimentacionResponse.RutaDto> rutasDto = todasLasRutas.stream()
                .map(this::aRutaDto)
                .toList();

        return new ExperimentacionResponse.EjecucionDto(
                nombreAlgoritmo,
                metricas,
                rutasDto,
                pedidosNoAsignados.stream().map(this::aPedidoPendienteDto).toList(),
                riesgosDeColapso,
                colapsado,
                minutoColapso,
                fechaHoraColapso,
                motivoColapso);
    }

    private String formatearFechaHoraColapso(int minutoSimulacion, int anio, int mes) {
        int dia = (minutoSimulacion / ConstantesPaqrap.MINUTOS_POR_DIA) + 1;
        int resto = minutoSimulacion % ConstantesPaqrap.MINUTOS_POR_DIA;
        int hora = resto / ConstantesPaqrap.MINUTOS_POR_HORA;
        int minuto = resto % ConstantesPaqrap.MINUTOS_POR_HORA;
        return String.format("%02d/%02d/%04d %02d:%02d (Día %d · %02d:%02d)",
                dia, mes, anio, hora, minuto, dia, hora, minuto);
    }

    private String formatearMinutoAFechaHora(int minutoSimulacion, int anio, int mes) {
        int dia = (minutoSimulacion / ConstantesPaqrap.MINUTOS_POR_DIA) + 1;
        int resto = minutoSimulacion % ConstantesPaqrap.MINUTOS_POR_DIA;
        int hora = resto / ConstantesPaqrap.MINUTOS_POR_HORA;
        int minuto = resto % ConstantesPaqrap.MINUTOS_POR_HORA;
        return String.format("%02d/%02d/%04d a las %02d:%02d", dia, mes, anio, hora, minuto);
    }

    private ExperimentacionResponse.EscenarioDto aEscenarioColapsoDto(
            EscenarioTurno escenario, long semilla, int minutoFinEfectivo,
            boolean colapsoOcurrido, Integer minutoColapso, String fechaHoraColapso, String motivoColapso,
            List<ExperimentacionResponse.MantenimientoDto> mantenimientosProgramados) {
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
                minutoFinEfectivo,
                escenario.pedidosDelTurno().size(),
                escenario.pedidosDelMes(),
                escenario.bloqueosVigentes().size(),
                escenario.bloqueosDelMes(),
                semilla,
                cargas,
                escenario.almacenes().stream().map(this::aAlmacenDto).toList(),
                escenario.bloqueosVigentes().stream().map(this::aBloqueoDto).toList(),
                escenario.flota().stream().map(this::aUnidadDto).toList(),
                escenario.unidadesEnMantenimiento(),
                colapsoOcurrido,
                minutoColapso,
                fechaHoraColapso,
                motivoColapso,
                mantenimientosProgramados);
    }

    // ============================================================ MAPEO A DTO

    private ExperimentacionResponse.EscenarioDto aEscenarioDto(
            EscenarioTurno escenario, long semilla,
            List<ExperimentacionResponse.MantenimientoDto> mantenimientosProgramados) {
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
                escenario.unidadesEnMantenimiento(),
                false,
                null,
                null,
                null,
                mantenimientosProgramados);
    }

    private ExperimentacionResponse.EscenarioDto aEscenarioDto(EscenarioTurno escenario, long semilla) {
        return aEscenarioDto(escenario, semilla, List.of());
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
                ruta.getAlmacenDestino() != null ? ruta.getAlmacenDestino().getCodigo() : ruta.getAlmacenOrigen().getCodigo(),
                ruta.getCargaTotal(),
                evaluadorCosto.obtenerCapacidad(ruta.getUnidadTransporte().getTipoUnidad()),
                ruta.getDistanciaKm(),
                evaluadorCosto.calcularCostoOperativo(ruta),
                ruta.getMinutoSalidaAlmacen(),
                ruta.getMinutoInicioRetorno(),
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
