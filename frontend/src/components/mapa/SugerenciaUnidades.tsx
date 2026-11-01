import type { PosicionUnidad } from "../../hooks/usePosicionesFlota";
import { COLOR_TIPO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from "../../utils/constants";
import { formatearTiempoSimulado } from "../../utils/formatters";
import { COLOR_TIPO_AVERIA, ETIQUETA_TIPO_AVERIA, type AveriaVigente } from "../../utils/averias";
import { COLOR_NIVEL, ETIQUETA_NIVEL, type UmbralesSemaforo } from "../../utils/semaforo";
import { describirSituacion, estadoUnidad, SENTIDO } from "./estadoUnidad";

interface SugerenciaUnidadesProps {
  unidades: PosicionUnidad[];
  averias: AveriaVigente[];
  unidadesEnMantenimiento: string[];
  umbrales: UmbralesSemaforo;
  /** Punto del mapa (px) donde están las unidades y tamaño del mapa, para no salirse. */
  x: number;
  y: number;
  anchoMapa: number;
  altoMapa: number;
  onEnfocar: (codigoUnidad: string) => void;
  onEntrar: () => void;
  onSalir: () => void;
}

const ANCHO = 290;
/** Desde cuántas unidades la ficha pasa a filas de una línea con un resumen arriba. */
const GRUPO_GRANDE = 6;

/**
 * Ficha flotante de las unidades bajo el cursor. Si varias coinciden en el
 * mismo punto (un almacén, un cruce), las lista todas con su ocupación,
 * semáforo y situación; cada fila selecciona esa unidad.
 */
const SugerenciaUnidades = ({
  unidades,
  averias,
  unidadesEnMantenimiento,
  umbrales,
  x,
  y,
  anchoMapa,
  altoMapa,
  onEnfocar,
  onEntrar,
  onSalir,
}: SugerenciaUnidadesProps) => {
  if (unidades.length === 0) {
    return null;
  }
  // A la derecha del punto si cabe; si no, a su izquierda. Nunca fuera del mapa.
  const izquierda = x + 18 + ANCHO <= anchoMapa - 8 ? x + 18 : x - 18 - ANCHO;
  const haciaArriba = y > altoMapa * 0.55;
  const estilo = {
    left: Math.min(Math.max(8, izquierda), Math.max(8, anchoMapa - ANCHO - 8)),
    top: haciaArriba ? undefined : Math.min(Math.max(8, y - 16), altoMapa - 60),
    bottom: haciaArriba ? Math.min(Math.max(8, altoMapa - y - 16), altoMapa - 60) : undefined,
    width: ANCHO,
  };
  const estados = unidades.map((unidad) => ({
    unidad,
    ...estadoUnidad(unidad, averias, unidadesEnMantenimiento, umbrales),
  }));
  const compacta = unidades.length > GRUPO_GRANDE;
  const resumen = new Map<string, number>();
  estados.forEach(({ unidad, averia, enMantenimiento }) => {
    const clave = averia ? "Con avería" : describirSituacion(unidad, enMantenimiento);
    resumen.set(clave, (resumen.get(clave) ?? 0) + 1);
  });

  return (
    <div className="mapa__sugerencia" style={estilo} onPointerEnter={onEntrar} onPointerLeave={onSalir} role="tooltip">
      {unidades.length > 1 && (
        <p className="mapa__sugerencia-titulo">{unidades.length} unidades en este punto</p>
      )}
      {compacta && (
        <ul className="mapa__sugerencia-resumen">
          {[...resumen.entries()].map(([situacion, cantidad]) => (
            <li key={situacion}>
              <strong className="cifra">{cantidad}</strong> {situacion.toLowerCase()}
            </li>
          ))}
        </ul>
      )}
      <ul className={compacta ? "mapa__sugerencia-lista--compacta" : undefined}>
        {estados.map(({ unidad, averia, enMantenimiento, nivel, ocupacion }) => {
          if (compacta) {
            return (
              <li key={unidad.codigoUnidad}>
                <button type="button" onClick={() => onEnfocar(unidad.codigoUnidad)} title={describirSituacion(unidad, enMantenimiento)}>
                  <span className="mapa__sugerencia-cabecera">
                    <span className="mapa__sugerencia-punto" style={{ backgroundColor: COLOR_TIPO_UNIDAD[unidad.tipoUnidad] }} />
                    <strong className="cifra">{unidad.codigoUnidad}</strong>
                    <span className="texto-tenue cifra">
                      {unidad.cargaRestante}/{unidad.capacidad}
                    </span>
                    {averia && (
                      <span style={{ color: COLOR_TIPO_AVERIA[averia.tipo] }}>avería {averia.tipo.replace("TIPO_", "T")}</span>
                    )}
                    <span className="mapa__sugerencia-nivel" style={{ color: COLOR_NIVEL[nivel] }}>
                      {Math.round(ocupacion * 100)} % · {ETIQUETA_NIVEL[nivel]}
                    </span>
                  </span>
                </button>
              </li>
            );
          }
          return (
            <li key={unidad.codigoUnidad}>
              <button type="button" onClick={() => onEnfocar(unidad.codigoUnidad)} title="Seleccionar y ver en el panel">
                <span className="mapa__sugerencia-cabecera">
                  <span className="mapa__sugerencia-punto" style={{ backgroundColor: COLOR_TIPO_UNIDAD[unidad.tipoUnidad] }} />
                  <strong className="cifra">{unidad.codigoUnidad}</strong>
                  <span className="texto-tenue">
                    {ETIQUETA_TIPO_UNIDAD[unidad.tipoUnidad]}
                    {!unidad.enAlmacen && !unidad.finalizada ? ` ${SENTIDO[unidad.rumbo]}` : ""}
                  </span>
                  <span className="mapa__sugerencia-nivel" style={{ color: COLOR_NIVEL[nivel] }}>
                    {Math.round(ocupacion * 100)} % · {ETIQUETA_NIVEL[nivel]}
                  </span>
                </span>
                <span className="mapa__sugerencia-detalle">
                  {unidad.cargaRestante}/{unidad.capacidad} paq. · entregas {unidad.entregasHechas}/{unidad.entregasTotales} ·{" "}
                  {averia ? (
                    <span style={{ color: COLOR_TIPO_AVERIA[averia.tipo] }}>
                      Avería {ETIQUETA_TIPO_AVERIA[averia.tipo].toLowerCase()} hasta {formatearTiempoSimulado(averia.minutoFin)}
                    </span>
                  ) : (
                    describirSituacion(unidad, enMantenimiento)
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SugerenciaUnidades;
