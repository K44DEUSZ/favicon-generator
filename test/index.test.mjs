import assert from "node:assert/strict";
import test from "node:test";
import { iconBounds, createIco, renderIcon, FaviconError } from "../dist/index.js";
function png(size) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, size);
  view.setUint32(20, size);
  return new Blob([bytes], { type: "image/png" });
}
test("centers images and keeps all maskable corners inside the safe circle", () => {
  for (const [width, height] of [
    [100, 100],
    [200, 100],
    [100, 200],
  ]) {
    const bounds = iconBounds(width, height, 512, 100, true);
    assert.ok(Math.hypot(bounds.width / 2, bounds.height / 2) <= 512 * 0.4 + 1e-9);
    assert.equal(bounds.x + bounds.width / 2, 256);
    assert.equal(bounds.y + bounds.height / 2, 256);
  }
  assert.deepEqual(iconBounds(200, 100, 100, 80), { x: 10, y: 30, width: 80, height: 40 });
  assert.throws(() => iconBounds(0, 100, 16, 80), FaviconError);
});
test("writes an ICO directory whose offsets and sizes match the PNG payloads", async () => {
  const blob = await createIco([16, 32, 256].map((size) => ({ size, blob: png(size) })));
  const bytes = new Uint8Array(await blob.arrayBuffer()),
    view = new DataView(bytes.buffer);
  assert.equal(blob.type, "image/x-icon");
  assert.equal(view.getUint16(0, true), 0);
  assert.equal(view.getUint16(2, true), 1);
  assert.equal(view.getUint16(4, true), 3);
  for (let index = 0; index < 3; index++) {
    const row = 6 + index * 16;
    assert.equal(view.getUint32(row + 8, true), 33);
    assert.equal(view.getUint32(row + 12, true), 54 + index * 33);
    assert.equal(bytes[54 + index * 33], 137);
  }
  assert.equal(view.getUint8(38), 0);
});
test("rejects malformed entries and clearly separates rendering from Node helpers", async () => {
  await assert.rejects(createIco([]), { code: "invalid_ico" });
  await assert.rejects(createIco([{ size: 16, blob: png(32) }]), { code: "invalid_ico" });
  await assert.rejects(createIco([{ size: 16, blob: new Blob(["not PNG"]) }]), FaviconError);
  await assert.rejects(renderIcon({ naturalWidth: 100, naturalHeight: 100 }, 32, 80, null), {
    code: "browser_required",
  });
});
