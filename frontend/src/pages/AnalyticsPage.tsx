import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Clock, Coins, FileDown, FileSpreadsheet, Route, Timer, TriangleAlert } from "lucide-react";
import ReportesDesempeno from "../components/reportes/ReportesDesempeno";
import { useAveriasDeLaCorrida } from "../hooks/useAveriasDeLaCorrida";
import {
  descargarItinerario,
  exportarIncidencias,
  exportarRefrigerios,
  exportarResultados,
} from "../utils/reportes";
import Encabezado from "../components/layout/Encabezado";
import Indicador from "../components/comunes/Indicador";
import Boton from "../components/comunes/Boton";
import Tabla, { type ColumnaTabla } from "../components/comunes/Tabla";
import { useSimulacionStore } from "../store/simulacionStore";
import type { EjecucionDto, RutaDto } from "../types/Experimentacion";
import { COLOR_TIPO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from "../utils/constants";
import {
  formatearKm,
  formatearMilisegundos,
  formatearMotivoColapso,
  formatearSoles,
  formatearTiempoSimulado,
} from "../utils/formatters";
import "./AnalyticsPage.css";

interface FilaComparativa {
  indicador: string;
  descripcion: string;
  valores: string[];
  /** Indice del algoritmo que gana este indicador; -1 si empatan. */
  ganador: number;
}

/**
 * Tableros de desempeño de la operacion: el resultado de la
 * experimentacion numerica exigida por el requisito no funcional (a) del
 * caso, con los dos algoritmos evaluados sobre el mismo turno.
 */
const AnalyticsPage = () => {
  const navegar = useNavigate();
  const escenario = useSimulacionStore((estado) => estado.escenario);
  const ejecuciones = useSimulacionStore((estado) => estado.ejecuciones);
  const modoSimulacion = useSimulacionStore((estado) => estado.modoSimulacion);

  const averias = useAveriasDeLaCorrida();
  const comparativa = useMemo(() => construirComparativa(ejecuciones), [ejecuciones]);
  const mejor = useMemo(() => elegirMejor(ejecuciones), [ejecuciones]);

  const esCincoDias = escenario ? escenario.minutoFin - escenario.minutoInicio > 1440 : false;

  const columnasRutas: ColumnaTabla<RutaDto>[] = [
    {
      encabezado: "Unidad",
      cifra: true,
      renderizar: (ruta) => (
        <span className="analytics__unidad">
          <span className="analytics__punto" style={{ backgroundColor: COLOR_TIPO_UNIDAD[ruta.tipoUnidad] }} />
          <strong>{ruta.codigoUnidad}</strong>
        </span>
      ),
    },
    { encabezado: "Tipo", renderizar: (ruta) => ETIQUETA_TIPO_UNIDAD[ruta.tipoUnidad] },
    { encabezado: "Almacén", renderizar: (ruta) => ruta.almacenOrigen },
    {
      encabezado: "Carga",
      cifra: true,
      renderizar: (ruta) => `${ruta.cargaTotal}/${ruta.capacidad}`,
    },
    { encabezado: "Paradas", cifra: true, renderizar: (ruta) => String(ruta.paradas.length) },
    { encabezado: "Distancia", cifra: true, renderizar: (ruta) => formatearKm(ruta.distanciaKm) },
    { encabezado: "Costo", cifra: true, renderizar: (ruta) => formatearSoles(ruta.costoSoles) },
    {
      encabezado: "Salida",
      cifra: true,
      renderizar: (ruta) => formatearTiempoSimulado(ruta.minutoSalida),
    },
    {
      encabezado: "Termina",
      cifra: true,
      renderizar: (ruta) => formatearTiempoSimulado(ruta.minutoFin),
    },
    {
      encabezado: "Refrigerio",
      cifra: true,
      renderizar: (ruta) =>
        ruta.minutoInicioAlimentacion === null || ruta.minutoInicioAlimentacion === undefined ? (
          "—"
        ) : (
          <span className={ruta.alimentacionEnVentana ? "" : "plazo--critica"}>
            {formatearTiempoSimulado(ruta.minutoInicioAlimentacion)}
          </span>
        ),
    },
    {
      encabezado: "Itinerario",
      renderizar: (ruta) => (
        <Boton
          variante="fantasma"
          soloIcono
          title={`Descargar el itinerario de ${ruta.codigoUnidad}`}
          aria-label={`Descargar el itinerario de ${ruta.codigoUnidad}`}
          icono={<FileDown size={14} />}
          onClick={(evento) => {
            evento.stopPropagation();
            const ejecucionDeRuta = ejecuciones.find((candidata) => candidata.rutas.includes(ruta));
            descargarItinerario(ruta.codigoUnidad, ejecucionDeRuta?.rutas ?? [ruta], escenario);
          }}
        />
      ),
    },
  ];

  if (!escenario || ejecuciones.length === 0) {
    return (
      <div className="analytics">
        <Encabezado titulo="Analytics" contexto="Experimentación numérica de los dos algoritmos" />
        <div className="estado-vacio analytics__vacio">
          <span className="estado-vacio__titulo">Todavía no hay una ejecución que analizar</span>
          <span>Ejecute la planificación desde la Consola de Simulación para comparar ambos algoritmos.</span>
          <Boton variante="accion" onClick={() => navegar("/simulacion")}>
            Ir a la Consola de Simulación
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics">
      <Encabezado
        titulo="Analytics"
        contexto={
          modoSimulacion === "COLAPSO"
            ? `${escenario.archivoVentas} · Simulación hasta el colapso (desde día ${escenario.dia}) · ${escenario.pedidosDelTurno} pedidos · semilla ${escenario.semilla}`
            : esCincoDias
              ? `${escenario.archivoVentas} · 5 días (días ${escenario.dia}–${escenario.dia + 4}) · ${escenario.pedidosDelTurno} pedidos · semilla ${escenario.semilla}`
              : `${escenario.archivoVentas} · día ${escenario.dia} · ${escenario.pedidosDelTurno} pedidos · semilla ${escenario.semilla}`
        }
        acciones={
          <>
            <Boton
              variante="secundario"
              icono={<FileSpreadsheet size={15} />}
              onClick={() => exportarResultados(escenario, ejecuciones)}
              title="Resultados, rutas y entregas en un archivo que Excel abre directamente"
            >
              Exportar a Excel
            </Boton>
            <Boton
              variante="secundario"
              icono={<FileDown size={15} />}
              onClick={() => exportarIncidencias(escenario, averias)}
              title="Historial de averías, mantenimientos y bloqueos de calles"
            >
              Incidencias
            </Boton>
            <Boton
              variante="secundario"
              icono={<FileDown size={15} />}
              onClick={() => exportarRefrigerios(ejecuciones)}
              title="Horas de alimentación de los conductores"
            >
              Refrigerios
            </Boton>
            <Boton variante="secundario" onClick={() => navegar("/simulacion")}>
              Nueva ejecución
            </Boton>
          </>
        }
      />

      <div className="analytics__cuerpo desplazable">
        {mejor && ejecuciones.length > 1 && (
          <div className="analytics__veredicto">
            <Award size={18} aria-hidden />
            <span>
              Sobre este turno, <strong>{mejor.algoritmo}</strong> entrega el plan más económico:{" "}
              {formatearSoles(mejor.metricas.costoOperativoTotal)} frente a{" "}
              {formatearSoles(
                ejecuciones.find((ejecucion) => ejecucion !== mejor)?.metricas.costoOperativoTotal ?? 0,
              )}
              . Un solo turno no decide la elección: repita la comparación sobre varios meses y semillas.
            </span>
          </div>
        )}

        {(modoSimulacion === "COLAPSO" || ejecuciones.some((e) => e.colapsoOcurrido)) && (
          <section className="tarjeta">
            <header className="tarjeta__encabezado">
              <div>
                <h2 className="tarjeta__titulo">Diagnóstico y Resistencia al Colapso</h2>
                <p className="tarjeta__contexto">
                  Evaluación de la duración de operación y causas de ruptura del servicio bajo carga continua
                </p>
              </div>
            </header>
            <div className="analytics__colapso-grid">
              {ejecuciones.map((ej) => (
                <div key={ej.algoritmo} className="analytics__colapso-item">
                  <div className="colapso-item__header">
                    <span className="rotulo">{ej.algoritmo}</span>
                    <span className={`badge-colapso ${ej.colapsoOcurrido ? "colapsado" : "estable"}`}>
                      {ej.colapsoOcurrido ? "COLAPSO DETECTADO" : "OPERACIÓN ESTABLE"}
                    </span>
                  </div>
                  <div className="colapso-item__detalle">
                    <div className="colapso-dato">
                      <span className="texto-tenue">Momento del colapso:</span>
                      <strong>{ej.fechaHoraColapso ?? "No colapsó"}</strong>
                    </div>
                    {ej.motivoColapso && (
                      <div className="colapso-motivo">
                        <span className="texto-tenue">Causa identificada:</span>
                        <p>{formatearMotivoColapso(ej.motivoColapso)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="analytics__indicadores">
          {ejecuciones.map((ejecucion) => (
            <div key={ejecucion.algoritmo} className="analytics__grupo">
              <h2 className="rotulo">{ejecucion.algoritmo}</h2>
              <div className="analytics__rejilla">
                <Indicador
                  rotulo="Costo operativo"
                  valor={formatearSoles(ejecucion.metricas.costoOperativoTotal)}
                  detalle="Distancia × tarifa del tipo de unidad"
                  icono={<Coins size={15} />}
                />
                <Indicador
                  rotulo="Distancia total"
                  valor={formatearKm(ejecucion.metricas.distanciaTotalKm)}
                  detalle={`${ejecucion.metricas.unidadesEnRuta} de ${ejecucion.metricas.unidadesDisponibles} unidades en ruta`}
                  icono={<Route size={15} />}
                />
                <Indicador
                  rotulo="Pedidos atendidos"
                  valor={`${ejecucion.metricas.pedidosAtendidos} / ${ejecucion.metricas.pedidosDelTurno}`}
                  detalle={
                    ejecucion.metricas.pedidosSinAtender > 0
                      ? `${ejecucion.metricas.pedidosSinAtender} sin unidad factible`
                      : "Todos los pedidos del turno"
                  }
                  color={
                    ejecucion.metricas.pedidosSinAtender > 0
                      ? "var(--color-semaforo-rojo)"
                      : "var(--color-semaforo-verde)"
                  }
                  icono={<Timer size={15} />}
                />
                <Indicador
                  rotulo="Entregas fuera de plazo"
                  valor={String(ejecucion.metricas.entregasFueraDePlazo)}
                  detalle="La política exige que todas lleguen dentro del plazo"
                  color={
                    ejecucion.metricas.entregasFueraDePlazo > 0
                      ? "var(--color-semaforo-rojo)"
                      : "var(--color-semaforo-verde)"
                  }
                  icono={<TriangleAlert size={15} />}
                />
                <Indicador
                  rotulo="Tiempo de cómputo"
                  valor={formatearMilisegundos(ejecucion.metricas.duracionComputoMs)}
                  detalle={`Fitness ${ejecucion.metricas.fitness.toExponential(3)}`}
                  icono={<Clock size={15} />}
                />
              </div>
            </div>
          ))}
        </div>

        {ejecuciones.length > 1 && (
          <section className="tarjeta">
            <header className="tarjeta__encabezado">
              <div>
                <h2 className="tarjeta__titulo">Comparación directa</h2>
                <p className="tarjeta__contexto">
                  Ambos algoritmos resolvieron el mismo turno, con la misma flota, los mismos bloqueos y la misma
                  semilla
                </p>
              </div>
            </header>

            <div className="analytics__comparativa">
              <table>
                <thead>
                  <tr>
                    <th>Indicador</th>
                    {ejecuciones.map((ejecucion) => (
                      <th key={ejecucion.algoritmo}>{ejecucion.algoritmo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparativa.map((fila) => (
                    <tr key={fila.indicador}>
                      <td>
                        <strong>{fila.indicador}</strong>
                        <span className="analytics__descripcion">{fila.descripcion}</span>
                      </td>
                      {fila.valores.map((valor, indice) => (
                        <td
                          key={`${fila.indicador}-${indice}`}
                          className={`cifra ${fila.ganador === indice ? "analytics__ganador" : ""}`}
                        >
                          {valor}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <ReportesDesempeno escenario={escenario} ejecuciones={ejecuciones} />

        {ejecuciones.map((ejecucion) => (
          <section className="tarjeta" key={`rutas-${ejecucion.algoritmo}`}>
            <header className="tarjeta__encabezado">
              <div>
                <h2 className="tarjeta__titulo">Rutas de {ejecucion.algoritmo}</h2>
                <p className="tarjeta__contexto">
                  {ejecucion.rutas.length} unidades con carga ·{" "}
                  {formatearKm(ejecucion.metricas.distanciaTotalKm)} ·{" "}
                  {formatearSoles(ejecucion.metricas.costoOperativoTotal)}
                </p>
              </div>
            </header>
            <Tabla
              columnas={columnasRutas}
              filas={ejecucion.rutas}
              obtenerLlave={(ruta) => `${ruta.codigoUnidad}-${ruta.minutoSalida}`}
              nombrePlural="rutas"
              mensajeVacio="Este algoritmo no asignó carga a ninguna unidad"
            />

            {ejecucion.riesgosDeColapso.length > 0 && (
              <div className="analytics__riesgos">
                <h3 className="rotulo">Riesgos de colapso logístico</h3>
                <ul>
                  {ejecucion.riesgosDeColapso.slice(0, 8).map((riesgo) => (
                    <li key={riesgo}>{riesgo}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

/** Construye la tabla comparativa y marca quien gana cada indicador. */
function construirComparativa(ejecuciones: EjecucionDto[]): FilaComparativa[] {
  if (ejecuciones.length === 0) {
    return [];
  }

  const menorGana = (valores: number[]) => indiceDe(valores, Math.min(...valores));
  const mayorGana = (valores: number[]) => indiceDe(valores, Math.max(...valores));

  const costos = ejecuciones.map((ejecucion) => ejecucion.metricas.costoOperativoTotal);
  const distancias = ejecuciones.map((ejecucion) => ejecucion.metricas.distanciaTotalKm);
  const atendidos = ejecuciones.map((ejecucion) => ejecucion.metricas.pedidosAtendidos);
  const fueraDePlazo = ejecuciones.map((ejecucion) => Number(ejecucion.metricas.entregasFueraDePlazo));
  const unidades = ejecuciones.map((ejecucion) => ejecucion.metricas.unidadesEnRuta);
  const computo = ejecuciones.map((ejecucion) => ejecucion.metricas.duracionComputoMs);
  const fitness = ejecuciones.map((ejecucion) => ejecucion.metricas.fitness);

  const filas: FilaComparativa[] = [
    {
      indicador: "Costo operativo",
      descripcion: "Gasto de la operación; menor es mejor",
      valores: costos.map(formatearSoles),
      ganador: menorGana(costos),
    },
    {
      indicador: "Distancia total",
      descripcion: "Kilómetros recorridos por la flota",
      valores: distancias.map(formatearKm),
      ganador: menorGana(distancias),
    },
    {
      indicador: "Pedidos atendidos",
      descripcion: "Cumplimiento de la demanda del turno",
      valores: atendidos.map(String),
      ganador: mayorGana(atendidos),
    },
    {
      indicador: "Entregas fuera de plazo",
      descripcion: "Incumplimientos de la política de entrega",
      valores: fueraDePlazo.map(String),
      ganador: menorGana(fueraDePlazo),
    },
    {
      indicador: "Unidades movilizadas",
      descripcion: "Vehículos que salieron con carga",
      valores: unidades.map(String),
      ganador: menorGana(unidades),
    },
    {
      indicador: "Tiempo de cómputo",
      descripcion: "Lo que tardó el planificador",
      valores: computo.map(formatearMilisegundos),
      ganador: menorGana(computo),
    },
    {
      indicador: "Fitness",
      descripcion: "1 / (1 + costo + multas); mayor es mejor",
      valores: fitness.map((valor) => valor.toExponential(3)),
      ganador: mayorGana(fitness),
    },
  ];

  if (ejecuciones.some((e) => e.colapsoOcurrido)) {
    const minutosColapso = ejecuciones.map((e) =>
      e.colapsoOcurrido && e.minutoColapso != null ? e.minutoColapso : 9999999,
    );
    filas.unshift({
      indicador: "Punto de colapso",
      descripcion: "Momento de ruptura del servicio; mayor resistencia es mejor",
      valores: ejecuciones.map((e) =>
        e.colapsoOcurrido ? e.fechaHoraColapso ?? `Minuto ${e.minutoColapso}` : "Operación estable",
      ),
      ganador: mayorGana(minutosColapso),
    });
  }

  return filas;
}

function indiceDe(valores: number[], objetivo: number): number {
  const coincidencias = valores.filter((valor) => valor === objetivo);
  return coincidencias.length === valores.length ? -1 : valores.indexOf(objetivo);
}

/** Gana el plan que atiende más pedidos y, a igualdad, el más económico. */
function elegirMejor(ejecuciones: EjecucionDto[]): EjecucionDto | null {
  if (ejecuciones.length === 0) {
    return null;
  }
  return [...ejecuciones].sort((a, b) => {
    if (a.metricas.pedidosAtendidos !== b.metricas.pedidosAtendidos) {
      return b.metricas.pedidosAtendidos - a.metricas.pedidosAtendidos;
    }
    return a.metricas.costoOperativoTotal - b.metricas.costoOperativoTotal;
  })[0];
}

export default AnalyticsPage;
