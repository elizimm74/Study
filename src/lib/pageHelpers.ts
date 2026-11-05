// Helpers that run INSIDE the web page (in the browser), installed on every
// page before the site's own code runs.
//
// Why: some sites put buttons and text inside "web components" (shadow DOM),
// which normal searches like document.querySelectorAll can't see. These
// helpers search inside those too.
import type { BrowserContext } from "playwright";

export type CrawlerHelpers = {
  deepAll: (selector: string) => Element[]; // like querySelectorAll, but also inside web components
  deepText: () => string; // all visible text, including inside web components
};

declare global {
  interface Window {
    __crawler: CrawlerHelpers;
  }
}

// Written as a plain string so it can be injected into any page as-is.
const SCRIPT = `
(() => {
  function roots() {
    const out = [document];
    const walk = (root) => {
      for (const el of root.querySelectorAll("*")) {
        if (el.shadowRoot) { out.push(el.shadowRoot); walk(el.shadowRoot); }
      }
    };
    walk(document);
    return out;
  }
  window.__crawler = {
    deepAll(selector) {
      const found = [];
      for (const r of roots()) for (const el of r.querySelectorAll(selector)) found.push(el);
      return found;
    },
    deepText() {
      let text = document.body ? document.body.innerText : "";
      for (const r of roots().slice(1)) {
        for (const child of r.children) {
          const t = child.innerText || "";
          if (t.trim()) text += "\\n" + t;
        }
      }
      return text;
    },
  };
})();
`;

export async function installHelpers(context: BrowserContext) {
  await context.addInitScript({ content: SCRIPT });
}
