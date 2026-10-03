import { chromium, expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { db } from "../src/lib/db";

async function main() {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const database = new URL(process.env.DATABASE_URL || "");
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/gali_blue" || !["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) throw new Error("Test reserve a la base locale gali_blue.");
  const marker = randomBytes(5).toString("hex");
  const password = randomBytes(24).toString("base64url");
  const passwordHash = await hash(password, 12);
  const contexts: BrowserContext[] = [];
  const ids: string[] = [];
  const reports: { name: string; result: string }[] = [];
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const headers = { Origin: origin };
  const artifacts = fileURLToPath(new URL("../storage/checks", import.meta.url));
  const actors: string[] = [];
  const emails: string[] = [];
  let tableId = "";
  async function client() { const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); contexts.push(context); return context; }
  function pass(name: string) { reports.push({ name, result: "PASS" }); }
  try {
    await mkdir(artifacts, { recursive: true });
    const anonymous = await client();
    expect((await anonymous.request.get(`${origin}/api/admin`)).status()).toBe(401); pass("Acces anonyme refuse");
    const pending = await db.staff.create({ data: { name: `Acces ${marker}`, email: `access-${marker}@example.test`, job: "Test", role: "ADMIN", mustChangePassword: true, passwordHash } });
    ids.push(pending.id); actors.push(pending.name); emails.push(pending.email!);
    const first = await client();
    const stale = await client();
    for (const context of [first, stale]) {
      const login = await context.request.post(`${origin}/api/auth`, { headers, data: { email: pending.email, password } });
      expect(login.status()).toBe(200); expect((await login.json()).mustChangePassword).toBe(true);
      expect((await context.request.get(`${origin}/api/admin`)).status()).toBe(403);
    }
    pass("Premier acces : session ouverte mais API dashboard interdite");
    const page = await first.newPage();
    await page.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/compte$/); pass("Premier acces redirige vers Mon compte sur mobile");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${artifacts}/first-access-mobile.png`, fullPage: true });
    expect((await first.request.post(`${origin}/api/account`, { headers, data: { currentPassword: "incorrect", password: `${password}-new`, confirmPassword: `${password}-new` } })).status()).toBe(403); pass("Mot de passe actuel incorrect refuse");
    expect((await first.request.post(`${origin}/api/account`, { headers, data: { currentPassword: password, password, confirmPassword: password } })).status()).toBe(400); pass("Reutilisation du mot de passe initial refusee");
    expect((await first.request.post(`${origin}/api/account`, { headers: { Origin: "https://intrus.example" }, data: {} })).status()).toBe(403); pass("Origine externe refusee");
    const next = randomBytes(24).toString("base64url");
    await page.getByLabel("Mot de passe actuel", { exact: true }).fill(password);
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(next);
    await page.getByLabel("Confirmer le mot de passe", { exact: true }).fill(next);
    await page.getByRole("button", { name: "Enregistrer le mot de passe" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect((await first.request.get(`${origin}/api/admin`)).status()).toBe(200);
    expect((await stale.request.get(`${origin}/api/admin`)).status()).toBe(401);
    expect((await db.staff.findUniqueOrThrow({ where: { id: pending.id } })).mustChangePassword).toBe(false);
    pass("Renouvellement mobile autorise le dashboard et invalide les autres sessions");
    expect((await stale.request.post(`${origin}/api/auth`, { headers, data: { email: pending.email, password } })).status()).toBe(401); pass("Ancien mot de passe refuse apres renouvellement");
    const cookie = (await first.cookies()).find(cookie => cookie.name === "gali-session");
    expect(cookie?.httpOnly).toBe(true); expect(cookie?.sameSite).toBe("Lax"); pass("Cookie de session HttpOnly et SameSite Lax");
    const roles = ["ADMIN", "MANAGER", "HOST", "SERVICE", "CASHIER", "EDITOR"] as const;
    for (const role of roles) {
      const member = await db.staff.create({ data: { name: `${role} ${marker}`, email: `${role.toLowerCase()}-${marker}@example.test`, job: "Test temporaire", role, passwordHash } });
      ids.push(member.id); actors.push(member.name); emails.push(member.email!);
      const context = await client();
      expect((await context.request.post(`${origin}/api/auth`, { headers, data: { email: member.email, password } })).status()).toBe(200);
      const response = await context.request.get(`${origin}/api/admin`);
      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(JSON.stringify(result)).not.toContain("passwordHash"); expect(JSON.stringify(result)).not.toContain("sessionVersion");
      if (role === "EDITOR") { expect(result.reservations).toHaveLength(0); expect(result.tables).toHaveLength(0); expect(result.members).toHaveLength(0); }
      if (["HOST", "SERVICE", "CASHIER"].includes(role)) { expect(result.settings.draftContent).toBeNull(); expect(result.audits).toHaveLength(0); }
      pass(`${role} : connexion et donnees limitees sans secrets`);
      for (const resource of ["table", "settings", "staff", "content", "newReservation"]) {
        const allowed = ["table", "settings", "staff"].includes(resource) ? ["ADMIN", "MANAGER"].includes(role) : resource === "content" ? ["ADMIN", "MANAGER", "EDITOR"].includes(role) : ["ADMIN", "MANAGER", "HOST"].includes(role);
        if (!allowed) expect((await context.request.post(`${origin}/api/admin`, { headers, data: { resource, data: {} } })).status()).toBe(403);
      }
      pass(`${role} : mutations hors role interdites cote serveur`);
      if (role === "MANAGER") {
        for (const values of [{ role: "ADMIN", email: "", password: "" }, { role: "SERVICE", email: `escalate-${marker}@example.test`, password }]) {
          expect((await context.request.post(`${origin}/api/admin`, { headers, data: { resource: "staff", data: { name: "Intrusion test", job: "Test", active: true, ...values } } })).status()).toBe(403);
        }
        expect((await context.request.post(`${origin}/api/admin`, { headers, data: { resource: "staff", data: { id: pending.id, name: pending.name, job: pending.job, role: "ADMIN", email: pending.email, active: true } } })).status()).toBe(403);
        pass("Manager : creation de compte, elevation de role et modification du developpeur refusees");
        const created = await context.request.post(`${origin}/api/admin`, { headers, data: { resource: "table", data: { name: `AC-${marker}`, area: "Recette", seats: 2, active: true, vip: false } } });
        expect(created.status()).toBe(200); tableId = (await db.diningTable.findUniqueOrThrow({ where: { name: `AC-${marker}` } })).id; pass("Manager : gestion operationnelle des tables autorisee");
      }
      const rolePage = await context.newPage();
      await rolePage.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
      expect(await rolePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(rolePage.getByRole("link", { name: "Mon compte", exact: true })).toBeVisible();
      await rolePage.getByRole("button", { name: "Ouvrir la navigation", exact: true }).click();
      await expect.poll(() => rolePage.locator("#dashboard-navigation").evaluate(element => Math.round(element.getBoundingClientRect().left))).toBe(0);
      const navigation = rolePage.getByRole("navigation", { name: "Dashboard", exact: true });
      if (!["ADMIN", "MANAGER"].includes(role)) await expect(navigation.getByRole("link", { name: "Personnel" })).toHaveCount(0);
      if (role === "EDITOR") await expect(navigation.getByRole("link", { name: "Reservations" })).toHaveCount(0);
      await rolePage.screenshot({ path: `${artifacts}/role-${role.toLowerCase()}-mobile.png`, fullPage: true });
      pass(`${role} : navigation mobile sans debordement et liens restreints`);
      await db.staff.update({ where: { id: member.id }, data: { active: false } });
      expect((await context.request.get(`${origin}/api/admin`)).status()).toBe(401);
      expect((await context.request.post(`${origin}/api/auth`, { headers, data: { email: member.email, password } })).status()).toBe(401);
      pass(`${role} : desactivation invalide la session et refuse la connexion`);
    }
    expect((await first.request.post(`${origin}/api/admin`, { headers, data: { resource: "staff", data: { id: pending.id, name: pending.name, job: pending.job, role: "SERVICE", email: pending.email, active: true } } })).status()).toBe(400); pass("Administrateur : suppression de son propre acces refusee");
    expect((await first.request.post(`${origin}/api/admin`, { headers, data: { resource: "staff", data: { id: pending.id, name: pending.name, job: pending.job, role: "ADMIN", email: "", active: true } } })).status()).toBe(400); pass("Un compte avec mot de passe conserve un email de connexion");
    expect((await first.request.post(`${origin}/api/admin`, { headers, data: { resource: "staff", data: { id: pending.id, name: pending.name, job: pending.job, role: "ADMIN", email: pending.email, active: true, password: "\u00e9".repeat(72) } } })).status()).toBe(400); pass("Mot de passe UTF-8 depassant 72 octets refuse");
    await first.request.delete(`${origin}/api/auth`, { headers });
    expect((await first.request.get(`${origin}/api/admin`)).status()).toBe(401); pass("Deconnexion invalide l'acces du navigateur");
    await writeFile(`${artifacts}/accounts-use-cases.json`, JSON.stringify({ checks: reports, viewports: [390], temporaryAccounts: true }, null, 2));
    console.log(`Accounts verified: ${reports.length} checks passed; six roles, first access, mobile, session revocation. No passwords printed.`);
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
    if (tableId) await db.diningTable.deleteMany({ where: { id: tableId } });
    await db.audit.deleteMany({ where: { OR: [{ actor: { in: actors } }, { detail: { contains: marker } }] } });
    await db.staff.deleteMany({ where: { id: { in: ids } } });
    await db.rateLimit.deleteMany({ where: { OR: [...emails.map(email => ({ key: `login:${email}` })), ...ids.map(id => ({ key: `password:${id}` }))] } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });