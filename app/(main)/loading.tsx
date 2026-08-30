import { LoaderCircle } from "lucide-react";

/**
 * Każdy ekran zaczyna od zapytania do bazy, a to na telefonie w słabym zasięgu
 * trwa. Bez tego nawigacja wyglądałaby, jakby dotknięcie nic nie zrobiło.
 */
export default function MainLoading() {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
    >
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      Wczytuję…
    </p>
  );
}
