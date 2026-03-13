import { beforeAll, describe, expect, it } from "vitest";
import {
  buildRecord,
  calcStats,
  calcDailyDiff,
  calcGoalPrediction,
  calcGoalProgress,
  calcPeriodSummary,
  calcStreak,
  calcWeightTrend,
  calculateBMI,
  createDefaultProfile,
  createDefaultSettings,
  extractWeightCandidates,
  getBMIStatus,
  parseVoiceWeight,
  trimRecords,
  upsertRecord,
  validateProfile,
  validateBodyFat,
  validateWeight,
  buildCalendarMonth,
  calcWeeklyRate,
  calcMonthlyStats,
  filterRecords,
} from "../src/logic.js";

describe("validateWeight", () => {
  it("accepts valid decimal input", () => {
    expect(validateWeight("65.5")).toEqual({ valid: true, weight: 65.5 });
  });

  it("accepts full-width digits", () => {
    expect(validateWeight("６５．４")).toEqual({ valid: true, weight: 65.4 });
  });

  it("rejects non-numeric strings", () => {
    expect(validateWeight("abc")).toEqual({ valid: false, error: "weight.invalid" });
  });

  it("rejects values outside supported range", () => {
    expect(validateWeight("10")).toEqual({ valid: false, error: "weight.range" });
    expect(validateWeight("301")).toEqual({ valid: false, error: "weight.range" });
  });
});

describe("validateProfile", () => {
  it("sanitizes a valid profile", () => {
    expect(
      validateProfile({
        name: " Rainbow ",
        heightCm: "170",
        age: "32",
        gender: "female",
      }),
    ).toEqual({
      valid: true,
      profile: { name: "Rainbow", heightCm: 170, age: 32, gender: "female" },
    });
  });

  it("rejects invalid height", () => {
    expect(validateProfile({ ...createDefaultProfile(), heightCm: "79" })).toEqual({
      valid: false,
      error: "profile.heightRange",
    });
  });

  it("rejects invalid age", () => {
    expect(validateProfile({ ...createDefaultProfile(), age: "0" })).toEqual({
      valid: false,
      error: "profile.ageRange",
    });
  });
});

describe("BMI helpers", () => {
  it("calculates BMI to one decimal place", () => {
    expect(calculateBMI(65, 170)).toBe(22.5);
  });

  it("returns null when height is missing", () => {
    expect(calculateBMI(65, "")).toBeNull();
  });

  it("classifies BMI states", () => {
    expect(getBMIStatus(17.9)).toBe("bmi.under");
    expect(getBMIStatus(22)).toBe("bmi.normal");
    expect(getBMIStatus(27)).toBe("bmi.over");
    expect(getBMIStatus(33)).toBe("bmi.obese");
  });
});

describe("OCR and voice helpers", () => {
  it("extracts weight-like candidates from mixed text", () => {
    expect(extractWeightCandidates("Weight 65.4kg / BMI 22.5")).toEqual([65.4, 22.5]);
  });

  it("extracts candidates from Japanese speech text", () => {
    expect(parseVoiceWeight("きょうの体重は ６４ 点 ８ キロ", 65)).toBe(64.8);
  });
});

describe("record helpers", () => {
  it("builds a record with BMI", () => {
    const record = buildRecord({
      date: "2026-03-13",
      weight: 65,
      profile: { heightCm: 170 },
      source: "manual",
    });

    expect(record).toMatchObject({
      dt: "2026-03-13",
      wt: 65,
      bmi: 22.5,
      source: "manual",
    });
  });

  it("upserts and sorts records by date", () => {
    const first = buildRecord({
      date: "2026-03-10",
      weight: 64,
      profile: { heightCm: 170 },
      source: "manual",
    });
    const second = buildRecord({
      date: "2026-03-08",
      weight: 63.5,
      profile: { heightCm: 170 },
      source: "voice",
    });

    const records = upsertRecord([first], second);
    expect(records.map((record) => record.dt)).toEqual(["2026-03-08", "2026-03-10"]);
  });

  it("trims oldest records when over max count", () => {
    const records = Array.from({ length: 5 }, (_, index) => ({
      dt: `2026-03-0${index + 1}`,
      wt: 60 + index,
    }));

    expect(trimRecords(records, 3).map((record) => record.dt)).toEqual(["2026-03-03", "2026-03-04", "2026-03-05"]);
  });

  it("computes aggregate stats from records", () => {
    const records = [
      { dt: "2026-03-01", wt: 60 },
      { dt: "2026-03-02", wt: 61.5 },
      { dt: "2026-03-03", wt: 59.5 },
    ];

    expect(calcStats(records, { heightCm: 170 })).toEqual({
      latestWeight: 59.5,
      minWeight: 59.5,
      maxWeight: 61.5,
      change: -0.5,
      avgWeight: 60.3,
      latestBMI: 20.6,
      latestDate: "2026-03-03",
    });
  });
});

describe("defaults", () => {
  it("returns stable default settings", () => {
    expect(createDefaultSettings()).toEqual({
      language: "ja",
      theme: "prism",
      chartStyle: "detailed",
      adPreviewEnabled: true,
      goalWeight: null,
      reminderEnabled: false,
      reminderTime: "21:00",
      autoTheme: false,
    });
  });
});

describe("calcDailyDiff", () => {
  it("returns null with fewer than 2 records", () => {
    expect(calcDailyDiff([])).toBeNull();
    expect(calcDailyDiff([{ dt: "2026-03-13", wt: 70 }])).toBeNull();
  });

  it("returns null when today or yesterday record is missing", () => {
    const records = [
      { dt: "2026-03-10", wt: 70 },
      { dt: "2026-03-11", wt: 71 },
    ];
    expect(calcDailyDiff(records)).toBeNull();
  });

  it("returns diff when both today and yesterday exist", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: yesterday, wt: 70.0 },
      { dt: today, wt: 69.5 },
    ];
    const result = calcDailyDiff(records);
    expect(result).toEqual({ today: 69.5, yesterday: 70.0, diff: -0.5 });
  });
});

describe("calcGoalProgress", () => {
  it("returns null with no records", () => {
    expect(calcGoalProgress([], 60)).toBeNull();
  });

  it("returns null with non-finite goal", () => {
    expect(calcGoalProgress([{ wt: 70 }], null)).toBeNull();
  });

  it("calculates progress correctly", () => {
    const records = [{ wt: 80 }, { wt: 75 }, { wt: 70 }];
    const result = calcGoalProgress(records, 60);
    expect(result.percent).toBe(50);
    expect(result.remaining).toBe(10);
  });

  it("caps at 100% when goal exceeded", () => {
    const records = [{ wt: 80 }, { wt: 55 }];
    const result = calcGoalProgress(records, 60);
    expect(result.percent).toBe(100);
    expect(result.remaining).toBe(-5);
  });
});

describe("calcGoalPrediction", () => {
  it("returns null with no records", () => {
    expect(calcGoalPrediction([], 60)).toBeNull();
  });

  it("returns achieved when already at goal", () => {
    const today = new Date().toISOString().slice(0, 10);
    const records = [{ dt: today, wt: 58 }];
    expect(calcGoalPrediction(records, 60)).toEqual({ achieved: true, days: 0 });
  });

  it("returns insufficient with fewer than 2 recent records", () => {
    const today = new Date().toISOString().slice(0, 10);
    const records = [{ dt: today, wt: 70 }];
    const result = calcGoalPrediction(records, 60);
    expect(result.insufficient).toBe(true);
  });

  it("returns noTrend when weight is not decreasing", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: yesterday, wt: 70 },
      { dt: today, wt: 71 },
    ];
    const result = calcGoalPrediction(records, 60);
    expect(result.noTrend).toBe(true);
  });

  it("estimates days to goal with downward trend", () => {
    const dates = [];
    for (let i = 10; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dates.push(d);
    }
    const records = dates.map((dt, i) => ({ dt, wt: 70 - i * 0.1 }));
    const result = calcGoalPrediction(records, 60);
    expect(result.achieved).toBe(false);
    expect(result.days).toBeGreaterThan(0);
    expect(result.predictedDate).toBeDefined();
  });
});

describe("calcPeriodSummary", () => {
  it("returns null with no records in period", () => {
    const records = [{ dt: "2020-01-01", wt: 70 }];
    expect(calcPeriodSummary(records, 7)).toBeNull();
  });

  it("calculates weekly summary", () => {
    const today = new Date().toISOString().slice(0, 10);
    const records = [
      { dt: today, wt: 70 },
      { dt: today, wt: 72 },
    ];
    // Deduplicated by date - both have same dt
    const result = calcPeriodSummary(records, 7);
    expect(result.count).toBe(2);
    expect(result.avg).toBe(71);
    expect(result.min).toBe(70);
    expect(result.max).toBe(72);
  });
});

describe("calcStreak", () => {
  it("returns 0 for empty records", () => {
    expect(calcStreak([])).toBe(0);
  });

  it("counts consecutive days", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: dayBefore, wt: 70 },
      { dt: yesterday, wt: 69.5 },
      { dt: today, wt: 69 },
    ];
    expect(calcStreak(records)).toBe(3);
  });

  it("breaks on gap", () => {
    const today = new Date().toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: twoDaysAgo, wt: 70 },
      { dt: today, wt: 69 },
    ];
    expect(calcStreak(records)).toBe(1);
  });
});

describe("calcWeightTrend", () => {
  it("returns null for insufficient data", () => {
    expect(calcWeightTrend([])).toBeNull();
    expect(calcWeightTrend([{ dt: "2026-03-13", wt: 70 }])).toBeNull();
  });

  it("detects downward trend", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: yesterday, wt: 70 },
      { dt: today, wt: 69 },
    ];
    expect(calcWeightTrend(records)).toBe("down");
  });

  it("detects upward trend", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: yesterday, wt: 69 },
      { dt: today, wt: 70 },
    ];
    expect(calcWeightTrend(records)).toBe("up");
  });

  it("detects flat trend", () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: yesterday, wt: 70 },
      { dt: today, wt: 70.05 },
    ];
    expect(calcWeightTrend(records)).toBe("flat");
  });
});

describe("buildCalendarMonth", () => {
  it("builds correct structure for a month", () => {
    const records = [
      { dt: "2026-03-01", wt: 70 },
      { dt: "2026-03-15", wt: 68 },
    ];
    const cal = buildCalendarMonth(records, 2026, 2); // March = month index 2
    expect(cal.year).toBe(2026);
    expect(cal.month).toBe(2);
    expect(cal.daysInMonth).toBe(31);
    expect(cal.recordCount).toBe(2);
    expect(cal.label).toBe("2026-03");
    expect(cal.days).toHaveLength(31);
    expect(cal.days[0].wt).toBe(70);
    expect(cal.days[14].wt).toBe(68);
    expect(cal.days[1].wt).toBeNull();
  });

  it("calculates intensity relative to month range", () => {
    const records = [
      { dt: "2026-03-01", wt: 60 },
      { dt: "2026-03-10", wt: 70 },
    ];
    const cal = buildCalendarMonth(records, 2026, 2);
    expect(cal.days[0].intensity).toBe(0); // min weight
    expect(cal.days[9].intensity).toBe(1); // max weight
  });

  it("returns empty for months with no records", () => {
    const cal = buildCalendarMonth([], 2026, 2);
    expect(cal.recordCount).toBe(0);
    expect(cal.days.every((d) => d.wt === null)).toBe(true);
  });
});

describe("validateBodyFat", () => {
  it("accepts empty input as null", () => {
    expect(validateBodyFat("")).toEqual({ valid: true, bodyFat: null });
    expect(validateBodyFat(null)).toEqual({ valid: true, bodyFat: null });
    expect(validateBodyFat(undefined)).toEqual({ valid: true, bodyFat: null });
  });

  it("accepts valid body fat percentage", () => {
    expect(validateBodyFat("22.5")).toEqual({ valid: true, bodyFat: 22.5 });
    expect(validateBodyFat("15")).toEqual({ valid: true, bodyFat: 15 });
  });

  it("rejects non-numeric input", () => {
    expect(validateBodyFat("abc")).toEqual({ valid: false, error: "bodyFat.invalid" });
  });

  it("rejects out-of-range values", () => {
    expect(validateBodyFat("0")).toEqual({ valid: false, error: "bodyFat.range" });
    expect(validateBodyFat("71")).toEqual({ valid: false, error: "bodyFat.range" });
  });
});

describe("buildRecord with bodyFat", () => {
  it("includes body fat when provided", () => {
    const record = buildRecord({
      date: "2026-03-13",
      weight: 65,
      profile: { heightCm: 170 },
      source: "manual",
      bodyFat: 22.5,
    });
    expect(record.bf).toBe(22.5);
  });

  it("defaults body fat to null", () => {
    const record = buildRecord({
      date: "2026-03-13",
      weight: 65,
      profile: { heightCm: 170 },
      source: "manual",
    });
    expect(record.bf).toBeNull();
  });

  it("includes note when provided", () => {
    const record = buildRecord({
      date: "2026-03-13",
      weight: 65,
      profile: { heightCm: 170 },
      source: "manual",
      note: "  ate out  ",
    });
    expect(record.note).toBe("ate out");
  });

  it("defaults note to empty string", () => {
    const record = buildRecord({
      date: "2026-03-13",
      weight: 65,
      profile: { heightCm: 170 },
      source: "manual",
    });
    expect(record.note).toBe("");
  });

  it("truncates note to 100 characters", () => {
    const longNote = "a".repeat(150);
    const record = buildRecord({
      date: "2026-03-13",
      weight: 65,
      profile: { heightCm: 170 },
      source: "manual",
      note: longNote,
    });
    expect(record.note).toHaveLength(100);
  });
});

describe("calcWeeklyRate", () => {
  it("returns null with fewer than 2 records", () => {
    expect(calcWeeklyRate([])).toBeNull();
    expect(calcWeeklyRate([{ dt: "2026-03-01", wt: 70 }])).toBeNull();
  });

  it("returns null when span is less than 7 days", () => {
    const records = [
      { dt: "2026-03-10", wt: 70 },
      { dt: "2026-03-13", wt: 69 },
    ];
    expect(calcWeeklyRate(records)).toBeNull();
  });

  it("calculates weekly rate for weight loss", () => {
    const records = [
      { dt: "2026-03-01", wt: 70 },
      { dt: "2026-03-15", wt: 68 },
    ];
    const result = calcWeeklyRate(records);
    expect(result).not.toBeNull();
    expect(result.weeklyRate).toBeLessThan(0);
    expect(result.totalDays).toBe(14);
    expect(result.totalChange).toBe(-2);
    // -2kg over 14 days = -1kg/week
    expect(result.weeklyRate).toBe(-1);
  });

  it("calculates weekly rate for weight gain", () => {
    const records = [
      { dt: "2026-03-01", wt: 65 },
      { dt: "2026-03-22", wt: 68 },
    ];
    const result = calcWeeklyRate(records);
    expect(result.weeklyRate).toBe(1);
    expect(result.totalChange).toBe(3);
  });
});

describe("i18n ARIA keys", () => {
  // Import translations to verify ARIA-related keys exist in both languages
  let translations;
  beforeAll(async () => {
    const mod = await import("../src/i18n.js");
    translations = mod.translations;
  });

  const ariaKeys = [
    "section.entry",
    "section.chart",
    "summary.title",
    "settings.theme",
    "quick.title",
    "rainbow.congrats",
    "chart.period.7",
    "chart.period.30",
    "chart.period.90",
    "chart.period.all",
    "summary.week",
    "summary.month",
  ];

  it("has all ARIA-related keys in Japanese", () => {
    for (const key of ariaKeys) {
      expect(translations.ja[key], `Missing ja key: ${key}`).toBeDefined();
      expect(translations.ja[key]).not.toBe("");
    }
  });

  it("has all ARIA-related keys in English", () => {
    for (const key of ariaKeys) {
      expect(translations.en[key], `Missing en key: ${key}`).toBeDefined();
      expect(translations.en[key]).not.toBe("");
    }
  });
});

describe("calcMonthlyStats", () => {
  it("returns empty array for no records", () => {
    expect(calcMonthlyStats([])).toEqual([]);
  });

  it("groups records by month with correct stats", () => {
    const records = [
      { dt: "2026-01-05", wt: 70 },
      { dt: "2026-01-15", wt: 68 },
      { dt: "2026-01-25", wt: 66 },
      { dt: "2026-02-10", wt: 65 },
      { dt: "2026-02-20", wt: 64 },
    ];
    const result = calcMonthlyStats(records);
    expect(result).toHaveLength(2);
    // Sorted newest first
    expect(result[0].month).toBe("2026-02");
    expect(result[0].count).toBe(2);
    expect(result[0].avg).toBe(64.5);
    expect(result[0].min).toBe(64);
    expect(result[0].max).toBe(65);
    expect(result[0].change).toBe(-1);

    expect(result[1].month).toBe("2026-01");
    expect(result[1].count).toBe(3);
    expect(result[1].avg).toBeCloseTo(68, 0);
    expect(result[1].min).toBe(66);
    expect(result[1].max).toBe(70);
    expect(result[1].change).toBe(-4);
  });

  it("handles single record in a month", () => {
    const records = [{ dt: "2026-03-10", wt: 72 }];
    const result = calcMonthlyStats(records);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe("2026-03");
    expect(result[0].count).toBe(1);
    expect(result[0].change).toBe(0);
  });
});

describe("filterRecords", () => {
  const records = [
    { dt: "2026-01-05", wt: 70, note: "morning run", source: "manual" },
    { dt: "2026-01-10", wt: 68.5, note: "after gym", source: "quick" },
    { dt: "2026-02-01", wt: 67, note: "", source: "voice" },
    { dt: "2026-02-15", wt: 66, note: "diet started", source: "manual" },
  ];

  it("returns all records when query is empty", () => {
    expect(filterRecords(records, "")).toEqual(records);
    expect(filterRecords(records, null)).toEqual(records);
    expect(filterRecords(records, "  ")).toEqual(records);
  });

  it("filters by date substring", () => {
    const result = filterRecords(records, "2026-01");
    expect(result).toHaveLength(2);
    expect(result[0].dt).toBe("2026-01-05");
  });

  it("filters by note content (case insensitive)", () => {
    const result = filterRecords(records, "gym");
    expect(result).toHaveLength(1);
    expect(result[0].wt).toBe(68.5);
  });

  it("filters by weight value", () => {
    const result = filterRecords(records, "67");
    expect(result).toHaveLength(1);
    expect(result[0].dt).toBe("2026-02-01");
  });

  it("filters by source", () => {
    const result = filterRecords(records, "voice");
    expect(result).toHaveLength(1);
    expect(result[0].dt).toBe("2026-02-01");
  });
});
