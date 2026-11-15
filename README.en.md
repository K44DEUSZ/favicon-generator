# favicon-generator

[Wersja polska](README.md)

Create PNG icons and a multi-size ICO file from an image. The library scales and centers the artwork. For maskable icons it also keeps the artwork inside the safe area, including its corners.

## Usage

Download the package for your chosen version from [Releases](https://github.com/K44DEUSZ/favicon-generator/releases), then install it in your project:

```sh
npm install ./k44deusz-favicon-generator-1.1.0.tgz
```

```ts
import { renderIcon, createIco } from "@k44deusz/favicon-generator";

const image = new Image();
image.src = "logo.svg";
await image.decode();
const png = await renderIcon(image, 32, 78, null);
const ico = await createIco([{ size: 32, blob: png }]);
```

## Details

`renderIcon` requires a browser with Canvas. Pass a decoded image, icon size, percentage scale, background or `null` for transparency, and an optional maskable flag. `iconBounds` calculates the artwork's position and size separately.

`createIco` also works in Node.js. It accepts 1 to 16 distinct sizes from 1 to 256 px with matching PNG files. It checks the PNG header and dimensions rather than fully decoding the image.

The maskable safe area is a circle with a diameter of 80% of the icon. The library fits the complete artwork rectangle inside it and fills the background. See [MDN's app icon guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons#support_masking). ZIP packaging and the interface belong to the consuming application.

## API and environment boundaries (1.1.0)

Existing root imports remain supported. `@k44deusz/favicon-generator/core` exports `iconBounds`, `createIco`, and `FaviconError` without importing the renderer or HTML element types. Node.js TypeScript consumers need Node types for the standard Blob API. `/browser` exports `renderIcon`, `canvasBlob`, and `IconRenderOptions`; these declarations require DOM types.

| Function                                                     | Contract                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iconBounds(width,height,size,scale,maskable?)`              | Positive finite dimensions, integer size 1–4096, scale greater than 0 up to 100 percent, boolean flag → centered rectangle {x,y,width,height}. Maskable fits every corner inside the safe circle.                                                                         |
| `createIco(entries)`                                         | 1–16 {size,blob} entries with distinct integer sizes 1–256; each blob is PNG up to 2 MiB with matching square IHDR dimensions → Promise<Blob> of type image/x-icon. Inputs are snapshotted before awaiting bytes so later array changes cannot corrupt the ICO directory. |
| `renderIcon(image,size,scale,background,maskable?,options?)` | Decoded HTMLImageElement with nonzero dimensions; CSS color or null → Promise<Blob> PNG. Size and scale follow iconBounds.                                                                                                                                                |
| `canvasBlob(canvas,options?)`                                | HTMLCanvasElement → Promise<Blob> PNG; empty output and encoding failures are rejected.                                                                                                                                                                                   |

`IconRenderOptions` contains optional AbortSignal `signal` and positive integer `maxPixels`, checked against output area. Omitting options preserves the 4096 size limit (up to 16,777,216 pixels). Cancellation rejects with aborted; native encoding may finish in the background. The library releases its own canvas but does not own the caller's image or URL. The consumer loads the image, limits input bytes and decoded dimensions, and releases its source and download object URLs. Remote images must be loaded with the appropriate crossOrigin setting and server CORS permission. The library does not bypass Canvas restrictions.

`createIco` checks the PNG signature, IHDR, and dimensions; it is not a full PNG decoder. Supply actual valid PNG bytes, for example from renderIcon, to create a usable ICO. Invalid JavaScript input and binary-read failures use `FaviconError`. Codes: invalid_image, invalid_options, browser_required, canvas_unavailable, encoding_failed, invalid_ico, canvas_security, aborted.

For maskable output, null selects a black background; a supplied color is used as the background. Choose an opaque color when the icon needs a full background. Regular PNG icons can retain transparency. Export is raster-only: animation, SVG layers, and source metadata are not preserved; decoding orientation and colors depend on the browser.

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

## Development

Use Node.js 24 for development. The source is TypeScript; releases contain ESM JavaScript and type declarations.

```sh
npm ci
npm run check
npm test
npx playwright install chromium firefox webkit
npm run test:browser
npm run check:package
```

A push to `main` runs checks and tests. Releases are published separately through GitHub Actions, using the version saved in `package.json`. Automation does not change that version or overwrite an existing release. A published release updates the dependency used by the website after its checks pass.

The browser suite checks Chromium, Firefox, and WebKit by default. Set the BROWSERS environment variable to a subset, such as chromium, to select fewer engines. Tests use local fixtures and never call the public tools site.

## License

MIT. Copyright 2026 Bartosz Golat.
