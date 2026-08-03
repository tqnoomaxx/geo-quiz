import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: true,
    manifest: "asset-manifest.json"
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
