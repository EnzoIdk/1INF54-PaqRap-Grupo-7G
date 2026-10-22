import { useState } from "react";
import { LockKeyhole, UserRound } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import type { FormEvent } from "react";
import { mensajeErrorAuth, useAuth } from "../auth/AuthContext";
import BotonTema from "../components/comunes/BotonTema";
import "./AuthPage.css";

const ConfigurarAdminPage = () => {
  const { configurarAdmin, requiereConfiguracion } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!requiereConfiguracion) {
    return <Navigate to="/login" replace />;
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError("");
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    try {
      await configurarAdmin(username, password);
    } catch (fallo) {
      setError(mensajeErrorAuth(fallo, "No se pudo crear el administrador."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="auth auth--configuracion">
      <BotonTema ubicacion="flotante" />
      <section className="auth__tarjeta">
        <div className="auth__marca">
          <span className="auth__logo">P</span>
          <span>PaqRap</span>
        </div>
        <p className="auth__eyebrow">CONFIGURACIÓN INICIAL</p>
        <h1 className="auth__titulo">Crea la cuenta administradora</h1>
        <p className="auth__descripcion">
          Este paso solo puede completarse una vez. Después, el administrador podrá crear las demás cuentas.
        </p>

        <form className="auth__formulario" onSubmit={enviar}>
          <label className="auth__campo">
            <span>Usuario</span>
            <span className="auth__entrada">
              <UserRound size={17} aria-hidden />
              <input
                autoComplete="username"
                autoFocus
                minLength={3}
                maxLength={40}
                required
                value={username}
                onChange={(evento) => setUsername(evento.target.value)}
                placeholder="Elige un nombre de usuario"
              />
            </span>
          </label>
          <label className="auth__campo">
            <span>Contraseña <small>(mínimo 12 caracteres)</small></span>
            <span className="auth__entrada">
              <LockKeyhole size={17} aria-hidden />
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="Crea una contraseña segura"
              />
            </span>
          </label>
          <label className="auth__campo">
            <span>Confirma la contraseña</span>
            <span className="auth__entrada">
              <LockKeyhole size={17} aria-hidden />
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={confirmacion}
                onChange={(evento) => setConfirmacion(evento.target.value)}
                placeholder="Repite la contraseña"
              />
            </span>
          </label>
          {error && <p className="auth__error" role="alert">{error}</p>}
          <button className="auth__boton" type="submit" disabled={enviando}>
            {enviando ? "Creando cuenta…" : "Crear administrador"}
          </button>
        </form>
        <Link className="auth__enlace" to="/login">Volver al inicio de sesión</Link>
      </section>
    </main>
  );
};

export default ConfigurarAdminPage;
