import { Warehouse } from "lucide-react";
import type { TipoUnidad } from "../../types/Experimentacion";
import {
  COLOR_ESTADO_PEDIDO,
  COLOR_TIPO_UNIDAD,
  ETIQUETA_ESTADO_PEDIDO,
  type EstadoPedidoVisual,
} from "../../utils/constants";
import { COLOR_NIVEL, ETIQUETA_NIVEL, NIVELES_SEMAFORO } from "../../utils/semaforo";
import { COLOR_TIPO_AVERIA, ETIQUETA_TIPO_AVERIA } from "../../utils/averias";
import IconoVehiculo from "./IconoVehiculo";
import "./LeyendaMapa.css";

interface LeyendaMapaProps {
  almacenCentral?: { posX: number; posY: number };
}

const TIPOS_AVERIA = ["TIPO_1", "TIPO_2", "TIPO_3"] as const;

/** El mismo icono que se dibuja en el mapa, mirando a la derecha. */
const MuestraVehiculo = ({ tipo }: { tipo: TipoUnidad }) => (
  <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
    <IconoVehiculo tipoUnidad={tipo} cx={12} cy={12} rumbo="E" color={COLOR_TIPO_UNIDAD[tipo]} />
  </svg>
);

const ESTADOS: EstadoPedidoVisual[] = [
  "PENDIENTE",
  "ASIGNADO",
  "EN_RUTA",
  "ENTREGADO",
  "REASIGNADO",
  "INCUMPLIDO",
];

/**
 * Leyenda del mapa: explica cada simbolo para que el color no sea el unico
 * portador de informacion (STD 2.6.3, 5.6).
 */
const LeyendaMapa = ({ almacenCentral }: LeyendaMapaProps) => (
  <aside className="leyenda tarjeta">
    <div className="leyenda__seccion">
      <h3 className="rotulo">Leyenda</h3>
      <ul>
        <li>
          <span className="leyenda__cuadro leyenda__cuadro--central">
            <Warehouse size={9} color="var(--color-texto-sobre-color)" />
          </span>
          Almacén central
          {almacenCentral && (
            <span className="cifra texto-tenue">
              {" "}
              ({almacenCentral.posX}, {almacenCentral.posY})
            </span>
          )}
        </li>
        <li>
          <span className="leyenda__cuadro leyenda__cuadro--intermedio">
            <Warehouse size={8} color="var(--color-texto-sobre-color)" />
          </span>
          Almacén intermedio
        </li>
        <li>
          <MuestraVehiculo tipo="AUTO" /> Auto (TA)
        </li>
        <li>
          <MuestraVehiculo tipo="MOTO" /> Moto (TM)
        </li>
        <li>
          <MuestraVehiculo tipo="BICICLETA" /> Bicicleta (TB)
        </li>
        <li className="texto-tenue">El icono apunta hacia donde avanza la unidad</li>
        <li>
          <svg width={26} height={8} aria-hidden>
            <line x1={0} y1={4} x2={26} y2={4} stroke="var(--color-semaforo-rojo)" strokeWidth={3} strokeDasharray="6 4" />
          </svg>
          Tramo bloqueado
        </li>
        <li>
          <svg width={26} height={8} aria-hidden>
            <line x1={0} y1={4} x2={26} y2={4} stroke="var(--color-azul-accion)" strokeWidth={2} />
          </svg>
          Ruta planificada
        </li>
        <li>
          <svg width={26} height={8} aria-hidden>
            <line x1={0} y1={4} x2={26} y2={4} stroke="var(--color-ruta-retorno)" strokeWidth={2.5} />
          </svg>
          Ruta de retorno
        </li>
        <li>
          <svg width={26} height={8} aria-hidden>
            <line x1={0} y1={4} x2={26} y2={4} stroke="var(--color-ruta-recorrida)" strokeWidth={2} />
          </svg>
          Ruta ya recorrida
        </li>
      </ul>
    </div>

    <div className="leyenda__seccion">
      <h3 className="rotulo">Ocupación (anillo)</h3>
      <ul>
        {NIVELES_SEMAFORO.map((nivel) => (
          <li key={nivel}>
            <svg width={16} height={16} aria-hidden>
              <circle
                cx={8}
                cy={8}
                r={6}
                fill="none"
                stroke={COLOR_NIVEL[nivel]}
                strokeWidth={2.5}
                strokeDasharray={nivel === "VACIO" ? "3 2" : undefined}
              />
            </svg>
            {ETIQUETA_NIVEL[nivel]}
          </li>
        ))}
        <li className="texto-tenue">Igual para el stock de los almacenes</li>
      </ul>
    </div>

    <div className="leyenda__seccion">
      <h3 className="rotulo">Averías (solo mientras duran)</h3>
      <ul>
        {TIPOS_AVERIA.map((tipo, indice) => (
          <li key={tipo}>
            <svg width={16} height={16} aria-hidden>
              <circle cx={8} cy={8} r={7} fill={COLOR_TIPO_AVERIA[tipo]} />
              <text x={8} y={11.5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#ffffff">
                {indice + 1}
              </text>
            </svg>
            {ETIQUETA_TIPO_AVERIA[tipo]}
          </li>
        ))}
        <li>
          <svg width={16} height={16} aria-hidden>
            <circle cx={8} cy={8} r={6} fill="url(#trama-leyenda)" stroke="var(--color-texto-tenue)" strokeWidth={1.5} />
            <defs>
              <pattern id="trama-leyenda" width="3" height="3" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1={0} y1={0} x2={0} y2={3} stroke="var(--color-texto-tenue)" strokeWidth={1.2} />
              </pattern>
            </defs>
          </svg>
          En mantenimiento
        </li>
      </ul>
    </div>

    <div className="leyenda__seccion">
      <h3 className="rotulo">Estado de los pedidos</h3>
      <ul>
        {ESTADOS.map((estado) => (
          <li key={estado}>
            <span className="leyenda__punto" style={{ backgroundColor: COLOR_ESTADO_PEDIDO[estado] }} />
            {ETIQUETA_ESTADO_PEDIDO[estado]}
          </li>
        ))}
      </ul>
    </div>
  </aside>
);

export default LeyendaMapa;
