import "./Tabs.css";

export interface OpcionTab {
  id: string;
  etiqueta: React.ReactNode;
  detalle?: string;
}

interface TabsProps {
  opciones: OpcionTab[];
  activa: string;
  onCambiar: (id: string) => void;
}

/**
 * Barra de pestañas: contenedor con fondo de superficie, radio de 8 px y
 * relleno de 4 px; la pestaña activa lleva fondo blanco, borde tenue y
 * sombra suave (STD 2.5.5).
 */
const Tabs = ({ opciones, activa, onCambiar }: TabsProps) => (
  <div className="tabs" role="tablist">
    {opciones.map((opcion) => (
      <button
        key={opcion.id}
        role="tab"
        type="button"
        aria-selected={opcion.id === activa}
        className={`tabs__opcion ${opcion.id === activa ? "tabs__opcion--activa" : ""}`}
        onClick={() => onCambiar(opcion.id)}
      >
        {opcion.etiqueta}
        {opcion.detalle && <span className="tabs__detalle cifra">{opcion.detalle}</span>}
      </button>
    ))}
  </div>
);

export default Tabs;
