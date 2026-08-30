# Scano

Skaner faktur na telefon. Robisz zdjęcie, Gemini odczytuje numer, datę, sprzedawcę, nabywcę
i kwoty, ty dopisujesz cenę, jaką sam zapłaciłeś za towar, a aplikacja zapisuje fakturę
w Postgresie i wylicza należność dla ciebie: marżę po VAT 23% i podatku dochodowym 19%
(brutto − cena dla mnie) / 1,23 / 1,19. W zakładce Rozliczenia dopisujesz wypłaty tej należności
i widzisz, ile z niej zostało.

Produkcja: https://scano-beta.vercel.app — chroniona jednym hasłem, dodaje się do ekranu
głównego jako PWA.

Powody podjętych decyzji i historia etapów siedzą w [docs/PLAN.md](docs/PLAN.md) — opisują też
wcześniejszy układ plików, sprzed podziału na moduły domenowe.

## Struktura kodu

Każda domena ma własny katalog w `lib/` i ten sam podział w środku:

| plik | odpowiada za | czego nie zna |
| --- | --- | --- |
| `repository.ts` | zapytania Drizzle | reguł biznesowych |
| `service.ts` | reguły: kwoty, należność, NIP | `FormData` i adresów |
| `actions.ts` | sesja, walidacja, `revalidatePath` | Drizzle |
| `form.ts`, `schema.ts` | kontrakt formularza wspólny dla klienta i serwera | bazy |

Tak wygląda `lib/invoices/`, `lib/settlements/` i `lib/ai-usage/`. Strony w `app/` czytają dane
wprost z `repository.ts`, a formularze wołają `actions.ts`. Wspólne rzeczy: `lib/config.ts`
(stawki i limity), `lib/forms/form-state.ts` (stan formularza i błędy pól), `lib/money.ts`,
`lib/dates.ts`. Komponenty leżą w `components/<domena>/`, odczyt AI w
`lib/ai/invoice-extraction/`.

## Uruchomienie lokalne

Potrzebny jest Node.js 20 lub nowszy oraz konto na Vercelu z podłączonym projektem
(baza Neon i Blob są provisionowane przez Vercel Marketplace).

```bash
npm install
npx vercel link          # tylko za pierwszym razem
npx vercel env pull .env.local
npm run dev
```

`vercel env pull` ściąga wszystkie zmienne poza kluczem Gemini, który trzeba dopisać ręcznie —
patrz niżej. Aplikacja startuje na http://localhost:3000 i od razu przekierowuje na `/login`.

Baza i magazyn zdjęć są wspólne dla dev i produkcji, więc faktura zeskanowana lokalnie
pojawi się też na telefonie.

## Zmienne środowiskowe

| zmienna | do czego | skąd |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | odczyt faktury przez Gemini | https://aistudio.google.com/apikey |
| `APP_PASSWORD` | hasło do aplikacji | dowolne, ustawiasz sam |
| `AUTH_SECRET` | podpis ciasteczka sesji | losowy ciąg, np. `openssl rand -base64 32` |
| `DATABASE_URL` | Neon Postgres | `vercel env pull` |
| `DATABASE_URL_UNPOOLED` | migracje Drizzle | `vercel env pull` |
| `BLOB_READ_WRITE_TOKEN` | zdjęcia w Vercel Blob | `vercel env pull` |

Klucz Gemini z darmowego planu AI Studio wystarcza na **20 odczytów na dobę dla każdego
modelu**. Aplikacja liczy zapytania, nie tokeny, więc nie ponawia odczytu po cichu, pamięta
ostatnio wysłane zdjęcia po skrócie SHA-256 i po wyczerpaniu limitu Flasha sięga po Flash Lite.
Bieżące zużycie widać w Ustawieniach.

## Baza danych

```bash
npm run db:generate      # migracja ze zmian w lib/db/schema.ts
npm run db:migrate       # wykonanie migracji na Neonie
```

Drizzle wykonuje tylko migracje **późniejsze** niż ostatnia zapisana w bazie, a pominiętą i tak
melduje jako „applied successfully". Jeśli świeża migracja nic nie zmieniła, sprawdź pole `when`
jej wpisu w `lib/db/migrations/meta/_journal.json` — musi być większe niż w poprzedniej.

## Sprawdzenia

Logikę czystą — parsowanie kwot, wyliczanie należności, daty i schematy walidacji — sprawdza
Vitest. Nie potrzebuje sekretów ani uruchomionego serwera:

```bash
npm test                 # jednorazowo
npm run test:watch       # w trakcie pracy
```

Reszta to skrypty uruchamiane ręcznie, bo dotykają prawdziwej bazy albo modelu:

```bash
npm run db:check         # zapis, odczyt i saldo — pełny obieg przez bazę
npm run form:check       # droga od danych z formularza do wiersza w bazie
npm run scan:check -- ".\samples\faktura-0350.png"   # odczyt AI, wymaga npm run dev
npm run ai:cost          # porównanie ustawień Gemini: tokeny, czas, trafność
```

`db:check` i `form:check` sprzątają po sobie i nie kosztują nic. `scan:check` i `ai:cost`
zużywają dobowy limit odczytów.

Zdjęcia testowe w `samples/` są poza repozytorium — zawierają prawdziwe dane kontrahentów.

## Sprzątanie magazynu zdjęć

Zdjęcie trafia do Bloba zaraz po udanym odczycie, zanim faktura zostanie zatwierdzona, więc
porzucone skany zostawiają pliki bez właściciela:

```bash
npm run blob:clean              # wypisuje osierocone zdjęcia, niczego nie usuwa
npm run blob:clean -- --usun    # usuwa je naprawdę
```

Pliki wgrane w ciągu ostatniej godziny są pomijane — mogą czekać w otwartym formularzu.

## Wdrożenie

Jest jedno środowisko: produkcja. Push na `main` wdraża ją automatycznie, a `npm run deploy`
(`vercel deploy --prod`) wdraża od razu, bez commita. Przed wdrożeniem warto puścić
`npm run build` i `npm run lint`.

Zmienne `APP_PASSWORD`, `AUTH_SECRET` i `GOOGLE_GENERATIVE_AI_API_KEY` są ustawione tylko dla
Production i Development, więc deployment preview z gałęzi wstanie, ale nie da się w nim
zalogować ani odczytać faktury.
