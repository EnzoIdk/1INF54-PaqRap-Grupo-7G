import { useRef, useState } from "react";
import { FileUp, PackagePlus, Trash2 } from "lucide-react";
import Boton from "../comunes/Boton";
import { CampoSelect, CampoTexto } from "../comunes/Campo";
import { useSimulacionStore } from "../../store/simulacionStore";
import type { PedidoAdicional } from "../../types/Experimentacion";
import { formatearTiempoSimulado } from "../../utils/formatters";
import "./PanelesConsola.css";

/** Plazos permitidos: 36 h el regular y 4, 8, 12 o 18 h el priorizado (RF-02, RF-03). */
const OPCIONES_PLAZO = [
  { valor: "36", etiqueta: "Regular · 36 h" },
  { valor: "18", etiqueta: "Priorizado · 18 h" },
  { valor: "12", etiqueta: "Priorizado · 12 h" },
  { valor: "8", etiqueta: "Priorizado · 8 h" },
  { valor: "4", etiqueta: "Priorizado · 4 h" },
];
const PLAZOS_VALIDOS = OPCIONES_PLAZO.map((opcion) => Number(opcion.valor));

/** Registro del archivo de ventas: ##d##h##m:posX,posY,cIdCliente,qq,hl */
const PATRON_REGISTRO = /^(\d{2})d(\d{2})h(\d{2})m:(\d{1,2}),(\d{1,2}),(c?\d{1,8}),(\d{1,3}),(\d{1,2})$/i;
const MAXIMO_RECHAZOS_MOSTRADOS = 5;

interface Formulario {
  clienteId: string;
  posX: string;
  posY: string;
  cantidadProducto: string;
  plazoHoras: string;
  dia: string;
  hora: string;
  minuto: string;
}

type Errores = Partial<Record<keyof Formulario, string>>;

interface PanelPedidosAdicionalesProps {
  /** Día y hora con que se precarga el formulario (el turno o el instante actual). */
  diaPorDefecto: number;
  horaPorDefecto: number;
  minutoPorDefecto?: number;
  /** Capacidad de la unidad más grande: un pedido mayor no se podría atender. */
  capacidadMaxima: number;
  /** Texto del botón de envío; en día a día también replanifica. */
  accionExtra?: { etiqueta: string; onClick: () => void; deshabilitado?: boolean };
}

/**
 * Pedidos que el usuario registra además de los del archivo del mes, uno a
 * uno (RF-01) o en bloque desde un archivo con el formato de ventas (RF-54).
 * Ningún pedido se guarda con campos obligatorios vacíos o fuera de rango
 * (RF-64); el backend vuelve a validarlos al planificar.
 */
const PanelPedidosAdicionales = ({
  diaPorDefecto,
  horaPorDefecto,
  minutoPorDefecto = 0,
  capacidadMaxima,
  accionExtra,
}: PanelPedidosAdicionalesProps) => {
  const pedidos = useSimulacionStore((estado) => estado.pedidosAdicionales);
  const agregarPedidos = useSimulacionStore((estado) => estado.agregarPedidosAdicionales);
  const quitarPedido = useSimulacionStore((estado) => estado.quitarPedidoAdicional);
  const limpiarPedidos = useSimulacionStore((estado) => estado.limpiarPedidosAdicionales);

  const formularioInicial = (): Formulario => ({
    clienteId: "",
    posX: "",
    posY: "",
    cantidadProducto: "",
    plazoHoras: "36",
    dia: String(diaPorDefecto),
    hora: String(horaPorDefecto),
    minuto: String(minutoPorDefecto),
  });

  const [formulario, setFormulario] = useState<Formulario>(formularioInicial);
  const [errores, setErrores] = useState<Errores>({});
  const [resumenArchivo, setResumenArchivo] = useState<{ aceptados: number; rechazos: string[] } | null>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);

  const cambiar = (campo: keyof Formulario, valor: string) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    if (errores[campo]) {
      setErrores((actuales) => ({ ...actuales, [campo]: undefined }));
    }
  };

  const registrar = () => {
    const validacion = validar(formulario, capacidadMaxima);
    setErrores(validacion);
    if (Object.keys(validacion).length > 0) {
      return;
    }
    agregarPedidos([aPedido(formulario)]);
    setFormulario({ ...formularioInicial(), dia: formulario.dia, hora: formulario.hora, minuto: formulario.minuto });
  };

  const cargarArchivo = async (archivo: File) => {
    const texto = await archivo.text();
    const aceptados: PedidoAdicional[] = [];
    const rechazos: string[] = [];
    texto
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0)
      .forEach((linea, indice) => {
        const resultado = interpretarRegistro(linea, capacidadMaxima);
        if (typeof resultado === "string") {
          rechazos.push(`Línea ${indice + 1}: ${resultado}`);
        } else {
          aceptados.push(resultado);
        }
      });
    agregarPedidos(aceptados);
    setResumenArchivo({ aceptados: aceptados.length, rechazos });
  };

  return (
    <section className="tarjeta">
      <header className="tarjeta__encabezado">
        <div>
          <h2 className="tarjeta__titulo">Pedidos registrados por el usuario</h2>
          <p className="tarjeta__contexto">
            Se suman a los pedidos del archivo del mes en la próxima ejecución, con el correlativo M-####. Todos los
            campos son obligatorios
          </p>
        </div>
        {pedidos.length > 0 && (
          <Boton variante="fantasma" onClick={limpiarPedidos} icono={<Trash2 size={14} />}>
            Quitar todos
          </Boton>
        )}
      </header>

      <div className="tarjeta__cuerpo">
        <div className="pedidos-adicionales__formulario">
          <CampoTexto
            etiqueta="Cliente"
            placeholder="c1234"
            value={formulario.clienteId}
            error={errores.clienteId}
            onChange={(evento) => cambiar("clienteId", evento.target.value)}
          />
          <CampoTexto
            etiqueta="X (0 a 70)"
            type="number"
            min={0}
            max={70}
            value={formulario.posX}
            error={errores.posX}
            onChange={(evento) => cambiar("posX", evento.target.value)}
          />
          <CampoTexto
            etiqueta="Y (0 a 50)"
            type="number"
            min={0}
            max={50}
            value={formulario.posY}
            error={errores.posY}
            onChange={(evento) => cambiar("posY", evento.target.value)}
          />
          <CampoTexto
            etiqueta="Cantidad"
            type="number"
            min={1}
            max={capacidadMaxima}
            value={formulario.cantidadProducto}
            error={errores.cantidadProducto}
            onChange={(evento) => cambiar("cantidadProducto", evento.target.value)}
          />
          <CampoSelect
            etiqueta="Plazo"
            value={formulario.plazoHoras}
            opciones={OPCIONES_PLAZO}
            onChange={(evento) => cambiar("plazoHoras", evento.target.value)}
          />
          <CampoTexto
            etiqueta="Día"
            type="number"
            min={1}
            max={31}
            value={formulario.dia}
            error={errores.dia}
            onChange={(evento) => cambiar("dia", evento.target.value)}
          />
          <CampoTexto
            etiqueta="Hora"
            type="number"
            min={0}
            max={23}
            value={formulario.hora}
            error={errores.hora}
            onChange={(evento) => cambiar("hora", evento.target.value)}
          />
          <CampoTexto
            etiqueta="Minuto"
            type="number"
            min={0}
            max={59}
            value={formulario.minuto}
            error={errores.minuto}
            onChange={(evento) => cambiar("minuto", evento.target.value)}
          />
        </div>

        <div className="pedidos-adicionales__acciones">
          <Boton variante="secundario" icono={<PackagePlus size={15} />} onClick={registrar}>
            Registrar pedido
          </Boton>
          <Boton
            variante="secundario"
            icono={<FileUp size={15} />}
            onClick={() => entradaArchivo.current?.click()}
          >
            Cargar archivo de pedidos
          </Boton>
          <input
            ref={entradaArchivo}
            type="file"
            accept=".txt,.csv,text/plain"
            hidden
            onChange={(evento) => {
              const archivo = evento.target.files?.[0];
              if (archivo) {
                void cargarArchivo(archivo);
              }
              evento.target.value = "";
            }}
          />
          {accionExtra && (
            <Boton variante="accion" onClick={accionExtra.onClick} disabled={accionExtra.deshabilitado}>
              {accionExtra.etiqueta}
            </Boton>
          )}
          <span className="texto-tenue pedidos-adicionales__ayuda">
            Archivo: un pedido por línea con el formato de ventas, p. ej. <span className="cifra">03d10h15m:45,43,c9167,6,8</span>
          </span>
        </div>

        {resumenArchivo && (
          <p className={`pedidos-adicionales__resumen ${resumenArchivo.rechazos.length > 0 ? "plazo--critica" : "plazo--cumplido"}`}>
            Archivo procesado: {resumenArchivo.aceptados} pedido(s) aceptado(s), {resumenArchivo.rechazos.length}{" "}
            rechazado(s).
            {resumenArchivo.rechazos.slice(0, MAXIMO_RECHAZOS_MOSTRADOS).map((rechazo) => (
              <span key={rechazo} className="pedidos-adicionales__rechazo">
                {rechazo}
              </span>
            ))}
          </p>
        )}

        {pedidos.length === 0 ? (
          <p className="texto-tenue consola__sin-averias">
            Ningún pedido registrado. La ejecución usa solo los pedidos del archivo del mes.
          </p>
        ) : (
          <ul className="consola__averias">
            {pedidos.map((pedido, indice) => (
              <li key={`${pedido.clienteId}-${indice}`}>
                <PackagePlus size={14} aria-hidden />
                <span className="cifra">M-{String(indice + 1).padStart(4, "0")}</span>
                <span>
                  <strong className="cifra">{pedido.clienteId}</strong> · ({pedido.posX}, {pedido.posY}) ·{" "}
                  {pedido.cantidadProducto} u · {pedido.plazoHoras} h
                </span>
                <span className="cifra texto-tenue">
                  {formatearTiempoSimulado((pedido.dia - 1) * 1440 + pedido.hora * 60 + pedido.minuto)}
                </span>
                <Boton
                  variante="fantasma"
                  soloIcono
                  onClick={() => quitarPedido(indice)}
                  aria-label={`Quitar el pedido de ${pedido.clienteId}`}
                  icono={<Trash2 size={14} />}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

function validar(formulario: Formulario, capacidadMaxima: number): Errores {
  const errores: Errores = {};
  if (!formulario.clienteId.trim()) {
    errores.clienteId = "Obligatorio";
  } else if (!/^c?\d{1,8}$/i.test(formulario.clienteId.trim())) {
    errores.clienteId = "Use la forma c1234";
  }
  const enteros: [keyof Formulario, number, number][] = [
    ["posX", 0, 70],
    ["posY", 0, 50],
    ["cantidadProducto", 1, capacidadMaxima],
    ["dia", 1, 31],
    ["hora", 0, 23],
    ["minuto", 0, 59],
  ];
  enteros.forEach(([campo, minimo, maximo]) => {
    const texto = formulario[campo].trim();
    if (texto === "") {
      errores[campo] = "Obligatorio";
      return;
    }
    const valor = Number(texto);
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
      errores[campo] = `Entre ${minimo} y ${maximo}`;
    }
  });
  if (!PLAZOS_VALIDOS.includes(Number(formulario.plazoHoras))) {
    errores.plazoHoras = "Plazo no permitido";
  }
  return errores;
}

function aPedido(formulario: Formulario): PedidoAdicional {
  const cliente = formulario.clienteId.trim().toLowerCase();
  return {
    clienteId: cliente.startsWith("c") ? cliente : `c${cliente}`,
    posX: Number(formulario.posX),
    posY: Number(formulario.posY),
    cantidadProducto: Number(formulario.cantidadProducto),
    plazoHoras: Number(formulario.plazoHoras),
    dia: Number(formulario.dia),
    hora: Number(formulario.hora),
    minuto: Number(formulario.minuto),
  };
}

/** Convierte una línea del archivo en un pedido, o devuelve el motivo del rechazo. */
function interpretarRegistro(linea: string, capacidadMaxima: number): PedidoAdicional | string {
  const coincidencia = PATRON_REGISTRO.exec(linea);
  if (!coincidencia) {
    return "formato inválido";
  }
  const [, dia, hora, minuto, x, y, cliente, cantidad, plazo] = coincidencia;
  const formulario: Formulario = {
    clienteId: cliente,
    posX: String(Number(x)),
    posY: String(Number(y)),
    cantidadProducto: String(Number(cantidad)),
    plazoHoras: String(Number(plazo)),
    dia: String(Number(dia)),
    hora: String(Number(hora)),
    minuto: String(Number(minuto)),
  };
  const errores = validar(formulario, capacidadMaxima);
  const primero = Object.entries(errores)[0];
  if (primero) {
    return `${primero[0]} ${String(primero[1]).toLowerCase()}`;
  }
  return aPedido(formulario);
}

export default PanelPedidosAdicionales;
