import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Backend al que se reenvian /api y /ws-paqrap. Por defecto el local en el
  // puerto 8080; PAQRAP_BACKEND permite apuntar a otro (p. ej. un segundo backend).
  const backend = loadEnv(mode, ".", "").PAQRAP_BACKEND || "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": backend,
        "/ws-paqrap": {
          target: backend,
          ws: true,
        },
      },
    },
  };
});
