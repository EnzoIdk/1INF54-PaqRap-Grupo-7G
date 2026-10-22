import { create } from "zustand";

export type Tema = "claro" | "oscuro";

/** Clave con la que se recuerda la preferencia; index.html la lee antes de pintar. */
export const CLAVE_TEMA = "paqrap.tema";

function leerTemaInicial(): Tema {
  const actual = document.documentElement.dataset.tema;
  if (actual === "claro" || actual === "oscuro") {
    return actual;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}

function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema;
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // Sin almacenamiento (navegacion privada): el tema dura lo que la pestana.
  }
}

interface TemaState {
  tema: Tema;
  alternarTema: () => void;
}

/**
 * Tema de color del visualizador. Todos los colores salen de los tokens de
 * tokens.css, asi que cambiar de tema es solo cambiar el atributo
 * data-tema del documento.
 */
export const useTema = create<TemaState>((set, get) => ({
  tema: leerTemaInicial(),
  alternarTema: () => {
    const tema: Tema = get().tema === "oscuro" ? "claro" : "oscuro";
    aplicarTema(tema);
    set({ tema });
  },
}));
