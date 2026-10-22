import axios from "axios";
import { API_BASE_URL } from "../utils/constants";
import type {
  ConjuntoDatos,
  ExperimentacionResponse,
  ParametrosCincoDias,
  ParametrosColapso,
  ParametrosEjecucion,
  ParametrosVigentes,
} from "../types/Experimentacion";

/**
 * Cliente HTTP de la experimentacion numerica. Ningun componente debe
 * invocar Axios directamente; toda llamada pasa por este servicio (STD 5.3).
 */
export const experimentacionService = {
  /** Conjuntos de datos del cliente disponibles en el backend. */
  async listarConjuntos(): Promise<ConjuntoDatos[]> {
    const respuesta = await axios.get<ConjuntoDatos[]>(`${API_BASE_URL}/experimentacion/datos`);
    return respuesta.data;
  },

  /** Parametros vigentes del planificador, la flota y los almacenes. */
  async obtenerParametros(): Promise<ParametrosVigentes> {
    const respuesta = await axios.get<ParametrosVigentes>(`${API_BASE_URL}/experimentacion/parametros`);
    return respuesta.data;
  },

  /** Resuelve un turno con el I-ACO, con el AGA-ES-TW o con ambos. */
  async ejecutar(parametros: ParametrosEjecucion): Promise<ExperimentacionResponse> {
    const respuesta = await axios.post<ExperimentacionResponse>(
      `${API_BASE_URL}/experimentacion/ejecutar`,
      parametros,
    );
    return respuesta.data;
  },

  /** Resuelve una simulacion continua de 5 dias con el I-ACO, con el AGA-ES-TW o con ambos. */
  async ejecutarCincoDias(parametros: ParametrosCincoDias): Promise<ExperimentacionResponse> {
    const respuesta = await axios.post<ExperimentacionResponse>(
      `${API_BASE_URL}/experimentacion/ejecutar-5d`,
      parametros,
    );
    return respuesta.data;
  },

  /** Resuelve una simulacion continua hasta el colapso con el I-ACO, con el AGA-ES-TW o con ambos. */
  /** Cambia en caliente los parámetros de la flota y de los almacenes (solo ADMIN). */
  async actualizarParametros(
    flota: ParametrosVigentes["flota"],
    almacen: ParametrosVigentes["almacen"],
  ): Promise<ParametrosVigentes> {
    const respuesta = await axios.put<ParametrosVigentes>(`${API_BASE_URL}/admin/parametros`, { flota, almacen });
    return respuesta.data;
  },

  /** Vuelve a los valores de application.yml (solo ADMIN). */
  async restablecerParametros(): Promise<ParametrosVigentes> {
    const respuesta = await axios.post<ParametrosVigentes>(`${API_BASE_URL}/admin/parametros/restablecer`);
    return respuesta.data;
  },

  async ejecutarColapso(parametros: ParametrosColapso): Promise<ExperimentacionResponse> {
    const respuesta = await axios.post<ExperimentacionResponse>(
      `${API_BASE_URL}/experimentacion/ejecutar-colapso`,
      parametros,
    );
    return respuesta.data;
  },
};
