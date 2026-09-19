import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Boton.css";

/** Variantes de boton definidas en el estandar de GUI (STD 2.5.1). */
export type VarianteBoton = "primario" | "accion" | "secundario" | "destructivo" | "fantasma";

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  /** Icono a la izquierda del texto. */
  icono?: ReactNode;
  /** Boton cuadrado de 36 x 36 px que solo contiene un icono. */
  soloIcono?: boolean;
}

/**
 * Boton del sistema. El primario resuelve la accion principal de una
 * pantalla, el de accion pone en marcha un proceso, el secundario acompaña,
 * el destructivo cubre lo irreversible y el fantasma queda para acciones
 * terciarias dentro de una tabla o una tarjeta (STD 2.5.1).
 */
const Boton = ({ variante = "primario", icono, soloIcono = false, className, children, ...props }: BotonProps) => {
  const clases = ["boton", `boton--${variante}`, soloIcono ? "boton--solo-icono" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" {...props} className={clases}>
      {icono}
      {!soloIcono && children}
    </button>
  );
};

export default Boton;
