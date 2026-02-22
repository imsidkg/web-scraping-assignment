import * as fs from "fs";
import {
  createBrowser,
  createContext,
  applyStealthScripts,
  sleep,
  simulateHumanBehavior,
  writeToCSV,
} from "./utils";

interface SkuInput {
  Type: "Amazon" | "Walmart";
  SKU: string;
}

async function runSingleWalmartExtraction(browser: any, testSku: string) {
  console.log(`Starting extraction for SKU: ${testSku}...`);
  let pageAmazon: any;
  let pageWalmart: any;
  let page: any;

  try {
    const context = await createContext(browser);
    pageAmazon = await context.newPage();

    console.log("Navigating to https://www.amazon.com/ in a new tab...");
    await pageAmazon.goto("https://www.amazon.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000 + Math.random() * 2000);

    pageWalmart = await context.newPage();

    console.log("Navigating to https://www.walmart.com/ in a new tab...");
    await pageWalmart.goto("https://www.walmart.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000 + Math.random() * 2000);

    // Create a third tab for Google
    page = await context.newPage();
    // ... (The rest is identical, we just swap `runSingleWalmartExtraction(testSku)` signature down below) ...
    // To be safe, let's keep the rest of the file intact by only replacing the signature here, and we'll fix the invocation below in a split.

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

    // Next step: Type sku [sku] with randomized keystroke delays
    const targetSource: string = "walmart"; // Or "amazon"
    const searchQuery = `${targetSource} sku ${testSku}`;

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
        `Google is blocking this IP. Falling back to direct ${targetSource} navigation...`,
      );
      let fallbackUrl = "";
      if (targetSource === "amazon")
        fallbackUrl = `https://www.amazon.com/dp/${testSku}`;
      else if (targetSource === "walmart")
        fallbackUrl = `https://www.walmart.com/ip/${testSku}`;

      await page.goto(fallbackUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      console.log(
        `Navigated directly to ${targetSource} Product page successfully.`,
      );
      await sleep(3000);
      return null;
    }

    console.log("Scanning search results for the Amazon link...");
    const resultLinks = await page.$$("div#search a");
    let clicked = false;
    const expectedDomain = "amazon.com";

    for (const link of resultLinks) {
      const href = await link.getAttribute("href").catch(() => "");
      // We check that it's a link targeting the correct product domain, avoiding blogs/Google cache
      const isTargetDomain = href.includes(targetSource);

      let isProductLink = false;
      if (targetSource === "amazon") {
        isProductLink = href.includes("/dp/") || href.includes(testSku);
      } else if (targetSource === "walmart") {
        isProductLink = href.includes("/ip/") || href.includes(testSku);
      }

      if (
        href &&
        isTargetDomain &&
        isProductLink &&
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

    console.log("Extracting product data...");

    if (targetSource === "walmart") {
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
        .$eval(
          ".dangerous-html",
          (el: Element) => el.textContent?.trim() || null,
        )
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

      console.log(`\n[Walmart] Scraped complete for SKU ${testSku}`);
      const productData = {
        sku: testSku,
        source: "Walmart",
        title,
        price,
        description,
        reviews,
        rating,
      };

      console.log(JSON.stringify(productData, null, 2));

      console.log("Finished search and click step.");
      return productData;
    }

    console.log("Finished search and click step.");
    return null;
  } catch (error) {
    console.error("Error during execution:", error);
    return null;
  } finally {
    console.log("Closing the 3 created tabs to keep things clean...");
    try {
      if (page) await page.close().catch(() => null);
      if (pageAmazon) await pageAmazon.close().catch(() => null);
      if (pageWalmart) await pageWalmart.close().catch(() => null);
    } catch (e) {}
  }
}

async function main() {
  const rawData = fs.readFileSync("skus.json", "utf-8");
  const skus: { skus: SkuInput[] } = JSON.parse(rawData);

  console.log(`Starting extraction process for ${skus.skus.length} items...`);

  const browser = await createBrowser();

  // We only added Walmart SKUs recently so let's filter just them
  const walmartSkus = skus.skus.filter((s) => s.Type === "Walmart");

  for (let iteration = 0; iteration < 100; iteration++) {
    console.log(`\n\n=== STRESS TEST ITERATION ${iteration + 1} / 100 ===\n\n`);

    for (let i = 0; i < walmartSkus.length; i++) {
      const skuObj = walmartSkus[i];
      console.log(
        `Processing item ${i + 1}/${walmartSkus.length}: ${skuObj.SKU}`,
      );

      // Call the single-run scraper logic over and over
      const productData = await runSingleWalmartExtraction(browser, skuObj.SKU);

      if (productData) {
        await writeToCSV([productData]);
      }

      if (i < walmartSkus.length - 1) {
        const delay = 5000 + Math.random() * 5000;
        console.log(
          `Waiting ${Math.round(delay / 1000)}s before next extraction...`,
        );
        await sleep(delay);
      }
    }

    console.log(`Finished iteration ${iteration + 1}. Taking a short break...`);
    await sleep(5000 + Math.random() * 5000);
  }

  console.log("Scraping completed.");

  await browser.close().catch(() => null);
}

main().catch(console.error);
