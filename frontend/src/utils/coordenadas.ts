import { ALTO_MAPA_KM, ANCHO_MAPA_KM } from "./constants";

export interface PosicionPantalla {
  left: number;
  top: number;
}

/**
 * Escala que traduce las coordenadas del dominio a pixeles del lienzo del
 * mapa. El origen (0,0) esta en la esquina inferior izquierda, asi que el
 * eje Y se invierte (STD 2.2, 2.6.3).
 */
export interface EscalaMapa {
  /** Pixeles por kilometro. */
  factor: number;
  margenIzquierdo: number;
  margenSuperior: number;
  anchoUtil: number;
  altoUtil: number;
  aX: (posX: number) => number;
  aY: (posY: number) => number;
}

/**
 * Construye la escala del mapa a partir del tamaño del contenedor,
 * reservando los margenes donde se rotulan los ejes. Mantiene la proporcion
 * de la retícula para que un kilometro mida lo mismo en los dos ejes.
 */
export function crearEscalaMapa(
  ancho: number,
  alto: number,
  margenIzquierdo = 34,
  margenInferior = 26,
  margenSuperior = 12,
  margenDerecho = 14,
): EscalaMapa {
  const disponibleX = Math.max(1, ancho - margenIzquierdo - margenDerecho);
  const disponibleY = Math.max(1, alto - margenSuperior - margenInferior);
  const factor = Math.max(0.1, Math.min(disponibleX / ANCHO_MAPA_KM, disponibleY / ALTO_MAPA_KM));

  const anchoUtil = factor * ANCHO_MAPA_KM;
  const altoUtil = factor * ALTO_MAPA_KM;

  return {
    factor,
    margenIzquierdo,
    margenSuperior,
    anchoUtil,
    altoUtil,
    aX: (posX: number) => margenIzquierdo + posX * factor,
    aY: (posY: number) => margenSuperior + (ALTO_MAPA_KM - posY) * factor,
  };
}

/**
 * Convierte una coordenada del dominio a una posicion de pantalla expresada
 * como porcentaje del contenedor. Se usa donde el mapa no necesita
 * medidas en pixeles, por ejemplo en las miniaturas.
 */
export function aCoordenadaPantalla(posX: number, posY: number): PosicionPantalla {
  return {
    left: (posX / ANCHO_MAPA_KM) * 100,
    top: ((ALTO_MAPA_KM - posY) / ALTO_MAPA_KM) * 100,
  };
}
