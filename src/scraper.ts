import {
  createBrowser,
  createContext,
  applyStealthScripts,
  sleep,
  simulateHumanBehavior,
} from "./utils";

async function main() {
  console.log("Starting step-by-step scraper...");
  const browser = await createBrowser();

  try {
    const context = await createContext(browser);
    const pageAmazon = await context.newPage();

    console.log("Navigating to https://www.amazon.com/ in a new tab...");
    await pageAmazon.goto("https://www.amazon.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000 + Math.random() * 2000);

    const pageWalmart = await context.newPage();

    console.log("Navigating to https://www.walmart.com/ in a new tab...");
    await pageWalmart.goto("https://www.walmart.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000 + Math.random() * 2000);

    // Create a third tab for Google
    const page = await context.newPage();

    // Step 3a: Build Google cookie history with a generic, benign search first.
    console.log(
      "Navigating to https://www.google.com/ to establish cookies...",
    );
    await page.goto("https://www.google.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(1000 + Math.random() * 1000);

    // Accept cookies if the popup appears (especially common in EU/first-load)
    console.log("Checking for 'Accept All' cookie dialog...");
    const acceptCookiesButton = await page
      .$('button:has-text("Accept all"), button:has-text("I agree")')
      .catch(() => null);
    if (acceptCookiesButton) {
      console.log("Clicking Accept Cookies...");
      await acceptCookiesButton.click();
      await sleep(1500 + Math.random() * 1000);
    }

    console.log(
      "Building Google history with a benign search (e.g. 'what is the weather')...",
    );
    const benignSearchInput = 'textarea[name="q"], input[name="q"]';
    await page.waitForSelector(benignSearchInput, {
      state: "visible",
      timeout: 10000,
    });
    await page.type(benignSearchInput, "what is the weather", {
      delay: 100 + Math.random() * 50,
    });
    await Promise.all([
      page
        .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 })
        .catch(() => null),
      page.keyboard.press("Enter"),
    ]);

    console.log(
      "Benign search results loaded. Waiting to establish session trust...",
    );
    await sleep(3000 + Math.random() * 3000);

    // Clean up the URL and navigate back to the Google homepage for the REAL search
    console.log("Navigating back to Google homepage for the real search...");
    await page.goto("https://www.google.com/webhp", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.evaluate(() =>
      window.history.replaceState({}, document.title, "/"),
    );
    // Add random number of screen scrolls (e.g. 5 to 10)
    const scrollCount = Math.floor(Math.random() * 6) + 5;
    console.log(`Performing ${scrollCount} random screen scrolls...`);

    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => {
        // Random amount to scroll up or down
        const isUp = Math.random() > 0.8;
        const scrollAmount = (200 + Math.random() * 400) * (isUp ? -1 : 1);
        window.scrollBy({ top: scrollAmount, behavior: "smooth" });
      });
      console.log(`Scroll ${i + 1}/${scrollCount} complete. Waiting...`);
      await sleep(1000 + Math.random() * 2000);
    }

    console.log("Finished random scrolling.");

    console.log(
      "Simulating realistic human behavior (mouse movements, minor scrolls)...",
    );
    await simulateHumanBehavior(page);

    // Next step: Type amazon sku [sku] with randomized keystroke delays
    const testSku = "B01LR5S6HK"; // Test SKU requested by user
    const searchQuery = `amazon sku ${testSku}`;

    console.log(`Searching for: "${searchQuery}" with random delays...`);
    const searchInputSelector = 'textarea[name="q"], input[name="q"]';

    await page.waitForSelector(searchInputSelector, {
      state: "visible",
      timeout: 10000,
    });

    // Move mouse naturally to the search box before clicking
    const inputElement = await page.$(searchInputSelector);
    if (inputElement) {
      const box = await inputElement.boundingBox();
      if (box) {
        // Move to somewhere inside the input box smoothly
        const targetX = box.x + box.width * (0.2 + Math.random() * 0.6);
        const targetY = box.y + box.height * (0.2 + Math.random() * 0.6);
        await page.mouse.move(targetX, targetY, {
          steps: 15 + Math.floor(Math.random() * 10),
        });
        await sleep(300 + Math.random() * 500);
      }
    }

    await page.click(searchInputSelector);

    for (const char of searchQuery) {
      await page.keyboard.type(char);
      // Wait for a random amount of time between 100ms and 1500ms (0.1s to 1.5s)
      const randomDelay = Math.floor(100 + Math.random() * 1400);
      console.log(`Typed '${char}', waiting ${randomDelay}ms`);
      await sleep(randomDelay);
    }

    console.log(
      "Finished typing query. Waiting 5 seconds before pressing Enter...",
    );
    await sleep(5000);

    console.log("Pressing Enter and waiting for search results...");
    await Promise.all([
      page
        .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 })
        .catch(() => null),
      page.keyboard.press("Enter"),
    ]);

    console.log("Search results loaded. Waiting 5 seconds as requested...");
    await sleep(5000);

    // Check if we hit the Google CAPTCHA/Block page
    const pageText = await page.evaluate(() =>
      document.body.innerText.toLowerCase(),
    );
    if (
      pageText.includes("unusual traffic from your computer network") ||
      pageText.includes("our systems have detected unusual traffic")
    ) {
      console.log("🚨 GOOGLE IP BLOCK DETECTED 🚨");
      console.log(
        "Google is blocking this IP. Falling back to direct Amazon navigation...",
      );
      await page.goto(`https://www.amazon.com/dp/${testSku}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      console.log("Navigated directly to Amazon Product page successfully.");
      await sleep(3000);
      return;
    }

    console.log("Scanning search results for the Amazon link...");
    const resultLinks = await page.$$("div#search a");
    let clicked = false;
    const expectedDomain = "amazon.com";

    for (const link of resultLinks) {
      const href = await link.getAttribute("href").catch(() => "");
      // We check that it's an amazon link targeting a product (/dp/ or the sku), avoiding blogs
      if (
        href &&
        href.includes("amazon.com") &&
        (href.includes("/dp/") || href.includes(testSku)) &&
        !href.includes("google.com")
      ) {
        console.log(`Found relevant product link: ${href}`);
        await link.scrollIntoViewIfNeeded().catch(() => null);
        console.log("Simulating click on the link...");

        // Move the mouse to the link before clicking
        const box = await link.boundingBox();
        if (box) {
          const targetX = box.x + box.width / 2;
          const targetY = box.y + box.height / 2;
          await page.mouse.move(targetX, targetY, {
            steps: 10 + Math.floor(Math.random() * 10),
          });
          await sleep(200 + Math.random() * 300);
        }

        await Promise.all([
          page
            .waitForNavigation({
              waitUntil: "domcontentloaded",
              timeout: 30000,
            })
            .catch(() => null),
          link.click(),
        ]);
        clicked = true;
        console.log("Successfully clicked the link and navigated.");
        break;
      }
    }

    if (!clicked) {
      console.log(
        "Could not find a relevant Amazon link in the search results.",
      );
    }

    // Additional wait to observe the final page loaded
    await sleep(3000);

    console.log("Finished search and click step.");
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

main().catch(console.error);

/* 
// --- PREVIOUS CODE ---
import * as fs from "fs";
import pLimit from "p-limit";
import {
  createBrowser,
  createContext,
  applyStealthScripts,
  simulateHumanBehavior,
  isBlocked,
  logError,
  logInfo,
  withRetry,
  writeToCSV,
  ProductData,
  sleep,
} from "./utils";

interface SkuInput {
  Type: "Amazon" | "Walmart";
  SKU: string;
}

async function navigateViaGoogleSearch(
  page: any,
  query: string,
  expectedDomain: string,
): Promise<boolean> {
  logInfo(`Navigating via Google Search for: ${query}`);
  try {
    await page.goto("https://www.google.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await simulateHumanBehavior(page);

    const searchInput = 'textarea[name="q"], input[name="q"]';
    await page.waitForSelector(searchInput, {
      state: "visible",
      timeout: 10000,
    });
    await page.type(searchInput, query, { delay: 100 + Math.random() * 100 });
    await sleep(500);

    await Promise.all([
      page
        .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 })
        .catch(() => null),
      page.keyboard.press("Enter"),
    ]);

    await simulateHumanBehavior(page);

    // Find search results
    const resultLinks = await page.$$("div#search a");
    let clicked = false;
    for (const link of resultLinks) {
      const href = await link.getAttribute("href").catch(() => "");
      if (href && href.includes(expectedDomain)) {
        logInfo(`Found organic link: ${href}. Clicking...`);
        await Promise.all([
          page
            .waitForNavigation({
              waitUntil: "domcontentloaded",
              timeout: 30000,
            })
            .catch(() => null),
          link.click(),
        ]);
        clicked = true;
        break;
      }
    }

    return clicked;
  } catch (e) {
    logInfo(`Google Search navigation failed: ${String(e)}`);
    return false;
  }
}

async function scrapeAmazon(sku: string): Promise<ProductData | null> {
  const browser = await createBrowser();

  try {
    const context = await createContext(browser);
    const page = await context.newPage();

    await applyStealthScripts(page);

    // Navigate via Google Search
    const success = await navigateViaGoogleSearch(
      page,
      `amazon ${sku}`,
      "amazon.com",
    );
    if (!success) {
      logInfo(
        `[Amazon] Could not find Amazon link in Google results for SKU ${sku}, falling back to direct navigation...`,
      );
      const url = `https://www.amazon.com/dp/${sku}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    }

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

    // Navigate via Google Search
    const success = await navigateViaGoogleSearch(
      page,
      `walmart ${sku}`,
      "walmart.com/ip",
    );
    if (!success) {
      logInfo(
        `[Walmart] Could not find Walmart link in Google results for SKU ${sku}, falling back to direct navigation...`,
      );
      const url = `https://www.walmart.com/ip/${sku}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    }

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
      rating = rating.replace(/\\(|\\)/g, "").trim();
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
*/
