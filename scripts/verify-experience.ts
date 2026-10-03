import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

async function main() {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const artifacts = fileURLToPath(new URL("../storage/checks", import.meta.url));
  await mkdir(artifacts, { recursive: true });
  try {
    await page.goto(`${origin}/connexion`, { waitUntil: "networkidle" });
    await page.locator(".login-page .brand").click();
    await expect(page.locator(".entry-dialog[data-ready='true']")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".entry-dialog[open]")).toHaveCount(0);
    await page.getByRole("link", { name: "L'heure bleue", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/#bar`);
    await expect(page.locator(".entry-dialog[open]")).toHaveCount(0);
    const bar = page.locator(".bar-scene");
    await bar.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(bar).toHaveAttribute("data-playing", "true");
    const tabs = page.locator(".bar-tabs [role=tab]");
    const count = await tabs.count();
    if (count > 1) await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true", { timeout: 10000 });
    await expect(page.locator(".bar-play, .welcome-play")).toHaveCount(0);
    await page.locator(".bar-moment").hover();
    await expect(bar).toHaveAttribute("data-playing", "false");
    await page.mouse.move(0, 0);
    await expect(bar).toHaveAttribute("data-playing", "true");
    await page.locator(".bar-details").focus();
    await expect(bar).toHaveAttribute("data-playing", "false");
    if (count > 1) {
      await tabs.first().focus();
      await page.keyboard.press("ArrowRight");
      await expect(tabs.nth(1)).toBeFocused();
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await page.keyboard.press("Home");
      await expect(tabs.first()).toBeFocused();
    }
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (let index = 0; index < Math.max(1, count); index++) {
        if (count) await tabs.nth(index).click();
        await expect(page.locator(".bar-moment-copy")).toHaveCSS("opacity", "1");
        await expect(page.locator(".bar-photograph")).toHaveCSS("opacity", "1");
        await expect(page.locator(".bar-photograph img")).toHaveJSProperty("complete", true);
        expect(await page.locator(".bar-photograph img").evaluate(element => (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const layout = await bar.evaluate(element => {
          const title = element.querySelector(".bar-heading")!.getBoundingClientRect();
          const copy = element.querySelector(".bar-moment")!.getBoundingClientRect();
          const controls = element.querySelector(".bar-controls")!.getBoundingClientRect();
          const viewportWidth = document.documentElement.clientWidth;
          return { separate: title.right <= copy.left || title.bottom <= copy.top, controlsBelow: Math.max(title.bottom, copy.bottom) <= controls.top + 1, fits: [...element.querySelectorAll("h2, h3, p, button, a")].every(child => child.scrollWidth <= child.clientWidth + 1 && child.getBoundingClientRect().right <= viewportWidth + 1) };
        });
        expect(layout, `Event ${index} ${viewport.width}`).toEqual({ separate: true, controlsBelow: true, fits: true });
        if (index === 0 && [320, 390, 1440].includes(viewport.width)) {
          await bar.evaluate(element => element.scrollIntoView({ behavior: "instant", block: "start" }));
          await bar.screenshot({ path: path.join(artifacts, `bar-scene-${viewport.width}.png`) });
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator(".bar-details").focus();
    await page.locator(".bar-details").blur();
    await bar.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(bar).toHaveAttribute("data-playing", "true");
    await page.locator(".site-nav").scrollIntoViewIfNeeded();
    await expect(bar).toHaveAttribute("data-playing", "false");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload({ waitUntil: "networkidle" });
    await bar.scrollIntoViewIfNeeded();
    await expect(bar).toHaveAttribute("data-playing", "false");
    await expect(page.locator(".bar-photograph img")).toHaveCSS("animation-name", "none");
    if (count > 1) {
      await tabs.nth(1).click();
      await expect(page.locator(".bar-moment h3")).toHaveText(await tabs.nth(1).locator(".bar-tab-title").innerText());
    }
    await page.locator(".site-nav .brand").click();
    await expect(page).toHaveURL(`${origin}/`);
    await expect(page.locator(".entry-dialog[open]")).toHaveCount(0);
    expect(errors).toEqual([]);
    console.log("PASS: logo connexion, evenements en 5 formats, aucun bouton pause, reprise automatique apres interaction, clavier, images chargees, mouvements reduits.");
  } finally { await context.close(); await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });