// Encrypts test-account logins while they wait in the job queue.
// AES-256-GCM: the web app encrypts, the worker decrypts and then erases it.
// The key (CREDENTIALS_KEY) is 32 random bytes, base64. Make one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
import crypto from "crypto";

function key() {
  const raw = Buffer.from(process.env.CREDENTIALS_KEY ?? "", "base64");
  if (raw.length !== 32) throw new Error("CREDENTIALS_KEY must be 32 random bytes in base64 (see .env.example).");
  return raw;
}

export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptJson<T>(sealed: string): T {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("unreadable secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url")); // fails if anyone changed it
  const plain = Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}
