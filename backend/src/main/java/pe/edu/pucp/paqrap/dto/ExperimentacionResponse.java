package pe.edu.pucp.paqrap.dto;

import java.util.List;

/**
 * Resultado completo de una corrida de la experimentacion numerica: el
 * escenario que se consumio y lo que cada algoritmo obtuvo sobre el.
 *
 * <p>Las rutas viajan con su recorrido fechado nodo a nodo, de modo que el
 * visualizador pueda reproducir el movimiento de la flota sin volver a
 * consultar al backend (STD 5.1). Los nombres de campo deben coincidir con
 * las interfaces espejo de {@code frontend/src/types}.</p>
 *
 * @param escenario datos del turno planificado
 * @param ejecuciones resultado de cada algoritmo sobre ese mismo escenario
 */
public record ExperimentacionResponse(
        EscenarioDto escenario,
        List<EjecucionDto> ejecuciones) {

    /**
     * @param archivoVentas archivo de ventas consumido
     * @param archivoBloqueos archivo de bloqueos consumido, o nulo
     * @param archivoMantenimiento plan de mantenimiento consumido, o nulo
     * @param anio ano de los datos
     * @param mes mes de los datos
     * @param dia dia planificado
     * @param minutoInicio minuto de simulacion en que arranca el turno
     * @param minutoFin minuto de simulacion en que cierra la ventana de pedidos
     * @param pedidosDelTurno pedidos que entran al planificador
     * @param pedidosDelMes pedidos aceptados en todo el archivo
     * @param bloqueosVigentes bloqueos que solapan con la ventana
     * @param bloqueosDelMes bloqueos aceptados en todo el archivo
     * @param semilla semilla con la que se ejecutaron los algoritmos
     * @param cargas conteo de registros leidos, aceptados y rechazados por archivo
     * @param almacenes almacen central e intermedios
     * @param bloqueos trazado de los bloqueos vigentes
     * @param flota estado de cada unidad de transporte al inicio del turno
     * @param unidadesEnMantenimiento codigos fuera de servicio ese dia
     * @param mantenimientosProgramados detalle de ventanas de mantenimiento por dia y unidad
     */
    public record EscenarioDto(
            String archivoVentas,
            String archivoBloqueos,
            String archivoMantenimiento,
            int anio,
            int mes,
            int dia,
            int minutoInicio,
            int minutoFin,
            int pedidosDelTurno,
            int pedidosDelMes,
            int bloqueosVigentes,
            int bloqueosDelMes,
            long semilla,
            List<CargaDto> cargas,
            List<AlmacenDto> almacenes,
            List<BloqueoDto> bloqueos,
            List<UnidadDto> flota,
            List<String> unidadesEnMantenimiento,
            Boolean colapsoOcurrido,
            Integer minutoColapso,
            String fechaHoraColapso,
            String motivoColapso,
            List<MantenimientoDto> mantenimientosProgramados) {

        public EscenarioDto(
                String archivoVentas, String archivoBloqueos, String archivoMantenimiento,
                int anio, int mes, int dia, int minutoInicio, int minutoFin,
                int pedidosDelTurno, int pedidosDelMes, int bloqueosVigentes, int bloqueosDelMes,
                long semilla, List<CargaDto> cargas, List<AlmacenDto> almacenes,
                List<BloqueoDto> bloqueos, List<UnidadDto> flota, List<String> unidadesEnMantenimiento) {
            this(archivoVentas, archivoBloqueos, archivoMantenimiento, anio, mes, dia,
                 minutoInicio, minutoFin, pedidosDelTurno, pedidosDelMes, bloqueosVigentes,
                 bloqueosDelMes, semilla, cargas, almacenes, bloqueos, flota, unidadesEnMantenimiento,
                 false, null, null, null, List.of());
        }

        public EscenarioDto(
                String archivoVentas, String archivoBloqueos, String archivoMantenimiento,
                int anio, int mes, int dia, int minutoInicio, int minutoFin,
                int pedidosDelTurno, int pedidosDelMes, int bloqueosVigentes, int bloqueosDelMes,
                long semilla, List<CargaDto> cargas, List<AlmacenDto> almacenes,
                List<BloqueoDto> bloqueos, List<UnidadDto> flota, List<String> unidadesEnMantenimiento,
                Boolean colapsoOcurrido, Integer minutoColapso, String fechaHoraColapso, String motivoColapso) {
            this(archivoVentas, archivoBloqueos, archivoMantenimiento, anio, mes, dia,
                 minutoInicio, minutoFin, pedidosDelTurno, pedidosDelMes, bloqueosVigentes,
                 bloqueosDelMes, semilla, cargas, almacenes, bloqueos, flota, unidadesEnMantenimiento,
                 colapsoOcurrido, minutoColapso, fechaHoraColapso, motivoColapso, List.of());
        }
    }

    /**
     * Registro de mantenimiento preventivo aplicable con su intervalo en minutos de simulacion.
     */
    public record MantenimientoDto(
            String codigoUnidad,
            int dia,
            int minutoInicio,
            int minutoFin) {
    }

    /**
     * @param archivo nombre del archivo leido
     * @param leidos registros encontrados
     * @param aceptados registros validos
     * @param rechazados registros descartados
     * @param detalleRechazos motivo de cada descarte, acotado a los primeros
     */
    public record CargaDto(String archivo, int leidos, int aceptados, int rechazados, List<String> detalleRechazos) {
    }

    /**
     * @param codigo nombre del almacen
     * @param tipo CENTRAL o INTERMEDIO
     * @param posX coordenada X del nodo
     * @param posY coordenada Y del nodo
     * @param stockActual unidades disponibles del producto P
     * @param stockMaximo capacidad del almacen
     */
    public record AlmacenDto(String codigo, String tipo, int posX, int posY, int stockActual, int stockMaximo) {
    }

    /**
     * @param inicioMinuto minuto de simulacion en que empieza el bloqueo
     * @param finMinuto minuto de simulacion en que termina
     * @param nodos secuencia de nodos del poligono abierto
     */
    public record BloqueoDto(int inicioMinuto, int finMinuto, List<int[]> nodos) {
    }

    /**
     * @param codigo codigo TTNN de la unidad
     * @param tipoUnidad AUTO, MOTO o BICICLETA
     * @param estado estado al inicio del turno
     * @param capacidad paquetes que transporta
     * @param velocidadKmh velocidad promedio configurada
     * @param costoKm costo por kilometro recorrido
     * @param posX coordenada X inicial
     * @param posY coordenada Y inicial
     */
    public record UnidadDto(
            String codigo, String tipoUnidad, String estado,
            int capacidad, double velocidadKmh, double costoKm,
            int posX, int posY) {
    }

    /**
     * @param algoritmo nombre del algoritmo
     * @param metricas indicadores comparables entre algoritmos
     * @param rutas rutas con carga, con su recorrido fechado
     * @param pedidosSinAtender pedidos que ninguna unidad pudo tomar
     * @param riesgosDeColapso descripcion de cada riesgo detectado
     */
    public record EjecucionDto(
            String algoritmo,
            MetricasDto metricas,
            List<RutaDto> rutas,
            List<PedidoPendienteDto> pedidosSinAtender,
            List<String> riesgosDeColapso,
            Boolean colapsoOcurrido,
            Integer minutoColapso,
            String fechaHoraColapso,
            String motivoColapso) {

        public EjecucionDto(
                String algoritmo, MetricasDto metricas, List<RutaDto> rutas,
                List<PedidoPendienteDto> pedidosSinAtender, List<String> riesgosDeColapso) {
            this(algoritmo, metricas, rutas, pedidosSinAtender, riesgosDeColapso, false, null, null, null);
        }
    }

    /**
     * Pedido que ninguna unidad pudo tomar en el turno.
     *
     * @param codigoPedido correlativo P-#### del pedido
     * @param clienteId identificador del cliente
     * @param posX coordenada X del destino
     * @param posY coordenada Y del destino
     * @param cantidadProducto unidades del producto P
     * @param plazoHoras plazo comprometido
     * @param minutoRegistro minuto en que llego el pedido
     * @param minutoLimite minuto en que vence el plazo
     */
    public record PedidoPendienteDto(
            String codigoPedido,
            String clienteId,
            int posX,
            int posY,
            int cantidadProducto,
            int plazoHoras,
            int minutoRegistro,
            int minutoLimite) {
    }

    /**
     * @param pedidosDelTurno pedidos ofrecidos al planificador
     * @param pedidosAtendidos pedidos asignados a una unidad
     * @param pedidosSinAtender pedidos que quedaron fuera
     * @param entregasFueraDePlazo entregas que llegan despues del limite comprometido
     * @param unidadesEnRuta unidades que salen con carga
     * @param unidadesDisponibles unidades operativas al inicio del turno
     * @param distanciaTotalKm kilometros recorridos por toda la flota
     * @param costoOperativoTotal costo en soles del recorrido
     * @param multas castigos acumulados por plazo, capacidad y pedidos sin atender
     * @param fitness aptitud del plan: 1 / (1 + costo + multas)
     * @param duracionComputoMs tiempo que tardo el algoritmo
     */
    public record MetricasDto(
            int pedidosDelTurno,
            int pedidosAtendidos,
            int pedidosSinAtender,
            long entregasFueraDePlazo,
            int unidadesEnRuta,
            int unidadesDisponibles,
            double distanciaTotalKm,
            double costoOperativoTotal,
            double multas,
            double fitness,
            long duracionComputoMs) {
    }

    /**
     * @param codigoUnidad codigo TTNN de la unidad
     * @param tipoUnidad AUTO, MOTO o BICICLETA
     * @param almacenOrigen nombre del almacen desde el que se abastecio
     * @param almacenDestino nombre del almacen al que retorna la unidad para recargar
     * @param cargaTotal paquetes a bordo al salir
     * @param capacidad paquetes que admite la unidad
     * @param distanciaKm kilometros del recorrido
     * @param costoSoles costo del recorrido
     * @param minutoSalida minuto de simulacion en que sale del almacen
     * @param minutoInicioRetorno minuto en que inicia el tramo de retorno hacia el almacen
     * @param minutoFin minuto de simulacion en que termina la ultima entrega o arriba al almacen
     * @param recorrido nodos por los que pasa la unidad
     * @param minutosPorNodo minuto de simulacion de cada nodo del recorrido
     * @param paradas entregas de la ruta, en orden
     */
    public record RutaDto(
            String codigoUnidad,
            String tipoUnidad,
            String almacenOrigen,
            String almacenDestino,
            int cargaTotal,
            int capacidad,
            double distanciaKm,
            double costoSoles,
            int minutoSalida,
            int minutoInicioRetorno,
            int minutoFin,
            List<int[]> recorrido,
            List<Integer> minutosPorNodo,
            List<ParadaDto> paradas,
            Integer minutoInicioAlimentacion,
            Integer minutoFinAlimentacion,
            boolean alimentacionEnVentana) {

        /** Ruta sin tramo de retorno ni hora de alimentacion, compatible con las llamadas previas. */
        public RutaDto(
                String codigoUnidad,
                String tipoUnidad,
                String almacenOrigen,
                int cargaTotal,
                int capacidad,
                double distanciaKm,
                double costoSoles,
                int minutoSalida,
                int minutoFin,
                List<int[]> recorrido,
                List<Integer> minutosPorNodo,
                List<ParadaDto> paradas) {
            this(codigoUnidad, tipoUnidad, almacenOrigen, almacenOrigen, cargaTotal, capacidad,
                 distanciaKm, costoSoles, minutoSalida, minutoFin, minutoFin, recorrido, minutosPorNodo, paradas,
                 null, null, false);
        }
    }

    /**
     * @param codigoPedido correlativo P-#### del pedido
     * @param clienteId identificador del cliente
     * @param posX coordenada X del destino
     * @param posY coordenada Y del destino
     * @param cantidadProducto unidades del producto P
     * @param plazoHoras plazo comprometido
     * @param minutoRegistro minuto en que llego el pedido
     * @param minutoLimite minuto en que vence el plazo
     * @param minutoLlegada minuto en que la unidad llega al cliente
     * @param minutoSalida minuto en que la unidad reanuda la ruta
     * @param cumplePlazo si la llegada ocurre dentro del plazo
     * @param holguraMinutos minutos de margen; negativo si el plazo se incumplio
     */
    public record ParadaDto(
            String codigoPedido,
            String clienteId,
            int posX,
            int posY,
            int cantidadProducto,
            int plazoHoras,
            int minutoRegistro,
            int minutoLimite,
            int minutoLlegada,
            int minutoSalida,
            boolean cumplePlazo,
            int holguraMinutos,
            boolean reasignado) {
    }
}
