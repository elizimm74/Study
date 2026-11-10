// The product name. Change it here and it updates everywhere.
export const APP_NAME = "Crawler";

// Where the site lives (for share links and social images). Set NEXT_PUBLIC_SITE_URL
// in production, e.g. https://crawler.app. Falls back to your own computer.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
