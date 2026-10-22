import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import axios from "axios";
import type { FormEvent } from "react";
import Encabezado from "../components/layout/Encabezado";
import { mensajeErrorAuth } from "../auth/AuthContext";
import "./UsuariosPage.css";

interface Usuario {
  id: number;
  username: string;
  rol: "ADMIN" | "USUARIO";
  activo: boolean;
}

const UsuariosPage = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Usuario["rol"]>("USUARIO");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    const { data } = await axios.get<Usuario[]>("/api/admin/users");
    setUsuarios(data);
  }, []);

  useEffect(() => {
    cargarUsuarios()
      .catch((fallo: unknown) => setError(mensajeErrorAuth(fallo, "No se pudieron cargar las cuentas.")))
      .finally(() => setCargando(false));
  }, [cargarUsuarios]);

  const crearUsuario = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setEnviando(true);
    try {
      await axios.post("/api/admin/users", { username, password, rol });
      setUsername("");
      setPassword("");
      setMensaje("La cuenta se creó correctamente.");
      await cargarUsuarios();
    } catch (fallo) {
      setError(mensajeErrorAuth(fallo, "No se pudo crear la cuenta."));
    } finally {
      setEnviando(false);
    }
  };

  const cambiarEstado = async (usuario: Usuario) => {
    setError("");
    setMensaje("");
    try {
      await axios.patch(`/api/admin/users/${usuario.id}/estado`, { activo: !usuario.activo });
      await cargarUsuarios();
    } catch (fallo) {
      setError(mensajeErrorAuth(fallo, "No se pudo actualizar la cuenta."));
    }
  };

  return (
    <div className="usuarios">
      <Encabezado titulo="Usuarios" contexto="Administración de cuentas y permisos del sistema" />
      <div className="usuarios__cuerpo desplazable">
        <section className="tarjeta">
          <header className="tarjeta__encabezado">
            <div>
              <h2 className="tarjeta__titulo">Crear una cuenta</h2>
            </div>
          </header>
          <form className="usuarios__formulario" onSubmit={crearUsuario}>
            <label>
              <span>Nombre de usuario</span>
              <input
                autoComplete="off"
                minLength={3}
                maxLength={40}
                required
                value={username}
                onChange={(evento) => setUsername(evento.target.value)}
              />
            </label>
            <label>
              <span>Contraseña <small>(mínimo 12 caracteres)</small></span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
              />
            </label>
            <label>
              <span>Rol</span>
              <select value={rol} onChange={(evento) => setRol(evento.target.value as Usuario["rol"])}>
                <option value="USUARIO">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
            <button className="usuarios__crear" type="submit" disabled={enviando}>
              <UserPlus size={16} aria-hidden />
              {enviando ? "Creando…" : "Crear usuario"}
            </button>
          </form>
          {error && <p className="usuarios__aviso usuarios__aviso--error" role="alert">{error}</p>}
          {mensaje && <p className="usuarios__aviso usuarios__aviso--ok" role="status">{mensaje}</p>}
        </section>

        <section className="tarjeta">
          <header className="tarjeta__encabezado">
            <div>
              <h2 className="tarjeta__titulo">Cuentas registradas</h2>
              <p className="tarjeta__contexto">Desactiva cuentas para retirar el acceso sin borrar su registro.</p>
            </div>
            <span className="usuarios__contador">{usuarios.length} cuentas</span>
          </header>
          {cargando ? (
            <div className="estado-vacio"><span className="estado-vacio__titulo">Cargando cuentas…</span></div>
          ) : usuarios.length === 0 ? (
            <div className="estado-vacio"><span className="estado-vacio__titulo">Aún no hay cuentas.</span></div>
          ) : (
            <div className="usuarios__tabla-contenedor">
              <table className="usuarios__tabla">
                <thead>
                  <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acción</th></tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td className="usuarios__nombre">{usuario.username}</td>
                      <td>{usuario.rol === "ADMIN" ? "Administrador" : "Usuario"}</td>
                      <td>
                        <span className={`usuarios__estado ${usuario.activo ? "usuarios__estado--activo" : ""}`}>
                          {usuario.activo ? "Activo" : "Desactivado"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="usuarios__accion"
                          type="button"
                          onClick={() => void cambiarEstado(usuario)}
                        >
                          {usuario.activo ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default UsuariosPage;
