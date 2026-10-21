import { useMemo } from "react";
import type { AveriaSolicitada, EjecucionDto, EscenarioDto } from "../types/Experimentacion";
import type { EstadoPedidoEnMapa } from "./usePosicionesFlota";
import { MINUTOS_POR_HORA } from "../utils/constants";
import {
  formatearMilisegundos,
  formatearMotivoColapso,
  formatearSoles,
  formatearTiempoSimulado,
} from "../utils/formatters";

export type GravedadAlerta = "roja" | "ambar" | "informativa";

export interface AlertaOperacion {
  id: string;
  gravedad: GravedadAlerta;
  titulo: string;
  /** El hecho y su consecuencia, en una sola linea (STD 2.6.5). */
  detalle: string;
  /** Unidad sobre la que el mapa se centra al hacer clic en la alerta. */
  codigoUnidad?: string;
}

const ORDEN_GRAVEDAD: Record<GravedadAlerta, number> = { roja: 0, ambar: 1, informativa: 2 };

interface EntradaAlertas {
  escenario: EscenarioDto | null;
  ejecucion: EjecucionDto | null;
  pedidos: EstadoPedidoEnMapa[];
  averias: AveriaSolicitada[];
  minutoActual: number;
  umbralAmbarPorcentaje: number;
  umbralRojoPorcentaje: number;
}

/**
 * Deriva las alertas de la operacion del estado de la simulacion en el
 * minuto que se reproduce. Se ordenan por gravedad: primero las rojas,
 * luego las ambar y al final las informativas (STD 2.6.5).
 */
export function useAlertasOperacion({
  escenario,
  ejecucion,
  pedidos,
  averias,
  minutoActual,
  umbralAmbarPorcentaje,
  umbralRojoPorcentaje,
}: EntradaAlertas): AlertaOperacion[] {
  return useMemo(() => {
    if (!escenario || !ejecucion) {
      return [];
    }

    const alertas: AlertaOperacion[] = [];

    // --- Colapso logístico---
    const colapsoOcurrido = ejecucion.colapsoOcurrido || escenario.colapsoOcurrido;
    const minutoColapso = ejecucion.minutoColapso ?? escenario.minutoColapso;
    const fechaHoraColapso = ejecucion.fechaHoraColapso ?? escenario.fechaHoraColapso;
    const motivoColapso = ejecucion.motivoColapso ?? escenario.motivoColapso;

    if (colapsoOcurrido && minutoColapso !== null && minutoColapso !== undefined && minutoActual >= minutoColapso) {
      alertas.push({
        id: "colapso-logistico-critico",
        gravedad: "roja",
        titulo: `🚨 COLAPSO LOGÍSTICO ALCANZADO (${fechaHoraColapso ?? formatearTiempoSimulado(minutoColapso)})`,
        detalle: formatearMotivoColapso(motivoColapso) || "El sistema y la flota no fueron capaces de asegurar la entrega de pedidos dentro del plazo comprometido.",
      });
    }

    // --- Averias vigentes ---
    averias
      .filter((averia) => averia.minutoSimulacion <= minutoActual)
      .forEach((averia) => {
        alertas.push({
          id: `averia-${averia.codigoUnidad}-${averia.minutoSimulacion}`,
          gravedad: "roja",
          titulo: `Avería ${etiquetaTipoAveria(averia.tipo)} en ${averia.codigoUnidad}`,
          detalle: `Ocurrió a las ${formatearTiempoSimulado(averia.minutoSimulacion)}. Su carga se reasigna a las unidades operativas.`,
          codigoUnidad: averia.codigoUnidad,
        });
      });

    // --- Riesgo de incumplimiento: queda menos de una hora y no ha llegado ---
    pedidos
      .filter(
        (pedido) =>
          pedido.estado !== "ENTREGADO" &&
          pedido.minutoLimite - minutoActual <= MINUTOS_POR_HORA &&
          pedido.minutoLimite >= minutoActual,
      )
      .slice(0, 5)
      .forEach((pedido) => {
        alertas.push({
          id: `riesgo-${pedido.codigoPedido}`,
          gravedad: "roja",
          titulo: "Riesgo de incumplimiento",
          detalle: `${pedido.codigoPedido} vence en ${Math.floor(pedido.minutoLimite - minutoActual)} min${pedido.codigoUnidad ? ` y su unidad ${pedido.codigoUnidad} aún no llega.` : " y no tiene unidad asignada."
            }`,
          codigoUnidad: pedido.codigoUnidad ?? undefined,
        });
      });

    // --- Plazos ya vencidos ---
    const vencidos = pedidos.filter((pedido) => pedido.estado === "INCUMPLIDO");
    if (vencidos.length > 0) {
      alertas.push({
        id: "vencidos",
        gravedad: "roja",
        titulo: `${vencidos.length} pedido(s) con el plazo vencido`,
        detalle: `La política de entrega dentro del plazo no se cumplió: ${vencidos
          .slice(0, 3)
          .map((pedido) => pedido.codigoPedido)
          .join(", ")}.`,
      });
    }

    // --- Pedidos que ninguna unidad pudo tomar ---
    if (ejecucion.pedidosSinAtender.length > 0) {
      alertas.push({
        id: "sin-atender",
        gravedad: "roja",
        titulo: `${ejecucion.pedidosSinAtender.length} pedido(s) sin unidad factible`,
        detalle: "Riesgo de colapso logístico: no hay vehículo operativo con capacidad y plazo suficientes.",
      });
    }

    // --- Semaforo de los almacenes intermedios ---
    escenario.almacenes
      .filter((almacen) => almacen.tipo === "INTERMEDIO")
      .forEach((almacen) => {
        const color = calcularColor(
          almacen.stockActual,
          almacen.stockMaximo,
          umbralAmbarPorcentaje,
          umbralRojoPorcentaje,
        );
        if (color === "VERDE") {
          return;
        }
        alertas.push({
          id: `almacen-${almacen.codigo}`,
          gravedad: color === "ROJO" ? "roja" : "ambar",
          titulo: `${almacen.codigo} en ${color === "ROJO" ? "rojo" : "ámbar"}`,
          detalle: `${almacen.stockActual} / ${almacen.stockMaximo} u disponibles. Recarga a las 23:59:59.`,
        });
      });

    // --- Bloqueos vigentes ---
    const vigentes = escenario.bloqueos.filter(
      (bloqueo) => minutoActual >= bloqueo.inicioMinuto && minutoActual < bloqueo.finMinuto,
    );
    if (vigentes.length > 0) {
      const primero = vigentes[0];
      alertas.push({
        id: "bloqueos",
        gravedad: "ambar",
        titulo: `${vigentes.length} bloqueo(s) vigente(s)`,
        detalle: `Tramo ${primero.nodos
          .slice(0, 3)
          .map(([x, y]) => `(${x},${y})`)
          .join("–")} hasta ${formatearTiempoSimulado(primero.finMinuto)}.`,
      });
    }

    // --- Unidades en mantenimiento preventivo ---
    if (escenario.unidadesEnMantenimiento.length > 0) {
      alertas.push({
        id: "mantenimiento",
        gravedad: "ambar",
        titulo: `${escenario.unidadesEnMantenimiento.join(", ")} en mantenimiento preventivo`,
        detalle: "La unidad queda inmovilizada toda la jornada y no admite ninguna asignación.",
        codigoUnidad: escenario.unidadesEnMantenimiento[0],
      });
    }

    // --- Resultado de la planificacion ---
    alertas.push({
      id: "planificacion",
      gravedad: "informativa",
      titulo: `${ejecucion.algoritmo} resolvió el turno`,
      detalle: `${ejecucion.metricas.unidadesEnRuta} rutas por ${formatearSoles(
        ejecucion.metricas.costoOperativoTotal,
      )} en ${formatearMilisegundos(ejecucion.metricas.duracionComputoMs)}.`,
    });

    return alertas.sort((a, b) => ORDEN_GRAVEDAD[a.gravedad] - ORDEN_GRAVEDAD[b.gravedad]);
  }, [escenario, ejecucion, pedidos, averias, minutoActual, umbralAmbarPorcentaje, umbralRojoPorcentaje]);
}

/**
 * Misma regla que el hook del semaforo, resuelta como funcion: estas
 * alertas se calculan dentro de un bucle y no pueden llamar a un hook.
 */
function calcularColor(
  stockActual: number,
  stockMaximo: number,
  umbralAmbar: number,
  umbralRojo: number,
): "VERDE" | "AMBAR" | "ROJO" {
  const despachado = 1 - stockActual / (stockMaximo > 0 ? stockMaximo : 1);
  if (despachado >= umbralRojo) {
    return "ROJO";
  }
  return despachado >= umbralAmbar ? "AMBAR" : "VERDE";
}

function etiquetaTipoAveria(tipo: string): string {
  return { TIPO_1: "tipo 1 (menor)", TIPO_2: "tipo 2 (intermedia)", TIPO_3: "tipo 3 (mayor)" }[tipo] ?? tipo;
}
