import { Moon, Sun } from "lucide-react";
import { useTema } from "../../hooks/useTema";
import "./BotonTema.css";

interface BotonTemaProps {
  /** "navside" se dibuja sobre la barra lateral; "flotante", en la esquina de las pantallas de acceso. */
  ubicacion?: "navside" | "flotante";
}

/** Alterna entre el tema claro y el oscuro, y recuerda la eleccion. */
const BotonTema = ({ ubicacion = "navside" }: BotonTemaProps) => {
  const tema = useTema((estado) => estado.tema);
  const alternarTema = useTema((estado) => estado.alternarTema);
  const etiqueta = tema === "oscuro" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      className={`boton-tema boton-tema--${ubicacion}`}
      onClick={alternarTema}
      aria-label={etiqueta}
      title={etiqueta}
    >
      {tema === "oscuro" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
    </button>
  );
};

export default BotonTema;
