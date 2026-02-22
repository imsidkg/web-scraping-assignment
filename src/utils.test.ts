import { describe, it, expect } from "vitest";
import { sleep, applyStealthScripts, withRetry } from "./utils";

describe("Scraper Utils", () => {
  describe("sleep function", () => {
    it("should resolve after approximately the specified time", async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      const elapsed = end - start;

      // Allow for a small margin of error (e.g., event loop delay)
      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe("applyStealthScripts", () => {
    it("should gracefully handle a mock page object", async () => {
      // Create a mock playright Page object
      let scriptsAdded = 0;
      const mockPage = {
        addInitScript: async () => {
          scriptsAdded++;
        },
      };

      // @ts-ignore - we are purposely passing a partial mock
      await applyStealthScripts(mockPage);

      // Verify that it attempted to inject the 1 predefined script
      expect(scriptsAdded).toBe(1);
    });
  });

  describe("withRetry", () => {
    it("should resolve immediately if the first attempt succeeds", async () => {
      const mockFn = async () => "success";
      const result = await withRetry(mockFn, {
        retries: 3,
        sku: "TEST",
        source: "Test",
      });
      expect(result).toBe("success");
    });

    it("should retry until success is reached", async () => {
      let attempts = 0;
      const mockFn = async () => {
        attempts++;
        if (attempts < 3) throw new Error("Failing intentionally");
        return "finally success";
      };

      const result = await withRetry(mockFn, {
        retries: 3,
        sku: "TEST",
        source: "Test",
        baseDelay: 100, // Speed up the test
      });
      expect(result).toBe("finally success");
      expect(attempts).toBe(3);
    });

    it("should return null after exceeding max retries", async () => {
      const mockFn = async () => {
        throw new Error("Always fails");
      };

      // We expect it to ultimately fail and return null per the utility function design
      const result = await withRetry(mockFn, {
        retries: 2,
        sku: "TEST",
        source: "Test",
        baseDelay: 10,
      });
      expect(result).toBeNull();
    });

    it("should return null immediately if retries is 0 and function fails", async () => {
      const mockFn = async () => {
        throw new Error("Instant fail");
      };

      const result = await withRetry(mockFn, {
        retries: 0,
        sku: "TEST",
        source: "Test",
      });
      expect(result).toBeNull();
    });

    it("should succeed if retries is 0 but function succeeds on first try", async () => {
      const mockFn = async () => "instant success";

      const result = await withRetry(mockFn, {
        retries: 0,
        sku: "TEST",
        source: "Test",
      });
      expect(result).toBe("instant success");
    });
  });
});
