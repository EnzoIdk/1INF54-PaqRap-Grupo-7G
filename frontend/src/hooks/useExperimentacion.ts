import { useCallback, useEffect, useMemo } from "react";
import axios from "axios";
import { experimentacionService } from "../services/experimentacionService";
import { seleccionarEjecucionVisible, useSimulacionStore } from "../store/simulacionStore";
import type { AlgoritmoSolicitado, ConjuntoDatos, ParametrosVigentes } from "../types/Experimentacion";
import { ahoraEnLima, minutoDelMes, turnoVigente } from "../utils/tiempoReal";

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

  const parametrosVigentes = useSimulacionStore((estado) => estado.parametrosVigentes);
  const setParametrosVigentes = useSimulacionStore((estado) => estado.setParametrosVigentes);
  const pedidosAdicionales = useSimulacionStore((estado) => estado.pedidosAdicionales);
  const activarTiempoReal = useSimulacionStore((estado) => estado.activarTiempoReal);

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
  }, [setConjuntos, registrarError, setParametrosVigentes]);

  const ejecutar = useCallback(async () => {
    iniciarCarga();
    try {
      const resultado = await experimentacionService.ejecutar({ ...parametros, pedidosAdicionales });
      registrarResultado(resultado);
      return resultado;
    } catch (causa: unknown) {
      registrarError(describirError(causa));
      return null;
    }
  }, [parametros, pedidosAdicionales, iniciarCarga, registrarResultado, registrarError]);

  const ejecutar5D = useCallback(async () => {
    iniciarCarga();
    try {
      const resultado = await experimentacionService.ejecutarCincoDias({ ...parametros5D, pedidosAdicionales });
      registrarResultado(resultado);
      return resultado;
    } catch (causa: unknown) {
      registrarError(describirError(causa));
      return null;
    }
  }, [parametros5D, pedidosAdicionales, iniciarCarga, registrarResultado, registrarError]);

  const ejecutarColapso = useCallback(async () => {
    iniciarCarga();
    try {
      const resultado = await experimentacionService.ejecutarColapso({ ...parametrosColapso, pedidosAdicionales });
      registrarResultado(resultado);
      return resultado;
    } catch (causa: unknown) {
      registrarError(describirError(causa));
      return null;
    }
  }, [parametrosColapso, pedidosAdicionales, iniciarCarga, registrarResultado, registrarError]);

  /**
   * Operación día a día (RF-44): resuelve el turno vigente según la hora de
   * Lima, con el archivo de ventas del mes actual y los pedidos registrados,
   * y deja el reloj siguiendo la hora real.
   */
  const ejecutarDiaADia = useCallback(
    async (algoritmo: AlgoritmoSolicitado) => {
      const configuracion = configuracionDiaADia(useSimulacionStore.getState().conjuntos);
      if (!configuracion) {
        registrarError("No hay archivos de ventas cargados para operar día a día.");
        return null;
      }
      iniciarCarga();
      try {
        const actual = useSimulacionStore.getState();
        const resultado = await experimentacionService.ejecutar({
          ...actual.parametros,
          archivoVentas: configuracion.archivoVentas,
          dia: configuracion.turno.dia,
          horaInicio: configuracion.turno.horaInicio,
          ventanaHoras: configuracion.turno.ventanaHoras,
          maximoPedidos: MAXIMO_PEDIDOS_DIA_A_DIA,
          algoritmo,
          averias: [],
          pedidosAdicionales: actual.pedidosAdicionales,
        });
        registrarResultado(resultado);
        activarTiempoReal(minutoDelMes(ahoraEnLima()));
        return resultado;
      } catch (causa: unknown) {
        registrarError(describirError(causa));
        return null;
      }
    },
    [iniciarCarga, registrarResultado, registrarError, activarTiempoReal],
  );

  /** Graba en caliente los parámetros de flota y almacenes; solo un ADMIN puede hacerlo. */
  const guardarParametros = useCallback(
    async (flota: ParametrosVigentes["flota"], almacen: ParametrosVigentes["almacen"]) => {
      const vigentes = await experimentacionService.actualizarParametros(flota, almacen);
      setParametrosVigentes(vigentes);
      return vigentes;
    },
    [setParametrosVigentes],
  );

  const restablecerParametros = useCallback(async () => {
    const vigentes = await experimentacionService.restablecerParametros();
    setParametrosVigentes(vigentes);
    return vigentes;
  }, [setParametrosVigentes]);

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
    ejecutarDiaADia,
    guardarParametros,
    restablecerParametros,
    parametrosVigentes,
    umbrales,
  };
}

/** Tope de pedidos del turno en el modo día a día. */
const MAXIMO_PEDIDOS_DIA_A_DIA = 200;

/**
 * Archivo de ventas y turno que corresponden a la hora real de Lima. Si el
 * año en curso no tiene archivo, usa el mismo mes del año más cercano.
 */
export function configuracionDiaADia(conjuntos: ConjuntoDatos[]) {
  if (conjuntos.length === 0) {
    return null;
  }
  const ahora = ahoraEnLima();
  const delMismoMes = conjuntos.filter((conjunto) => conjunto.mes === ahora.mes);
  const elegido =
    conjuntos.find((conjunto) => conjunto.mes === ahora.mes && conjunto.anio === ahora.anio) ??
    [...delMismoMes].sort((a, b) => Math.abs(a.anio - ahora.anio) - Math.abs(b.anio - ahora.anio))[0] ??
    conjuntos[0];
  return { archivoVentas: elegido.archivoVentas, conjunto: elegido, turno: turnoVigente(ahora), ahora };
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
