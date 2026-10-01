import { spawn, spawnSync } from "node:child_process";
import { configureProductionEnvironment } from "./production-env.mjs";

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit", env: process.env });
  if (result.error || result.status !== 0) throw new Error(`Initialisation interrompue : ${script}`);
}

try {
  const databaseSource = configureProductionEnvironment(process.env);
  console.log(`Configuration MySQL chargee depuis ${databaseSource}. Port HTTP : ${process.env.PORT}.`);
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET.startsWith("REPLACE_")) throw new Error("SESSION_SECRET aleatoire de 32 caracteres minimum requis.");
  const origin = new URL(process.env.APP_ORIGIN || "");
  if (origin.protocol !== "https:" || origin.origin !== process.env.APP_ORIGIN) throw new Error("APP_ORIGIN doit etre l'origine HTTPS publique, sans slash final.");
  if (process.env.LOCAL_SETUP_ENABLED === "true") throw new Error("Desactiver LOCAL_SETUP_ENABLED en production.");
  process.env.NODE_ENV = "production";
  run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
  run("node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"]);
  run("node_modules/tsx/dist/cli.mjs", ["scripts/create-admin.ts", "--bootstrap"]);
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"], { stdio: "inherit", env: process.env });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
  server.on("error", () => { console.error("Demarrage du serveur impossible."); process.exitCode = 1; });
  server.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 0 : 1); });
} catch (error) {
  console.error(error instanceof TypeError ? "APP_ORIGIN HTTPS valide requis." : error.message);
  process.exitCode = 1;
}