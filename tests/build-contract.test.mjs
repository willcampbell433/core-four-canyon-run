import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("build runs tests before generating a static dist", async () => {
  const [pkg, vercel] = await Promise.all([
    read("package.json").then(JSON.parse),
    read("vercel.json").then(JSON.parse),
  ]);

  assert.match(pkg.scripts.build, /^npm test && /);
  assert.match(pkg.scripts.build, /generate-shared-config\.mjs/);
  assert.equal(vercel.buildCommand, "npm run build");
  assert.equal(vercel.outputDirectory, "dist");
});

test("generator writes only browser-safe public Supabase configuration", async () => {
  const workdir = await mkdtemp(join(tmpdir(), "ofishal-build-"));
  const script = new URL("../scripts/generate-shared-config.mjs", import.meta.url);
  const result = spawnSync(process.execPath, [script.pathname], {
    cwd: workdir,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_safe",
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const config = await readFile(join(workdir, "dist/shared-config.js"), "utf8");
  assert.match(config, /https:\/\/example\.supabase\.co/);
  assert.match(config, /sb_publishable_safe/);
  assert.doesNotMatch(config, /service_role/);
});

test("generator rejects a service-role credential", () => {
  const script = new URL("../scripts/generate-shared-config.mjs", import.meta.url);
  const result = spawnSync(process.execPath, [script.pathname], {
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "service_role_forbidden",
    },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /service-role/i);
});
