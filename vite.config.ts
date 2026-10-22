import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // The app's libraries change rarely, so they get their own long-cached chunk. Listed
        // explicitly: MSW and its dependencies are imported dynamically and stay in their own chunk.
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|@tanstack|zod|react-hook-form|@hookform|zustand|react-toastify|lucide-react)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
