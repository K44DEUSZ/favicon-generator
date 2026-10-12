# favicon-generator

[Wersja polska](README.md)

Create PNG icons and a multi-size ICO file from an image. The library scales and centers the artwork. For maskable icons it also keeps the artwork inside the safe area, including its corners.

## Usage

Download the package for your chosen version from [Releases](https://github.com/K44DEUSZ/favicon-generator/releases), then install it in your project:

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

## Details

`renderIcon` requires a browser with Canvas. Pass a decoded image, icon size, percentage scale, background or `null` for transparency, and an optional maskable flag. `iconBounds` calculates the artwork's position and size separately.

`createIco` also works in Node.js. It accepts 1 to 16 distinct sizes from 1 to 256 px with matching PNG files. It checks the PNG header and dimensions rather than fully decoding the image.

The maskable safe area is a circle with a diameter of 80% of the icon. The library fits the complete artwork rectangle inside it and fills the background. See [MDN's app icon guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons#support_masking). ZIP packaging and the interface belong to the consuming application.

## Development

Use Node.js 24 for development. The source is TypeScript; releases contain ESM JavaScript and type declarations.

```sh
npm ci
npm run check
npm test
```

A push to `main` runs checks and tests. Releases are published separately through GitHub Actions, using the version saved in `package.json`. Automation does not change that version or overwrite an existing release. A published release updates the dependency used by the website after its checks pass.

## License

MIT. Copyright 2026 Bartosz Golat.
