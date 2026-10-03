import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";

const directory = fileURLToPath(new URL("../", import.meta.url));
const tests = readdirSync(new URL("../tests/", import.meta.url)).filter(file => file.endsWith(".test.ts")).sort().map(file => `tests/${file}`);
const commands = [
  ["Prisma schema", "node_modules/prisma/build/index.js", "validate"],
  ["Unit and MySQL integration tests", "node_modules/tsx/dist/cli.mjs", "--env-file=.env", "--test", "--test-concurrency=1", ...tests],
  ["ESLint", "node_modules/eslint/bin/eslint.js", "."],
  ["TypeScript", "node_modules/typescript/bin/tsc", "--noEmit"],
  ["Production build", "node_modules/next/dist/bin/next", "build"],
];
for (const [label, ...args] of commands) {
  console.log(`\nChecking: ${label}`);
  const result = spawnSync(process.execPath, args, { cwd: directory, stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("\nAll checks passed.");