import { useEffect, useRef, useState, type RefObject } from "react";

export interface Tamano {
  ancho: number;
  alto: number;
}

/**
 * Observa el tamaño de un contenedor. El mapa necesita saberlo en pixeles
 * para que los marcadores conserven las medidas del estandar (16 px el
 * almacen central, 7 px un pedido, 2 px una ruta) sin deformarse cuando la
 * ventana cambia (STD 2.6.3).
 */
export function useTamanoContenedor<T extends HTMLElement>(): [RefObject<T>, Tamano] {
  const referencia = useRef<T>(null);
  const [tamano, setTamano] = useState<Tamano>({ ancho: 0, alto: 0 });

  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento) {
      return;
    }

    // Primera medida inmediata: el observador avisa recién en el siguiente cuadro
    // pintado, y en una pestaña en segundo plano eso puede no ocurrir.
    const estilo = window.getComputedStyle(elemento);
    const ancho = elemento.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
    const alto = elemento.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
    if (ancho > 0 && alto > 0) {
      setTamano({ ancho, alto });
    }

    const observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja) {
        setTamano({ ancho: caja.width, alto: caja.height });
      }
    });

    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [referencia, tamano];
}
