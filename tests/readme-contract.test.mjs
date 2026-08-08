import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("README documents Vercel, shared public writes, and local-only fallback", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /ofishal-business\.vercel\.app/);
  assert.match(readme, /anyone with the link can add, edit, or delete/i);
  assert.match(readme, /local only/i);
  assert.match(readme, /npm run build/);
  assert.match(readme, /GitHub Pages/i);
});
