import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, FileDown, Package, Search } from "lucide-react";
import type { PosicionUnidad } from "../../hooks/usePosicionesFlota";
import { useSimulacionStore } from "../../store/simulacionStore";
import type { EscenarioDto, RutaDto, TipoUnidad } from "../../types/Experimentacion";
import { COLOR_TIPO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from "../../utils/constants";
import { formatearHoraDelDia, formatearTiempoSimulado } from "../../utils/formatters";
import { descargarItinerario } from "../../utils/reportes";
import {
  COLOR_NIVEL,
  ETIQUETA_NIVEL,
  NIVELES_SEMAFORO,
  nivelUnidad,
  ocupacionUnidad,
  type UmbralesSemaforo,
} from "../../utils/semaforo";
import Boton from "../comunes/Boton";
import { Chip } from "../comunes/Campo";
import IconoUnidad from "../mapa/IconoUnidad";
import "./PanelFlota.css";

interface PanelFlotaProps {
  unidades: PosicionUnidad[];
  unidadesAveriadas: string[];
  unidadesEnMantenimiento: string[];
  unidadEnfocada: string | null;
  onEnfocar: (codigoUnidad: string | null) => void;
  /** Rutas de la ejecución visible: dan la hora de refrigerio, los envíos y el itinerario. */
  rutas?: RutaDto[];
  minutoActual?: number;
  escenario?: EscenarioDto | null;
  umbrales?: UmbralesSemaforo;
}

const TIPOS: TipoUnidad[] = ["AUTO", "MOTO", "BICICLETA"];
const UMBRALES_POR_DEFECTO: UmbralesSemaforo = { umbralAmbarPorcentaje: 0.33, umbralRojoPorcentaje: 0.66 };

type Orden = "CODIGO" | "OCUPACION_DESC" | "OCUPACION_ASC";

/**
 * Lista de toda la flota en el instante que se reproduce (STD 2.6.4):
 * ocupación con semáforo + vacío (E02, E03), filtros por tipo y por nivel
 * que también se aplican al mapa (D05, D06), orden por ocupación (E13),
 * búsqueda por código y, para la unidad seleccionada, los envíos y productos
 * que lleva (E04, E05) y su itinerario descargable (RF-58).
 */
const PanelFlota = ({
  unidades,
  unidadesAveriadas,
  unidadesEnMantenimiento,
  unidadEnfocada,
  onEnfocar,
  rutas = [],
  minutoActual,
  escenario = null,
  umbrales = UMBRALES_POR_DEFECTO,
}: PanelFlotaProps) => {
  // Compartidos con el mapa: ocultar un tipo o un nivel aquí también lo oculta allí (RF-59, D06).
  const tiposVisibles = useSimulacionStore((estado) => estado.tiposVisibles);
  const alternarTipo = useSimulacionStore((estado) => estado.alternarTipoVisible);
  const nivelesVisibles = useSimulacionStore((estado) => estado.nivelesVisibles);
  const alternarNivel = useSimulacionStore((estado) => estado.alternarNivelVisible);
  const [orden, setOrden] = useState<Orden>("CODIGO");
  const [busqueda, setBusqueda] = useState("");
  const filasRef = useRef(new Map<string, HTMLElement>());

  /** Unidades que, en el minuto actual, están en su hora de alimentación (RF-26). */
  const enRefrigerio = useMemo(() => {
    const mapa = new Map<string, number>();
    if (minutoActual === undefined) {
      return mapa;
    }
    rutas.forEach((ruta) => {
      const inicio = ruta.minutoInicioAlimentacion;
      const fin = ruta.minutoFinAlimentacion;
      if (inicio !== null && inicio !== undefined && fin !== null && fin !== undefined
        && minutoActual >= inicio && minutoActual < fin) {
        mapa.set(ruta.codigoUnidad, fin);
      }
    });
    return mapa;
  }, [rutas, minutoActual]);

  const nivelDe = (unidad: PosicionUnidad) => nivelUnidad(unidad.cargaRestante, unidad.capacidad, umbrales);

  const conteoPorTipo = useMemo(() => {
    const conteo: Record<string, number> = { AUTO: 0, MOTO: 0, BICICLETA: 0 };
    unidades.forEach((unidad) => {
      conteo[unidad.tipoUnidad] += 1;
    });
    return conteo;
  }, [unidades]);

  const conteoPorNivel = useMemo(() => {
    const conteo: Record<string, number> = { VACIO: 0, VERDE: 0, AMBAR: 0, ROJO: 0 };
    unidades.forEach((unidad) => {
      conteo[nivelUnidad(unidad.cargaRestante, unidad.capacidad, umbrales)] += 1;
    });
    return conteo;
  }, [unidades, umbrales]);

  const enRuta = unidades.filter((unidad) => !unidad.enAlmacen && !unidad.finalizada).length;
  const fueraDeServicio = unidades.filter((unidad) => unidadesAveriadas.includes(unidad.codigoUnidad)).length;

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toUpperCase();
    const filtradas = unidades.filter(
      (unidad) =>
        tiposVisibles.includes(unidad.tipoUnidad) &&
        nivelesVisibles.includes(nivelUnidad(unidad.cargaRestante, unidad.capacidad, umbrales)) &&
        (!texto || unidad.codigoUnidad.includes(texto)),
    );
    const ocupacion = (unidad: PosicionUnidad) => ocupacionUnidad(unidad.cargaRestante, unidad.capacidad);
    return [...filtradas].sort((a, b) => {
      if (orden === "OCUPACION_DESC") {
        return ocupacion(b) - ocupacion(a) || a.codigoUnidad.localeCompare(b.codigoUnidad);
      }
      if (orden === "OCUPACION_ASC") {
        return ocupacion(a) - ocupacion(b) || a.codigoUnidad.localeCompare(b.codigoUnidad);
      }
      return a.codigoUnidad.localeCompare(b.codigoUnidad);
    });
  }, [unidades, tiposVisibles, nivelesVisibles, busqueda, orden, umbrales]);

  // Al seleccionar una unidad en el mapa, la lista la muestra (rúbrica F01, vuelta).
  useEffect(() => {
    if (unidadEnfocada) {
      filasRef.current.get(unidadEnfocada)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [unidadEnfocada]);

  const rutaDeEnfocada = useMemo(
    () => (unidadEnfocada ? rutaVigente(rutas, unidadEnfocada, minutoActual ?? 0) : null),
    [rutas, unidadEnfocada, minutoActual],
  );

  return (
    <section className="tarjeta panel-flota">
      <header className="tarjeta__encabezado">
        <div>
          <h2 className="tarjeta__titulo">Flota</h2>
          <p className="tarjeta__contexto">
            {unidades.length} unidades · {enRuta} en ruta
            {fueraDeServicio > 0 ? ` · ${fueraDeServicio} averiada(s)` : ""}
          </p>
        </div>
      </header>

      <div className="panel-flota__filtros">
        {TIPOS.map((tipo) => (
          <Chip
            key={tipo}
            etiqueta={ETIQUETA_TIPO_UNIDAD[tipo]}
            color={COLOR_TIPO_UNIDAD[tipo]}
            activo={tiposVisibles.includes(tipo)}
            detalle={String(conteoPorTipo[tipo])}
            onClick={() => alternarTipo(tipo)}
          />
        ))}
      </div>
      <div className="panel-flota__filtros panel-flota__filtros--niveles" aria-label="Filtrar por semáforo de ocupación">
        {NIVELES_SEMAFORO.map((nivel) => (
          <Chip
            key={nivel}
            etiqueta={ETIQUETA_NIVEL[nivel]}
            color={COLOR_NIVEL[nivel]}
            activo={nivelesVisibles.includes(nivel)}
            detalle={String(conteoPorNivel[nivel])}
            onClick={() => alternarNivel(nivel)}
          />
        ))}
      </div>

      <div className="panel-flota__herramientas">
        <label className="panel-flota__busqueda">
          <Search size={13} aria-hidden />
          <input
            type="search"
            placeholder="Buscar TA01, TM05…"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            aria-label="Buscar unidad por código"
          />
        </label>
        <label className="panel-flota__orden">
          {orden === "OCUPACION_ASC" ? <ArrowUpWideNarrow size={13} aria-hidden /> : <ArrowDownWideNarrow size={13} aria-hidden />}
          <select value={orden} onChange={(evento) => setOrden(evento.target.value as Orden)} aria-label="Ordenar la flota">
            <option value="CODIGO">Código</option>
            <option value="OCUPACION_DESC">Ocupación ↓</option>
            <option value="OCUPACION_ASC">Ocupación ↑</option>
          </select>
        </label>
      </div>

      <div className="panel-flota__lista desplazable">
        {visibles.length === 0 ? (
          <div className="estado-vacio">
            <span className="estado-vacio__titulo">Ninguna unidad coincide</span>
            <span>Revise los chips de tipo y de semáforo, o la búsqueda.</span>
          </div>
        ) : (
          visibles.map((unidad) => {
            const averiada = unidadesAveriadas.includes(unidad.codigoUnidad);
            const enMantenimiento =
              !averiada &&
              unidadesEnMantenimiento.includes(unidad.codigoUnidad) &&
              unidad.enAlmacen &&
              !unidad.entregando &&
              unidad.entregasHechas === 0;
            const nivel = nivelDe(unidad);
            const ocupacion = ocupacionUnidad(unidad.cargaRestante, unidad.capacidad);
            const enfocada = unidadEnfocada === unidad.codigoUnidad;

            return (
              <article
                key={unidad.codigoUnidad}
                ref={(elemento) => {
                  if (elemento) {
                    filasRef.current.set(unidad.codigoUnidad, elemento);
                  } else {
                    filasRef.current.delete(unidad.codigoUnidad);
                  }
                }}
                className={`panel-flota__unidad ${enfocada ? "panel-flota__unidad--enfocada" : ""}`}
                onClick={() => onEnfocar(enfocada ? null : unidad.codigoUnidad)}
              >
                <span
                  className={`panel-flota__icono ${averiada ? "panel-flota__icono--averiada" : ""}`}
                  style={{ boxShadow: averiada ? undefined : `inset 0 0 0 2px ${COLOR_NIVEL[nivel]}` }}
                >
                  <IconoUnidad tipoUnidad={unidad.tipoUnidad} apagado={enMantenimiento} />
                </span>
                <span className="panel-flota__datos">
                  <span className="panel-flota__codigo cifra">{unidad.codigoUnidad}</span>
                  <span className="panel-flota__situacion">
                    {!averiada && enRefrigerio.has(unidad.codigoUnidad)
                      ? `En refrigerio hasta las ${formatearHoraDelDia(enRefrigerio.get(unidad.codigoUnidad) ?? 0)}`
                      : describir(unidad, averiada, enMantenimiento)}
                  </span>
                </span>
                <span className="panel-flota__carga">
                  <span className="cifra">
                    {unidad.cargaRestante}/{unidad.capacidad}
                  </span>
                  <span className="panel-flota__nivel" style={{ color: COLOR_NIVEL[nivel] }}>
                    {Math.round(ocupacion * 100)} % · {ETIQUETA_NIVEL[nivel]}
                  </span>
                </span>
                <span className="panel-flota__progreso" aria-hidden>
                  <span
                    className="panel-flota__progreso-barra"
                    style={{ width: `${ocupacion * 100}%`, backgroundColor: COLOR_NIVEL[nivel] }}
                  />
                </span>
                {enfocada && (
                  <DetalleUnidad
                    ruta={rutaDeEnfocada}
                    minutoActual={minutoActual ?? 0}
                    onDescargar={() => descargarItinerario(unidad.codigoUnidad, rutas, escenario)}
                  />
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

/** Envíos y productos que lleva la unidad en su ruta vigente (rúbrica E04, E05). */
const DetalleUnidad = ({
  ruta,
  minutoActual,
  onDescargar,
}: {
  ruta: RutaDto | null;
  minutoActual: number;
  onDescargar: () => void;
}) => {
  if (!ruta) {
    return (
      <div className="panel-flota__detalle" onClick={(evento) => evento.stopPropagation()}>
        <span className="texto-tenue">La unidad no tiene envíos asignados en esta ejecución.</span>
      </div>
    );
  }
  const pendientes = ruta.paradas.filter((parada) => parada.minutoSalida > minutoActual);
  const paquetesABordo = pendientes.reduce((total, parada) => total + parada.cantidadProducto, 0);
  return (
    <div className="panel-flota__detalle" onClick={(evento) => evento.stopPropagation()}>
      <div className="panel-flota__detalle-cabecera">
        <span>
          <Package size={13} aria-hidden /> {ruta.paradas.length} envíos · {ruta.cargaTotal} productos ·{" "}
          {paquetesABordo} a bordo
        </span>
        <Boton variante="fantasma" icono={<FileDown size={13} />} onClick={onDescargar}>
          Itinerario
        </Boton>
      </div>
      <span className="texto-tenue">
        Sale de {ruta.almacenOrigen} {formatearTiempoSimulado(ruta.minutoSalida)} · vuelve a{" "}
        {ruta.almacenDestino ?? ruta.almacenOrigen} {formatearTiempoSimulado(ruta.minutoFin)}
      </span>
      <ul className="panel-flota__envios">
        {ruta.paradas.map((parada) => {
          const entregado = parada.minutoSalida <= minutoActual;
          const descargando = !entregado && parada.minutoLlegada <= minutoActual;
          return (
            <li key={parada.codigoPedido} className={entregado ? "panel-flota__envio--entregado" : ""}>
              <span className="cifra">{parada.codigoPedido}</span>
              <span>{parada.clienteId}</span>
              <span className="cifra">{parada.cantidadProducto} u</span>
              <span className="cifra texto-tenue">
                {entregado
                  ? "entregado"
                  : descargando
                    ? `descargando · sale ${formatearHoraDelDia(parada.minutoSalida)}`
                    : `llega ${formatearHoraDelDia(parada.minutoLlegada)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** Ruta en curso de la unidad; si no tiene, la próxima; si ya no tiene más, la última. */
function rutaVigente(rutas: RutaDto[], codigoUnidad: string, minutoActual: number): RutaDto | null {
  const propias = rutas
    .filter((ruta) => ruta.codigoUnidad === codigoUnidad)
    .sort((a, b) => a.minutoSalida - b.minutoSalida);
  if (propias.length === 0) {
    return null;
  }
  return (
    propias.find((ruta) => minutoActual >= ruta.minutoSalida && minutoActual <= ruta.minutoFin) ??
    propias.find((ruta) => minutoActual < ruta.minutoSalida) ??
    propias[propias.length - 1]
  );
}

function describir(unidad: PosicionUnidad, averiada: boolean, enMantenimiento: boolean): string {
  if (averiada) {
    return "Averiada · carga reasignada";
  }
  if (unidad.retornando) {
    return unidad.almacenDestino ? `Retornando a ${unidad.almacenDestino}` : "Retornando al almacén";
  }
  if (unidad.entregando) {
    return `Entregando · ${unidad.entregasHechas}/${unidad.entregasTotales}`;
  }
  if (!unidad.enAlmacen && !unidad.finalizada) {
    return `En ruta · ${unidad.entregasHechas}/${unidad.entregasTotales}`;
  }
  if (enMantenimiento) {
    return "En mantenimiento preventivo";
  }
  if (unidad.sinAsignacion) {
    return "Disponible · sin asignación";
  }
  if (unidad.finalizada) {
    return `Ruta completada · ${unidad.entregasTotales} entregas`;
  }
  if (unidad.enAlmacen) {
    return "En el almacén";
  }
  return "Disponible";
}

export default PanelFlota;
