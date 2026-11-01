import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, FileText, Maximize, Minimize, Package, PanelRightClose, PanelRightOpen, Truck, Warehouse } from "lucide-react";
import Encabezado from "../components/layout/Encabezado";
import RelojSimulacion from "../components/comunes/RelojSimulacion";
import ControlesSimulacion from "../components/comunes/ControlesSimulacion";
import LineaDeTiempo from "../components/comunes/LineaDeTiempo";
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
import { calcularMinutoFinal, useSimulacionStore } from "../store/simulacionStore";
import { formatearMotivoColapso, formatearSoles } from "../utils/formatters";
import { averiasVigentes } from "../utils/averias";
import { nivelUnidad } from "../utils/semaforo";
import type { AveriaSolicitada } from "../types/Experimentacion";
import "./CentroControlPage.css";

/**
 * Vista principal: el mapa de la ciudad con el movimiento de la flota en
 * tiempo simulado, acompañado de los paneles laterales de monitoreo
 * (STD 2.6.3 y 2.6.5). Los paneles empiezan contraídos (rúbrica E01) para
 * que el mapa ocupe todo el ancho, y la vista admite pantalla completa.
 */
const CentroControlPage = () => {
  const navegar = useNavigate();
  const { umbrales } = useExperimentacion();

  const escenario = useSimulacionStore((estado) => estado.escenario);
  const ejecuciones = useSimulacionStore((estado) => estado.ejecuciones);
  const algoritmoVisible = useSimulacionStore((estado) => estado.algoritmoVisible);
  const setAlgoritmoVisible = useSimulacionStore((estado) => estado.setAlgoritmoVisible);
  const minutoActual = useSimulacionStore((estado) => estado.minutoActual);
  const reproduciendo = useSimulacionStore((estado) => estado.reproduciendo);
  const minutosPorSegundo = useSimulacionStore((estado) => estado.minutosPorSegundo);
  const segundosReales = useSimulacionStore((estado) => estado.segundosReales);
  const unidadEnfocada = useSimulacionStore((estado) => estado.unidadEnfocada);
  const modoSimulacion = useSimulacionStore((estado) => estado.modoSimulacion);
  const parametros = useSimulacionStore((estado) => estado.parametros);
  const parametros5D = useSimulacionStore((estado) => estado.parametros5D);
  const parametrosColapso = useSimulacionStore((estado) => estado.parametrosColapso);

  const [tabOperativa, setTabOperativa] = useState<string>("pedidos");
  const [panelesAbiertos, setPanelesAbiertos] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [reporteManual, setReporteManual] = useState<SolicitudReporte | null>(null);
  const [reporteDescartado, setReporteDescartado] = useState<string | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);

  const alternarReproduccion = useSimulacionStore((estado) => estado.alternarReproduccion);
  const reiniciar = useSimulacionStore((estado) => estado.reiniciar);
  const detener = useSimulacionStore((estado) => estado.detener);
  const setMinutosPorSegundo = useSimulacionStore((estado) => estado.setMinutosPorSegundo);
  const setMinutoActual = useSimulacionStore((estado) => estado.setMinutoActual);
  const enfocarUnidad = useSimulacionStore((estado) => estado.enfocarUnidad);
  const tiposVisibles = useSimulacionStore((estado) => estado.tiposVisibles);
  const nivelesVisibles = useSimulacionStore((estado) => estado.nivelesVisibles);
  const almacenEnfocado = useSimulacionStore((estado) => estado.almacenEnfocado);
  const setAlmacenEnfocado = useSimulacionStore((estado) => estado.setAlmacenEnfocado);
  const tiempoReal = useSimulacionStore((estado) => estado.tiempoReal);

  useRelojSimulacion();

  const ejecucion = useEjecucionVisible();
  const minutoFinal = useSimulacionStore((estado) => calcularMinutoFinal(estado));
  const esCincoDias = escenario ? escenario.minutoFin - escenario.minutoInicio > 1440 : false;
  const modoEfectivo: "1D" | "5D" | "COLAPSO" =
    modoSimulacion === "COLAPSO"
      ? "COLAPSO"
      : modoSimulacion === "5D" || esCincoDias
        ? "5D"
        : "1D";

  const colapsoOcurrido = ejecucion?.colapsoOcurrido ?? escenario?.colapsoOcurrido;
  const minutoColapso = ejecucion?.minutoColapso ?? escenario?.minutoColapso;
  const fechaHoraColapso = ejecucion?.fechaHoraColapso ?? escenario?.fechaHoraColapso;
  const motivoColapso = formatearMotivoColapso(ejecucion?.motivoColapso ?? escenario?.motivoColapso);
  const esColapsoAlcanzado = Boolean(
    colapsoOcurrido && minutoColapso !== null && minutoColapso !== undefined && minutoActual >= minutoColapso,
  );

  const listaAverias = useMemo<AveriaSolicitada[]>(() => {
    if (modoSimulacion === "COLAPSO") {
      return (parametrosColapso.averias ?? []).map((a) => ({
        codigoUnidad: a.codigoUnidad,
        minutoSimulacion: (a.dia - 1) * 1440 + a.hora * 60,
        tipo: a.tipo,
      }));
    }
    if (esCincoDias || modoSimulacion === "5D") {
      return (parametros5D.averias ?? []).map((a) => ({
        codigoUnidad: a.codigoUnidad,
        minutoSimulacion: (a.dia - 1) * 1440 + a.hora * 60,
        tipo: a.tipo,
      }));
    }
    return (parametros.averias ?? []).map((a) => ({
      codigoUnidad: a.codigoUnidad,
      minutoSimulacion: a.minutoSimulacion,
      tipo: a.tipo,
    }));
  }, [modoSimulacion, esCincoDias, parametros.averias, parametros5D.averias, parametrosColapso.averias]);

  // Una avería solo se muestra mientras dura según su tipo (rúbrica D13).
  const averiasActivas = useMemo(() => averiasVigentes(listaAverias, minutoActual), [listaAverias, minutoActual]);
  const unidadesAveriadas = useMemo(() => averiasActivas.map((averia) => averia.codigoUnidad), [averiasActivas]);

  // Unidades cuyo mantenimiento preventivo esta realmente vigente en el minutoActual
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

  // Las unidades sin carga -averiadas o en mantenimiento vigente- tambien se dibujan
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

  const alertas = useAlertasOperacion({
    escenario,
    ejecucion,
    pedidos,
    averias: listaAverias,
    minutoActual,
    ...umbrales,
  });

  const pedidosActivos = useMemo(
    () => pedidos.filter((pedido) => pedido.estado !== "ENTREGADO").length,
    [pedidos],
  );

  const almacenesConStockDinamico = useMemo(() => {
    if (!escenario) return [];
    if (!ejecucion || !esCincoDias) return escenario.almacenes;

    const diaActualIndex = Math.floor(minutoActual / 1440);
    const inicioDiaMinuto = diaActualIndex * 1440;

    let consumidoNO = 0;
    let consumidoEste = 0;

    ejecucion.rutas.forEach((r) => {
      if (r.minutoSalida >= inicioDiaMinuto && r.minutoSalida <= minutoActual) {
        if (r.almacenOrigen === "ALM-NOROESTE") {
          consumidoNO += r.cargaTotal;
        } else if (r.almacenOrigen === "ALM-ESTE") {
          consumidoEste += r.cargaTotal;
        }
      }
    });

    return escenario.almacenes.map((alm) => {
      if (alm.tipo === "CENTRAL") return alm;
      const consumido = alm.codigo === "ALM-NOROESTE" ? consumidoNO : consumidoEste;
      const stock = Math.max(0, alm.stockMaximo - consumido);
      return { ...alm, stockActual: stock };
    });
  }, [escenario, ejecucion, esCincoDias, minutoActual]);

  const almacenCentral = escenario?.almacenes.find((almacen) => almacen.tipo === "CENTRAL");

  // Los filtros por tipo y por semáforo + vacío se aplican igual al mapa y al panel de flota (RF-59, D06).
  const { umbralAmbarPorcentaje, umbralRojoPorcentaje } = umbrales;
  const unidadesEnMapa = useMemo(
    () =>
      unidades.filter(
        (unidad) =>
          tiposVisibles.includes(unidad.tipoUnidad) &&
          nivelesVisibles.includes(
            nivelUnidad(unidad.cargaRestante, unidad.capacidad, { umbralAmbarPorcentaje, umbralRojoPorcentaje }),
          ),
      ),
    [unidades, tiposVisibles, nivelesVisibles, umbralAmbarPorcentaje, umbralRojoPorcentaje],
  );
  const rutasEnMapa = useMemo(() => {
    const visibles = new Set(unidadesEnMapa.map((unidad) => unidad.codigoUnidad));
    return (ejecucion?.rutas ?? []).filter((ruta) => visibles.has(ruta.codigoUnidad));
  }, [ejecucion, unidadesEnMapa]);

  // Enlace mapa -> panel (rúbrica F01, F05): elegir en el mapa abre el panel con la selección.
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

  // Pantalla completa del Centro de Control: el mapa ocupa todo el monitor.
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

  // Reporte de la última planificación estable (rúbrica G08-G10).
  const claveEjecucion = escenario
    ? `${escenario.archivoVentas}-${escenario.minutoInicio}-${escenario.semilla}-${ejecucion?.algoritmo ?? ""}`
    : "";
  const claveFin = `${claveEjecucion}@${minutoActual}`;
  const finAlcanzado =
    Boolean(ejecucion) &&
    !tiempoReal &&
    !reproduciendo &&
    segundosReales > 0 &&
    (esColapsoAlcanzado || minutoActual >= minutoFinal);
  const reporte: SolicitudReporte | null =
    reporteManual ??
    (finAlcanzado && reporteDescartado !== claveFin
      ? { motivo: esColapsoAlcanzado || modoEfectivo === "COLAPSO" ? "COLAPSO" : "FIN_PERIODO", minutoCorte: minutoActual }
      : null);
  const cerrarReporte = useCallback(() => {
    setReporteManual(null);
    setReporteDescartado(claveFin);
  }, [claveFin]);
  const detenerOperacion = () => {
    // Cerrar la operación día a día deja su reporte (G09) antes de volver al inicio.
    if (tiempoReal && ejecucion) {
      setReporteManual({ motivo: "CIERRE_DIA_A_DIA", minutoCorte: minutoActual });
    }
    detener();
  };

  const contextoBase = escenario
    ? modoSimulacion === "COLAPSO"
      ? `${escenario.archivoVentas} · Simulación hasta el colapso (desde día ${escenario.dia}) · ${escenario.pedidosDelTurno} pedidos` +
      (ejecucion ? ` · ${ejecucion.algoritmo} · ${formatearSoles(ejecucion.metricas.costoOperativoTotal)}` : "") +
      (esColapsoAlcanzado ? ` · ¡Colapso!: ${fechaHoraColapso}` : "")
      : esCincoDias
        ? `${escenario.archivoVentas} · 5 días (días ${escenario.dia}–${escenario.dia + 4}) · ${escenario.pedidosDelTurno} pedidos` +
        (ejecucion ? ` · ${ejecucion.algoritmo} · ${formatearSoles(ejecucion.metricas.costoOperativoTotal)}` : "")
        : `${escenario.archivoVentas} · día ${escenario.dia} · ${escenario.pedidosDelTurno} pedidos del turno` +
        (ejecucion ? ` · ${ejecucion.algoritmo} · ${formatearSoles(ejecucion.metricas.costoOperativoTotal)}` : "")
    : "Sin plan cargado · ejecute la experimentación numérica";
  const contexto = tiempoReal ? `Operación día a día · hora de Lima · ${contextoBase}` : contextoBase;

  return (
    <div className="centro-control" ref={raizRef}>
      <Encabezado
        titulo="Centro de Control"
        contexto={contexto}
        extremo={
          <RelojSimulacion
            minutoSimulacionActual={minutoActual}
            segundosRealesTranscurridos={segundosReales}
            minutoInicio={escenario?.minutoInicio}
            anio={escenario?.anio}
            mes={escenario?.mes}
          />
        }
        acciones={
          <ControlesSimulacion
            reproduciendo={reproduciendo}
            habilitado={Boolean(escenario)}
            minutosPorSegundo={minutosPorSegundo}
            modoSimulacion={modoEfectivo}
            onAlternar={alternarReproduccion}
            onReiniciar={reiniciar}
            onDetener={detenerOperacion}
            onCambiarVelocidad={setMinutosPorSegundo}
          />
        }
      />

      {!escenario ? (
        <div className="centro-control__sin-plan">
          <h2>Todavía no hay un plan que monitorear</h2>
          <p className="texto-secundario">
            La Consola de Simulación carga un turno de los archivos del cliente y lo resuelve con el I-ACO y el
            AGA-ES-TW. Al terminar, la flota se mueve sobre este mapa siguiendo la ruta que el algoritmo encontró.
          </p>
          <Boton variante="accion" onClick={() => navegar("/simulacion")}>
            Ir a la Consola de Simulación
          </Boton>
        </div>
      ) : (
        <div className="centro-control__cuerpo">
          <section className="centro-control__columna-mapa">
            <div className="centro-control__barra">
              {ejecuciones.length > 1 && (
                <Tabs
                  opciones={ejecuciones.map((candidata) => ({
                    id: candidata.algoritmo,
                    etiqueta: candidata.algoritmo,
                    detalle: formatearSoles(candidata.metricas.costoOperativoTotal),
                  }))}
                  activa={algoritmoVisible ?? ejecuciones[0].algoritmo}
                  onCambiar={setAlgoritmoVisible}
                />
              )}
              <LineaDeTiempo
                minutoInicio={escenario.minutoInicio}
                minutoFin={minutoFinal}
                minutoActual={minutoActual}
                habilitado
                onCambiar={setMinutoActual}
              />
              <div className="centro-control__acciones-vista">
                {ejecucion && (
                  <button
                    type="button"
                    className="centro-control__boton-vista"
                    title="Reporte de la planificación en curso"
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
                  title={pantallaCompleta ? "Salir de pantalla completa (Esc)" : "Ver el mapa en pantalla completa"}
                  onClick={alternarPantallaCompleta}
                >
                  {pantallaCompleta ? <Minimize size={15} aria-hidden /> : <Maximize size={15} aria-hidden />}
                  {pantallaCompleta ? "Salir" : "Pantalla completa"}
                </button>
              </div>
            </div>

            {esColapsoAlcanzado && (
              <div className="centro-control__alerta-colapso" role="alert">
                <div className="alerta-colapso__cabecera">
                  <div className="alerta-colapso__titular">
                    <h3>¡COLAPSO LOGÍSTICO ALCANZADO!</h3>
                    <span className="alerta-colapso__fecha">
                      Fecha y hora del colapso: <strong>{fechaHoraColapso}</strong>
                    </span>
                  </div>
                </div>
                <p className="alerta-colapso__motivo">
                  <strong>Motivo:</strong> {motivoColapso}
                </p>
              </div>
            )}

            <div className="centro-control__lienzo">
              <MapaCiudad
                almacenes={almacenesConStockDinamico}
                bloqueos={escenario.bloqueos}
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
              >
                {/* Columna derecha: filtros y leyenda, indicadores globales y avisos de entregas. */}
                <div className="mapa__lateral">
                  <div className="mapa__herramientas">
                    <FiltrosMapa />
                    <LeyendaDesplegable almacenCentral={almacenCentral} />
                  </div>
                  <IndicadoresGlobales unidades={unidades} almacenes={almacenesConStockDinamico} umbrales={umbrales} />
                  <NotificacionesEntregas pedidos={pedidos} claveEjecucion={claveEjecucion} />
                </div>
              </MapaCiudad>
            </div>
          </section>

          <aside
            className={`centro-control__paneles ${panelesAbiertos ? "" : "centro-control__paneles--contraidos"}`}
            aria-label="Paneles de monitoreo"
          >
            {panelesAbiertos ? (
              <>
                <div className="centro-control__paneles-cabecera">
                  <span className="rotulo">Monitoreo</span>
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
                      escenario={escenario}
                      umbrales={umbrales}
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

      {reporte && escenario && ejecucion && (
        <ReporteFinal
          solicitud={reporte}
          escenario={escenario}
          ejecucion={ejecucion}
          ejecuciones={ejecuciones}
          averias={listaAverias}
          segundosReales={segundosReales}
          colapso={esColapsoAlcanzado ? { fechaHora: fechaHoraColapso, motivo: motivoColapso } : null}
          onCerrar={cerrarReporte}
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

/** Acceso del riel de paneles contraídos: icono, cantidad y nombre al pasar el cursor. */
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

export default CentroControlPage;
