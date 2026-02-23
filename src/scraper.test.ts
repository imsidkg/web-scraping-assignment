import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runSingleAmazonExtraction,
  processAmazonConcurrent,
  SkuInput,
} from "./scraper";
import * as utils from "./utils";

// Mock the util functions so we don't actually launch browsers or write files
vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return {
    ...actual,
    createBrowser: vi.fn(),
    createContext: vi.fn(),
    simulateHumanBehavior: vi.fn(),
    writeToCSV: vi.fn(),
    sleep: vi.fn(), // Mock sleep to make tests instant
  };
});

describe("Scraper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runSingleAmazonExtraction", () => {
    it("should handle cases where no data is available for an Amazon item (missing DOM elements)", async () => {
      // Create a mock page where every selector interaction fails or returns null
      const mockPage = {
        goto: vi.fn().mockResolvedValue(true),
        $: vi.fn().mockResolvedValue(null), // No CAPTCHA button
        waitForSelector: vi.fn().mockRejectedValue(new Error("Timeout")), // Title doesn't load
        $eval: vi.fn().mockRejectedValue(new Error("DOM Element not found")), // Price, title, etc missing
        close: vi.fn().mockResolvedValue(true),
      };

      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(true),
      };

      const mockBrowser = {
        close: vi.fn().mockResolvedValue(true),
      };

      // Mock createContext to return our mockContext
      vi.mocked(utils.createContext).mockResolvedValue(mockContext as any);

      await expect(
        runSingleAmazonExtraction(mockBrowser as any, "MISSING_SKU"),
      ).rejects.toThrow("Product data not found for SKU MISSING_SKU");

      // Assert that it safely closed the context
      expect(mockContext.close).toHaveBeenCalled();
    });
  });

  describe("processAmazonConcurrent", () => {
    it("should process Amazon SKUs concurrently respecting the limit", async () => {
      // Mock createBrowser to return a fake browser
      const mockBrowser = { close: vi.fn().mockResolvedValue(true) };
      vi.mocked(utils.createBrowser).mockResolvedValue(mockBrowser as any);

      // Create a mock page state that succeeds
      const mockPage = {
        goto: vi.fn().mockResolvedValue(true),
        $: vi.fn().mockResolvedValue(null),
        waitForSelector: vi.fn().mockResolvedValue(true),
        $eval: vi.fn().mockResolvedValue("Mock Data"),
        close: vi.fn().mockResolvedValue(true),
      };
      const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(utils.createContext).mockResolvedValue(mockContext as any);

      const testSkus: SkuInput[] = [
        { Type: "Amazon", SKU: "1" },
        { Type: "Amazon", SKU: "2" },
        { Type: "Amazon", SKU: "3" },
        { Type: "Amazon", SKU: "4" },
        { Type: "Amazon", SKU: "5" },
      ];

      // Track how many active requests are running to verify concurrency limit
      let activeRequests = 0;
      let maxActiveRequests = 0;

      // We will override createContext temporarily just to track concurrency
      vi.mocked(utils.createContext).mockImplementation(async () => {
        activeRequests++;
        if (activeRequests > maxActiveRequests)
          maxActiveRequests = activeRequests;

        // Simulate some asynchronous work
        await new Promise((resolve) => setTimeout(resolve, 50));

        activeRequests--;
        return mockContext as any;
      });

      // Run concurrency with a limit of 2
      await processAmazonConcurrent(testSkus, 2);

      // We had 5 SKUs, so writeToCSV should be called 5 times
      expect(utils.writeToCSV).toHaveBeenCalledTimes(5);

      // Since our limit was 2, we should never have exceeded 2 active contexts at once
      expect(maxActiveRequests).toBeLessThanOrEqual(2);
      // But it should be greater than 1 since we had 5 items and delay, proving it was concurrent
      expect(maxActiveRequests).toBeGreaterThan(1);
    });
  });
});
