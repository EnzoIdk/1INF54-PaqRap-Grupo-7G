/**
 * Valores compartidos por los componentes del visualizador. Ningun
 * componente debe declarar estos valores de forma local (STD 5.3).
 */
export const API_BASE_URL = "/api";
export const WEBSOCKET_URL = "/ws-paqrap";

export const ANCHO_MAPA_KM = 70;
export const ALTO_MAPA_KM = 50;

export const COLOR_SEMAFORO = {
  VERDE: "var(--color-semaforo-verde)",
  AMBAR: "var(--color-semaforo-ambar)",
  ROJO: "var(--color-semaforo-rojo)",
} as const;
