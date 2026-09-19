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
 * entre el mapa y los paneles (STD 2.2, 5.6).
 *
 * <p>Verde mientras queda holgura, ambar cuando se ha despachado alrededor
 * de un tercio de la capacidad y rojo alrededor de dos tercios. Los rangos
 * son configurables y nunca se escriben aqui.</p>
 */
export function useSemaforoAlmacen(
  stockActual: number,
  stockMaximo: number,
  umbrales: UmbralesSemaforo,
): { color: ColorSemaforo; colorCss: string; porcentajeDespachado: number; porcentajeDisponible: number } {
  const capacidad = stockMaximo > 0 ? stockMaximo : 1;
  const porcentajeDespachado = Math.min(1, Math.max(0, 1 - stockActual / capacidad));

  let color: ColorSemaforo = "VERDE";
  if (porcentajeDespachado >= umbrales.umbralRojoPorcentaje) {
    color = "ROJO";
  } else if (porcentajeDespachado >= umbrales.umbralAmbarPorcentaje) {
    color = "AMBAR";
  }

  return {
    color,
    colorCss: COLOR_SEMAFORO[color],
    porcentajeDespachado,
    porcentajeDisponible: 1 - porcentajeDespachado,
  };
}
