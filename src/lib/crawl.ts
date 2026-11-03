// STEP 1 of the engine: visit the site ONCE with an invisible browser.
// We grab the landing page ("hero"), then look for a pricing link and a
// signup link and visit those too. Personas later "see" exactly this.
import { chromium, type Page } from "playwright";
import fs from "fs/promises";
import path from "path";
import type { Crawl, CrawledPage } from "./types";
import { newId, saveJson, screenshotPath } from "./storage";

const MAX_TEXT_CHARS = 6000; // keep the AI input (and cost) small
const PRICING_WORDS = /pricing|plans|price|upgrade/i;
const SIGNUP_WORDS = /sign ?up|get started|start (for )?free|try (it )?(for )?free|create (an )?account|register|join/i;

export async function crawlSite(url: string): Promise<Crawl> {
  const id = newId();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const pages: CrawledPage[] = [];

    // 1) Landing page
    await visit(page, url);
    pages.push(await capture(page, id, "hero"));

    // Find candidate links on the landing page
    const links = await page.$$eval("a[href]", (anchors) =>
      anchors.map((a) => ({
        text: (a.textContent || "").trim().slice(0, 80),
        href: (a as HTMLAnchorElement).href,
      })),
    );
    const findLink = (re: RegExp) =>
      links.find((l) => re.test(l.text) || re.test(l.href.replace(/^https?:\/\/[^/]+/, "")));

    // 2) Pricing
    const pricing = findLink(PRICING_WORDS);
    if (pricing && isSamePageAnchor(pricing.href, url)) {
      // Pricing is a section further down the landing page
      const sectionText = await scrollToAnchor(page, pricing.href);
      pages.push(
        await capture(page, id, "pricing", "Pricing is a section on the landing page.", sectionText),
      );
    } else if (pricing) {
      await visit(page, pricing.href);
      pages.push(await capture(page, id, "pricing"));
    }

    // 3) Signup
    const signup = findLink(SIGNUP_WORDS);
    if (signup && !isSamePageAnchor(signup.href, url)) {
      await visit(page, signup.href);
      pages.push(await capture(page, id, "signup"));
    }

    const crawl: Crawl = { id, url, createdAt: new Date().toISOString(), pages };
    await saveJson("crawls", id, crawl);
    return crawl;
  } finally {
    await browser.close(); // always close, even if something failed
  }
}

async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  // Give JavaScript-heavy sites a moment to finish drawing (max 5s).
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
}

async function capture(
  page: Page,
  crawlId: string,
  step: CrawledPage["step"],
  note?: string,
  textOverride?: string, // used when we only want one section of the page
): Promise<CrawledPage> {
  const title = await page.title();
  const rawText =
    textOverride ?? (await page.evaluate(() => document.body?.innerText ?? ""));
  const text = rawText.replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT_CHARS);

  // Screenshot of what's visible in the browser window ("above the fold")
  const file = `${step}.jpg`;
  const out = screenshotPath(crawlId, file);
  await fs.mkdir(path.dirname(out), { recursive: true });
  let screenshotFile: string | null = file;
  try {
    await page.screenshot({ path: out, type: "jpeg", quality: 70 });
  } catch {
    screenshotFile = null;
  }

  return { step, url: page.url(), title, text, screenshotFile, note };
}

function isSamePageAnchor(href: string, baseUrl: string) {
  try {
    const a = new URL(href);
    const b = new URL(baseUrl);
    return a.hash !== "" && a.origin === b.origin && a.pathname === b.pathname;
  } catch {
    return false;
  }
}

// Scrolls to e.g. "#pricing" and returns just that section's text.
async function scrollToAnchor(page: Page, href: string): Promise<string | undefined> {
  const hash = decodeURIComponent(new URL(href).hash.slice(1));
  const text = await page
    .evaluate((h) => {
      const el = document.getElementById(h);
      el?.scrollIntoView();
      return el ? (el as HTMLElement).innerText : undefined;
    }, hash)
    .catch(() => undefined);
  await page.waitForTimeout(500);
  return text || undefined;
}
