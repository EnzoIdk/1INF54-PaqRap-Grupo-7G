import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleAlert } from "lucide-react";
import type { EstadoPedidoEnMapa } from "../../hooks/usePosicionesFlota";
import "./NotificacionesEntregas.css";

interface Aviso {
  id: number;
  exito: boolean;
  titulo: string;
  detalle: string;
}

const DURACION_AVISO_MS = 5000;
const MAXIMO_AVISOS = 3;

interface NotificacionesEntregasProps {
  pedidos: EstadoPedidoEnMapa[];
  /** Cambia con cada ejecución: los avisos solo cuentan entregas de la corrida vigente. */
  claveEjecucion: string;
}

/**
 * Avisa al supervisor cada vez que la reproducción completa entregas
 * (RF-09). Si en un mismo instante se completan varias -a alta velocidad-,
 * se agrupan en un solo aviso para no inundar la pantalla.
 */
const NotificacionesEntregas = ({ pedidos, claveEjecucion }: NotificacionesEntregasProps) => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const entregadosPrevios = useRef<Set<string> | null>(null);
  const clavePrevia = useRef(claveEjecucion);
  const contador = useRef(0);

  useEffect(() => {
    const completados = pedidos.filter((pedido) => pedido.estado === "ENTREGADO" || pedido.estado === "INCUMPLIDO");
    const actuales = new Set(completados.map((pedido) => pedido.codigoPedido));
    // Al montar la pantalla o cambiar de ejecución solo se toma la foto inicial.
    if (entregadosPrevios.current === null || clavePrevia.current !== claveEjecucion) {
      entregadosPrevios.current = actuales;
      clavePrevia.current = claveEjecucion;
      return;
    }
    const previos = entregadosPrevios.current;
    const nuevos = completados.filter((pedido) => !previos.has(pedido.codigoPedido));
    entregadosPrevios.current = actuales;
    if (nuevos.length === 0) {
      return;
    }
    const aTiempo = nuevos.filter((pedido) => pedido.estado === "ENTREGADO");
    contador.current += 1;
    const aviso: Aviso =
      nuevos.length === 1
        ? {
            id: contador.current,
            exito: aTiempo.length === 1,
            titulo: aTiempo.length === 1 ? "Entrega completada a tiempo" : "Entrega fuera de plazo",
            detalle: `${nuevos[0].codigoPedido} · cliente ${nuevos[0].clienteId}${nuevos[0].codigoUnidad ? ` · ${nuevos[0].codigoUnidad}` : ""}`,
          }
        : {
            id: contador.current,
            exito: aTiempo.length === nuevos.length,
            titulo: `${nuevos.length} entregas completadas`,
            detalle: `${aTiempo.length} a tiempo${nuevos.length - aTiempo.length > 0 ? ` · ${nuevos.length - aTiempo.length} fuera de plazo` : ""}`,
          };
    setAvisos((actualesAvisos) => [...actualesAvisos.slice(-(MAXIMO_AVISOS - 1)), aviso]);
    window.setTimeout(
      () => setAvisos((actualesAvisos) => actualesAvisos.filter((candidato) => candidato.id !== aviso.id)),
      DURACION_AVISO_MS,
    );
  }, [pedidos, claveEjecucion]);

  if (avisos.length === 0) {
    return null;
  }
  return (
    <div className="notificaciones-entregas" role="status" aria-live="polite">
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className={`notificaciones-entregas__aviso ${aviso.exito ? "" : "notificaciones-entregas__aviso--alerta"}`}
        >
          {aviso.exito ? <CircleCheck size={16} aria-hidden /> : <CircleAlert size={16} aria-hidden />}
          <span>
            <strong>{aviso.titulo}</strong>
            <span className="notificaciones-entregas__detalle">{aviso.detalle}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

export default NotificacionesEntregas;
