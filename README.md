# Web Scraper

This is a TypeScript-based web scraper built using Playwright, designed to extract product details from Amazon and Walmart based on a list of supplied SKUs.

## Requirements

- Node.js (v18+)
- pnpm

## Installation

1. Clone or navigate to the repository directory.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Install Playwright browsers (if not automatically installed):
   ```bash
   pnpm exec playwright install chromium
   ```

## Usage

1. Ensure your `skus.json` file is present in the root directory with the format:
   ```json
   {
     "skus": [
       { "Type": "Amazon", "SKU": "B0CT4BB651" },
       { "Type": "Walmart", "SKU": "5326288985" }
     ]
   }
   ```
2. Run the scraper using `tsx` (TypeScript executor):
   ```bash
   pnpm tsx src/scraper.ts
   ```

## Outputs

- `product_data.csv`: Contains the successfully scraped data appended row by row.
- `errors.log`: Contains information about any scraping failures or encountered CAPTCHAs.

## Assumptions & Limitations

- **Headless Detection / CAPTCHAs:** Both Amazon and Walmart employ strict anti-bot systems. Even with `puppeteer-extra-plugin-stealth`, headless browsers running from datacenters or cloud environments are frequently challenged with CAPTCHAs or blocked entirely. The scraper is built with basic handling to detect and log these blocks, but it does not bypass complex residential proxy requirements.
- **Dynamic Selectors:** E-commerce sites frequently perform A/B testing on their DOM structures. The CSS selectors used for prices, titles, and descriptions may break or change depending on the region, session, or random testing variations from the target site. Note: fallback selectors are provided where possible.
- **Sequential Execution:** The current scraper processes items sequentially to reduce the likelihood of triggering immediate rate-limiting mechanisms. Parallel execution is possible but increases the risk of IP blocks without proper proxy rotation.
- **Data Availability:** On certain products, the price might be hidden off-screen (e.g. "See price in cart" on Amazon), which the scraper might fetch as 'N/A'.
