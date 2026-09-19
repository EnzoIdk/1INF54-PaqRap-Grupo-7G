import { Suspense, lazy } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import CentroControlPage from "./pages/CentroControlPage";
import GestionPedidosPage from "./pages/GestionPedidosPage";
import ConsolaSimulacionPage from "./pages/ConsolaSimulacionPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";

const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));

/** Componente raiz y enrutamiento del visualizador (STD 5.3). */
const App = () => (
  <BrowserRouter>
    <nav style={{ display: "flex", gap: 16, padding: 16, borderBottom: "1px solid var(--color-borde)" }}>
      <Link to="/">Centro de control</Link>
      <Link to="/pedidos">Pedidos</Link>
      <Link to="/simulacion">Simulacion</Link>
      <Link to="/analytics">Analytics</Link>
      <Link to="/configuracion">Configuracion</Link>
    </nav>
    <Routes>
      <Route path="/" element={<CentroControlPage />} />
      <Route path="/pedidos" element={<GestionPedidosPage />} />
      <Route path="/simulacion" element={<ConsolaSimulacionPage />} />
      <Route
        path="/analytics"
        element={
          <Suspense fallback={<div style={{ padding: 16 }}>Cargando analytics...</div>}>
            <AnalyticsPage />
          </Suspense>
        }
      />
      <Route path="/configuracion" element={<ConfiguracionPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;
