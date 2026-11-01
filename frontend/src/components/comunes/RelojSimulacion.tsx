import { useEffect, useState } from "react";
import { CalendarClock, Clock } from "lucide-react";
import { formatearTiempoReal } from "../../utils/formatters";
import { ahoraEnLima, formatearFechaHoraLima } from "../../utils/tiempoReal";
import "./RelojSimulacion.css";

interface RelojSimulacionProps {
  minutoSimulacionActual: number;
  segundosRealesTranscurridos: number;
  /** Minuto en que empezó la simulación: da el tiempo simulado transcurrido. */
  minutoInicio?: number;
  /** Año y mes del archivo de ventas: convierten el minuto en una fecha real. */
  anio?: number;
  mes?: number;
}

const dos = (valor: number) => String(valor).padStart(2, "0");

/** Fecha y hora (al minuto) que corresponde a un minuto de simulación del mes. */
export function fechaSimulada(anio: number, mes: number, minuto: number): string {
  const fecha = new Date(Date.UTC(anio, mes - 1, 1) + Math.max(0, Math.floor(minuto)) * 60_000);
  return `${dos(fecha.getUTCDate())}/${dos(fecha.getUTCMonth() + 1)}/${fecha.getUTCFullYear()} ${dos(fecha.getUTCHours())}:${dos(fecha.getUTCMinutes())}`;
}

/** Duración en minutos como "2d 05h 30m". */
export function formatearDuracion(minutos: number): string {
  const total = Math.max(0, Math.floor(minutos));
  return `${Math.floor(total / 1440)}d ${dos(Math.floor((total % 1440) / 60))}h ${dos(total % 60)}m`;
}

/**
 * Los cuatro tiempos del mapa (rúbrica C12-C16, STD 2.6.2): la fecha y hora
 * que se está simulando, lo transcurrido de la simulación, la fecha y hora
 * actuales (hora de Lima) y el tiempo real transcurrido desde que empezó la
 * reproducción.
 */
const RelojSimulacion = ({
  minutoSimulacionActual,
  segundosRealesTranscurridos,
  minutoInicio = 0,
  anio,
  mes,
}: RelojSimulacionProps) => {
  const [ahora, setAhora] = useState(() => ahoraEnLima());

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(ahoraEnLima()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  const simulado = anio && mes ? fechaSimulada(anio, mes, minutoSimulacionActual) : "—";

  return (
    <div className="reloj" role="group" aria-label="Tiempos de la simulación">
      <div className="reloj__bloque">
        <CalendarClock size={16} aria-hidden className="reloj__icono" />
        <span>
          <span className="reloj__rotulo">Simulado</span>
          <span className="reloj__valor cifra">{simulado}</span>
          <span className="reloj__valor reloj__valor--chico cifra" title="Tiempo simulado transcurrido">
            + {formatearDuracion(minutoSimulacionActual - minutoInicio)} simulados
          </span>
        </span>
      </div>
      <div className="reloj__bloque reloj__bloque--real">
        <Clock size={16} aria-hidden className="reloj__icono" />
        <span>
          <span className="reloj__rotulo">Ahora (Lima)</span>
          <span className="reloj__valor cifra">
            {formatearFechaHoraLima(ahora)}:{dos(ahora.segundo)}
          </span>
          <span className="reloj__valor reloj__valor--chico cifra" title="Tiempo real transcurrido desde que empezó la reproducción">
            + {formatearTiempoReal(segundosRealesTranscurridos)} reales
          </span>
        </span>
      </div>
    </div>
  );
};

export default RelojSimulacion;
