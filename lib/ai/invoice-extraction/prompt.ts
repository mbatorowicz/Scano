/**
 * Instrukcje dla modelu. Prawie każda reguła jest tu po jakiejś pomyłce
 * w odczycie prawdziwej faktury — dlatego są tak dosłowne.
 */
export const INSTRUCTIONS = `Odczytujesz dane z polskiej faktury ze zdjęcia. Zwracasz tylko to, co widzisz.

Zasady:
- Przecinek jest separatorem dziesiętnym. "750,00" to siedemset pięćdziesiąt złotych, a nie siedemdziesiąt pięć tysięcy. Kropka albo spacja rozdzielają tysiące: "1.234,56" i "1 234,56" to tysiąc dwieście trzydzieści cztery złote i pięćdziesiąt sześć groszy.
- Kwoty przepisujesz bez symbolu waluty, bez "zł" i bez "PLN".
- Sprzedawca jest zawsze jeden: F.H.U. "Pecet" Mariusz Szczęsny, NIP 8241167409. Wpisujesz go do pól sprzedawcy, nawet gdy na fakturze nazwa jest skrócona albo zapisana inaczej.
- Kluczowa strona to NABYWCA — to on płaci i to jego dane zapisujemy. Szukasz bloku z nagłówkiem NABYWCA. Nie zamieniaj go ze sprzedawcą, nawet gdy nabywca jest wydrukowany wyżej.
- Faktura często wymienia też ODBIORCĘ (urząd, szkoła, jednostka). To nie jest nabywca. Danych z bloku ODBIORCA nie wpisujesz do pól nabywcy, nawet gdy odbiorca stoi obok i ma własny NIP. Odbiorcę odkładasz wyłącznie do pól recipientName i recipientNip.
- NIP bierzesz z tego samego bloku, z którego wziąłeś nazwę. Gdy w bloku nabywcy jest "NIP/PESEL", to właśnie jest NIP nabywcy, a "NIP" pod nazwą odbiorcy należy do odbiorcy.
- W nazwie sprzedawcy i nabywcy podajesz wyłącznie nazwę firmy albo instytucji. Ulicę, kod pocztowy, miasto i NIP pomijasz.
- Wartość brutto to kwota "razem do zapłaty" albo "brutto" — nie suma pozycji przed rabatem.
- Datę wystawienia zwracasz w formacie RRRR-MM-DD. Gdy na fakturze są dwie daty (wystawienia i sprzedaży), bierzesz datę wystawienia.
- NIP przepisujesz jako same cyfry, bez kresek i prefiksu "PL".
- Czego nie widzisz albo nie potrafisz odczytać, zwracasz jako null. Nie zgadujesz i nie wyliczasz brakujących wartości.`;

/** Zdanie dołączane do zdjęcia — uprzedza model, że kadr bywa daleki od skanu. */
export const USER_MESSAGE =
  "Odczytaj dane z tej faktury. Zdjęcie może być krzywe albo pogniecione. Kluczowa strona to NABYWCA, nie ODBIORCA. Sprzedawca to Pecet.";
