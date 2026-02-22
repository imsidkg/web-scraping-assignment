import { chromium } from "patchright";
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
  /*
  // ===== DESKTOP — Chrome =====
  // Chrome 120 — Windows 10
  {
    name: "Chrome 120 / Win10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  // Chrome 121 — Windows 11
  {
    name: "Chrome 121 / Win11",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    viewport: { width: 1536, height: 864 },
    deviceScaleFactor: 1.25,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  // Chrome 119 — Windows 10 (older)
  {
    name: "Chrome 119 / Win10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Denver",
  },
  // Chrome 118 — Windows 10 (older still)
  {
    name: "Chrome 118 / Win10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  },
  // Chrome 120 — macOS Sonoma
  {
    name: "Chrome 120 / macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  // Chrome 121 — macOS
  {
    name: "Chrome 121 / macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    viewport: { width: 2560, height: 1440 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  // Chrome 120 — Linux
  {
    name: "Chrome 120 / Linux",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  // Chrome 121 — Linux
  {
    name: "Chrome 121 / Linux",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    viewport: { width: 1680, height: 1050 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  },

  // ===== DESKTOP — Firefox =====
  {
    name: "Firefox 121 / Win10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    name: "Firefox 120 / Win10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  {
    name: "Firefox 121 / macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  },
  {
    name: "Firefox 115 / Linux",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Denver",
  },

  // ===== DESKTOP — Edge =====
  {
    name: "Edge 120 / Win10",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    name: "Edge 121 / Win11",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
    viewport: { width: 1536, height: 864 },
    deviceScaleFactor: 1.25,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },

  // ===== DESKTOP — Safari =====
  {
    name: "Safari 17 / macOS Sonoma",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    name: "Safari 16 / macOS Ventura",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    viewport: { width: 1680, height: 1050 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  },

  // ===== MOBILE — iPhone =====
  {
    name: "iPhone 15 Pro Max",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    name: "iPhone 14 Pro",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  {
    name: "iPhone 13",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Denver",
  },
  {
    name: "iPhone 12",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.8 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  },
  {
    name: "iPhone SE",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/New_York",
  },

  // ===== MOBILE — Android / Pixel =====
  {
    name: "Pixel 8 Pro",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
    viewport: { width: 412, height: 892 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    name: "Pixel 7",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  {
    name: "Pixel 6a",
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Mobile Safari/537.36",
    viewport: { width: 412, height: 892 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Denver",
  },

  // ===== MOBILE — Samsung Galaxy =====
  {
    name: "Galaxy S24 Ultra",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
    viewport: { width: 384, height: 854 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    name: "Galaxy S23",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  {
    name: "Galaxy A54",
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Mobile Safari/537.36",
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  },

  // ===== TABLET — iPad =====
  {
    name: "iPad Pro 12.9",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  {
    name: "iPad Air",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  */

  // ===== MOBILE — BlackBerry =====
  {
    name: "BlackBerry KEY2",
    userAgent:
      "Mozilla/5.0 (BB10; Touch) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.10+",
    viewport: { width: 432, height: 768 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/New_York",
  },
  /*
  {
    name: "BlackBerry Passport",
    userAgent:
      "Mozilla/5.0 (BB10; Kbd) AppleWebKit/537.10+ (KHTML, like Gecko) Version/10.3.3.2205 Mobile Safari/537.10+",
    viewport: { width: 453, height: 453 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Chicago",
  },
  {
    name: "BlackBerry PRIV (Android)",
    userAgent:
      "Mozilla/5.0 (Linux; Android 6.0.1; PRIV Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36",
    viewport: { width: 412, height: 732 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    locale: "en-US",
    timezoneId: "America/Denver",
  },
  */
];

// Track spawned Chrome processes for cleanup (legacy approach)
const spawnedChromes: { process: any; port: number; dataDir: string }[] = [];

// Cleanup on exit
export function cleanupChromes() {
  for (const chrome of spawnedChromes) {
    try {
      process.kill(-chrome.process.pid, "SIGTERM");
    } catch {
      // Already dead
    }
  }
  spawnedChromes.length = 0;
}
process.on("exit", cleanupChromes);
process.on("SIGINT", () => {
  cleanupChromes();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanupChromes();
  process.exit(0);
});

function getRandomProfile(): DeviceProfile {
  const profile =
    DEVICE_PROFILES[Math.floor(Math.random() * DEVICE_PROFILES.length)];
  return profile;
}

export async function createBrowser(
  useExistingDebugInstance = true,
  extensionPath?: string,
) {
  const port = 9222;
  const dataDir = path.resolve(process.cwd(), `chrome-profile-${port}`);
  const profile = getRandomProfile();

  console.log(`Launching Playwright persistent context with Chrome...`);
  console.log(`  Device: ${profile.name}`);
  console.log(`  Profile: ${dataDir}`);

  const args = [
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
  ];

  if (extensionPath) {
    const absExtensionPath = path.resolve(process.cwd(), extensionPath);
    args.push(`--disable-extensions-except=${absExtensionPath}`);
    args.push(`--load-extension=${absExtensionPath}`);
    console.log(`  Extension: ${absExtensionPath}`);
  }

  const context = await chromium.launchPersistentContext(dataDir, {
    channel: "chrome",
    headless: false,
    userAgent: profile.userAgent,
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    locale: profile.locale,
    timezoneId: profile.timezoneId,
    args,
    ignoreDefaultArgs: ["--enable-automation"],
  });

  // Attach profile properties to the context so we can use them later if needed
  (context as any)._profile = profile;

  // Wrap context to behave like browser for compatibility
  return {
    isPersistentContext: true,
    contexts: () => [context],
    newContext: async () => context,
    close: async () => {
      console.log("Closing persistent context...");
      await context.close().catch(() => null);
    },
    _profile: profile,
    context,
  };
}

export async function createContext(browser: any) {
  if (browser.isPersistentContext) {
    return browser.context;
  }

  const contexts = browser.contexts();
  let context = contexts.length > 0 ? contexts[0] : await browser.newContext();

  // If we attached a profile during launch, ensure the context uses it for new pages
  const profile = (browser as any)._profile;
  if (profile && contexts.length === 0) {
    console.log(
      `Creating fallback context matching device: ${profile.name}...`,
    );
    context = await browser.newContext({
      userAgent: profile.userAgent,
      viewport: profile.viewport,
      deviceScaleFactor: profile.deviceScaleFactor,
      isMobile: profile.isMobile,
      hasTouch: profile.hasTouch,
      locale: profile.locale,
      timezoneId: profile.timezoneId,
    });
  } else if (contexts.length > 0) {
    console.log("Attached to existing Chrome profile and tabs...");
  }

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

// ===== Human-like Bézier Curve Mouse Movement =====

interface Point {
  x: number;
  y: number;
}

/**
 * Compute a point on a cubic Bézier curve at parameter t (0..1)
 */
function bezierPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const u = 1 - t;
  return {
    x:
      u * u * u * p0.x +
      3 * u * u * t * p1.x +
      3 * u * t * t * p2.x +
      t * t * t * p3.x,
    y:
      u * u * u * p0.y +
      3 * u * u * t * p1.y +
      3 * u * t * t * p2.y +
      t * t * t * p3.y,
  };
}

/**
 * Generate an eased t value — starts slow, speeds up in middle, slows at end
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Move the mouse from current position to target using a Bézier curve with
 * random control points, easing, and micro-jitter — like a real human hand.
 */
export async function humanMouseMove(
  page: any,
  toX: number,
  toY: number,
  options: { steps?: number; jitter?: number } = {},
) {
  const { steps = 30 + Math.floor(Math.random() * 40), jitter = 2 } = options;

  // Get current mouse position (default to random spot if unknown)
  const viewport = page.viewportSize() || { width: 1920, height: 1080 };
  const fromX = Math.random() * viewport.width;
  const fromY = Math.random() * viewport.height;

  const start: Point = { x: fromX, y: fromY };
  const end: Point = { x: toX, y: toY };

  // Random control points — offset from the straight line to create a curve
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  const cp1: Point = {
    x: start.x + dx * 0.25 + (Math.random() - 0.5) * Math.abs(dx) * 0.5,
    y: start.y + dy * 0.25 + (Math.random() - 0.5) * Math.abs(dy) * 0.5,
  };
  const cp2: Point = {
    x: start.x + dx * 0.75 + (Math.random() - 0.5) * Math.abs(dx) * 0.3,
    y: start.y + dy * 0.75 + (Math.random() - 0.5) * Math.abs(dy) * 0.3,
  };

  // Move along the curve
  for (let i = 0; i <= steps; i++) {
    const rawT = i / steps;
    const t = easeInOutCubic(rawT); // ease for natural acceleration/deceleration

    const point = bezierPoint(start, cp1, cp2, end, t);

    // Add micro-jitter to simulate hand tremor
    const jitterX = (Math.random() - 0.5) * jitter;
    const jitterY = (Math.random() - 0.5) * jitter;

    await page.mouse.move(
      Math.max(0, Math.min(viewport.width - 1, point.x + jitterX)),
      Math.max(0, Math.min(viewport.height - 1, point.y + jitterY)),
    );

    // Variable delay between points — slower at start and end, faster in middle
    const speedFactor = 1 - Math.abs(rawT - 0.5) * 0.8; // 0.6 at edges, 1.0 in middle
    const baseDelay = 5 + Math.random() * 10;
    await sleep(baseDelay / speedFactor);
  }
}

/**
 * Perform a natural human-like click at the given coordinates.
 * Moves there via Bézier curve first, pauses, then clicks.
 */
export async function humanClick(page: any, x: number, y: number) {
  await humanMouseMove(page, x, y);
  await sleep(50 + Math.random() * 150); // slight pause before clicking
  await page.mouse.down();
  await sleep(30 + Math.random() * 80); // hold click briefly
  await page.mouse.up();
}

/**
 * Try to solve PerimeterX CAPTCHA by simulating natural mouse behavior.
 * PerimeterX often auto-passes if it detects enough organic mouse movement.
 */
export async function tryAutoSolvePerimeterX(page: any): Promise<boolean> {
  console.log(
    "  [Anti-Bot] Detected PerimeterX CAPTCHA, attempting mouse-based auto-solve...",
  );

  const viewport = page.viewportSize() || { width: 1920, height: 1080 };
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  // Phase 1: Natural mouse movements around the page (builds trust)
  for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
    const targetX = 100 + Math.random() * (viewport.width - 200);
    const targetY = 100 + Math.random() * (viewport.height - 200);
    await humanMouseMove(page, targetX, targetY);
    await sleep(300 + Math.random() * 700);
  }

  // Phase 2: Find and hover over the CAPTCHA element
  const captchaBox = await page.$("#px-captcha").catch(() => null);
  if (captchaBox) {
    const box = await captchaBox.boundingBox().catch(() => null);
    if (box) {
      console.log("  [Anti-Bot] Found CAPTCHA element, moving mouse to it...");

      // Move to the CAPTCHA naturally
      await humanMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
      await sleep(500 + Math.random() * 500);

      // Press and hold on the CAPTCHA (some PerimeterX require hold-to-verify)
      console.log("  [Anti-Bot] Pressing and holding on CAPTCHA...");
      await page.mouse.down();
      await sleep(3000 + Math.random() * 5000); // hold 3-8 seconds
      await page.mouse.up();

      // Wait for potential redirect
      await sleep(3000 + Math.random() * 2000);

      // Check if we passed
      const stillBlocked = await page.$("#px-captcha").catch(() => null);
      if (!stillBlocked) {
        console.log("  [Anti-Bot] ✓ CAPTCHA appears to be solved!");
        return true;
      }

      // Try clicking it normally
      console.log("  [Anti-Bot] Hold didn't work, trying click...");
      await humanClick(page, box.x + box.width / 2, box.y + box.height / 2);
      await sleep(3000 + Math.random() * 2000);

      const solvedAfterClick = !(await page.$("#px-captcha").catch(() => null));
      if (solvedAfterClick) {
        console.log("  [Anti-Bot] ✓ CAPTCHA solved after click!");
        return true;
      }
    }
  }

  // Phase 3: More random movement as a last resort
  for (let i = 0; i < 5; i++) {
    await humanMouseMove(
      page,
      centerX + (Math.random() - 0.5) * 400,
      centerY + (Math.random() - 0.5) * 300,
    );
    await sleep(200 + Math.random() * 500);
  }

  await sleep(2000);
  const finalCheck = !(await page.$("#px-captcha").catch(() => null));
  if (finalCheck) {
    console.log("  [Anti-Bot] ✓ CAPTCHA solved after extended movement!");
    return true;
  }

  console.log("  [Anti-Bot] ✗ Could not auto-solve CAPTCHA");
  return false;
}

export async function simulateHumanBehavior(page: any): Promise<void> {
  await randomDelay(1000, 2500);

  const viewport = page.viewportSize();
  if (viewport) {
    // Natural Bézier mouse movements across the page
    const moves = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < moves; i++) {
      await humanMouseMove(
        page,
        100 + Math.random() * (viewport.width - 200),
        100 + Math.random() * (viewport.height - 200),
      );
      await randomDelay(200, 600);
    }
  }

  // Random scroll
  await page.evaluate(() => {
    window.scrollBy({ top: 200 + Math.random() * 500, behavior: "smooth" });
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
