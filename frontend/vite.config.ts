import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    // Material UI ships ESM + CJS; inlining lets Vitest resolve it the same way Vite does.
    server: { deps: { inline: [/@mui\//] } },
  },
});
