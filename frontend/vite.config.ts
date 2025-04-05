import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configure Vite to handle WebAssembly imports
  optimizeDeps: {
    exclude: ["./src/wasm/encryption.wasm"],
  },
  build: {
    target: "esnext",
    // Preserve the WebAssembly module as an asset
    assetsInlineLimit: 0,
  },
});
