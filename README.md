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

1. **Start Google Chrome in debugging mode.** The scraper connects to an existing, physical browser profile to avoid bot detection. Before running the script, carefully run this command in your terminal:

   # Linux
   ```bash
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```


   # macOS
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

   _(Note: Keep this terminal process running and wait for the browser window to open)._

2. Ensure your `skus.json` file is present in the root directory with the format:
   ```json
   {
     "skus": [
       { "Type": "Amazon", "SKU": "B0CT4BB651" },
       { "Type": "Walmart", "SKU": "5326288985" }
     ]
   }
   ```
3. Run the scraper using `tsx` (TypeScript executor) in a **new terminal tab**:
   ```bash
   pnpm tsx src/scraper.ts
   ```

## Outputs

- `product_data.csv`: Contains the successfully scraped data appended row by row.
- `errors.log`: Contains information about any scraping failures or encountered CAPTCHAs.

## Assumptions made during development

- **Local Execution:** It is assumed the script will be run locally by a human who can bypass complex visual CAPTCHAs if they appear in the visible debug browser window.
- **Data Availability:** On certain products, the price might be hidden off-screen (e.g. "See price in cart" on Amazon), which the scraper assumes means the data is not publicly available without an authenticated session, returning 'N/A' or `null`.
- **Browser State:** We assume the user is capable of launching a physical Chrome instance with debugging enabled to serve as the host for the Walmart scraping bypass strategy.

## Limitations of the solution

- **Headless Detection / CAPTCHAs:** Both Amazon and Walmart employ strict anti-bot systems. Even with `puppeteer-extra-plugin-stealth`, headless browsers running from datacenters or cloud environments are frequently challenged with CAPTCHAs or blocked entirely. The scraper is built with basic handling to detect and log these blocks, but it does not bypass complex server-side fingerprinting or residential proxy requirements.
- **Dynamic Selectors:** E-commerce sites frequently perform A/B testing on their DOM structures. The CSS selectors used for prices, titles, and descriptions may break or change depending on the region, session, or random testing variations from the target site. Note: fallback selectors are provided where possible.
- **Walmart Concurrency Block:** The Walmart scraping strategy relies on hijacking a single, physical browser window to build up a human-like history via Google Search. Because of this, Walmart SKUs currently must be processed sequentially. Only Amazon SKUs are processed concurrently using `p-limit`.
