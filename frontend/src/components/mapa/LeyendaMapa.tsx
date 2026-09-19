import { Bike, Car, Motorbike, TriangleAlert, Warehouse } from "lucide-react";
import {
  COLOR_ESTADO_PEDIDO,
  COLOR_TIPO_UNIDAD,
  ETIQUETA_ESTADO_PEDIDO,
  type EstadoPedidoVisual,
} from "../../utils/constants";
import "./LeyendaMapa.css";

interface LeyendaMapaProps {
  almacenCentral?: { posX: number; posY: number };
}

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
            <Warehouse size={9} color="#ffffff" />
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
            <Warehouse size={8} color="#ffffff" />
          </span>
          Almacén intermedio
        </li>
        <li>
          <Car size={16} color={COLOR_TIPO_UNIDAD.AUTO} /> Auto (TA) en ruta
        </li>
        <li>
          <Motorbike size={16} color={COLOR_TIPO_UNIDAD.MOTO} /> Moto (TM) en ruta
        </li>
        <li>
          <Bike size={16} color={COLOR_TIPO_UNIDAD.BICICLETA} /> Bicicleta (TB) en ruta
        </li>
        <li>
          <TriangleAlert size={16} color="var(--color-semaforo-rojo)" /> Unidad averiada
        </li>
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
            <line x1={0} y1={4} x2={26} y2={4} stroke="var(--color-ruta-recorrida)" strokeWidth={2} />
          </svg>
          Ruta ya recorrida
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
