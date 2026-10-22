import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Navside from "./components/layout/Navside";
import CentroControlPage from "./pages/CentroControlPage";
import GestionPedidosPage from "./pages/GestionPedidosPage";
import ConsolaSimulacionPage from "./pages/ConsolaSimulacionPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import LoginPage from "./pages/LoginPage";
import ConfigurarAdminPage from "./pages/ConfigurarAdminPage";
import UsuariosPage from "./pages/UsuariosPage";
import { useOperacionDiaADia } from "./hooks/useOperacionDiaADia";
import "./App.css";

const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));

/**
 * Componente raiz y enrutamiento del visualizador (STD 5.3). La barra
 * lateral es permanente; solo cambia el area de contenido (STD 2.6.1).
 */
const RutasProtegidas = () => {
  const { usuario, inicializando, requiereConfiguracion } = useAuth();
  const ubicacion = useLocation();

  if (inicializando) {
    return <div className="aplicacion__cargando">Comprobando sesión…</div>;
  }

  if (requiereConfiguracion && ubicacion.pathname !== "/configurar-admin") {
    return <Navigate to="/configurar-admin" replace />;
  }
  if (!requiereConfiguracion && ubicacion.pathname === "/configurar-admin") {
    return <Navigate to={usuario ? "/" : "/login"} replace />;
  }

  if (ubicacion.pathname === "/login") {
    return usuario ? <Navigate to="/" replace /> : <LoginPage />;
  }
  if (ubicacion.pathname === "/configurar-admin") {
    return <ConfigurarAdminPage />;
  }
  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }

  return <AplicacionAutenticada esAdmin={usuario.rol === "ADMIN"} />;
};

/** Contenido para un usuario con sesión; mantiene viva la operación día a día. */
const AplicacionAutenticada = ({ esAdmin }: { esAdmin: boolean }) => {
  useOperacionDiaADia();
  return (
    <div className="aplicacion">
      <Navside />
      <main className="aplicacion__contenido">
        <Routes>
          <Route path="/" element={<CentroControlPage />} />
          <Route path="/pedidos" element={<GestionPedidosPage />} />
          <Route path="/simulacion" element={<ConsolaSimulacionPage />} />
          <Route
            path="/analytics"
            element={
              <Suspense fallback={<div className="aplicacion__cargando">Cargando analytics…</div>}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route
            path="/usuarios"
            element={esAdmin ? <UsuariosPage /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <RutasProtegidas />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
