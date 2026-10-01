import mysql from "mysql2/promise";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const databaseUrl = new URL(process.env.DATABASE_URL);
const databaseName = databaseUrl.pathname.slice(1);
if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) throw new Error("Invalid database name");
const connection = await mysql.createConnection({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
});
await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await connection.end();
const envFile = await readFile(".env", "utf8");
if (!process.env.SESSION_SECRET) {
  await writeFile(".env", envFile.replace('SESSION_SECRET=""', `SESSION_SECRET="${randomBytes(48).toString("base64url")}"`));
}
console.log(`Database ${databaseName} ready. Session secret configured locally.`);