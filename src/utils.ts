import * as fs from "fs";
import { createObjectCsvWriter } from "csv-writer";

export interface ProductData {
  SKU: string;
  Source: "Amazon" | "Walmart";
  Title: string;
  Description: string;
  Price: string;
  Reviews: string;
}

export const logError = (sku: string, source: string, error: unknown) => {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const logMessage = `[${timestamp}] ERROR fetching SKU ${sku} from ${source}: ${errorMessage}\n`;

  fs.appendFileSync("errors.log", logMessage);
  console.error(logMessage);
};

export const saveToCsv = async (data: ProductData[]) => {
  const csvWriter = createObjectCsvWriter({
    path: "product_data.csv",
    header: [
      { id: "SKU", title: "SKU" },
      { id: "Source", title: "Source" },
      { id: "Title", title: "Title" },
      { id: "Description", title: "Description" },
      { id: "Price", title: "Price" },
      { id: "Reviews", title: "Reviews" },
    ],
    append: true,
  });

  // Write header if file doesn't exist
  if (!fs.existsSync("product_data.csv")) {
    const headerWriter = createObjectCsvWriter({
      path: "product_data.csv",
      header: [
        { id: "SKU", title: "SKU" },
        { id: "Source", title: "Source" },
        { id: "Title", title: "Title" },
        { id: "Description", title: "Description" },
        { id: "Price", title: "Price" },
        { id: "Reviews", title: "Reviews" },
      ],
    });
    // Just initializing the file to have headers
  }

  await csvWriter.writeRecords(data);
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error("Unreachable");
}
