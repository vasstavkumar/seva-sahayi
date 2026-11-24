// fail the vercel build early with a readable message
const missing = [];
if (!process.env.DATABASE_URL) {
  missing.push("DATABASE_URL — in Vercel open Storage → Create Database → Neon, connect it to this project, then redeploy.");
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  missing.push("SESSION_SECRET — Settings → Environment Variables; any random text of 32+ characters (openssl rand -hex 32).");
}
if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠ GEMINI_API_KEY is not set: the app will work, but AI suggestions are disabled.");
}
if (missing.length) {
  console.error("\n✗ Missing settings:\n  - " + missing.join("\n  - ") + "\n");
  process.exit(1);
}
console.log("✓ Environment looks good");
