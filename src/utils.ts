import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs";
import * as path from "path";
import { createObjectCsvWriter } from "csv-writer";

// Ensure the plugin is used
chromium.use(StealthPlugin());

export interface ProductData {
  sku: string;
  source: string;
  title: string | null;
  description: string | null;
  price: string | null;
  rating: string | null;
  reviews: string | null;
}

// Removed dynamic user agent and viewport generation as we are now using the default browser context.

export async function createBrowser(proxyUrl?: string) {
  console.log("Connecting to existing Chrome instance on port 9222...");
  try {
    // Connect to an already running Chrome instance that was launched with --remote-debugging-port=9222
    return await chromium.connectOverCDP("http://127.0.0.1:9222");
  } catch (err) {
    console.error("Failed to connect to existing Chrome instance.");
    console.error(
      "Make sure you started your physical Chrome browser from the terminal using:",
    );
    console.error("google-chrome --remote-debugging-port=9222");
    throw err;
  }
}

export async function createContext(browser: any) {
  const contexts = browser.contexts();
  if (contexts.length > 0) {
    console.log("Attached to your existing Chrome profile and tabs...");
    return contexts[0];
  }

  console.log("Creating fallback context...");
  return await browser.newContext();
}

export async function applyStealthScripts(page: any) {
  await page.addInitScript(() => {
    // Remove webdriver flag
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    // Spoof plugins
    Object.defineProperty(navigator, "plugins", {
      get: () => [
        { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
        {
          name: "Chrome PDF Viewer",
          filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
        },
        { name: "Native Client", filename: "internal-nacl-plugin" },
      ],
    });

    // Spoof languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });

    // Spoof hardware
    Object.defineProperty(navigator, "hardwareConcurrency", {
      get: () => 8,
    });

    Object.defineProperty(navigator, "deviceMemory", {
      get: () => 8,
    });

    // Spoof platform
    Object.defineProperty(navigator, "platform", {
      get: () => "Linux x86_64",
    });

    // We will rely on puppeteer-extra-plugin-stealth for the rest.
    // Manual hooks for WebGL and Canvas here are often detected by Google's
    // advanced bot protection because they fail the Function.prototype.toString check.
  });
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function randomDelay(min = 1500, max = 4000): Promise<void> {
  await sleep(min + Math.random() * (max - min));
}

export async function simulateHumanBehavior(page: any): Promise<void> {
  // Random initial delay
  await randomDelay(1000, 2500);

  // Smooth random mouse movement
  const viewport = page.viewportSize();
  if (viewport) {
    const steps = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < steps; i++) {
      await page.mouse.move(
        Math.random() * viewport.width,
        Math.random() * viewport.height,
        { steps: 10 + Math.floor(Math.random() * 20) }, // smooth movement
      );
      await randomDelay(200, 600);
    }
  }

  // Random scroll
  await page.evaluate(() => {
    const scrollAmount = 200 + Math.random() * 500;
    window.scrollBy({ top: scrollAmount, behavior: "smooth" });
  });

  await randomDelay(500, 1500);

  // Scroll back up slightly
  await page.evaluate(() => {
    window.scrollBy({ top: -(50 + Math.random() * 150), behavior: "smooth" });
  });

  await randomDelay(300, 800);
}

export async function isBlocked(
  page: any,
): Promise<{ blocked: boolean; reason: string }> {
  const url = page.url();
  const title = (await page.title()).toLowerCase();

  // Amazon signals
  if (url.includes("/errors/validateCaptcha")) {
    return { blocked: true, reason: "Amazon CAPTCHA page" };
  }
  if (await page.$('form[action="/errors/validateCaptcha"]')) {
    return { blocked: true, reason: "Amazon CAPTCHA form detected" };
  }

  // Walmart / PerimeterX signals
  if (await page.$("#px-captcha")) {
    return { blocked: true, reason: "PerimeterX CAPTCHA (Walmart)" };
  }
  if (url.includes("blocked") || title.includes("blocked")) {
    return { blocked: true, reason: "Block page detected" };
  }

  // Generic signals
  if (title.includes("robot check") || title.includes("access denied")) {
    return { blocked: true, reason: `Generic block: ${title}` };
  }
  if (title.includes("403") || title.includes("429") || title.includes("503")) {
    return { blocked: true, reason: `HTTP error page: ${title}` };
  }

  // Check HTTP status via response interception (set up separately)
  const bodyText = await page.evaluate(() => document.body?.innerText || "");
  if (
    bodyText.includes("unusual traffic") ||
    bodyText.includes("automated access")
  ) {
    return { blocked: true, reason: "Bot traffic warning in body" };
  }

  return { blocked: false, reason: "" };
}

const LOG_FILE = path.resolve(__dirname, "../errors.log");

export function logError(
  sku: string,
  source: string,
  message: string,
  attempt?: number,
): void {
  const timestamp = new Date().toISOString();
  const attemptStr = attempt ? ` [Attempt ${attempt}]` : "";
  const line = `[${timestamp}]${attemptStr} [${source}] SKU: ${sku} — ${message}\n`;

  fs.appendFileSync(LOG_FILE, line, "utf8");
  console.error(line.trim());
}

export function logInfo(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    baseDelay?: number;
    sku: string;
    source: string;
  },
): Promise<T | null> {
  const { retries = 3, baseDelay = 3000, sku, source } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const message = err?.message || String(err);
      logError(sku, source, `Attempt ${attempt} failed: ${message}`, attempt);

      if (attempt === retries) {
        logError(sku, source, "All retry attempts exhausted");
        return null;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * attempt + Math.random() * 1000;
      logInfo(`Retrying ${sku} in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  return null;
}

export async function writeToCSV(data: ProductData[]): Promise<void> {
  // Use append logic so we can stream chunks instead of keeping everything in memory
  const fileExists = fs.existsSync("product_data.csv");
  const isEmpty = fileExists
    ? fs.statSync("product_data.csv").size === 0
    : true;

  const csvWriter = createObjectCsvWriter({
    path: "product_data.csv",
    header: [
      { id: "sku", title: "SKU" },
      { id: "source", title: "Source" },
      { id: "title", title: "Title" },
      { id: "description", title: "Description" },
      { id: "price", title: "Price" },
      { id: "reviews", title: "Number of Reviews" },
      { id: "rating", title: "Rating" },
    ],
    append: fileExists && !isEmpty,
  });

  await csvWriter.writeRecords(data.filter(Boolean));
  logInfo(`CSV updated. Appended ${data.filter(Boolean).length} records.`);
}
