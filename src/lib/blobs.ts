// Where screenshots (and other files) are kept.
//  - LocalBlobStore: a folder on this computer (benches, quick local tests)
//  - SupabaseBlobStore: Supabase Storage (production: the worker writes,
//    users read their own through signed links)
// Keys look like "{userId}/crawls/{crawlId}/hero-1.jpg".
import fs from "fs/promises";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface BlobStore {
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
}

// Where one crawl's or test's files go: the store + the folder inside it.
export type FileTarget = { store: BlobStore; prefix: string };

export const fileKey = (target: FileTarget, file: string) => `${target.prefix}/${file}`;

export class LocalBlobStore implements BlobStore {
  constructor(private root = path.join(process.cwd(), "data", "blobs")) {}
  private file(key: string) {
    const full = path.join(this.root, key);
    if (!full.startsWith(this.root)) throw new Error("bad file key"); // no "../" tricks
    return full;
  }
  async put(key: string, data: Buffer) {
    const f = this.file(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, data);
  }
  async get(key: string) {
    return fs.readFile(this.file(key)).catch(() => null);
  }
}

export class SupabaseBlobStore implements BlobStore {
  constructor(
    private client: SupabaseClient,
    private bucket = "screenshots",
  ) {}
  async put(key: string, data: Buffer, contentType = "image/jpeg") {
    const { error } = await this.client.storage.from(this.bucket).upload(key, data, { contentType, upsert: true });
    if (error) throw new Error(`upload failed for ${key}: ${error.message}`);
  }
  async get(key: string) {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
}
