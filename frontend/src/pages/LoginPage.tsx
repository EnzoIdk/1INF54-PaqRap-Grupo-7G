import { useState } from "react";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import { mensajeErrorAuth, useAuth } from "../auth/AuthContext";
import "./AuthPage.css";

const LoginPage = () => {
  const { iniciarSesion, usuario } = useAuth();
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? "/";

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await iniciarSesion(username, password);
      navegar(destino, { replace: true });
    } catch (fallo) {
      setError(mensajeErrorAuth(fallo, "No se pudo iniciar sesión. Verifica tus datos."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="auth">
      <section className="auth__tarjeta">
        <div className="auth__marca">
          <span className="auth__logo">P</span>
          <span>PaqRap</span>
        </div>
        <p className="auth__eyebrow">CENTRO DE OPERACIONES</p>
        <h1 className="auth__titulo">Bienvenido de vuelta</h1>
        <p className="auth__descripcion">Inicia sesión para continuar con la gestión logística.</p>

        <form className="auth__formulario" onSubmit={enviar}>
          <label className="auth__campo">
            <span>Usuario</span>
            <span className="auth__entrada">
              <UserRound size={17} aria-hidden />
              <input
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(evento) => setUsername(evento.target.value)}
                placeholder="Tu usuario"
              />
            </span>
          </label>
          <label className="auth__campo">
            <span>Contraseña</span>
            <span className="auth__entrada">
              <LockKeyhole size={17} aria-hidden />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="Tu contraseña"
              />
            </span>
          </label>
          {error && <p className="auth__error" role="alert">{error}</p>}
          <button className="auth__boton" type="submit" disabled={enviando}>
            {enviando ? "Ingresando…" : "Iniciar sesión"}
            {!enviando && <ArrowRight size={17} aria-hidden />}
          </button>
        </form>
        <p className="auth__pie">Acceso privado para el equipo de operaciones.</p>
      </section>
      <aside className="auth__visual">
        <div className="auth__visual-contenido">
          <span className="auth__visual-etiqueta">LOGÍSTICA INTELIGENTE</span>
          <h2>Todo tu equipo,<br />en una sola ruta.</h2>
          <p>Coordina pedidos, unidades y simulaciones desde un centro de control diseñado para mantener cada entrega en movimiento.</p>
          <div className="auth__visual-linea"><span /><span /><span /></div>
        </div>
        <span className="auth__visual-version">PAQRAP · GESTIÓN LOGÍSTICA</span>
      </aside>
    </main>
  );
};

export default LoginPage;
