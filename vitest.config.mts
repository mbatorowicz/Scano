import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Testy obejmują wyłącznie logikę czystą: kwoty, należność, daty i schematy
 * walidacji. Nic tu nie tyka bazy ani sieci, więc zestaw chodzi bez sekretów
 * i bez uruchomionego serwera. Sprawdzenia na prawdziwej bazie zostają
 * w skryptach `npm run db:check` i `npm run form:check`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, ""),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
