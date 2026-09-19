/**
 * Valores compartidos por los componentes del visualizador. Ningun
 * componente debe declarar estos valores de forma local (STD 5.3).
 */
export const API_BASE_URL = "/api";
export const WEBSOCKET_URL = "/ws-paqrap";

/** Retícula de la ciudad: 70 km en X y 50 km en Y (STD 2.2). */
export const ANCHO_MAPA_KM = 70;
export const ALTO_MAPA_KM = 50;

export const MINUTOS_POR_HORA = 60;
export const MINUTOS_POR_DIA = 1440;

export const COLOR_SEMAFORO = {
  VERDE: "var(--color-semaforo-verde)",
  AMBAR: "var(--color-semaforo-ambar)",
  ROJO: "var(--color-semaforo-rojo)",
} as const;

/** Color propio de cada tipo de unidad de transporte (STD 2.1). */
export const COLOR_TIPO_UNIDAD = {
  AUTO: "var(--color-tipo-auto)",
  MOTO: "var(--color-tipo-moto)",
  BICICLETA: "var(--color-tipo-bicicleta)",
} as const;

export const ETIQUETA_TIPO_UNIDAD = {
  AUTO: "Auto",
  MOTO: "Moto",
  BICICLETA: "Bicicleta",
} as const;

/** Estados con los que el visualizador describe un pedido (STD 2.1). */
export const COLOR_ESTADO_PEDIDO = {
  PENDIENTE: "var(--color-estado-pendiente)",
  ASIGNADO: "var(--color-estado-asignado)",
  EN_RUTA: "var(--color-estado-en-ruta)",
  ENTREGADO: "var(--color-estado-entregado)",
  REASIGNADO: "var(--color-estado-reasignado)",
  INCUMPLIDO: "var(--color-estado-incumplido)",
} as const;

export const FONDO_ESTADO_PEDIDO = {
  PENDIENTE: "var(--color-gris-suave)",
  ASIGNADO: "var(--color-azul-suave)",
  EN_RUTA: "var(--color-morado-suave)",
  ENTREGADO: "var(--color-verde-suave)",
  REASIGNADO: "var(--color-ambar-suave)",
  INCUMPLIDO: "var(--color-rojo-suave)",
} as const;

export const ETIQUETA_ESTADO_PEDIDO = {
  PENDIENTE: "Pendiente",
  ASIGNADO: "Asignado",
  EN_RUTA: "En ruta",
  ENTREGADO: "Entregado",
  REASIGNADO: "Reasignado",
  INCUMPLIDO: "Incumplido",
} as const;

export type EstadoPedidoVisual = keyof typeof COLOR_ESTADO_PEDIDO;

/** Nombre corto de cada algoritmo, tal como lo devuelve el backend. */
export const NOMBRE_ALGORITMO = {
  IACO: "I-ACO",
  AGAESTW: "AGA-ES-TW",
} as const;

/**
 * Velocidades de reproduccion de la simulacion, en minutos simulados por
 * segundo real. El escenario 5D exige recorrer 5 dias en 30 a 60 minutos,
 * lo que equivale a 120-240 minutos simulados por segundo.
 */
export const VELOCIDADES_REPRODUCCION = [
  { etiqueta: "1x", minutosPorSegundo: 1 },
  { etiqueta: "10x", minutosPorSegundo: 10 },
  { etiqueta: "30x", minutosPorSegundo: 30 },
  { etiqueta: "60x", minutosPorSegundo: 60 },
  { etiqueta: "120x", minutosPorSegundo: 120 },
  { etiqueta: "240x", minutosPorSegundo: 240 },
] as const;
