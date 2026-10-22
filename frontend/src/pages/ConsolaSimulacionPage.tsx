import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CirclePlay, FileText, Plus, TriangleAlert, Trash2 } from "lucide-react";
import Encabezado from "../components/layout/Encabezado";
import Boton from "../components/comunes/Boton";
import Indicador from "../components/comunes/Indicador";
import Tabs, { type OpcionTab } from "../components/comunes/Tabs";
import { CampoSelect, CampoTexto } from "../components/comunes/Campo";
import { useExperimentacion } from "../hooks/useExperimentacion";
import { useSimulacionStore, type ModoSimulacion } from "../store/simulacionStore";
import type { AlgoritmoSolicitado, TipoAveria } from "../types/Experimentacion";
import PanelDiaADia from "../components/consola/PanelDiaADia";
import PanelPedidosAdicionales from "../components/consola/PanelPedidosAdicionales";
import { ahoraEnLima } from "../utils/tiempoReal";
import {
  formatearMilisegundos,
  formatearSoles,
  formatearTiempoSimulado,
} from "../utils/formatters";
import "./ConsolaSimulacionPage.css";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const ALGORITMOS: { valor: AlgoritmoSolicitado; etiqueta: string }[] = [
  { valor: "AMBOS", etiqueta: "Ambos (comparar I-ACO y AGA-ES-TW)" },
  { valor: "IACO", etiqueta: "Solo I-ACO" },
  { valor: "AGAESTW", etiqueta: "Solo AGA-ES-TW" },
];

const TIPOS_AVERIA: { valor: TipoAveria; etiqueta: string }[] = [
  { valor: "TIPO_1", etiqueta: "Tipo 1 · menor (2 h)" },
  { valor: "TIPO_2", etiqueta: "Tipo 2 · intermedia (hasta 4 h)" },
  { valor: "TIPO_3", etiqueta: "Tipo 3 · mayor (2 días)" },
];

const OPCIONES_MODO: OpcionTab[] = [
  { id: "DIA", etiqueta: "Día a día (tiempo real)", detalle: "Turno vigente · hora de Lima" },
  { id: "1D", etiqueta: "Simulación 1 día", detalle: "1 turno · 12 h" },
  { id: "5D", etiqueta: "Simulación 5 días", detalle: "15 turnos consecutivos · 120 h" },
  { id: "COLAPSO", etiqueta: "Simulación hasta el colapso", detalle: "Continuo hasta ruptura del servicio" },
];

/**
 * Consola de la experimentacion numerica: permite configurar y lanzar
 * tanto la simulación de 1 día (1 turno), la simulación continua de 5 días
 * (15 turnos consecutivos de 8 horas), como la simulación continua hasta
 * el colapso logístico.
 */
const ConsolaSimulacionPage = () => {
  const navegar = useNavigate();
  const {
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
    parametrosVigentes,
  } = useExperimentacion();

  const [algoritmoDia, setAlgoritmoDia] = useState<AlgoritmoSolicitado>("AMBOS");
  const tiempoReal = useSimulacionStore((estado) => estado.tiempoReal);
  const flotaVigente = parametrosVigentes?.flota;
  const capacidadMaxima = flotaVigente
    ? Math.max(
        Number(flotaVigente.capacidadAuto ?? 24),
        Number(flotaVigente.capacidadMoto ?? 8),
        Number(flotaVigente.capacidadBicicleta ?? 4),
      )
    : 24;
  const ahora = ahoraEnLima();
  const referenciaPedidos =
    modoSimulacion === "DIA"
      ? { dia: ahora.dia, hora: ahora.hora, minuto: ahora.minuto }
      : modoSimulacion === "5D"
        ? { dia: parametros5D.diaInicio, hora: parametros5D.horaInicio, minuto: 0 }
        : modoSimulacion === "COLAPSO"
          ? { dia: parametrosColapso.diaInicio, hora: parametrosColapso.horaInicio ?? 7, minuto: 0 }
          : { dia: parametros.dia, hora: parametros.horaInicio, minuto: 0 };

  const actualizarParametros = useSimulacionStore((estado) => estado.actualizarParametros);
  const agregarAveria = useSimulacionStore((estado) => estado.agregarAveria);
  const quitarAveria = useSimulacionStore((estado) => estado.quitarAveria);
  const escenario = useSimulacionStore((estado) => estado.escenario);
  const ejecuciones = useSimulacionStore((estado) => estado.ejecuciones);

  const [nuevaAveria, setNuevaAveria] = useState({
    codigoUnidad: "TA01",
    tipo: "TIPO_2" as TipoAveria,
    hora: 10,
  });

  const [nuevaAveria5D, setNuevaAveria5D] = useState({
    codigoUnidad: "TA01",
    tipo: "TIPO_2" as TipoAveria,
    dia: parametros5D.diaInicio,
    hora: 10,
  });

  const [nuevaAveriaColapso, setNuevaAveriaColapso] = useState({
    codigoUnidad: "TA01",
    tipo: "TIPO_2" as TipoAveria,
    dia: parametrosColapso.diaInicio,
    hora: 10,
  });

  // Mantener sincronizado el dia de nuevaAveria5D si cambia el diaInicio
  useEffect(() => {
    if (
      nuevaAveria5D.dia < parametros5D.diaInicio ||
      nuevaAveria5D.dia > parametros5D.diaInicio + 4
    ) {
      setNuevaAveria5D((prev) => ({ ...prev, dia: parametros5D.diaInicio }));
    }
  }, [parametros5D.diaInicio, nuevaAveria5D.dia]);

  useEffect(() => {
    if (nuevaAveriaColapso.dia < parametrosColapso.diaInicio) {
      setNuevaAveriaColapso((prev) => ({ ...prev, dia: parametrosColapso.diaInicio }));
    }
  }, [parametrosColapso.diaInicio, nuevaAveriaColapso.dia]);

  const handleEjecutar = async () => {
    let resultado = null;
    if (modoSimulacion === "DIA") {
      resultado = await ejecutarDiaADia(algoritmoDia);
    } else if (modoSimulacion === "COLAPSO") {
      resultado = await ejecutarColapso();
    } else if (modoSimulacion === "5D") {
      resultado = await ejecutar5D();
    } else {
      resultado = await ejecutar();
    }
    if (resultado) {
      navegar("/");
    }
  };

  const diasOpciones5D = Array.from({ length: 5 }, (_, i) => {
    const diaNum = parametros5D.diaInicio + i;
    return {
      valor: String(diaNum),
      etiqueta: `Día ${diaNum} (Día ${i + 1} de simulación)`,
    };
  });

  const diasOpcionesColapso = Array.from(
    { length: Math.max(1, 31 - parametrosColapso.diaInicio + 1) },
    (_, i) => {
      const diaNum = parametrosColapso.diaInicio + i;
      return {
        valor: String(diaNum),
        etiqueta: `Día ${diaNum} del mes`,
      };
    },
  );

  return (
    <div className="consola">
      <Encabezado
        titulo="Consola de Simulación"
        contexto={
          modoSimulacion === "DIA"
            ? "Operación día a día · turno vigente con la hora real de Lima · replanificación automática en cada cambio de turno"
            : modoSimulacion === "COLAPSO"
            ? "Simulación continua hasta el colapso logístico · detección de incumplimientos de plazos de entrega"
            : modoSimulacion === "5D"
              ? "Simulación continua de 5 días (15 turnos consecutivos de 8 h) · recarga diaria a 23:59:59 · descanso para refrigerio"
              : "Experimentación numérica sobre los archivos de ventas, bloqueos y mantenimiento del cliente"
        }
        acciones={
          <Boton
            variante="accion"
            onClick={handleEjecutar}
            disabled={cargando}
            icono={<CirclePlay size={16} />}
          >
            {cargando
              ? modoSimulacion === "DIA"
                ? "Planificando el turno vigente…"
                : modoSimulacion === "COLAPSO"
                ? "Simulando hasta el colapso…"
                : modoSimulacion === "5D"
                  ? "Planificando 5 días (15 turnos)…"
                  : "Ejecutando…"
              : modoSimulacion === "DIA"
                ? tiempoReal
                  ? "Replanificar el turno vigente"
                  : "Iniciar operación día a día"
                : modoSimulacion === "COLAPSO"
                ? "Ejecutar simulación hasta el colapso"
                : modoSimulacion === "5D"
                  ? "Ejecutar simulación 5 días"
                  : "Ejecutar planificación"}
          </Boton>
        }
      />

      <div className="consola__cuerpo desplazable">
        <div className="consola__pestanas">
          <Tabs
            opciones={OPCIONES_MODO}
            activa={modoSimulacion}
            onCambiar={(id) => setModoSimulacion(id as ModoSimulacion)}
          />
        </div>

        {error && (
          <div className="consola__error">
            <TriangleAlert size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {modoSimulacion === "DIA" ? (
          /* ============================================ DÍA A DÍA (RF-44) */
          <PanelDiaADia algoritmo={algoritmoDia} onCambiarAlgoritmo={setAlgoritmoDia} />
        ) : modoSimulacion === "1D" ? (
          /* ======================================================== 1 DÍA */
          <>
            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Conjunto de datos y turno</h2>
                  <p className="tarjeta__contexto">
                    Cada mes de ventas se resuelve con su archivo de bloqueos y el plan de mantenimiento que le
                    corresponde
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo consola__rejilla">
                <CampoSelect
                  etiqueta="Mes de operación"
                  value={parametros.archivoVentas}
                  onChange={(evento) => actualizarParametros({ archivoVentas: evento.target.value })}
                  opciones={conjuntos.map((conjunto) => ({
                    valor: conjunto.archivoVentas,
                    etiqueta: `${MESES[conjunto.mes - 1]} ${conjunto.anio} · ${conjunto.archivoVentas}`,
                  }))}
                  ayuda={conjuntos.length === 0 ? "Cargando el catálogo del backend…" : undefined}
                />

                <CampoTexto
                  etiqueta="Día del mes"
                  type="number"
                  min={1}
                  max={31}
                  value={parametros.dia}
                  onChange={(evento) => actualizarParametros({ dia: Number(evento.target.value) })}
                  ayuda="El plan de mantenimiento se aplica a este día"
                />

                <CampoSelect
                  etiqueta="Hora de inicio del turno"
                  value={String(parametros.horaInicio)}
                  onChange={(evento) => actualizarParametros({ horaInicio: Number(evento.target.value) })}
                  opciones={Array.from({ length: 24 }, (_, hora) => ({
                    valor: String(hora),
                    etiqueta: `${String(hora).padStart(2, "0")}:00${[7, 15, 23].includes(hora) ? " · cambio de turno" : ""}`,
                  }))}
                />

                <CampoTexto
                  etiqueta="Ventana de pedidos (horas)"
                  type="number"
                  min={1}
                  max={24}
                  value={parametros.ventanaHoras}
                  onChange={(evento) => actualizarParametros({ ventanaHoras: Number(evento.target.value) })}
                  ayuda="Pedidos registrados dentro de esta ventana"
                />

                <CampoTexto
                  etiqueta="Máximo de pedidos"
                  type="number"
                  min={1}
                  max={400}
                  value={parametros.maximoPedidos}
                  onChange={(evento) => actualizarParametros({ maximoPedidos: Number(evento.target.value) })}
                  ayuda="Acota el tiempo de cómputo del algoritmo"
                />

                <CampoSelect
                  etiqueta="Algoritmo"
                  value={parametros.algoritmo}
                  onChange={(evento) =>
                    actualizarParametros({ algoritmo: evento.target.value as AlgoritmoSolicitado })
                  }
                  opciones={ALGORITMOS.map((algoritmo) => ({ valor: algoritmo.valor, etiqueta: algoritmo.etiqueta }))}
                />
              </div>
            </section>

            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Flota y aleatoriedad</h2>
                  <p className="tarjeta__contexto">
                    El tamaño de la flota se configura antes de iniciar la ejecución y permanece fijo mientras dura
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo consola__rejilla">
                <CampoTexto
                  etiqueta="Autos (TA)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="10 por configuración"
                  value={parametros.cantidadAutos ?? ""}
                  onChange={(evento) =>
                    actualizarParametros({ cantidadAutos: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="24 paquetes · 40 km/h · S/ 8,00 por km"
                />
                <CampoTexto
                  etiqueta="Motos (TM)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="15 por configuración"
                  value={parametros.cantidadMotos ?? ""}
                  onChange={(evento) =>
                    actualizarParametros({ cantidadMotos: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="8 paquetes · 25 km/h · S/ 6,00 por km"
                />
                <CampoTexto
                  etiqueta="Bicicletas (TB)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="12 por configuración"
                  value={parametros.cantidadBicicletas ?? ""}
                  onChange={(evento) =>
                    actualizarParametros({ cantidadBicicletas: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="4 paquetes · 12 km/h · S/ 3,00 por km"
                />
                <CampoTexto
                  etiqueta="Semilla aleatoria"
                  type="number"
                  placeholder="La configurada en application.yml"
                  value={parametros.semilla ?? ""}
                  onChange={(evento) => actualizarParametros({ semilla: aNumeroOpcional(evento.target.value) })}
                  ayuda="La misma semilla devuelve exactamente el mismo plan"
                />
              </div>
            </section>

            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Averías inyectadas</h2>
                  <p className="tarjeta__contexto">
                    Una avería deja la unidad fuera de servicio; su carga se reasigna atendiendo primero al pedido más
                    crítico
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo">
                <div className="consola__averia-nueva">
                  <CampoTexto
                    etiqueta="Unidad"
                    value={nuevaAveria.codigoUnidad}
                    placeholder="TA01"
                    onChange={(evento) =>
                      setNuevaAveria({ ...nuevaAveria, codigoUnidad: evento.target.value.toUpperCase() })
                    }
                  />
                  <CampoSelect
                    etiqueta="Tipo de avería"
                    value={nuevaAveria.tipo}
                    onChange={(evento) => setNuevaAveria({ ...nuevaAveria, tipo: evento.target.value as TipoAveria })}
                    opciones={TIPOS_AVERIA.map((tipo) => ({ valor: tipo.valor, etiqueta: tipo.etiqueta }))}
                  />
                  <CampoTexto
                    etiqueta="Hora del día"
                    type="number"
                    min={0}
                    max={23}
                    value={nuevaAveria.hora}
                    onChange={(evento) => setNuevaAveria({ ...nuevaAveria, hora: Number(evento.target.value) })}
                  />
                  <Boton
                    variante="secundario"
                    icono={<Plus size={15} />}
                    onClick={() =>
                      agregarAveria({
                        codigoUnidad: nuevaAveria.codigoUnidad,
                        tipo: nuevaAveria.tipo,
                        minutoSimulacion: (parametros.dia - 1) * 1440 + nuevaAveria.hora * 60,
                      })
                    }
                  >
                    Agregar
                  </Boton>
                </div>

                {(parametros.averias ?? []).length === 0 ? (
                  <p className="texto-tenue consola__sin-averias">
                    Ninguna avería inyectada. La ejecución transcurre sin incidencias en las unidades.
                  </p>
                ) : (
                  <ul className="consola__averias">
                    {(parametros.averias ?? []).map((averia, indice) => (
                      <li key={`${averia.codigoUnidad}-${averia.minutoSimulacion}`}>
                        <TriangleAlert size={14} aria-hidden />
                        <span className="cifra">{averia.codigoUnidad}</span>
                        <span>{TIPOS_AVERIA.find((tipo) => tipo.valor === averia.tipo)?.etiqueta}</span>
                        <span className="cifra texto-tenue">
                          {formatearTiempoSimulado(averia.minutoSimulacion)}
                        </span>
                        <Boton
                          variante="fantasma"
                          soloIcono
                          onClick={() => quitarAveria(indice)}
                          aria-label={`Quitar la avería de ${averia.codigoUnidad}`}
                          icono={<Trash2 size={14} />}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        ) : modoSimulacion === "5D" ? (
          /* ======================================================== 5 DÍAS */
          <>
            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Conjunto de datos y rango de 5 días</h2>
                  <p className="tarjeta__contexto">
                    Planificación continua de 15 turnos de 8 horas con recarga de almacenes a las 23:59:59
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo consola__rejilla">
                <div className="consola__info-5d">
                  <div className="consola__info-5d-titulo">
                    <Calendar size={16} aria-hidden />
                    <span>
                      Rango seleccionado: Día {parametros5D.diaInicio} al Día {parametros5D.diaInicio + 4} (5 días consecutivos · 120 horas)
                    </span>
                  </div>
                  <p className="consola__info-5d-desc">
                    Cubre 15 turnos de trabajo continuos (07:00, 15:00 y 23:00) con recarga de los 2 almacenes intermedios (capacidad máx. 1,000 u) cada 24 horas a las 23:59:59
                  </p>
                </div>

                <CampoSelect
                  etiqueta="Mes de operación"
                  value={parametros5D.archivoVentas}
                  onChange={(evento) => actualizarParametros5D({ archivoVentas: evento.target.value })}
                  opciones={conjuntos.map((conjunto) => ({
                    valor: conjunto.archivoVentas,
                    etiqueta: `${MESES[conjunto.mes - 1]} ${conjunto.anio} · ${conjunto.archivoVentas}`,
                  }))}
                  ayuda={conjuntos.length === 0 ? "Cargando el catálogo del backend…" : undefined}
                />

                <CampoTexto
                  etiqueta="Día de inicio (1 a 27)"
                  type="number"
                  min={1}
                  max={27}
                  value={parametros5D.diaInicio}
                  onChange={(evento) => {
                    const dia = Math.min(27, Math.max(1, Number(evento.target.value) || 1));
                    actualizarParametros5D({ diaInicio: dia });
                  }}
                  ayuda={`Simulará desde el día ${parametros5D.diaInicio} hasta el día ${parametros5D.diaInicio + 4}`}
                />

                <CampoSelect
                  etiqueta="Hora de inicio del primer turno"
                  value={String(parametros5D.horaInicio)}
                  onChange={(evento) => actualizarParametros5D({ horaInicio: Number(evento.target.value) })}
                  opciones={[
                    { valor: "7", etiqueta: "07:00 · Primer turno estándar (Recomendado)" },
                    { valor: "15", etiqueta: "15:00 · Segundo turno" },
                    { valor: "23", etiqueta: "23:00 · Tercer turno" },
                  ]}
                  ayuda="Los 15 turnos se sucederán cada 8 horas a partir de esta hora"
                />

                <CampoTexto
                  etiqueta="Máximo de pedidos por turno"
                  type="number"
                  min={1}
                  max={300}
                  value={parametros5D.maximoPedidosPorTurno ?? ""}
                  onChange={(evento) =>
                    actualizarParametros5D({ maximoPedidosPorTurno: Number(evento.target.value) })
                  }
                  ayuda="Acota la demanda ingresada a cada turno de 8 horas"
                />

                <CampoSelect
                  etiqueta="Algoritmo"
                  value={parametros5D.algoritmo}
                  onChange={(evento) =>
                    actualizarParametros5D({ algoritmo: evento.target.value as AlgoritmoSolicitado })
                  }
                  opciones={ALGORITMOS.map((algoritmo) => ({ valor: algoritmo.valor, etiqueta: algoritmo.etiqueta }))}
                />
              </div>
            </section>

            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Flota y aleatoriedad</h2>
                  <p className="tarjeta__contexto">
                    El tamaño de la flota se configura antes de iniciar la ejecución de 5 días y permanece fijo mientras dura
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo consola__rejilla">
                <CampoTexto
                  etiqueta="Autos (TA)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="10 por configuración"
                  value={parametros5D.cantidadAutos ?? ""}
                  onChange={(evento) =>
                    actualizarParametros5D({ cantidadAutos: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="24 paquetes · 40 km/h · S/ 8,00 por km"
                />
                <CampoTexto
                  etiqueta="Motos (TM)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="15 por configuración"
                  value={parametros5D.cantidadMotos ?? ""}
                  onChange={(evento) =>
                    actualizarParametros5D({ cantidadMotos: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="8 paquetes · 25 km/h · S/ 6,00 por km"
                />
                <CampoTexto
                  etiqueta="Bicicletas (TB)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="12 por configuración"
                  value={parametros5D.cantidadBicicletas ?? ""}
                  onChange={(evento) =>
                    actualizarParametros5D({ cantidadBicicletas: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="4 paquetes · 12 km/h · S/ 3,00 por km"
                />
                <CampoTexto
                  etiqueta="Semilla aleatoria"
                  type="number"
                  placeholder="La configurada en application.yml"
                  value={parametros5D.semilla ?? ""}
                  onChange={(evento) =>
                    actualizarParametros5D({ semilla: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="Semilla base: cada turno deriva una semilla determinista para reproducibilidad"
                />
              </div>
            </section>

            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Averías inyectadas en los 5 días</h2>
                  <p className="tarjeta__contexto">
                    Inyecte averías programadas en cualquiera de los 5 días de la simulación continua
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo">
                <div className="consola__averia-nueva-5d">
                  <CampoSelect
                    etiqueta="Día de la avería"
                    value={String(nuevaAveria5D.dia)}
                    onChange={(evento) =>
                      setNuevaAveria5D({ ...nuevaAveria5D, dia: Number(evento.target.value) })
                    }
                    opciones={diasOpciones5D}
                  />
                  <CampoTexto
                    etiqueta="Unidad"
                    value={nuevaAveria5D.codigoUnidad}
                    placeholder="TA01"
                    onChange={(evento) =>
                      setNuevaAveria5D({
                        ...nuevaAveria5D,
                        codigoUnidad: evento.target.value.toUpperCase(),
                      })
                    }
                  />
                  <CampoSelect
                    etiqueta="Tipo de avería"
                    value={nuevaAveria5D.tipo}
                    onChange={(evento) =>
                      setNuevaAveria5D({ ...nuevaAveria5D, tipo: evento.target.value as TipoAveria })
                    }
                    opciones={TIPOS_AVERIA.map((tipo) => ({ valor: tipo.valor, etiqueta: tipo.etiqueta }))}
                  />
                  <CampoTexto
                    etiqueta="Hora del día"
                    type="number"
                    min={0}
                    max={23}
                    value={nuevaAveria5D.hora}
                    onChange={(evento) =>
                      setNuevaAveria5D({ ...nuevaAveria5D, hora: Number(evento.target.value) })
                    }
                  />
                  <Boton
                    variante="secundario"
                    icono={<Plus size={15} />}
                    onClick={() =>
                      agregarAveria5D({
                        codigoUnidad: nuevaAveria5D.codigoUnidad,
                        tipo: nuevaAveria5D.tipo,
                        dia: nuevaAveria5D.dia,
                        hora: nuevaAveria5D.hora,
                      })
                    }
                  >
                    Agregar
                  </Boton>
                </div>

                {(parametros5D.averias ?? []).length === 0 ? (
                  <p className="texto-tenue consola__sin-averias">
                    Ninguna avería inyectada para los 5 días. La ejecución transcurre sin incidencias en las unidades.
                  </p>
                ) : (
                  <ul className="consola__averias">
                    {(parametros5D.averias ?? []).map((averia, indice) => {
                      const minSim = (averia.dia - 1) * 1440 + averia.hora * 60;
                      return (
                        <li key={`5d-${averia.codigoUnidad}-${averia.dia}-${averia.hora}-${indice}`}>
                          <TriangleAlert size={14} aria-hidden />
                          <span className="cifra">
                            Día {averia.dia} · {String(averia.hora).padStart(2, "0")}:00
                          </span>
                          <span>
                            <strong className="cifra">{averia.codigoUnidad}</strong> —{" "}
                            {TIPOS_AVERIA.find((tipo) => tipo.valor === averia.tipo)?.etiqueta}
                          </span>
                          <span className="cifra texto-tenue">{formatearTiempoSimulado(minSim)}</span>
                          <Boton
                            variante="fantasma"
                            soloIcono
                            onClick={() => quitarAveria5D(indice)}
                            aria-label={`Quitar avería de ${averia.codigoUnidad}`}
                            icono={<Trash2 size={14} />}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </>
        ) : (
          /* ============================================== HASTA EL COLAPSO */
          <>
            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Parámetros de inicio y colapso logístico</h2>
                  <p className="tarjeta__contexto">
                    Ejecución continua turno a turno (cada 8 h) que solo se detiene ante la imposibilidad de asegurar los plazos
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo consola__rejilla">
                <div className="consola__info-colapso">
                  <div className="consola__info-colapso-titulo">
                    <TriangleAlert size={16} aria-hidden />
                    <span>
                      Criterio de Colapso Logístico
                    </span>
                  </div>
                  <p className="consola__info-colapso-desc">
                    La simulación avanza de forma continua cada 8 horas (07:00, 15:00 y 23:00) con descanso para refrigerio y recarga de almacenes intermedios cada 24 horas a las 23:59:59. Se detiene <strong>únicamente cuando el sistema o la flota ya no son capaces de asegurar que los pedidos lleguen a los clientes dentro del plazo comprometido</strong>: un máximo de 36 horas para pedidos regulares, o 4, 8, 12 o 18 horas para entregas priorizadas.
                  </p>
                </div>

                <CampoSelect
                  etiqueta="Mes de operación"
                  value={parametrosColapso.archivoVentas}
                  onChange={(evento) => actualizarParametrosColapso({ archivoVentas: evento.target.value })}
                  opciones={conjuntos.map((conjunto) => ({
                    valor: conjunto.archivoVentas,
                    etiqueta: `${MESES[conjunto.mes - 1]} ${conjunto.anio} · ${conjunto.archivoVentas}`,
                  }))}
                  ayuda={conjuntos.length === 0 ? "Cargando el catálogo del backend…" : undefined}
                />

                <CampoTexto
                  etiqueta="Día de inicio (1 a 31)"
                  type="number"
                  min={1}
                  max={31}
                  value={parametrosColapso.diaInicio}
                  onChange={(evento) => {
                    const dia = Math.min(31, Math.max(1, Number(evento.target.value) || 1));
                    actualizarParametrosColapso({ diaInicio: dia });
                  }}
                  ayuda={`La simulación continua comenzará en el día ${parametrosColapso.diaInicio} y correrá hasta el colapso`}
                />

                <CampoSelect
                  etiqueta="Hora de inicio del primer turno"
                  value={String(parametrosColapso.horaInicio ?? 7)}
                  onChange={(evento) => actualizarParametrosColapso({ horaInicio: Number(evento.target.value) })}
                  opciones={[
                    { valor: "7", etiqueta: "07:00 · Primer turno estándar (Recomendado)" },
                    { valor: "15", etiqueta: "15:00 · Segundo turno" },
                    { valor: "23", etiqueta: "23:00 · Tercer turno" },
                  ]}
                  ayuda="Los turnos se sucederán de forma continua cada 8 horas a partir de esta hora"
                />

                <CampoTexto
                  etiqueta="Máximo de pedidos por turno"
                  type="number"
                  min={1}
                  max={400}
                  value={parametrosColapso.maximoPedidosPorTurno ?? ""}
                  onChange={(evento) =>
                    actualizarParametrosColapso({ maximoPedidosPorTurno: Number(evento.target.value) })
                  }
                  ayuda="Límite de pedidos ingresados a cada turno de 8 horas (por defecto 60)"
                />

                <CampoSelect
                  etiqueta="Algoritmo"
                  value={parametrosColapso.algoritmo}
                  onChange={(evento) =>
                    actualizarParametrosColapso({ algoritmo: evento.target.value as AlgoritmoSolicitado })
                  }
                  opciones={ALGORITMOS.map((algoritmo) => ({ valor: algoritmo.valor, etiqueta: algoritmo.etiqueta }))}
                />
              </div>
            </section>

            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Flota y aleatoriedad</h2>
                  <p className="tarjeta__contexto">
                    Flota heterogénea disponible durante la simulación continua hasta el colapso
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo consola__rejilla">
                <CampoTexto
                  etiqueta="Autos (TA)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="10 por configuración"
                  value={parametrosColapso.cantidadAutos ?? ""}
                  onChange={(evento) =>
                    actualizarParametrosColapso({ cantidadAutos: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="24 paquetes · 40 km/h · S/ 8,00 por km"
                />
                <CampoTexto
                  etiqueta="Motos (TM)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="15 por configuración"
                  value={parametrosColapso.cantidadMotos ?? ""}
                  onChange={(evento) =>
                    actualizarParametrosColapso({ cantidadMotos: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="8 paquetes · 25 km/h · S/ 6,00 por km"
                />
                <CampoTexto
                  etiqueta="Bicicletas (TB)"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="12 por configuración"
                  value={parametrosColapso.cantidadBicicletas ?? ""}
                  onChange={(evento) =>
                    actualizarParametrosColapso({ cantidadBicicletas: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="4 paquetes · 12 km/h · S/ 3,00 por km"
                />
                <CampoTexto
                  etiqueta="Semilla aleatoria"
                  type="number"
                  placeholder="La configurada en application.yml"
                  value={parametrosColapso.semilla ?? ""}
                  onChange={(evento) =>
                    actualizarParametrosColapso({ semilla: aNumeroOpcional(evento.target.value) })
                  }
                  ayuda="Semilla base determinista para reproducibilidad de la corrida"
                />
              </div>
            </section>

            <section className="tarjeta">
              <header className="tarjeta__encabezado">
                <div>
                  <h2 className="tarjeta__titulo">Averías inyectadas</h2>
                  <p className="tarjeta__contexto">
                    Inyecte averías programadas para evaluar su impacto en la resistencia de la flota ante el colapso
                  </p>
                </div>
              </header>

              <div className="tarjeta__cuerpo">
                <div className="consola__averia-nueva-5d">
                  <CampoSelect
                    etiqueta="Día de la avería"
                    value={String(nuevaAveriaColapso.dia)}
                    onChange={(evento) =>
                      setNuevaAveriaColapso({ ...nuevaAveriaColapso, dia: Number(evento.target.value) })
                    }
                    opciones={diasOpcionesColapso}
                  />
                  <CampoTexto
                    etiqueta="Unidad"
                    value={nuevaAveriaColapso.codigoUnidad}
                    placeholder="TA01"
                    onChange={(evento) =>
                      setNuevaAveriaColapso({
                        ...nuevaAveriaColapso,
                        codigoUnidad: evento.target.value.toUpperCase(),
                      })
                    }
                  />
                  <CampoSelect
                    etiqueta="Tipo de avería"
                    value={nuevaAveriaColapso.tipo}
                    onChange={(evento) =>
                      setNuevaAveriaColapso({ ...nuevaAveriaColapso, tipo: evento.target.value as TipoAveria })
                    }
                    opciones={TIPOS_AVERIA.map((tipo) => ({ valor: tipo.valor, etiqueta: tipo.etiqueta }))}
                  />
                  <CampoTexto
                    etiqueta="Hora del día"
                    type="number"
                    min={0}
                    max={23}
                    value={nuevaAveriaColapso.hora}
                    onChange={(evento) =>
                      setNuevaAveriaColapso({ ...nuevaAveriaColapso, hora: Number(evento.target.value) })
                    }
                  />
                  <Boton
                    variante="secundario"
                    icono={<Plus size={15} />}
                    onClick={() =>
                      agregarAveriaColapso({
                        codigoUnidad: nuevaAveriaColapso.codigoUnidad,
                        tipo: nuevaAveriaColapso.tipo,
                        dia: nuevaAveriaColapso.dia,
                        hora: nuevaAveriaColapso.hora,
                      })
                    }
                  >
                    Agregar
                  </Boton>
                </div>

                {(parametrosColapso.averias ?? []).length === 0 ? (
                  <p className="texto-tenue consola__sin-averias">
                    Ninguna avería inyectada. La simulación continuará evaluando el flujo regular de pedidos y bloqueos del mes.
                  </p>
                ) : (
                  <ul className="consola__averias">
                    {(parametrosColapso.averias ?? []).map((averia, indice) => {
                      const minSim = (averia.dia - 1) * 1440 + averia.hora * 60;
                      return (
                        <li key={`colapso-${averia.codigoUnidad}-${averia.dia}-${averia.hora}-${indice}`}>
                          <TriangleAlert size={14} aria-hidden />
                          <span className="cifra">
                            Día {averia.dia} · {String(averia.hora).padStart(2, "0")}:00
                          </span>
                          <span>
                            <strong className="cifra">{averia.codigoUnidad}</strong> —{" "}
                            {TIPOS_AVERIA.find((tipo) => tipo.valor === averia.tipo)?.etiqueta}
                          </span>
                          <span className="cifra texto-tenue">{formatearTiempoSimulado(minSim)}</span>
                          <Boton
                            variante="fantasma"
                            soloIcono
                            onClick={() => quitarAveriaColapso(indice)}
                            aria-label={`Quitar avería de ${averia.codigoUnidad}`}
                            icono={<Trash2 size={14} />}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}

        <PanelPedidosAdicionales
          key={`${modoSimulacion}-${referenciaPedidos.dia}-${referenciaPedidos.hora}`}
          diaPorDefecto={referenciaPedidos.dia}
          horaPorDefecto={referenciaPedidos.hora}
          minutoPorDefecto={referenciaPedidos.minuto}
          capacidadMaxima={capacidadMaxima}
          accionExtra={
            modoSimulacion === "DIA" && tiempoReal
              ? { etiqueta: "Replanificar con los pedidos registrados", onClick: handleEjecutar, deshabilitado: cargando }
              : undefined
          }
        />

        {escenario && (
          <section className="tarjeta">
            <header className="tarjeta__encabezado">
              <div>
                <h2 className="tarjeta__titulo">Última ejecución</h2>
                <p className="tarjeta__contexto">
                  {escenario.archivoVentas} ·{" "}
                  {escenario.colapsoOcurrido !== undefined
                    ? `Simulación hasta el colapso (desde día ${escenario.dia}) · ${escenario.colapsoOcurrido ? `¡Colapso el ${escenario.fechaHoraColapso}!` : "Operación estable"}`
                    : escenario.minutoFin - escenario.minutoInicio > 1440
                      ? `5 días (días ${escenario.dia} a ${escenario.dia + 4}) · ${formatearTiempoSimulado(escenario.minutoInicio)} a ${formatearTiempoSimulado(escenario.minutoFin)}`
                      : `día ${escenario.dia} · ${formatearTiempoSimulado(escenario.minutoInicio)} a ${formatearTiempoSimulado(escenario.minutoFin)}`}{" "}
                  · semilla {escenario.semilla}
                </p>
              </div>
              <Boton variante="secundario" onClick={() => navegar("/")}>
                Ver en el Centro de Control
              </Boton>
            </header>

            <div className="tarjeta__cuerpo">
              <div className="consola__indicadores">
                {ejecuciones.map((ejecucion) => (
                  <Indicador
                    key={ejecucion.algoritmo}
                    rotulo={ejecucion.algoritmo}
                    valor={formatearSoles(ejecucion.metricas.costoOperativoTotal)}
                    detalle={`${ejecucion.metricas.pedidosAtendidos}/${ejecucion.metricas.pedidosDelTurno} pedidos · ${ejecucion.metricas.unidadesEnRuta
                      } rutas · ${formatearMilisegundos(ejecucion.metricas.duracionComputoMs)}`}
                  />
                ))}
              </div>

              <h3 className="rotulo consola__subtitulo">Carga de los archivos del cliente</h3>
              <ul className="consola__cargas">
                {escenario.cargas.map((carga) => (
                  <li key={carga.archivo}>
                    <FileText size={14} aria-hidden />
                    <span className="consola__archivo">{carga.archivo}</span>
                    <span className="cifra">
                      {carga.leidos} leídos · {carga.aceptados} aceptados ·{" "}
                      <span className={carga.rechazados > 0 ? "plazo--critica" : "plazo--cumplido"}>
                        {carga.rechazados} rechazados
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

function aNumeroOpcional(valor: string): number | null {
  return valor.trim() === "" ? null : Number(valor);
}

export default ConsolaSimulacionPage;
