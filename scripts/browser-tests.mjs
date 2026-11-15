import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { chromium, firefox, webkit } from "playwright";

const allowed = new Set(["index.js", "core.js", "browser.js"]);
const server = createServer(async (request, response) => {
  const name = request.url.slice(1);
  if (!name) return response.end("<!doctype html><title>Favicon generator tests</title>");
  if (!allowed.has(name)) {
    response.statusCode = 404;
    return response.end();
  }
  response.setHeader("Content-Type", "text/javascript");
  response.end(await readFile(new URL(`../dist/${name}`, import.meta.url)));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  for (const name of (process.env.BROWSERS ?? "chromium,firefox,webkit").split(",")) {
    const launcher = { chromium, firefox, webkit }[name];
    assert.ok(launcher, `Unknown browser ${name}`);
    const browser = await launcher.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(origin);
      const result = await page.evaluate(async () => {
        const { renderIcon } = await import("/browser.js");
        const { createIco } = await import("/core.js");
        const results = [];
        const check = (condition, label) => {
          if (!condition) throw new Error(label);
          results.push(label);
        };
        const rejects = async (operation, code) => {
          try {
            await operation;
          } catch (error) {
            check(error.code === code, `rejects ${code}`);
            return;
          }
          throw new Error(`Expected ${code}`);
        };
        const source = document.createElement("canvas");
        source.width = 200;
        source.height = 100;
        const context = source.getContext("2d");
        context.fillStyle = "red";
        context.fillRect(0, 0, 200, 100);
        const image = new Image();
        image.src = source.toDataURL();
        await image.decode();
        const frame = document.createElement("iframe");
        document.body.append(frame);
        const foreignImage = new frame.contentWindow.Image();
        foreignImage.src = image.src;
        await foreignImage.decode();
        const foreignIcon = await renderIcon(foreignImage, 16, 80, null);
        const foreignBitmap = await createImageBitmap(foreignIcon);
        check(foreignBitmap.width === 16, "same-origin iframe HTMLImageElement remains supported");
        foreignBitmap.close();
        frame.remove();
        const entries = [];
        for (const size of [16, 32, 48, 256]) {
          const blob = await renderIcon(image, size, 80, null);
          const bitmap = await createImageBitmap(blob);
          check(
            blob.type === "image/png" && bitmap.width === size && bitmap.height === size,
            `${size}px icon really decodes`,
          );
          bitmap.close();
          entries.push({ size, blob });
        }
        const ico = await createIco(entries);
        const bytes = await ico.arrayBuffer();
        const directory = new DataView(bytes);
        check(directory.getUint16(4, true) === 4, "ICO contains four directory entries");
        for (let index = 0; index < 4; index++) {
          const row = 6 + index * 16;
          const length = directory.getUint32(row + 8, true);
          const offset = directory.getUint32(row + 12, true);
          const bitmap = await createImageBitmap(
            new Blob([bytes.slice(offset, offset + length)], { type: "image/png" }),
          );
          check(
            bitmap.width === entries[index].size,
            `ICO payload ${index} decodes at its declared size`,
          );
          bitmap.close();
        }
        const singleIco = await createIco([entries[0]]);
        const icoUrl = URL.createObjectURL(singleIco);
        const decodedIco = new Image();
        decodedIco.src = icoUrl;
        await decodedIco.decode();
        check(
          decodedIco.naturalWidth === 16 && decodedIco.naturalHeight === 16,
          "complete ICO container decodes as a browser image",
        );
        URL.revokeObjectURL(icoUrl);
        const maskable = await renderIcon(image, 100, 100, null, true);
        const bitmap = await createImageBitmap(maskable);
        context.clearRect(0, 0, 200, 100);
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        check(
          context.getImageData(0, 0, 1, 1).data[3] === 255,
          "maskable background is filled outside the safe circle",
        );
        const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"/>'], {
          type: "image/svg+xml",
        });
        const svgUrl = URL.createObjectURL(svg);
        const zero = new Image();
        zero.src = svgUrl;
        try {
          await zero.decode();
        } catch {
          /* Some engines reject zero-sized SVG during decoding. */
        }
        await rejects(renderIcon(zero, 32, 80, null), "invalid_image");
        URL.revokeObjectURL(svgUrl);
        const controller = new AbortController();
        controller.abort();
        await rejects(
          renderIcon(image, 32, 80, null, false, { signal: controller.signal }),
          "aborted",
        );
        await rejects(
          renderIcon(image, 32, 80, null, false, { maxPixels: 100 }),
          "invalid_options",
        );
        return results;
      });
      console.log(`${name}: ${result.length} browser assertions passed`);
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
