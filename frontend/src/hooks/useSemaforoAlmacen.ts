import { COLOR_NIVEL, type NivelSemaforo } from "../utils/semaforo";

export type ColorSemaforo = NivelSemaforo;

interface UmbralesSemaforo {
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

/**
 * Semáforo de un almacén intermedio según lo despachado de su stock diario:
 * verde con holgura, ámbar desde el umbral ámbar, rojo desde el umbral rojo
 * y vacío cuando ya no le queda stock (rúbrica C21, E19). Los umbrales son
 * configurables (STD 2.2, RF-39).
 */
export function useSemaforoAlmacen(
  stockActual: number,
  stockMaximo: number,
  umbrales: UmbralesSemaforo,
): { color: ColorSemaforo; colorCss: string; porcentajeDespachado: number; porcentajeDisponible: number } {
  return calcularSemaforoAlmacen(stockActual, stockMaximo, umbrales);
}

/** Misma regla que el hook, utilizable dentro de bucles. */
export function calcularSemaforoAlmacen(
  stockActual: number,
  stockMaximo: number,
  umbrales: UmbralesSemaforo,
): { color: ColorSemaforo; colorCss: string; porcentajeDespachado: number; porcentajeDisponible: number } {
  const capacidad = stockMaximo > 0 ? stockMaximo : 1;
  const porcentajeDespachado = Math.min(1, Math.max(0, 1 - stockActual / capacidad));
  let color: ColorSemaforo = "VERDE";
  if (stockActual <= 0) {
    color = "VACIO";
  } else if (porcentajeDespachado >= umbrales.umbralRojoPorcentaje) {
    color = "ROJO";
  } else if (porcentajeDespachado >= umbrales.umbralAmbarPorcentaje) {
    color = "AMBAR";
  }
  return {
    color,
    colorCss: COLOR_NIVEL[color],
    porcentajeDespachado,
    porcentajeDisponible: 1 - porcentajeDespachado,
  };
}
