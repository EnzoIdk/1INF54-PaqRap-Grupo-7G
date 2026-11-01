import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorSmartphone, RefreshCw } from "lucide-react";
import Boton from "../comunes/Boton";
import {
  experimentacionService,
  type EstadoPlanificador,
  type SimulacionCompartida,
} from "../../services/experimentacionService";
import { useSimulacionStore } from "../../store/simulacionStore";
import { formatearSoles } from "../../utils/formatters";
import { fechaSimulada } from "../comunes/RelojSimulacion";
import "./PanelesConsola.css";

const ETIQUETA_MODO: Record<SimulacionCompartida["modo"], string> = {
  "1D": "1 día",
  "5D": "5 días",
  COLAPSO: "Hasta el colapso",
  DIA_A_DIA: "Día a día",
};

const INTERVALO_MS = 10_000;

/**
 * Simulaciones planificadas desde cualquier navegador (rúbrica C05, C06,
 * G06). Abrir una aquí carga el mismo plan sin volver a ejecutar el
 * planificador; cada navegador lo reproduce con su propio reloj, filtros y
 * selección, de modo que lo que haga uno no afecta a los demás.
 */
const SimulacionesCompartidas = () => {
  const navegar = useNavigate();
  const registrarResultado = useSimulacionStore((estado) => estado.registrarResultado);
  const setModoSimulacion = useSimulacionStore((estado) => estado.setModoSimulacion);
  const [simulaciones, setSimulaciones] = useState<SimulacionCompartida[]>([]);
  const [estado, setEstado] = useState<EstadoPlanificador | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const actualizar = useCallback(async () => {
    try {
      const [lista, carga] = await Promise.all([
        experimentacionService.listarCompartidas(),
        experimentacionService.estadoPlanificador(),
      ]);
      setSimulaciones(lista);
      setEstado(carga);
    } catch {
      // La lista es informativa: si falla, se reintenta en el siguiente ciclo.
    }
  }, []);

  useEffect(() => {
    void actualizar();
    const intervalo = window.setInterval(() => void actualizar(), INTERVALO_MS);
    return () => window.clearInterval(intervalo);
  }, [actualizar]);

  const abrir = async (simulacion: SimulacionCompartida) => {
    setError("");
    setAbriendo(simulacion.id);
    try {
      const resultado = await experimentacionService.obtenerCompartida(simulacion.id);
      setModoSimulacion(simulacion.modo === "DIA_A_DIA" ? "1D" : simulacion.modo);
      registrarResultado(resultado);
      navegar("/");
    } catch {
      setError("No se pudo abrir esa simulación; puede que ya no esté disponible.");
      void actualizar();
    } finally {
      setAbriendo(null);
    }
  };

  return (
    <section className="tarjeta compartidas">
      <header className="tarjeta__encabezado">
        <div>
          <h2 className="tarjeta__titulo">
            <MonitorSmartphone size={16} aria-hidden /> Simulaciones compartidas
          </h2>
          <p className="tarjeta__contexto">
            Abre en este navegador un plan que ya resolvió el planificador (aquí o en otro dispositivo) y
            reprodúcelo con tu propio reloj y filtros.
          </p>
        </div>
        <div className="compartidas__estado">
          {estado && (
            <span
              className={`compartidas__carga ${estado.enCurso >= estado.capacidad ? "compartidas__carga--llena" : ""}`}
              title="Corridas del planificador en este momento"
            >
              Planificador: {estado.enCurso}/{estado.capacidad} en curso
              {estado.enEspera > 0 ? ` · ${estado.enEspera} en espera` : ""}
            </span>
          )}
          <Boton
            variante="fantasma"
            soloIcono
            icono={<RefreshCw size={15} aria-hidden />}
            aria-label="Actualizar la lista"
            onClick={() => void actualizar()}
          />
        </div>
      </header>

      {error && <p className="compartidas__error" role="alert">{error}</p>}

      {simulaciones.length === 0 ? (
        <p className="texto-tenue compartidas__vacio">
          Todavía no hay simulaciones. Cuando alguien ejecute una, aparecerá aquí para todos.
        </p>
      ) : (
        <ul className="compartidas__lista">
          {simulaciones.map((simulacion) => (
            <li key={simulacion.id}>
              <span className="compartidas__modo">{ETIQUETA_MODO[simulacion.modo]}</span>
              <span className="compartidas__detalle">
                <strong>{simulacion.archivoVentas}</strong> · desde{" "}
                <span className="cifra">
                  {fechaSimulada(simulacion.anio, simulacion.mes, simulacion.minutoInicio)}
                </span>{" "}
                · {simulacion.pedidos} pedidos · {simulacion.algoritmos.join(" / ")} ·{" "}
                {formatearSoles(simulacion.mejorCosto)}
                {simulacion.colapso && <span className="compartidas__colapso"> · colapso</span>}
              </span>
              <span className="compartidas__autor texto-tenue">
                {simulacion.autor} · {new Date(simulacion.creada).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Boton
                variante="secundario"
                disabled={abriendo !== null}
                onClick={() => void abrir(simulacion)}
              >
                {abriendo === simulacion.id ? "Abriendo…" : "Abrir aquí"}
              </Boton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SimulacionesCompartidas;
