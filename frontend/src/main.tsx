import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";

const contenedorRaiz = document.getElementById("root");
if (!contenedorRaiz) {
  throw new Error("No se encontro el elemento #root");
}

createRoot(contenedorRaiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
