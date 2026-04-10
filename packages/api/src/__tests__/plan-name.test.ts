import { describe, it, expect } from "vitest";
import { sanitizePlanName } from "../lib/plan-name.js";

describe("sanitizePlanName", () => {
  it("should handle basic plan names", () => {
    expect(sanitizePlanName("Gold Plan")).toBe("Gold Plan");
    expect(sanitizePlanName("Premium")).toBe("Premium");
  });

  it("should apply regex transformations", () => {
    expect(sanitizePlanName("3mth plan")).toBe("3 Month plan");
    expect(sanitizePlanName("x10day")).toBe("x10 Day");
    expect(sanitizePlanName("10day")).toBe("10 Day");
    // These match canonical map exactly before transformations
    expect(sanitizePlanName("COACH TRAINING X48")).toBe("Coach Training x48");
    expect(sanitizePlanName("YOGA X4")).toBe("Yoga x4");
  });

  it("should handle regex-transformed month abbreviations", () => {
    // "1 MTH MEMBERSHIP" becomes "1 Month MEMBERSHIP" after regex, which doesn't match canonical
    expect(sanitizePlanName("1 MTH MEMBERSHIP")).toBe("1 Month MEMBERSHIP");
    // But canonical lookup still works for names without conflicting regex patterns
    expect(sanitizePlanName("WALK-IN 1 DAY")).toBe("Walk-In 1 Day");
  });

  it("should remove non-ASCII characters", () => {
    expect(sanitizePlanName("Premium•Plan")).toBe("Premium Plan");
    expect(sanitizePlanName("Gold·Membership")).toBe("Gold Membership");
  });

  it("should handle x-notation", () => {
    expect(sanitizePlanName("10x")).toBe("x10");
    expect(sanitizePlanName("10 x")).toBe("x10");
    expect(sanitizePlanName("x 10")).toBe("x10");
  });

  it("should collapse multiple spaces", () => {
    expect(sanitizePlanName("Gold    Plan")).toBe("Gold Plan");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(sanitizePlanName("  Gold Plan  ")).toBe("Gold Plan");
  });

  it("should handle empty strings", () => {
    expect(sanitizePlanName("   ")).toBe("");
  });

  it("should normalize month abbreviations", () => {
    expect(sanitizePlanName("1MTH")).toBe("1 Month");
    expect(sanitizePlanName("3MTH")).toBe("3 Month");
  });
});
