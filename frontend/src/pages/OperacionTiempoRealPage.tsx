import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  Construction,
  FileText,
  Maximize,
  Minimize,
  Package,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Truck,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import Encabezado from "../components/layout/Encabezado";
import RelojSimulacion from "../components/comunes/RelojSimulacion";
import Tabs from "../components/comunes/Tabs";
import Boton from "../components/comunes/Boton";
import MapaCiudad from "../components/mapa/MapaCiudad";
import LeyendaDesplegable from "../components/mapa/LeyendaDesplegable";
import FiltrosMapa from "../components/mapa/FiltrosMapa";
import IndicadoresGlobales from "../components/mapa/IndicadoresGlobales";
import ReporteFinal, { type SolicitudReporte } from "../components/reportes/ReporteFinal";
import PanelSeguimientoPedidos from "../components/paneles/PanelSeguimientoPedidos";
import PanelAlertas from "../components/paneles/PanelAlertas";
import PanelFlota from "../components/paneles/PanelFlota";
import PanelAlmacenes from "../components/paneles/PanelAlmacenes";
import NotificacionesEntregas from "../components/paneles/NotificacionesEntregas";
import { usePosicionesFlota } from "../hooks/usePosicionesFlota";
import { useAlertasOperacion } from "../hooks/useAlertasOperacion";
import { useRelojSimulacion } from "../hooks/useRelojSimulacion";
import { useEjecucionVisible, useExperimentacion } from "../hooks/useExperimentacion";
import { useSimulacionStore } from "../store/simulacionStore";
import { formatearHoraDelDia, formatearSoles, formatearTiempoSimulado } from "../utils/formatters";
import { averiasVigentes } from "../utils/averias";
import { evitarBloqueosEnEjecucion } from "../utils/rutasSinBloqueos";
import { nivelUnidad } from "../utils/semaforo";
import { ALTO_MAPA_KM, ANCHO_MAPA_KM, ETIQUETA_TIPO_UNIDAD } from "../utils/constants";
import { ahoraEnLima, minutoDelMes } from "../utils/tiempoReal";
import type { AlgoritmoSolicitado, BloqueoDto, NodoMapa, TipoAveria } from "../types/Experimentacion";
import "./CentroControlPage.css";
import "./OperacionTiempoRealPage.css";

type PanelIncidencia = "bloqueo" | "averia" | null;

const ETIQUETA_AVERIA: Record<TipoAveria, string> = {
  TIPO_1: "Tipo 1 · 1 h inmovilizada",
  TIPO_2: "Tipo 2 · Inoperativa resto del turno",
  TIPO_3: "Tipo 3 · 48 h fuera de servicio",
};

/**
 * Vista dedicada a la Operación Día a Día en tiempo real (hora de Lima).
 * A diferencia del Centro de Control:
 * - Solo muestra el bloque del reloj con la hora real de Lima (sin reloj simulado).
 * - No muestra controles de reproducción ni barra de línea de tiempo.
 * - Permite agregar bloqueos directamente sobre el mapa (o por coordenadas) y
 *   registrar averías de cualquier unidad de la flota con replanificación inmediata.
 */
const OperacionTiempoRealPage = () => {
  const { conjuntos, cargando, error, ejecutarDiaADia, umbrales } = useExperimentacion();

  const escenario = useSimulacionStore((estado) => estado.escenario);
  const ejecuciones = useSimulacionStore((estado) => estado.ejecuciones);
  const algoritmoVisible = useSimulacionStore((estado) => estado.algoritmoVisible);
  const setAlgoritmoVisibleDiaADia = useSimulacionStore((estado) => estado.setAlgoritmoVisibleDiaADia);
  const minutoActual = useSimulacionStore((estado) => estado.minutoActual);
  const segundosReales = useSimulacionStore((estado) => estado.segundosReales);
  const unidadEnfocada = useSimulacionStore((estado) => estado.unidadEnfocada);
  const enfocarUnidad = useSimulacionStore((estado) => estado.enfocarUnidad);
  const tiposVisibles = useSimulacionStore((estado) => estado.tiposVisibles);
  const nivelesVisibles = useSimulacionStore((estado) => estado.nivelesVisibles);
  const almacenEnfocado = useSimulacionStore((estado) => estado.almacenEnfocado);
  const setAlmacenEnfocado = useSimulacionStore((estado) => estado.setAlmacenEnfocado);

  const algoritmoDiaADia = useSimulacionStore((estado) => estado.algoritmoDiaADia);
  const setAlgoritmoDiaADia = useSimulacionStore((estado) => estado.setAlgoritmoDiaADia);
  const averiasDiaADia = useSimulacionStore((estado) => estado.averiasDiaADia);
  const agregarAveriaDiaADia = useSimulacionStore((estado) => estado.agregarAveriaDiaADia);
  const quitarAveriaDiaADia = useSimulacionStore((estado) => estado.quitarAveriaDiaADia);
  const bloqueosDiaADia = useSimulacionStore((estado) => estado.bloqueosDiaADia);
  const agregarBloqueoDiaADia = useSimulacionStore((estado) => estado.agregarBloqueoDiaADia);
  const quitarBloqueoDiaADia = useSimulacionStore((estado) => estado.quitarBloqueoDiaADia);
  const corridaDiaADia = useSimulacionStore((estado) => estado.corridaDiaADia);
  const activarVistaDiaADia = useSimulacionStore((estado) => estado.activarVistaDiaADia);

  const [tabOperativa, setTabOperativa] = useState<string>("pedidos");
  const [panelesAbiertos, setPanelesAbiertos] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [reporteManual, setReporteManual] = useState<SolicitudReporte | null>(null);
  const [panelIncidencia, setPanelIncidencia] = useState<PanelIncidencia>(null);

  // Estado del borrador de bloqueo en el mapa
  const [nodosBorradorBloqueo, setNodosBorradorBloqueo] = useState<NodoMapa[]>([]);
  const [opcionDuracion, setOpcionDuracion] = useState<string>("120");
  const [minutosPersonalizados, setMinutosPersonalizados] = useState<number>(90);
  const [xInicioManual, setXInicioManual] = useState<number>(15);
  const [yInicioManual, setYInicioManual] = useState<number>(20);
  const [xFinManual, setXFinManual] = useState<number>(25);
  const [yFinManual, setYFinManual] = useState<number>(20);

  // Estado del formulario de registro de avería
  const [unidadAveriaSeleccionada, setUnidadAveriaSeleccionada] = useState<string>("TA01");
  const [tipoAveriaSeleccionado, setTipoAveriaSeleccionado] = useState<TipoAveria>("TIPO_1");

  const raizRef = useRef<HTMLDivElement>(null);
  const autoIniciadoRef = useRef(false);

  // Al entrar a la página, activamos la vista en tiempo real con la hora actual de Lima.
  useEffect(() => {
    activarVistaDiaADia(minutoDelMes(ahoraEnLima()));
  }, [activarVistaDiaADia]);

  // Si aún no hay corrida de día a día (o el turno cargado quedó desfasado), la lanzamos automáticamente.
  useEffect(() => {
    if (autoIniciadoRef.current || cargando || conjuntos.length === 0) {
      return;
    }
    const minutoLima = minutoDelMes(ahoraEnLima());
    const turnoVigenteCargado =
      corridaDiaADia &&
      minutoLima >= corridaDiaADia.escenario.minutoInicio &&
      minutoLima <= corridaDiaADia.escenario.minutoFin;

    if (!turnoVigenteCargado) {
      autoIniciadoRef.current = true;
      void ejecutarDiaADia();
    }
  }, [cargando, conjuntos.length, corridaDiaADia, ejecutarDiaADia]);

  useRelojSimulacion();

  const ejecucionBase = useEjecucionVisible();

  // Combina los bloqueos del archivo mensual con los bloqueos registrados en tiempo real.
  const bloqueosCombinados = useMemo<BloqueoDto[]>(() => {
    const base = escenario?.bloqueos ?? [];
    const extras = bloqueosDiaADia.filter(
      (extra) =>
        !base.some(
          (b) =>
            b.inicioMinuto === extra.inicioMinuto &&
            b.finMinuto === extra.finMinuto &&
            JSON.stringify(b.nodos) === JSON.stringify(extra.nodos),
        ),
    );
    return [...base, ...extras];
  }, [escenario?.bloqueos, bloqueosDiaADia]);

  const ejecucion = useMemo(
    () => evitarBloqueosEnEjecucion(ejecucionBase, bloqueosCombinados),
    [ejecucionBase, bloqueosCombinados],
  );

  const escenarioConIncidencias = useMemo(
    () => (escenario ? { ...escenario, bloqueos: bloqueosCombinados } : null),
    [escenario, bloqueosCombinados],
  );

  // Una avería solo se muestra mientras dura según su tipo (rúbrica D13).
  const averiasActivas = useMemo(
    () => averiasVigentes(averiasDiaADia, minutoActual),
    [averiasDiaADia, minutoActual],
  );
  const unidadesAveriadas = useMemo(
    () => averiasActivas.map((averia) => averia.codigoUnidad),
    [averiasActivas],
  );

  const unidadesEnMantenimientoVigentes = useMemo(() => {
    if (!escenario) return [];
    if (escenario.mantenimientosProgramados && escenario.mantenimientosProgramados.length > 0) {
      return escenario.mantenimientosProgramados
        .filter((m) => minutoActual >= m.minutoInicio && minutoActual < m.minutoFin)
        .map((m) => m.codigoUnidad);
    }
    const diaActual = Math.floor(minutoActual / 1440) + 1;
    if (diaActual === escenario.dia) {
      return escenario.unidadesEnMantenimiento ?? [];
    }
    return [];
  }, [escenario, minutoActual]);

  const unidadesInmovilizadas = useMemo(
    () => [...new Set([...unidadesAveriadas, ...unidadesEnMantenimientoVigentes])],
    [unidadesAveriadas, unidadesEnMantenimientoVigentes],
  );

  const { unidades, pedidos } = usePosicionesFlota(
    ejecucion,
    minutoActual,
    escenario?.flota ?? [],
    unidadesInmovilizadas,
  );

  // Mantener seleccionada por defecto una unidad válida disponible cuando cambia la flota.
  useEffect(() => {
    if (unidades.length === 0) return;
    const existe = unidades.some((u) => u.codigoUnidad === unidadAveriaSeleccionada);
    if (!existe) {
      const primeraOperativa =
        unidades.find((u) => !unidadesAveriadas.includes(u.codigoUnidad)) ?? unidades[0];
      if (primeraOperativa) {
        setUnidadAveriaSeleccionada(primeraOperativa.codigoUnidad);
      }
    }
  }, [unidades, unidadesAveriadas, unidadAveriaSeleccionada]);

  const alertas = useAlertasOperacion({
    escenario: escenarioConIncidencias,
    ejecucion,
    pedidos,
    averias: averiasDiaADia,
    minutoActual,
    ...umbrales,
  });

  const pedidosActivos = useMemo(
    () => pedidos.filter((pedido) => pedido.estado !== "ENTREGADO").length,
    [pedidos],
  );

  const almacenesConStockDinamico = useMemo(
    () => escenario?.almacenes ?? [],
    [escenario],
  );

  const almacenCentral = escenario?.almacenes.find((almacen) => almacen.tipo === "CENTRAL");

  const { umbralAmbarPorcentaje, umbralRojoPorcentaje } = umbrales;
  const unidadesEnMapa = useMemo(
    () =>
      unidades.filter(
        (unidad) =>
          tiposVisibles.includes(unidad.tipoUnidad) &&
          nivelesVisibles.includes(
            nivelUnidad(unidad.cargaRestante, unidad.capacidad, {
              umbralAmbarPorcentaje,
              umbralRojoPorcentaje,
            }),
          ),
      ),
    [unidades, tiposVisibles, nivelesVisibles, umbralAmbarPorcentaje, umbralRojoPorcentaje],
  );
  const rutasEnMapa = useMemo(() => {
    const visibles = new Set(unidadesEnMapa.map((unidad) => unidad.codigoUnidad));
    return (ejecucion?.rutas ?? []).filter((ruta) => visibles.has(ruta.codigoUnidad));
  }, [ejecucion, unidadesEnMapa]);

  const abrirPanelEn = useCallback((tab: string) => {
    setTabOperativa(tab);
    setPanelesAbiertos(true);
  }, []);

  const enfocarDesdeMapa = useCallback(
    (codigoUnidad: string | null) => {
      enfocarUnidad(codigoUnidad);
      if (codigoUnidad) {
        abrirPanelEn("flota");
      }
    },
    [enfocarUnidad, abrirPanelEn],
  );

  const seleccionarAlmacenDesdeMapa = useCallback(
    (codigoAlmacen: string | null) => {
      setAlmacenEnfocado(codigoAlmacen);
      if (codigoAlmacen) {
        abrirPanelEn("almacenes");
      }
    },
    [setAlmacenEnfocado, abrirPanelEn],
  );

  // Agregar un nodo al borrador de bloqueo asegurando tramos ortogonales (calles H/V).
  const agregarNodoAlBorrador = useCallback(([x, y]: NodoMapa) => {
    const xAcotado = Math.max(0, Math.min(ANCHO_MAPA_KM, Math.round(x)));
    const yAcotado = Math.max(0, Math.min(ALTO_MAPA_KM, Math.round(y)));
    setNodosBorradorBloqueo((prev) => {
      if (prev.length === 0) {
        return [[xAcotado, yAcotado]];
      }
      const [ultimoX, ultimoY] = prev[prev.length - 1];
      if (ultimoX === xAcotado && ultimoY === yAcotado) {
        return prev;
      }
      if (ultimoX !== xAcotado && ultimoY !== yAcotado) {
        return [...prev, [xAcotado, ultimoY], [xAcotado, yAcotado]];
      }
      return [...prev, [xAcotado, yAcotado]];
    });
  }, []);

  const agregarTramoManual = () => {
    const x1 = Math.max(0, Math.min(ANCHO_MAPA_KM, Math.round(xInicioManual)));
    const y1 = Math.max(0, Math.min(ALTO_MAPA_KM, Math.round(yInicioManual)));
    const x2 = Math.max(0, Math.min(ANCHO_MAPA_KM, Math.round(xFinManual)));
    const y2 = Math.max(0, Math.min(ALTO_MAPA_KM, Math.round(yFinManual)));
    if (x1 === x2 && y1 === y2) {
      return;
    }
    setNodosBorradorBloqueo((prev) => {
      const base: NodoMapa[] = prev.length === 0 ? [[x1, y1]] : [...prev];
      const [ux, uy] = base[base.length - 1];
      const conInicio: NodoMapa[] =
        ux === x1 && uy === y1
          ? base
          : ux !== x1 && uy !== y1
            ? [...base, [x1, uy], [x1, y1]]
            : [...base, [x1, y1]];
      const [px, py] = conInicio[conInicio.length - 1];
      if (px === x2 && py === y2) {
        return conInicio;
      }
      if (px !== x2 && py !== y2) {
        return [...conInicio, [x2, py], [x2, y2]];
      }
      return [...conInicio, [x2, y2]];
    });
  };

  const duracionBloqueoMinEfectiva = useMemo(() => {
    if (opcionDuracion !== "personalizado") {
      return Number(opcionDuracion);
    }
    return Math.max(1, minutosPersonalizados || 1);
  }, [opcionDuracion, minutosPersonalizados]);

  const guardarBloqueoYReplanificar = () => {
    if (nodosBorradorBloqueo.length < 2) {
      return;
    }
    const inicio = Math.floor(minutoActual);
    const fin = inicio + duracionBloqueoMinEfectiva;
    agregarBloqueoDiaADia({
      inicioMinuto: inicio,
      finMinuto: fin,
      nodos: nodosBorradorBloqueo,
    });
    setNodosBorradorBloqueo([]);
    void ejecutarDiaADia();
  };

  const eliminarBloqueoYReplanificar = (indice: number) => {
    quitarBloqueoDiaADia(indice);
    void ejecutarDiaADia();
  };

  const registrarAveriaYReplanificar = useCallback(
    (codigoUnidad: string, tipo: TipoAveria) => {
      if (!codigoUnidad) return;
      agregarAveriaDiaADia({
        codigoUnidad,
        tipo,
        minutoSimulacion: Math.floor(minutoActual),
      });
      void ejecutarDiaADia();
    },
    [agregarAveriaDiaADia, ejecutarDiaADia, minutoActual],
  );

  const eliminarAveriaYReplanificar = (indice: number) => {
    quitarAveriaDiaADia(indice);
    void ejecutarDiaADia();
  };

  const cambiarAlgoritmoDiaADia = (nuevoAlgoritmo: AlgoritmoSolicitado) => {
    setAlgoritmoDiaADia(nuevoAlgoritmo);
    void ejecutarDiaADia(nuevoAlgoritmo);
  };

  useEffect(() => {
    const alCambiar = () => setPantallaCompleta(document.fullscreenElement === raizRef.current);
    document.addEventListener("fullscreenchange", alCambiar);
    return () => document.removeEventListener("fullscreenchange", alCambiar);
  }, []);

  const alternarPantallaCompleta = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void raizRef.current?.requestFullscreen?.().catch(() => undefined);
    }
  };

  const claveEjecucion = escenario
    ? `TR-${escenario.archivoVentas}-${escenario.minutoInicio}-${ejecucion?.algoritmo ?? ""}`
    : "TR";

  const contexto = escenario
    ? `Turno vigente (${formatearHoraDelDia(escenario.minutoInicio)} – ${formatearHoraDelDia(escenario.minutoFin)}) · ${escenario.archivoVentas} · día ${escenario.dia} · ${escenario.pedidosDelTurno} pedidos` +
      (ejecucion ? ` · ${ejecucion.algoritmo} · ${formatearSoles(ejecucion.metricas.costoOperativoTotal)}` : "")
    : cargando
      ? "Sincronizando con la hora actual de Lima y planificando el turno vigente…"
      : "Operación día a día sincronizada con la hora actual de Lima";

  return (
    <div className="centro-control operacion-tr" ref={raizRef}>
      <Encabezado
        titulo="Operación en tiempo real"
        contexto={contexto}
        extremo={
          <RelojSimulacion
            minutoSimulacionActual={minutoActual}
            segundosRealesTranscurridos={segundosReales}
            soloHoraReal
          />
        }
      />

      {!escenario ? (
        <div className="centro-control__sin-plan">
          <h2>{cargando ? "Planificando el turno vigente…" : "Operación en tiempo real"}</h2>
          <p className="texto-secundario">
            {cargando
              ? "Calculando las rutas del turno actual según la hora de Lima con la flota disponible."
              : error
                ? `No se pudo iniciar automáticamente la operación: ${error}`
                : "Inicie la planificación del turno vigente sincronizado con el reloj real de Lima."}
          </p>
          <Boton
            variante="accion"
            icono={<RefreshCw size={15} />}
            disabled={cargando}
            onClick={() => void ejecutarDiaADia()}
          >
            {cargando ? "Planificando turno…" : "Iniciar turno vigente"}
          </Boton>
        </div>
      ) : (
        <div className="centro-control__cuerpo">
          <section className="centro-control__columna-mapa">
            <div className="centro-control__barra operacion-tr__barra">
              {ejecuciones.length > 1 && (
                <Tabs
                  opciones={ejecuciones.map((candidata) => ({
                    id: candidata.algoritmo,
                    etiqueta: candidata.algoritmo,
                    detalle: formatearSoles(candidata.metricas.costoOperativoTotal),
                  }))}
                  activa={algoritmoVisible ?? ejecuciones[0].algoritmo}
                  onCambiar={setAlgoritmoVisibleDiaADia}
                />
              )}

              <div className="operacion-tr__controles-incidencias">
                <button
                  type="button"
                  className={`centro-control__boton-vista operacion-tr__boton-incidencia ${
                    panelIncidencia === "bloqueo" ? "operacion-tr__boton-incidencia--activo" : ""
                  }`}
                  aria-pressed={panelIncidencia === "bloqueo"}
                  onClick={() =>
                    setPanelIncidencia((actual) => (actual === "bloqueo" ? null : "bloqueo"))
                  }
                >
                  <Construction size={15} aria-hidden />
                  Agregar bloqueo en el mapa
                  {bloqueosDiaADia.length > 0 && (
                    <span className="operacion-tr__insignia">{bloqueosDiaADia.length}</span>
                  )}
                </button>

                <button
                  type="button"
                  className={`centro-control__boton-vista operacion-tr__boton-incidencia ${
                    panelIncidencia === "averia" ? "operacion-tr__boton-incidencia--activo" : ""
                  }`}
                  aria-pressed={panelIncidencia === "averia"}
                  onClick={() =>
                    setPanelIncidencia((actual) => (actual === "averia" ? null : "averia"))
                  }
                >
                  <Wrench size={15} aria-hidden />
                  Registrar avería de unidad
                  {averiasDiaADia.length > 0 && (
                    <span className="operacion-tr__insignia operacion-tr__insignia--roja">
                      {averiasDiaADia.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="centro-control__acciones-vista operacion-tr__acciones-derecha">
                <label className="operacion-tr__selector-algoritmo" title="Algoritmo de planificación en tiempo real">
                  <span>Algoritmo:</span>
                  <select
                    value={algoritmoDiaADia}
                    disabled={cargando}
                    onChange={(evento) => cambiarAlgoritmoDiaADia(evento.target.value as AlgoritmoSolicitado)}
                  >
                    <option value="IACO">Solo I-ACO</option>
                    <option value="AGAESTW">Solo AGA-ES-TW</option>
                    <option value="AMBOS">Ambos (I-ACO + AGA-ES-TW)</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="centro-control__boton-vista"
                  disabled={cargando}
                  title="Recalcular el plan del turno vigente con las incidencias actuales"
                  onClick={() => void ejecutarDiaADia()}
                >
                  <RefreshCw size={14} className={cargando ? "operacion-tr__giro" : ""} aria-hidden />
                  {cargando ? "Replanificando…" : "Replanificar"}
                </button>

                {ejecucion && (
                  <button
                    type="button"
                    className="centro-control__boton-vista"
                    title="Reporte de la operación en curso"
                    onClick={() => setReporteManual({ motivo: "CONSULTA", minutoCorte: minutoActual })}
                  >
                    <FileText size={15} aria-hidden />
                    Reporte
                  </button>
                )}

                <button
                  type="button"
                  className="centro-control__boton-vista"
                  aria-pressed={pantallaCompleta}
                  title={
                    pantallaCompleta
                      ? "Salir de pantalla completa (Esc)"
                      : "Ver el mapa en pantalla completa"
                  }
                  onClick={alternarPantallaCompleta}
                >
                  {pantallaCompleta ? <Minimize size={15} aria-hidden /> : <Maximize size={15} aria-hidden />}
                  {pantallaCompleta ? "Salir" : "Pantalla completa"}
                </button>
              </div>
            </div>

            {panelIncidencia === "bloqueo" && (
              <div className="operacion-tr__gaveta" role="region" aria-label="Agregar bloqueo en el mapa">
                <div className="operacion-tr__gaveta-cabecera">
                  <div>
                    <strong>Agregar bloqueo vial en el mapa</strong>
                    <span className="texto-tenue">
                      Haga clic directamente sobre las intersecciones del mapa para trazar los tramos bloqueados o ingrese las coordenadas manualmente.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="operacion-tr__cerrar"
                    aria-label="Cerrar panel de bloqueos"
                    onClick={() => setPanelIncidencia(null)}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="operacion-tr__gaveta-fila">
                  <div className="operacion-tr__trazo-actual">
                    <span className="rotulo">Nodos trazados ({nodosBorradorBloqueo.length}):</span>
                    {nodosBorradorBloqueo.length === 0 ? (
                      <span className="texto-tenue">
                        Haga clic en el mapa para marcar el punto inicial del bloqueo…
                      </span>
                    ) : (
                      <div className="operacion-tr__nodos-chips">
                        {nodosBorradorBloqueo.map(([nx, ny], idx) => (
                          <span key={`${nx}-${ny}-${idx}`} className="operacion-tr__nodo-chip cifra">
                            ({nx}, {ny})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="operacion-tr__controles-bloqueo">
                    <label className="operacion-tr__campo-en-linea">
                      <span>Duración</span>
                      <select
                        value={opcionDuracion}
                        onChange={(evento) => setOpcionDuracion(evento.target.value)}
                      >
                        <option value="30">30 min</option>
                        <option value="60">1 hora</option>
                        <option value="120">2 horas</option>
                        <option value="240">4 horas</option>
                        <option value="480">Resto del turno (8 h)</option>
                        <option value="personalizado">Personalizado</option>
                      </select>
                    </label>

                    {opcionDuracion === "personalizado" && (
                      <label className="operacion-tr__campo-en-linea">
                        <span>Minutos:</span>
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          className="operacion-tr__input-numero"
                          value={minutosPersonalizados}
                          onChange={(e) =>
                            setMinutosPersonalizados(Math.max(1, Number(e.target.value) || 1))
                          }
                        />
                        <span className="texto-tenue">
                          (hasta {formatearHoraDelDia(minutoActual + minutosPersonalizados)})
                        </span>
                      </label>
                    )}

                    <Boton
                      variante="fantasma"
                      icono={<RotateCcw size={13} />}
                      disabled={nodosBorradorBloqueo.length === 0}
                      onClick={() => setNodosBorradorBloqueo((prev) => prev.slice(0, -1))}
                    >
                      Deshacer punto
                    </Boton>

                    <Boton
                      variante="fantasma"
                      disabled={nodosBorradorBloqueo.length === 0}
                      onClick={() => setNodosBorradorBloqueo([])}
                    >
                      Limpiar
                    </Boton>

                    <Boton
                      variante="accion"
                      icono={<Plus size={14} />}
                      disabled={nodosBorradorBloqueo.length < 2 || cargando}
                      onClick={guardarBloqueoYReplanificar}
                    >
                      Guardar bloqueo y replanificar
                    </Boton>
                  </div>
                </div>

                <div className="operacion-tr__gaveta-manual">
                  <span className="texto-tenue">O ingresar tramo por coordenadas (km):</span>
                  <label className="operacion-tr__coord">
                    <span>X1</span>
                    <input
                      type="number"
                      min={0}
                      max={ANCHO_MAPA_KM}
                      value={xInicioManual}
                      onChange={(e) => setXInicioManual(Number(e.target.value))}
                    />
                  </label>
                  <label className="operacion-tr__coord">
                    <span>Y1</span>
                    <input
                      type="number"
                      min={0}
                      max={ALTO_MAPA_KM}
                      value={yInicioManual}
                      onChange={(e) => setYInicioManual(Number(e.target.value))}
                    />
                  </label>
                  <span className="texto-tenue">→</span>
                  <label className="operacion-tr__coord">
                    <span>X2</span>
                    <input
                      type="number"
                      min={0}
                      max={ANCHO_MAPA_KM}
                      value={xFinManual}
                      onChange={(e) => setXFinManual(Number(e.target.value))}
                    />
                  </label>
                  <label className="operacion-tr__coord">
                    <span>Y2</span>
                    <input
                      type="number"
                      min={0}
                      max={ALTO_MAPA_KM}
                      value={yFinManual}
                      onChange={(e) => setYFinManual(Number(e.target.value))}
                    />
                  </label>
                  <Boton variante="secundario" onClick={agregarTramoManual}>
                    Añadir al trazo
                  </Boton>
                </div>

                {bloqueosDiaADia.length > 0 && (
                  <div className="operacion-tr__lista-incidencias">
                    <span className="rotulo">Bloqueos registrados en el turno ({bloqueosDiaADia.length}):</span>
                    <div className="operacion-tr__chips-incidencias">
                      {bloqueosDiaADia.map((bloqueo, idx) => (
                        <span key={`${bloqueo.inicioMinuto}-${idx}`} className="operacion-tr__item-incidencia">
                          <span className="cifra">
                            {bloqueo.nodos.map(([nx, ny]) => `(${nx},${ny})`).join(" → ")}
                          </span>
                          <span className="texto-tenue">
                            {formatearHoraDelDia(bloqueo.inicioMinuto)}–{formatearHoraDelDia(bloqueo.finMinuto)}
                          </span>
                          <button
                            type="button"
                            title="Levantar bloqueo y replanificar"
                            onClick={() => eliminarBloqueoYReplanificar(idx)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {panelIncidencia === "averia" && (
              <div className="operacion-tr__gaveta" role="region" aria-label="Registrar avería de unidad">
                <div className="operacion-tr__gaveta-cabecera">
                  <div>
                    <strong>Registrar avería de una unidad de la flota</strong>
                    <span className="texto-tenue">
                      Seleccione la unidad afectada y el tipo de incidente para actualizar su estado y replanificar los pedidos pendientes.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="operacion-tr__cerrar"
                    aria-label="Cerrar panel de averías"
                    onClick={() => setPanelIncidencia(null)}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="operacion-tr__gaveta-fila">
                  <div className="operacion-tr__controles-bloqueo">
                    <label className="operacion-tr__campo-en-linea">
                      <span>Unidad</span>
                      <select
                        value={unidadAveriaSeleccionada}
                        onChange={(evento) => setUnidadAveriaSeleccionada(evento.target.value)}
                      >
                        {unidades.map((u) => {
                          const yaAveriada = unidadesAveriadas.includes(u.codigoUnidad);
                          const estadoTexto = yaAveriada
                            ? "Averiada"
                            : !u.enAlmacen && !u.finalizada
                              ? `En ruta · (${Math.round(u.x)}, ${Math.round(u.y)})`
                              : "En almacén";
                          return (
                            <option key={u.codigoUnidad} value={u.codigoUnidad} disabled={yaAveriada}>
                              {u.codigoUnidad} · {ETIQUETA_TIPO_UNIDAD[u.tipoUnidad]} ({estadoTexto})
                            </option>
                          );
                        })}
                      </select>
                    </label>

                    <label className="operacion-tr__campo-en-linea">
                      <span>Tipo de avería</span>
                      <select
                        value={tipoAveriaSeleccionado}
                        onChange={(evento) => setTipoAveriaSeleccionado(evento.target.value as TipoAveria)}
                      >
                        <option value="TIPO_1">Tipo 1 · Incidente leve (1 h inmovilizada)</option>
                        <option value="TIPO_2">Tipo 2 · Avería moderada (inoperativa resto del turno)</option>
                        <option value="TIPO_3">Tipo 3 · Siniestro grave (48 h fuera de servicio)</option>
                      </select>
                    </label>

                    <Boton
                      variante="accion"
                      icono={<Wrench size={14} />}
                      disabled={
                        cargando ||
                        !unidadAveriaSeleccionada ||
                        unidadesAveriadas.includes(unidadAveriaSeleccionada)
                      }
                      onClick={() =>
                        registrarAveriaYReplanificar(unidadAveriaSeleccionada, tipoAveriaSeleccionado)
                      }
                    >
                      Registrar avería y replanificar
                    </Boton>
                  </div>
                </div>

                {averiasDiaADia.length > 0 && (
                  <div className="operacion-tr__lista-incidencias">
                    <span className="rotulo">Averías registradas ({averiasDiaADia.length}):</span>
                    <div className="operacion-tr__chips-incidencias">
                      {averiasDiaADia.map((averia, idx) => (
                        <span
                          key={`${averia.codigoUnidad}-${averia.minutoSimulacion}-${idx}`}
                          className="operacion-tr__item-incidencia operacion-tr__item-incidencia--averia"
                        >
                          <strong className="cifra">{averia.codigoUnidad}</strong>
                          <span>{ETIQUETA_AVERIA[averia.tipo]}</span>
                          <span className="texto-tenue">
                            {formatearTiempoSimulado(averia.minutoSimulacion)}
                          </span>
                          <button
                            type="button"
                            title="Quitar avería y replanificar"
                            onClick={() => eliminarAveriaYReplanificar(idx)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="centro-control__lienzo">
              <MapaCiudad
                almacenes={almacenesConStockDinamico}
                bloqueos={bloqueosCombinados}
                rutas={rutasEnMapa}
                unidades={unidadesEnMapa}
                pedidos={pedidos}
                averias={averiasActivas}
                unidadesEnMantenimiento={unidadesEnMantenimientoVigentes}
                unidadEnfocada={unidadEnfocada}
                onEnfocar={enfocarDesdeMapa}
                almacenEnfocado={almacenEnfocado}
                onSeleccionarAlmacen={seleccionarAlmacenDesdeMapa}
                minutoActual={minutoActual}
                umbralAmbarPorcentaje={umbralAmbarPorcentaje}
                umbralRojoPorcentaje={umbralRojoPorcentaje}
                modoAgregarBloqueo={panelIncidencia === "bloqueo"}
                nodosBorradorBloqueo={nodosBorradorBloqueo}
                onAgregarNodoBloqueo={agregarNodoAlBorrador}
              >
                <div className="mapa__lateral">
                  <div className="mapa__herramientas">
                    <FiltrosMapa />
                    <LeyendaDesplegable almacenCentral={almacenCentral} />
                  </div>
                  <IndicadoresGlobales
                    unidades={unidades}
                    almacenes={almacenesConStockDinamico}
                    umbrales={umbrales}
                  />
                  <NotificacionesEntregas pedidos={pedidos} claveEjecucion={claveEjecucion} />
                </div>
              </MapaCiudad>
            </div>
          </section>

          <aside
            className={`centro-control__paneles ${panelesAbiertos ? "" : "centro-control__paneles--contraidos"}`}
            aria-label="Paneles de monitoreo en tiempo real"
          >
            {panelesAbiertos ? (
              <>
                <div className="centro-control__paneles-cabecera">
                  <span className="rotulo">Monitoreo en vivo</span>
                  <button
                    type="button"
                    className="centro-control__boton-riel"
                    aria-label="Contraer paneles"
                    title="Contraer paneles: el mapa ocupa todo el ancho"
                    onClick={() => setPanelesAbiertos(false)}
                  >
                    <PanelRightClose size={17} aria-hidden />
                  </button>
                </div>
                <PanelAlertas alertas={alertas} onEnfocarUnidad={enfocarUnidad} />
                <div className="centro-control__seccion-operativa">
                  <div className="centro-control__tabs-operacion">
                    <Tabs
                      opciones={[
                        { id: "pedidos", etiqueta: "Pedidos", detalle: String(pedidosActivos) },
                        { id: "flota", etiqueta: "Flota", detalle: String(unidades.length) },
                        { id: "almacenes", etiqueta: "Almacenes", detalle: String(almacenesConStockDinamico.length) },
                      ]}
                      activa={tabOperativa}
                      onCambiar={setTabOperativa}
                    />
                  </div>

                  {tabOperativa === "pedidos" ? (
                    <PanelSeguimientoPedidos
                      pedidos={pedidos}
                      minutoActual={minutoActual}
                      onEnfocarUnidad={enfocarUnidad}
                    />
                  ) : tabOperativa === "flota" ? (
                    <PanelFlota
                      unidades={unidades}
                      unidadesAveriadas={unidadesAveriadas}
                      unidadesEnMantenimiento={unidadesEnMantenimientoVigentes}
                      unidadEnfocada={unidadEnfocada}
                      onEnfocar={enfocarUnidad}
                      rutas={ejecucion?.rutas ?? []}
                      minutoActual={minutoActual}
                      escenario={escenarioConIncidencias}
                      umbrales={umbrales}
                      onRegistrarAveria={registrarAveriaYReplanificar}
                    />
                  ) : (
                    <div className="centro-control__tab-almacenes desplazable">
                      <PanelAlmacenes
                        almacenes={almacenesConStockDinamico}
                        umbralAmbarPorcentaje={umbralAmbarPorcentaje}
                        umbralRojoPorcentaje={umbralRojoPorcentaje}
                        rutas={ejecucion?.rutas ?? []}
                        minutoActual={minutoActual}
                        almacenEnfocado={almacenEnfocado}
                        onSeleccionar={setAlmacenEnfocado}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="centro-control__riel">
                <BotonRiel
                  icono={<PanelRightOpen size={17} aria-hidden />}
                  etiqueta="Abrir paneles"
                  onClick={() => setPanelesAbiertos(true)}
                />
                <span className="centro-control__riel-separador" />
                <BotonRiel
                  icono={<Bell size={17} aria-hidden />}
                  etiqueta="Alertas"
                  contador={alertas.length}
                  urgente={alertas.some((alerta) => alerta.gravedad === "roja")}
                  onClick={() => setPanelesAbiertos(true)}
                />
                <BotonRiel
                  icono={<Package size={17} aria-hidden />}
                  etiqueta="Pedidos"
                  contador={pedidosActivos}
                  onClick={() => abrirPanelEn("pedidos")}
                />
                <BotonRiel
                  icono={<Truck size={17} aria-hidden />}
                  etiqueta="Flota"
                  contador={unidades.length}
                  onClick={() => abrirPanelEn("flota")}
                />
                <BotonRiel
                  icono={<Warehouse size={17} aria-hidden />}
                  etiqueta="Almacenes"
                  contador={almacenesConStockDinamico.length}
                  onClick={() => abrirPanelEn("almacenes")}
                />
              </div>
            )}
          </aside>
        </div>
      )}

      {reporteManual && escenarioConIncidencias && ejecucion && (
        <ReporteFinal
          solicitud={reporteManual}
          escenario={escenarioConIncidencias}
          ejecucion={ejecucion}
          ejecuciones={ejecuciones}
          averias={averiasDiaADia}
          segundosReales={segundosReales}
          colapso={null}
          onCerrar={() => setReporteManual(null)}
        />
      )}
    </div>
  );
};

interface BotonRielProps {
  icono: ReactNode;
  etiqueta: string;
  contador?: number;
  urgente?: boolean;
  onClick: () => void;
}

const BotonRiel = ({ icono, etiqueta, contador, urgente = false, onClick }: BotonRielProps) => (
  <button
    type="button"
    className="centro-control__boton-riel"
    aria-label={contador === undefined ? etiqueta : `${etiqueta} (${contador})`}
    title={etiqueta}
    onClick={onClick}
  >
    {icono}
    {contador !== undefined && contador > 0 && (
      <span className={`centro-control__contador ${urgente ? "centro-control__contador--urgente" : ""}`}>
        {contador > 99 ? "99+" : contador}
      </span>
    )}
  </button>
);

export default OperacionTiempoRealPage;
