import { NavLink } from "react-router-dom";
import { BarChart3, Map, Package, Play, Settings, User } from "lucide-react";
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
const Navside = () => (
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
      {MODULOS.map(({ ruta, etiqueta, Icono, exacto }) => (
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
        <span className="navside__nombre navside__nombre--usuario">Equipo 7G</span>
        <span className="navside__lema">Supervisor logístico</span>
      </span>
    </div>
  </nav>
);

export default Navside;
