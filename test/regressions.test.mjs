import assert from "node:assert/strict";
import test from "node:test";
import { createIco, iconBounds } from "../dist/core.js";
import { canvasBlob, renderIcon } from "../dist/browser.js";

function header(size) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, size);
  view.setUint32(20, size);
  return bytes;
}

test("invalid JavaScript entries reject through the public error contract", async () => {
  for (const entries of [[null], [undefined], Array(1), [42], [{ size: 16, blob: null }]])
    await assert.rejects(createIco(entries), { code: "invalid_ico" });
  for (const image of [null, undefined, {}, { naturalWidth: 0, naturalHeight: 1 }])
    await assert.rejects(renderIcon(image, 32, 80, null), { code: "invalid_image" });
  await assert.rejects(canvasBlob(null), { code: "invalid_options" });
  assert.throws(() => iconBounds(Number.MAX_VALUE, Number.MIN_VALUE, 16, 80), {
    code: "invalid_options",
  });
});

test("ICO directory dimensions cannot change while PNG bytes are being read", async () => {
  let release;
  class DelayedBlob extends Blob {
    arrayBuffer() {
      return new Promise((resolve) => {
        release = () => resolve(header(16).buffer);
      });
    }
  }
  const entries = [{ size: 16, blob: new DelayedBlob([header(16)]) }];
  const operation = createIco(entries);
  entries[0].size = 256;
  entries.push({ size: 32, blob: new Blob([header(32)]) });
  release();
  const view = new DataView(await (await operation).arrayBuffer());
  assert.equal(view.getUint16(4, true), 1);
  assert.equal(view.getUint8(6), 16);
  assert.equal(view.getUint32(18, true), 22);
});

test("binary read errors and pre-aborted rendering remain controlled", async () => {
  class UnreadableBlob extends Blob {
    arrayBuffer() {
      return Promise.reject(new Error("fixture read error"));
    }
  }
  await assert.rejects(createIco([{ size: 16, blob: new UnreadableBlob([header(16)]) }]), {
    code: "invalid_ico",
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    renderIcon({ naturalWidth: 10, naturalHeight: 10 }, 32, 80, null, false, {
      signal: controller.signal,
    }),
    { code: "aborted" },
  );
});
