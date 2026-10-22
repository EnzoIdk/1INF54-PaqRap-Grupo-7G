import { NavLink } from "react-router-dom";
import { BarChart3, LogOut, Map, Package, Play, Settings, User, UserRoundCog } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import BotonTema from "../comunes/BotonTema";
import "./Navside.css";

const MODULOS = [
  { ruta: "/", etiqueta: "Centro de Control", Icono: Map, exacto: true },
  { ruta: "/pedidos", etiqueta: "Gestión de Pedidos", Icono: Package, exacto: false },
  { ruta: "/simulacion", etiqueta: "Consola de Simulación", Icono: Play, exacto: false },
  { ruta: "/analytics", etiqueta: "Analytics", Icono: BarChart3, exacto: false },
  { ruta: "/configuracion", etiqueta: "Configuración", Icono: Settings, exacto: false },
];

/**
 * Barra lateral de navegacion: elemento de navegacion principal del sistema
 * (STD 2.6.1).
 */
const Navside = () => {
  const { usuario, cerrarSesion } = useAuth();

  const modulos = usuario?.rol === "ADMIN"
    ? [...MODULOS, { ruta: "/usuarios", etiqueta: "Usuarios", Icono: UserRoundCog, exacto: false }]
    : MODULOS;

  return (
    <nav className="navside">
    <div className="navside__marca">
      <span className="navside__logo">P</span>
      <span>
        <span className="navside__nombre">PaqRap</span>
        <span className="navside__lema">Gestión logística</span>
      </span>
    </div>

    <div className="navside__separador" />

    <ul className="navside__modulos">
      {modulos.map(({ ruta, etiqueta, Icono, exacto }) => (
        <li key={ruta}>
          <NavLink
            to={ruta}
            end={exacto}
            className={({ isActive }) => `navside__enlace ${isActive ? "navside__enlace--activo" : ""}`}
          >
            <Icono size={18} aria-hidden />
            {etiqueta}
          </NavLink>
        </li>
      ))}
    </ul>

    <div className="navside__separador" />

    <div className="navside__usuario">
      <span className="navside__avatar">
        <User size={16} aria-hidden />
      </span>
      <span>
        <span className="navside__nombre navside__nombre--usuario">{usuario?.username}</span>
        <span className="navside__lema">{usuario?.rol === "ADMIN" ? "Administrador" : "Usuario"}</span>
      </span>
      <BotonTema />
      <button
        className="navside__salir"
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => void cerrarSesion()}
      >
        <LogOut size={16} aria-hidden />
      </button>
    </div>
  </nav>
  );
};

export default Navside;
