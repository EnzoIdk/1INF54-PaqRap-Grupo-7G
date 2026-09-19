import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

export type TipoEscenario = "DIA_A_DIA" | "SIMULACION_5D" | "COLAPSO";

/**
 * Cliente HTTP del recurso de simulacion. Ningun componente debe invocar
 * Axios directamente; toda llamada pasa por este servicio (STD 5.3).
 */
export const simulacionService = {
  async iniciarEscenario(tipoEscenario: TipoEscenario): Promise<void> {
    await axios.post(`${API_BASE_URL}/simulacion/${tipoEscenario}/iniciar`);
  },
};
