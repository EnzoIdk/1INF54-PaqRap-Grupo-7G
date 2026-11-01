/**
 * Semáforo + vacío (rúbrica B06, C21, C27, D06, E03, E19, G02, G04): cuatro
 * niveles que se usan igual en el mapa, en los paneles y en los filtros.
 *
 * - Unidades de transporte: según su ocupación (paquetes a bordo / capacidad).
 *   Vacío = sin paquetes; verde = mucho espacio; ámbar = carga importante;
 *   rojo = poco espacio o llena.
 * - Almacenes intermedios: según lo despachado del stock del día (el criterio
 *   del visualizador desde el inicio). Vacío = sin stock que despachar.
 *
 * Los umbrales son los mismos parámetros configurables del semáforo
 * (umbral ámbar / umbral rojo, en Configuración).
 */
export type NivelSemaforo = "VACIO" | "VERDE" | "AMBAR" | "ROJO";

export const NIVELES_SEMAFORO: NivelSemaforo[] = ["VACIO", "VERDE", "AMBAR", "ROJO"];

export const COLOR_NIVEL: Record<NivelSemaforo, string> = {
  VACIO: "var(--color-semaforo-vacio)",
  VERDE: "var(--color-semaforo-verde)",
  AMBAR: "var(--color-semaforo-ambar)",
  ROJO: "var(--color-semaforo-rojo)",
};

export const ETIQUETA_NIVEL: Record<NivelSemaforo, string> = {
  VACIO: "Vacío",
  VERDE: "Verde",
  AMBAR: "Ámbar",
  ROJO: "Rojo",
};

export interface UmbralesSemaforo {
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

/** Nivel de una fracción de 0 a 1; vacío cuando la cantidad es cero. */
export function nivelPorFraccion(cantidad: number, fraccion: number, umbrales: UmbralesSemaforo): NivelSemaforo {
  if (cantidad <= 0) {
    return "VACIO";
  }
  if (fraccion >= umbrales.umbralRojoPorcentaje) {
    return "ROJO";
  }
  return fraccion >= umbrales.umbralAmbarPorcentaje ? "AMBAR" : "VERDE";
}

/** Ocupación de una unidad: paquetes a bordo sobre su capacidad. */
export function ocupacionUnidad(cargaABordo: number, capacidad: number): number {
  return capacidad > 0 ? Math.min(1, Math.max(0, cargaABordo / capacidad)) : 0;
}

export function nivelUnidad(cargaABordo: number, capacidad: number, umbrales: UmbralesSemaforo): NivelSemaforo {
  return nivelPorFraccion(cargaABordo, ocupacionUnidad(cargaABordo, capacidad), umbrales);
}
