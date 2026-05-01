import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "esnext",
  },
  json: {
    namedExports: false,
    stringify: false,
  },
  optimizeDeps: {
    include: ["lodash"],
  },
});
