import { useMemo, useState, type ReactNode } from "react";
import { Inbox } from "lucide-react";
import Boton from "./Boton";
import "./Tabla.css";

export interface ColumnaTabla<T> {
  encabezado: string;
  renderizar: (fila: T) => ReactNode;
  /** Las cifras que se comparan entre si van en fuente monoespaciada (STD 2.5.4). */
  cifra?: boolean;
  ancho?: string;
}

interface TablaProps<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  obtenerLlave: (fila: T) => string | number;
  /** Mensaje del estado vacio: nunca se muestra una tabla en blanco (STD 2.5.4). */
  mensajeVacio?: string;
  accionVacio?: { etiqueta: string; onClick: () => void };
  /** La paginacion aparece cuando hay mas de veinte filas (STD 2.5.4). */
  filasPorPagina?: number;
  nombrePlural?: string;
  onSeleccionar?: (fila: T) => void;
}

const FILAS_POR_PAGINA_POR_DEFECTO = 20;

/**
 * Tabla del sistema: encabezado fijo, filas de 36 px con alternancia de
 * fondo, sin bordes verticales y con pie que indica el total de registros y
 * la pagina actual (STD 2.5.4).
 */
function Tabla<T>({
  columnas,
  filas,
  obtenerLlave,
  mensajeVacio = "No hay registros que mostrar.",
  accionVacio,
  filasPorPagina = FILAS_POR_PAGINA_POR_DEFECTO,
  nombrePlural = "registros",
  onSeleccionar,
}: TablaProps<T>) {
  const [pagina, setPagina] = useState(0);

  const totalPaginas = Math.max(1, Math.ceil(filas.length / filasPorPagina));
  const paginaSegura = Math.min(pagina, totalPaginas - 1);
  const visibles = useMemo(
    () => filas.slice(paginaSegura * filasPorPagina, (paginaSegura + 1) * filasPorPagina),
    [filas, paginaSegura, filasPorPagina],
  );

  if (filas.length === 0) {
    return (
      <div className="estado-vacio">
        <Inbox size={28} aria-hidden />
        <span className="estado-vacio__titulo">{mensajeVacio}</span>
        {accionVacio && (
          <Boton variante="secundario" onClick={accionVacio.onClick}>
            {accionVacio.etiqueta}
          </Boton>
        )}
      </div>
    );
  }

  return (
    <div className="tabla">
      <div className="tabla__contenedor desplazable">
        <table>
          <thead>
            <tr>
              {columnas.map((columna) => (
                <th key={columna.encabezado} style={columna.ancho ? { width: columna.ancho } : undefined}>
                  {columna.encabezado}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila) => (
              <tr
                key={obtenerLlave(fila)}
                onClick={onSeleccionar ? () => onSeleccionar(fila) : undefined}
                className={onSeleccionar ? "tabla__fila--seleccionable" : undefined}
              >
                {columnas.map((columna) => (
                  <td key={columna.encabezado} className={columna.cifra ? "cifra" : undefined}>
                    {columna.renderizar(fila)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tabla__pie">
        <span>
          Mostrando {visibles.length} de {filas.length} {nombrePlural}
        </span>
        {filas.length > filasPorPagina && (
          <span className="tabla__paginacion">
            <Boton variante="fantasma" disabled={paginaSegura === 0} onClick={() => setPagina(paginaSegura - 1)}>
              Anterior
            </Boton>
            <span className="cifra">
              Página {paginaSegura + 1} de {totalPaginas}
            </span>
            <Boton
              variante="fantasma"
              disabled={paginaSegura >= totalPaginas - 1}
              onClick={() => setPagina(paginaSegura + 1)}
            >
              Siguiente
            </Boton>
          </span>
        )}
      </div>
    </div>
  );
}

export default Tabla;
