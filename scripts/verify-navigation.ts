import { chromium, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

async function main() {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  const warnings = new Set<string>();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
    if (message.type() === "warning") warnings.add(message.text());
  });
  const artifacts = fileURLToPath(new URL("../storage/checks", import.meta.url));
  await mkdir(artifacts, { recursive: true });
  const top = async () => expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const noEntrance = async (target: Page = page) => expect(target.locator(".entry-dialog[open]")).toHaveCount(0);
  const sectionVisible = async (name: string) => {
    await expect.poll(() => page.locator(`#${name}`).evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.top >= -1 && bounds.top < innerHeight;
    })).toBe(true);
  };
  try {
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".entry-dialog[open]")).toBeVisible();
    await page.getByRole("button", { name: "Passer" }).click();
    await noEntrance();
    await top();
    await page.locator("#carte").scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: "Toute la carte", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/la-carte`);
    await top();
    await page.getByRole("link", { name: "Nous trouver", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/#contact`);
    await sectionVisible("contact");
    await noEntrance();
    await page.getByRole("link", { name: "GALI BLUE", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/`);
    await top();
    await noEntrance();
    await page.locator("#instants").scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: "GALI BLUE accueil" }).click();
    await top();
    await page.getByRole("link", { name: "Decouvrir le restaurant" }).click();
    await sectionVisible("esprit");
    await page.getByRole("link", { name: "Prenez place" }).click();
    await expect(page).toHaveURL(`${origin}/reserver`);
    await top();
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: "Confidentialite & conditions" }).click();
    await expect(page).toHaveURL(`${origin}/informations`);
    await top();
    await page.goBack();
    await expect(page).toHaveURL(`${origin}/reserver`);
    await sectionVisible("contact");
    await page.goForward();
    await expect(page).toHaveURL(`${origin}/informations`);
    await expect(page.locator("h1")).toBeInViewport();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(10);
    await page.getByRole("link", { name: "GALI BLUE accueil" }).click();
    await expect(page).toHaveURL(`${origin}/`);
    await top();
    await noEntrance();
    await page.getByRole("link", { name: "Explorer la carte" }).click();
    await expect(page).toHaveURL(`${origin}/la-carte`);
    await top();
    await page.getByRole("tab", { name: "Au bar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Blue signature" })).toBeVisible();
    await page.getByRole("tab", { name: "Tout", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Burrata & tomates de saison" })).toBeVisible();
    await page.getByRole("link", { name: "GALI BLUE accueil" }).click();
    await expect(page).toHaveURL(`${origin}/`);
    await top();
    await expect(page.locator(".hero-content > div")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: path.join(artifacts, "navigation-desktop.png") });
    await page.locator("#instants").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Ouvrir La salle", exact: true }).click();
    await expect(page.locator(".lightbox-media img")).toBeVisible();
    await page.getByRole("button", { name: "Image suivante" }).click();
    await expect(page.locator(".lightbox-caption")).toContainText("L'instant cocktail");
    await page.getByRole("button", { name: "Fermer la galerie" }).click();
    await expect(page.locator(".lightbox-media")).toHaveCount(0);
    await page.getByRole("link", { name: "GALI BLUE accueil" }).click();
    await top();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("link", { name: "GALI BLUE accueil" }).click();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeHidden();
    for (const section of [{ title: "L'esprit Gali", id: "esprit" }, { title: "Les instants", id: "instants" }, { title: "Nous trouver", id: "contact" }]) {
      await page.getByRole("button", { name: "Ouvrir le menu" }).click();
      await page.getByRole("button", { name: "La maison" }).click();
      await page.getByRole("menuitem", { name: new RegExp(section.title) }).click();
      await sectionVisible(section.id);
      await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeHidden();
      await noEntrance();
      await page.getByRole("link", { name: "GALI BLUE accueil" }).click();
      await expect(page).toHaveURL(`${origin}/`);
      await top();
    }
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("link", { name: "La carte", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/la-carte`);
    await top();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".dish-grid > div").first()).toHaveCSS("opacity", "1");
    await page.screenshot({ path: path.join(artifacts, "navigation-mobile.png") });
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("link", { name: "Nous trouver", exact: true }).click();
    await sectionVisible("contact");
    await noEntrance();

    const direct = await context.newPage();
    await direct.goto(`${origin}/#contact`, { waitUntil: "networkidle" });
    await noEntrance(direct);
    await expect.poll(() => direct.locator("#contact").evaluate(element => element.getBoundingClientRect().top < innerHeight)).toBe(true);
    await direct.getByRole("link", { name: "GALI BLUE accueil" }).click();
    await expect.poll(() => direct.evaluate(() => scrollY)).toBe(0);
    await noEntrance(direct);
    await direct.goto(`${origin}/la-carte`, { waitUntil: "networkidle" });
    await direct.getByRole("link", { name: "GALI BLUE accueil" }).click();
    await expect(direct).toHaveURL(`${origin}/`);
    await noEntrance(direct);
    await direct.close();
    expect(errors).toEqual([]);
    expect([...warnings].filter(warning => /scroll-behavior|hydration/i.test(warning))).toEqual([]);
    console.log("PASS: carte en haut, ancres et logos, navigation mobile, historique, liens directs, introduction unique, sans erreur navigateur.");
    console.log(`Avertissements navigateur : ${JSON.stringify([...warnings])}`);
  } finally { await context.close(); await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });