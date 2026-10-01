import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

async function main() {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const artifacts = fileURLToPath(new URL("../storage/checks", import.meta.url));
  await mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    await expect(page.locator(".entry-dialog")).toBeHidden({ timeout: 7000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".entry-dialog[open]")).toBeVisible();
    expect(await page.locator(".entry-dialog").evaluate(element => element.matches(":modal"))).toBe(true);
    await expect(page.locator(".entry-dialog img")).toHaveJSProperty("complete", true);
    expect(await page.locator(".entry-dialog img").evaluate(image => (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await page.locator(".entry-dialog").evaluate(element => {
      for (const animation of element.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 1600; }
    });
    await page.screenshot({ path: path.join(artifacts, "entry-desktop.png") });
    await page.locator(".entry-dialog").evaluate(element => { for (const animation of element.getAnimations({ subtree: true })) animation.play(); });
    await expect(page.locator(".entry-dialog")).toBeHidden({ timeout: 6000 });
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await expect(page.locator('a[href="/connexion"], a[href^="/dashboard"]')).toHaveCount(0);
    await page.screenshot({ path: path.join(artifacts, "creative-desktop.png") });
    await page.getByRole("button", { name: "La maison" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: /L'esprit Gali/ })).toBeVisible();
    await expect(page.locator(".house-dropdown")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: path.join(artifacts, "house-dropdown.png") });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "La maison" })).toBeFocused();
    await page.locator("#esprit").scrollIntoViewIfNeeded();
    await expect(page.locator(".story-copy")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: path.join(artifacts, "creative-story.png") });
    await page.locator("#carte").scrollIntoViewIfNeeded();
    await expect(page.locator(".dish-grid > div").last()).toHaveCSS("opacity", "1");
    for (const image of await page.locator(".dish-image img").all()) {
      await expect(image).toHaveJSProperty("complete", true);
      expect(await image.evaluate(element => (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
    }
    await page.screenshot({ path: path.join(artifacts, "creative-menu.png") });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".entry-dialog[open]")).toBeVisible();
    await page.getByRole("button", { name: "Passer" }).click();
    await expect(page.locator(".entry-dialog")).toBeHidden();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".entry-dialog[open]")).toBeVisible();
    await page.locator(".entry-dialog").evaluate(element => {
      for (const animation of element.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 1600; }
    });
    await page.screenshot({ path: path.join(artifacts, "entry-mobile.png") });
    await page.keyboard.press("Escape");
    await expect(page.locator(".entry-dialog")).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await page.screenshot({ path: path.join(artifacts, "creative-mobile.png") });
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("button", { name: "La maison" }).click();
    await page.getByRole("menuitem", { name: /L'esprit Gali/ }).click();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeHidden();
    await page.goto(`${origin}/reserver`, { waitUntil: "networkidle" });
    const guests = page.getByRole("combobox", { name: "Nombre de personnes" });
    await guests.click();
    await expect(page.getByRole("option", { name: "4 personnes", exact: true })).toBeVisible();
    await expect(page.locator(".guest-dropdown")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: path.join(artifacts, "guest-dropdown-mobile.png") });
    await page.getByRole("option", { name: "4 personnes", exact: true }).click();
    await expect(guests).toContainText("4 personnes");
    await expect(page.locator(".booking-aside")).toContainText("4 personnes");
    await guests.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option", { name: "4 personnes", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "5 personnes", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(guests).toContainText("5 personnes");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(origin, { waitUntil: "networkidle" });
    await expect(page.locator(".entry-dialog")).toBeHidden();
    for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }, { width: 1920, height: 1080 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow at ${viewport.width}`).toBe(true);
      expect(await page.locator(".hero h1").evaluate(element => element.scrollWidth <= element.clientWidth), `Title overflow at ${viewport.width}`).toBe(true);
      const hero = await page.locator(".hero").boundingBox();
      expect(hero!.y + hero!.height, `Next section hint at ${viewport.width}`).toBeLessThan(viewport.height);
    }
    const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
    const noScriptPage = await noScriptContext.newPage();
    await noScriptPage.goto(origin);
    await expect(noScriptPage.locator(".entry-dialog")).toBeHidden();
    await expect(noScriptPage.locator(".site-nav")).toBeVisible();
    await noScriptContext.close();
    await page.goto(`${origin}/dashboard`);
    await expect(page).toHaveURL(/connexion/);
    expect((await context.request.get(`${origin}/api/admin`)).status()).toBe(401);
    expect(errors).toEqual([]);
    console.log("PASS: animated entry/background, auto-exit, skip/Escape, scroll restoration, dropdown keyboard/mobile, reduced motion, 5 viewport sizes, hidden personnel links and protected dashboard.");
    console.log(`Screenshots: ${artifacts}`);
  } finally { await context.close(); await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });