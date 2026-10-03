import { chromium, expect } from "@playwright/test";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { db } from "../src/lib/db";
import { publicData } from "../src/lib/public-data";
import { dateLabel } from "../src/lib/domain";

async function main() {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const database = new URL(process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname) || !["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/gali_blue" || process.env.NODE_ENV === "production") throw new Error("Test reserve a la base locale gali_blue.");
  const marker = randomBytes(6).toString("hex");
  const actor = `Events ${marker}`;
  const email = `events-${marker}@example.test`;
  const password = randomBytes(24).toString("base64url");
  const original = await db.event.findMany({ where: { published: true }, select: { id: true } });
  const originalSettings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const ids = Array.from({ length: 6 }, (_, index) => `test-events-${marker}-${index}`);
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const artifacts = fileURLToPath(new URL("../storage/checks", import.meta.url));
  await mkdir(artifacts, { recursive: true });
  let accountId = "";
  let revision = 0;
  const refresh = () => page.goto(`${origin}/?eventCheck=${++revision}#bar`, { waitUntil: "networkidle" });
  const selectedIds = async () => (await publicData()).events.map(event => event.id);
  try {
    await db.event.updateMany({ where: { id: { in: original.map(event => event.id) } }, data: { published: false } });
    expect(await selectedIds()).toEqual([]);
    await refresh();
    await expect(page.locator(".bar-scene")).toHaveCount(0);
    const first = await db.event.create({ data: { id: ids[0], title: "Blue Sessions", description: "Une soiree de musique, de cocktails et de conversations.", date: new Date(Date.now() + 14 * 86400000), published: true, position: 30, image: "/images/cocktail.jpg" } });
    expect(await selectedIds()).toEqual([ids[0]]);
    await refresh();
    await expect(page.locator(".welcome-strip + .bar-scene + #esprit + #carte")).toHaveCount(1);
    await expect(page.locator(".events-section, .events-showcase")).toHaveCount(0);
    await expect(page.locator(".bar-tabs")).toHaveCount(0);
    await expect(page.locator(".bar-moment")).toHaveAttribute("data-event-id", ids[0]);
    await expect(page.locator(".bar-curtain")).toHaveCSS("animation-name", "bar-curtain");
    await db.event.create({ data: { ...first, id: ids[1], title: "La table en musique", date: new Date(Date.now() + 20 * 86400000), position: 20, image: "/images/interior.jpg" } });
    expect(await selectedIds()).toEqual([ids[1], ids[0]]);
    await refresh();
    await expect(page.locator(".bar-tabs [role=tab]")).toHaveCount(2);
    await db.event.createMany({ data: [
      { ...first, id: ids[2], title: "Cocktails & conversations", position: 10 },
      { ...first, id: ids[3], title: "Le rendez-vous du samedi", position: 40 },
      { ...first, id: ids[4], title: "Brouillon", position: 0, published: false },
      { ...first, id: ids[5], title: "Evenement termine", position: 0, date: new Date(Date.now() - 86400000) },
    ] });
    expect(await selectedIds()).toEqual([ids[2], ids[1], ids[0]]);
    await refresh();
    await expect(page.locator(".bar-tabs [role=tab]")).toHaveCount(3);
    await page.locator(".bar-scene").scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(page.locator(".bar-scene")).toHaveAttribute("data-playing", "true");
    await expect(page.locator(".bar-moment")).toHaveAttribute("data-event-id", ids[1], { timeout: 10000 });
    await page.locator(".site-nav").scrollIntoViewIfNeeded();
    await expect(page.locator(".bar-scene")).toHaveAttribute("data-playing", "false");
    await page.locator(".bar-scene").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Mettre l'animation en pause" }).click();
    await expect(page.locator(".bar-scene")).toHaveAttribute("data-playing", "false");
    await page.locator(".bar-tabs [role=tab]").first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".bar-moment")).toHaveAttribute("data-event-id", ids[1]);
    await page.keyboard.press("End");
    await expect(page.locator(".bar-moment")).toHaveAttribute("data-event-id", ids[0]);
    await page.keyboard.press("Home");
    await expect(page.locator(".bar-tabs [role=tab]").first()).toBeFocused();
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (let index = 0; index < 3; index++) {
        await page.locator(".bar-tabs [role=tab]").nth(index).click();
        await expect(page.locator(".bar-moment-copy")).toHaveCSS("opacity", "1");
        await expect(page.locator(".bar-photograph img")).toHaveJSProperty("complete", true);
        expect(await page.locator(".bar-photograph img").evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        const layout = await page.locator(".bar-scene").evaluate(element => {
          const stage = element.getBoundingClientRect();
          const actions = element.querySelector(".bar-event-actions")!.getBoundingClientRect();
          const title = element.querySelector(".bar-heading")!.getBoundingClientRect();
          const copy = element.querySelector(".bar-moment")!.getBoundingClientRect();
          const controls = element.querySelector(".bar-controls")!.getBoundingClientRect();
          return { pageFits: document.documentElement.scrollWidth <= innerWidth, actionsFit: actions.bottom <= controls.top && actions.right <= stage.right, separate: title.right <= copy.left || title.bottom <= copy.top, fits: [...element.querySelectorAll("h2, h3, p, button, a")].filter(child => !child.closest("dialog")).every(child => child.getBoundingClientRect().right <= innerWidth + 1 && child.scrollWidth <= child.clientWidth + 1) };
        });
        expect(layout, `Event ${index} ${viewport.width}`).toEqual({ pageFits: true, actionsFit: true, separate: true, fits: true });
      }
      await page.getByRole("button", { name: "Voir l'evenement" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await page.getByRole("dialog").evaluate(element => element.getBoundingClientRect().right <= innerWidth && element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Voir l'evenement" })).toBeFocused();
      if ([320, 390, 1440].includes(viewport.width)) {
        await page.locator(".bar-scene").evaluate(element => element.scrollIntoView({ behavior: "instant", block: "start" }));
        await page.locator(".bar-scene").screenshot({ path: path.join(artifacts, `events-${viewport.width}.png`) });
      }
    }
    await db.event.update({ where: { id: ids[0] }, data: { title: "Une soiree de rencontres et de musique ".repeat(4).slice(0, 150), description: "Les cocktails et la musique accompagnent les conversations. ".repeat(60).slice(0, 3000) } });
    await refresh();
    for (const width of [320, 601, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const height = (await page.locator(".bar-scene").boundingBox())!.height;
      await page.locator(".bar-tabs [role=tab]").last().click();
      await expect(page.locator(".bar-moment-copy")).toHaveCSS("opacity", "1");
      expect((await page.locator(".bar-scene").boundingBox())!.height).toBe(height);
      expect(await page.locator(".bar-scene").evaluate(element => {
        const stage = element.getBoundingClientRect();
        return [...element.querySelectorAll(".bar-moment h3, .bar-moment p, .bar-event-actions")].every(child => { const box = child.getBoundingClientRect(); return box.top >= stage.top && box.bottom <= stage.bottom && box.right <= stage.right && child.scrollWidth <= child.clientWidth + 1; });
      }), `Long content ${width}`).toBe(true);
      await page.locator(".bar-tabs [role=tab]").first().click();
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".bar-moment-copy")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".bar-curtain")).not.toBeVisible();
    await expect(page.locator(".bar-photograph img")).toHaveCSS("animation-name", "none");
    await page.locator(".bar-tabs [role=tab]").first().click();
    await expect(page.locator(".bar-moment")).toHaveAttribute("data-event-id", ids[2]);

    accountId = (await db.staff.create({ data: { name: actor, email, job: "Test temporaire", role: "EDITOR", passwordHash: await hash(password, 12) } })).id;
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/connexion`, { waitUntil: "networkidle" });
    await page.getByLabel("Email professionnel").fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto(`${origin}/dashboard?view=events`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Modifier Le rendez-vous du samedi", exact: true }).click();
    await page.getByLabel("Ordre d'affichage").fill("5");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect((await db.event.findUniqueOrThrow({ where: { id: ids[3] } })).position).toBe(5);
    expect(await selectedIds()).toEqual([ids[3], ids[2], ids[1]]);
    const payload = { resource: "event", data: { ...first, date: dateLabel(first.date, "yyyy-MM-dd"), time: dateLabel(first.date, "HH:mm"), position: -1 } };
    const invalid = await context.request.post(`${origin}/api/admin`, { headers: { Origin: origin }, data: payload });
    expect(invalid.status()).toBe(400);
    const before = (await publicData()).content;
    await page.goto(`${origin}/dashboard?view=content`, { waitUntil: "networkidle" });
    await page.getByLabel("La cheffe : titre", { exact: true }).fill("La cheffe de notre table");
    await page.getByLabel("Presentation de la cheffe", { exact: true }).fill("Une presentation de test pour notre cheffe.");
    await page.getByLabel("La cheffe : signature", { exact: true }).fill("La cuisine du partage.");
    await page.getByLabel("La cheffe : legende de la photo", { exact: true }).fill("La cheffe en cuisine");
    const photo = (await page.getByRole("combobox", { name: "Photo de la cheffe" }).locator("option").nth(1).getAttribute("value"))!;
    await page.getByRole("combobox", { name: "Photo de la cheffe" }).selectOption(photo);
    await page.getByLabel("Evenements : titre", { exact: true }).fill("Nos belles\nsoirees.");
    await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
    await expect(page.getByRole("button", { name: "Publier le brouillon" })).toBeEnabled();
    expect((await publicData()).content.storyTitle).toBe(before.storyTitle);
    await page.goto(`${origin}/?preview=1#esprit`, { waitUntil: "networkidle" });
    await expect(page.locator(".story-copy h2")).toHaveText("La cheffe de notre table");
    await expect(page.locator(".story-signature")).toHaveText("La cuisine du partage.");
    await expect(page.locator("#bar-title")).toHaveText("Nos bellessoirees.");
    await page.goto(`${origin}/dashboard?view=content`, { waitUntil: "networkidle" });
    const published = page.waitForResponse(response => response.url() === `${origin}/api/admin` && response.request().method() === "POST");
    await page.getByRole("button", { name: "Publier le brouillon" }).click();
    expect((await published).ok()).toBe(true);
    await expect(page.locator(".settings-layout .section-toolbar .badge")).toHaveText("Contenu publie");
    await expect(page.getByRole("button", { name: "Publier le brouillon" })).toBeDisabled();
    expect((await publicData()).content).toMatchObject({ storyTitle: "La cheffe de notre table", storyText: "Une presentation de test pour notre cheffe.", storySignature: "La cuisine du partage.", storyCaption: "La cheffe en cuisine", storyImage: photo, eventTitle: "Nos belles\nsoirees." });
    await db.staff.update({ where: { id: accountId }, data: { role: "SERVICE" } });
    const denied = await context.request.post(`${origin}/api/admin`, { headers: { Origin: origin }, data: { ...payload, data: { ...payload.data, position: 2 } } });
    expect(denied.status()).toBe(403);
    await refresh();
    await expect(page.locator(".bar-moment")).toHaveAttribute("data-event-id", ids[3]);
    await expect(page.locator(".story-copy h2")).toHaveText("La cheffe de notre table");
    await page.locator(".bar-event-actions .bar-link").click();
    await expect(page).toHaveURL(`${origin}/reserver`);
    expect(errors).toEqual([]);
    console.log("PASS: 0/1/2/3+ events, dashboard order, original blue-hour animation/autoplay/pause, 5 viewports, chef drafts/preview/publication/photo, permissions, no browser errors.");
  } finally {
    await db.settings.update({ where: { id: 1 }, data: { content: originalSettings.content as Prisma.InputJsonValue, draftContent: originalSettings.draftContent === null ? Prisma.DbNull : originalSettings.draftContent as Prisma.InputJsonValue } });
    await db.event.deleteMany({ where: { id: { in: ids } } });
    await db.event.updateMany({ where: { id: { in: original.map(event => event.id) } }, data: { published: true } });
    await db.audit.deleteMany({ where: { actor } });
    if (accountId) await db.staff.delete({ where: { id: accountId } });
    await context.close(); await browser.close(); await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });