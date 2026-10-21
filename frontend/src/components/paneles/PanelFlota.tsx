import { useMemo, useState } from "react";
import type { PosicionUnidad } from "../../hooks/usePosicionesFlota";
import type { TipoUnidad } from "../../types/Experimentacion";
import { COLOR_TIPO_UNIDAD, ETIQUETA_TIPO_UNIDAD } from "../../utils/constants";
import { Chip } from "../comunes/Campo";
import IconoUnidad from "../mapa/IconoUnidad";
import "./PanelFlota.css";

interface PanelFlotaProps {
  unidades: PosicionUnidad[];
  unidadesAveriadas: string[];
  unidadesEnMantenimiento: string[];
  unidadEnfocada: string | null;
  onEnfocar: (codigoUnidad: string | null) => void;
}

const TIPOS: TipoUnidad[] = ["AUTO", "MOTO", "BICICLETA"];

/**
 * Estado de la flota en el instante que se reproduce. Los chips por tipo de
 * unidad permiten filtrar la lista sin leer cada etiqueta (STD 2.5.3,
 * 2.6.4).
 */
const PanelFlota = ({
  unidades,
  unidadesAveriadas,
  unidadesEnMantenimiento,
  unidadEnfocada,
  onEnfocar,
}: PanelFlotaProps) => {
  const [tiposVisibles, setTiposVisibles] = useState<TipoUnidad[]>(TIPOS);

  const conteoPorTipo = useMemo(() => {
    const conteo: Record<string, number> = { AUTO: 0, MOTO: 0, BICICLETA: 0 };
    unidades.forEach((unidad) => {
      conteo[unidad.tipoUnidad] += 1;
    });
    return conteo;
  }, [unidades]);

  const inmovilizadas = unidades.filter(
    (unidad) =>
      unidadesAveriadas.includes(unidad.codigoUnidad) ||
      (unidadesEnMantenimiento.includes(unidad.codigoUnidad) &&
        unidad.enAlmacen &&
        !unidad.entregando &&
        unidad.entregasHechas === 0),
  ).length;

  const visibles = unidades.filter((unidad) => tiposVisibles.includes(unidad.tipoUnidad));

  const alternarTipo = (tipo: TipoUnidad) =>
    setTiposVisibles((actuales) =>
      actuales.includes(tipo) ? actuales.filter((candidato) => candidato !== tipo) : [...actuales, tipo],
    );

  return (
    <section className="tarjeta panel-flota">
      <header className="tarjeta__encabezado">
        <div>
          <h2 className="tarjeta__titulo">Flota</h2>
          <p className="tarjeta__contexto">
            {unidades.length - inmovilizadas} en ruta
            {inmovilizadas > 0 ? ` · ${inmovilizadas} fuera de servicio` : ""}
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

      <div className="panel-flota__lista desplazable">
        {visibles.length === 0 ? (
          <div className="estado-vacio">
            <span className="estado-vacio__titulo">Ningún tipo de unidad seleccionado</span>
            <span>Active al menos un chip para ver la flota.</span>
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

            return (
              <article
                key={unidad.codigoUnidad}
                className={`panel-flota__unidad ${
                  unidadEnfocada === unidad.codigoUnidad ? "panel-flota__unidad--enfocada" : ""
                }`}
                onClick={() => onEnfocar(unidadEnfocada === unidad.codigoUnidad ? null : unidad.codigoUnidad)}
              >
                <span className={`panel-flota__icono ${averiada ? "panel-flota__icono--averiada" : ""}`}>
                  <IconoUnidad tipoUnidad={unidad.tipoUnidad} apagado={enMantenimiento} />
                </span>
                <span className="panel-flota__datos">
                  <span className="panel-flota__codigo cifra">{unidad.codigoUnidad}</span>
                  <span className="panel-flota__situacion">{describir(unidad, averiada, enMantenimiento)}</span>
                </span>
                <span className="panel-flota__carga">
                  <span className="cifra">
                    {unidad.cargaRestante}/{unidad.cargaTotal}
                  </span>
                  <span className="texto-tenue">paquetes</span>
                </span>
                <span className="panel-flota__progreso" aria-hidden>
                  <span
                    className="panel-flota__progreso-barra"
                    style={{
                      width: `${(unidad.entregasHechas / Math.max(1, unidad.entregasTotales)) * 100}%`,
                      backgroundColor: COLOR_TIPO_UNIDAD[unidad.tipoUnidad],
                    }}
                  />
                </span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

function describir(unidad: PosicionUnidad, averiada: boolean, enMantenimiento: boolean): string {
  if (averiada) {
    return "Averiada · carga reasignada";
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
  if (unidad.finalizada) {
    return `Ruta completada · ${unidad.entregasTotales} entregas`;
  }
  if (unidad.enAlmacen) {
    return "En el almacén";
  }
  return "Disponible";
}

export default PanelFlota;
