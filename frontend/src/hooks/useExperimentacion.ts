import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { experimentacionService } from "../services/experimentacionService";
import { seleccionarEjecucionVisible, useSimulacionStore } from "../store/simulacionStore";
import type { ParametrosVigentes } from "../types/Experimentacion";

/** Umbrales por defecto, mientras el backend responde (STD 2.2). */
const UMBRALES_POR_DEFECTO = { umbralAmbarPorcentaje: 0.33, umbralRojoPorcentaje: 0.66 };

/**
 * Expone el catalogo de datos, los parametros vigentes y la accion de
 * ejecutar la experimentacion numerica, sobre el estado global de la
 * simulacion (STD 5.3).
 */
export function useExperimentacion() {
  const conjuntos = useSimulacionStore((estado) => estado.conjuntos);
  const setConjuntos = useSimulacionStore((estado) => estado.setConjuntos);
  const parametros = useSimulacionStore((estado) => estado.parametros);
  const cargando = useSimulacionStore((estado) => estado.cargando);
  const error = useSimulacionStore((estado) => estado.error);
  const iniciarCarga = useSimulacionStore((estado) => estado.iniciarCarga);
  const registrarResultado = useSimulacionStore((estado) => estado.registrarResultado);
  const registrarError = useSimulacionStore((estado) => estado.registrarError);

  const modoSimulacion = useSimulacionStore((estado) => estado.modoSimulacion);
  const setModoSimulacion = useSimulacionStore((estado) => estado.setModoSimulacion);
  const parametros5D = useSimulacionStore((estado) => estado.parametros5D);
  const actualizarParametros5D = useSimulacionStore((estado) => estado.actualizarParametros5D);
  const agregarAveria5D = useSimulacionStore((estado) => estado.agregarAveria5D);
  const quitarAveria5D = useSimulacionStore((estado) => estado.quitarAveria5D);
  const parametrosColapso = useSimulacionStore((estado) => estado.parametrosColapso);
  const actualizarParametrosColapso = useSimulacionStore((estado) => estado.actualizarParametrosColapso);
  const agregarAveriaColapso = useSimulacionStore((estado) => estado.agregarAveriaColapso);
  const quitarAveriaColapso = useSimulacionStore((estado) => estado.quitarAveriaColapso);

  const [parametrosVigentes, setParametrosVigentes] = useState<ParametrosVigentes | null>(null);

  useEffect(() => {
    let vigente = true;

    experimentacionService
      .listarConjuntos()
      .then((datos) => vigente && setConjuntos(datos))
      .catch((causa: unknown) => vigente && registrarError(describirError(causa)));

    experimentacionService
      .obtenerParametros()
      .then((datos) => vigente && setParametrosVigentes(datos))
      .catch(() => undefined);

    return () => {
      vigente = false;
    };
  }, [setConjuntos, registrarError]);

  const ejecutar = useCallback(async () => {
    iniciarCarga();
    try {
      const resultado = await experimentacionService.ejecutar(parametros);
      registrarResultado(resultado);
      return resultado;
    } catch (causa: unknown) {
      registrarError(describirError(causa));
      return null;
    }
  }, [parametros, iniciarCarga, registrarResultado, registrarError]);

  const ejecutar5D = useCallback(async () => {
    iniciarCarga();
    try {
      const resultado = await experimentacionService.ejecutarCincoDias(parametros5D);
      registrarResultado(resultado);
      return resultado;
    } catch (causa: unknown) {
      registrarError(describirError(causa));
      return null;
    }
  }, [parametros5D, iniciarCarga, registrarResultado, registrarError]);

  const ejecutarColapso = useCallback(async () => {
    iniciarCarga();
    try {
      const resultado = await experimentacionService.ejecutarColapso(parametrosColapso);
      registrarResultado(resultado);
      return resultado;
    } catch (causa: unknown) {
      registrarError(describirError(causa));
      return null;
    }
  }, [parametrosColapso, iniciarCarga, registrarResultado, registrarError]);

  const umbrales = useMemo(() => {
    const almacen = parametrosVigentes?.almacen;
    if (!almacen) {
      return UMBRALES_POR_DEFECTO;
    }
    return {
      umbralAmbarPorcentaje: Number(almacen.umbralAmbarPorcentaje ?? UMBRALES_POR_DEFECTO.umbralAmbarPorcentaje),
      umbralRojoPorcentaje: Number(almacen.umbralRojoPorcentaje ?? UMBRALES_POR_DEFECTO.umbralRojoPorcentaje),
    };
  }, [parametrosVigentes]);

  return {
    conjuntos,
    parametros,
    parametros5D,
    parametrosColapso,
    modoSimulacion,
    setModoSimulacion,
    actualizarParametros5D,
    agregarAveria5D,
    quitarAveria5D,
    actualizarParametrosColapso,
    agregarAveriaColapso,
    quitarAveriaColapso,
    cargando,
    error,
    ejecutar,
    ejecutar5D,
    ejecutarColapso,
    parametrosVigentes,
    umbrales,
  };
}

/** Ejecucion que el mapa y los paneles estan mostrando ahora mismo. */
export function useEjecucionVisible() {
  return useSimulacionStore(seleccionarEjecucionVisible);
}

function describirError(causa: unknown): string {
  if (axios.isAxiosError(causa)) {
    const mensaje = (causa.response?.data as { mensaje?: string } | undefined)?.mensaje;
    if (mensaje) {
      return mensaje;
    }
    if (causa.code === "ERR_NETWORK") {
      return "No se pudo contactar al backend. Verifique que esté ejecutándose en el puerto 8080.";
    }
    return causa.message;
  }
  return causa instanceof Error ? causa.message : "Error desconocido";
}
