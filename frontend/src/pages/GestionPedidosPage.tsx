import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Encabezado from "../components/layout/Encabezado";
import Tabla, { type ColumnaTabla } from "../components/comunes/Tabla";
import { BadgeEstadoPedido } from "../components/comunes/Badge";
import Boton from "../components/comunes/Boton";
import { usePosicionesFlota, type EstadoPedidoEnMapa } from "../hooks/usePosicionesFlota";
import { useEjecucionVisible } from "../hooks/useExperimentacion";
import { useSimulacionStore } from "../store/simulacionStore";
import { formatearRestante, formatearTiempoSimulado } from "../utils/formatters";
import "./GestionPedidosPage.css";

/**
 * Listado de los pedidos del turno planificado, con su unidad asignada, la
 * cuenta regresiva de su plazo y su estado en el instante que se reproduce
 * (STD 2.5.4).
 */
const GestionPedidosPage = () => {
  const navegar = useNavigate();
  const [busqueda, setBusqueda] = useState("");

  const escenario = useSimulacionStore((estado) => estado.escenario);
  const minutoActual = useSimulacionStore((estado) => estado.minutoActual);
  const enfocarUnidad = useSimulacionStore((estado) => estado.enfocarUnidad);
  const ejecucion = useEjecucionVisible();

  const { pedidos } = usePosicionesFlota(ejecucion, minutoActual);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const ordenados = [...pedidos].sort((a, b) => a.minutoLimite - b.minutoLimite);
    if (!texto) {
      return ordenados;
    }
    return ordenados.filter((pedido) =>
      [pedido.codigoPedido, pedido.clienteId, pedido.codigoUnidad ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(texto),
    );
  }, [pedidos, busqueda]);

  const columnas: ColumnaTabla<EstadoPedidoEnMapa>[] = [
    {
      encabezado: "Pedido",
      cifra: true,
      renderizar: (pedido) => <strong>{pedido.codigoPedido}</strong>,
    },
    { encabezado: "Cliente", cifra: true, renderizar: (pedido) => pedido.clienteId },
    {
      encabezado: "Destino",
      cifra: true,
      renderizar: (pedido) => `(${pedido.x}, ${pedido.y})`,
    },
    {
      encabezado: "Cant.",
      cifra: true,
      renderizar: (pedido) => String(pedido.cantidadProducto).padStart(2, "0"),
    },
    {
      encabezado: "Plazo",
      cifra: true,
      renderizar: (pedido) => `${String(pedido.plazoHoras).padStart(2, "0")} h`,
    },
    { encabezado: "Unidad", cifra: true, renderizar: (pedido) => pedido.codigoUnidad ?? "—" },
    {
      encabezado: "Entrega",
      cifra: true,
      renderizar: (pedido) =>
        pedido.minutoLlegada === null ? "—" : formatearTiempoSimulado(pedido.minutoLlegada),
    },
    {
      encabezado: "Restante",
      cifra: true,
      renderizar: (pedido) => {
        if (pedido.estado === "ENTREGADO") {
          return <span className="plazo--cumplido">A tiempo</span>;
        }
        const restante = formatearRestante(pedido.minutoLimite - minutoActual);
        return <span className={`plazo--${restante.urgencia}`}>{restante.texto}</span>;
      },
    },
    {
      encabezado: "Estado",
      renderizar: (pedido) => <BadgeEstadoPedido estado={pedido.estado} />,
    },
  ];

  return (
    <div className="pedidos">
      <Encabezado
        titulo="Gestión de Pedidos"
        contexto={
          escenario
            ? `${escenario.archivoVentas} · ${escenario.pedidosDelTurno} pedidos del turno de ${escenario.pedidosDelMes} del mes · reloj en ${formatearTiempoSimulado(minutoActual)}`
            : "Sin plan cargado · ejecute la experimentación numérica"
        }
        busqueda={{ valor: busqueda, onCambiar: setBusqueda, marcador: "P-0001, c4910 o TA01" }}
        acciones={
          <Boton variante="secundario" onClick={() => navegar("/simulacion")}>
            Consola de Simulación
          </Boton>
        }
      />

      <div className="pedidos__cuerpo">
        <section className="tarjeta pedidos__tabla">
          <Tabla
            columnas={columnas}
            filas={filtrados}
            obtenerLlave={(pedido) => pedido.codigoPedido}
            nombrePlural="pedidos"
            onSeleccionar={(pedido) => {
              enfocarUnidad(pedido.codigoUnidad);
              navegar("/");
            }}
            mensajeVacio={
              escenario
                ? "Ningún pedido coincide con la búsqueda"
                : "Todavía no hay pedidos: ejecute la experimentación numérica"
            }
            accionVacio={
              escenario ? undefined : { etiqueta: "Ir a la Consola", onClick: () => navegar("/simulacion") }
            }
          />
        </section>
      </div>
    </div>
  );
};

export default GestionPedidosPage;
