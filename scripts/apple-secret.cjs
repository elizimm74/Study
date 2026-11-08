// Makes the "Secret Key" for Sign in with Apple (paste it into Supabase → Providers → Apple).
//
// Run on YOUR computer (the .p8 key never leaves it):
//   node scripts/apple-secret.cjs <path-to-AuthKey.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>
// e.g.
//   node scripts/apple-secret.cjs ~/Documents/AuthKey_ABC123DEFG.p8 TEAMID1234 ABC123DEFG app.crawler.web
//
// What it makes: a signed token (a "JWT") that tells Apple "this website is allowed to
// use Sign in with Apple for this Services ID". Apple lets it last at most 6 months,
// so run this again before it expires and paste the new one into Supabase.
//
// Uses only Node's built-in crypto: nothing to install.
const fs = require("fs");
const crypto = require("crypto");

const [, , keyPath, teamId, keyId, servicesId] = process.argv;
if (!keyPath || !teamId || !keyId || !servicesId) {
  console.error("Usage: node scripts/apple-secret.cjs <path-to-AuthKey.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>");
  process.exit(1);
}

// base64url = base64 with URL-safe letters and no "=" padding (what tokens use)
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

const now = Math.floor(Date.now() / 1000);
const SIX_MONTHS = 15777000; // the longest Apple allows, in seconds
const header = { alg: "ES256", kid: keyId, typ: "JWT" };
const payload = { iss: teamId, iat: now, exp: now + SIX_MONTHS, aud: "https://appleid.apple.com", sub: servicesId };

const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
const key = crypto.createPrivateKey(fs.readFileSync(keyPath.replace(/^~/, process.env.HOME || "~")));
// ES256 = the signature type Apple requires; "ieee-p1363" is the format tokens expect
const signature = crypto.sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" });

console.log(`${unsigned}.${b64url(signature)}`);
console.error(`\nCopy the long line above into Supabase → Authentication → Sign In / Providers → Apple → Secret Key.`);
console.error(`It expires on ${new Date((now + SIX_MONTHS) * 1000).toDateString()}. Set a reminder to make a new one before then.`);
