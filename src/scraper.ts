import * as fs from "fs";
import {
  createBrowser,
  createContext,
  applyStealthScripts,
  sleep,
  simulateHumanBehavior,
  writeToCSV,
  simulateTypingUrl,
} from "./utils";
import pLimit from "p-limit";

export interface SkuInput {
  Type: "Amazon" | "Walmart";
  SKU: string;
}

export async function runSingleAmazonExtraction(browser: any, testSku: string) {
  console.log(`Starting Amazon extraction for SKU: ${testSku}...`);
  let context: any;
  let page: any;

  try {
    context = await createContext(browser);
    page = await context.newPage();

    console.log(`Navigating to https://www.amazon.com/dp/${testSku}...`);
    await page.goto(`https://www.amazon.com/dp/${testSku}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Check for a CAPTCHA "Continue" button as requested by user
    const continueButton = await page.$(
      'button:has-text("Continue"), a:has-text("Continue"), input[type="submit"][value="Continue"]',
    );
    if (continueButton) {
      console.log("Found a CAPTCHA 'Continue' button. Clicking to bypass...");
      await continueButton.click();
      await sleep(2000); // Give it a moment to load the real page
    }

    await sleep(1500 + Math.random() * 2000);
    console.log("Simulating human behavior...");
    await simulateHumanBehavior(page);

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

    console.log(`\n[Amazon] Scraped complete for SKU ${testSku}`);
    const productData = {
      sku: testSku,
      source: "Amazon",
      title,
      price,
      description,
      reviews,
      rating,
    };

    console.log(JSON.stringify(productData, null, 2));
    return productData;
  } catch (error) {
    console.error(`Error scraping Amazon SKU ${testSku}:`, error);
    return null;
  } finally {
    console.log("Closing Amazon context to ensure isolation...");
    if (context) {
      await context.close().catch(() => null);
    }
  }
}

export async function runSingleWalmartExtraction(
  browser: any,
  testSku: string,
) {
  console.log(`Starting manual test for SKU: ${testSku}...`);
  let context: any;

  try {
    context = await createContext(browser);
    const page = await context.newPage();
    await applyStealthScripts(page);

    console.log(
      "Browser opened for manual testing. Leaving context open. Press Ctrl+C to exit.",
    );

    // We can just sleep for a long time here, or just return since the runner's
    // finally block might not close if we commented it out.
    // Given we process sequentially, wait here so the user can test the first one.
    await sleep(9999999);

    return null;
  } catch (error) {
    console.error("Error during execution:", error);
    return null;
  } finally {
    // Intentionally left open
  }
}

export async function processAmazonConcurrent(
  amazonSkus: SkuInput[],
  concurrencyLimit = 3,
) {
  if (amazonSkus.length === 0) return;
  console.log(`Processing ${amazonSkus.length} Amazon SKUs concurrently...`);
  const limit = pLimit(concurrencyLimit);

  const amazonTasks = amazonSkus.map((skuObj) => {
    return limit(async () => {
      let browser = null;
      try {
        browser = await createBrowser(false); // Launches fresh headless browser
        const productData = await runSingleAmazonExtraction(
          browser,
          skuObj.SKU,
        );
        if (productData) {
          await writeToCSV([productData]);
        }
      } finally {
        if (browser) {
          await browser.close().catch(() => null);
        }
      }
    });
  });

  await Promise.all(amazonTasks);
  console.log(`Finished processing all Amazon SKUs.`);
}

async function main() {
  const rawData = fs.readFileSync("skus.json", "utf-8");
  const skus: { skus: SkuInput[] } = JSON.parse(rawData);

  console.log(`Starting extraction process for ${skus.skus.length} items...`);

  const amazonSkus = skus.skus.filter((s) => s.Type === "Amazon");
  const walmartSkus = skus.skus.filter((s) => s.Type === "Walmart");

  // Run a single combined extraction process (not a stress test) to fulfill requirements
  console.log(`\n\n=== STARTING EXTRACTION RUN ===\n\n`);

  // 1. Process Amazon SKUs concurrently
  await processAmazonConcurrent(amazonSkus, 3);

  // 2. Process Walmart SKUs sequentially
  if (walmartSkus.length > 0) {
    console.log(
      `\nProcessing ${walmartSkus.length} Walmart SKUs sequentially in fresh visible browser...`,
    );

    for (let i = 0; i < walmartSkus.length; i++) {
      const skuObj = walmartSkus[i];
      let browser = null;
      try {
        browser = await createBrowser(false); // Launches persistent Chrome profile
        const productData = await runSingleWalmartExtraction(
          browser,
          skuObj.SKU,
        );
        if (productData) {
          await writeToCSV([productData]);
        }
      } finally {
        if (browser) {
          await browser.close().catch(() => null);
        }
      }

      if (i < walmartSkus.length - 1) {
        const delay = 5000 + Math.random() * 5000;
        console.log(
          `Waiting ${Math.round(delay / 1000)}s before next Walmart extraction...`,
        );
        await sleep(delay);
      }
    }
  }

  console.log("\nScraping completed.");
}

main().catch(console.error);
