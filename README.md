# favicon-generator

[English version](README.en.md)

Z jednego obrazu możesz przygotować ikony PNG i plik ICO zawierający kilka rozmiarów. Biblioteka skaluje i centruje znak; dla ikon maskable pilnuje też bezpiecznego obszaru, aby narożniki nie zniknęły po nałożeniu maski.

Bieżące poprawki pozostają na wersji 1.0.0 i nie stanowią nowego wydania. Publiczna paczka 1.0.0 nie jest nadpisywana; nowe możliwości opisane poniżej dotyczą aktualnego kodu repozytorium. Aby je sprawdzić przed wydaniem, uruchom `npm ci`, `npm run build`, `npm pack` i zainstaluj uzyskany plik lokalnie. Changelog pozostaje w repozytorium i nie trafia do paczki.

## Jak użyć

Pobierz paczkę wybranego wydania z [Releases](https://github.com/K44DEUSZ/favicon-generator/releases), a następnie zainstaluj ją w swoim projekcie:

```sh
npm install ./k44deusz-favicon-generator-1.0.0.tgz
```

```ts
import { renderIcon, createIco } from "@k44deusz/favicon-generator";

const image = new Image();
image.src = "logo.svg";
await image.decode();
const png = await renderIcon(image, 32, 78, null);
const ico = await createIco([{ size: 32, blob: png }]);
```

## Co warto wiedzieć

`renderIcon` potrzebuje przeglądarki z Canvas. Przyjmuje odczytany obraz, rozmiar, skalę procentową, tło albo `null` dla przezroczystości oraz opcjonalną flagę maskable. `iconBounds` pozwala osobno obliczyć położenie i rozmiar znaku.

`createIco` działa także w Node.js. Przyjmuje od 1 do 16 różnych rozmiarów, od 1 do 256 px, z odpowiadającymi im plikami PNG. Sprawdza nagłówek i wymiary PNG; nie zastępuje pełnego dekodera obrazu.

Bezpieczny obszar maskable to koło o średnicy 80% ikony. Biblioteka mieści w nim cały prostokąt znaku i wypełnia tło. Więcej o tej zasadzie: [ikony aplikacji w MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons#support_masking). Archiwizowanie ZIP i generowanie interfejsu zostają po stronie aplikacji.

## API i granice środowisk (1.0.0)

Dotychczasowe importy z korzenia są zachowane. `@k44deusz/favicon-generator/core` eksportuje `iconBounds`, `createIco` i `FaviconError`, bez importowania renderera i bez typów elementów HTML. W Node.js TypeScript potrzebuje typów Node dla standardowego Blob. `/browser` eksportuje `renderIcon`, `canvasBlob` i `IconRenderOptions`; te deklaracje wymagają DOM.

| Funkcja                                                      | Kontrakt                                                                                                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iconBounds(width,height,size,scale,maskable?)`              | Dodatnie skończone wymiary, całkowity size 1–4096, procent scale większy od 0 do 100, flaga boolean → wycentrowany prostokąt {x,y,width,height}. Maskable mieści wszystkie narożniki w bezpiecznym kole.                                              |
| `createIco(entries)`                                         | 1–16 pozycji {size,blob}, różne całkowite size 1–256; każda blob to PNG do 2 MiB z odpowiadającym kwadratowym IHDR → Promise<Blob> typu image/x-icon. Wejście jest kopiowane przed oczekiwaniem na bajty, więc zmiany tablicy nie psują katalogu ICO. |
| `renderIcon(image,size,scale,background,maskable?,options?)` | Odczytany HTMLImageElement z niezerowymi wymiarami; kolor CSS albo null → Promise<Blob> PNG. Rozmiar i skala jak w iconBounds.                                                                                                                        |
| `canvasBlob(canvas,options?)`                                | HTMLCanvasElement → Promise<Blob> PNG; błąd lub pusty wynik nie są sukcesem.                                                                                                                                                                          |

`IconRenderOptions` zawiera opcjonalny AbortSignal `signal` i dodatni całkowity `maxPixels`, sprawdzany dla powierzchni wynikowej. Bez opcji zachowany jest limit size 4096 (do 16 777 216 pikseli). Anulowanie odrzuca wynik kodem aborted; natywna operacja kodowania może dokończyć się w tle. Biblioteka zwalnia własne płótno, ale nie zarządza obrazem ani URL przekazanym przez odbiorcę. Odbiorca ładuje obraz, ogranicza bajty i rozmiar dekodowanego źródła, zwalnia swoje object URL oraz URL pobieranych wyników. Zdalny obraz musi być odczytany z właściwym crossOrigin i zgodą CORS serwera. Biblioteka nie obchodzi ograniczeń Canvas.

`createIco` sprawdza sygnaturę PNG, IHDR i wymiary; nie jest pełnym dekoderem PNG. Do prawidłowego ICO dostarczaj rzeczywiste, poprawne PNG, np. z renderIcon. API normalizuje nieprawidłowe wejścia JS i błędy odczytu do `FaviconError`. Kody: invalid_image, invalid_options, browser_required, canvas_unavailable, encoding_failed, invalid_ico, canvas_security, aborted.

Dla maskable null oznacza czarne tło, a podany kolor jest używany jako tło. Wybierz nieprzezroczysty kolor, jeśli ikona ma mieć pełne tło. PNG może zachować przezroczystość zwykłej ikony. Eksport jest rastrowy: animacje, warstwy SVG i metadane źródła nie są zachowywane, a orientacja/kolory dekodowania zależą od przeglądarki.

```ts
import { createIco } from "@k44deusz/favicon-generator/core";
import { renderIcon } from "@k44deusz/favicon-generator/browser";

const controller = new AbortController();
// image is a decoded HTMLImageElement owned by this application.
const png = await renderIcon(image, 32, 78, null, false, {
  signal: controller.signal,
  maxPixels: 512 * 512,
});
const ico = await createIco([{ size: 32, blob: png }]);
```

## Praca z kodem

Do pracy nad biblioteką użyj Node.js 24. Kod jest w TypeScript; wydania zawierają JavaScript ESM i deklaracje typów.

```sh
npm ci
npm run check
npm test
npx playwright install chromium firefox webkit
npm run test:browser
npm run check:package
```

Push na `main` uruchamia sprawdzenie kodu i testy. Wydanie publikuję osobno przez GitHub Actions, z numerem zapisanym w `package.json`. Automat nie zmienia tego numeru ani nie nadpisuje istniejącego wydania. Opublikowana paczka trafia do narzędzi na stronie po przejściu ich kontroli.

Testy przeglądarkowe domyślnie sprawdzają Chromium, Firefox i WebKit. Zmienna środowiskowa BROWSERS pozwala wybrać podzbiór, np. chromium. Próby używają lokalnych fixture i nie wywołują publicznej strony z narzędziami.

## Licencja

MIT. Copyright 2026 Bartosz Golat.
