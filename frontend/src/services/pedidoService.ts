import axios from "axios";
import { API_BASE_URL } from "../utils/constants";
import type { PedidoDto, RegistrarPedidoRequest } from "../types/PedidoDto";

/**
 * Cliente HTTP del recurso de pedidos. Ningun componente debe invocar
 * Axios directamente; toda llamada pasa por este servicio (STD 5.3).
 */
export const pedidoService = {
  async registrarPedido(request: RegistrarPedidoRequest): Promise<PedidoDto> {
    const respuesta = await axios.post<PedidoDto>(`${API_BASE_URL}/pedidos`, request);
    return respuesta.data;
  },

  async obtenerPedidosPendientes(): Promise<PedidoDto[]> {
    const respuesta = await axios.get<PedidoDto[]>(`${API_BASE_URL}/pedidos/pendientes`);
    return respuesta.data;
  },
};
