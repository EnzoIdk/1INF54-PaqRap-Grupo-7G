/**
 * Descargas generadas en el navegador, sin pasar por el backend: el
 * itinerario de una unidad en texto simple (RF-58) y las tablas de
 * resultados en CSV, que Excel abre directamente (RF-67, RF-69, RF-74).
 */

type Celda = string | number | boolean | null | undefined;

/** Separador de columnas que Excel en español reconoce sin configurar nada. */
const SEPARADOR = ";";

/** Marca de orden de bytes: hace que Excel lea el archivo como UTF-8. */
const BOM = String.fromCharCode(0xfeff);

export function descargarTexto(nombreArchivo: string, contenido: string): void {
  descargar(nombreArchivo, contenido, "text/plain;charset=utf-8");
}

/**
 * Genera un CSV con una o varias secciones (cada una con su título, sus
 * encabezados y sus filas). La marca BOM hace que Excel respete las tildes.
 */
export function descargarCsv(
  nombreArchivo: string,
  secciones: { titulo?: string; encabezados: string[]; filas: Celda[][] }[],
): void {
  // Sin la línea "sep=;": Excel la acepta pero entonces ignora el BOM y rompe las tildes.
  const lineas: string[] = [];
  secciones.forEach((seccion, indice) => {
    if (indice > 0) {
      lineas.push("");
    }
    if (seccion.titulo) {
      lineas.push(escapar(seccion.titulo));
    }
    lineas.push(seccion.encabezados.map(escapar).join(SEPARADOR));
    seccion.filas.forEach((fila) => lineas.push(fila.map(escapar).join(SEPARADOR)));
  });
  descargar(nombreArchivo, `${BOM}${lineas.join("\r\n")}`, "text/csv;charset=utf-8");
}

function escapar(valor: Celda): string {
  if (valor === null || valor === undefined) {
    return "";
  }
  const texto = typeof valor === "number" ? formatearNumero(valor) : String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Excel en español espera la coma como separador decimal. */
function formatearNumero(valor: number): string {
  if (Number.isInteger(valor)) {
    return String(valor);
  }
  return valor.toFixed(2).replace(".", ",");
}

function descargar(nombreArchivo: string, contenido: string, tipo: string): void {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
