import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import "./Campo.css";

interface EnvoltorioProps {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}

/** Etiqueta, control y texto de ayuda o de error (STD 2.5.2). */
const Envoltorio = ({ etiqueta, ayuda, error, children }: EnvoltorioProps) => (
  <label className="campo">
    <span className="campo__etiqueta">{etiqueta}</span>
    <div className="campo__control">{children}</div>
    {error ? (
      <span className="campo__error">
        <AlertCircle size={12} aria-hidden /> {error}
      </span>
    ) : (
      ayuda && <span className="campo__ayuda">{ayuda}</span>
    )}
  </label>
);

interface CampoTextoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  ayuda?: string;
  error?: string;
}

/**
 * Campo de entrada estandar: fondo blanco, borde de 1 px, radio de 8 px,
 * alto de 38 px y relleno horizontal de 12 px (STD 2.5.2).
 */
export const CampoTexto = ({ etiqueta, ayuda, error, className, ...props }: CampoTextoProps) => (
  <Envoltorio etiqueta={etiqueta} ayuda={ayuda} error={error}>
    <input
      {...props}
      className={["campo__entrada", error ? "campo__entrada--error" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    />
  </Envoltorio>
);

interface OpcionSelect {
  valor: string;
  etiqueta: string;
}

interface CampoSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
  opciones: OpcionSelect[];
  ayuda?: string;
  error?: string;
}

/**
 * Lista cerrada: comparte la apariencia del campo de entrada e incluye la
 * flecha hacia abajo en el extremo derecho (STD 2.5.3).
 */
export const CampoSelect = ({ etiqueta, opciones, ayuda, error, className, ...props }: CampoSelectProps) => (
  <Envoltorio etiqueta={etiqueta} ayuda={ayuda} error={error}>
    <select {...props} className={["campo__entrada", "campo__select", className ?? ""].filter(Boolean).join(" ")}>
      {opciones.map((opcion) => (
        <option key={opcion.valor} value={opcion.valor}>
          {opcion.etiqueta}
        </option>
      ))}
    </select>
  </Envoltorio>
);

interface ConmutadorProps {
  etiqueta: string;
  activo: boolean;
  onCambiar: (activo: boolean) => void;
  descripcion?: string;
}

/**
 * Interruptor de 46 x 26 px con circulo interior de 20 px, acompañado
 * siempre de una etiqueta descriptiva a su derecha (STD 2.5.3).
 */
export const Conmutador = ({ etiqueta, activo, onCambiar, descripcion }: ConmutadorProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={activo}
    className="conmutador"
    onClick={() => onCambiar(!activo)}
  >
    <span className={`conmutador__pista ${activo ? "conmutador__pista--activo" : ""}`}>
      <span className="conmutador__circulo" />
    </span>
    <span className="conmutador__texto">
      <span className="conmutador__etiqueta">{etiqueta}</span>
      {descripcion && <span className="conmutador__descripcion">{descripcion}</span>}
    </span>
  </button>
);

interface ChipProps {
  etiqueta: string;
  color: string;
  activo: boolean;
  onClick?: () => void;
  detalle?: string;
}

/**
 * Chip conmutable con punto de color, que permite identificar el tipo de
 * unidad sin leer la etiqueta (STD 2.5.3).
 */
export const Chip = ({ etiqueta, color, activo, onClick, detalle }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={activo}
    className={`chip ${activo ? "chip--activo" : ""}`}
    style={activo ? { borderColor: color, color } : undefined}
  >
    <span className="chip__punto" style={{ backgroundColor: activo ? color : "var(--color-texto-tenue)" }} />
    {etiqueta}
    {detalle && <span className="chip__detalle">{detalle}</span>}
  </button>
);
