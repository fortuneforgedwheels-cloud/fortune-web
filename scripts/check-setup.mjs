#!/usr/bin/env node
/**
 * Verifies this repo is ready to pull/push the Fortune Forged Shopify theme.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const themeDir = join(root, "theme");

function loadDotEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const checks = [];
const pass = (label, detail = "") => checks.push({ ok: true, label, detail });
const fail = (label, detail = "") => checks.push({ ok: false, label, detail });

const cli = spawnSync("npx", ["shopify", "version"], {
  cwd: root,
  encoding: "utf8",
});
if (cli.status === 0) {
  pass("Shopify CLI installed", (cli.stdout || cli.stderr || "").trim());
} else {
  fail("Shopify CLI installed", "Run: npm install");
}

const store = process.env.SHOPIFY_FLAG_STORE || "bb6223-6f.myshopify.com";
pass("Store configured", store);

const token = process.env.SHOPIFY_CLI_THEME_TOKEN || "";
if (token.startsWith("shptka_") || token.startsWith("shpat_")) {
  pass("Theme access token present", `${token.slice(0, 10)}…`);
} else if (token) {
  fail(
    "Theme access token present",
    "Token found but unexpected format. Theme Access passwords usually start with shptka_."
  );
} else {
  fail(
    "Theme access token present",
    "Missing SHOPIFY_CLI_THEME_TOKEN. Create a Theme Access password in Shopify Admin, then add it to .env or Cursor secrets."
  );
}

const themeId =
  process.env.SHOPIFY_FLAG_THEME ||
  process.env.SHOPIFY_THEME_ID ||
  "178099421459";
pass("Live theme ID", themeId);

const liquidFiles = existsSync(themeDir)
  ? readdirSync(themeDir, { withFileTypes: true }).some((entry) => {
      if (entry.isFile() && entry.name.endsWith(".liquid")) return true;
      if (!entry.isDirectory()) return false;
      try {
        return readdirSync(join(themeDir, entry.name)).some((f) =>
          f.endsWith(".liquid")
        );
      } catch {
        return false;
      }
    })
  : false;

if (liquidFiles) {
  pass("Theme source present", "theme/ contains Liquid files");
} else {
  fail(
    "Theme source present",
    "theme/ is empty. After adding SHOPIFY_CLI_THEME_TOKEN, run: npm run theme:pull"
  );
}

console.log("\nFortune Forged — Shopify setup check\n");
for (const item of checks) {
  const mark = item.ok ? "✓" : "✗";
  console.log(`${mark} ${item.label}${item.detail ? ` — ${item.detail}` : ""}`);
}

const blocked = checks.filter((c) => !c.ok);
console.log("");
if (blocked.length === 0) {
  console.log("Ready. You can run npm run theme:dev or ask the agent to make changes.\n");
  process.exit(0);
}

console.log("Next steps:");
console.log("1. Install Theme Access app: https://apps.shopify.com/theme-access");
console.log("2. Create a theme password for this project");
console.log("3. Put it in .env as SHOPIFY_CLI_THEME_TOKEN=shptka_...");
console.log("4. Run: npm run theme:pull");
console.log("5. Re-run: npm run setup:check\n");
process.exit(1);
