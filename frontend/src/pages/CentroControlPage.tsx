import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Encabezado from "../components/layout/Encabezado";
import RelojSimulacion from "../components/comunes/RelojSimulacion";
import ControlesSimulacion from "../components/comunes/ControlesSimulacion";
import LineaDeTiempo from "../components/comunes/LineaDeTiempo";
import Tabs from "../components/comunes/Tabs";
import Boton from "../components/comunes/Boton";
import MapaCiudad from "../components/mapa/MapaCiudad";
import LeyendaMapa from "../components/mapa/LeyendaMapa";
import PanelSeguimientoPedidos from "../components/paneles/PanelSeguimientoPedidos";
import PanelAlertas from "../components/paneles/PanelAlertas";
import PanelFlota from "../components/paneles/PanelFlota";
import PanelAlmacenes from "../components/paneles/PanelAlmacenes";
import { usePosicionesFlota } from "../hooks/usePosicionesFlota";
import { useAlertasOperacion } from "../hooks/useAlertasOperacion";
import { useRelojSimulacion } from "../hooks/useRelojSimulacion";
import { useEjecucionVisible, useExperimentacion } from "../hooks/useExperimentacion";
import { calcularMinutoFinal, useSimulacionStore } from "../store/simulacionStore";
import { formatearSoles } from "../utils/formatters";
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
  const parametros = useSimulacionStore((estado) => estado.parametros);

  const alternarReproduccion = useSimulacionStore((estado) => estado.alternarReproduccion);
  const reiniciar = useSimulacionStore((estado) => estado.reiniciar);
  const detener = useSimulacionStore((estado) => estado.detener);
  const setMinutosPorSegundo = useSimulacionStore((estado) => estado.setMinutosPorSegundo);
  const setMinutoActual = useSimulacionStore((estado) => estado.setMinutoActual);
  const enfocarUnidad = useSimulacionStore((estado) => estado.enfocarUnidad);

  useRelojSimulacion();

  const ejecucion = useEjecucionVisible();
  const minutoFinal = useSimulacionStore((estado) => calcularMinutoFinal(estado));

  const unidadesAveriadas = useMemo(
    () =>
      (parametros.averias ?? [])
        .filter((averia) => averia.minutoSimulacion <= minutoActual)
        .map((averia) => averia.codigoUnidad),
    [parametros.averias, minutoActual],
  );

  // Las unidades sin carga -averiadas o en mantenimiento- tambien se dibujan:
  // son justamente las que el supervisor necesita localizar.
  const unidadesInmovilizadas = useMemo(
    () => [...new Set([...unidadesAveriadas, ...(escenario?.unidadesEnMantenimiento ?? [])])],
    [unidadesAveriadas, escenario],
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
    averias: parametros.averias ?? [],
    minutoActual,
    ...umbrales,
  });

  const almacenCentral = escenario?.almacenes.find((almacen) => almacen.tipo === "CENTRAL");

  const contexto = escenario
    ? `${escenario.archivoVentas} · día ${escenario.dia} · ${escenario.pedidosDelTurno} pedidos del turno` +
      (ejecucion ? ` · ${ejecucion.algoritmo} · ${formatearSoles(ejecucion.metricas.costoOperativoTotal)}` : "")
    : "Sin plan cargado · ejecute la experimentación numérica";

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

            <div className="centro-control__lienzo">
              <MapaCiudad
                almacenes={escenario.almacenes}
                bloqueos={escenario.bloqueos}
                rutas={ejecucion?.rutas ?? []}
                unidades={unidades}
                pedidos={pedidos}
                unidadesAveriadas={unidadesAveriadas}
                unidadesEnMantenimiento={escenario.unidadesEnMantenimiento}
                unidadEnfocada={unidadEnfocada}
                onEnfocar={enfocarUnidad}
                minutoActual={minutoActual}
                umbralAmbarPorcentaje={umbrales.umbralAmbarPorcentaje}
                umbralRojoPorcentaje={umbrales.umbralRojoPorcentaje}
              />
              <LeyendaMapa almacenCentral={almacenCentral} />
            </div>
          </section>

          <aside className="centro-control__paneles desplazable">
            <PanelAlertas alertas={alertas} onEnfocarUnidad={enfocarUnidad} />
            <PanelSeguimientoPedidos
              pedidos={pedidos}
              minutoActual={minutoActual}
              onEnfocarUnidad={enfocarUnidad}
            />
            <PanelFlota
              unidades={unidades}
              unidadesAveriadas={unidadesAveriadas}
              unidadesEnMantenimiento={escenario.unidadesEnMantenimiento}
              unidadEnfocada={unidadEnfocada}
              onEnfocar={enfocarUnidad}
            />
            <PanelAlmacenes
              almacenes={escenario.almacenes}
              umbralAmbarPorcentaje={umbrales.umbralAmbarPorcentaje}
              umbralRojoPorcentaje={umbrales.umbralRojoPorcentaje}
            />
          </aside>
        </div>
      )}
    </div>
  );
};

export default CentroControlPage;
