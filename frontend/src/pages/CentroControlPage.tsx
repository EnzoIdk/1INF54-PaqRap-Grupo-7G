import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Encabezado from "../components/layout/Encabezado";
import RelojSimulacion from "../components/comunes/RelojSimulacion";
import ControlesSimulacion from "../components/comunes/ControlesSimulacion";
import LineaDeTiempo from "../components/comunes/LineaDeTiempo";
import Tabs from "../components/comunes/Tabs";
import Boton from "../components/comunes/Boton";
import MapaCiudad from "../components/mapa/MapaCiudad";
import LeyendaDesplegable from "../components/mapa/LeyendaDesplegable";
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
import "./CentroControlPage.css";

/**
 * Vista principal: el mapa de la ciudad con el movimiento de la flota en
 * tiempo simulado, acompañado de los paneles laterales de monitoreo
 * (STD 2.6.3 y 2.6.5).
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

  const alternarReproduccion = useSimulacionStore((estado) => estado.alternarReproduccion);
  const reiniciar = useSimulacionStore((estado) => estado.reiniciar);
  const detener = useSimulacionStore((estado) => estado.detener);
  const setMinutosPorSegundo = useSimulacionStore((estado) => estado.setMinutosPorSegundo);
  const setMinutoActual = useSimulacionStore((estado) => estado.setMinutoActual);
  const enfocarUnidad = useSimulacionStore((estado) => estado.enfocarUnidad);
  const tiposVisibles = useSimulacionStore((estado) => estado.tiposVisibles);
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

  const listaAverias = useMemo(() => {
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

  const unidadesAveriadas = useMemo(
    () =>
      listaAverias
        .filter((averia) => averia.minutoSimulacion <= minutoActual)
        .map((averia) => averia.codigoUnidad),
    [listaAverias, minutoActual],
  );

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

  // El filtro por tipo del panel de flota también se aplica al mapa (RF-59).
  const unidadesEnMapa = useMemo(
    () => unidades.filter((unidad) => tiposVisibles.includes(unidad.tipoUnidad)),
    [unidades, tiposVisibles],
  );
  const rutasEnMapa = useMemo(
    () => (ejecucion?.rutas ?? []).filter((ruta) => tiposVisibles.includes(ruta.tipoUnidad)),
    [ejecucion, tiposVisibles],
  );

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
    <div className="centro-control">
      <Encabezado
        titulo="Centro de Control"
        contexto={contexto}
        extremo={
          <RelojSimulacion minutoSimulacionActual={minutoActual} segundosRealesTranscurridos={segundosReales} />
        }
        acciones={
          <ControlesSimulacion
            reproduciendo={reproduciendo}
            habilitado={Boolean(escenario)}
            minutosPorSegundo={minutosPorSegundo}
            modoSimulacion={modoEfectivo}
            onAlternar={alternarReproduccion}
            onReiniciar={reiniciar}
            onDetener={detener}
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
                unidadesAveriadas={unidadesAveriadas}
                unidadesEnMantenimiento={unidadesEnMantenimientoVigentes}
                unidadEnfocada={unidadEnfocada}
                onEnfocar={enfocarUnidad}
                minutoActual={minutoActual}
                umbralAmbarPorcentaje={umbrales.umbralAmbarPorcentaje}
                umbralRojoPorcentaje={umbrales.umbralRojoPorcentaje}
              />
              {/* La leyenda se despliega sobre el mapa para no quitarle espacio. */}
              <LeyendaDesplegable almacenCentral={almacenCentral} />
              <NotificacionesEntregas
                pedidos={pedidos}
                claveEjecucion={`${escenario.archivoVentas}-${escenario.minutoInicio}-${escenario.semilla}-${ejecucion?.algoritmo ?? ""}`}
              />
            </div>
          </section>

          <aside className="centro-control__paneles">
            <PanelAlertas alertas={alertas} onEnfocarUnidad={enfocarUnidad} />
            <div className="centro-control__seccion-operativa">
              <div className="centro-control__tabs-operacion">
                <Tabs
                  opciones={[
                    {
                      id: "pedidos",
                      etiqueta: "Pedidos",
                      detalle: String(pedidosActivos),
                    },
                    {
                      id: "flota",
                      etiqueta: "Flota",
                      detalle: String(unidades.length),
                    },
                    {
                      id: "almacenes",
                      etiqueta: "Almacenes",
                      detalle: String(almacenesConStockDinamico.length),
                    },
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
                />
              ) : (
                <div className="centro-control__tab-almacenes desplazable">
                  <PanelAlmacenes
                    almacenes={almacenesConStockDinamico}
                    umbralAmbarPorcentaje={umbrales.umbralAmbarPorcentaje}
                    umbralRojoPorcentaje={umbrales.umbralRojoPorcentaje}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default CentroControlPage;
