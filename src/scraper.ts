import * as fs from "fs";
import pLimit from "p-limit";
import {
  createBrowser,
  createContext,
  applyStealthScripts,
  warmUpSession,
  simulateHumanBehavior,
  isBlocked,
  logError,
  logInfo,
  withRetry,
  writeToCSV,
  ProductData,
} from "./utils";

interface SkuInput {
  Type: "Amazon" | "Walmart";
  SKU: string;
}

async function scrapeAmazon(sku: string): Promise<ProductData | null> {
  const browser = await createBrowser();

  try {
    const context = await createContext(browser);
    const page = await context.newPage();

    await applyStealthScripts(page);

    // Warm up with homepage first
    await warmUpSession(page, "Amazon");

    // Navigate to product
    const url = `https://www.amazon.com/dp/${sku}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    await simulateHumanBehavior(page);

    // Check for block
    const { blocked, reason } = await isBlocked(page);
    if (blocked) {
      logError(sku, "Amazon", reason);
      return null;
    }

    // Wait for key element
    await page
      .waitForSelector("#productTitle", { timeout: 10000 })
      .catch(() => null);

    // Extract with fallbacks
    const title = await page
      .$eval("#productTitle", (el: Element) => el.textContent?.trim() || null)
      .catch(() => null);

    const price = await page
      .$eval(
        ".a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice",
        (el: Element) => el.textContent?.trim() || null,
      )
      .catch(() => null);

    const description = await page
      .$eval(
        "#productDescription p, #feature-bullets .a-list-item",
        (el: Element) => el.textContent?.trim() || null,
      )
      .catch(() => null);

    const reviews = await page
      .$eval(
        "#acrCustomerReviewText",
        (el: Element) => el.textContent?.trim() || null,
      )
      .catch(() => null);

    const rating = await page
      .$eval(
        'span[data-hook="rating-out-of-text"], .a-icon-alt',
        (el: Element) => el.textContent?.trim() || null,
      )
      .catch(() => null);

    logInfo(`[Amazon] Scraped complete: ${title || "N/A"}`);

    return {
      sku,
      source: "Amazon",
      title,
      price,
      description,
      reviews,
      rating,
    };
  } finally {
    await browser.close(); // always runs even on error
  }
}

async function scrapeWalmart(sku: string): Promise<ProductData | null> {
  const browser = await createBrowser();

  try {
    const context = await createContext(browser);
    const page = await context.newPage();

    await applyStealthScripts(page);

    // Warm up with homepage first
    await warmUpSession(page, "Walmart");

    // Navigate to product
    const url = `https://www.walmart.com/ip/${sku}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    await simulateHumanBehavior(page);

    // Check for block
    const { blocked, reason } = await isBlocked(page);
    if (blocked) {
      logError(sku, "Walmart", reason);
      return null;
    }

    // Wait for key element
    await page
      .waitForSelector('h1[itemprop="name"]', { timeout: 10000 })
      .catch(() => null);

    // Extract with fallbacks
    const title = await page
      .$eval(
        'h1[itemprop="name"]',
        (el: Element) => el.textContent?.trim() || null,
      )
      .catch(() => null);

    const price = await page
      .$eval(
        '[itemprop="price"]',
        (el: Element) => el.textContent?.trim() || null,
      )
      .catch(() => null);

    const description = await page
      .$eval(".dangerous-html", (el: Element) => el.textContent?.trim() || null)
      .catch(() => null);

    const reviews = await page
      .$eval(
        '[data-testid="item-review-section-link"]',
        (el: Element) => el.textContent?.trim() || null,
      )
      .catch(() => null);

    let rating = await page
      .$eval(
        "span.rating-number",
        (el: Element) => el.textContent?.trim() || null,
      )
      .catch(() => null);

    if (rating) {
      rating = rating.replace(/\(|\)/g, "").trim();
    }

    logInfo(`[Walmart] Scraped complete: ${title || "N/A"}`);

    return {
      sku,
      source: "Walmart",
      title,
      price,
      description,
      reviews,
      rating,
    };
  } finally {
    await browser.close(); // always runs even on error
  }
}

async function main() {
  const rawData = fs.readFileSync("skus.json", "utf-8");
  const skus: { skus: SkuInput[] } = JSON.parse(rawData);

  // Use p-limit to handle maximum concurrency globally
  const limit = pLimit(2); // max 2 concurrent scrapers

  logInfo(`Starting extraction process for ${skus.skus.length} items...`);

  // To combine p-limit concurrency tightly with checkpointing/streaming,
  // we can chunk the array and process chunk by chunk.
  const BATCH_SIZE = 10;
  for (let i = 0; i < skus.skus.length; i += BATCH_SIZE) {
    const chunk = skus.skus.slice(i, i + BATCH_SIZE);

    logInfo(
      `Processing batch: items ${i + 1} to ${Math.min(i + BATCH_SIZE, skus.skus.length)}`,
    );

    const results = await Promise.all(
      chunk.map(({ SKU, Type }) =>
        limit(() =>
          withRetry(
            () => (Type === "Amazon" ? scrapeAmazon(SKU) : scrapeWalmart(SKU)),
            { retries: 3, baseDelay: 3000, sku: SKU, source: Type },
          ),
        ),
      ),
    );

    const validResults = results.filter((r): r is ProductData => r !== null);
    if (validResults.length > 0) {
      await writeToCSV(validResults);
    }

    logInfo(
      `Finished batch. Triggering random cool-down to evade bot detection...`,
    );
    await new Promise((resolve) =>
      setTimeout(resolve, 5000 + Math.random() * 5000),
    );
  }
}

main().catch(console.error);
