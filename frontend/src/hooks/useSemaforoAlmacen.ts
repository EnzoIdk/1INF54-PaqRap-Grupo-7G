import { COLOR_SEMAFORO } from "../utils/constants";

export type ColorSemaforo = keyof typeof COLOR_SEMAFORO;

interface UmbralesSemaforo {
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

/**
 * Calcula el color de semaforo de un almacen intermedio a partir de su
 * stock actual, el stock maximo y los umbrales obtenidos del backend. Es el
 * unico punto de calculo del color, para evitar interpretaciones distintas
 * entre el mapa y los paneles (STD 5.6).
 */
export function useSemaforoAlmacen(
  stockActual: number,
  stockMaximo: number,
  umbrales: UmbralesSemaforo,
): { color: ColorSemaforo; colorCss: string; porcentajeDespachado: number } {
  const porcentajeDespachado = 1 - stockActual / stockMaximo;

  let color: ColorSemaforo = "VERDE";
  if (porcentajeDespachado >= umbrales.umbralRojoPorcentaje) {
    color = "ROJO";
  } else if (porcentajeDespachado >= umbrales.umbralAmbarPorcentaje) {
    color = "AMBAR";
  }

  return { color, colorCss: COLOR_SEMAFORO[color], porcentajeDespachado };
}
