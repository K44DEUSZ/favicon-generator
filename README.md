# favicon-generator

[English version](README.en.md)

Z jednego obrazu możesz przygotować ikony PNG i plik ICO zawierający kilka rozmiarów. Biblioteka skaluje i centruje znak; dla ikon maskable pilnuje też bezpiecznego obszaru, aby narożniki nie zniknęły po nałożeniu maski.

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

## Praca z kodem

Do pracy nad biblioteką użyj Node.js 24. Kod jest w TypeScript; wydania zawierają JavaScript ESM i deklaracje typów.

```sh
npm ci
npm run check
npm test
```

Push na `main` uruchamia sprawdzenie kodu i testy. Wydanie publikuję osobno przez GitHub Actions, z numerem zapisanym w `package.json`. Automat nie zmienia tego numeru ani nie nadpisuje istniejącego wydania. Opublikowana paczka trafia do narzędzi na stronie po przejściu ich kontroli.

## Licencja

MIT. Copyright 2026 Bartosz Golat.
