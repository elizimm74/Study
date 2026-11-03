// Saves crawls and runs as plain JSON files in a `data/` folder.
// No database yet (that's Supabase later) — files are easy to open and inspect.
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const DATA_DIR = path.join(process.cwd(), "data");

export function newId() {
  // Short random id like "k3f9x2ab"
  return crypto.randomBytes(5).toString("hex");
}

export async function saveJson(kind: "crawls" | "runs", id: string, data: unknown) {
  const dir = path.join(DATA_DIR, kind);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(data, null, 2));
}

export async function loadJson<T>(kind: "crawls" | "runs", id: string): Promise<T | null> {
  // Only allow simple ids so nobody can ask for "../../secret-file"
  if (!/^[a-z0-9]+$/.test(id)) return null;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, kind, `${id}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function screenshotPath(crawlId: string, file: string) {
  return path.join(DATA_DIR, "screenshots", crawlId, file);
}
