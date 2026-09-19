import { useCallback, useEffect, useState } from "react";
import Boton from "../components/comunes/Boton";
import Tabla from "../components/comunes/Tabla";
import { pedidoService } from "../services/pedidoService";
import type { PedidoDto } from "../types/PedidoDto";

/** Vista de registro y consulta de pedidos pendientes. */
const GestionPedidosPage = () => {
  const [pedidosPendientes, setPedidosPendientes] = useState<PedidoDto[]>([]);

  const handleActualizarLista = useCallback(() => {
    pedidoService
      .obtenerPedidosPendientes()
      .then(setPedidosPendientes)
      .catch((error: unknown) => console.error("No se pudo obtener los pedidos pendientes", error));
  }, []);

  useEffect(() => {
    handleActualizarLista();
  }, [handleActualizarLista]);

  return (
    <div style={{ padding: 16 }}>
      <h1>Gestion de pedidos</h1>
      <Boton onClick={handleActualizarLista}>Actualizar lista</Boton>
      <Tabla
        obtenerLlave={(pedido) => pedido.id}
        filas={pedidosPendientes}
        columnas={[
          { encabezado: "Cliente", renderizar: (pedido) => pedido.clienteId },
          { encabezado: "Cantidad", renderizar: (pedido) => pedido.cantidadProducto },
          { encabezado: "Plazo (h)", renderizar: (pedido) => pedido.plazoHoras },
          { encabezado: "Estado", renderizar: (pedido) => pedido.estado },
        ]}
      />
    </div>
  );
};

export default GestionPedidosPage;
