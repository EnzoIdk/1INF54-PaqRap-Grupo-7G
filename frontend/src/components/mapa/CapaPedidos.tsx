import { memo } from "react";
import type { EstadoPedidoEnMapa } from "../../hooks/usePosicionesFlota";
import { COLOR_ESTADO_PEDIDO, ETIQUETA_ESTADO_PEDIDO } from "../../utils/constants";
import { formatearTiempoSimulado } from "../../utils/formatters";
import type { EscalaMapa } from "../../utils/coordenadas";

interface CapaPedidosProps {
  pedidos: EstadoPedidoEnMapa[];
  escala: EscalaMapa;
  unidadEnfocada: string | null;
}

/**
 * Destino de cada pedido: circulo de 7 px con borde blanco, en el color de
 * su estado (STD 2.6.3). El color nunca es el unico portador de
 * informacion: la etiqueta emergente describe el estado con palabras.
 */
const CapaPedidos = ({ pedidos, escala, unidadEnfocada }: CapaPedidosProps) => (
  <g>
    {pedidos.map((pedido) => {
      const atenuado =
        unidadEnfocada !== null && pedido.codigoUnidad !== null && pedido.codigoUnidad !== unidadEnfocada;

      return (
        <circle
          key={pedido.codigoPedido}
          cx={escala.aX(pedido.x)}
          cy={escala.aY(pedido.y)}
          r={3.5}
          fill={COLOR_ESTADO_PEDIDO[pedido.estado]}
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={atenuado ? 0.25 : 1}
        >
          <title>
            {`${pedido.codigoPedido} · ${pedido.clienteId} · (${pedido.x}, ${pedido.y})\n` +
              `${pedido.cantidadProducto} u · plazo ${pedido.plazoHoras} h · vence ${formatearTiempoSimulado(pedido.minutoLimite)}\n` +
              `${ETIQUETA_ESTADO_PEDIDO[pedido.estado]}${pedido.codigoUnidad ? ` · ${pedido.codigoUnidad}` : ""}`}
          </title>
        </circle>
      );
    })}
  </g>
);

export default memo(CapaPedidos);
