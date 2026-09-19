import type { ReactNode } from "react";
import { Search } from "lucide-react";
import "./Encabezado.css";

interface EncabezadoProps {
  titulo: string;
  contexto: string;
  /** Barra de busqueda del encabezado general (STD 2.6.2). */
  busqueda?: { valor: string; onCambiar: (valor: string) => void; marcador: string };
  /** Reloj dual y controles, en el encabezado de mapa (STD 2.6.2). */
  extremo?: ReactNode;
  acciones?: ReactNode;
}

/**
 * Encabezado fijo de cada vista. El general concentra el titulo, la linea de
 * contexto, la busqueda y las acciones; el de mapa sustituye la busqueda por
 * el reloj dual y los controles de la simulacion (STD 2.6.2).
 */
const Encabezado = ({ titulo, contexto, busqueda, extremo, acciones }: EncabezadoProps) => (
  <header className="encabezado">
    <div className="encabezado__identidad">
      <h1 className="encabezado__titulo">{titulo}</h1>
      <p className="encabezado__contexto">{contexto}</p>
    </div>

    <div className="encabezado__extremo">
      {busqueda && (
        <label className="encabezado__busqueda">
          <Search size={15} aria-hidden />
          <input
            type="search"
            value={busqueda.valor}
            placeholder={busqueda.marcador}
            onChange={(evento) => busqueda.onCambiar(evento.target.value)}
          />
        </label>
      )}
      {extremo}
      {acciones}
    </div>
  </header>
);

export default Encabezado;
