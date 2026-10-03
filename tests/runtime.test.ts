import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const project = fileURLToPath(new URL("../", import.meta.url));

test("Docker includes a hash-only team manifest and runs its idempotent bootstrap", async () => {
  const dockerfile = await readFile(path.join(project, "Dockerfile"), "utf8");
  const startup = await readFile(path.join(project, "scripts/start-production.mjs"), "utf8");
  assert.match(dockerfile.split(/^FROM .+ AS runtime\s*$/m)[1], /COPY .*\/app\/deployment\/bootstrap-team\.json \.\/deployment\/bootstrap-team\.json/);
  assert.match(startup, /run\("node_modules\/tsx\/dist\/cli\.mjs", \["scripts\/create-team\.ts", "--bootstrap"\]\)/);
  const manifest = JSON.parse(await readFile(path.join(project, "deployment/bootstrap-team.json"), "utf8"));
  assert.equal(manifest.version, 1);
  assert.equal(manifest.accounts.length, 6);
  assert.equal(new Set(manifest.accounts.map((account: { id: string }) => account.id)).size, 6);
  for (const account of manifest.accounts) {
    assert.equal(Object.hasOwn(account, "password"), false);
    assert.match(account.passwordHash, /^\$2b\$12\$[./A-Za-z0-9]{53}$/);
  }
});

test("Docker runtime includes and loads the seed's local dependencies", async () => {
  const dockerfile = await readFile(path.join(project, "Dockerfile"), "utf8");
  const runtime = dockerfile.split(/^FROM .+ AS runtime\s*$/m)[1];
  assert.ok(runtime, "Docker runtime stage must exist");
  const fixture = await mkdtemp(path.join(tmpdir(), "gali-runtime-"));
  try {
    for (const line of runtime.split(/\r?\n/).filter(line => line.startsWith("COPY "))) {
      const operands = line.split(/\s+/).slice(1).filter(part => !part.startsWith("--"));
      const destination = operands.pop()!;
      for (const source of operands) {
        if (!/^\/app\/(src\/|prisma$|package\.json$|tsconfig\.json$)/.test(source)) continue;
        const target = path.join(fixture, destination, destination.endsWith("/") ? path.basename(source) : "");
        await mkdir(path.dirname(target), { recursive: true });
        await cp(path.join(project, source.slice("/app/".length)), target, { recursive: true });
      }
    }
    await symlink(path.join(project, "node_modules"), path.join(fixture, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    const seedPath = path.join(fixture, "prisma", "seed.ts");
    const seed = ts.createSourceFile(seedPath, await readFile(seedPath, "utf8"), ts.ScriptTarget.Latest, true);
    const dependencies = seed.statements.flatMap(statement => ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text.startsWith(".") ? [statement.moduleSpecifier.text] : []);
    assert.ok(dependencies.length > 0);
    const result = spawnSync(process.execPath, ["--require", "tsx/cjs", "--eval", `
      const path = require('node:path');
      for (const dependency of ${JSON.stringify(dependencies)}) require(path.resolve('prisma', dependency));
      const { dateLabel, localDateTime } = require('./src/lib/domain');
      require('node:assert/strict').equal(dateLabel(localDateTime('2026-10-03', '21:30'), 'HH:mm'), '21:30');
    `], { cwd: fixture, encoding: "utf8", timeout: 30000, env: { ...process.env, NODE_ENV: "production" } });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});