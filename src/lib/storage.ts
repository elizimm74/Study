// Short random ids like "k3f9x2ab" (used for crawls made outside the database,
// e.g. by the benches). Files live in blobs.ts; records live in Supabase.
import crypto from "crypto";

export function newId() {
  return crypto.randomBytes(5).toString("hex");
}
