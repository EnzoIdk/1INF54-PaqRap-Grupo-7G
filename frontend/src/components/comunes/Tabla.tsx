import type { ReactNode } from "react";

interface ColumnaTabla<T> {
  encabezado: string;
  renderizar: (fila: T) => ReactNode;
}

interface TablaProps<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  obtenerLlave: (fila: T) => string | number;
}

function Tabla<T>({ columnas, filas, obtenerLlave }: TablaProps<T>) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {columnas.map((columna) => (
            <th
              key={columna.encabezado}
              style={{ textAlign: "left", borderBottom: "1px solid var(--color-borde)", padding: 8 }}
            >
              {columna.encabezado}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={obtenerLlave(fila)}>
            {columnas.map((columna) => (
              <td key={columna.encabezado} style={{ padding: 8, borderBottom: "1px solid var(--color-borde)" }}>
                {columna.renderizar(fila)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Tabla;
