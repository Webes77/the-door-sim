import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // VITE_BASE=./ builds a copy that runs from any folder (used for the private preview link).
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  test: { include: ["tests/**/*.test.ts"] },
} as never);
