// STEP 1 of the engine: visit the site ONCE with an invisible browser,
// the way a real first-time visitor would:
//   landing page -> click to pricing -> click to signup (or waitlist).
//
// How it works:
//  1. prepare():   close cookie pop-ups, scroll so lazy content loads
//  2. capture():   save text, a few screenshots, and facts we can measure
//  3. listClickables(): every link AND button on the page, numbered
//  4. chooseClicks():   Haiku picks which ones lead to pricing / signup
//                       (falls back to simple word matching without AI)
//  5. follow():    click it and see what happened: new page, pop-up, or
//                  a section further down the same page
import { chromium, devices, type Browser, type Page } from "playwright";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, HAIKU } from "./ai";
import { costOfCall } from "./cost";
import type { CallCost, Crawl, CrawledPage } from "./types";
import { newId, saveJson, screenshotPath } from "./storage";

const MAX_TEXT_CHARS = 6000; // keep the AI input (and cost) small
const VIEWPORT = { width: 1280, height: 800 };

type Clickable = {
  id: number;
  tag: string; // "a", "button", ...
  text: string;
  href: string; // "" for buttons
  hidden: boolean; // e.g. inside a closed mobile menu
};

export async function crawlSite(url: string): Promise<Crawl> {
  const id = newId();
  const costs: CallCost[] = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: VIEWPORT });
    const pages: CrawledPage[] = [];

    // 1) Landing page
    await visit(page, url);
    await prepare(page);
    pages.push(await capture(page, id, "hero", { tiles: 2 }));
    const heroUrl = page.url(); // after any redirects
    pages[0].mobileScreenshotFile = await capturePhone(browser, heroUrl, id);
    const heroText = pages[0].text;

    // 2) Decide what a visitor would click
    let clickables = await listClickables(page);
    const choice = await chooseClicks(pages[0].title, heroText, clickables, costs);

    // 3) Pricing
    if (choice.pricing) {
      const result = await follow(page, heroUrl, choice.pricing);
      if (result.kind === "page") {
        await prepare(page);
        pages.push(await capture(page, id, "pricing", { tiles: 2 }));
      } else if (result.kind !== "nothing") {
        pages.push(
          await capture(page, id, "pricing", {
            tiles: 1,
            keepScroll: true,
            note: result.kind === "popup" ? "Pricing opened in a pop-up." : "Pricing is a section on the landing page.",
            textOverride: result.text,
          }),
        );
      }
    }

    // 4) Signup / waitlist. Clicking pricing may have changed the page, so
    //    go back to the landing page and find the same button again.
    let signupTarget = choice.signup;
    if (signupTarget) {
      if (page.url() !== heroUrl) {
        await visit(page, heroUrl);
        await prepare(page);
      }
      clickables = await listClickables(page);
      signupTarget = findSame(clickables, signupTarget);
    } else if (pages.some((p) => p.step === "pricing")) {
      // No signup button on the landing page? Pricing pages usually have one.
      signupTarget = guessByWords(await listClickables(page)).signup;
    }
    if (signupTarget) {
      const result = await follow(page, heroUrl, signupTarget);
      if (result.kind === "page") {
        await prepare(page);
        let signupPage = await capture(page, id, "signup", { tiles: 1 });
        // Landed on "Log in" (for existing users)? Look for "Create account".
        if (signupPage.signals.loginOnly) {
          const create = guessByWords(await listClickables(page)).signup;
          if (create && (await follow(page, heroUrl, create)).kind !== "nothing") {
            await prepare(page);
            signupPage = await capture(page, id, "signup", {
              tiles: 1,
              note: "The button led to a log-in page first; the create-account page was one more click away.",
            });
          } else {
            signupPage.note = "Only a log-in page was found. New visitors may not see how to create an account.";
          }
        }
        pages.push(signupPage);
      } else if (result.kind === "popup") {
        pages.push(
          await capture(page, id, "signup", {
            tiles: 1,
            keepScroll: true,
            note: "Signup opened in a pop-up.",
            textOverride: result.text,
          }),
        );
      } else if (result.kind === "section") {
        pages.push(
          await capture(page, id, "signup", {
            tiles: 1,
            keepScroll: true,
            note: "Signup is a form further down the landing page.",
            textOverride: result.text,
          }),
        );
      }
    }

    const crawl: Crawl = { id, url, createdAt: new Date().toISOString(), pages, costs };
    await saveJson("crawls", id, crawl);
    return crawl;
  } finally {
    await browser.close(); // always close, even if something failed
  }
}

// ---------- visiting and preparing a page ----------

async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await settle(page);
}

// Give JavaScript-heavy sites a moment to finish drawing (max 5s).
async function settle(page: Page, ms = 5_000) {
  await page.waitForLoadState("networkidle", { timeout: ms }).catch(() => {});
}

async function prepare(page: Page) {
  // Close cookie banners by clicking an "Accept"-style button.
  await page
    .evaluate(() => {
      const re = /^(accept|accept all|accept cookies|allow all|allow cookies|agree|i agree|got it|ok|okay|i understand|accept & close)$/i;
      for (const el of Array.from(document.querySelectorAll("button, a, [role=button]"))) {
        const t = ((el as HTMLElement).innerText || "").trim();
        if (re.test(t)) {
          (el as HTMLElement).click();
          return;
        }
      }
    })
    .catch(() => {});
  await page.waitForTimeout(300);

  // Scroll down in steps so "load as you scroll" content appears, then go back up.
  await page
    .evaluate(async () => {
      const max = Math.min(document.body.scrollHeight, 15_000);
      for (let y = 0; y < max; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    })
    .catch(() => {});
  await page.waitForTimeout(400);
}

// ---------- capturing what's on screen ----------

// The landing page as a phone shows it. Teens are almost always on phones.
async function capturePhone(browser: Browser, url: string, crawlId: string) {
  // Scale 2 (not the iPhone's 3) keeps the image smaller, which keeps AI cost down.
  const context = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: 2 });
  try {
    const phone = await context.newPage();
    await visit(phone, url);
    await prepare(phone);
    const file = "hero-m.jpg";
    await phone.screenshot({ path: screenshotPath(crawlId, file), type: "jpeg", quality: 70 });
    return file;
  } catch (err) {
    console.warn("[crawl] phone screenshot failed:", (err as Error).message.split("\n")[0]);
    return undefined;
  } finally {
    await context.close();
  }
}

async function capture(
  page: Page,
  crawlId: string,
  step: CrawledPage["step"],
  opts: { tiles: number; keepScroll?: boolean; note?: string; textOverride?: string },
): Promise<CrawledPage> {
  const title = await page.title();
  const rawText = opts.textOverride ?? (await page.evaluate(() => document.body?.innerText ?? ""));
  const text = rawText.replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT_CHARS);

  // Screenshots: the top of the page, then one screen further down, etc.
  const dir = path.dirname(screenshotPath(crawlId, "x"));
  await fs.mkdir(dir, { recursive: true });
  const screenshotFiles: string[] = [];
  let lastY = -1;
  for (let i = 0; i < opts.tiles; i++) {
    if (!opts.keepScroll) {
      const y = await page.evaluate(
        ([target]) => {
          window.scrollTo(0, target);
          return window.scrollY;
        },
        [i * VIEWPORT.height],
      );
      // Stop if the page barely moved, i.e. there's nothing new below.
      if (i > 0 && y - lastY < 200) break;
      lastY = y;
      await page.waitForTimeout(200);
    }
    const file = `${step}-${i + 1}.jpg`;
    try {
      await page.screenshot({ path: screenshotPath(crawlId, file), type: "jpeg", quality: 70 });
      screenshotFiles.push(file);
    } catch {
      // A failed screenshot isn't fatal; the text still describes the page.
    }
  }
  if (!opts.keepScroll) await page.evaluate(() => window.scrollTo(0, 0));

  return { step, url: page.url(), title, text, screenshotFiles, note: opts.note, signals: await measure(page, text) };
}

// Facts we can measure exactly with code, so the AI doesn't have to guess.
async function measure(page: Page, text: string): Promise<CrawledPage["signals"]> {
  const found = await page
    .evaluate(() => {
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const inputs = Array.from(
        document.querySelectorAll(
          "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), select, textarea",
        ),
      ).filter(visible);
      const cardRe = /card|cc-number|cc-exp|cvc|cvv|expir/i;
      const asksForCard =
        inputs.some((el) =>
          cardRe.test(
            [el.getAttribute("name"), el.getAttribute("placeholder"), el.getAttribute("autocomplete"), el.id].join(" "),
          ),
        ) || !!document.querySelector('iframe[src*="stripe"], iframe[name*="card"]');
      const socialRe = /(continue|sign (in|up)|log ?in) with (google|apple|github|microsoft|facebook)/i;
      const socialLogin = Array.from(document.querySelectorAll("button, a, [role=button]")).some((el) =>
        socialRe.test((el as HTMLElement).innerText || el.getAttribute("aria-label") || ""),
      );
      // Is this a LOG-IN page (for existing users)? Look at the page's main
      // heading, title and submit button, not small links like
      // "Don't have an account? Sign up".
      const hasPassword = inputs.some((el) => el.getAttribute("type") === "password");
      const main = [
        document.title,
        ...Array.from(document.querySelectorAll("h1, h2, button[type=submit], input[type=submit]")).map(
          (el) => (el as HTMLElement).innerText || (el as HTMLInputElement).value || "",
        ),
      ].join(" | ");
      const saysLogin = /log ?in|sign ?in|welcome back/i.test(main);
      const saysSignup = /sign ?up|create (an |your )?account|register|get started|join/i.test(main);
      return { formFields: inputs.length, asksForCard, socialLogin, loginOnly: hasPassword && saysLogin && !saysSignup };
    })
    .catch(() => ({ formFields: 0, asksForCard: false, socialLogin: false, loginOnly: false }));

  const prices = text.match(/[$€£]\s?\d[\d,.]*(\s?\/\s?(mo|month|yr|year|user|seat|week))?/gi) ?? [];
  return { ...found, pricesSeen: [...new Set(prices)].slice(0, 8) };
}

// ---------- finding things to click ----------

// Numbers every link and button, and tags it in the page so we can click it.
async function listClickables(page: Page): Promise<Clickable[]> {
  return page
    .evaluate(() => {
      const out: { id: number; tag: string; text: string; href: string; hidden: boolean }[] = [];
      const seen = new Set<string>();
      const els = document.querySelectorAll("a[href], button, [role=button], [role=link], input[type=submit]");
      for (const el of Array.from(els)) {
        if (out.length >= 150) break;
        const h = el as HTMLElement;
        const text = (h.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || (el as HTMLInputElement).value || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 60);
        if (!text) continue;
        const href = el.tagName === "A" ? (el as HTMLAnchorElement).href : "";
        const r = el.getBoundingClientRect();
        const hidden = r.width === 0 || r.height === 0;
        if (hidden && !href) continue; // can't click an invisible button
        const key = `${text}|${href}`;
        if (seen.has(key)) continue;
        seen.add(key);
        el.setAttribute("data-crawler-id", String(out.length));
        out.push({ id: out.length, tag: el.tagName.toLowerCase(), text, href, hidden });
      }
      return out;
    })
    .catch(() => []);
}

const ChoiceSchema = z.object({
  pricing_id: z.number(), // -1 = none
  signup_id: z.number(), // -1 = none
});

// Asks Haiku which elements a visitor would click. Costs a fraction of a cent.
async function chooseClicks(
  title: string,
  text: string,
  clickables: Clickable[],
  costs: CallCost[],
): Promise<{ pricing?: Clickable; signup?: Clickable }> {
  const fallback = guessByWords(clickables);
  if (!process.env.ANTHROPIC_API_KEY || clickables.length === 0) return fallback;

  try {
    const list = clickables
      .map((c) => `[${c.id}] ${c.tag} "${c.text}"${c.href ? ` -> ${shortHref(c.href)}` : ""}${c.hidden ? " (in a hidden menu)" : ""}`)
      .join("\n");
    const response = await anthropic.messages.parse({
      model: HAIKU,
      max_tokens: 1000,
      output_config: { effort: "low", format: zodOutputFormat(ChoiceSchema) },
      messages: [
        {
          role: "user",
          content:
            `A first-time visitor lands on this website.\nTitle: ${title}\nStart of page text:\n${text.slice(0, 1500)}\n\n` +
            `Clickable elements:\n${list}\n\n` +
            `Pick the id of the element a visitor would click to see PRICING or plans (pricing_id), and the id of the main ` +
            `call-to-action to SIGN UP, start, get started, try it, book a demo, or join a waitlist (signup_id). ` +
            `Prefer the main button over a small "log in" link. Use -1 if there is no good match.`,
        },
      ],
    });
    costs.push(costOfCall("crawl: choose clicks", response.model, response.usage));
    const pick = (n?: number) => clickables.find((c) => c.id === n);
    const c = response.parsed_output;
    if (!c) return fallback;
    return { pricing: pick(c.pricing_id) ?? fallback.pricing, signup: pick(c.signup_id) ?? fallback.signup };
  } catch (err) {
    console.warn("[crawl] AI click choice failed, using word matching:", (err as Error).message);
    return fallback;
  }
}

// Backup plan without AI: match common words.
function guessByWords(clickables: Clickable[]) {
  const PRICING = /pricing|plans|price|upgrade/i;
  const SIGNUP = /sign ?up|get started|start (for )?free|try (it )?(for )?free|create (an )?account|register|join|waitlist|get access|book a demo/i;
  const match = (re: RegExp) => clickables.find((c) => re.test(c.text) || re.test(c.href.replace(/^https?:\/\/[^/]+/, "")));
  return { pricing: match(PRICING), signup: match(SIGNUP) };
}

// After reloading a page the ids change, so find the same element by its text.
function findSame(list: Clickable[], target: Clickable) {
  return (
    list.find((c) => c.text === target.text && c.href === target.href) ??
    list.find((c) => c.text === target.text) ??
    undefined
  );
}

function shortHref(href: string) {
  return href.replace(/^https?:\/\//, "").slice(0, 80);
}

// ---------- clicking ----------

type FollowResult =
  | { kind: "page" } // we're now on a different page
  | { kind: "popup"; text?: string } // a dialog opened on the same page
  | { kind: "section"; text?: string } // it scrolled to part of the same page
  | { kind: "nothing" };

async function follow(page: Page, baseUrl: string, target: Clickable): Promise<FollowResult> {
  try {
    // Plain links to another page: just go there (also works for hidden menus).
    if (target.href && !target.href.startsWith("javascript:")) {
      if (isSamePageAnchor(target.href, page.url())) {
        return { kind: "section", text: await scrollToAnchor(page, target.href) };
      }
      await visit(page, target.href);
      return { kind: "page" };
    }

    // Buttons: actually click and watch what happens.
    const before = page.url();
    const dialogsBefore = await countDialogs(page);
    const newTab = page.context().waitForEvent("page", { timeout: 3_000 }).catch(() => null);
    await page.click(`[data-crawler-id="${target.id}"]`, { timeout: 5_000 });
    await settle(page, 3_000);

    const tab = await newTab;
    if (tab) {
      // It opened a new tab: read that URL in our main tab instead.
      const tabUrl = tab.url();
      await tab.close();
      if (tabUrl && tabUrl !== "about:blank") {
        await visit(page, tabUrl);
        return { kind: "page" };
      }
    }
    if (page.url() !== before) return { kind: "page" };
    if ((await countDialogs(page)) > dialogsBefore) {
      const text = await page.evaluate(() => {
        const d = Array.from(document.querySelectorAll('[role=dialog], dialog[open], [aria-modal="true"]')).pop();
        return (d as HTMLElement | undefined)?.innerText;
      });
      return { kind: "popup", text };
    }
    // The click may have scrolled to a section of the same page.
    const scrolled = await page.evaluate(() => window.scrollY > 100);
    return scrolled ? { kind: "section" } : { kind: "nothing" };
  } catch (err) {
    console.warn(`[crawl] couldn't follow "${target.text}" from ${baseUrl}:`, (err as Error).message.split("\n")[0]);
    return { kind: "nothing" };
  }
}

async function countDialogs(page: Page) {
  return page
    .evaluate(
      () =>
        Array.from(document.querySelectorAll('[role=dialog], dialog[open], [aria-modal="true"]')).filter((d) => {
          const r = d.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }).length,
    )
    .catch(() => 0);
}

function isSamePageAnchor(href: string, currentUrl: string) {
  try {
    const a = new URL(href);
    const b = new URL(currentUrl);
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
