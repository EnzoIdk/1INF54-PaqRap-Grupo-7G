import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Download, FileText, Printer, X } from "lucide-react";
import Boton from "../comunes/Boton";
import type { AveriaSolicitada, EjecucionDto, EscenarioDto } from "../../types/Experimentacion";
import { ETIQUETA_TIPO_UNIDAD } from "../../utils/constants";
import { formatearKm, formatearSoles, formatearTiempoReal } from "../../utils/formatters";
import { exportarResultados } from "../../utils/reportes";
import { ETIQUETA_TIPO_AVERIA } from "../../utils/averias";
import { fechaSimulada, formatearDuracion } from "../comunes/RelojSimulacion";
import "./ReporteFinal.css";

export type MotivoReporte = "FIN_PERIODO" | "COLAPSO" | "CIERRE_DIA_A_DIA" | "CONSULTA";

export interface SolicitudReporte {
  motivo: MotivoReporte;
  /** Minuto de simulación en que terminó la operación. */
  minutoCorte: number;
}

interface ReporteFinalProps {
  solicitud: SolicitudReporte;
  escenario: EscenarioDto;
  ejecucion: EjecucionDto;
  ejecuciones: EjecucionDto[];
  averias: AveriaSolicitada[];
  segundosReales: number;
  colapso?: { fechaHora?: string | null; motivo: string } | null;
  onCerrar: () => void;
}

const TITULO: Record<MotivoReporte, string> = {
  FIN_PERIODO: "Fin de la simulación del periodo",
  COLAPSO: "Fin de la simulación hasta el colapso",
  CIERRE_DIA_A_DIA: "Cierre de las operaciones día a día",
  CONSULTA: "Reporte del plan en curso",
};

const porcentaje = (valor: number) => `${Math.round(valor * 100)} %`;

/**
 * Reporte de la última planificación estable (rúbrica G08-G10): se abre al
 * terminar la simulación del periodo, al llegar al colapso o al cerrar la
 * operación día a día. Resume el plan que se venía ejecutando hasta ese
 * minuto y lista sus rutas, con accesos para exportarlo o analizarlo.
 */
const ReporteFinal = ({
  solicitud,
  escenario,
  ejecucion,
  ejecuciones,
  averias,
  segundosReales,
  colapso,
  onCerrar,
}: ReporteFinalProps) => {
  const navegar = useNavigate();
  const corte = solicitud.minutoCorte;

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => evento.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  const resumen = useMemo(() => {
    const paradas = ejecucion.rutas.flatMap((ruta) => ruta.paradas);
    const entregadas = paradas.filter((parada) => parada.minutoLlegada <= corte);
    const aTiempo = entregadas.filter((parada) => parada.cumplePlazo).length;
    const enCamino = paradas.length - entregadas.length;
    const rutasIniciadas = ejecucion.rutas.filter((ruta) => ruta.minutoSalida <= corte);
    const paquetes = rutasIniciadas.reduce((total, ruta) => total + ruta.cargaTotal, 0);
    const capacidad = rutasIniciadas.reduce((total, ruta) => total + ruta.capacidad, 0);
    const averiasOcurridas = averias.filter((averia) => averia.minutoSimulacion <= corte);
    return {
      totalPlan: paradas.length,
      entregadas: entregadas.length,
      aTiempo,
      fueraDePlazo: entregadas.length - aTiempo,
      enCamino,
      sinAtender: ejecucion.pedidosSinAtender.length,
      cumplimiento: entregadas.length > 0 ? aTiempo / entregadas.length : 0,
      unidadesUsadas: new Set(rutasIniciadas.map((ruta) => ruta.codigoUnidad)).size,
      utilizacion: capacidad > 0 ? paquetes / capacidad : 0,
      averias: averiasOcurridas,
      rutas: [...ejecucion.rutas].sort((a, b) => a.minutoSalida - b.minutoSalida),
    };
  }, [ejecucion, averias, corte]);

  const fecha = (minuto: number) => fechaSimulada(escenario.anio, escenario.mes, minuto);

  return (
    <div className="reporte-final__fondo" role="presentation" onClick={onCerrar}>
      <div
        className="reporte-final"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reporte-final-titulo"
        onClick={(evento) => evento.stopPropagation()}
      >
        <header className="reporte-final__cabecera">
          <FileText size={20} aria-hidden />
          <div>
            <h2 id="reporte-final-titulo">Reporte de la última planificación estable</h2>
            <p className="texto-secundario">
              {TITULO[solicitud.motivo]} · {escenario.archivoVentas} · plan {ejecucion.algoritmo}
            </p>
          </div>
          <button type="button" className="reporte-final__cerrar" aria-label="Cerrar reporte" onClick={onCerrar}>
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="reporte-final__cuerpo">
          {colapso && (
            <div className="reporte-final__colapso" role="alert">
              <strong>Colapso logístico</strong> {colapso.fechaHora ? `el ${colapso.fechaHora}` : ""} · {colapso.motivo}
            </div>
          )}

          <dl className="reporte-final__periodo">
            <div>
              <dt>Inicio simulado</dt>
              <dd className="cifra">{fecha(escenario.minutoInicio)}</dd>
            </div>
            <div>
              <dt>Fin / corte</dt>
              <dd className="cifra">{fecha(corte)}</dd>
            </div>
            <div>
              <dt>Tiempo simulado</dt>
              <dd className="cifra">{formatearDuracion(corte - escenario.minutoInicio)}</dd>
            </div>
            <div>
              <dt>Tiempo real</dt>
              <dd className="cifra">{formatearTiempoReal(segundosReales)}</dd>
            </div>
          </dl>

          <div className="reporte-final__kpis">
            <Kpi rotulo="Entregados" valor={`${resumen.entregadas}/${resumen.totalPlan}`} detalle="pedidos del plan" />
            <Kpi rotulo="A tiempo" valor={porcentaje(resumen.cumplimiento)} detalle={`${resumen.aTiempo} a tiempo · ${resumen.fueraDePlazo} fuera de plazo`} />
            <Kpi rotulo="En camino" valor={String(resumen.enCamino)} detalle="pedidos aún en ruta al corte" />
            <Kpi rotulo="Sin atender" valor={String(resumen.sinAtender)} detalle="sin unidad asignable" alerta={resumen.sinAtender > 0} />
            <Kpi rotulo="Costo del plan" valor={formatearSoles(ejecucion.metricas.costoOperativoTotal)} detalle={formatearKm(ejecucion.metricas.distanciaTotalKm)} />
            <Kpi rotulo="Flota" valor={`${resumen.unidadesUsadas} UT`} detalle={`utilización ${porcentaje(resumen.utilizacion)}`} />
          </div>

          <section>
            <h3 className="rotulo">Averías ocurridas ({resumen.averias.length})</h3>
            {resumen.averias.length === 0 ? (
              <p className="texto-tenue reporte-final__nota">No se registraron averías en el periodo.</p>
            ) : (
              <ul className="reporte-final__averias">
                {resumen.averias.map((averia) => (
                  <li key={`${averia.codigoUnidad}-${averia.minutoSimulacion}`}>
                    <strong className="cifra">{averia.codigoUnidad}</strong> · {ETIQUETA_TIPO_AVERIA[averia.tipo]} ·{" "}
                    <span className="cifra">{fecha(averia.minutoSimulacion)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="rotulo">Rutas del plan ({resumen.rutas.length})</h3>
            <div className="reporte-final__tabla">
              <table>
                <thead>
                  <tr>
                    <th>Unidad</th>
                    <th>Tipo</th>
                    <th>Origen</th>
                    <th>Salida</th>
                    <th>Regreso</th>
                    <th>Paquetes</th>
                    <th>Entregas</th>
                    <th>Estado al corte</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.rutas.map((ruta, indice) => {
                    const hechas = ruta.paradas.filter((parada) => parada.minutoLlegada <= corte).length;
                    const estado =
                      ruta.minutoSalida > corte ? "Por salir" : ruta.minutoFin <= corte ? "Completada" : "En curso";
                    return (
                      <tr key={`${ruta.codigoUnidad}-${ruta.minutoSalida}-${indice}`}>
                        <td className="cifra">{ruta.codigoUnidad}</td>
                        <td>{ETIQUETA_TIPO_UNIDAD[ruta.tipoUnidad]}</td>
                        <td>{ruta.almacenOrigen}</td>
                        <td className="cifra">{fecha(ruta.minutoSalida)}</td>
                        <td className="cifra">{fecha(ruta.minutoFin)}</td>
                        <td className="cifra">
                          {ruta.cargaTotal}/{ruta.capacidad}
                        </td>
                        <td className="cifra">
                          {hechas}/{ruta.paradas.length}
                        </td>
                        <td>
                          <span className={`reporte-final__estado reporte-final__estado--${estado.replace(" ", "-").toLowerCase()}`}>
                            {estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <footer className="reporte-final__pie">
          <Boton variante="secundario" icono={<Printer size={15} aria-hidden />} onClick={() => window.print()}>
            Imprimir
          </Boton>
          <Boton
            variante="secundario"
            icono={<Download size={15} aria-hidden />}
            onClick={() => exportarResultados(escenario, ejecuciones)}
          >
            Exportar CSV
          </Boton>
          <Boton variante="secundario" icono={<BarChart3 size={15} aria-hidden />} onClick={() => navegar("/analytics")}>
            Ver en Analytics
          </Boton>
          <Boton variante="accion" onClick={onCerrar}>
            Cerrar
          </Boton>
        </footer>
      </div>
    </div>
  );
};

const Kpi = ({ rotulo, valor, detalle, alerta = false }: { rotulo: string; valor: string; detalle: string; alerta?: boolean }) => (
  <div className={`reporte-final__kpi ${alerta ? "reporte-final__kpi--alerta" : ""}`}>
    <span className="rotulo">{rotulo}</span>
    <strong className="cifra">{valor}</strong>
    <span className="texto-tenue">{detalle}</span>
  </div>
);

export default ReporteFinal;
