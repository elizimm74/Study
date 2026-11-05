// STEP 1 of the engine: visit the site ONCE with an invisible browser,
// the way a real first-time visitor would:
//   landing page -> click to pricing -> click to signup (or waitlist).
//
// How it works:
//  1. visit():      open the page and WAIT until its content stops changing
//  2. checkBlocked(): stop with a clear message on "checking your browser" pages
//  3. prepare():    close cookie pop-ups, scroll so lazy content loads
//  4. capture():    save text, screenshots, and facts we can measure
//  5. listClickables(): every link and button, including inside web components
//  6. chooseClicks():  ranked candidates for pricing and signup: Haiku's top 3,
//                      plus backups from word matching
//  7. findStep():   try candidates in order, and CHECK each one landed on the
//                   right kind of page (pricing must show prices; signup must
//                   have a form). Wrong page? Try the next one.
//  8. guessAddresses(): last resort: try common addresses like /pricing
//
// Accuracy is measured with practice sites: `npm run bench`.
import { chromium, devices, type Browser, type Page } from "playwright";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, HAIKU } from "./ai";
import { costOfCall } from "./cost";
import type { CallCost, Crawl, CrawledPage } from "./types";
import { newId, saveJson, screenshotPath } from "./storage";
import { installHelpers } from "./pageHelpers";

const MAX_TEXT_CHARS = 6000; // keep the AI input (and cost) small
const VIEWPORT = { width: 1280, height: 800 };
const MAX_TRIES = 3; // candidates to try per step

type Step = "pricing" | "signup";

type Clickable = {
  id: number;
  tag: string; // "a", "button", ...
  text: string;
  href: string; // "" for buttons
  hidden: boolean; // e.g. inside a closed menu
  top: number; // distance from the top of the page (px): high up = more prominent
  big: boolean; // looks like a main button
};

// Thrown when the site shows a bot-protection page instead of its content.
export class BlockedError extends Error {}

export async function crawlSite(url: string): Promise<Crawl> {
  const id = newId();
  const costs: CallCost[] = [];
  const browser = await chromium.launch();
  try {
    // A normal desktop Chrome identity, at our usual window size.
    const context = await browser.newContext({ ...devices["Desktop Chrome"], viewport: VIEWPORT });
    await installHelpers(context);
    const page = await context.newPage();
    const pages: CrawledPage[] = [];

    // 1) Landing page
    await visit(page, url);
    await checkBlocked(page);
    await prepare(page);
    const hero = await capture(page, id, "hero", { tiles: 2 });
    pages.push(hero);
    const heroUrl = page.url(); // after any redirects
    // The phone screenshot happens in the background while we explore (faster).
    const phoneShot = capturePhone(browser, heroUrl, id);

    // 2) What would a visitor click?
    const clickables = await listClickables(page);
    const choice = await chooseClicks(hero.title, hero.text, clickables, costs);

    // 3) + 4) Look for pricing and signup AT THE SAME TIME, in two browser tabs.
    const signupTab = await context.newPage();
    const [pricing, signupFromHero] = await Promise.all([
      (async () =>
        (await safely(() => findStep(page, id, "pricing", choice.pricing, heroUrl))) ??
        (await safely(() => guessAddresses(page, id, "pricing", heroUrl))))(),
      safely(async () => {
        await visit(signupTab, heroUrl);
        await prepare(signupTab);
        return findStep(signupTab, id, "signup", choice.signup, heroUrl);
      }),
    ]);
    if (pricing) pages.push(pricing);

    // No signup from the landing page? Try the pricing page (it usually has a
    // "Start" button), then common addresses.
    let signup = signupFromHero;
    if (!signup && pricing && pricing.url !== heroUrl && !pricing.note) {
      signup = await safely(async () => {
        await visit(signupTab, pricing.url);
        await prepare(signupTab);
        return findStep(signupTab, id, "signup", rankByWords(await listClickables(signupTab)).signup, pricing.url);
      });
    }
    signup ??= await safely(() => guessAddresses(signupTab, id, "signup", heroUrl));
    if (signup) pages.push(signup);
    hero.mobileScreenshotFile = await phoneShot;

    const crawl: Crawl = { id, url, createdAt: new Date().toISOString(), pages, costs };
    await saveJson("crawls", id, crawl);
    return crawl;
  } finally {
    await browser.close(); // always close, even if something failed
  }
}

// One failed step (a broken link, a timeout) shouldn't ruin the whole crawl.
async function safely<T>(fn: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn("[crawl] step failed:", (err as Error).message.split("\n")[0]);
    return null;
  }
}

// ---------- finding the right page, and checking it ----------

// Try each candidate in order. Keep the first one that really is a pricing
// (or signup) page.
async function findStep(
  page: Page,
  crawlId: string,
  step: Step,
  candidates: Clickable[],
  startUrl: string,
): Promise<CrawledPage | null> {
  for (const [i, candidate] of candidates.slice(0, MAX_TRIES).entries()) {
    // Start each try from the same page (an earlier try may have moved us).
    if (i > 0 || page.url() !== startUrl) {
      await visit(page, startUrl);
      await prepare(page);
    }
    // Number the buttons on THIS tab, then find the candidate among them
    // (numbers from another tab or an earlier visit don't carry over).
    const target = findSame(await listClickables(page), candidate);
    if (!target) continue;

    const result = await follow(page, target);
    if (result.kind === "nothing") continue;
    let captured = await captureResult(page, crawlId, step, result);

    // Signup led to "Log in" (for existing users)? Look for "Create account".
    if (step === "signup" && result.kind === "page" && captured.signals.loginOnly) {
      captured = (await fromLoginToSignup(page, crawlId)) ?? {
        ...captured,
        note: "Only a log-in page was found. New visitors may not see how to create an account.",
      };
    }
    if (looksRight(step, captured)) return captured;
    console.log(`[crawl] "${target.text}" didn't lead to a real ${step} page; trying the next option`);
  }
  return null;
}

// Pricing must show prices. Signup must have a form or a "continue with Google".
function looksRight(step: Step, p: CrawledPage) {
  if (step === "pricing") {
    return (
      p.signals.pricesSeen.length > 0 ||
      /\bfree\b[\s\S]{0,80}\b(plan|tier|forever)\b|\bper (month|user|seat|year)\b|\/\s?(mo|month|yr|year)\b|\bbilled (monthly|annually|yearly)\b/i.test(p.text)
    );
  }
  return p.signals.formFields > 0 || p.signals.socialLogin || (p.signals.loginOnly && Boolean(p.note));
}

async function fromLoginToSignup(page: Page, crawlId: string): Promise<CrawledPage | null> {
  const create = rankByWords(await listClickables(page)).signup[0];
  if (!create) return null;
  const result = await follow(page, create);
  if (result.kind === "nothing") return null;
  return captureResult(page, crawlId, "signup", result, "The button led to a log-in page first; the create-account page was one more click away.");
}

async function captureResult(
  page: Page,
  crawlId: string,
  step: Step,
  result: Exclude<FollowResult, { kind: "nothing" }>,
  note?: string,
): Promise<CrawledPage> {
  if (result.kind === "page") {
    await prepare(page);
    return capture(page, crawlId, step, { tiles: step === "pricing" ? 2 : 1, note });
  }
  const where =
    result.kind === "popup"
      ? `${step === "pricing" ? "Pricing" : "Signup"} opened in a pop-up.`
      : step === "pricing"
        ? "Pricing is a section on the landing page."
        : "Signup is a form further down the landing page.";
  return capture(page, crawlId, step, { tiles: 1, keepScroll: true, note: note ?? where, textOverride: result.text });
}

// Last resort: many sites have /pricing or /signup even without a visible link.
async function guessAddresses(page: Page, crawlId: string, step: Step, heroUrl: string): Promise<CrawledPage | null> {
  const paths =
    step === "pricing"
      ? ["/pricing", "/plans", "/price", "/pricing-plans"]
      : ["/signup", "/sign-up", "/register", "/join", "/get-started", "/waitlist"];
  const origin = new URL(heroUrl).origin;
  for (const p of paths) {
    const response = await page.goto(origin + p, { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null);
    if (!response || response.status() >= 400) continue;
    await waitForContent(page);
    if (/404|not found|page (doesn't|does not) exist/i.test(await page.title())) continue;
    await prepare(page);
    const captured = await capture(page, crawlId, step, {
      tiles: 1,
      note: `There's no visible ${step} link; we found it by trying the address ${p}. Real visitors may not find it.`,
    });
    if (looksRight(step, captured)) return captured;
  }
  return null;
}

// ---------- visiting and preparing a page ----------

async function visit(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await settle(page);
  await waitForContent(page);
}

// Give JavaScript-heavy sites a moment to finish loading (max 5s).
async function settle(page: Page, ms = 5_000) {
  await page.waitForLoadState("networkidle", { timeout: ms }).catch(() => {});
}

// Many sites draw their content with JavaScript AFTER loading. Wait until the
// page has real text and it has stopped changing (max ~6s).
async function waitForContent(page: Page) {
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 20; i++) {
    const len = await page.evaluate(() => window.__crawler?.deepText().trim().length ?? 0).catch(() => 0);
    stable = len === last && len > 40 ? stable + 1 : 0;
    if (stable >= 2) return;
    last = len;
    await page.waitForTimeout(300);
  }
}

// "Checking your browser..." pages: wait a bit (some pass by themselves),
// then stop with a clear message instead of reviewing a block page.
async function checkBlocked(page: Page) {
  const looksBlocked = async () => {
    const title = await page.title().catch(() => "");
    const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
    return (
      text.length < 2000 &&
      /just a moment|checking (your|the) browser|attention required|verify you are (a )?human|are you a robot|access denied|ddos protection|enable javascript and cookies/i.test(
        title + " " + text,
      )
    );
  };
  if (!(await looksBlocked())) return;
  await page.waitForTimeout(6_000);
  await settle(page);
  if (await looksBlocked()) {
    throw new BlockedError(
      "This site's bot protection blocked our browser, so we couldn't read it. If it's your site, allow it or use a preview link.",
    );
  }
}

async function prepare(page: Page) {
  // Close cookie banners by clicking an "Accept"-style button.
  await page
    .evaluate(() => {
      const re = /^(accept|accept all|accept cookies|allow all|allow cookies|agree|i agree|got it|ok|okay|i understand|accept & close)$/i;
      for (const el of window.__crawler.deepAll("button, a, [role=button]")) {
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
    await installHelpers(context);
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
  const rawText = opts.textOverride ?? (await page.evaluate(() => window.__crawler?.deepText() ?? document.body?.innerText ?? ""));
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
      const all = (sel: string) => window.__crawler?.deepAll(sel) ?? Array.from(document.querySelectorAll(sel));
      const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const inputs = all(
        "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), select, textarea",
      ).filter(visible);
      const cardRe = /card|cc-number|cc-exp|cvc|cvv|expir/i;
      const asksForCard =
        inputs.some((el) =>
          cardRe.test(
            [el.getAttribute("name"), el.getAttribute("placeholder"), el.getAttribute("autocomplete"), el.id].join(" "),
          ),
        ) || all('iframe[src*="stripe"], iframe[name*="card"]').length > 0;
      const socialRe = /(continue|sign (in|up)|log ?in) with (google|apple|github|microsoft|facebook)/i;
      const socialLogin = all("button, a, [role=button]").some((el) =>
        socialRe.test((el as HTMLElement).innerText || el.getAttribute("aria-label") || ""),
      );
      // Is this a LOG-IN page (for existing users)? Look at the page's main
      // heading, title and submit button, not small links like
      // "Don't have an account? Sign up".
      const hasPassword = inputs.some((el) => el.getAttribute("type") === "password");
      const main = [
        document.title,
        ...all("h1, h2, button[type=submit], input[type=submit]").map(
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

// Numbers every link and button (including inside web components), and tags
// it in the page so we can click it.
async function listClickables(page: Page): Promise<Clickable[]> {
  return page
    .evaluate(() => {
      const out: { id: number; tag: string; text: string; href: string; hidden: boolean; top: number; big: boolean }[] = [];
      const seen = new Set<string>();
      const els = window.__crawler.deepAll("a[href], button, [role=button], [role=link], input[type=submit]");
      for (const el of els) {
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
        const big = r.width * r.height > 4000 && r.height >= 30; // roughly a real button, not a small text link
        out.push({ id: out.length, tag: el.tagName.toLowerCase(), text, href, hidden, top: Math.round(r.top + window.scrollY), big });
      }
      return out;
    })
    .catch(() => []);
}

const ChoiceSchema = z.object({
  pricing_ids: z.array(z.number()), // best first, up to 3, empty = none
  signup_ids: z.array(z.number()),
});

// Ranked candidates: Haiku's picks first (if there's a key), then backups
// from word matching, without duplicates.
async function chooseClicks(
  title: string,
  text: string,
  clickables: Clickable[],
  costs: CallCost[],
): Promise<{ pricing: Clickable[]; signup: Clickable[] }> {
  const backup = rankByWords(clickables);
  if (!process.env.ANTHROPIC_API_KEY || clickables.length === 0) return backup;

  try {
    const list = clickables
      .map(
        (c) =>
          `[${c.id}] ${c.tag}${c.big ? " (big button)" : ""} "${c.text}"${c.href ? ` -> ${shortHref(c.href)}` : ""}` +
          `${c.hidden ? " (in a hidden menu)" : ` (${c.top < 800 ? "top of page" : "further down"})`}`,
      )
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
            `pricing_ids: up to 3 element ids a visitor would click to see PRICING or plans, best first. ` +
            `signup_ids: up to 3 ids for the main call-to-action to SIGN UP, start, get started, try it, request access, ` +
            `book a demo, or join a waitlist, best first. Prefer the main button over a small "log in" link. ` +
            `Use empty lists if there is no good match.`,
        },
      ],
    });
    costs.push(costOfCall("crawl: choose clicks", response.model, response.usage));
    const c = response.parsed_output;
    if (!c) return backup;
    const pick = (ids: number[]) => ids.map((n) => clickables.find((x) => x.id === n)).filter((x): x is Clickable => !!x);
    return { pricing: merge(pick(c.pricing_ids), backup.pricing), signup: merge(pick(c.signup_ids), backup.signup) };
  } catch (err) {
    console.warn("[crawl] AI click choice failed, using word matching:", (err as Error).message);
    return backup;
  }
}

function merge(first: Clickable[], second: Clickable[]) {
  const out = [...first];
  for (const c of second) if (!out.some((x) => x.id === c.id)) out.push(c);
  return out;
}

// Backup plan without AI: give each link/button points for matching words,
// being a big button, and being near the top. Highest points first.
function rankByWords(clickables: Clickable[]): { pricing: Clickable[]; signup: Clickable[] } {
  const path = (c: Clickable) => c.href.replace(/^https?:\/\/[^/]+/, "");
  const isLogin = (c: Clickable) => /^(log ?in|sign ?in|login)$/i.test(c.text);

  const pricingScore = (c: Clickable) => {
    let s = 0;
    if (/^(pricing|plans|prices?|plans? (&|and) pricing|pricing (&|and) plans|plans? (&|and) billing|upgrade)$/i.test(c.text)) s += 5;
    else if (/pricing|plans|price|billing/i.test(c.text)) s += 3;
    if (/pricing|plans|price|billing/i.test(path(c))) s += 2;
    if (/blog|news|article|post/i.test(path(c) + " " + c.text)) s -= 3; // a blog post *about* pricing isn't the pricing page
    return s;
  };

  const signupScore = (c: Clickable) => {
    if (isLogin(c)) return 0;
    let s = 0;
    if (/sign ?up|get started|create (an |your )?account|register|join|waitlist|request (early )?access|get (early )?access|book a demo|start (your )?(free )?trial/i.test(c.text)) s += 5;
    else if (/^(get|start|try|download|claim|begin)\b/i.test(c.text)) s += 3; // "Get Pixly free", "Start making beats", "Try it free"
    else if (/\bfree\b/i.test(c.text) && c.text.length < 30) s += 2;
    if (/sign-?up|register|join|start|waitlist|get-started|access/i.test(path(c))) s += 2;
    if (s > 0 && c.big) s += 1;
    if (s > 0 && c.top < 800 && !c.hidden) s += 1;
    return s;
  };

  const rank = (score: (c: Clickable) => number) =>
    clickables
      .map((c) => ({ c, s: score(c) }))
      .filter((x) => x.s >= 3)
      .sort((a, b) => b.s - a.s || a.c.top - b.c.top)
      .map((x) => x.c);

  return { pricing: rank(pricingScore), signup: rank(signupScore) };
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
  | { kind: "page" } // we're now on a different page (or a different app screen)
  | { kind: "popup"; text?: string } // a dialog opened on the same page
  | { kind: "section"; text?: string } // it scrolled to part of the same page
  | { kind: "nothing" };

async function follow(page: Page, target: Clickable): Promise<FollowResult> {
  try {
    // Plain links to another page: just go there (also works for hidden menus).
    if (target.href && !target.href.startsWith("javascript:")) {
      if (isSamePageAnchor(target.href, page.url())) {
        // "#pricing" scrolls to a section. But "#/plans" in a single-page app
        // is a whole new screen, so there's no such section: click it instead.
        const section = await scrollToAnchor(page, target.href);
        if (section !== null) return { kind: "section", text: section };
      } else {
        await visit(page, target.href);
        return { kind: "page" };
      }
    }

    // Buttons: actually click and watch what happens.
    const before = page.url();
    const textBefore = await page.evaluate(() => window.__crawler?.deepText().slice(0, 2000) ?? "").catch(() => "");
    const dialogsBefore = await countDialogs(page);
    // Notice if the click opens a new tab (without waiting for one that never comes).
    let tab: Page | null = null;
    const onTab = (p: Page) => (tab = p);
    page.context().on("page", onTab);
    await page.click(`[data-crawler-id="${target.id}"]`, { timeout: 5_000 });
    await settle(page, 3_000);
    page.context().off("page", onTab);

    if (tab) {
      // It opened a new tab: read that URL in our main tab instead.
      const opened = tab as Page;
      await opened.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
      const tabUrl = opened.url();
      await opened.close();
      if (tabUrl && tabUrl !== "about:blank") {
        await visit(page, tabUrl);
        return { kind: "page" };
      }
    }
    if (page.url() !== before) {
      await waitForContent(page);
      return { kind: "page" };
    }
    if ((await countDialogs(page)) > dialogsBefore) {
      const text = await page.evaluate(() => {
        const d = window.__crawler.deepAll('[role=dialog], dialog[open], [aria-modal="true"]').pop();
        return (d as HTMLElement | undefined)?.innerText;
      });
      return { kind: "popup", text };
    }
    // The click may have swapped the content without changing the address.
    const textAfter = await page.evaluate(() => window.__crawler?.deepText().slice(0, 2000) ?? "").catch(() => "");
    if (textAfter && textAfter !== textBefore) return { kind: "page" };
    // Or scrolled to a section of the same page.
    const scrolled = await page.evaluate(() => window.scrollY > 100);
    return scrolled ? { kind: "section" } : { kind: "nothing" };
  } catch (err) {
    console.warn(`[crawl] couldn't follow "${target.text}":`, (err as Error).message.split("\n")[0]);
    return { kind: "nothing" };
  }
}

async function countDialogs(page: Page) {
  return page
    .evaluate(
      () =>
        window.__crawler.deepAll('[role=dialog], dialog[open], [aria-modal="true"]').filter((d) => {
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

// Scrolls to e.g. "#pricing" and returns that section's text,
// or null if the page has no such section.
async function scrollToAnchor(page: Page, href: string): Promise<string | null> {
  const hash = decodeURIComponent(new URL(href).hash.slice(1));
  const text = await page
    .evaluate((h) => {
      const el = document.getElementById(h);
      if (!el) return null;
      el.scrollIntoView();
      return (el as HTMLElement).innerText || "";
    }, hash)
    .catch(() => null);
  await page.waitForTimeout(500);
  return text;
}
