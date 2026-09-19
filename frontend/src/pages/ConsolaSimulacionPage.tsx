import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CirclePlay, FileText, Plus, TriangleAlert, Trash2 } from "lucide-react";
import Encabezado from "../components/layout/Encabezado";
import Boton from "../components/comunes/Boton";
import Indicador from "../components/comunes/Indicador";
import { CampoSelect, CampoTexto } from "../components/comunes/Campo";
import { useExperimentacion } from "../hooks/useExperimentacion";
import { useSimulacionStore } from "../store/simulacionStore";
import type { AlgoritmoSolicitado, TipoAveria } from "../types/Experimentacion";
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

/**
 * Consola de la experimentacion numerica: elige el mes de los archivos del
 * cliente, el turno a planificar, el tamaño de la flota y el algoritmo, y
 * lanza la ejecucion. Al terminar, el plan queda disponible en el Centro de
 * Control para reproducirlo sobre el mapa.
 */
const ConsolaSimulacionPage = () => {
  const navegar = useNavigate();
  const { conjuntos, parametros, cargando, error, ejecutar } = useExperimentacion();
  const actualizarParametros = useSimulacionStore((estado) => estado.actualizarParametros);
  const agregarAveria = useSimulacionStore((estado) => estado.agregarAveria);
  const quitarAveria = useSimulacionStore((estado) => estado.quitarAveria);
  const escenario = useSimulacionStore((estado) => estado.escenario);
  const ejecuciones = useSimulacionStore((estado) => estado.ejecuciones);

  const [nuevaAveria, setNuevaAveria] = useState({ codigoUnidad: "TA01", tipo: "TIPO_2" as TipoAveria, hora: 10 });

  const handleEjecutar = async () => {
    const resultado = await ejecutar();
    if (resultado) {
      navegar("/");
    }
  };

  return (
    <div className="consola">
      <Encabezado
        titulo="Consola de Simulación"
        contexto="Experimentación numérica sobre los archivos de ventas, bloqueos y mantenimiento del cliente"
        acciones={
          <Boton variante="accion" onClick={handleEjecutar} disabled={cargando} icono={<CirclePlay size={16} />}>
            {cargando ? "Ejecutando…" : "Ejecutar planificación"}
          </Boton>
        }
      />

      <div className="consola__cuerpo desplazable">
        {error && (
          <div className="consola__error">
            <TriangleAlert size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

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

        {escenario && (
          <section className="tarjeta">
            <header className="tarjeta__encabezado">
              <div>
                <h2 className="tarjeta__titulo">Última ejecución</h2>
                <p className="tarjeta__contexto">
                  {escenario.archivoVentas} · día {escenario.dia} ·{" "}
                  {formatearTiempoSimulado(escenario.minutoInicio)} a {formatearTiempoSimulado(escenario.minutoFin)}{" "}
                  · semilla {escenario.semilla}
                </p>
              </div>
              <Boton variante="secundario" onClick={() => navegar("/")}>
                Ver en el mapa
              </Boton>
            </header>

            <div className="tarjeta__cuerpo">
              <div className="consola__indicadores">
                {ejecuciones.map((ejecucion) => (
                  <Indicador
                    key={ejecucion.algoritmo}
                    rotulo={ejecucion.algoritmo}
                    valor={formatearSoles(ejecucion.metricas.costoOperativoTotal)}
                    detalle={`${ejecucion.metricas.pedidosAtendidos}/${ejecucion.metricas.pedidosDelTurno} pedidos · ${
                      ejecucion.metricas.unidadesEnRuta
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
