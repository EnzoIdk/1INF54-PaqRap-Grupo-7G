import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { AlertaOperacion, GravedadAlerta } from "../../hooks/useAlertasOperacion";
import "./PanelAlertas.css";

interface PanelAlertasProps {
  alertas: AlertaOperacion[];
  onEnfocarUnidad: (codigoUnidad: string | null) => void;
}

const ICONO_POR_GRAVEDAD: Record<GravedadAlerta, typeof TriangleAlert> = {
  roja: TriangleAlert,
  ambar: TriangleAlert,
  informativa: Info,
};

/**
 * Alertas de la operacion: fondo suave del color semantico y una sola linea
 * que describe el hecho junto con su consecuencia. Al hacer clic sobre una
 * alerta, el mapa se centra en el elemento afectado (STD 2.6.5).
 */
const PanelAlertas = ({ alertas, onEnfocarUnidad }: PanelAlertasProps) => (
  <section className="tarjeta panel-alertas">
    <header className="tarjeta__encabezado">
      <div>
        <h2 className="tarjeta__titulo">Alertas de la operación</h2>
        <p className="tarjeta__contexto">{alertas.length} activas · ordenadas por gravedad</p>
      </div>
    </header>

    <div className="panel-alertas__lista desplazable">
      {alertas.length === 0 ? (
        <div className="estado-vacio">
          <CircleCheck size={26} aria-hidden />
          <span className="estado-vacio__titulo">Sin alertas</span>
          <span>La operación transcurre según lo planificado.</span>
        </div>
      ) : (
        alertas.map((alerta) => {
          const Icono = ICONO_POR_GRAVEDAD[alerta.gravedad];
          return (
            <article
              key={alerta.id}
              className={`panel-alertas__alerta panel-alertas__alerta--${alerta.gravedad}`}
              onClick={() => alerta.codigoUnidad && onEnfocarUnidad(alerta.codigoUnidad)}
            >
              <Icono size={16} aria-hidden className="panel-alertas__icono" />
              <div>
                <h3 className="panel-alertas__titulo">{alerta.titulo}</h3>
                <p className="panel-alertas__detalle">{alerta.detalle}</p>
              </div>
            </article>
          );
        })
      )}
    </div>
  </section>
);

export default PanelAlertas;
