import { useEffect, useState } from "react";
import axios from "axios";
import { RotateCcw, Save } from "lucide-react";
import Boton from "../comunes/Boton";
import { CampoTexto } from "../comunes/Campo";
import type { ParametrosVigentes } from "../../types/Experimentacion";
import "./EditorParametros.css";

type Grupo = { titulo: string; seccion: "flota" | "almacen"; campos: { clave: string; etiqueta: string; paso?: string }[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Velocidad promedio (km/h)",
    seccion: "flota",
    campos: [
      { clave: "velocidadKmhAuto", etiqueta: "Auto" },
      { clave: "velocidadKmhMoto", etiqueta: "Moto" },
      { clave: "velocidadKmhBicicleta", etiqueta: "Bicicleta" },
    ],
  },
  {
    titulo: "Capacidad (paquetes)",
    seccion: "flota",
    campos: [
      { clave: "capacidadAuto", etiqueta: "Auto" },
      { clave: "capacidadMoto", etiqueta: "Moto" },
      { clave: "capacidadBicicleta", etiqueta: "Bicicleta" },
    ],
  },
  {
    titulo: "Costo por kilómetro (S/)",
    seccion: "flota",
    campos: [
      { clave: "costoKmAuto", etiqueta: "Auto", paso: "0.01" },
      { clave: "costoKmMoto", etiqueta: "Moto", paso: "0.01" },
      { clave: "costoKmBicicleta", etiqueta: "Bicicleta", paso: "0.01" },
    ],
  },
  {
    titulo: "Flota por defecto (unidades)",
    seccion: "flota",
    campos: [
      { clave: "cantidadAutos", etiqueta: "Autos" },
      { clave: "cantidadMotos", etiqueta: "Motos" },
      { clave: "cantidadBicicletas", etiqueta: "Bicicletas" },
    ],
  },
  {
    titulo: "Almacenes intermedios y semáforo",
    seccion: "almacen",
    campos: [
      { clave: "stockMaximo", etiqueta: "Stock máximo" },
      { clave: "stockMinimo", etiqueta: "Stock mínimo" },
      { clave: "umbralAmbarPorcentaje", etiqueta: "Umbral ámbar (0 a 1)", paso: "0.01" },
      { clave: "umbralRojoPorcentaje", etiqueta: "Umbral rojo (0 a 1)", paso: "0.01" },
    ],
  },
  {
    titulo: "Ubicación de los almacenes",
    seccion: "almacen",
    campos: [
      { clave: "centralX", etiqueta: "Central X" },
      { clave: "centralY", etiqueta: "Central Y" },
      { clave: "noroesteX", etiqueta: "Nor-Oeste X" },
      { clave: "noroesteY", etiqueta: "Nor-Oeste Y" },
      { clave: "esteX", etiqueta: "Este X" },
      { clave: "esteY", etiqueta: "Este Y" },
    ],
  },
];

interface EditorParametrosProps {
  vigentes: ParametrosVigentes;
  onGuardar: (flota: ParametrosVigentes["flota"], almacen: ParametrosVigentes["almacen"]) => Promise<unknown>;
  onRestablecer: () => Promise<unknown>;
}

type Borrador = { flota: Record<string, string>; almacen: Record<string, string> };

const aBorrador = (vigentes: ParametrosVigentes): Borrador => ({
  flota: Object.fromEntries(Object.entries(vigentes.flota).map(([clave, valor]) => [clave, String(valor)])),
  almacen: Object.fromEntries(Object.entries(vigentes.almacen).map(([clave, valor]) => [clave, String(valor)])),
});

/**
 * Edición "en caliente" de los parámetros de flota y almacenes, solo para el
 * rol ADMIN (RF-39, RF-56, RF-60, RF-61). Los cambios se aplican en la
 * siguiente planificación, sin reiniciar el sistema (Q&A 6, 15 y 16).
 */
const EditorParametros = ({ vigentes, onGuardar, onRestablecer }: EditorParametrosProps) => {
  const [borrador, setBorrador] = useState<Borrador>(() => aBorrador(vigentes));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => setBorrador(aBorrador(vigentes)), [vigentes]);

  const cambiar = (seccion: "flota" | "almacen", clave: string, valor: string) => {
    setBorrador((actual) => ({ ...actual, [seccion]: { ...actual[seccion], [clave]: valor } }));
    setErrores((actuales) => ({ ...actuales, [`${seccion}.${clave}`]: "" }));
  };

  const guardar = async () => {
    const nuevosErrores: Record<string, string> = {};
    const convertir = (seccion: "flota" | "almacen") =>
      Object.fromEntries(
        Object.entries(borrador[seccion]).map(([clave, texto]) => {
          const valor = Number(texto);
          if (texto.trim() === "" || Number.isNaN(valor)) {
            nuevosErrores[`${seccion}.${clave}`] = "Obligatorio";
          }
          return [clave, valor];
        }),
      );
    const flota = convertir("flota");
    const almacen = convertir("almacen");
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      setMensaje({ tipo: "error", texto: "Complete todos los campos antes de guardar." });
      return;
    }
    setGuardando(true);
    try {
      await onGuardar(flota, almacen);
      setMensaje({ tipo: "ok", texto: "Parámetros guardados. Se aplican desde la próxima planificación." });
    } catch (causa: unknown) {
      setMensaje({ tipo: "error", texto: describirError(causa) });
    } finally {
      setGuardando(false);
    }
  };

  const restablecer = async () => {
    setGuardando(true);
    try {
      await onRestablecer();
      setMensaje({ tipo: "ok", texto: "Se restablecieron los valores de application.yml." });
    } catch (causa: unknown) {
      setMensaje({ tipo: "error", texto: describirError(causa) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="tarjeta">
      <header className="tarjeta__encabezado">
        <div>
          <h2 className="tarjeta__titulo">Parámetros de operación (administrador)</h2>
          <p className="tarjeta__contexto">
            Cambios en caliente: aplican desde la próxima planificación, sin reiniciar el sistema. Al reiniciar el
            servidor vuelven los valores de application.yml
          </p>
        </div>
        <div className="editor-parametros__acciones">
          <Boton variante="fantasma" icono={<RotateCcw size={14} />} onClick={restablecer} disabled={guardando}>
            Restablecer
          </Boton>
          <Boton variante="accion" icono={<Save size={14} />} onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Boton>
        </div>
      </header>
      <div className="tarjeta__cuerpo">
        {mensaje && (
          <p className={`editor-parametros__mensaje ${mensaje.tipo === "ok" ? "plazo--cumplido" : "plazo--critica"}`}>
            {mensaje.texto}
          </p>
        )}
        <div className="editor-parametros__grupos">
          {GRUPOS.map((grupo) => (
            <fieldset key={grupo.titulo} className="editor-parametros__grupo">
              <legend className="rotulo">{grupo.titulo}</legend>
              {grupo.campos.map((campo) => (
                <CampoTexto
                  key={campo.clave}
                  etiqueta={campo.etiqueta}
                  type="number"
                  step={campo.paso ?? "1"}
                  value={borrador[grupo.seccion][campo.clave] ?? ""}
                  error={errores[`${grupo.seccion}.${campo.clave}`] || undefined}
                  onChange={(evento) => cambiar(grupo.seccion, campo.clave, evento.target.value)}
                />
              ))}
            </fieldset>
          ))}
        </div>
      </div>
    </section>
  );
};

function describirError(causa: unknown): string {
  if (axios.isAxiosError(causa)) {
    const datos = causa.response?.data as { mensaje?: string; message?: string } | undefined;
    return datos?.mensaje ?? datos?.message ?? causa.message;
  }
  return causa instanceof Error ? causa.message : "No se pudieron guardar los parámetros";
}

export default EditorParametros;
