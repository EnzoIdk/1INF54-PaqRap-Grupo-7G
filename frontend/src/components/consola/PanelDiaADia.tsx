import { useEffect, useState } from "react";
import { Clock3, RadioTower } from "lucide-react";
import { CampoSelect } from "../comunes/Campo";
import { useSimulacionStore } from "../../store/simulacionStore";
import type { AlgoritmoSolicitado } from "../../types/Experimentacion";
import { configuracionDiaADia } from "../../hooks/useExperimentacion";
import { formatearFechaHoraLima } from "../../utils/tiempoReal";
import "./PanelesConsola.css";

const ALGORITMOS: { valor: AlgoritmoSolicitado; etiqueta: string }[] = [
  { valor: "AMBOS", etiqueta: "Ambos (comparar I-ACO y AGA-ES-TW)" },
  { valor: "IACO", etiqueta: "Solo I-ACO" },
  { valor: "AGAESTW", etiqueta: "Solo AGA-ES-TW" },
];

interface PanelDiaADiaProps {
  algoritmo: AlgoritmoSolicitado;
  onCambiarAlgoritmo: (algoritmo: AlgoritmoSolicitado) => void;
}

/**
 * Operación día a día en tiempo real (RF-44). Muestra qué turno se va a
 * resolver según la hora de Lima: el vigente entre los cambios de las 07:00,
 * 15:00 y 23:00 (RF-25), con el archivo de ventas del mes en curso.
 */
const PanelDiaADia = ({ algoritmo, onCambiarAlgoritmo }: PanelDiaADiaProps) => {
  const conjuntos = useSimulacionStore((estado) => estado.conjuntos);
  const tiempoReal = useSimulacionStore((estado) => estado.tiempoReal);
  const [, setPulso] = useState(0);

  useEffect(() => {
    const intervalo = window.setInterval(() => setPulso((valor) => valor + 1), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  const configuracion = configuracionDiaADia(conjuntos);
  const dos = (valor: number) => String(valor).padStart(2, "0");

  return (
    <section className="tarjeta">
      <header className="tarjeta__encabezado">
        <div>
          <h2 className="tarjeta__titulo">Operación día a día en tiempo real</h2>
          <p className="tarjeta__contexto">
            Se planifica el turno vigente con la hora oficial de Lima y el reloj del Centro de Control sigue la hora
            real. Al terminar el turno se planifica solo el siguiente
          </p>
        </div>
        {tiempoReal && (
          <span className="dia-a-dia__estado">
            <RadioTower size={14} aria-hidden /> En operación
          </span>
        )}
      </header>

      <div className="tarjeta__cuerpo">
        {!configuracion ? (
          <p className="texto-tenue">Consultando los archivos de ventas disponibles…</p>
        ) : (
          <div className="dia-a-dia__datos">
            <div className="dia-a-dia__dato">
              <span className="rotulo">Hora de Lima</span>
              <strong className="cifra">
                <Clock3 size={14} aria-hidden /> {formatearFechaHoraLima(configuracion.ahora)}:
                {dos(configuracion.ahora.segundo)}
              </strong>
            </div>
            <div className="dia-a-dia__dato">
              <span className="rotulo">Turno vigente</span>
              <strong className="cifra">
                Día {configuracion.turno.dia} · {dos(configuracion.turno.horaInicio)}:00 a{" "}
                {dos((configuracion.turno.horaInicio + configuracion.turno.ventanaHoras) % 24)}:00
              </strong>
            </div>
            <div className="dia-a-dia__dato">
              <span className="rotulo">Datos del cliente</span>
              <strong className="cifra">{configuracion.archivoVentas}</strong>
              {configuracion.conjunto.anio !== configuracion.ahora.anio && (
                <span className="texto-tenue">
                  No hay archivo de {configuracion.ahora.anio}; se usa el mismo mes de {configuracion.conjunto.anio}
                </span>
              )}
            </div>
            <CampoSelect
              etiqueta="Algoritmo"
              value={algoritmo}
              opciones={ALGORITMOS}
              onChange={(evento) => onCambiarAlgoritmo(evento.target.value as AlgoritmoSolicitado)}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default PanelDiaADia;
