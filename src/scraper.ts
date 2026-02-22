import * as fs from "fs";
import {
  createBrowser,
  createContext,
  applyStealthScripts,
  sleep,
  simulateHumanBehavior,
  writeToCSV,
  simulateTypingUrl,
  isBlocked,
  tryAutoSolvePerimeterX,
  humanMouseMove,
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
  needsWarmup: boolean = false,
) {
  console.log(`\n--- Starting Walmart extraction for SKU: ${testSku} ---`);
  let context: any;

  try {
    context = await createContext(browser);

    // ===== PHASE 1: Warm-up browsing with natural mouse movement =====
    if (needsWarmup) {
      const warmupSites = [
        { url: "https://youtube.com", name: "YouTube" },
        { url: "https://wikipedia.org", name: "Wikipedia" },
        { url: "https://amazon.com", name: "Amazon" },
      ];

      for (const site of warmupSites) {
        console.log(`  [Warm-up] Opening new tab for ${site.name}...`);
        const tab = await context.newPage();

        await tab
          .goto(site.url, { waitUntil: "domcontentloaded", timeout: 20000 })
          .catch(() => null);
        await sleep(1000 + Math.random() * 2000);

        const vp = tab.viewportSize() || { width: 1920, height: 1080 };

        // Random Bézier mouse movements + scrolls
        const rounds = 1 + Math.floor(Math.random() * 5);
        for (let s = 0; s < rounds; s++) {
          await humanMouseMove(
            tab,
            100 + Math.random() * (vp.width - 200),
            100 + Math.random() * (vp.height - 200),
          );
          await sleep(300 + Math.random() * 700);

          await tab.evaluate(() => {
            window.scrollBy({
              top: 200 + Math.random() * 400,
              behavior: "smooth",
            });
          });
          await sleep(1000 + Math.random() * 4000);

          await humanMouseMove(
            tab,
            100 + Math.random() * (vp.width - 200),
            50 + Math.random() * (vp.height - 100),
          );
          await sleep(200 + Math.random() * 500);
        }
        console.log(`  [Warm-up] Done with ${site.name} (${rounds} rounds)`);
      }
    }

    // ===== PHASE 2: Navigate to Walmart in a new tab =====
    console.log(`  [Walmart] Opening new tab for walmart.com...`);
    const page = await context.newPage();
    await page.goto("https://walmart.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000 + Math.random() * 3000);

    // Check if blocked — try to auto-solve if PerimeterX CAPTCHA
    const blockCheck = await isBlocked(page);
    if (blockCheck.blocked) {
      console.warn(`  [Walmart] BLOCKED: ${blockCheck.reason}`);
      const solved = await tryAutoSolvePerimeterX(page);
      if (!solved) {
        console.error(`  [Walmart] Could not bypass CAPTCHA`);
        return null;
      }
      await sleep(1000);
    }

    // Scrolls on Walmart homepage
    await simulateHumanBehavior(page);

    // ===== PHASE 3: Search for SKU =====
    console.log(`  [Walmart] Searching for SKU: ${testSku}...`);

    const searchSelectors = [
      'input[type="search"]',
      'input[name="q"]',
      'input[aria-label="Search"]',
      "#headerSearchInput",
      '[data-testid="headerSearchInput"]',
    ];

    let searchBox = null;
    for (const sel of searchSelectors) {
      searchBox = await page.$(sel);
      if (searchBox) break;
    }

    if (!searchBox) {
      console.error(
        "  [Walmart] Could not find search box, trying direct URL...",
      );
      return await extractFromDirectUrl(page, testSku);
    }

    await searchBox.click();
    await sleep(500 + Math.random() * 500);

    // Jittery typing
    for (const char of testSku) {
      await searchBox.type(char, { delay: 0 });
      const isHesitation = Math.random() > 0.8;
      await sleep(
        isHesitation ? 300 + Math.random() * 500 : 30 + Math.random() * 150,
      );
    }

    await sleep(500 + Math.random() * 1000);
    await page.keyboard.press("Enter");
    console.log(`  [Walmart] Submitted search, waiting for results...`);

    await page.waitForLoadState("domcontentloaded");
    await sleep(2000 + Math.random() * 3000);

    // ===== PHASE 4: Click first result =====
    console.log(`  [Walmart] Looking for first product result...`);

    const resultSelectors = [
      'a[href*="/ip/"]',
      '[data-testid="list-view"] a[link-identifier]',
      "[data-item-id] a",
      '[data-testid="product-tile"] a',
    ];

    let firstResult = null;
    for (const sel of resultSelectors) {
      firstResult = await page.$(sel);
      if (firstResult) break;
    }

    if (!firstResult) {
      console.warn("  [Walmart] No results found, trying direct URL...");
      return await extractFromDirectUrl(page, testSku);
    }

    await firstResult.scrollIntoViewIfNeeded().catch(() => null);
    await sleep(500 + Math.random() * 1000);
    await firstResult.click();
    console.log(`  [Walmart] Clicked first result, loading product page...`);

    await page.waitForLoadState("domcontentloaded");
    await sleep(2000 + Math.random() * 3000);

    // ===== PHASE 5: Extract product data =====
    return await extractWalmartProductData(page, testSku);
  } catch (error) {
    console.error(`  [Walmart] Error for SKU ${testSku}:`, error);
    return null;
  }
}

async function extractFromDirectUrl(page: any, sku: string) {
  console.log(
    `  [Walmart] Fallback: navigating directly to walmart.com/ip/${sku}...`,
  );
  await page
    .goto(`https://www.walmart.com/ip/${sku}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    })
    .catch(() => null);

  await sleep(2000 + Math.random() * 3000);

  const blockCheck = await isBlocked(page);
  if (blockCheck.blocked) {
    console.error(`  [Walmart] BLOCKED on direct URL: ${blockCheck.reason}`);
    return null;
  }

  return await extractWalmartProductData(page, sku);
}

async function extractWalmartProductData(page: any, sku: string) {
  console.log(`  [Walmart] Extracting product data...`);

  // Simulate some human behavior on the product page
  await simulateHumanBehavior(page);

  const title = await page
    .$eval(
      'h1[itemprop="name"], h1.prod-ProductTitle, [data-testid="product-title"], h1',
      (el: Element) => el.textContent?.trim() || null,
    )
    .catch(() => null);

  const price = await page
    .$eval(
      '[itemprop="price"], [data-testid="price-wrap"] span, .price-characteristic, span.inline-flex [aria-hidden="true"]',
      (el: Element) => el.textContent?.trim() || null,
    )
    .catch(() => null);

  const description = await page
    .$eval(
      '[data-testid="product-description"] p, .about-desc .about-product-description, .dangerous-html',
      (el: Element) => el.textContent?.trim()?.substring(0, 500) || null,
    )
    .catch(() => null);

  const reviews = await page
    .$eval(
      '[itemprop="reviewCount"], [data-testid="reviews-count"], .stars-reviews-count-node',
      (el: Element) => el.textContent?.trim() || null,
    )
    .catch(() => null);

  const rating = await page
    .$eval(
      '[itemprop="ratingValue"], [data-testid="product-ratings"] span, .stars-container',
      (el: Element) => el.textContent?.trim() || null,
    )
    .catch(() => null);

  const productData = {
    sku,
    source: "Walmart",
    title,
    price,
    description,
    reviews,
    rating,
  };

  if (!title && !price) {
    console.warn(
      `  [Walmart] Could not extract title or price for SKU ${sku}. Page URL: ${page.url()}`,
    );
  } else {
    console.log(`  [Walmart] ✓ Extracted data for SKU ${sku}:`);
    console.log(JSON.stringify(productData, null, 2));
  }

  return productData;
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
        browser = await createBrowser(false);
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

// ===== HTTP-Based Walmart Extraction =====

function getRandomDesktopUA(): string {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

export async function runWalmartHttpExtraction(sku: string) {
  console.log(`\n--- [HTTP] Walmart extraction for SKU: ${sku} ---`);

  const ua = getRandomDesktopUA();
  const url = `https://www.walmart.com/ip/${sku}`;

  console.log(`  [HTTP] Fetching ${url}`);
  console.log(`  [HTTP] User-Agent: ${ua.substring(0, 50)}...`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": ua,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://www.google.com/",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
      redirect: "follow",
    });

    console.log(`  [HTTP] Response status: ${response.status}`);

    if (response.status !== 200) {
      console.error(
        `  [HTTP] Non-200 status: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const html = await response.text();

    // Check if blocked
    if (html.includes("px-captcha") || html.includes("blocked")) {
      console.error(`  [HTTP] BLOCKED by PerimeterX even via HTTP`);
      return null;
    }

    // Try to extract from __NEXT_DATA__ (Walmart uses Next.js)
    const nextDataMatch = html.match(
      /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/,
    );
    if (nextDataMatch) {
      console.log(`  [HTTP] Found __NEXT_DATA__, parsing...`);
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const initialData = nextData?.props?.pageProps?.initialData?.data;
        const product =
          initialData?.product ||
          initialData?.contentLayout?.modules?.[0]?.product;

        if (product) {
          const productData = {
            sku,
            source: "Walmart",
            title: product.name || product.title || null,
            price:
              product.priceInfo?.currentPrice?.price?.toString() ||
              product.price?.toString() ||
              null,
            description:
              (product.shortDescription || product.description || "")
                .replace(/<[^>]*>/g, "")
                .substring(0, 500) || null,
            reviews:
              product.numberOfReviews?.toString() ||
              product.reviewCount?.toString() ||
              null,
            rating:
              product.averageRating?.toString() ||
              product.rating?.toString() ||
              null,
          };

          console.log(`  [HTTP] ✓ Extracted from __NEXT_DATA__:`);
          console.log(JSON.stringify(productData, null, 2));
          return productData;
        }
      } catch (parseErr) {
        console.warn(`  [HTTP] Failed to parse __NEXT_DATA__:`, parseErr);
      }
    }

    // Fallback: Try JSON-LD
    const jsonLdMatch = html.match(
      /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    if (jsonLdMatch) {
      console.log(`  [HTTP] Trying JSON-LD fallback...`);
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        const item = Array.isArray(jsonLd)
          ? jsonLd.find((j: any) => j["@type"] === "Product")
          : jsonLd;

        if (item && item["@type"] === "Product") {
          const productData = {
            sku,
            source: "Walmart",
            title: item.name || null,
            price:
              item.offers?.price?.toString() ||
              item.offers?.lowPrice?.toString() ||
              null,
            description: (item.description || "").substring(0, 500) || null,
            reviews: item.aggregateRating?.reviewCount?.toString() || null,
            rating: item.aggregateRating?.ratingValue?.toString() || null,
          };

          console.log(`  [HTTP] ✓ Extracted from JSON-LD:`);
          console.log(JSON.stringify(productData, null, 2));
          return productData;
        }
      } catch (parseErr) {
        console.warn(`  [HTTP] Failed to parse JSON-LD:`, parseErr);
      }
    }

    // Fallback: Try regex extraction from raw HTML
    console.log(`  [HTTP] Trying raw HTML regex fallback...`);
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const priceMatch = html.match(/\"price\":(\d+\.?\d*)/);

    const productData = {
      sku,
      source: "Walmart",
      title: titleMatch ? titleMatch[1].trim() : null,
      price: priceMatch ? priceMatch[1] : null,
      description: null,
      reviews: null,
      rating: null,
    };

    if (productData.title || productData.price) {
      console.log(`  [HTTP] ✓ Extracted from raw HTML:`);
      console.log(JSON.stringify(productData, null, 2));
    } else {
      console.warn(`  [HTTP] Could not extract any data for SKU ${sku}`);
    }

    return productData;
  } catch (error) {
    console.error(`  [HTTP] Error fetching SKU ${sku}:`, error);
    return null;
  }
}

async function main() {
  const rawData = fs.readFileSync("skus.json", "utf-8");
  const skus: { skus: SkuInput[] } = JSON.parse(rawData);

  console.log(`Starting extraction process for ${skus.skus.length} items...`);

  const amazonSkus = skus.skus.filter((s) => s.Type === "Amazon");
  const walmartSkus = skus.skus.filter((s) => s.Type === "Walmart");

  console.log(`\n\n=== STARTING EXTRACTION RUN ===\n\n`);

  // 1. Process Amazon SKUs concurrently
  await processAmazonConcurrent(amazonSkus, 3);

  // 2. Process Walmart SKUs via browser with CAPTCHA auto-solve
  if (walmartSkus.length > 0) {
    console.log(
      `\nProcessing ${walmartSkus.length} Walmart SKUs with CAPTCHA auto-solve...`,
    );

    for (let i = 0; i < walmartSkus.length; i++) {
      const skuObj = walmartSkus[i];
      let browser = null;
      try {
        browser = await createBrowser(true); // Connects to existing debug port 9222
        const productData = await runSingleWalmartExtraction(
          browser,
          skuObj.SKU,
          i === 0,
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
