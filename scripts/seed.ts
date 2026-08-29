import { getSettings } from "@/lib/db/queries";
import { formatRate } from "@/lib/money";

import { loadLocalEnv } from "./env";

async function main() {
  loadLocalEnv();

  // `getSettings` samo dorabia brakujący wiersz, więc seed to po prostu
  // jedno wywołanie — i można je puścić ponownie bez skutków ubocznych.
  const { feeRate } = await getSettings();
  console.log(`Wiersz ustawień gotowy. Stawka prowizji: ${formatRate(feeRate)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
