import { Check, X } from "lucide-react";
import { evaluarContrasena } from "../../utils/politicaContrasena";
import "./ReglasContrasena.css";

interface ReglasContrasenaProps {
  usuario: string;
  contrasena: string;
}

const NIVELES = ["Muy débil", "Débil", "Aceptable", "Buena", "Segura"];

/** Lista de reglas de contraseña segura con su avance, mientras se escribe. */
const ReglasContrasena = ({ usuario, contrasena }: ReglasContrasenaProps) => {
  const reglas = evaluarContrasena(usuario, contrasena);
  const cumplidas = reglas.filter((regla) => regla.cumple).length;
  const fraccion = cumplidas / reglas.length;
  const nivel = cumplidas === reglas.length ? 4 : Math.min(3, Math.floor(fraccion * 4));

  return (
    <div className="reglas-contrasena" aria-live="polite">
      <div className="reglas-contrasena__barra" data-nivel={nivel}>
        <span style={{ width: `${fraccion * 100}%` }} />
      </div>
      <span className="reglas-contrasena__nivel">
        Seguridad: <strong>{contrasena ? NIVELES[nivel] : "—"}</strong>
      </span>
      <ul>
        {reglas.map((regla) => (
          <li key={regla.id} className={regla.cumple ? "reglas-contrasena__regla--ok" : ""}>
            {regla.cumple ? <Check size={13} aria-hidden /> : <X size={13} aria-hidden />}
            <span>{regla.texto}</span>
            <span className="sr-only">{regla.cumple ? "cumplida" : "pendiente"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReglasContrasena;
