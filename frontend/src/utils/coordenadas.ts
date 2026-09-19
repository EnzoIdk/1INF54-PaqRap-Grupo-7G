import { ALTO_MAPA_KM, ANCHO_MAPA_KM } from "./constants";

export interface PosicionPantalla {
  left: number;
  top: number;
}

/**
 * Convierte una coordenada del dominio (origen en la esquina inferior
 * izquierda) a una posicion de pantalla (origen en la esquina superior
 * izquierda), como porcentaje del contenedor del mapa. Concentra la unica
 * conversion admitida; no debe reimplementarse en los componentes (STD 5.6).
 */
export function aCoordenadaPantalla(posX: number, posY: number): PosicionPantalla {
  return {
    left: (posX / ANCHO_MAPA_KM) * 100,
    top: ((ALTO_MAPA_KM - posY) / ALTO_MAPA_KM) * 100,
  };
}
