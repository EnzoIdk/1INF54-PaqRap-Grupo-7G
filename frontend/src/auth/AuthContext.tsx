import axios from "axios";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface UsuarioAutenticado {
  id: number;
  username: string;
  rol: "ADMIN" | "USUARIO";
  activo: boolean;
}

interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  inicializando: boolean;
  requiereConfiguracion: boolean;
  iniciarSesion: (username: string, password: string) => Promise<void>;
  configurarAdmin: (username: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  recargarEstado: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;
axios.defaults.xsrfCookieName = "XSRF-TOKEN";
axios.defaults.xsrfHeaderName = "X-XSRF-TOKEN";

const prepararCsrf = async () => {
  await axios.get("/api/auth/csrf");
};

const obtenerEstado = async () => {
  const { data } = await axios.get<{ requiereConfiguracion: boolean }>("/api/auth/setup-status");
  return data.requiereConfiguracion;
};

const obtenerUsuario = async () => {
  const { data } = await axios.get<UsuarioAutenticado>("/api/auth/me");
  return data;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [inicializando, setInicializando] = useState(true);
  const [requiereConfiguracion, setRequiereConfiguracion] = useState(false);

  const recargarEstado = useCallback(async () => {
    await prepararCsrf();
    const configuracionPendiente = await obtenerEstado();
    setRequiereConfiguracion(configuracionPendiente);
    if (configuracionPendiente) {
      setUsuario(null);
      return;
    }
    try {
      setUsuario(await obtenerUsuario());
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setUsuario(null);
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    recargarEstado()
      .catch((error: unknown) => {
        console.error("No se pudo comprobar el estado de autenticación", error);
      })
      .finally(() => setInicializando(false));
  }, [recargarEstado]);

  const iniciarSesion = useCallback(async (username: string, password: string) => {
    await prepararCsrf();
    const form = new URLSearchParams({ username, password });
    const { data } = await axios.post<UsuarioAutenticado>("/api/auth/login", form);
    setUsuario(data);
    setRequiereConfiguracion(false);
  }, []);

  const configurarAdmin = useCallback(async (username: string, password: string) => {
    await prepararCsrf();
    await axios.post("/api/auth/setup", { username, password });
    setRequiereConfiguracion(false);
  }, []);

  const cerrarSesion = useCallback(async () => {
    await axios.post("/api/auth/logout");
    setUsuario(null);
    await prepararCsrf();
  }, []);

  const value = useMemo(
    () => ({
      usuario,
      inicializando,
      requiereConfiguracion,
      iniciarSesion,
      configurarAdmin,
      cerrarSesion,
      recargarEstado,
    }),
    [
      usuario,
      inicializando,
      requiereConfiguracion,
      iniciarSesion,
      configurarAdmin,
      cerrarSesion,
      recargarEstado,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};

export const mensajeErrorAuth = (error: unknown, predeterminado: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? predeterminado;
  }
  return predeterminado;
};
