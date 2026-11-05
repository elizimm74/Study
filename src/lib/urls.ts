// Turns what people type ("mysite.com") into a full address, or null.
export function normalizeUrl(input?: string | null) {
  if (!input?.trim()) return null;
  const raw = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  try {
    const u = new URL(raw);
    // Real domains, plus localhost so the demo sites work on your own computer.
    return u.hostname.includes(".") || u.hostname === "localhost" ? u.toString() : null;
  } catch {
    return null;
  }
}

// Screenshot link for the browser. The files API checks they're yours.
export const fileUrl = (prefix: string, file: string) => `/api/files/${prefix}/${file}`;
