import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navside from "./components/layout/Navside";
import CentroControlPage from "./pages/CentroControlPage";
import GestionPedidosPage from "./pages/GestionPedidosPage";
import ConsolaSimulacionPage from "./pages/ConsolaSimulacionPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import "./App.css";

const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));

/**
 * Componente raiz y enrutamiento del visualizador (STD 5.3). La barra
 * lateral es permanente; solo cambia el area de contenido (STD 2.6.1).
 */
const App = () => (
  <BrowserRouter>
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
        </Routes>
      </main>
    </div>
  </BrowserRouter>
);

export default App;
