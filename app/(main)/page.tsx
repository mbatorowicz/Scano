import { ScanForm } from "@/components/scan/scan-form";
import { listContractors } from "@/lib/contractors/repository";

/**
 * Ekran startowy aplikacji: po zalogowaniu od razu widać aparat, bo
 * skanowanie faktury to jedyna czynność, po którą sięga się codziennie.
 * Tytuł strony zostaje domyślny — to strona główna, nie podstrona.
 */
export default async function ScanPage() {
  const contractors = await listContractors();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Skanuj</h1>
        <p className="text-sm text-muted-foreground">
          Zrób zdjęcie faktury, a dane odczyta AI. Cenę dla siebie wpisujesz
          ręcznie — należność policzy się sama.
        </p>
      </header>

      <ScanForm contractors={contractors} />
    </div>
  );
}
