import { chromium } from "rebrowser-playwright";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createObjectCsvWriter } from "csv-writer";

export interface ProductData {
  sku: string;
  source: string;
  title: string | null;
  description: string | null;
  price: string | null;
  rating: string | null;
  reviews: string | null;
}

interface DeviceProfile {
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  locale: string;
  timezoneId: string;
}

const DEVICE_PROFILES: DeviceProfile[] = [
  // ===== DESKTOP — Chrome =====
  // Chrome 120 — Windows 10
  { name: "Chrome 120 / Win10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/New_York" },
  // Chrome 121 — Windows 11
  { name: "Chrome 121 / Win11", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Chicago" },
  // Chrome 119 — Windows 10 (older)
  { name: "Chrome 119 / Win10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36", viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Denver" },
  // Chrome 118 — Windows 10 (older still)
  { name: "Chrome 118 / Win10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Los_Angeles" },
  // Chrome 120 — macOS Sonoma
  { name: "Chrome 120 / macOS", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/New_York" },
  // Chrome 121 — macOS
  { name: "Chrome 121 / macOS", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Chicago" },
  // Chrome 120 — Linux
  { name: "Chrome 120 / Linux", userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/New_York" },
  // Chrome 121 — Linux
  { name: "Chrome 121 / Linux", userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", viewport: { width: 1680, height: 1050 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Los_Angeles" },

  // ===== DESKTOP — Firefox =====
  { name: "Firefox 121 / Win10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/New_York" },
  { name: "Firefox 120 / Win10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0", viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Chicago" },
  { name: "Firefox 121 / macOS", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Los_Angeles" },
  { name: "Firefox 115 / Linux", userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Denver" },

  // ===== DESKTOP — Edge =====
  { name: "Edge 120 / Win10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/New_York" },
  { name: "Edge 121 / Win11", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0", viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Chicago" },

  // ===== DESKTOP — Safari =====
  { name: "Safari 17 / macOS Sonoma", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/New_York" },
  { name: "Safari 16 / macOS Ventura", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15", viewport: { width: 1680, height: 1050 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false, locale: "en-US", timezoneId: "America/Los_Angeles" },

  // ===== MOBILE — iPhone =====
  { name: "iPhone 15 Pro Max", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1", viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/New_York" },
  { name: "iPhone 14 Pro", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1", viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Chicago" },
  { name: "iPhone 13", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Denver" },
  { name: "iPhone 12", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.8 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Los_Angeles" },
  { name: "iPhone SE", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1", viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/New_York" },

  // ===== MOBILE — Android / Pixel =====
  { name: "Pixel 8 Pro", userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36", viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/New_York" },
  { name: "Pixel 7", userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36", viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Chicago" },
  { name: "Pixel 6a", userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Mobile Safari/537.36", viewport: { width: 412, height: 892 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Denver" },

  // ===== MOBILE — Samsung Galaxy =====
  { name: "Galaxy S24 Ultra", userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36", viewport: { width: 384, height: 854 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/New_York" },
  { name: "Galaxy S23", userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36", viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Chicago" },
  { name: "Galaxy A54", userAgent: "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Mobile Safari/537.36", viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Los_Angeles" },

  // ===== TABLET — iPad =====
  { name: "iPad Pro 12.9", userAgent: "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1", viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/New_York" },
  { name: "iPad Air", userAgent: "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1", viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Chicago" },

  // ===== MOBILE — BlackBerry =====
  { name: "BlackBerry KEY2", userAgent: "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+", viewport: { width: 432, height: 768 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/New_York" },
  { name: "BlackBerry Passport", userAgent: "Mozilla/5.0 (BB10; Kbd) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.3.3.2205 Mobile Safari/537.10+", viewport: { width: 453, height: 453 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Chicago" },
  { name: "BlackBerry PRIV (Android)", userAgent: "Mozilla/5.0 (Linux; Android 6.0.1; PRIV Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36", viewport: { width: 412, height: 732 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Denver" },
];

function getRandomProfile(): DeviceProfile {
  const profile = DEVICE_PROFILES[Math.floor(Math.random() * DEVICE_PROFILES.length)];
  return profile;
}

export async function createBrowser(useExistingDebugInstance = true) {
  if (useExistingDebugInstance) {
    console.log("Connecting to existing Chrome instance on port 9222...");
    try {
      return await chromium.connectOverCDP("http://127.0.0.1:9222");
    } catch (err) {
      console.error("Failed to connect to existing Chrome instance.");
      console.error(
        "Make sure you started your physical Chrome browser from the terminal using:",
      );
      console.error("google-chrome --remote-debugging-port=9222");
      throw err;
    }
  } else {
    const profile = getRandomProfile();
    console.log(`Launching REAL Google Chrome with persistent profile...`);
    console.log(`  Device: ${profile.name}`);
    console.log(`  User-Agent: ${profile.userAgent.substring(0, 60)}...`);
    console.log(`  Viewport: ${profile.viewport.width}x${profile.viewport.height} @ ${profile.deviceScaleFactor}x`);
    console.log(`  Mobile: ${profile.isMobile} | Touch: ${profile.hasTouch}`);
    const userDataDir = path.resolve(process.cwd(), "chrome-profile");
    try {
      const context = await chromium.launchPersistentContext(userDataDir, {
        channel: "chrome",
        headless: false,
        userAgent: profile.userAgent,
        viewport: profile.viewport,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        locale: profile.locale,
        timezoneId: profile.timezoneId,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
      });
      // Mock methods so the rest of our architecture doesn't break
      (context as any).newContext = async () => context;
      (context as any).contexts = () => [context];
      return context;
    } catch (err) {
      console.error(
        "CRITICAL ERROR: Failed to launch real Chrome. Make sure Google Chrome is installed and all Chrome windows are CLOSED!",
      );
      throw err;
    }
  }
}

export async function createContext(browser: any) {
  const contexts = browser.contexts();
  if (contexts.length > 0) {
    console.log("Attached to your existing Chrome profile and tabs...");
    return contexts[0];
  }

  console.log("Creating fallback context with realistic fingerprint...");
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      "sec-ch-ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Upgrade-Insecure-Requests": "1",
    },
  });

  return context;
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

export async function simulateTypingUrl(page: any, url: string): Promise<void> {
  // Inject a massive centered fake address bar overlay to visualize the typing for the user
  await page.evaluate(() => {
    const overlay = document.createElement("div");
    overlay.id = "fake-address-bar";
    overlay.style.position = "fixed";
    overlay.style.top = "50%";
    overlay.style.left = "50%";
    overlay.style.transform = "translate(-50%, -50%)";
    overlay.style.width = "80%";
    overlay.style.padding = "20px";
    overlay.style.fontSize = "48px";
    overlay.style.fontWeight = "bold";
    overlay.style.color = "white";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    overlay.style.borderRadius = "10px";
    overlay.style.zIndex = "999999";
    overlay.style.pointerEvents = "none";
    overlay.style.textAlign = "center";
    document.body.appendChild(overlay);
  });

  let currentText = "";
  for (const char of url) {
    currentText += char;
    await page.evaluate((text: string) => {
      const el = document.getElementById("fake-address-bar");
      if (el) el.innerText = text;
    }, currentText);
    const isHesitation = Math.random() > 0.8;
    const delay = isHesitation
      ? 300 + Math.random() * 500 // pause
      : 30 + Math.random() * 150; // fast typing
    await sleep(delay);
  }

  // Remove the fake address bar immediately before navigation starts
  await page.evaluate(() => {
    const el = document.getElementById("fake-address-bar");
    if (el) el.remove();
  });
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

  // Try at least once, then up to `retries` additional times.
  const maxAttempts = retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const message = err?.message || String(err);
      logError(sku, source, `Attempt ${attempt} failed: ${message}`, attempt);

      if (attempt === maxAttempts) {
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
