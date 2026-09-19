import { useMemo } from "react";
import { PackageSearch } from "lucide-react";
import { BadgeEstadoPedido } from "../comunes/Badge";
import type { EstadoPedidoEnMapa } from "../../hooks/usePosicionesFlota";
import { formatearRestante } from "../../utils/formatters";
import "./PanelSeguimientoPedidos.css";

interface PanelSeguimientoPedidosProps {
  pedidos: EstadoPedidoEnMapa[];
  minutoActual: number;
  onEnfocarUnidad: (codigoUnidad: string | null) => void;
  /** Maximo de tarjetas visibles; el resto se resume en el pie. */
  maximo?: number;
}

const COLOR_POR_URGENCIA = {
  vencido: "var(--color-semaforo-rojo)",
  critica: "var(--color-semaforo-rojo)",
  proxima: "var(--color-semaforo-ambar)",
  holgada: "var(--color-semaforo-verde)",
} as const;

/**
 * Seguimiento de pedidos: cada tarjeta lleva un borde izquierdo de 4 px con
 * el color de la urgencia y el distintivo de estado a la derecha. Se ordenan
 * por urgencia -tiempo restante ascendente- y no por fecha de registro,
 * porque lo que el supervisor necesita ver primero es lo que esta por
 * vencer (STD 2.6.5).
 */
const PanelSeguimientoPedidos = ({
  pedidos,
  minutoActual,
  onEnfocarUnidad,
  maximo = 40,
}: PanelSeguimientoPedidosProps) => {
  const ordenados = useMemo(() => {
    const activos = pedidos.filter((pedido) => pedido.estado !== "ENTREGADO");
    return [...activos].sort((a, b) => a.minutoLimite - b.minutoLimite);
  }, [pedidos]);

  const visibles = ordenados.slice(0, maximo);

  return (
    <section className="tarjeta panel-pedidos">
      <header className="tarjeta__encabezado">
        <div>
          <h2 className="tarjeta__titulo">Seguimiento de pedidos</h2>
          <p className="tarjeta__contexto">
            {ordenados.length} activos · ordenados por urgencia
          </p>
        </div>
      </header>

      <div className="panel-pedidos__lista desplazable">
        {visibles.length === 0 ? (
          <div className="estado-vacio">
            <PackageSearch size={26} aria-hidden />
            <span className="estado-vacio__titulo">No quedan pedidos activos</span>
            <span>Todas las entregas del turno se completaron.</span>
          </div>
        ) : (
          visibles.map((pedido) => {
            const restante = formatearRestante(pedido.minutoLimite - minutoActual);
            const entregado = pedido.estado === "ENTREGADO";

            return (
              <article
                key={pedido.codigoPedido}
                className="panel-pedidos__tarjeta"
                style={{ borderLeftColor: COLOR_POR_URGENCIA[restante.urgencia] }}
                onClick={() => onEnfocarUnidad(pedido.codigoUnidad)}
              >
                <div className="panel-pedidos__fila">
                  <span className="panel-pedidos__codigo cifra">{pedido.codigoPedido}</span>
                  <span className="cifra texto-secundario">{pedido.clienteId}</span>
                  <span className="cifra texto-secundario">{pedido.codigoUnidad ?? "—"}</span>
                </div>
                <div className="panel-pedidos__fila">
                  <span className="texto-tenue">{entregado ? "Entregado" : "Restante"}</span>
                  <span className={`cifra plazo--${restante.urgencia}`}>{restante.texto}</span>
                  <BadgeEstadoPedido estado={pedido.estado} />
                </div>
              </article>
            );
          })
        )}
      </div>

      {ordenados.length > visibles.length && (
        <footer className="panel-pedidos__pie">
          y {ordenados.length - visibles.length} pedido(s) más
        </footer>
      )}
    </section>
  );
};

export default PanelSeguimientoPedidos;
