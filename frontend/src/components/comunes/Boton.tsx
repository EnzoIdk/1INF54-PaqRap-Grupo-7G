import type { ButtonHTMLAttributes } from "react";

type VarianteBoton = "primario" | "secundario";

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
}

const Boton = ({ variante = "primario", style, ...props }: BotonProps) => {
  const colorFondo = variante === "primario" ? "var(--color-primario)" : "var(--color-superficie)";

  return (
    <button
      {...props}
      style={{
        backgroundColor: colorFondo,
        color: "var(--color-texto)",
        border: "1px solid var(--color-borde)",
        borderRadius: 6,
        padding: "8px 16px",
        cursor: "pointer",
        ...style,
      }}
    />
  );
};

export default Boton;
