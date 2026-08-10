import {defineConfig} from "vitest/config";
import {fileURLToPath} from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/domain/**/*.ts"],
    },
  },
  resolve: {
    alias: {"@": fileURLToPath(new URL(".", import.meta.url))},
  },
});
