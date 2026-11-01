import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  LogOut,
  Map,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Settings,
  User,
  UserRoundCog,
} from "lucide-react";
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

const CLAVE_CONTRAIDA = "paqrap.navside.contraida";

function leerContraida(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_CONTRAIDA) === "1";
  } catch {
    return false;
  }
}

/**
 * Barra lateral de navegacion: elemento de navegacion principal del sistema
 * (STD 2.6.1). Se puede contraer a solo iconos para dar mas espacio al mapa;
 * la eleccion se recuerda en el navegador.
 */
const Navside = () => {
  const { usuario, cerrarSesion } = useAuth();
  const [contraida, setContraida] = useState(leerContraida);

  const alternar = () => {
    setContraida((actual) => {
      try {
        window.localStorage.setItem(CLAVE_CONTRAIDA, actual ? "0" : "1");
      } catch {
        // Sin almacenamiento la preferencia dura solo esta visita.
      }
      return !actual;
    });
  };

  const modulos = usuario?.rol === "ADMIN"
    ? [...MODULOS, { ruta: "/usuarios", etiqueta: "Usuarios", Icono: UserRoundCog, exacto: false }]
    : MODULOS;

  return (
    <nav className={`navside ${contraida ? "navside--contraida" : ""}`}>
    <div className="navside__marca">
      <span className="navside__logo">P</span>
      <span className="navside__texto">
        <span className="navside__nombre">PaqRap</span>
        <span className="navside__lema">Gestión logística</span>
      </span>
      <button
        type="button"
        className="navside__contraer"
        aria-label={contraida ? "Expandir menú" : "Contraer menú"}
        title={contraida ? "Expandir menú" : "Contraer menú"}
        aria-expanded={!contraida}
        onClick={alternar}
      >
        {contraida ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
      </button>
    </div>

    <div className="navside__separador" />

    <ul className="navside__modulos">
      {modulos.map(({ ruta, etiqueta, Icono, exacto }) => (
        <li key={ruta}>
          <NavLink
            to={ruta}
            end={exacto}
            className={({ isActive }) => `navside__enlace ${isActive ? "navside__enlace--activo" : ""}`}
            title={contraida ? etiqueta : undefined}
            aria-label={contraida ? etiqueta : undefined}
          >
            <Icono size={18} aria-hidden />
            <span className="navside__texto">{etiqueta}</span>
          </NavLink>
        </li>
      ))}
    </ul>

    <div className="navside__separador" />

    <div className="navside__usuario">
      <span className="navside__avatar">
        <User size={16} aria-hidden />
      </span>
      <span className="navside__texto">
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
