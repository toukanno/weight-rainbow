import { describe, it, expect } from "vitest";
import { validateWeight, upsertRecord, trimRecords, calcStats } from "../src/logic.js";

describe("validateWeight", () => {
  it("accepts a valid weight", () => {
    expect(validateWeight("65.5")).toEqual({ valid: true, weight: 65.5 });
  });

  it("accepts an integer weight", () => {
    expect(validateWeight("70")).toEqual({ valid: true, weight: 70 });
  });

  it("rejects empty string", () => {
    const result = validateWeight("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects NaN input", () => {
    const result = validateWeight("abc");
    expect(result.valid).toBe(false);
  });

  it("rejects zero weight", () => {
    const result = validateWeight("0");
    expect(result.valid).toBe(false);
  });

  it("rejects negative weight", () => {
    const result = validateWeight("-5");
    expect(result.valid).toBe(false);
  });

  it("rejects string with trailing text like '65abc'", () => {
    const result = validateWeight("65abc");
    expect(result.valid).toBe(false);
  });

  it("accepts weight with decimal point", () => {
    expect(validateWeight("0.5")).toEqual({ valid: true, weight: 0.5 });
  });

  it("rejects whitespace-only input", () => {
    expect(validateWeight("  ")).toEqual({ valid: false, error: "体重を入力してください" });
  });
});

describe("upsertRecord", () => {
  it("adds a new record to an empty log", () => {
    const result = upsertRecord([], "2026-03-09", 65.5);
    expect(result).toEqual([{ dt: "2026-03-09", wt: 65.5 }]);
  });

  it("adds a new record and maintains sort order", () => {
    const existing = [{ dt: "2026-03-01", wt: 60 }, { dt: "2026-03-10", wt: 62 }];
    const result = upsertRecord(existing, "2026-03-05", 61);
    expect(result).toEqual([
      { dt: "2026-03-01", wt: 60 },
      { dt: "2026-03-05", wt: 61 },
      { dt: "2026-03-10", wt: 62 },
    ]);
  });

  it("updates an existing record for the same date", () => {
    const existing = [{ dt: "2026-03-01", wt: 60 }];
    const result = upsertRecord(existing, "2026-03-01", 61.5);
    expect(result).toEqual([{ dt: "2026-03-01", wt: 61.5 }]);
    expect(result).toHaveLength(1);
  });

  it("does not mutate the original array", () => {
    const original = [{ dt: "2026-03-01", wt: 60 }];
    upsertRecord(original, "2026-03-02", 61);
    expect(original).toHaveLength(1);
  });

  it("sorts records across year boundaries", () => {
    const records = [{ dt: "2026-01-01", wt: 60 }];
    const result = upsertRecord(records, "2025-12-31", 59);
    expect(result[0].dt).toBe("2025-12-31");
    expect(result[1].dt).toBe("2026-01-01");
  });
});

describe("trimRecords", () => {
  it("returns records unchanged when under the limit", () => {
    const records = [{ dt: "2026-03-01", wt: 60 }];
    expect(trimRecords(records, 90)).toEqual(records);
  });

  it("returns records unchanged at exactly the limit", () => {
    const records = Array.from({ length: 90 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`,
      wt: 60 + i * 0.1,
    }));
    expect(trimRecords(records, 90)).toHaveLength(90);
  });

  it("trims oldest records when over the limit", () => {
    const records = Array.from({ length: 92 }, (_, i) => ({
      dt: `d${i}`,
      wt: 60 + i,
    }));
    const result = trimRecords(records, 90);
    expect(result).toHaveLength(90);
    // The first two (oldest) should be removed
    expect(result[0].dt).toBe("d2");
    expect(result[result.length - 1].dt).toBe("d91");
  });
});

describe("calcStats", () => {
  it("returns null for empty array", () => {
    expect(calcStats([])).toBeNull();
  });

  it("computes correct stats for a single value", () => {
    const stats = calcStats([65]);
    expect(stats.latest).toBe(65);
    expect(stats.min).toBe(65);
    expect(stats.max).toBe(65);
    expect(stats.change).toBe(0);
    expect(stats.avg).toBe("65.0");
  });

  it("computes correct stats for multiple values", () => {
    const stats = calcStats([60, 62, 58, 65]);
    expect(stats.latest).toBe(65);
    expect(stats.min).toBe(58);
    expect(stats.max).toBe(65);
    expect(stats.change).toBe(5); // 65 - 60
    expect(stats.avg).toBe("61.3"); // (60+62+58+65)/4 = 61.25 -> "61.3"
  });

  it("shows negative change when weight decreased", () => {
    const stats = calcStats([70, 68, 65]);
    expect(stats.change).toBe(-5); // 65 - 70
  });

  it("computes average to one decimal place", () => {
    const stats = calcStats([60, 61, 62]);
    expect(stats.avg).toBe("61.0");
  });
});
