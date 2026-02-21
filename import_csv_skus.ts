import * as fs from "fs";
import Papa from "papaparse";

interface SkuInput {
  Type: "Amazon" | "Walmart";
  SKU: string;
}

async function extractSkusFromCsv() {
  // 1. Read the existing skus.json
  const existingRaw = fs.readFileSync("skus.json", "utf-8");
  const skusObj: { skus: SkuInput[] } = JSON.parse(existingRaw);
  const skus = skusObj.skus;

  // 2. Point this to the path of your downloaded CSV file
  // UPDATE THIS PATH to wherever you saved the Kaggle/CSV file
  const csvFilePath =
    "/home/imsidkg/Downloads/walmart-product/marketing_sample_for_walmart_com-walmart_com_product_details__20210101_20210331__30k_data.csv";

  // 3. Update 'product_id' to match the exact column header name in your CSV
  // (e.g. it might be 'asin', 'id', 'SKU', 'Product ID', etc.)
  const skuColumnName = "Sku";

  if (!fs.existsSync(csvFilePath)) {
    console.error(
      `File not found: ${csvFilePath}. Please update the script with the correct path!`,
    );
    return;
  }

  const csvRaw = fs.readFileSync(csvFilePath, "utf-8");

  Papa.parse(csvRaw, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      let addedCount = 0;

      for (const row of results.data as any[]) {
        const skuValue = row[skuColumnName];

        if (
          skuValue &&
          typeof skuValue === "string" &&
          skuValue.trim() !== ""
        ) {
          skus.push({
            Type: "Walmart",
            SKU: skuValue.trim(),
          });
          addedCount++;

          if (addedCount >= 1000) {
            break;
          }
        }
      }

      // 4. Write it back to skus.json
      fs.writeFileSync("skus.json", JSON.stringify({ skus }, null, 2));
      console.log(
        `Successfully extracted ${addedCount} SKUs and appended them to skus.json!`,
      );
      console.log(`Total SKUs ready to scrape: ${skus.length}`);
    },
  });
}

extractSkusFromCsv();
