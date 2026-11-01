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

/** Plan resuelto por algún navegador que otros pueden abrir (rúbrica C05, C06, G06). */
export interface SimulacionCompartida {
  id: string;
  modo: "1D" | "5D" | "COLAPSO" | "DIA_A_DIA";
  autor: string;
  creada: string;
  archivoVentas: string;
  anio: number;
  mes: number;
  dia: number;
  minutoInicio: number;
  minutoFin: number;
  pedidos: number;
  algoritmos: string[];
  mejorCosto: number;
  colapso: boolean;
}

/** Carga del planificador: corridas en curso y en espera. */
export interface EstadoPlanificador {
  capacidad: number;
  enCurso: number;
  enEspera: number;
  atendidas: number;
  rechazadas: number;
}

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
  async ejecutar(parametros: ParametrosEjecucion, modo?: "DIA_A_DIA"): Promise<ExperimentacionResponse> {
    const respuesta = await axios.post<ExperimentacionResponse>(
      `${API_BASE_URL}/experimentacion/ejecutar`,
      parametros,
      modo ? { params: { modo } } : undefined,
    );
    return respuesta.data;
  },

  /** Planes recientes de cualquier navegador, del más nuevo al más antiguo. */
  async listarCompartidas(): Promise<SimulacionCompartida[]> {
    const respuesta = await axios.get<SimulacionCompartida[]>(`${API_BASE_URL}/simulaciones-compartidas`);
    return respuesta.data;
  },

  /** Plan completo de una simulación compartida, para reproducirlo en este navegador. */
  async obtenerCompartida(id: string): Promise<ExperimentacionResponse> {
    const respuesta = await axios.get<ExperimentacionResponse>(
      `${API_BASE_URL}/simulaciones-compartidas/${encodeURIComponent(id)}`,
    );
    return respuesta.data;
  },

  async estadoPlanificador(): Promise<EstadoPlanificador> {
    const respuesta = await axios.get<EstadoPlanificador>(`${API_BASE_URL}/simulaciones-compartidas/estado`);
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
