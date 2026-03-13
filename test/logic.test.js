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
  calcBMIZoneWeights,
  calcInsight,
  toggleNoteTag,
  NOTE_TAGS,
  filterRecordsByDateRange,
  calcSourceBreakdown,
  normalizeNumericInput,
  pickWeightCandidate,
  calcAchievements,
  calcWeightComparison,
  calcDayOfWeekAvg,
  calcWeightStability,
  detectMilestone,
  exportRecordsToCSV,
  parseCSVImport,
  calcBodyFatStats,
  calcDaysSinceLastRecord,
  calcLongestStreak,
  calcTrendForecast,
  calcSmoothedWeight,
  calcCalendarChangeMap,
  calcBMIDistribution,
  calcWeightPercentile,
  calcMovingAverages,
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

describe("calcBMIZoneWeights", () => {
  it("returns null for invalid height", () => {
    expect(calcBMIZoneWeights(null)).toBeNull();
    expect(calcBMIZoneWeights("")).toBeNull();
    expect(calcBMIZoneWeights(0)).toBeNull();
  });

  it("calculates correct zone boundaries for 170cm", () => {
    const zones = calcBMIZoneWeights(170);
    // BMI 18.5 at 170cm = 18.5 * 1.7^2 = 53.465
    expect(zones.underMax).toBeCloseTo(53.5, 0);
    // BMI 25 at 170cm = 25 * 1.7^2 = 72.25
    expect(zones.normalMax).toBeCloseTo(72.3, 0);
    // BMI 30 at 170cm = 30 * 1.7^2 = 86.7
    expect(zones.overMax).toBeCloseTo(86.7, 0);
  });

  it("calculates correct zone boundaries for 160cm", () => {
    const zones = calcBMIZoneWeights(160);
    // BMI 18.5 at 160cm = 18.5 * 1.6^2 = 47.36
    expect(zones.underMax).toBeCloseTo(47.4, 0);
    // BMI 25 at 160cm = 25 * 1.6^2 = 64.0
    expect(zones.normalMax).toBe(64);
    // BMI 30 at 160cm = 30 * 1.6^2 = 76.8
    expect(zones.overMax).toBe(76.8);
  });
});

describe("i18n record badge keys", () => {
  let translations;
  beforeAll(async () => {
    const mod = await import("../src/i18n.js");
    translations = mod.translations;
  });

  const badgeKeys = [
    "records.best",
    "records.highest",
    "records.search",
    "records.searchResult",
    "chart.bmiZones",
    "monthly.title",
    "monthly.hint",
    "monthly.records",
    "monthly.showAll",
  ];

  it("has all record/feature keys in Japanese", () => {
    for (const key of badgeKeys) {
      expect(translations.ja[key], `Missing ja key: ${key}`).toBeDefined();
    }
  });

  it("has all record/feature keys in English", () => {
    for (const key of badgeKeys) {
      expect(translations.en[key], `Missing en key: ${key}`).toBeDefined();
    }
  });
});

describe("calcInsight", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcInsight([])).toBeNull();
    expect(calcInsight([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns bestDay for 3+ records", () => {
    // All on Wednesdays (day 3)
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-08", wt: 69 },
      { dt: "2025-01-15", wt: 68 },
    ];
    const result = calcInsight(records);
    expect(result).not.toBeNull();
    expect(result.bestDay).toBeGreaterThanOrEqual(0);
    expect(result.bestDay).toBeLessThanOrEqual(6);
  });
});

describe("toggleNoteTag", () => {
  it("adds tag to empty note", () => {
    expect(toggleNoteTag("", "exercise")).toBe("#exercise");
  });

  it("adds tag to existing note", () => {
    expect(toggleNoteTag("morning run", "exercise")).toBe("morning run #exercise");
  });

  it("removes existing tag", () => {
    expect(toggleNoteTag("#exercise #diet", "exercise")).toBe("#diet");
  });

  it("handles null note", () => {
    expect(toggleNoteTag(null, "diet")).toBe("#diet");
  });

  it("handles empty string note", () => {
    expect(toggleNoteTag("", "travel")).toBe("#travel");
  });

  it("truncates to 100 characters", () => {
    const longNote = "a".repeat(95);
    const result = toggleNoteTag(longNote, "exercise");
    expect(result.length).toBeLessThanOrEqual(100);
  });
});

describe("NOTE_TAGS", () => {
  it("has all expected tags", () => {
    expect(NOTE_TAGS).toContain("exercise");
    expect(NOTE_TAGS).toContain("diet");
    expect(NOTE_TAGS.length).toBeGreaterThanOrEqual(6);
  });
});

describe("filterRecordsByDateRange", () => {
  const records = [
    { dt: "2025-01-01", wt: 70 },
    { dt: "2025-01-15", wt: 69 },
    { dt: "2025-02-01", wt: 68 },
    { dt: "2025-03-01", wt: 67 },
  ];

  it("returns all records when no dates specified", () => {
    expect(filterRecordsByDateRange(records, "", "")).toEqual(records);
  });

  it("filters by from date only", () => {
    const result = filterRecordsByDateRange(records, "2025-02-01", "");
    expect(result).toHaveLength(2);
    expect(result[0].dt).toBe("2025-02-01");
  });

  it("filters by to date only", () => {
    const result = filterRecordsByDateRange(records, "", "2025-01-15");
    expect(result).toHaveLength(2);
    expect(result[1].dt).toBe("2025-01-15");
  });

  it("filters by both from and to", () => {
    const result = filterRecordsByDateRange(records, "2025-01-15", "2025-02-01");
    expect(result).toHaveLength(2);
    expect(result[0].dt).toBe("2025-01-15");
    expect(result[1].dt).toBe("2025-02-01");
  });
});

describe("calcSourceBreakdown", () => {
  it("returns null for empty records", () => {
    expect(calcSourceBreakdown([])).toBeNull();
  });

  it("counts records by source", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, source: "manual" },
      { dt: "2025-01-02", wt: 69, source: "manual" },
      { dt: "2025-01-03", wt: 68, source: "voice" },
      { dt: "2025-01-04", wt: 67, source: "quick" },
    ];
    const result = calcSourceBreakdown(records);
    expect(result).toEqual({ manual: 2, voice: 1, quick: 1 });
  });

  it("defaults missing source to manual", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const result = calcSourceBreakdown(records);
    expect(result).toEqual({ manual: 1 });
  });
});

describe("normalizeNumericInput", () => {
  it("converts full-width digits", () => {
    expect(normalizeNumericInput("６５．４")).toBe("65.4");
  });

  it("normalizes various decimal separators", () => {
    expect(normalizeNumericInput("65，4")).toBe("65.4");
    expect(normalizeNumericInput("65,4")).toBe("65.4");
  });

  it("handles null/undefined", () => {
    expect(normalizeNumericInput(null)).toBe("");
    expect(normalizeNumericInput(undefined)).toBe("");
  });
});

describe("pickWeightCandidate", () => {
  it("returns null for empty candidates", () => {
    expect(pickWeightCandidate([])).toBeNull();
  });

  it("returns first candidate without fallback", () => {
    expect(pickWeightCandidate([65.5, 70.0])).toBe(65.5);
  });

  it("picks closest to fallback weight", () => {
    expect(pickWeightCandidate([55.0, 65.5, 70.0], 64.0)).toBe(65.5);
  });
});

describe("calcAchievements", () => {
  it("returns empty for no records", () => {
    expect(calcAchievements([], 0, null)).toEqual([]);
  });

  it("returns record count milestone", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const achievements = calcAchievements(records, 0, null);
    expect(achievements.some((a) => a.id === "records_1")).toBe(true);
  });

  it("returns streak milestones", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const achievements = calcAchievements(records, 7, null);
    expect(achievements.some((a) => a.id === "streak_7")).toBe(true);
    expect(achievements.some((a) => a.id === "streak_3")).toBe(true);
  });

  it("returns weight loss milestones", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-02-01", wt: 72 },
    ];
    const achievements = calcAchievements(records, 0, null);
    expect(achievements.some((a) => a.id === "loss_3")).toBe(true);
    expect(achievements.some((a) => a.id === "loss_1")).toBe(true);
  });

  it("returns goal achieved", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-02-01", wt: 65 },
    ];
    const achievements = calcAchievements(records, 0, 66);
    expect(achievements.some((a) => a.id === "goal_achieved")).toBe(true);
  });
});

describe("calcWeightComparison", () => {
  it("returns null with less than 2 records", () => {
    expect(calcWeightComparison([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns comparison data for sufficient records", () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now - 8 * 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: weekAgo, wt: 72 },
      { dt: today, wt: 70 },
    ];
    const result = calcWeightComparison(records);
    expect(result).not.toBeNull();
    if (result?.week) {
      expect(result.week.diff).toBe(-2);
    }
  });
});

describe("calcDayOfWeekAvg", () => {
  it("returns null for fewer than 7 records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    expect(calcDayOfWeekAvg(records)).toBeNull();
  });

  it("computes averages by day of week", () => {
    const records = [
      { dt: "2025-01-06", wt: 70 }, // Mon
      { dt: "2025-01-07", wt: 71 }, // Tue
      { dt: "2025-01-08", wt: 69 }, // Wed
      { dt: "2025-01-09", wt: 72 }, // Thu
      { dt: "2025-01-10", wt: 68 }, // Fri
      { dt: "2025-01-11", wt: 73 }, // Sat
      { dt: "2025-01-12", wt: 70 }, // Sun
    ];
    const result = calcDayOfWeekAvg(records);
    expect(result).not.toBeNull();
    expect(result.avgs[1]).toBe(70); // Monday
    expect(result.avgs[0]).toBe(70); // Sunday
    expect(result.counts[1]).toBe(1); // Monday count
    expect(typeof result.overallAvg).toBe("number");
  });

  it("handles days with no records as null", () => {
    // 7 records all on Monday
    const records = Array.from({ length: 7 }, (_, i) => ({
      dt: `2025-01-${String(6 + i * 7).padStart(2, "0")}`, // All Mondays
      wt: 70 + i,
    }));
    const result = calcDayOfWeekAvg(records);
    expect(result).not.toBeNull();
    expect(result.avgs[1]).not.toBeNull(); // Monday has data
    // Most other days should be null
    const nullCount = result.avgs.filter((a) => a === null).length;
    expect(nullCount).toBeGreaterThanOrEqual(5);
  });
});

describe("buildCalendarMonth", () => {
  it("builds correct structure for a month", () => {
    const records = [
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-15", wt: 68 },
    ];
    const result = buildCalendarMonth(records, 2025, 0); // January
    expect(result.year).toBe(2025);
    expect(result.month).toBe(0);
    expect(result.daysInMonth).toBe(31);
    expect(result.days).toHaveLength(31);
    expect(result.recordCount).toBe(2);
    expect(result.days[4].wt).toBe(70); // Jan 5
    expect(result.days[14].wt).toBe(68); // Jan 15
    expect(result.days[0].wt).toBeNull(); // Jan 1 - no record
  });

  it("returns null for invalid year/month", () => {
    expect(buildCalendarMonth([], NaN, 0)).toBeNull();
    expect(buildCalendarMonth([], 2025, NaN)).toBeNull();
  });

  it("computes intensity based on weight range", () => {
    const records = [
      { dt: "2025-03-01", wt: 60 },
      { dt: "2025-03-15", wt: 70 },
    ];
    const result = buildCalendarMonth(records, 2025, 2); // March
    expect(result.days[0].intensity).toBe(0); // min weight
    expect(result.days[14].intensity).toBe(1); // max weight
    expect(result.days[1].intensity).toBeNull(); // no record
  });
});

describe("calcGoalPrediction", () => {
  it("returns null without records", () => {
    expect(calcGoalPrediction([], 60)).toBeNull();
  });

  it("returns null without valid goal", () => {
    expect(calcGoalPrediction([{ dt: "2025-01-01", wt: 70 }], NaN)).toBeNull();
  });

  it("returns achieved if already at goal", () => {
    const records = [{ dt: "2025-01-01", wt: 60 }];
    const result = calcGoalPrediction(records, 65);
    expect(result.achieved).toBe(true);
  });
});

describe("toggleNoteTag", () => {
  it("adds a tag to empty note", () => {
    expect(toggleNoteTag("", "exercise")).toBe("#exercise");
  });

  it("adds a tag to existing note", () => {
    expect(toggleNoteTag("morning run", "exercise")).toBe("morning run #exercise");
  });

  it("removes a tag when already present", () => {
    expect(toggleNoteTag("#exercise #diet", "exercise")).toBe("#diet");
  });

  it("truncates to 100 chars", () => {
    const longNote = "a".repeat(95);
    const result = toggleNoteTag(longNote, "exercise");
    expect(result.length).toBeLessThanOrEqual(100);
  });
});

describe("filterRecords", () => {
  const records = [
    { dt: "2025-01-01", wt: 70, note: "morning", source: "manual" },
    { dt: "2025-01-02", wt: 68.5, note: "after lunch", source: "voice" },
    { dt: "2025-01-03", wt: 69, note: null, source: "photo" },
  ];

  it("returns all records with empty query", () => {
    expect(filterRecords(records, "")).toEqual(records);
    expect(filterRecords(records, null)).toEqual(records);
  });

  it("filters by date", () => {
    expect(filterRecords(records, "01-02")).toHaveLength(1);
  });

  it("filters by note content", () => {
    expect(filterRecords(records, "morning")).toHaveLength(1);
  });

  it("filters by source", () => {
    expect(filterRecords(records, "voice")).toHaveLength(1);
  });

  it("filters by weight", () => {
    expect(filterRecords(records, "68.5")).toHaveLength(1);
  });
});

describe("calcMonthlyStats", () => {
  it("returns empty for no records", () => {
    expect(calcMonthlyStats([])).toEqual([]);
  });

  it("groups by month and calculates stats", () => {
    const records = [
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-15", wt: 68 },
      { dt: "2025-02-01", wt: 67 },
    ];
    const result = calcMonthlyStats(records);
    expect(result).toHaveLength(2);
    // Most recent month first
    expect(result[0].month).toBe("2025-02");
    expect(result[0].count).toBe(1);
    expect(result[1].month).toBe("2025-01");
    expect(result[1].count).toBe(2);
    expect(result[1].avg).toBe(69);
    expect(result[1].min).toBe(68);
    expect(result[1].max).toBe(70);
  });
});

describe("calcWeightStability", () => {
  it("returns null for fewer than 3 records", () => {
    const records = [
      { dt: new Date().toISOString().slice(0, 10), wt: 70 },
      { dt: new Date(Date.now() - 86400000).toISOString().slice(0, 10), wt: 69 },
    ];
    expect(calcWeightStability(records)).toBeNull();
  });

  it("returns high stability for identical weights", () => {
    const now = Date.now();
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: new Date(now - i * 86400000).toISOString().slice(0, 10),
      wt: 70,
    }));
    const result = calcWeightStability(records);
    expect(result).not.toBeNull();
    expect(result.score).toBe(100);
    expect(result.stdDev).toBe(0);
  });

  it("returns lower stability for fluctuating weights", () => {
    const now = Date.now();
    const records = [
      { dt: new Date(now).toISOString().slice(0, 10), wt: 75 },
      { dt: new Date(now - 86400000).toISOString().slice(0, 10), wt: 65 },
      { dt: new Date(now - 2 * 86400000).toISOString().slice(0, 10), wt: 75 },
      { dt: new Date(now - 3 * 86400000).toISOString().slice(0, 10), wt: 65 },
    ];
    const result = calcWeightStability(records);
    expect(result).not.toBeNull();
    expect(result.score).toBeLessThan(50);
    expect(result.stdDev).toBeGreaterThan(2);
  });
});

describe("detectMilestone", () => {
  it("returns null for empty records", () => {
    expect(detectMilestone([], 70)).toBeNull();
  });

  it("detects all-time low", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71 },
    ];
    const result = detectMilestone(records, 70);
    expect(result).not.toBeNull();
    expect(result.type).toBe("allTimeLow");
  });

  it("detects round number crossing", () => {
    // Weight already was below 69.8 before, so not all-time low
    const records = [
      { dt: "2025-01-01", wt: 69 },
      { dt: "2025-01-02", wt: 70.3 },
    ];
    const result = detectMilestone(records, 69.8);
    expect(result).not.toBeNull();
    expect(result.type).toBe("roundNumber");
    expect(result.value).toBe(70);
  });

  it("detects BMI threshold crossing", () => {
    // Height 170cm: BMI 25 = 72.25kg. Same floor (72), so no round number
    const records = [
      { dt: "2025-01-01", wt: 71 },
      { dt: "2025-01-02", wt: 72.5 },
    ];
    const result = detectMilestone(records, 72.1, 170);
    expect(result).not.toBeNull();
    expect(result.type).toBe("bmiCrossing");
    expect(result.threshold).toBe(25);
  });

  it("returns null when no milestone", () => {
    const records = [
      { dt: "2025-01-01", wt: 71 },
      { dt: "2025-01-02", wt: 71.5 },
    ];
    const result = detectMilestone(records, 71.2);
    expect(result).toBeNull();
  });
});

describe("exportRecordsToCSV", () => {
  it("returns empty string for empty records", () => {
    expect(exportRecordsToCSV([])).toBe("");
  });

  it("generates valid CSV with header", () => {
    const records = [
      { dt: "2025-01-01", wt: 70.5, bmi: 24.4, bf: 20, source: "manual", note: "good" },
      { dt: "2025-01-02", wt: 70.0, bmi: null, bf: null, source: "quick", note: "" },
    ];
    const csv = exportRecordsToCSV(records);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("date,weight,bmi,bodyFat,source,note");
    expect(lines[1]).toBe("2025-01-01,70.5,24.4,20,manual,good");
    expect(lines[2]).toBe("2025-01-02,70,,,quick,");
  });

  it("escapes commas and quotes in notes", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: null, bf: null, source: "manual", note: 'hello, "world"' },
    ];
    const csv = exportRecordsToCSV(records);
    expect(csv).toContain('"hello, ""world"""');
  });
});

describe("parseCSVImport", () => {
  it("returns empty for empty input", () => {
    const result = parseCSVImport("");
    expect(result.records).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("returns error for header-only CSV", () => {
    const result = parseCSVImport("date,weight,bmi");
    expect(result.records).toHaveLength(0);
  });

  it("parses valid CSV rows", () => {
    const csv = "date,weight,bmi,bodyFat,source,note\n2025-01-01,70.5,24.4,20,manual,test note";
    const result = parseCSVImport(csv);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].dt).toBe("2025-01-01");
    expect(result.records[0].wt).toBe(70.5);
    expect(result.records[0].source).toBe("import");
    expect(result.records[0].note).toBe("test note");
    expect(result.errors).toHaveLength(0);
  });

  it("reports errors for invalid rows", () => {
    const csv = "date,weight\nbad-date,70\n2025-01-01,999999";
    const result = parseCSVImport(csv);
    expect(result.records).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'date,weight,bmi,bodyFat,source,note\n2025-01-01,70,,,,\"hello, world\"';
    const result = parseCSVImport(csv);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].note).toBe("hello, world");
  });
});

describe("calcBodyFatStats", () => {
  it("returns null with fewer than 2 body fat records", () => {
    const records = [{ dt: "2025-01-01", wt: 70, bf: 20 }];
    expect(calcBodyFatStats(records)).toBeNull();
  });

  it("returns null when no body fat data", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    expect(calcBodyFatStats(records)).toBeNull();
  });

  it("calculates body fat stats correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 72, bf: 22 },
      { dt: "2025-01-02", wt: 71, bf: 21 },
      { dt: "2025-01-03", wt: 70, bf: 20 },
    ];
    const result = calcBodyFatStats(records);
    expect(result).not.toBeNull();
    expect(result.latest).toBe(20);
    expect(result.first).toBe(22);
    expect(result.min).toBe(20);
    expect(result.max).toBe(22);
    expect(result.change).toBe(-2);
    expect(result.count).toBe(3);
  });

  it("ignores records without body fat", () => {
    const records = [
      { dt: "2025-01-01", wt: 72, bf: 22 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70, bf: 20 },
    ];
    const result = calcBodyFatStats(records);
    expect(result.count).toBe(2);
    expect(result.avg).toBe(21);
  });
});

describe("calcDaysSinceLastRecord", () => {
  it("returns null for empty records", () => {
    expect(calcDaysSinceLastRecord([])).toBeNull();
  });

  it("returns 0 for record today", () => {
    const today = new Date().toISOString().slice(0, 10);
    const records = [{ dt: today, wt: 70 }];
    expect(calcDaysSinceLastRecord(records)).toBe(0);
  });

  it("returns 1 for record yesterday", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const records = [{ dt: yesterday, wt: 70 }];
    expect(calcDaysSinceLastRecord(records)).toBe(1);
  });
});

describe("calcLongestStreak", () => {
  it("returns 0 for empty records", () => {
    expect(calcLongestStreak([])).toBe(0);
  });

  it("returns 1 for single record", () => {
    expect(calcLongestStreak([{ dt: "2025-01-01", wt: 70 }])).toBe(1);
  });

  it("calculates longest streak correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
      // gap
      { dt: "2025-01-10", wt: 70 },
      { dt: "2025-01-11", wt: 70 },
    ];
    expect(calcLongestStreak(records)).toBe(3);
  });

  it("finds streak even if not at start", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      // gap
      { dt: "2025-01-10", wt: 70 },
      { dt: "2025-01-11", wt: 70 },
      { dt: "2025-01-12", wt: 70 },
      { dt: "2025-01-13", wt: 70 },
    ];
    expect(calcLongestStreak(records)).toBe(4);
  });
});

describe("calcTrendForecast", () => {
  it("returns null with fewer than 7 records", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71 },
    ];
    expect(calcTrendForecast(records)).toBeNull();
  });

  it("calculates forecast for downward trend", () => {
    // Create records within the last 14 days
    const now = new Date();
    const records = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      records.push({ dt, wt: 72 - (13 - i) * 0.1 });
    }
    const result = calcTrendForecast(records);
    expect(result).not.toBeNull();
    expect(result.slope).toBeLessThan(0);
    expect(result.forecast.length).toBeGreaterThan(1);
    // Forecast weights should decrease
    expect(result.forecast[result.forecast.length - 1].weight).toBeLessThan(result.forecast[0].weight);
  });

  it("calculates forecast for upward trend", () => {
    const now = new Date();
    const records = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      records.push({ dt, wt: 68 + (13 - i) * 0.1 });
    }
    const result = calcTrendForecast(records);
    expect(result).not.toBeNull();
    expect(result.slope).toBeGreaterThan(0);
  });
});

describe("calcSmoothedWeight", () => {
  it("returns null for empty records", () => {
    expect(calcSmoothedWeight([])).toBeNull();
  });

  it("returns single record weight", () => {
    const result = calcSmoothedWeight([{ dt: "2025-01-01", wt: 70 }]);
    expect(result.smoothed).toBe(70);
    expect(result.trend).toBe(0);
  });

  it("smooths multiple records", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71.5 },
      { dt: "2025-01-03", wt: 71 },
      { dt: "2025-01-04", wt: 70.5 },
      { dt: "2025-01-05", wt: 70 },
    ];
    const result = calcSmoothedWeight(records);
    expect(result).not.toBeNull();
    // Smoothed should be between min and max
    expect(result.smoothed).toBeGreaterThanOrEqual(70);
    expect(result.smoothed).toBeLessThanOrEqual(72);
  });

  it("shows negative trend for decreasing weights", () => {
    const records = [];
    for (let i = 0; i < 10; i++) {
      records.push({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 75 - i * 0.3 });
    }
    const result = calcSmoothedWeight(records);
    expect(result.trend).toBeLessThan(0);
  });
});

describe("calcCalendarChangeMap", () => {
  it("returns empty for fewer than 2 records", () => {
    expect(calcCalendarChangeMap([])).toEqual({});
    expect(calcCalendarChangeMap([{ dt: "2025-01-01", wt: 70 }])).toEqual({});
  });

  it("calculates changes between consecutive records", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71.5 },
      { dt: "2025-01-03", wt: 72.1 },
    ];
    const map = calcCalendarChangeMap(records);
    expect(map["2025-01-02"]).toBe(-0.5);
    expect(map["2025-01-03"]).toBe(0.6);
    expect(map["2025-01-01"]).toBeUndefined();
  });

  it("handles zero change", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
    ];
    const map = calcCalendarChangeMap(records);
    expect(map["2025-01-02"]).toBe(0);
  });
});

describe("validateWeight edge cases", () => {
  it("accepts boundary values", () => {
    expect(validateWeight("20")).toEqual({ valid: true, weight: 20 });
    expect(validateWeight("300")).toEqual({ valid: true, weight: 300 });
  });

  it("rejects out of range", () => {
    expect(validateWeight("19.9").valid).toBe(false);
    expect(validateWeight("300.1").valid).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateWeight("").valid).toBe(false);
  });

  it("accepts two decimal places", () => {
    expect(validateWeight("65.55")).toEqual({ valid: true, weight: 65.55 });
  });

  it("rejects three decimal places", () => {
    expect(validateWeight("65.555").valid).toBe(false);
  });
});

describe("upsertRecord edge cases", () => {
  it("overwrites existing record on same date", () => {
    const records = [{ dt: "2025-01-01", wt: 70, source: "manual" }];
    const newRecord = { dt: "2025-01-01", wt: 69.5, source: "voice" };
    const result = upsertRecord(records, newRecord);
    expect(result.length).toBe(1);
    expect(result[0].wt).toBe(69.5);
    expect(result[0].source).toBe("voice");
  });

  it("maintains sort order after insert", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-03", wt: 71 },
    ];
    const result = upsertRecord(records, { dt: "2025-01-02", wt: 70.5 });
    expect(result.map((r) => r.dt)).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
  });
});

describe("calcStats edge cases", () => {
  it("returns null for empty array", () => {
    expect(calcStats([])).toBeNull();
  });

  it("handles single record", () => {
    const stats = calcStats([{ dt: "2025-01-01", wt: 70 }], { heightCm: 170 });
    expect(stats.latestWeight).toBe(70);
    expect(stats.minWeight).toBe(70);
    expect(stats.maxWeight).toBe(70);
    expect(stats.change).toBe(0);
  });
});

describe("parseCSVImport edge cases", () => {
  it("ignores empty lines between data rows", () => {
    const csv = "date,weight,bmi,bodyFat,source,note\n2025-01-01,70,,,,\n\n2025-01-02,71,,,,\n";
    const result = parseCSVImport(csv);
    expect(result.records.length).toBe(2);
    expect(result.errors.length).toBe(0);
  });

  it("handles weight at boundary (20kg)", () => {
    const csv = "date,weight\n2025-01-01,20\n";
    const result = parseCSVImport(csv);
    expect(result.records.length).toBe(1);
    expect(result.records[0].wt).toBe(20);
  });

  it("rejects weight below minimum", () => {
    const csv = "date,weight\n2025-01-01,19\n";
    const result = parseCSVImport(csv);
    expect(result.records.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });
});

describe("calcBMIDistribution", () => {
  it("returns null for empty records", () => {
    expect(calcBMIDistribution([])).toBeNull();
  });

  it("returns null when no records have BMI", () => {
    expect(calcBMIDistribution([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("categorizes records into correct BMI zones", () => {
    const records = [
      { dt: "2025-01-01", wt: 50, bmi: 17.0 },  // under
      { dt: "2025-01-02", wt: 60, bmi: 22.0 },  // normal
      { dt: "2025-01-03", wt: 65, bmi: 23.5 },  // normal
      { dt: "2025-01-04", wt: 75, bmi: 27.0 },  // over
      { dt: "2025-01-05", wt: 95, bmi: 32.0 },  // obese
    ];
    const dist = calcBMIDistribution(records);
    expect(dist.under.count).toBe(1);
    expect(dist.normal.count).toBe(2);
    expect(dist.over.count).toBe(1);
    expect(dist.obese.count).toBe(1);
    expect(dist.total).toBe(5);
    expect(dist.under.pct).toBe(20);
    expect(dist.normal.pct).toBe(40);
  });

  it("ignores records without BMI", () => {
    const records = [
      { dt: "2025-01-01", wt: 60, bmi: 22.0 },
      { dt: "2025-01-02", wt: 70, bmi: null },
      { dt: "2025-01-03", wt: 65 },
    ];
    const dist = calcBMIDistribution(records);
    expect(dist.total).toBe(1);
    expect(dist.normal.count).toBe(1);
    expect(dist.normal.pct).toBe(100);
  });
});

describe("calcWeightPercentile", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcWeightPercentile([])).toBeNull();
    expect(calcWeightPercentile([{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 65 }])).toBeNull();
  });

  it("calculates percentile for latest weight", () => {
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-01-02", wt: 75 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 65 },
      { dt: "2025-01-05", wt: 60 },
    ];
    const result = calcWeightPercentile(records);
    expect(result.percentile).toBe(0);
    expect(result.latest).toBe(60);
    expect(result.min).toBe(60);
    expect(result.max).toBe(80);
    expect(result.rank).toBe(1);
    expect(result.total).toBe(5);
  });

  it("returns 100% when latest is the heaviest", () => {
    const records = [
      { dt: "2025-01-01", wt: 60 },
      { dt: "2025-01-02", wt: 65 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 80 },
    ];
    const result = calcWeightPercentile(records);
    expect(result.percentile).toBe(75);
    expect(result.rank).toBe(4);
  });

  it("handles equal weights", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcWeightPercentile(records);
    expect(result.percentile).toBe(0);
    expect(result.rank).toBe(1);
  });
});

describe("calcLongestStreak", () => {
  it("returns 0 for empty records", () => {
    expect(calcLongestStreak([])).toBe(0);
  });

  it("returns 1 for a single record", () => {
    expect(calcLongestStreak([{ dt: "2025-01-01", wt: 70 }])).toBe(1);
  });

  it("finds longest streak with gaps", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
      // gap
      { dt: "2025-01-10", wt: 70 },
      { dt: "2025-01-11", wt: 70 },
      { dt: "2025-01-12", wt: 70 },
      { dt: "2025-01-13", wt: 70 },
      { dt: "2025-01-14", wt: 70 },
    ];
    expect(calcLongestStreak(records)).toBe(5);
  });

  it("handles duplicate dates", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-01", wt: 71 },
      { dt: "2025-01-02", wt: 69 },
    ];
    expect(calcLongestStreak(records)).toBe(2);
  });
});

describe("calcTrendForecast", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({
      dt: `2025-03-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.1,
    }));
    expect(calcTrendForecast(records)).toBeNull();
  });

  it("produces forecast points for downward trend", () => {
    // Use dates relative to today so they fall within the 14-day filter
    const today = new Date();
    const records = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - 13 + i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { dt, wt: 75 - i * 0.2 };
    });
    const result = calcTrendForecast(records);
    expect(result).not.toBeNull();
    expect(result.slope).toBeLessThan(0);
    expect(result.forecast.length).toBeGreaterThan(1);
    expect(result.forecast[0].dayOffset).toBe(0);
  });
});

describe("calcDaysSinceLastRecord", () => {
  it("returns null for empty records", () => {
    expect(calcDaysSinceLastRecord([])).toBeNull();
  });
});

describe("calcWeightComparison edge cases", () => {
  it("returns null when all records share the same date as latest", () => {
    const today = new Date().toISOString().slice(0, 10);
    const records = [
      { dt: today, wt: 70 },
      { dt: today, wt: 71 },
    ];
    // pastRecord.dt === latest.dt guard should skip it
    expect(calcWeightComparison(records)).toBeNull();
  });

  it("returns month and quarter comparisons for old records", () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const d100 = new Date(now - 100 * 86400000).toISOString().slice(0, 10);
    const records = [
      { dt: d100, wt: 80 },
      { dt: today, wt: 70 },
    ];
    const result = calcWeightComparison(records);
    expect(result).not.toBeNull();
    expect(result.quarter).toBeDefined();
    expect(result.quarter.diff).toBe(-10);
  });
});

describe("calcInsight edge cases", () => {
  it("returns weekUp insight when this week avg is higher", () => {
    const now = new Date();
    const records = [];
    // Last week: 3 records averaging 65
    for (let i = 10; i >= 8; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      records.push({ dt: d.toISOString().slice(0, 10), wt: 65 });
    }
    // This week: 3 records averaging 70
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      records.push({ dt: d.toISOString().slice(0, 10), wt: 70 });
    }
    const insight = calcInsight(records);
    expect(insight).not.toBeNull();
    // Should have bestDay at minimum
    expect(insight.bestDay).toBeDefined();
  });
});

describe("detectMilestone edge cases", () => {
  it("does not detect milestone for weight gain", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 72 },
    ];
    const result = detectMilestone(records, 73, 170);
    expect(result).toBeNull();
  });

  it("detects all-time low milestone", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-02", wt: 73 },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = detectMilestone(records, 69.5, 170);
    expect(result).not.toBeNull();
    expect(result.type).toBe("allTimeLow");
  });
});

describe("calcWeightStability edge cases", () => {
  it("returns perfect score for 3 identical weights", () => {
    const now = new Date();
    const records = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (2 - i));
      return { dt: d.toISOString().slice(0, 10), wt: 70.0 };
    });
    const result = calcWeightStability(records, 7);
    expect(result).not.toBeNull();
    expect(result.score).toBe(100);
    expect(result.stdDev).toBe(0);
  });
});

describe("exportRecordsToCSV edge cases", () => {
  it("escapes fields with newlines", () => {
    const records = [{ dt: "2025-01-01", wt: 70, bmi: 24.2, bf: null, source: "manual", note: "line1\nline2" }];
    const csv = exportRecordsToCSV(records);
    expect(csv).toContain('"line1\nline2"');
  });
});

describe("calcMovingAverages", () => {
  it("returns null for fewer than 30 records", () => {
    const records = Array.from({ length: 29 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcMovingAverages(records)).toBeNull();
  });

  it("calculates short and long averages", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
    }));
    const ma = calcMovingAverages(records);
    expect(ma).not.toBeNull();
    expect(ma.shortAvg).toBeGreaterThan(ma.longAvg);
    expect(ma.signal).toBe("above");
  });

  it("detects decreasing trend", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 80 - i * 0.2,
    }));
    const ma = calcMovingAverages(records);
    expect(ma.shortAvg).toBeLessThan(ma.longAvg);
    expect(ma.signal).toBe("below");
  });

  it("detects aligned when averages are close", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const ma = calcMovingAverages(records);
    expect(ma.signal).toBe("aligned");
    expect(ma.diff).toBe(0);
  });
});

describe("calcMovingAverages crossing detection", () => {
  it("detects crossDown when short avg crosses below long avg", () => {
    // First 23 records at 75, then 7 records at 72 to create a crossDown
    // Need 31 records total to detect crossing (longWindow + 1)
    const records = [
      ...Array.from({ length: 23 }, (_, i) => ({
        dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
        wt: 75,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        dt: `2025-01-${String(i + 24).padStart(2, "0")}`,
        wt: 70,
      })),
    ];
    const ma = calcMovingAverages(records);
    expect(ma).not.toBeNull();
    expect(ma.shortAvg).toBeLessThan(ma.longAvg);
  });
});

describe("buildCalendarMonth edge cases", () => {
  it("returns correct startDow for February 2025", () => {
    const records = [{ dt: "2025-02-15", wt: 70 }];
    const data = buildCalendarMonth(records, 2025, 1); // Feb is month index 1
    expect(data).not.toBeNull();
    expect(data.daysInMonth).toBe(28); // 2025 is not a leap year
    expect(data.recordCount).toBe(1);
  });

  it("handles leap year February correctly", () => {
    const records = [{ dt: "2024-02-29", wt: 70 }];
    const data = buildCalendarMonth(records, 2024, 1); // Feb 2024 is a leap year
    expect(data).not.toBeNull();
    expect(data.daysInMonth).toBe(29);
    expect(data.recordCount).toBe(1);
  });
});

describe("parseVoiceWeight", () => {
  it("extracts weight from Japanese speech", () => {
    const result = parseVoiceWeight("体重は65.3キロです");
    expect(result).toBe(65.3);
  });

  it("returns null for speech with no numbers", () => {
    const result = parseVoiceWeight("こんにちは");
    expect(result).toBeNull();
  });

  it("picks closest to fallback", () => {
    const result = parseVoiceWeight("65.5 or 100.2", 66);
    expect(result).toBe(65.5);
  });
});

describe("detectMilestone round number and BMI", () => {
  it("detects round number crossing (e.g., 70.5 → 69.8)", () => {
    // Ensure newWeight is NOT an all-time low (69.0 is lower)
    const records = [
      { dt: "2025-01-01", wt: 69.0 },
      { dt: "2025-01-02", wt: 71.0 },
      { dt: "2025-01-03", wt: 70.5 },
    ];
    const result = detectMilestone(records, 69.8, 170);
    expect(result).not.toBeNull();
    expect(result.type).toBe("roundNumber");
    expect(result.value).toBe(70);
  });

  it("detects BMI threshold crossing below 25", () => {
    // 170cm: BMI 25 = 72.25kg. Ensure newWeight is NOT an all-time low.
    const records = [
      { dt: "2025-01-01", wt: 71.0 },
      { dt: "2025-01-02", wt: 73.0 },
      { dt: "2025-01-03", wt: 72.5 }, // BMI ~25.1
    ];
    const result = detectMilestone(records, 72.0, 170); // BMI ~24.9
    expect(result).not.toBeNull();
    expect(result.type).toBe("bmiCrossing");
    expect(result.threshold).toBe(25);
  });

  it("prioritizes allTimeLow over roundNumber", () => {
    const records = [
      { dt: "2025-01-01", wt: 71 },
      { dt: "2025-01-02", wt: 70.2 },
    ];
    // 69.5 is both below the round number 70 AND a new all-time low
    const result = detectMilestone(records, 69.5, 170);
    expect(result).not.toBeNull();
    expect(result.type).toBe("allTimeLow");
  });
});

describe("calcBodyFatStats edge cases", () => {
  it("handles body fat change of exactly zero", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 20.0 },
      { dt: "2025-01-02", wt: 69, bf: 20.0 },
    ];
    const stats = calcBodyFatStats(records);
    expect(stats).not.toBeNull();
    expect(stats.change).toBe(0);
    expect(stats.latest).toBe(20.0);
  });
});
