import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // three.js dominates the bundle (~1MB of the 1.36MB total when
        // everything shipped as one chunk). Splitting the heavyweight,
        // rarely-changing vendors into their own chunks lets the app code
        // load and cache independently of them.
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    // Default: pure logic + the zustand store, no DOM needed. Component
    // tests opt into jsdom individually via a `// @vitest-environment
    // jsdom` docblock at the top of the file, so those stay fast.
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
  },
});
