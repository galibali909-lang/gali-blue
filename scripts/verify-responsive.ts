import { chromium, expect, type Page } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

async function checkLayout(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const overflow = [...document.querySelectorAll("main, header, footer, dialog[open], .section-toolbar, .form-actions, .brand, .button, input, select, textarea")].filter(element => {
      if (element.closest(".table-wrap, .honeypot, .dash-sidebar:not(.open), dialog:not([open])")) return false;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && (box.right > width + 1 || box.left < -1 || element.scrollWidth > element.clientWidth + 2 && element.matches(".button"));
    }).map(element => `${element.tagName}.${element.className}`);
    return { width, scrollWidth: document.documentElement.scrollWidth, overflow };
  });
  expect(result.scrollWidth, `${label}: page trop large`).toBeLessThanOrEqual(result.width + 1);
  expect(result.overflow, `${label}: elements hors ecran`).toEqual([]);
}

async function main() {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const database = new URL(process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname) || !["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/gali_blue" || process.env.NODE_ENV === "production") throw new Error("Test reserve a la base locale gali_blue.");
  const db = new PrismaClient();
  const marker = randomBytes(6).toString("hex");
  const email = `responsive-${marker}@example.test`;
  const actor = `Responsive ${marker}`;
  const password = randomBytes(24).toString("base64url");
  const original = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); if (message.type() === "warning") warnings.push(message.text()); });
  const artifacts = fileURLToPath(new URL("../storage/checks", import.meta.url));
  await mkdir(artifacts, { recursive: true });
  let accountId = "";
  const uploaded: { id: string; url: string }[] = [];
  const event = await db.event.create({ data: { title: `Responsive ${marker}`, description: "Evenement temporaire", date: new Date(Date.now() + 86400000), published: true } });
  const views = ["overview", "reservations", "tables", "staff", "menu", "events", "media", "content", "settings", "activity"];
  const viewports = [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 1000 }, { width: 844, height: 390 }];
  try {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const route of ["/", "/la-carte", "/reserver", "/informations", "/connexion"]) {
        await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
        await expect(page.locator("h1").first()).toBeVisible();
        await checkLayout(page, `${route} ${viewport.width}x${viewport.height}`);
        if (route !== "/connexion" && await page.locator(".site-nav .brand-name").count()) {
          expect(await page.locator(".site-nav .brand-name").evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(20);
        }
        await expect(page.locator(".developer-credit")).toHaveText("D\u00e9velopp\u00e9 par Gripo");
        await expect(page.locator(".developer-credit svg")).toHaveCSS("color", "rgb(1, 37, 143)");
        if (route === "/reserver") {
          await page.locator(".booking-date-trigger").click();
          await expect(page.locator(".booking-date-popover")).toBeVisible();
          await checkLayout(page, `Calendrier ${viewport.width}`);
          expect(await page.locator(".booking-date-popover").evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
          await page.keyboard.press("Escape");
          await page.getByRole("combobox", { name: "Nombre de personnes" }).click();
          await page.getByRole("option", { name: "4 personnes", exact: true }).click();
          await page.locator(".slots button:not([disabled])").first().click();
          await page.getByRole("button", { name: "Continuer", exact: true }).click();
          await checkLayout(page, `Reservation etape 2 ${viewport.width}`);
          await page.getByRole("button", { name: "Retour", exact: true }).click();
        }
        if (route === "/" && [320, 390, 1440].includes(viewport.width)) await page.screenshot({ path: path.join(artifacts, `responsive-home-${viewport.width}.png`) });
      }
    }
    const account = await db.staff.create({ data: { name: actor, email, job: "Test temporaire", role: "ADMIN", passwordHash: await hash(password, 12) } });
    accountId = account.id;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Email professionnel").fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const view of views) {
        await page.goto(`${origin}/dashboard?view=${view}`, { waitUntil: "networkidle" });
        await checkLayout(page, `dashboard ${view} ${viewport.width}x${viewport.height}`);
        if (view === "media") {
          const button = page.getByRole("button", { name: "Importer un fichier" });
          expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
          if ([390, 1440].includes(viewport.width)) await page.screenshot({ path: path.join(artifacts, `responsive-media-${viewport.width}.png`) });
        }
        if (viewport.width < 850 && view === "content") {
          await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
          await expect(page.locator(".dash-sidebar")).toHaveClass(/open/);
          await page.getByRole("link", { name: "Accueil du dashboard", exact: true }).click();
          await expect(page).toHaveURL(/dashboard\?view=overview/);
          await expect(page.locator(".dash-sidebar")).not.toHaveClass(/open/);
        }
      }
      if (viewport.width >= 850) {
        await page.getByRole("link", { name: "Accueil du dashboard", exact: true }).click();
        await expect(page).toHaveURL(/dashboard\?view=overview/);
      }
    }
    for (const viewport of [{ width: 320, height: 740 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (const [view, button] of [["overview", "Nouvelle reservation"], ["tables", "Ajouter une table"], ["staff", "Ajouter un membre"], ["menu", "Ajouter un produit"], ["events", "Ajouter un evenement"]]) {
        await page.goto(`${origin}/dashboard?view=${view}`, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: button, exact: true }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await checkLayout(page, `${view}: formulaire ${viewport.width}`);
        const dialog = page.getByRole("dialog");
        expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/dashboard?view=media`, { waitUntil: "networkidle" });
    for (const fileName of ["responsive-main", "responsive-light"]) {
      const fixture = await context.newPage();
      await fixture.setViewportSize({ width: 360, height: 100 });
      await fixture.setContent(`<body style="margin:0;display:grid;place-items:center;height:100px;color:${fileName.endsWith("light") ? "white" : "#01258f"};font:42px Georgia"><span>GALI BLUE</span></body>`);
      const logo = await fixture.screenshot({ omitBackground: true });
      await fixture.close();
      const fileChooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Importer un fichier" }).focus();
      await page.keyboard.press("Enter");
      const chooser = await fileChooser;
      const response = page.waitForResponse(response => response.url().endsWith("/api/media") && response.request().method() === "POST");
      await chooser.setFiles({ name: `${fileName}-${marker}.png`, mimeType: "image/png", buffer: logo });
      const upload = await response;
      expect(upload.status()).toBe(201);
      uploaded.push(await upload.json());
      await expect(page.getByRole("button", { name: "Importer un fichier" })).toBeEnabled();
    }
    await page.getByRole("button", { name: /Modifier responsive-main/ }).click();
    await checkLayout(page, "Edition media mobile");
    await page.getByRole("button", { name: "Fermer", exact: true }).click();
    await page.goto(`${origin}/dashboard?view=content`, { waitUntil: "networkidle" });
    await page.getByLabel("Logo principal", { exact: true }).selectOption(uploaded[0].url);
    await page.getByLabel("Logo clair (fonds bleus, facultatif)").selectOption(uploaded[1].url);
    await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
    await expect(page.getByText("Brouillon en attente", { exact: true })).toBeVisible();
    const publicPage = await context.newPage();
    await publicPage.goto(`${origin}/?preview=1`, { waitUntil: "networkidle" });
    await expect(publicPage.locator(".site-nav .brand img")).toHaveAttribute("src", uploaded[0].url);
    await publicPage.goto(origin, { waitUntil: "networkidle" });
    await expect(publicPage.locator(`.brand img[src="${uploaded[0].url}"]`)).toHaveCount(0);
    await page.getByRole("button", { name: "Publier le brouillon" }).click();
    await expect(page.getByText("Contenu publie", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
    await expect(page.locator(".dash-sidebar .brand img")).toHaveAttribute("src", uploaded[0].url);
    await page.getByRole("button", { name: "Fermer la navigation", exact: true }).click();
    for (const route of ["/", "/la-carte", "/reserver", "/informations"]) {
      await publicPage.goto(`${origin}${route}`, { waitUntil: "networkidle" });
      await expect(publicPage.locator(".site-nav .brand img")).toHaveAttribute("src", uploaded[0].url);
      await expect(publicPage.locator(".footer-brand img")).toHaveAttribute("src", uploaded[0].url);
      expect(await publicPage.locator(".site-nav .brand img").evaluate(element => (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
      await checkLayout(publicPage, `Logo publie ${route}`);
      if (route === "/reserver") await expect(publicPage.locator(".booking-aside .brand img")).toHaveAttribute("src", uploaded[0].url);
      if (route === "/") await publicPage.screenshot({ path: path.join(artifacts, "responsive-logo-published.png") });
    }
    await publicPage.emulateMedia({ reducedMotion: "no-preference" });
    await publicPage.goto(origin, { waitUntil: "domcontentloaded" });
    await expect(publicPage.locator(".entry-wordmark .brand-mark img")).toHaveAttribute("src", uploaded[1].url);
    await publicPage.getByRole("button", { name: "Passer" }).click();
    const anonymous = await browser.newContext({ viewport: { width: 320, height: 740 }, reducedMotion: "reduce" });
    const login = await anonymous.newPage();
    await login.goto(`${origin}/connexion`, { waitUntil: "networkidle" });
    await expect(login.locator(".brand img")).toHaveAttribute("src", uploaded[0].url);
    await checkLayout(login, "Logo connexion 320");
    expect((await anonymous.request.post(`${origin}/api/admin`, { headers: { origin }, data: { resource: "content", data: { content: {}, publish: true } } })).status()).toBe(401);
    const content = (await (await context.request.get(`${origin}/api/admin`)).json()).settings.content;
    for (const logoImage of ["https://example.test/logo.png", "/api/media/invalid.mp4", "/api/media/missing.png"]) {
      expect((await context.request.post(`${origin}/api/admin`, { headers: { origin }, data: { resource: "content", data: { content: { ...content, logoImage }, publish: true } } })).status()).toBe(400);
    }
    await anonymous.close();
    await publicPage.close();
    expect(errors).toEqual([]);
    expect(warnings.filter(message => !message.startsWith("You have Reduced Motion enabled on your device."))).toEqual([]);
    console.log("PASS: 5 pages publiques + 10 vues dashboard, 6 tailles, formulaires, logos dashboard, import clavier, logo brouillon/publication/entree/connexion, droits et validation, credit Gripo.");
    console.log(`Captures : ${artifacts}`);
  } finally {
    await db.settings.update({ where: { id: 1 }, data: { content: original.content as Prisma.InputJsonValue, draftContent: original.draftContent ?? Prisma.DbNull } });
    await db.audit.deleteMany({ where: { actor } });
    if (accountId) await db.staff.delete({ where: { id: accountId } });
    await db.event.delete({ where: { id: event.id } });
    for (const media of uploaded) {
      await db.media.delete({ where: { id: media.id } });
      await unlink(fileURLToPath(new URL(`../storage/uploads/${media.url.split("/").pop()}`, import.meta.url))).catch(() => {});
    }
    await context.close();
    await browser.close();
    await db.$disconnect();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });