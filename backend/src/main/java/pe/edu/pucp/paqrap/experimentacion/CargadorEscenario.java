package pe.edu.pucp.paqrap.experimentacion;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import pe.edu.pucp.paqrap.carga.LectorBloqueos;
import pe.edu.pucp.paqrap.carga.LectorMantenimiento;
import pe.edu.pucp.paqrap.carga.LectorVentas;
import pe.edu.pucp.paqrap.carga.MantenimientoProgramado;
import pe.edu.pucp.paqrap.carga.ResultadoCarga;
import pe.edu.pucp.paqrap.config.ConstantesPaqrap;
import pe.edu.pucp.paqrap.config.ParametrosAlmacen;
import pe.edu.pucp.paqrap.config.ParametrosFlota;
import pe.edu.pucp.paqrap.enums.TipoAlmacen;
import pe.edu.pucp.paqrap.enums.TipoAveria;
import pe.edu.pucp.paqrap.enums.TipoUnidad;
import pe.edu.pucp.paqrap.exception.CargaArchivoException;
import pe.edu.pucp.paqrap.model.Almacen;
import pe.edu.pucp.paqrap.model.Averia;
import pe.edu.pucp.paqrap.model.Bloqueo;
import pe.edu.pucp.paqrap.model.Nodo;
import pe.edu.pucp.paqrap.model.Pedido;
import pe.edu.pucp.paqrap.model.UnidadTransporte;

/**
 * Construye el escenario de un turno a partir de los archivos del cliente.
 *
 * <p>Usa los mismos lectores que el resto del sistema ({@code carga}), de
 * modo que la experimentacion numerica consume exactamente los datos que
 * consumira la simulacion: si un registro se rechaza aqui, se rechaza en
 * todas partes (STD 4.7).</p>
 */
@Component
public class CargadorEscenario {

    private static final Logger log = LoggerFactory.getLogger(CargadorEscenario.class);

    private final LocalizadorArchivosDatos localizador;
    private final CatalogoDatos catalogoDatos;
    private final LectorVentas lectorVentas;
    private final LectorBloqueos lectorBloqueos;
    private final LectorMantenimiento lectorMantenimiento;
    private final ParametrosFlota parametrosFlota;
    private final ParametrosAlmacen parametrosAlmacen;

    public CargadorEscenario(LocalizadorArchivosDatos localizador,
                             CatalogoDatos catalogoDatos,
                             LectorVentas lectorVentas,
                             LectorBloqueos lectorBloqueos,
                             LectorMantenimiento lectorMantenimiento,
                             ParametrosFlota parametrosFlota,
                             ParametrosAlmacen parametrosAlmacen) {
        this.localizador = localizador;
        this.catalogoDatos = catalogoDatos;
        this.lectorVentas = lectorVentas;
        this.lectorBloqueos = lectorBloqueos;
        this.lectorMantenimiento = lectorMantenimiento;
        this.parametrosFlota = parametrosFlota;
        this.parametrosAlmacen = parametrosAlmacen;
    }

    public EscenarioTurno cargar(ParametrosEjecucion parametros) {
        CatalogoDatos.ConjuntoDatos conjunto = catalogoDatos.buscarPorArchivoVentas(parametros.archivoVentas());

        LectorVentas.Resultado ventas = lectorVentas.leer(localizador.localizar(conjunto.archivoVentas()));
        numerarPedidos(ventas.pedidos());

        List<Bloqueo> bloqueosDelMes = new ArrayList<>();
        ResultadoCarga resumenBloqueos = new ResultadoCarga();
        if (conjunto.archivoBloqueos() != null) {
            LectorBloqueos.Resultado leidos = lectorBloqueos.leer(localizador.localizar(conjunto.archivoBloqueos()));
            bloqueosDelMes = leidos.bloqueos();
            resumenBloqueos = leidos.resumen();
        }

        List<MantenimientoProgramado> mantenimientos = new ArrayList<>();
        ResultadoCarga resumenMantenimiento = new ResultadoCarga();
        if (conjunto.archivoMantenimiento() != null) {
            LectorMantenimiento.Resultado leidos =
                    lectorMantenimiento.leer(localizador.localizar(conjunto.archivoMantenimiento()));
            mantenimientos = leidos.mantenimientos();
            resumenMantenimiento = leidos.resumen();
        }

        int minutoInicio = (parametros.dia() - 1) * ConstantesPaqrap.MINUTOS_POR_DIA
                + parametros.horaInicio() * ConstantesPaqrap.MINUTOS_POR_HORA;
        int minutoFin = minutoInicio + parametros.ventanaHoras() * ConstantesPaqrap.MINUTOS_POR_HORA;

        List<Pedido> pedidosDelTurno = recortarAlTurno(
                ventas.pedidos(), minutoInicio, minutoFin, parametros.maximoPedidos());
        List<Bloqueo> bloqueosVigentes = bloqueosDelMes.stream()
                .filter(bloqueo -> bloqueo.getInicioMinuto() < minutoFin && bloqueo.getFinMinuto() > minutoInicio)
                .toList();

        List<Almacen> almacenes = construirAlmacenes();
        List<UnidadTransporte> flota = construirFlota(parametros, almacenes.get(0).getUbicacion());
        List<String> enMantenimiento = aplicarMantenimiento(
                flota, mantenimientos, conjunto.mes(), parametros.dia(), minutoInicio);
        List<Averia> averias = construirAverias(flota, parametros);

        log.info("Escenario {} dia {} [{}, {}): {} pedidos del turno de {} del mes, {} bloqueos vigentes, {} unidades en mantenimiento",
                conjunto.archivoVentas(), parametros.dia(), minutoInicio, minutoFin,
                pedidosDelTurno.size(), ventas.pedidos().size(), bloqueosVigentes.size(), enMantenimiento.size());

        return new EscenarioTurno(
                conjunto, parametros.dia(), minutoInicio, minutoFin,
                pedidosDelTurno, ventas.pedidos().size(),
                bloqueosVigentes, bloqueosDelMes.size(),
                almacenes, flota, enMantenimiento, averias,
                ventas.resumen(), resumenBloqueos, resumenMantenimiento);
    }

    public EscenarioCincoDias cargarCincoDias(ParametrosCincoDias parametros) {
        CatalogoDatos.ConjuntoDatos conjunto = catalogoDatos.buscarPorArchivoVentas(parametros.archivoVentas());

        LectorVentas.Resultado ventas = lectorVentas.leer(localizador.localizar(conjunto.archivoVentas()));
        numerarPedidos(ventas.pedidos());

        List<Bloqueo> bloqueosDelMes = new ArrayList<>();
        ResultadoCarga resumenBloqueos = new ResultadoCarga();
        if (conjunto.archivoBloqueos() != null) {
            LectorBloqueos.Resultado leidos = lectorBloqueos.leer(localizador.localizar(conjunto.archivoBloqueos()));
            bloqueosDelMes = leidos.bloqueos();
            resumenBloqueos = leidos.resumen();
        }

        List<MantenimientoProgramado> mantenimientos = new ArrayList<>();
        ResultadoCarga resumenMantenimiento = new ResultadoCarga();
        if (conjunto.archivoMantenimiento() != null) {
            LectorMantenimiento.Resultado leidos =
                    lectorMantenimiento.leer(localizador.localizar(conjunto.archivoMantenimiento()));
            mantenimientos = leidos.mantenimientos();
            resumenMantenimiento = leidos.resumen();
        }

        int minutoInicio = parametros.minutoInicio();
        int minutoFin = parametros.minutoFin();

        List<Pedido> pedidosCincoDias = ventas.pedidos().stream()
                .filter(pedido -> pedido.getMinutoSimulacion() >= minutoInicio && pedido.getMinutoSimulacion() < minutoFin)
                .toList();

        List<Bloqueo> bloqueosVigentes = bloqueosDelMes.stream()
                .filter(bloqueo -> bloqueo.getInicioMinuto() < minutoFin && bloqueo.getFinMinuto() > minutoInicio)
                .toList();

        List<Almacen> almacenes = construirAlmacenes();
        List<UnidadTransporte> flota = construirFlota(
                parametros.cantidadAutos(), parametros.cantidadMotos(), parametros.cantidadBicicletas(),
                almacenes.get(0).getUbicacion());

        Set<String> unidadesMantenimiento = new LinkedHashSet<>();
        for (int dia = parametros.diaInicio(); dia <= parametros.diaFin(); dia++) {
            for (MantenimientoProgramado registro : mantenimientos) {
                if (registro.fecha().getDayOfMonth() == dia
                        && registro.fecha().getMonthValue() % 2 == conjunto.mes() % 2) {
                    unidadesMantenimiento.add(registro.codigoUnidad());
                }
            }
        }

        List<Averia> averias = construirAverias5D(flota, parametros);

        log.info("Escenario 5D {} dias [{}, {}] [{}, {}): {} pedidos en 5 dias de {} del mes, {} bloqueos vigentes",
                conjunto.archivoVentas(), parametros.diaInicio(), parametros.diaFin(), minutoInicio, minutoFin,
                pedidosCincoDias.size(), ventas.pedidos().size(), bloqueosVigentes.size());

        EscenarioTurno escenario = new EscenarioTurno(
                conjunto, parametros.diaInicio(), minutoInicio, minutoFin,
                pedidosCincoDias, ventas.pedidos().size(),
                bloqueosVigentes, bloqueosDelMes.size(),
                almacenes, flota, new ArrayList<>(unidadesMantenimiento), averias,
                ventas.resumen(), resumenBloqueos, resumenMantenimiento);

        return new EscenarioCincoDias(escenario, mantenimientos, bloqueosDelMes);
    }

    /**
     * Carga el escenario para la simulacion continua hasta el colapso.
     * Los pedidos y eventos se consideran desde el dia de inicio en adelante.
     */
    public EscenarioColapso cargarColapso(ParametrosColapso parametros) {
        CatalogoDatos.ConjuntoDatos conjunto = catalogoDatos.buscarPorArchivoVentas(parametros.archivoVentas());

        LectorVentas.Resultado ventas = lectorVentas.leer(localizador.localizar(conjunto.archivoVentas()));
        numerarPedidos(ventas.pedidos());

        List<Bloqueo> bloqueosDelMes = new ArrayList<>();
        ResultadoCarga resumenBloqueos = new ResultadoCarga();
        if (conjunto.archivoBloqueos() != null) {
            LectorBloqueos.Resultado leidos = lectorBloqueos.leer(localizador.localizar(conjunto.archivoBloqueos()));
            bloqueosDelMes = leidos.bloqueos();
            resumenBloqueos = leidos.resumen();
        }

        List<MantenimientoProgramado> mantenimientos = new ArrayList<>();
        ResultadoCarga resumenMantenimiento = new ResultadoCarga();
        if (conjunto.archivoMantenimiento() != null) {
            LectorMantenimiento.Resultado leidos =
                    lectorMantenimiento.leer(localizador.localizar(conjunto.archivoMantenimiento()));
            mantenimientos = leidos.mantenimientos();
            resumenMantenimiento = leidos.resumen();
        }

        int minutoInicio = parametros.minutoInicio();
        int minutoFin = 31 * ConstantesPaqrap.MINUTOS_POR_DIA;

        List<Pedido> pedidosDesdeInicio = ventas.pedidos().stream()
                .filter(pedido -> pedido.getMinutoSimulacion() >= minutoInicio)
                .toList();

        List<Bloqueo> bloqueosVigentes = bloqueosDelMes.stream()
                .filter(bloqueo -> bloqueo.getFinMinuto() > minutoInicio)
                .toList();

        List<Almacen> almacenes = construirAlmacenes();
        List<UnidadTransporte> flota = construirFlota(
                parametros.cantidadAutos(), parametros.cantidadMotos(), parametros.cantidadBicicletas(),
                almacenes.get(0).getUbicacion());

        Set<String> unidadesMantenimiento = new LinkedHashSet<>();
        for (int dia = parametros.diaInicio(); dia <= 31; dia++) {
            for (MantenimientoProgramado registro : mantenimientos) {
                if (registro.fecha().getDayOfMonth() == dia
                        && registro.fecha().getMonthValue() % 2 == conjunto.mes() % 2) {
                    unidadesMantenimiento.add(registro.codigoUnidad());
                }
            }
        }

        List<Averia> averias = construirAveriasColapso(flota, parametros);

        log.info("Escenario Colapso {} desde dia {} (minuto {}): {} pedidos por procesar de {} del mes",
                conjunto.archivoVentas(), parametros.diaInicio(), minutoInicio,
                pedidosDesdeInicio.size(), ventas.pedidos().size());

        EscenarioTurno escenario = new EscenarioTurno(
                conjunto, parametros.diaInicio(), minutoInicio, minutoFin,
                pedidosDesdeInicio, ventas.pedidos().size(),
                bloqueosVigentes, bloqueosDelMes.size(),
                almacenes, flota, new ArrayList<>(unidadesMantenimiento), averias,
                ventas.resumen(), resumenBloqueos, resumenMantenimiento);

        return new EscenarioColapso(escenario, mantenimientos, bloqueosDelMes);
    }

    public List<Averia> construirAveriasColapso(List<UnidadTransporte> flota, ParametrosColapso parametros) {
        List<Averia> averias = new ArrayList<>();
        for (ParametrosCincoDias.AveriaSolicitada5D solicitada : parametros.averiasSeguras()) {
            UnidadTransporte unidad = flota.stream()
                    .filter(candidata -> candidata.getCodigo().equalsIgnoreCase(solicitada.codigoUnidad()))
                    .findFirst()
                    .orElseThrow(() -> new CargaArchivoException(
                            "La unidad " + solicitada.codigoUnidad() + " no pertenece a la flota configurada"));
            averias.add(new Averia(unidad, TipoAveria.valueOf(solicitada.tipo()), solicitada.calcularMinutoSimulacion()));
        }
        return averias;
    }

    /** Los pedidos reciben un correlativo P-#### en el orden del archivo. */
    private void numerarPedidos(List<Pedido> pedidos) {
        for (int i = 0; i < pedidos.size(); i++) {
            pedidos.get(i).setCodigo(String.format("P-%04d", i + 1));
        }
    }

    private List<Pedido> recortarAlTurno(List<Pedido> pedidos, int minutoInicio, int minutoFin, int maximo) {
        List<Pedido> delTurno = new ArrayList<>();
        for (Pedido pedido : pedidos) {
            if (pedido.getMinutoSimulacion() >= minutoInicio && pedido.getMinutoSimulacion() < minutoFin) {
                delTurno.add(pedido);
            }
            if (delTurno.size() >= maximo) {
                break;
            }
        }
        return delTurno;
    }

    public List<Almacen> construirAlmacenes() {
        return List.of(
                new Almacen("ALM-CENTRAL", TipoAlmacen.CENTRAL,
                        new Nodo(parametrosAlmacen.centralX(), parametrosAlmacen.centralY()),
                        parametrosAlmacen.stockMaximo()),
                new Almacen("ALM-NOROESTE", TipoAlmacen.INTERMEDIO,
                        new Nodo(parametrosAlmacen.noroesteX(), parametrosAlmacen.noroesteY()),
                        parametrosAlmacen.stockMaximo()),
                new Almacen("ALM-ESTE", TipoAlmacen.INTERMEDIO,
                        new Nodo(parametrosAlmacen.esteX(), parametrosAlmacen.esteY()),
                        parametrosAlmacen.stockMaximo()));
    }

    /**
     * Todas las unidades realizan su primera salida desde el almacen central
     * (STD 2.2). El tamano de la flota puede configurarse antes de iniciar la
     * ejecucion, pero permanece fijo mientras dura.
     */
    public List<UnidadTransporte> construirFlota(
            Integer cantidadAutos, Integer cantidadMotos, Integer cantidadBicicletas, Nodo almacenCentral) {
        int autos = cantidadAutos != null
                ? cantidadAutos : parametrosFlota.cantidadAutos();
        int motos = cantidadMotos != null
                ? cantidadMotos : parametrosFlota.cantidadMotos();
        int bicicletas = cantidadBicicletas != null
                ? cantidadBicicletas : parametrosFlota.cantidadBicicletas();

        List<UnidadTransporte> flota = new ArrayList<>(autos + motos + bicicletas);
        for (int i = 1; i <= autos; i++) {
            flota.add(new UnidadTransporte(String.format("TA%02d", i), TipoUnidad.AUTO, almacenCentral));
        }
        for (int i = 1; i <= motos; i++) {
            flota.add(new UnidadTransporte(String.format("TM%02d", i), TipoUnidad.MOTO, almacenCentral));
        }
        for (int i = 1; i <= bicicletas; i++) {
            flota.add(new UnidadTransporte(String.format("TB%02d", i), TipoUnidad.BICICLETA, almacenCentral));
        }
        return flota;
    }

    private List<UnidadTransporte> construirFlota(ParametrosEjecucion parametros, Nodo almacenCentral) {
        return construirFlota(
                parametros.cantidadAutos(), parametros.cantidadMotos(), parametros.cantidadBicicletas(), almacenCentral);
    }

    /**
     * Aplica el plan de mantenimiento preventivo, que cubre dos meses y se
     * repite cada dos: el mes solicitado se corresponde con el mes del plan
     * que tenga su misma paridad. La unidad programada queda inmovilizada
     * toda la jornada.
     */
    public List<String> aplicarMantenimiento(List<UnidadTransporte> flota,
                                             List<MantenimientoProgramado> plan,
                                             int mesSolicitado,
                                             int dia,
                                             int minutoInicio) {
        List<String> enMantenimiento = new ArrayList<>();
        int minutoFinDelDia = (dia * ConstantesPaqrap.MINUTOS_POR_DIA);

        for (MantenimientoProgramado registro : plan) {
            if (registro.fecha().getDayOfMonth() != dia) {
                continue;
            }
            if (registro.fecha().getMonthValue() % 2 != mesSolicitado % 2) {
                continue;
            }
            flota.stream()
                    .filter(unidad -> unidad.getCodigo().equals(registro.codigoUnidad()))
                    .forEach(unidad -> {
                        unidad.programarMantenimiento(Math.max(minutoFinDelDia, minutoInicio + 1));
                        enMantenimiento.add(unidad.getCodigo());
                    });
        }
        return enMantenimiento;
    }

    private List<Averia> construirAverias(List<UnidadTransporte> flota, ParametrosEjecucion parametros) {
        List<Averia> averias = new ArrayList<>();
        for (ParametrosEjecucion.AveriaSolicitada solicitada : parametros.averiasSeguras()) {
            UnidadTransporte unidad = flota.stream()
                    .filter(candidata -> candidata.getCodigo().equalsIgnoreCase(solicitada.codigoUnidad()))
                    .findFirst()
                    .orElseThrow(() -> new CargaArchivoException(
                            "La unidad " + solicitada.codigoUnidad() + " no pertenece a la flota configurada"));
            averias.add(new Averia(unidad, TipoAveria.valueOf(solicitada.tipo()), solicitada.minutoSimulacion()));
        }
        return averias;
    }

    public List<Averia> construirAverias5D(List<UnidadTransporte> flota, ParametrosCincoDias parametros) {
        List<Averia> averias = new ArrayList<>();
        for (ParametrosCincoDias.AveriaSolicitada5D solicitada : parametros.averiasSeguras()) {
            UnidadTransporte unidad = flota.stream()
                    .filter(candidata -> candidata.getCodigo().equalsIgnoreCase(solicitada.codigoUnidad()))
                    .findFirst()
                    .orElseThrow(() -> new CargaArchivoException(
                            "La unidad " + solicitada.codigoUnidad() + " no pertenece a la flota configurada"));
            averias.add(new Averia(unidad, TipoAveria.valueOf(solicitada.tipo()), solicitada.calcularMinutoSimulacion()));
        }
        return averias;
    }
}
