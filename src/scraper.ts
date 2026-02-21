import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import {
  logError,
  saveToCsv,
  retryWithBackoff,
  sleep,
  ProductData,
} from "./utils";
import * as fs from "fs";

chromium.use(stealthPlugin());

interface SkuInput {
  Type: "Amazon" | "Walmart";
  SKU: string;
}

async function scrapeAmazon(page: any, sku: string): Promise<ProductData> {
  const url = `https://www.amazon.com/dp/${sku}`;

  await retryWithBackoff(async () => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Check for captcha
    const captchaSelector = 'form[action="/errors/validateCaptcha"]';
    if (await page.$(captchaSelector)) {
      throw new Error("Amazon Captcha encountered");
    }

    // Check if product exists (simple check for 404 text)
    if (page.url().includes("404")) {
      throw new Error("Product not found on Amazon");
    }
  });

  const title = (
    await page
      .$eval("#productTitle", (el: any) => el.innerText)
      .catch(() => "N/A")
  ).trim();

  const priceSelectors = [
    ".a-price .a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-color-price",
  ];

  let price = "N/A";
  for (const selector of priceSelectors) {
    try {
      price = (await page.$eval(selector, (el: any) => el.innerText)).trim();
      if (price) break;
    } catch (e) {
      // Ignored
    }
  }

  const reviews = (
    await page
      .$eval("#acrCustomerReviewText", (el: any) => el.innerText)
      .catch(() => "N/A")
  ).trim();

  // Description is tricky on Amazon, try extracting feature bullets
  const description =
    (
      await page
        .$$eval("#feature-bullets li span.a-list-item", (els: any[]) =>
          els.map((el) => el.innerText).join(" | "),
        )
        .catch(() => "N/A")
    ).trim() || "N/A";

  return {
    SKU: sku,
    Source: "Amazon",
    Title: title,
    Description: description,
    Price: price,
    Reviews: reviews,
  };
}

async function scrapeWalmart(page: any, sku: string): Promise<ProductData> {
  const url = `https://www.walmart.com/ip/${sku}`;

  await retryWithBackoff(async () => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Blocked pages or 404s
    const titleText = await page.title();
    if (titleText.includes("Robot or human") || (await page.$("#px-captcha"))) {
      throw new Error("Walmart Captcha encountered");
    }
    if (titleText.includes("404")) {
      throw new Error("Product not found on Walmart");
    }
  });

  const title = (
    await page
      .$eval('h1[itemprop="name"]', (el: any) => el.innerText)
      .catch(() => "N/A")
  ).trim();

  const price = (
    await page
      .$eval('[itemprop="price"]', (el: any) => el.innerText)
      .catch(() => "N/A")
  ).trim();

  const reviews = (
    await page
      .$eval(
        '[data-testid="item-review-section-link"]',
        (el: any) => el.innerText,
      )
      .catch(() => "N/A")
  ).trim();

  const description = (
    await page
      .$eval(".dangerous-html", (el: any) => el.innerText)
      .catch(() => "N/A")
  ).trim();

  return {
    SKU: sku,
    Source: "Walmart",
    Title: title,
    Description: description,
    Price: price,
    Reviews: reviews,
  };
}

async function main() {
  const rawData = fs.readFileSync("skus.json", "utf-8");
  const skus: { skus: SkuInput[] } = JSON.parse(rawData);

  const productData: ProductData[] = [];

  const browser = await chromium.launch({ headless: true });

  for (const item of skus.skus) {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    console.log(`Processing ${item.Type} SKU: ${item.SKU}`);

    try {
      let data: ProductData;
      if (item.Type === "Amazon") {
        data = await scrapeAmazon(page, item.SKU);
      } else if (item.Type === "Walmart") {
        data = await scrapeWalmart(page, item.SKU);
      } else {
        throw new Error(`Unknown source type: ${item.Type}`);
      }

      productData.push(data);
      console.log(`Successfully scraped: ${data.Title}`);
    } catch (error) {
      logError(item.SKU, item.Type, error);
    } finally {
      await context.close();
      await sleep(1000); // Respectful delay between requests
    }
  }

  await browser.close();

  if (productData.length > 0) {
    await saveToCsv(productData);
    console.log(`Saved ${productData.length} records to product_data.csv`);
  }
}

main().catch(console.error);
