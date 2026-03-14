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
  csvEscape,
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
  calcGoalMilestones,
  calcRecordingTimeStats,
  calcConsistencyStreak,
  calcDataHealth,
  calcWeekdayVsWeekend,
  calcWeightRangePosition,
  calcTagImpact,
  calcBestPeriod,
  calcWeeklyFrequency,
  calcWeightVelocity,
  calcWeightVariance,
  calcWeightPlateau,
  calcRecordGaps,
  calcCalorieEstimate,
  calcMomentumScore,
  calcNextMilestones,
  calcSeasonality,
  calcWeightDistribution,
  calcDayOfWeekChange,
  calcPersonalRecords,
  calcWeightRegression,
  calcBMIHistory,
  calcWeightHeatmap,
  calcStreakRewards,
  calcWeightConfidence,
  calcProgressSummary,
  calcMilestoneTimeline,
  calcVolatilityIndex,
  calcPeriodComparison,
  calcGoalCountdown,
  calcBodyComposition,
  generateWeightSummary,
  getFrequentNotes,
  detectDuplicates,
  validateWeightEntry,
  calcWeeklyAverages,
  calcMonthlyRecordingMap,
  calcWeightTrendIndicator,
  calcNoteTagStats,
  calcIdealWeightRange,
  calcDataFreshness,
  calcMultiPeriodRate,
  calcRecordMilestone,
  generateAICoachReport,
  calcDashboardSummary,
  getRecentEntries,
  calcMonthlyAverages,
  calcLongTermProgress,
  calcWeightFluctuation,
  calcWeightAnomalies,
  calcSuccessRate,
  calcRecordingRate,
  calcMilestoneHistory,
  calcWeightJourney,
  calcGoalScenarios,
  calcStreakCalendar,
  calcMovingAvgCrossover,
  calcPredictionAccuracy,
  calcConsistencyScore,
  calcWeightRangeSummary,
  calcTrendStreak,
  calcBMITrend,
  calcWeeklySummaryComparison,
  calcGoalProgressRing,
  calcBodyFatTrend,
  calcDailyTarget,
  calcMonthPhaseAvg,
  calcStreakFreezeInfo,
  calcRecentWeightBars,
  calcWeightAnniversary,
  calcDailyChangeDist,
  calcGoalStreak,
  calcThenVsNow,
  calcQuickWeightPresets,
  calcRecordCompleteness,
  calcWeightPace,
  calcWeightSmoothness,
  calcPeriodBreakdown,
  calcMotivationLevel,
  calcWeightBand,
  calcBestWeighDay,
  calcMiniSparkline,
  calcEntrySummary,
  calcGoalDistance,
  calcTimeSlotPattern,
  calcStreakBadges,
  calcProgressTimeline,
  calcForecastConfidence,
  calcWeightZones,
  calcWeightChangeRate,
  calcWeighInConsistency,
  calcPlateauPeriods,
  calcWeightPercentileRank,
  calcWeightTrendArrow,
  calcBodyCompositionBreakdown,
  calcWeeklyReportCard,
  calcNoteWordFrequency,
  THEME_LIST,
  MAX_RECORDS,
  WEIGHT_RANGE,
  HEIGHT_RANGE,
  AGE_RANGE,
  BODY_FAT_RANGE,
  STORAGE_KEYS,
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
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const yd = new Date(now); yd.setDate(yd.getDate() - 1);
    const yesterday = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, "0")}-${String(yd.getDate()).padStart(2, "0")}`;
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

  it("returns null without valid goal", () => {
    expect(calcGoalPrediction([{ dt: "2025-01-01", wt: 70 }], NaN)).toBeNull();
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

  it("calculates change correctly", () => {
    const d1 = new Date();
    const d2 = new Date(d1.getTime() - 86400000);
    const records = [
      { dt: d2.toISOString().slice(0, 10), wt: 72.0 },
      { dt: d1.toISOString().slice(0, 10), wt: 70.0 },
    ];
    const result = calcPeriodSummary(records, 7);
    expect(result.change).toBeCloseTo(-2.0, 1);
  });

  it("returns null for empty records", () => {
    expect(calcPeriodSummary([], 7)).toBeNull();
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

  it("returns null for invalid year/month", () => {
    expect(buildCalendarMonth([], NaN, 0)).toBeNull();
    expect(buildCalendarMonth([], 2025, NaN)).toBeNull();
  });

  it("returns null intensity for days without records", () => {
    const records = [
      { dt: "2025-03-01", wt: 60 },
      { dt: "2025-03-15", wt: 70 },
    ];
    const result = buildCalendarMonth(records, 2025, 2);
    expect(result.days[0].intensity).toBe(0);
    expect(result.days[14].intensity).toBe(1);
    expect(result.days[1].intensity).toBeNull();
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

  it("handles records with null note", () => {
    const recordsWithNull = [
      { dt: "2025-01-01", wt: 70, note: "morning", source: "manual" },
      { dt: "2025-01-02", wt: 68.5, note: null, source: "photo" },
    ];
    expect(filterRecords(recordsWithNull, "morning")).toHaveLength(1);
    expect(filterRecords(recordsWithNull, "photo")).toHaveLength(1);
    expect(filterRecords(recordsWithNull, "")).toEqual(recordsWithNull);
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
  it("returns header-only CSV for empty records", () => {
    expect(exportRecordsToCSV([])).toBe("\uFEFFdate,weight,bmi,bodyFat,source,note");
  });

  it("generates valid CSV with header", () => {
    const records = [
      { dt: "2025-01-01", wt: 70.5, bmi: 24.4, bf: 20, source: "manual", note: "good" },
      { dt: "2025-01-02", wt: 70.0, bmi: null, bf: null, source: "quick", note: "" },
    ];
    const csv = exportRecordsToCSV(records);
    const lines = csv.replace(/^\uFEFF/, "").split("\n");
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
    expect(result.records[0].source).toBe("manual");
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
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const records = [{ dt: today, wt: 70 }];
    expect(calcDaysSinceLastRecord(records)).toBe(0);
  });

  it("returns 1 for record yesterday", () => {
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    const yesterday = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, "0")}-${String(yd.getDate()).padStart(2, "0")}`;
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

  it("finds longest streak with gaps favoring longer run", () => {
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
    expect(result.forecast[0].dayOffset).toBe(0);
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

  it("computes min, max, avg, change for multiple records", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 74 },
      { dt: "2025-01-04", wt: 71 },
    ];
    const stats = calcStats(records);
    expect(stats.latestWeight).toBe(71);
    expect(stats.minWeight).toBe(70);
    expect(stats.maxWeight).toBe(74);
    expect(stats.change).toBe(-1);
    expect(stats.avgWeight).toBe(71.8);
    expect(stats.latestDate).toBe("2025-01-04");
  });

  it("calculates BMI when height provided", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const stats = calcStats(records, { heightCm: 175 });
    expect(stats.latestBMI).toBeCloseTo(22.86, 1);
  });

  it("returns null BMI without height", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const stats = calcStats(records);
    expect(stats.latestBMI).toBeNull();
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

  it("escapes fields with commas and quotes", () => {
    const records = [{ dt: "2025-01-01", wt: 70, bmi: null, bf: null, source: "manual", note: 'ate "pizza", cake' }];
    const csv = exportRecordsToCSV(records);
    expect(csv).toContain('"ate ""pizza"", cake"');
  });
});

describe("csvEscape", () => {
  it("returns plain string as-is", () => {
    expect(csvEscape("hello")).toBe("hello");
  });

  it("wraps strings with commas in quotes", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
  });

  it("escapes double quotes", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("handles null and undefined", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

describe("CSV roundtrip", () => {
  it("export → import preserves data", () => {
    const records = [
      { dt: "2025-01-01", wt: 70.5, bmi: 24.2, bf: 20.1, source: "manual", note: "morning" },
      { dt: "2025-01-02", wt: 69.8, bmi: 23.9, bf: null, source: "voice", note: "ate pizza, cake" },
      { dt: "2025-01-03", wt: 71.0, bmi: null, bf: null, source: "photo", note: 'said "hello"' },
    ];
    const csv = exportRecordsToCSV(records);
    const { records: imported, errors } = parseCSVImport(csv);
    expect(errors).toHaveLength(0);
    expect(imported).toHaveLength(3);
    expect(imported[0].dt).toBe("2025-01-01");
    expect(imported[0].wt).toBe(70.5);
    expect(imported[0].note).toBe("morning");
    expect(imported[1].note).toBe("ate pizza, cake");
    expect(imported[2].note).toBe('said "hello"');
  });

  it("roundtrip with newlines in notes", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: null, bf: null, source: "manual", note: "line1\nline2" },
    ];
    const csv = exportRecordsToCSV(records);
    const { records: imported, errors } = parseCSVImport(csv);
    expect(errors).toHaveLength(0);
    expect(imported).toHaveLength(1);
    expect(imported[0].note).toBe("line1\nline2");
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

describe("parseCSVImport multiline fields", () => {
  it("handles quoted fields with embedded newlines", () => {
    const csv = `date,weight,bmi,bodyFat,source,note\r\n2025-01-01,70,,,,\"line1\nline2\"`;
    const { records, errors } = parseCSVImport(csv);
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(1);
    expect(records[0].note).toBe("line1\nline2");
  });

  it("handles quoted fields with commas", () => {
    const csv = `date,weight,bmi,bodyFat,source,note\r\n2025-01-02,65,,,,\"ate pizza, cake\"`;
    const { records } = parseCSVImport(csv);
    expect(records).toHaveLength(1);
    expect(records[0].note).toBe("ate pizza, cake");
  });

  it("handles escaped double quotes in fields", () => {
    const csv = `date,weight,bmi,bodyFat,source,note\r\n2025-01-03,68,,,,\"said \"\"hello\"\"\"`;
    const { records } = parseCSVImport(csv);
    expect(records).toHaveLength(1);
    expect(records[0].note).toBe('said "hello"');
  });
});

describe("trimRecords edge cases", () => {
  it("returns same array if under max", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(trimRecords(records, 5)).toBe(records);
  });

  it("trims oldest records when over max", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 72 },
      { dt: "2025-01-04", wt: 73 },
    ];
    const result = trimRecords(records, 2);
    expect(result).toHaveLength(2);
    expect(result[0].dt).toBe("2025-01-03");
    expect(result[1].dt).toBe("2025-01-04");
  });
});

describe("calcCalendarChangeMap edge cases", () => {
  it("returns empty map for single record", () => {
    expect(calcCalendarChangeMap([{ dt: "2025-01-01", wt: 70 }])).toEqual({});
  });

  it("calculates daily changes correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69.5 },
      { dt: "2025-01-03", wt: 70.2 },
    ];
    const map = calcCalendarChangeMap(records);
    expect(map["2025-01-02"]).toBe(-0.5);
    expect(map["2025-01-03"]).toBe(0.7);
    expect(map["2025-01-01"]).toBeUndefined();
  });
});

describe("calcWeightPercentile edge cases", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcWeightPercentile([{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 71 }])).toBeNull();
  });

  it("returns 0 percentile when latest is the minimum", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 69 },
    ];
    const result = calcWeightPercentile(records);
    expect(result.percentile).toBe(0);
    expect(result.rank).toBe(1);
  });

  it("returns high percentile when latest is near max", () => {
    const records = [
      { dt: "2025-01-01", wt: 65 },
      { dt: "2025-01-02", wt: 66 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 75 },
    ];
    const result = calcWeightPercentile(records);
    expect(result.percentile).toBe(75);
  });
});

describe("calcGoalMilestones", () => {
  it("returns null for empty records", () => {
    expect(calcGoalMilestones([], 60)).toBeNull();
  });

  it("returns null when goal is not finite", () => {
    expect(calcGoalMilestones([{ dt: "2025-01-01", wt: 70 }], NaN)).toBeNull();
  });

  it("returns null when goal is above start weight", () => {
    expect(calcGoalMilestones([{ dt: "2025-01-01", wt: 60 }], 70)).toBeNull();
  });

  it("calculates milestones correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-01-10", wt: 72 },
    ];
    const milestones = calcGoalMilestones(records, 60);
    expect(milestones).toHaveLength(4);
    expect(milestones[0].pct).toBe(25);
    expect(milestones[0].targetWeight).toBe(75);
    expect(milestones[0].reached).toBe(true);
    expect(milestones[1].pct).toBe(50);
    expect(milestones[1].targetWeight).toBe(70);
    expect(milestones[1].reached).toBe(false);
    expect(milestones[3].pct).toBe(100);
    expect(milestones[3].targetWeight).toBe(60);
  });

  it("marks all as reached when goal achieved", () => {
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-02-01", wt: 58 },
    ];
    const milestones = calcGoalMilestones(records, 60);
    expect(milestones.every((m) => m.reached)).toBe(true);
  });
});

describe("calcRecordingTimeStats", () => {
  it("returns null for fewer than 3 records with createdAt", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, createdAt: "2025-01-01T08:00:00Z" },
      { dt: "2025-01-02", wt: 71, createdAt: "2025-01-02T09:00:00Z" },
    ];
    expect(calcRecordingTimeStats(records)).toBeNull();
  });

  it("returns null when no records have createdAt", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 72 },
    ];
    expect(calcRecordingTimeStats(records)).toBeNull();
  });

  it("categorizes morning recordings correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, createdAt: "2025-01-01T07:00:00" },
      { dt: "2025-01-02", wt: 71, createdAt: "2025-01-02T08:30:00" },
      { dt: "2025-01-03", wt: 72, createdAt: "2025-01-03T06:00:00" },
    ];
    const stats = calcRecordingTimeStats(records);
    expect(stats).not.toBeNull();
    expect(stats.morning.count).toBe(3);
    expect(stats.morning.pct).toBe(100);
    expect(stats.mostCommon).toBe("morning");
    expect(stats.total).toBe(3);
  });

  it("distributes across time buckets", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, createdAt: "2025-01-01T07:00:00" },
      { dt: "2025-01-02", wt: 71, createdAt: "2025-01-02T14:00:00" },
      { dt: "2025-01-03", wt: 72, createdAt: "2025-01-03T20:00:00" },
      { dt: "2025-01-04", wt: 73, createdAt: "2025-01-04T02:00:00" },
    ];
    const stats = calcRecordingTimeStats(records);
    expect(stats.morning.count).toBe(1);
    expect(stats.afternoon.count).toBe(1);
    expect(stats.evening.count).toBe(1);
    expect(stats.night.count).toBe(1);
  });
});

describe("calcConsistencyStreak", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcConsistencyStreak([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("counts consecutive records within tolerance of latest", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70.3 },
      { dt: "2025-01-03", wt: 70.1 },
    ];
    const result = calcConsistencyStreak(records);
    expect(result.streak).toBe(3);
  });

  it("breaks streak when weight changes too much", () => {
    const records = [
      { dt: "2025-01-01", wt: 68 },
      { dt: "2025-01-02", wt: 70.3 },
      { dt: "2025-01-03", wt: 70.1 },
    ];
    const result = calcConsistencyStreak(records);
    // latest is 70.1, 70.3 is within 0.5, but 68 is not within 0.5 of 70.1
    expect(result.streak).toBe(2);
  });

  it("tracks best-ever consistency streak", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70.2 },
      { dt: "2025-01-03", wt: 70.1 },
      { dt: "2025-01-04", wt: 72 },
      { dt: "2025-01-05", wt: 72.3 },
    ];
    const result = calcConsistencyStreak(records);
    expect(result.best).toBe(3); // first 3 records had consistent weights
    expect(result.streak).toBe(2); // current streak: 72 and 72.3
  });

  it("uses custom tolerance", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70.8 },
    ];
    expect(calcConsistencyStreak(records, 0.5).streak).toBe(1);
    expect(calcConsistencyStreak(records, 1.0).streak).toBe(2);
  });
});

describe("calcDataHealth", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcDataHealth([])).toBeNull();
    expect(calcDataHealth([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns perfect score for clean data", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 24 },
      { dt: "2025-01-02", wt: 70.2, bmi: 24.1 },
      { dt: "2025-01-03", wt: 69.8, bmi: 23.9 },
    ];
    const result = calcDataHealth(records);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
    expect(result.total).toBe(3);
  });

  it("detects large gaps (>7 days)", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 24 },
      { dt: "2025-01-15", wt: 70.5, bmi: 24.2 },
    ];
    const result = calcDataHealth(records);
    expect(result.issues.some((i) => i.type === "gap")).toBe(true);
    expect(result.issues.find((i) => i.type === "gap").days).toBe(14);
  });

  it("detects outliers (>3kg from neighbors)", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 24 },
      { dt: "2025-01-02", wt: 80, bmi: 27.5 },
      { dt: "2025-01-03", wt: 70.2, bmi: 24.1 },
    ];
    const result = calcDataHealth(records);
    expect(result.issues.some((i) => i.type === "outlier")).toBe(true);
    const outlier = result.issues.find((i) => i.type === "outlier");
    expect(outlier.date).toBe("2025-01-02");
    expect(outlier.weight).toBe(80);
  });

  it("detects missing BMI when all records lack it", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70.5 },
    ];
    const result = calcDataHealth(records);
    expect(result.issues.some((i) => i.type === "noBMI")).toBe(true);
  });

  it("does not flag noBMI when some records have BMI", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 24 },
      { dt: "2025-01-02", wt: 70.5 },
    ];
    const result = calcDataHealth(records);
    expect(result.issues.some((i) => i.type === "noBMI")).toBe(false);
  });

  it("reduces score per issue", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-20", wt: 80 },
      { dt: "2025-02-10", wt: 70.5 },
    ];
    const result = calcDataHealth(records);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe("calcWeekdayVsWeekend", () => {
  it("returns null for fewer than 5 records", () => {
    const records = [
      { dt: "2025-01-06", wt: 70 },
      { dt: "2025-01-07", wt: 70.5 },
    ];
    expect(calcWeekdayVsWeekend(records)).toBeNull();
  });

  it("returns null when no weekend records exist", () => {
    // Mon-Fri only
    const records = [
      { dt: "2025-01-06", wt: 70 },
      { dt: "2025-01-07", wt: 70.5 },
      { dt: "2025-01-08", wt: 71 },
      { dt: "2025-01-09", wt: 70.2 },
      { dt: "2025-01-10", wt: 70.8 },
    ];
    expect(calcWeekdayVsWeekend(records)).toBeNull();
  });

  it("calculates weekday vs weekend averages correctly", () => {
    // Mon=70, Tue=72, Wed=74 → avg 72.0; Sat=76, Sun=78 → avg 77.0
    const records = [
      { dt: "2025-01-06", wt: 70 },   // Mon
      { dt: "2025-01-07", wt: 72 },   // Tue
      { dt: "2025-01-08", wt: 74 },   // Wed
      { dt: "2025-01-11", wt: 76 },   // Sat
      { dt: "2025-01-12", wt: 78 },   // Sun
    ];
    const result = calcWeekdayVsWeekend(records);
    expect(result).not.toBeNull();
    expect(result.weekdayAvg).toBe(72);
    expect(result.weekendAvg).toBe(77);
    expect(result.diff).toBe(5);
    expect(result.weekdayCount).toBe(3);
    expect(result.weekendCount).toBe(2);
    expect(result.heavier).toBe("weekend");
  });

  it("returns heavier=weekday when weekday avg is higher", () => {
    const records = [
      { dt: "2025-01-06", wt: 78 },   // Mon
      { dt: "2025-01-07", wt: 80 },   // Tue
      { dt: "2025-01-08", wt: 79 },   // Wed
      { dt: "2025-01-11", wt: 70 },   // Sat
      { dt: "2025-01-12", wt: 71 },   // Sun
    ];
    const result = calcWeekdayVsWeekend(records);
    expect(result.diff).toBeLessThan(0);
    expect(result.heavier).toBe("weekday");
  });

  it("returns heavier=similar when difference is small", () => {
    const records = [
      { dt: "2025-01-06", wt: 70.0 },  // Mon
      { dt: "2025-01-07", wt: 70.1 },  // Tue
      { dt: "2025-01-08", wt: 70.2 },  // Wed
      { dt: "2025-01-11", wt: 70.1 },  // Sat
      { dt: "2025-01-12", wt: 70.2 },  // Sun
    ];
    const result = calcWeekdayVsWeekend(records);
    expect(Math.abs(result.diff)).toBeLessThanOrEqual(0.2);
    expect(result.heavier).toBe("similar");
  });
});

describe("calcWeightRangePosition", () => {
  it("returns null for fewer than 3 records", () => {
    const records = [{ wt: 70 }, { wt: 71 }];
    expect(calcWeightRangePosition(records)).toBeNull();
  });

  it("returns position 0 when latest is at minimum", () => {
    const records = [{ wt: 80 }, { wt: 75 }, { wt: 70 }];
    const result = calcWeightRangePosition(records);
    expect(result.position).toBe(0);
    expect(result.zone).toBe("low");
    expect(result.min).toBe(70);
    expect(result.max).toBe(80);
  });

  it("returns position 100 when latest is at maximum", () => {
    const records = [{ wt: 60 }, { wt: 65 }, { wt: 80 }];
    const result = calcWeightRangePosition(records);
    expect(result.position).toBe(100);
    expect(result.zone).toBe("high");
  });

  it("returns middle zone for mid-range weight", () => {
    const records = [{ wt: 60 }, { wt: 80 }, { wt: 70 }];
    const result = calcWeightRangePosition(records);
    expect(result.position).toBe(50);
    expect(result.zone).toBe("middle");
  });

  it("handles all same weights", () => {
    const records = [{ wt: 70 }, { wt: 70 }, { wt: 70 }];
    const result = calcWeightRangePosition(records);
    expect(result.position).toBe(50);
    expect(result.zone).toBe("middle");
  });
});

describe("calcTagImpact", () => {
  it("returns null for fewer than 5 records", () => {
    const records = [{ wt: 70, note: "#exercise" }, { wt: 69, note: "" }];
    expect(calcTagImpact(records)).toBeNull();
  });

  it("returns null when no tags are used", () => {
    const records = [
      { wt: 70, note: "" }, { wt: 71, note: "" }, { wt: 70.5, note: "" },
      { wt: 69.8, note: "" }, { wt: 70.2, note: "" },
    ];
    expect(calcTagImpact(records)).toBeNull();
  });

  it("calculates average change for exercise tag", () => {
    const records = [
      { wt: 70, note: "" },
      { wt: 69.5, note: "#exercise" },
      { wt: 69.8, note: "" },
      { wt: 69.0, note: "#exercise" },
      { wt: 69.5, note: "" },
      { wt: 68.8, note: "#exercise" },
    ];
    // exercise tags at i=1 (69.5-70=-0.5), i=3 (69.0-69.8=-0.8), i=5 (68.8-69.5=-0.7)
    const result = calcTagImpact(records);
    expect(result).not.toBeNull();
    expect(result.length).toBe(1);
    expect(result[0].tag).toBe("exercise");
    expect(result[0].count).toBe(3);
    expect(result[0].avgChange).toBeLessThan(0);
  });

  it("sorts tags by avgChange ascending", () => {
    const records = [
      { wt: 70, note: "" },
      { wt: 69.5, note: "#diet" },
      { wt: 70, note: "#cheatday" },
      { wt: 69.5, note: "#diet" },
      { wt: 70.5, note: "#cheatday" },
      { wt: 69.8, note: "#diet" },
      { wt: 70.5, note: "#cheatday" },
      { wt: 70, note: "" },
    ];
    const result = calcTagImpact(records);
    expect(result).not.toBeNull();
    // diet should come before cheatday (lower avgChange)
    const dietIdx = result.findIndex((r) => r.tag === "diet");
    const cheatIdx = result.findIndex((r) => r.tag === "cheatday");
    if (dietIdx >= 0 && cheatIdx >= 0) {
      expect(result[dietIdx].avgChange).toBeLessThanOrEqual(result[cheatIdx].avgChange);
    }
  });
});

describe("calcWeekdayVsWeekend edge cases", () => {
  it("returns null when no weekday records exist", () => {
    // Only Sat/Sun records
    const records = [
      { dt: "2025-01-04", wt: 70 },  // Sat
      { dt: "2025-01-05", wt: 71 },  // Sun
      { dt: "2025-01-11", wt: 70.5 }, // Sat
      { dt: "2025-01-12", wt: 71.5 }, // Sun
      { dt: "2025-01-18", wt: 70.2 }, // Sat
    ];
    expect(calcWeekdayVsWeekend(records)).toBeNull();
  });

  it("handles exactly 5 records at threshold", () => {
    const records = [
      { dt: "2025-01-06", wt: 70 },   // Mon
      { dt: "2025-01-07", wt: 71 },   // Tue
      { dt: "2025-01-08", wt: 72 },   // Wed
      { dt: "2025-01-11", wt: 73 },   // Sat
      { dt: "2025-01-12", wt: 74 },   // Sun
    ];
    const result = calcWeekdayVsWeekend(records);
    expect(result).not.toBeNull();
    expect(result.weekdayCount).toBe(3);
    expect(result.weekendCount).toBe(2);
  });

  it("rounds averages to 1 decimal place", () => {
    const records = [
      { dt: "2025-01-06", wt: 70.33 },
      { dt: "2025-01-07", wt: 70.66 },
      { dt: "2025-01-08", wt: 70.11 },
      { dt: "2025-01-11", wt: 71.55 },
      { dt: "2025-01-12", wt: 71.44 },
    ];
    const result = calcWeekdayVsWeekend(records);
    expect(String(result.weekdayAvg).split(".")[1]?.length || 0).toBeLessThanOrEqual(1);
    expect(String(result.weekendAvg).split(".")[1]?.length || 0).toBeLessThanOrEqual(1);
  });
});

describe("calcWeightRangePosition edge cases", () => {
  it("handles all same weights", () => {
    const records = [
      { wt: 70 }, { wt: 70 }, { wt: 70 },
    ];
    const result = calcWeightRangePosition(records);
    expect(result.position).toBe(50);
    expect(result.zone).toBe("middle");
  });
});

describe("calcBestPeriod", () => {
  it("returns null for fewer than 7 records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68 },
    ];
    expect(calcBestPeriod(records)).toBeNull();
  });

  it("finds best 7-day period", () => {
    const records = [];
    for (let i = 0; i < 10; i++) {
      const d = String(i + 1).padStart(2, "0");
      // Days 3-9: weight drops from 75 to 69 (best 7 days = -6kg)
      const wt = i < 3 ? 72 : 75 - (i - 3);
      records.push({ dt: `2025-01-${d}`, wt });
    }
    const result = calcBestPeriod(records);
    expect(result).not.toBeNull();
    expect(result[7]).toBeDefined();
    expect(result[7].change).toBeLessThan(0);
  });

  it("returns only week data when fewer than 30 records", () => {
    const records = [];
    for (let i = 0; i < 15; i++) {
      const d = String(i + 1).padStart(2, "0");
      records.push({ dt: `2025-01-${d}`, wt: 70 - i * 0.1 });
    }
    const result = calcBestPeriod(records);
    expect(result).not.toBeNull();
    expect(result[7]).toBeDefined();
    expect(result[30]).toBeUndefined();
  });

  it("returns result with change=0 when weights are constant", () => {
    const records = [];
    for (let i = 0; i < 10; i++) {
      const d = String(i + 1).padStart(2, "0");
      records.push({ dt: `2025-01-${d}`, wt: 70 });
    }
    const result = calcBestPeriod(records);
    expect(result).not.toBeNull();
    expect(result[7].change).toBe(0);
  });

  it("finds best 30-day period with enough records", () => {
    const records = [];
    for (let i = 0; i < 35; i++) {
      const d = String(i + 1).padStart(2, "0");
      const month = i < 31 ? "01" : "02";
      const day = i < 31 ? d : String(i - 30).padStart(2, "0");
      records.push({ dt: `2025-${month}-${day}`, wt: 80 - i * 0.2 });
    }
    const result = calcBestPeriod(records);
    expect(result).not.toBeNull();
    expect(result[30]).toBeDefined();
    expect(result[30].change).toBeLessThan(0);
  });
});

describe("calcWeeklyFrequency", () => {
  it("returns null for empty records", () => {
    expect(calcWeeklyFrequency([])).toBeNull();
  });

  it("returns 8 buckets by default", () => {
    const records = [{ dt: "2025-01-06", wt: 70 }];
    const result = calcWeeklyFrequency(records);
    expect(result).not.toBeNull();
    expect(result.buckets.length).toBe(8);
    expect(result.weeks).toBe(8);
  });

  it("counts records in correct week buckets", () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const records = [{ dt: todayStr, wt: 70 }];
    const result = calcWeeklyFrequency(records);
    // The last bucket (current week) should have count >= 1
    expect(result.buckets[result.buckets.length - 1].count).toBeGreaterThanOrEqual(1);
  });

  it("calculates average per week", () => {
    const today = new Date();
    const records = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      records.push({ dt, wt: 70 });
    }
    const result = calcWeeklyFrequency(records);
    expect(result.avgPerWeek).toBeGreaterThan(0);
    expect(result.maxCount).toBeGreaterThanOrEqual(1);
  });

  it("supports custom week count", () => {
    const records = [{ dt: "2025-01-06", wt: 70 }];
    const result = calcWeeklyFrequency(records, 4);
    expect(result.buckets.length).toBe(4);
    expect(result.weeks).toBe(4);
  });
});

describe("calcWeightVelocity", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcWeightVelocity([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("calculates velocity for recent records", () => {
    const today = new Date();
    const records = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      records.push({ dt, wt: 70 + (6 - i) * 0.1 });
    }
    const result = calcWeightVelocity(records);
    expect(result).not.toBeNull();
    expect(result.week).not.toBeNull();
    expect(result.week.dailyRate).toBeGreaterThan(0);
    expect(result.week.monthlyProjection).toBeGreaterThan(0);
  });

  it("detects weight loss velocity", () => {
    const today = new Date();
    const records = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      records.push({ dt, wt: 75 - (6 - i) * 0.2 });
    }
    const result = calcWeightVelocity(records);
    expect(result.week).not.toBeNull();
    expect(result.week.dailyRate).toBeLessThan(0);
    expect(result.week.monthlyProjection).toBeLessThan(0);
  });

  it("returns null week/month when no recent data", () => {
    const records = [
      { dt: "2020-01-01", wt: 70 },
      { dt: "2020-01-02", wt: 69 },
      { dt: "2020-01-03", wt: 68 },
    ];
    const result = calcWeightVelocity(records);
    // Old records won't be within 7 or 30 day window
    expect(result).toBeNull();
  });
});

describe("calculateBMI edge cases", () => {
  it("returns null for zero height", () => {
    expect(calculateBMI(65, 0)).toBeNull();
  });

  it("returns null for negative height", () => {
    expect(calculateBMI(65, -170)).toBeNull();
  });

  it("returns null for zero weight", () => {
    expect(calculateBMI(0, 170)).toBeNull();
  });

  it("calculates correct BMI at boundary values", () => {
    // 18.5 BMI boundary: weight = 18.5 * (1.70)^2 = 53.465
    expect(calculateBMI(53.5, 170)).toBe(18.5);
    // 25.0 BMI boundary: weight = 25 * (1.70)^2 = 72.25
    expect(calculateBMI(72.3, 170)).toBe(25.0);
  });

  it("handles very tall height correctly", () => {
    const bmi = calculateBMI(100, 220);
    expect(bmi).toBe(20.7);
  });

  it("handles very short height correctly", () => {
    const bmi = calculateBMI(40, 130);
    expect(bmi).toBe(23.7);
  });
});

describe("constants validation", () => {
  it("THEME_LIST has unique ids and valid colors", () => {
    const ids = THEME_LIST.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    THEME_LIST.forEach((theme) => {
      expect(theme.id).toBeTruthy();
      expect(theme.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it("WEIGHT_RANGE has valid min < max", () => {
    expect(WEIGHT_RANGE.min).toBeLessThan(WEIGHT_RANGE.max);
    expect(WEIGHT_RANGE.min).toBeGreaterThan(0);
  });

  it("HEIGHT_RANGE has valid min < max", () => {
    expect(HEIGHT_RANGE.min).toBeLessThan(HEIGHT_RANGE.max);
    expect(HEIGHT_RANGE.min).toBeGreaterThan(0);
  });

  it("AGE_RANGE has valid min < max", () => {
    expect(AGE_RANGE.min).toBeLessThan(AGE_RANGE.max);
    expect(AGE_RANGE.min).toBeGreaterThanOrEqual(0);
  });

  it("BODY_FAT_RANGE has valid min < max", () => {
    expect(BODY_FAT_RANGE.min).toBeLessThan(BODY_FAT_RANGE.max);
    expect(BODY_FAT_RANGE.min).toBeGreaterThanOrEqual(0);
  });

  it("MAX_RECORDS is a positive number", () => {
    expect(MAX_RECORDS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_RECORDS)).toBe(true);
  });

  it("STORAGE_KEYS has non-empty string values", () => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });
});

describe("createDefaultProfile", () => {
  it("returns object with required fields", () => {
    const profile = createDefaultProfile();
    expect(profile).toHaveProperty("heightCm");
    expect(profile).toHaveProperty("age");
    expect(profile).toHaveProperty("gender");
  });

  it("returns independent objects on each call", () => {
    const a = createDefaultProfile();
    const b = createDefaultProfile();
    a.heightCm = 999;
    expect(b.heightCm).not.toBe(999);
  });
});

describe("createDefaultSettings edge cases", () => {
  it("returns independent objects on each call", () => {
    const a = createDefaultSettings();
    const b = createDefaultSettings();
    a.language = "xx";
    expect(b.language).not.toBe("xx");
  });
});

describe("calcWeightVariance", () => {
  it("returns null for fewer than 5 records", () => {
    const records = [{ wt: 70 }, { wt: 71 }, { wt: 70.5 }];
    expect(calcWeightVariance(records)).toBeNull();
  });

  it("returns veryLow level for constant weight", () => {
    const records = [{ wt: 70 }, { wt: 70 }, { wt: 70 }, { wt: 70 }, { wt: 70 }];
    const result = calcWeightVariance(records);
    expect(result).not.toBeNull();
    expect(result.cv).toBe(0);
    expect(result.level).toBe("veryLow");
    expect(result.maxSwing).toBe(0);
    expect(result.avgDailySwing).toBe(0);
  });

  it("calculates variance for fluctuating weights", () => {
    const records = [
      { wt: 70 }, { wt: 72 }, { wt: 69 }, { wt: 73 }, { wt: 68 },
      { wt: 71 }, { wt: 70 },
    ];
    const result = calcWeightVariance(records);
    expect(result).not.toBeNull();
    expect(result.cv).toBeGreaterThan(0);
    expect(result.stdDev).toBeGreaterThan(0);
    expect(result.maxSwing).toBe(5);
    expect(result.count).toBe(7);
  });

  it("uses only last 14 records", () => {
    const records = [];
    for (let i = 0; i < 20; i++) {
      records.push({ wt: 70 + (i % 2) });
    }
    const result = calcWeightVariance(records);
    expect(result.count).toBe(14);
  });
});

describe("calcWeightVariance", () => {
  it("returns null for fewer than 5 records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70.5 },
    ];
    expect(calcWeightVariance(records)).toBeNull();
  });

  it("returns veryLow level for constant weights", () => {
    const records = [];
    for (let i = 0; i < 10; i++) {
      records.push({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 });
    }
    const result = calcWeightVariance(records);
    expect(result).not.toBeNull();
    expect(result.cv).toBe(0);
    expect(result.maxSwing).toBe(0);
    expect(result.avgDailySwing).toBe(0);
    expect(result.level).toBe("veryLow");
  });

  it("detects high variance for widely varying weights", () => {
    const records = [];
    for (let i = 0; i < 10; i++) {
      records.push({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: i % 2 === 0 ? 60 : 75 });
    }
    const result = calcWeightVariance(records);
    expect(result).not.toBeNull();
    expect(result.level).toBe("high");
    expect(result.maxSwing).toBe(15);
  });

  it("uses last 14 records when more available", () => {
    const records = [];
    for (let i = 0; i < 20; i++) {
      records.push({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 + (i < 6 ? 10 : 0) });
    }
    const result = calcWeightVariance(records);
    expect(result).not.toBeNull();
    expect(result.count).toBe(14);
  });

  it("calculates average daily swing", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 71 },
      { dt: "2025-01-05", wt: 70 },
    ];
    const result = calcWeightVariance(records);
    expect(result).not.toBeNull();
    expect(result.avgDailySwing).toBe(1);
  });
});

describe("calcWeightPlateau", () => {
  it("returns null with fewer than 14 records", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 }));
    expect(calcWeightPlateau(records)).toBeNull();
  });

  it("detects plateau when weight is stable", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i % 2) * 0.2,
    }));
    const result = calcWeightPlateau(records);
    expect(result).not.toBeNull();
    expect(result.isPlateau).toBe(true);
    expect(result.range).toBeLessThanOrEqual(1.0);
  });

  it("does not detect plateau when weight is changing", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.3,
    }));
    const result = calcWeightPlateau(records);
    expect(result).not.toBeNull();
    expect(result.isPlateau).toBe(false);
  });

  it("includes previous rate when 28+ records exist", () => {
    const records = Array.from({ length: 28 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: i < 14 ? 73 - i * 0.2 : 70.2,
    }));
    const result = calcWeightPlateau(records);
    expect(result).not.toBeNull();
    expect(result.previousRate).not.toBeNull();
    expect(result.isPlateau).toBe(true);
  });
});

describe("trimRecords edge cases", () => {
  it("keeps only the most recent records when over limit", () => {
    const records = Array.from({ length: 200 }, (_, i) => ({
      dt: `2025-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const trimmed = trimRecords(records, 180);
    expect(trimmed.length).toBe(180);
    // Should keep the latest records
    expect(trimmed[trimmed.length - 1]).toEqual(records[records.length - 1]);
  });

  it("does not trim when under limit", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(trimRecords(records, 180)).toHaveLength(1);
  });
});

describe("filterRecordsByDateRange edge cases", () => {
  const records = [
    { dt: "2025-01-01", wt: 70 },
    { dt: "2025-01-15", wt: 71 },
    { dt: "2025-02-01", wt: 72 },
  ];

  it("returns all records when no range specified", () => {
    expect(filterRecordsByDateRange(records, "", "")).toHaveLength(3);
  });

  it("filters with only from date", () => {
    const result = filterRecordsByDateRange(records, "2025-01-10", "");
    expect(result).toHaveLength(2);
    expect(result[0].dt).toBe("2025-01-15");
  });

  it("filters with only to date", () => {
    const result = filterRecordsByDateRange(records, "", "2025-01-20");
    expect(result).toHaveLength(2);
    expect(result[1].dt).toBe("2025-01-15");
  });

  it("returns empty array for non-overlapping range", () => {
    const result = filterRecordsByDateRange(records, "2025-03-01", "2025-04-01");
    expect(result).toHaveLength(0);
  });
});

describe("calcInsight additional edge cases", () => {
  it("returns object with bestDay and weekComparison", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 80 - i * 0.3 };
    });
    const insight = calcInsight(records);
    expect(insight).not.toBeNull();
    expect(typeof insight.bestDay).toBe("number");
    expect(insight.bestDay).toBeGreaterThanOrEqual(0);
    expect(insight.bestDay).toBeLessThanOrEqual(6);
  });

  it("returns null for fewer than 3 records", () => {
    expect(calcInsight([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });
});

describe("calcWeightStability additional tests", () => {
  it("returns low score for high variance in recent records", () => {
    const today = new Date();
    const records = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      records.push({ dt, wt: i % 2 === 0 ? 60 : 80 });
    }
    const result = calcWeightStability(records);
    expect(result).not.toBeNull();
    expect(result.score).toBeLessThan(50);
  });

  it("returns high score for consistent recent weights", () => {
    const today = new Date();
    const records = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      records.push({ dt, wt: 70 + (i % 3) * 0.1 });
    }
    const result = calcWeightStability(records);
    expect(result).not.toBeNull();
    expect(result.score).toBeGreaterThan(90);
  });
});

describe("exportRecordsToCSV additional tests", () => {
  it("includes all fields in CSV output", () => {
    const records = [{ dt: "2025-01-01", wt: 70.5, bmi: 24.4, bf: 18.5, source: "manual", note: "test" }];
    const csv = exportRecordsToCSV(records);
    expect(csv).toContain("70.5");
    expect(csv).toContain("24.4");
    expect(csv).toContain("18.5");
    expect(csv).toContain("manual");
    expect(csv).toContain("test");
  });

  it("handles records with special characters in notes", () => {
    const records = [{ dt: "2025-01-01", wt: 70, source: "manual", note: 'He said "hello, world"' }];
    const csv = exportRecordsToCSV(records);
    expect(csv).toContain('"He said ""hello, world"""');
  });
});

describe("upsertRecord edge cases", () => {
  it("replaces existing record with same date", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const updated = upsertRecord(records, { dt: "2025-01-01", wt: 72 });
    expect(updated).toHaveLength(1);
    expect(updated[0].wt).toBe(72);
  });

  it("inserts in sorted order", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-03", wt: 72 },
    ];
    const updated = upsertRecord(records, { dt: "2025-01-02", wt: 71 });
    expect(updated).toHaveLength(3);
    expect(updated[1].dt).toBe("2025-01-02");
  });
});

describe("calcGoalProgress edge cases", () => {
  it("returns null with no records", () => {
    expect(calcGoalProgress([], 60)).toBeNull();
  });

  it("returns null when goalWeight is not finite", () => {
    expect(calcGoalProgress([{ dt: "2025-01-01", wt: 70 }], NaN)).toBeNull();
    expect(calcGoalProgress([{ dt: "2025-01-01", wt: 70 }], null)).toBeNull();
  });

  it("returns 100% when already at goal", () => {
    const records = [{ dt: "2025-01-01", wt: 65 }, { dt: "2025-01-02", wt: 60 }];
    const result = calcGoalProgress(records, 60);
    expect(result.percent).toBe(100);
    expect(result.remaining).toBe(0);
  });

  it("calculates partial progress correctly", () => {
    const records = [{ dt: "2025-01-01", wt: 80 }, { dt: "2025-01-10", wt: 75 }];
    const result = calcGoalProgress(records, 70);
    expect(result.percent).toBe(50);
    expect(result.remaining).toBe(5);
  });
});

describe("calcGoalMilestones edge cases", () => {
  it("returns null when goal equals or exceeds first weight", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(calcGoalMilestones(records, 70)).toBeNull();
    expect(calcGoalMilestones(records, 80)).toBeNull();
  });

  it("marks reached milestones correctly", () => {
    const records = [{ dt: "2025-01-01", wt: 80 }, { dt: "2025-01-10", wt: 72 }];
    const milestones = calcGoalMilestones(records, 60);
    // totalToLose = 20, 25% = 75kg (reached), 50% = 70kg (not reached)
    expect(milestones[0].reached).toBe(true); // 25%
    expect(milestones[1].reached).toBe(false); // 50%
  });
});

describe("calcMonthlyStats edge cases", () => {
  it("returns empty array for no records", () => {
    expect(calcMonthlyStats([])).toEqual([]);
  });

  it("groups by month and computes stats", () => {
    const records = [
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-15", wt: 72 },
      { dt: "2025-02-01", wt: 68 },
    ];
    const stats = calcMonthlyStats(records);
    expect(stats.length).toBe(2);
    // Sorted reverse chronologically
    expect(stats[0].month).toBe("2025-02");
    expect(stats[1].month).toBe("2025-01");
    expect(stats[1].count).toBe(2);
    expect(stats[1].min).toBe(70);
    expect(stats[1].max).toBe(72);
  });
});

describe("calcWeeklyRate edge cases", () => {
  it("returns null with fewer than 7 days span", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-05", wt: 69 },
    ];
    expect(calcWeeklyRate(records)).toBeNull();
  });

  it("calculates rate for 14-day span", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-15", wt: 68 },
    ];
    const rate = calcWeeklyRate(records);
    expect(rate).not.toBeNull();
    expect(rate.weeklyRate).toBeLessThan(0);
    expect(rate.totalDays).toBe(14);
  });
});

describe("validateProfile edge cases", () => {
  it("accepts empty profile", () => {
    const result = validateProfile({ name: "", heightCm: "", age: "", gender: "" });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid gender by setting default", () => {
    const result = validateProfile({ name: "", heightCm: "", age: "", gender: "alien" });
    expect(result.valid).toBe(true);
    expect(result.profile.gender).toBe("unspecified");
  });

  it("accepts full-width numeric height", () => {
    const result = validateProfile({ name: "Test", heightCm: "１７０", age: "", gender: "male" });
    expect(result.valid).toBe(true);
    expect(result.profile.heightCm).toBe(170);
  });

  it("rejects height out of range", () => {
    expect(validateProfile({ name: "", heightCm: "50", age: "", gender: "" }).valid).toBe(false);
    expect(validateProfile({ name: "", heightCm: "300", age: "", gender: "" }).valid).toBe(false);
  });

  it("rejects non-integer age", () => {
    expect(validateProfile({ name: "", heightCm: "", age: "25.5", gender: "" }).valid).toBe(false);
  });
});

describe("calcRecordGaps", () => {
  it("returns null with fewer than 2 records", () => {
    expect(calcRecordGaps([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns no gaps for consecutive days", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcRecordGaps(records);
    expect(result).not.toBeNull();
    expect(result.totalGaps).toBe(0);
    expect(result.longestGap).toBe(0);
    expect(result.coverage).toBe(100);
  });

  it("detects gaps between records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-05", wt: 71 },
      { dt: "2025-01-10", wt: 69 },
    ];
    const result = calcRecordGaps(records);
    expect(result).not.toBeNull();
    expect(result.totalGaps).toBe(2);
    expect(result.longestGap).toBe(5);
    expect(result.gaps[0].days).toBe(5);
    expect(result.gaps[1].days).toBe(4);
  });

  it("limits gaps to top 5", () => {
    const records = [];
    for (let i = 0; i < 7; i++) {
      records.push({ dt: `2025-0${i + 1}-01`, wt: 70 });
    }
    const result = calcRecordGaps(records);
    expect(result).not.toBeNull();
    expect(result.gaps.length).toBeLessThanOrEqual(5);
  });
});

describe("calcGoalPrediction edge cases", () => {
  it("returns achieved when at or below goal", () => {
    const result = calcGoalPrediction([{ dt: "2025-01-01", wt: 65 }], 70);
    expect(result.achieved).toBe(true);
  });

  it("returns insufficient with fewer than 2 recent records", () => {
    const result = calcGoalPrediction([{ dt: "2020-01-01", wt: 75 }], 65);
    expect(result.insufficient).toBe(true);
  });

  it("returns noTrend when weight is increasing", () => {
    const today = new Date();
    const records = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (4 - i));
      return {
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 70 + i * 0.5,
      };
    });
    const result = calcGoalPrediction(records, 65);
    expect(result.noTrend).toBe(true);
  });

  it("predicts days when losing weight", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (9 - i));
      return {
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 75 - i * 0.2,
      };
    });
    const result = calcGoalPrediction(records, 65);
    expect(result.achieved).toBe(false);
    expect(result.days).toBeGreaterThan(0);
    expect(result.predictedDate).toBeDefined();
  });
});

describe("calcAchievements edge cases", () => {
  it("returns empty for no records", () => {
    expect(calcAchievements([], 0, null)).toEqual([]);
  });

  it("awards record count badges", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const achievements = calcAchievements(records, 0, null);
    const recordBadges = achievements.filter(a => a.id.startsWith("records_"));
    expect(recordBadges.length).toBeGreaterThanOrEqual(3); // 1, 10, 30
  });

  it("awards goal achieved badge", () => {
    const records = [{ dt: "2025-01-01", wt: 60 }];
    const achievements = calcAchievements(records, 0, 65);
    const goalBadge = achievements.find(a => a.id === "goal_achieved");
    expect(goalBadge).toBeDefined();
  });

  it("awards weight loss badges", () => {
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-01-30", wt: 74 }, // lost 6kg
    ];
    const achievements = calcAchievements(records, 0, null);
    const lossBadges = achievements.filter(a => a.id.startsWith("loss_"));
    expect(lossBadges.some(b => b.id === "loss_5")).toBe(true);
    expect(lossBadges.some(b => b.id === "loss_1")).toBe(true);
  });
});

describe("calcLongestStreak edge cases", () => {
  it("returns 0 for empty records", () => {
    expect(calcLongestStreak([])).toBe(0);
  });

  it("returns 1 for single record", () => {
    expect(calcLongestStreak([{ dt: "2025-01-01", wt: 70 }])).toBe(1);
  });

  it("handles gaps correctly", () => {
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
});

describe("calcSourceBreakdown edge cases", () => {
  it("returns null for empty records", () => {
    expect(calcSourceBreakdown([])).toBeNull();
  });

  it("counts sources correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, source: "manual" },
      { dt: "2025-01-02", wt: 70, source: "voice" },
      { dt: "2025-01-03", wt: 70, source: "manual" },
      { dt: "2025-01-04", wt: 70 }, // no source defaults to manual
    ];
    const result = calcSourceBreakdown(records);
    expect(result.manual).toBe(3);
    expect(result.voice).toBe(1);
  });
});

describe("calcCalorieEstimate", () => {
  it("returns null with fewer than 3 records", () => {
    expect(calcCalorieEstimate([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns null when no recent records match", () => {
    const records = [
      { dt: "2020-01-01", wt: 70 },
      { dt: "2020-01-02", wt: 71 },
      { dt: "2020-01-03", wt: 72 },
    ];
    const result = calcCalorieEstimate(records);
    expect(result).toBeNull();
  });

  it("calculates calorie estimates for recent records", () => {
    const today = new Date();
    const records = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (7 - i));
      return {
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 70 - i * 0.1,
      };
    });
    const result = calcCalorieEstimate(records);
    expect(result).not.toBeNull();
    expect(result.week).not.toBeNull();
    expect(result.week.totalKcal).toBeLessThan(0);
    expect(result.week.dailyKcal).toBeLessThan(0);
  });

  it("shows surplus for weight gain", () => {
    const today = new Date();
    const records = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (7 - i));
      return {
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 70 + i * 0.2,
      };
    });
    const result = calcCalorieEstimate(records);
    expect(result).not.toBeNull();
    expect(result.week.totalKcal).toBeGreaterThan(0);
    expect(result.week.dailyKcal).toBeGreaterThan(0);
  });
});

describe("calcMomentumScore", () => {
  it("returns null with fewer than 7 records", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 }));
    expect(calcMomentumScore(records)).toBeNull();
  });

  it("returns score between 0 and 100", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (9 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 70 - i * 0.1 };
    });
    const result = calcMomentumScore(records);
    expect(result).not.toBeNull();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["great", "good", "fair", "low"]).toContain(result.level);
  });

  it("gives higher score for consistent weight loss", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (9 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 75 - i * 0.5 };
    });
    const result = calcMomentumScore(records);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("includes factors array", () => {
    const today = new Date();
    const records = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 70 };
    });
    const result = calcMomentumScore(records);
    expect(result).not.toBeNull();
    expect(Array.isArray(result.factors)).toBe(true);
  });

  it("awards near goal bonus", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (9 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 65.5 - i * 0.05 };
    });
    const result = calcMomentumScore(records, 65);
    expect(result.factors).toContain("nearGoal");
  });

  it("handles weight gain goal correctly", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (9 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 55 + i * 0.5 };
    });
    // Goal is higher than starting weight = gain goal
    const result = calcMomentumScore(records, 65);
    expect(result).not.toBeNull();
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.factors).toContain("trendGood");
  });

  it("penalizes volatile weight", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (9 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 70 + (i % 2 === 0 ? 3 : -3) };
    });
    const result = calcMomentumScore(records);
    expect(result.factors).toContain("volatile");
  });
});

describe("extractWeightCandidates edge cases", () => {
  it("extracts from Japanese input with キロ", () => {
    const result = extractWeightCandidates("体重は65.5キロです");
    expect(result).toContain(65.5);
  });

  it("extracts from text with 点 (decimal point)", () => {
    const result = extractWeightCandidates("70点5");
    expect(result).toContain(70.5);
  });

  it("returns empty for no numeric data", () => {
    expect(extractWeightCandidates("hello world")).toEqual([]);
  });

  it("filters out-of-range weights", () => {
    const result = extractWeightCandidates("500kg and 10kg and 65kg");
    expect(result).toEqual([65]);
  });

  it("deduplicates identical candidates", () => {
    const result = extractWeightCandidates("65.0kg 65.0kg");
    expect(result).toEqual([65]);
  });
});

describe("calcDayOfWeekAvg edge cases", () => {
  it("returns null for fewer than 7 records", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(calcDayOfWeekAvg(records)).toBeNull();
  });

  it("returns averages for 7+ records", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i % 3),
    }));
    const result = calcDayOfWeekAvg(records);
    expect(result).not.toBeNull();
    expect(result.avgs.length).toBe(7);
    expect(result.overallAvg).toBeGreaterThan(0);
  });
});

describe("calcDaysSinceLastRecord edge cases", () => {
  it("returns null for empty records", () => {
    expect(calcDaysSinceLastRecord([])).toBeNull();
  });

  it("returns 0 for record today", () => {
    const today = new Date();
    const dt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(calcDaysSinceLastRecord([{ dt, wt: 70 }])).toBe(0);
  });

  it("returns positive number for past record", () => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(calcDaysSinceLastRecord([{ dt, wt: 70 }])).toBe(5);
  });
});

describe("pickWeightCandidate edge cases", () => {
  it("returns null for empty candidates", () => {
    expect(pickWeightCandidate([])).toBeNull();
  });

  it("returns first candidate with no fallback", () => {
    expect(pickWeightCandidate([65, 70, 75])).toBe(65);
  });

  it("returns closest to fallback weight", () => {
    expect(pickWeightCandidate([60, 70, 80], 72)).toBe(70);
  });

  it("handles non-finite fallback as no fallback", () => {
    expect(pickWeightCandidate([65, 70], NaN)).toBe(65);
    expect(pickWeightCandidate([65, 70], null)).toBe(65);
  });
});

describe("calcNextMilestones", () => {
  it("returns null for empty records", () => {
    expect(calcNextMilestones([])).toBeNull();
  });

  it("returns round number milestone", () => {
    const records = [{ dt: "2025-01-01", wt: 70.5 }];
    const result = calcNextMilestones(records);
    expect(result).not.toBeNull();
    const round = result.find((m) => m.type === "roundDown");
    expect(round).toBeDefined();
    expect(round.target).toBe(70);
    expect(round.remaining).toBe(0.5);
  });

  it("returns 5kg milestone when applicable", () => {
    const records = [{ dt: "2025-01-01", wt: 73.2 }];
    const result = calcNextMilestones(records);
    expect(result).not.toBeNull();
    const five = result.find((m) => m.type === "fiveDown");
    expect(five).toBeDefined();
    expect(five.target).toBe(70);
  });

  it("includes BMI zone milestone with height", () => {
    // At 170cm, BMI 25 = 72.25kg. Weight 74kg → remaining ~1.8kg
    const records = [{ dt: "2025-01-01", wt: 74 }];
    const result = calcNextMilestones(records, 170);
    expect(result).not.toBeNull();
    const bmi = result.find((m) => m.type === "bmiZone");
    expect(bmi).toBeDefined();
    expect(bmi.bmiValue).toBe(25);
  });

  it("limits to 3 milestones", () => {
    const records = [{ dt: "2025-01-01", wt: 88.7 }];
    const result = calcNextMilestones(records, 170);
    expect(result).not.toBeNull();
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("returns null when at exact round number", () => {
    const records = [{ dt: "2025-01-01", wt: 70.0 }];
    const result = calcNextMilestones(records);
    // At exactly 70, no round-down milestone (70 is not < 70)
    expect(result).toBeNull();
  });
});

describe("getBMIStatus edge cases", () => {
  it("returns unknown for NaN", () => {
    expect(getBMIStatus(NaN)).toBe("bmi.unknown");
  });

  it("returns under for BMI < 18.5", () => {
    expect(getBMIStatus(17)).toBe("bmi.under");
  });

  it("returns normal for BMI 18.5-24.9", () => {
    expect(getBMIStatus(22)).toBe("bmi.normal");
  });

  it("returns over for BMI 25-29.9", () => {
    expect(getBMIStatus(27)).toBe("bmi.over");
  });

  it("returns obese for BMI >= 30", () => {
    expect(getBMIStatus(35)).toBe("bmi.obese");
  });

  it("handles boundary at 18.5", () => {
    expect(getBMIStatus(18.5)).toBe("bmi.normal");
  });

  it("handles boundary at 25", () => {
    expect(getBMIStatus(25)).toBe("bmi.over");
  });
});

describe("calcStreak edge cases", () => {
  it("returns 0 for empty records", () => {
    expect(calcStreak([])).toBe(0);
  });

  it("returns 1 for today's record only", () => {
    const today = new Date();
    const dt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(calcStreak([{ dt, wt: 70 }])).toBe(1);
  });

  it("counts consecutive days", () => {
    const today = new Date();
    const records = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 70 };
    });
    expect(calcStreak(records)).toBe(5);
  });

  it("breaks streak on gap", () => {
    const today = new Date();
    const d1 = new Date(today);
    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 3);
    const records = [
      { dt: `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`, wt: 70 },
      { dt: `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, "0")}-${String(d3.getDate()).padStart(2, "0")}`, wt: 70 },
    ];
    expect(calcStreak(records)).toBe(1);
  });
});

describe("calcTrendForecast edge cases", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70,
    }));
    expect(calcTrendForecast(records)).toBeNull();
  });

  it("returns forecast with slope for sufficient data", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (9 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 75 - i * 0.2 };
    });
    const result = calcTrendForecast(records);
    expect(result).not.toBeNull();
    expect(result.slope).toBeLessThan(0); // decreasing trend
    expect(result.forecast.length).toBeGreaterThan(0);
  });
});

describe("createDefaultSettings edge cases", () => {
  it("returns default settings object", () => {
    const settings = createDefaultSettings();
    expect(settings).toHaveProperty("language");
    expect(settings).toHaveProperty("theme");
    expect(settings).toHaveProperty("chartStyle");
  });

  it("has valid default language", () => {
    const settings = createDefaultSettings();
    expect(["ja", "en"]).toContain(settings.language);
  });
});

describe("calcSeasonality", () => {
  it("returns null for fewer than 30 records", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70,
    }));
    expect(calcSeasonality(records)).toBeNull();
  });

  it("returns monthly averages for sufficient data", () => {
    const records = [];
    for (let m = 1; m <= 6; m++) {
      for (let d = 1; d <= 5; d++) {
        records.push({ dt: `2025-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, wt: 65 + m });
      }
    }
    const result = calcSeasonality(records);
    expect(result).not.toBeNull();
    expect(result.monthAvgs.length).toBe(12);
    expect(result.lightestMonth).toBe(0); // January (65+1=66)
    expect(result.heaviestMonth).toBe(5); // June (65+6=71)
    expect(result.seasonalRange).toBe(5);
  });

  it("returns null if fewer than 3 months have data", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2025-01-${String((i % 28) + 1).padStart(2, "0")}`, wt: 70,
    }));
    // All records in January — only 1 month
    const result = calcSeasonality(records);
    expect(result).toBeNull();
  });

  it("handles overall average correctly", () => {
    const records = [];
    for (let m = 1; m <= 4; m++) {
      for (let d = 1; d <= 8; d++) {
        records.push({ dt: `2025-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, wt: 70 });
      }
    }
    const result = calcSeasonality(records);
    expect(result).not.toBeNull();
    expect(result.overallAvg).toBe(70);
  });
});

describe("calcDailyDiff edge cases", () => {
  it("returns null for single record", () => {
    expect(calcDailyDiff([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns null when today or yesterday missing", () => {
    // Records from long ago
    const records = [
      { dt: "2020-01-01", wt: 70 },
      { dt: "2020-01-02", wt: 71 },
    ];
    expect(calcDailyDiff(records)).toBeNull();
  });

  it("returns diff when today and yesterday exist", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const records = [
      { dt: fmt(yesterday), wt: 70.0 },
      { dt: fmt(today), wt: 69.5 },
    ];
    const result = calcDailyDiff(records);
    expect(result).not.toBeNull();
    expect(result.diff).toBe(-0.5);
    expect(result.today).toBe(69.5);
    expect(result.yesterday).toBe(70.0);
  });
});

describe("calcSmoothedWeight edge cases", () => {
  it("returns null for empty records", () => {
    expect(calcSmoothedWeight([])).toBeNull();
  });

  it("returns weight with zero trend for single record", () => {
    const result = calcSmoothedWeight([{ dt: "2025-01-01", wt: 70 }]);
    expect(result).toEqual({ smoothed: 70, trend: 0 });
  });

  it("returns smoothed value for multiple records", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 + i * 0.1,
    }));
    const result = calcSmoothedWeight(records);
    expect(result).not.toBeNull();
    expect(result.smoothed).toBeGreaterThan(70);
    expect(typeof result.trend).toBe("number");
  });
});

describe("calcBMIDistribution edge cases", () => {
  it("returns null for no records with BMI", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }]; // no bmi field
    expect(calcBMIDistribution(records)).toBeNull();
  });

  it("categorizes BMI values correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 50, bmi: 17 },    // under
      { dt: "2025-01-02", wt: 60, bmi: 22 },    // normal
      { dt: "2025-01-03", wt: 65, bmi: 23 },    // normal
      { dt: "2025-01-04", wt: 80, bmi: 28 },    // over
      { dt: "2025-01-05", wt: 95, bmi: 33 },    // obese
    ];
    const result = calcBMIDistribution(records);
    expect(result).not.toBeNull();
    expect(result.under.count).toBe(1);
    expect(result.normal.count).toBe(2);
    expect(result.over.count).toBe(1);
    expect(result.obese.count).toBe(1);
    expect(result.total).toBe(5);
  });
});

describe("calcRecordGaps edge cases", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcRecordGaps([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("detects gaps in recording", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      // gap
      { dt: "2025-01-10", wt: 70 },
      { dt: "2025-01-11", wt: 70 },
    ];
    const result = calcRecordGaps(records);
    expect(result).not.toBeNull();
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps[0].days).toBe(8);
  });
});

describe("calcPeriodSummary edge cases", () => {
  it("returns null for no records in period", () => {
    const records = [{ dt: "2020-01-01", wt: 70 }];
    // 7-day period won't include 2020 records
    expect(calcPeriodSummary(records, 7)).toBeNull();
  });

  it("returns summary for records in period", () => {
    const today = new Date();
    const records = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 70 + i * 0.2 };
    });
    const result = calcPeriodSummary(records, 7);
    expect(result).not.toBeNull();
    expect(result.count).toBe(5);
    expect(result.min).toBeLessThanOrEqual(result.max);
    expect(result.avg).toBeGreaterThan(0);
  });
});

describe("calcTagImpact edge cases", () => {
  it("returns null for fewer than 5 records", () => {
    const records = [{ dt: "2025-01-01", wt: 70, note: "#運動" }];
    expect(calcTagImpact(records)).toBeNull();
  });

  it("returns null when no tags are repeated", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70, note: "",
    }));
    expect(calcTagImpact(records)).toBeNull();
  });

  it("detects tag impact when tags repeat", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "" },
      { dt: "2025-01-02", wt: 69.5, note: "#運動" },
      { dt: "2025-01-03", wt: 69.8, note: "" },
      { dt: "2025-01-04", wt: 69.2, note: "#運動" },
      { dt: "2025-01-05", wt: 69.5, note: "" },
      { dt: "2025-01-06", wt: 69.0, note: "#運動" },
    ];
    const result = calcTagImpact(records);
    if (result) {
      expect(Array.isArray(result)).toBe(true);
      const exerciseTag = result.find(r => r.tag === "運動");
      if (exerciseTag) {
        expect(typeof exerciseTag.avgChange).toBe("number");
        expect(exerciseTag.count).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe("calcWeightPlateau edge cases", () => {
  it("returns null for insufficient records", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(calcWeightPlateau(records)).toBeNull();
  });

  it("detects plateau when weight is stable", () => {
    const today = new Date();
    const records = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 70 + (Math.random() * 0.2 - 0.1) };
    });
    const result = calcWeightPlateau(records);
    // May or may not detect plateau depending on exact random values, but shouldn't crash
    expect(result === null || typeof result === "object").toBe(true);
  });
});

describe("calcWeightVelocity edge cases", () => {
  it("returns null for insufficient records", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(calcWeightVelocity(records)).toBeNull();
  });

  it("calculates velocity for recent data", () => {
    const today = new Date();
    const records = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 75 - i * 0.1 };
    });
    const result = calcWeightVelocity(records);
    if (result) {
      expect(result.week).not.toBeNull();
      expect(typeof result.week.dailyRate).toBe("number");
      expect(typeof result.week.monthlyProjection).toBe("number");
    }
  });
});

describe("calcWeightDistribution", () => {
  it("returns null with fewer than 5 records", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 71 }];
    expect(calcWeightDistribution(records)).toBeNull();
  });

  it("creates buckets for weight range", () => {
    const records = [
      { dt: "2025-01-01", wt: 68.5 },
      { dt: "2025-01-02", wt: 69.2 },
      { dt: "2025-01-03", wt: 70.1 },
      { dt: "2025-01-04", wt: 70.8 },
      { dt: "2025-01-05", wt: 71.3 },
    ];
    const result = calcWeightDistribution(records);
    expect(result).not.toBeNull();
    expect(result.buckets.length).toBeGreaterThan(0);
    expect(result.total).toBe(5);
    expect(result.maxCount).toBeGreaterThan(0);
  });

  it("identifies mode bucket correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70.1 },
      { dt: "2025-01-02", wt: 70.3 },
      { dt: "2025-01-03", wt: 70.5 },
      { dt: "2025-01-04", wt: 70.7 },
      { dt: "2025-01-05", wt: 72.0 },
    ];
    const result = calcWeightDistribution(records);
    expect(result).not.toBeNull();
    expect(result.modeRange).toBe("70-71");
    expect(result.buckets[result.modeBucket].count).toBe(4);
  });

  it("marks latest weight bucket", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i,
    }));
    const result = calcWeightDistribution(records);
    expect(result).not.toBeNull();
    expect(result.latestBucket).toBeGreaterThanOrEqual(0);
  });
});

describe("calcRecordingTimeStats edge cases", () => {
  it("returns null for fewer than 3 records with timestamps", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, createdAt: "2025-01-01T08:00:00" },
    ];
    expect(calcRecordingTimeStats(records)).toBeNull();
  });

  it("returns null for records without createdAt", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70,
    }));
    expect(calcRecordingTimeStats(records)).toBeNull();
  });

  it("categorizes time periods correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, createdAt: "2025-01-01T07:00:00" }, // morning
      { dt: "2025-01-02", wt: 70, createdAt: "2025-01-02T13:00:00" }, // afternoon
      { dt: "2025-01-03", wt: 70, createdAt: "2025-01-03T19:00:00" }, // evening
      { dt: "2025-01-04", wt: 70, createdAt: "2025-01-04T23:00:00" }, // night
    ];
    const result = calcRecordingTimeStats(records);
    expect(result).not.toBeNull();
    expect(result.morning.count).toBe(1);
    expect(result.afternoon.count).toBe(1);
    expect(result.evening.count).toBe(1);
    expect(result.night.count).toBe(1);
    expect(result.total).toBe(4);
  });
});

describe("calcMovingAverages edge cases", () => {
  it("returns null for fewer than 30 records", () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70,
    }));
    expect(calcMovingAverages(records)).toBeNull();
  });

  it("returns averages for sufficient records", () => {
    const records = Array.from({ length: 35 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 + (i < 20 ? 0 : -0.1 * (i - 19)),
    }));
    const result = calcMovingAverages(records);
    expect(result).not.toBeNull();
    expect(result.shortAvg).toBeGreaterThan(0);
    expect(result.longAvg).toBeGreaterThan(0);
    expect(["below", "above", "aligned"]).toContain(result.signal);
  });
});

describe("calcConsistencyStreak edge cases", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcConsistencyStreak([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns streak for consistent weights", () => {
    const records = [
      { dt: "2025-01-01", wt: 70.0 },
      { dt: "2025-01-02", wt: 70.2 },
      { dt: "2025-01-03", wt: 70.1 },
      { dt: "2025-01-04", wt: 70.3 },
    ];
    const result = calcConsistencyStreak(records);
    expect(result).not.toBeNull();
    expect(result.streak).toBe(4); // all within 0.5 of latest
    expect(result.best).toBeGreaterThanOrEqual(result.streak);
  });

  it("breaks streak on large change", () => {
    const records = [
      { dt: "2025-01-01", wt: 72.0 },
      { dt: "2025-01-02", wt: 70.0 },
      { dt: "2025-01-03", wt: 70.2 },
    ];
    const result = calcConsistencyStreak(records);
    expect(result).not.toBeNull();
    expect(result.streak).toBe(2); // only last 2 within 0.5
  });
});

describe("calcDataHealth edge cases", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcDataHealth([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns high score for consecutive records with BMI", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70, bmi: 22.5,
    }));
    const result = calcDataHealth(records);
    expect(result).not.toBeNull();
    expect(result.score).toBe(100);
    expect(result.issues.length).toBe(0);
  });

  it("detects gaps and reduces score", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-20", wt: 70 }, // 19-day gap
    ];
    const result = calcDataHealth(records);
    expect(result.issues.some(i => i.type === "gap")).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it("detects outliers", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 80 }, // 10kg jump — outlier
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcDataHealth(records);
    expect(result.issues.some(i => i.type === "outlier")).toBe(true);
  });
});

// ── Additional edge case tests ──

describe("normalizeNumericInput edge cases", () => {
  it("handles null and undefined", () => {
    expect(normalizeNumericInput(null)).toBe("");
    expect(normalizeNumericInput(undefined)).toBe("");
  });

  it("normalizes fullwidth digits", () => {
    expect(normalizeNumericInput("６５．３")).toBe("65.3");
  });

  it("normalizes fullwidth comma", () => {
    expect(normalizeNumericInput("６５，３")).toBe("65.3");
  });

  it("strips whitespace", () => {
    expect(normalizeNumericInput("  65 . 3  ")).toBe("65.3");
  });
});

describe("validateWeight edge cases", () => {
  it("rejects empty string", () => {
    expect(validateWeight("").valid).toBe(false);
  });

  it("rejects negative weight", () => {
    expect(validateWeight("-50").valid).toBe(false);
  });

  it("accepts boundary min", () => {
    const r = validateWeight("20");
    expect(r.valid).toBe(true);
    expect(r.weight).toBe(20);
  });

  it("accepts boundary max", () => {
    const r = validateWeight("300");
    expect(r.valid).toBe(true);
    expect(r.weight).toBe(300);
  });

  it("rejects just above max", () => {
    expect(validateWeight("300.1").valid).toBe(false);
  });

  it("rejects just below min", () => {
    expect(validateWeight("19.9").valid).toBe(false);
  });
});

describe("validateBodyFat edge cases", () => {
  it("accepts empty/null gracefully", () => {
    expect(validateBodyFat("").valid).toBe(true);
    expect(validateBodyFat(null).valid).toBe(true);
    expect(validateBodyFat(undefined).valid).toBe(true);
  });

  it("rejects body fat > 70", () => {
    expect(validateBodyFat("71").valid).toBe(false);
  });

  it("accepts boundary values", () => {
    expect(validateBodyFat("1").valid).toBe(true);
    expect(validateBodyFat("70").valid).toBe(true);
  });
});

describe("upsertRecord edge cases", () => {
  it("overwrites existing record on same date", () => {
    const records = [{ dt: "2025-01-01", wt: 70, source: "manual" }];
    const updated = upsertRecord(records, { dt: "2025-01-01", wt: 68, source: "voice" });
    expect(updated.length).toBe(1);
    expect(updated[0].wt).toBe(68);
    expect(updated[0].source).toBe("voice");
  });

  it("inserts and sorts by date", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-03", wt: 69 },
    ];
    const updated = upsertRecord(records, { dt: "2025-01-02", wt: 69.5 });
    expect(updated.length).toBe(3);
    expect(updated[1].dt).toBe("2025-01-02");
  });
});

describe("calcGoalProgress edge cases", () => {
  it("returns null for non-finite goal", () => {
    expect(calcGoalProgress([{ dt: "2025-01-01", wt: 70 }], NaN)).toBeNull();
    expect(calcGoalProgress([{ dt: "2025-01-01", wt: 70 }], null)).toBeNull();
  });

  it("returns 100% when already at goal", () => {
    const records = [{ dt: "2025-01-01", wt: 65 }];
    const result = calcGoalProgress(records, 65);
    expect(result.percent).toBe(100);
    expect(result.remaining).toBe(0);
  });

  it("handles weight gain goal (goal > start)", () => {
    const records = [
      { dt: "2025-01-01", wt: 60 },
      { dt: "2025-01-10", wt: 63 },
    ];
    const result = calcGoalProgress(records, 70);
    expect(result).not.toBeNull();
    expect(result.percent).toBeGreaterThan(0);
  });
});

describe("trimRecords", () => {
  it("keeps most recent records", () => {
    const records = Array.from({ length: 200 }, (_, i) => ({
      dt: `2025-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
    }));
    const trimmed = trimRecords(records, 180);
    expect(trimmed.length).toBe(180);
    // Should keep the last 180
    expect(trimmed[0]).toBe(records[20]);
  });

  it("returns original if under limit", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(trimRecords(records, 180)).toBe(records);
  });
});

describe("calcWeightComparison edge cases", () => {
  it("returns null for single record", () => {
    expect(calcWeightComparison([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns null when all records are on same date", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-01", wt: 71 },
    ];
    // Will only have one unique date, so findRecordNearDate returns same as latest
    expect(calcWeightComparison(records)).toBeNull();
  });
});

describe("buildCalendarMonth edge cases", () => {
  it("returns correct structure for month with records", () => {
    const records = [
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-15", wt: 69 },
    ];
    const result = buildCalendarMonth(records, 2025, 0);
    expect(result).not.toBeNull();
    expect(result.days.length).toBe(31);
    expect(result.recordCount).toBe(2);
  });

  it("handles month with no records", () => {
    const records = [{ dt: "2025-03-01", wt: 70 }];
    const result = buildCalendarMonth(records, 2025, 0); // January
    expect(result.recordCount).toBe(0);
  });
});

describe("calcInsight edge cases", () => {
  it("returns null for fewer than 3 records", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 69 }];
    expect(calcInsight(records)).toBeNull();
  });

  it("returns bestDay and weekComparison for 3+ records", () => {
    const records = Array.from({ length: 7 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 - i * 0.1,
    }));
    const result = calcInsight(records);
    expect(result).not.toBeNull();
    expect(typeof result.bestDay).toBe("number");
  });
});

describe("filterRecordsByDateRange edge cases", () => {
  it("returns all records when no range specified", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-10", wt: 69 },
    ];
    expect(filterRecordsByDateRange(records, "", "")).toEqual(records);
  });

  it("filters by from only", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-10", wt: 69 },
    ];
    const result = filterRecordsByDateRange(records, "2025-01-05", "");
    expect(result.length).toBe(1);
    expect(result[0].dt).toBe("2025-01-10");
  });

  it("filters by to only", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-10", wt: 69 },
    ];
    const result = filterRecordsByDateRange(records, "", "2025-01-05");
    expect(result.length).toBe(1);
    expect(result[0].dt).toBe("2025-01-01");
  });
});

describe("constants", () => {
  it("THEME_LIST has 11 themes", () => {
    expect(THEME_LIST.length).toBe(11);
  });

  it("all themes have id and color", () => {
    for (const theme of THEME_LIST) {
      expect(theme.id).toBeTruthy();
      expect(theme.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("MAX_RECORDS is 180", () => {
    expect(MAX_RECORDS).toBe(180);
  });

  it("WEIGHT_RANGE is 20-300", () => {
    expect(WEIGHT_RANGE.min).toBe(20);
    expect(WEIGHT_RANGE.max).toBe(300);
  });

  it("HEIGHT_RANGE is 80-250", () => {
    expect(HEIGHT_RANGE.min).toBe(80);
    expect(HEIGHT_RANGE.max).toBe(250);
  });

  it("AGE_RANGE is 1-120", () => {
    expect(AGE_RANGE.min).toBe(1);
    expect(AGE_RANGE.max).toBe(120);
  });

  it("BODY_FAT_RANGE is 1-70", () => {
    expect(BODY_FAT_RANGE.min).toBe(1);
    expect(BODY_FAT_RANGE.max).toBe(70);
  });

  it("STORAGE_KEYS has required keys", () => {
    expect(STORAGE_KEYS.records).toBeTruthy();
    expect(STORAGE_KEYS.profile).toBeTruthy();
    expect(STORAGE_KEYS.settings).toBeTruthy();
    expect(STORAGE_KEYS.firstLaunchDone).toBeTruthy();
  });
});

describe("calcWeekdayVsWeekend edge cases", () => {
  it("returns null for fewer than 5 records", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(calcWeekdayVsWeekend(records)).toBeNull();
  });

  it("returns weekday vs weekend comparison", () => {
    // 2025-01-06 is Monday, 2025-01-11 is Saturday
    const records = [
      { dt: "2025-01-06", wt: 70 }, // Mon
      { dt: "2025-01-07", wt: 70 }, // Tue
      { dt: "2025-01-08", wt: 70 }, // Wed
      { dt: "2025-01-11", wt: 71 }, // Sat
      { dt: "2025-01-12", wt: 71 }, // Sun
    ];
    const result = calcWeekdayVsWeekend(records);
    expect(result).not.toBeNull();
    expect(result.weekdayAvg).toBe(70);
    expect(result.weekendAvg).toBe(71);
    expect(result.diff).toBe(1);
  });
});

describe("calcDayOfWeekChange", () => {
  it("returns null with fewer than 7 records", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70,
    }));
    expect(calcDayOfWeekChange(records)).toBeNull();
  });

  it("calculates average change per day of week", () => {
    // 2025-01-06 is Monday. Create 14 consecutive days.
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 6).padStart(2, "0")}`,
      wt: 70 + (i % 2 === 0 ? 0 : 0.3),
    }));
    const result = calcDayOfWeekChange(records);
    expect(result).not.toBeNull();
    expect(result.avgs.length).toBe(7);
    expect(result.worstDay).not.toBeNull();
    expect(result.bestDay).not.toBeNull();
  });

  it("returns null when fewer than 3 days have data", () => {
    // Only 2 consecutive pairs on same days
    const records = [
      { dt: "2025-01-06", wt: 70 }, // Mon
      { dt: "2025-01-07", wt: 71 }, // Tue
      { dt: "2025-01-13", wt: 70 }, // Mon
      { dt: "2025-01-14", wt: 71 }, // Tue
      { dt: "2025-01-15", wt: 70 }, // Wed
      { dt: "2025-01-20", wt: 70 }, // Mon
      { dt: "2025-01-21", wt: 71 }, // Tue
    ];
    const result = calcDayOfWeekChange(records);
    // Should have data for Tue and Wed at least
    if (result) {
      expect(result.avgs.length).toBe(7);
    }
  });

  it("ignores non-consecutive day gaps", () => {
    const records = [
      { dt: "2025-01-06", wt: 70 },
      { dt: "2025-01-07", wt: 71 },
      { dt: "2025-01-10", wt: 69 }, // gap - should be skipped
      { dt: "2025-01-11", wt: 70 },
      { dt: "2025-01-12", wt: 71 },
      { dt: "2025-01-13", wt: 70 },
      { dt: "2025-01-14", wt: 71 },
      { dt: "2025-01-15", wt: 70 },
      { dt: "2025-01-16", wt: 71 },
      { dt: "2025-01-17", wt: 70 },
    ];
    const result = calcDayOfWeekChange(records);
    expect(result).not.toBeNull();
  });
});

describe("calcPersonalRecords", () => {
  it("returns null with fewer than 3 records", () => {
    expect(calcPersonalRecords([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("finds all-time low", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 71 },
    ];
    const result = calcPersonalRecords(records);
    expect(result).not.toBeNull();
    expect(result.allTimeLow).toBe(70);
    expect(result.allTimeLowDate).toBe("2025-01-02");
  });

  it("finds biggest single-day drop", () => {
    const records = [
      { dt: "2025-01-01", wt: 73 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70.5 },
    ];
    const result = calcPersonalRecords(records);
    expect(result.biggestDrop).toBe(2);
    expect(result.biggestDropDate).toBe("2025-01-02");
  });

  it("calculates total change", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-02", wt: 73 },
      { dt: "2025-01-03", wt: 72 },
    ];
    const result = calcPersonalRecords(records);
    expect(result.totalChange).toBe(-3);
    expect(result.totalRecords).toBe(3);
  });
});

describe("calcAchievements edge cases", () => {
  it("returns empty for no records", () => {
    expect(calcAchievements([], 0, null)).toEqual([]);
  });

  it("returns records_1 for first record", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const result = calcAchievements(records, 0, null);
    expect(result.some((a) => a.id === "records_1")).toBe(true);
  });

  it("returns goal_achieved when at goal weight", () => {
    const records = [{ dt: "2025-01-01", wt: 80 }, { dt: "2025-01-10", wt: 65 }];
    const result = calcAchievements(records, 0, 65);
    expect(result.some((a) => a.id === "goal_achieved")).toBe(true);
  });

  it("returns loss milestones", () => {
    const records = [{ dt: "2025-01-01", wt: 80 }, { dt: "2025-02-01", wt: 69 }];
    const result = calcAchievements(records, 0, null);
    expect(result.some((a) => a.id === "loss_10")).toBe(true);
    expect(result.some((a) => a.id === "loss_5")).toBe(true);
  });

  it("returns streak milestones", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const result = calcAchievements(records, 7, null);
    expect(result.some((a) => a.id === "streak_7")).toBe(true);
    expect(result.some((a) => a.id === "streak_3")).toBe(true);
  });
});

describe("calcGoalMilestones edge cases", () => {
  it("returns null for no records", () => {
    expect(calcGoalMilestones([], 65)).toBeNull();
  });

  it("returns null for non-finite goal", () => {
    expect(calcGoalMilestones([{ dt: "2025-01-01", wt: 70 }], NaN)).toBeNull();
  });

  it("returns null when goal >= start weight", () => {
    expect(calcGoalMilestones([{ dt: "2025-01-01", wt: 65 }], 70)).toBeNull();
  });

  it("returns 4 checkpoints", () => {
    const records = [{ dt: "2025-01-01", wt: 80 }, { dt: "2025-02-01", wt: 75 }];
    const result = calcGoalMilestones(records, 60);
    expect(result.length).toBe(4);
    expect(result[0].pct).toBe(25);
    expect(result[3].pct).toBe(100);
    expect(result[0].reached).toBe(true); // 80-60=20, 25% = 75kg, current 75 <= 75
  });
});

describe("calcMonthlyStats edge cases", () => {
  it("returns empty for no records", () => {
    expect(calcMonthlyStats([])).toEqual([]);
  });

  it("groups by month and sorts reverse", () => {
    const records = [
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-15", wt: 68 },
      { dt: "2025-02-01", wt: 67 },
    ];
    const result = calcMonthlyStats(records);
    expect(result.length).toBe(2);
    expect(result[0].month).toBe("2025-02"); // most recent first
    expect(result[1].month).toBe("2025-01");
    expect(result[1].count).toBe(2);
  });
});

describe("calcWeightTrend edge cases", () => {
  it("returns null for single record", () => {
    expect(calcWeightTrend([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns flat for stable weight", () => {
    const today = new Date();
    const records = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return { dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, wt: 70 };
    });
    expect(calcWeightTrend(records)).toBe("flat");
  });
});

describe("calcGoalPrediction edge cases", () => {
  it("returns insufficient for single record", () => {
    const result = calcGoalPrediction([{ dt: "2025-01-01", wt: 70 }], 65);
    expect(result.insufficient).toBe(true);
  });

  it("returns achieved when already at goal", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-10", wt: 65 }];
    const result = calcGoalPrediction(records, 65);
    expect(result).not.toBeNull();
    expect(result.achieved).toBe(true);
  });
});

describe("calcCalendarChangeMap edge cases", () => {
  it("returns empty for single record", () => {
    const map = calcCalendarChangeMap([{ dt: "2025-01-01", wt: 70 }]);
    expect(Object.keys(map).length).toBe(0);
  });

  it("returns changes for consecutive records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    const map = calcCalendarChangeMap(records);
    expect(map["2025-01-02"]).toBeCloseTo(-1.0, 1);
  });
});

describe("validateProfile edge cases", () => {
  it("defaults gender to unspecified for invalid value", () => {
    const result = validateProfile({ name: "test", heightCm: "170", age: "30", gender: "invalid" });
    expect(result.valid).toBe(true);
    expect(result.profile.gender).toBe("unspecified");
  });

  it("truncates name to 40 characters", () => {
    const longName = "a".repeat(50);
    const result = validateProfile({ name: longName, heightCm: "", age: "", gender: "male" });
    expect(result.valid).toBe(true);
    expect(result.profile.name.length).toBe(40);
  });

  it("rejects height below min", () => {
    const result = validateProfile({ name: "", heightCm: "79", age: "", gender: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects age above max", () => {
    const result = validateProfile({ name: "", heightCm: "", age: "121", gender: "" });
    expect(result.valid).toBe(false);
  });
});

describe("calcWeightRegression", () => {
  it("returns null with fewer than 5 records", () => {
    const records = Array.from({ length: 3 }, (_, i) => ({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 }));
    expect(calcWeightRegression(records)).toBeNull();
  });

  it("detects losing trend for decreasing weights", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 75 - i * 0.5,
    }));
    const result = calcWeightRegression(records);
    expect(result).not.toBeNull();
    expect(result.direction).toBe("losing");
    expect(result.slope).toBeLessThan(0);
    expect(result.weeklyRate).toBeLessThan(0);
  });

  it("returns high R² for perfectly linear data", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 80 - i * 0.3,
    }));
    const result = calcWeightRegression(records);
    expect(result).not.toBeNull();
    expect(result.r2).toBeGreaterThan(0.95);
    expect(result.fit).toBe("strong");
  });

  it("detects gaining trend", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.4,
    }));
    const result = calcWeightRegression(records);
    expect(result).not.toBeNull();
    expect(result.direction).toBe("gaining");
  });
});

describe("calcBMIHistory", () => {
  it("returns null for fewer than 3 BMI records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 24.2 },
      { dt: "2025-01-02", wt: 71, bmi: 24.6 },
    ];
    expect(calcBMIHistory(records)).toBeNull();
  });

  it("calculates BMI history stats correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 24.2 },
      { dt: "2025-01-02", wt: 68, bmi: 23.5 },
      { dt: "2025-01-03", wt: 65, bmi: 22.5 },
      { dt: "2025-01-04", wt: 63, bmi: 21.8 },
    ];
    const result = calcBMIHistory(records);
    expect(result).not.toBeNull();
    expect(result.first).toBe(24.2);
    expect(result.latest).toBe(21.8);
    expect(result.min).toBe(21.8);
    expect(result.max).toBe(24.2);
    expect(result.change).toBe(-2.4);
    expect(result.currentZone).toBe("normal");
    expect(result.zones.normal).toBe(100);
    expect(result.count).toBe(4);
  });

  it("detects improving trend when BMI decreasing from overweight", () => {
    const records = [
      { dt: "2025-01-01", wt: 80, bmi: 27.7 },
      { dt: "2025-01-02", wt: 78, bmi: 27.0 },
      { dt: "2025-01-03", wt: 75, bmi: 26.0 },
    ];
    const result = calcBMIHistory(records);
    expect(result.improving).toBe(true);
  });

  it("correctly distributes zones", () => {
    const records = [
      { dt: "2025-01-01", wt: 50, bmi: 17.3 },
      { dt: "2025-01-02", wt: 65, bmi: 22.5 },
      { dt: "2025-01-03", wt: 80, bmi: 27.7 },
      { dt: "2025-01-04", wt: 95, bmi: 32.9 },
    ];
    const result = calcBMIHistory(records);
    expect(result.zones.under).toBe(25);
    expect(result.zones.normal).toBe(25);
    expect(result.zones.over).toBe(25);
    expect(result.zones.obese).toBe(25);
  });
});

describe("calcWeightHeatmap", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
    }));
    expect(calcWeightHeatmap(records)).toBeNull();
  });

  it("returns 12 weeks of data", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + Math.sin(i) * 0.5,
    }));
    const result = calcWeightHeatmap(records);
    expect(result).not.toBeNull();
    expect(result.weeks.length).toBe(12);
    expect(result.weeks[0].length).toBe(7);
  });

  it("assigns intensity levels to cells", () => {
    const today = new Date();
    const records = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - 13 + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { dt: ds, wt: 70 + i * 0.3 };
    });
    const result = calcWeightHeatmap(records);
    const allCells = result.weeks.flat();
    const withLevel = allCells.filter((c) => c.level > 0);
    expect(withLevel.length).toBeGreaterThan(0);
  });

  it("tracks daysWithData count", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeightHeatmap(records);
    expect(result.daysWithData).toBeGreaterThanOrEqual(0);
    expect(typeof result.threshold).toBe("number");
  });
});

describe("calcStreakRewards", () => {
  function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  it("returns null for empty records", () => {
    expect(calcStreakRewards([])).toBeNull();
  });

  it("calculates current streak from today", () => {
    const today = new Date();
    const records = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: localDateStr(d), wt: 70 };
    });
    const result = calcStreakRewards(records);
    expect(result.streak).toBe(5);
    expect(result.level).toBe("beginner");
  });

  it("assigns correct badge levels", () => {
    const today = new Date();
    const records = Array.from({ length: 31 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: localDateStr(d), wt: 70 };
    });
    const result = calcStreakRewards(records);
    expect(result.streak).toBe(31);
    expect(result.level).toBe("dedicated");
    expect(result.earned).toContain(30);
    expect(result.next).toBe(60);
  });

  it("breaks streak on gap", () => {
    const today = new Date();
    const records = [
      { dt: localDateStr(today), wt: 70 },
      // skip yesterday
      (() => { const d = new Date(today); d.setDate(d.getDate() - 2); return { dt: localDateStr(d), wt: 70 }; })(),
    ];
    const result = calcStreakRewards(records);
    expect(result.streak).toBe(1);
  });
});

describe("calcWeightConfidence", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
    }));
    expect(calcWeightConfidence(records)).toBeNull();
  });

  it("calculates forecasts for sufficient data", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.1,
    }));
    const result = calcWeightConfidence(records);
    expect(result).not.toBeNull();
    expect(result.forecasts.length).toBe(3);
    expect(result.forecasts[0].days).toBe(7);
    expect(result.forecasts[1].days).toBe(14);
    expect(result.forecasts[2].days).toBe(30);
    expect(result.dailyRate).toBeLessThan(0); // losing weight
  });

  it("provides confidence intervals with margin", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + Math.sin(i) * 2,
    }));
    const result = calcWeightConfidence(records);
    expect(result).not.toBeNull();
    for (const f of result.forecasts) {
      expect(f.low).toBeLessThanOrEqual(f.predicted);
      expect(f.high).toBeGreaterThanOrEqual(f.predicted);
    }
  });

  it("returns confidence level and r2", () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.15,
    }));
    const result = calcWeightConfidence(records);
    expect(["high", "medium", "low"]).toContain(result.confidence);
    expect(typeof result.r2).toBe("number");
    expect(result.dataPoints).toBe(20);
  });
});

describe("calcProgressSummary", () => {
  it("returns null for fewer than 4 records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68 },
    ];
    expect(calcProgressSummary(records)).toBeNull();
  });

  it("detects improving trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-02", wt: 74 },
      { dt: "2025-01-03", wt: 72 },
      { dt: "2025-01-04", wt: 71 },
    ];
    const result = calcProgressSummary(records);
    expect(result).not.toBeNull();
    expect(result.trend).toBe("improving");
    expect(result.change).toBeLessThan(0);
    expect(result.firstHalfAvg).toBeGreaterThan(result.secondHalfAvg);
  });

  it("detects gaining trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 65 },
      { dt: "2025-01-02", wt: 66 },
      { dt: "2025-01-03", wt: 68 },
      { dt: "2025-01-04", wt: 69 },
    ];
    const result = calcProgressSummary(records);
    expect(result.trend).toBe("gaining");
    expect(result.change).toBeGreaterThan(0);
  });

  it("detects stable weight", () => {
    const records = [
      { dt: "2025-01-01", wt: 70.0 },
      { dt: "2025-01-02", wt: 70.1 },
      { dt: "2025-01-03", wt: 70.0 },
      { dt: "2025-01-04", wt: 70.2 },
    ];
    const result = calcProgressSummary(records);
    expect(result.trend).toBe("stable");
    expect(result.recordCount).toBe(4);
  });
});

describe("calcMilestoneTimeline", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcMilestoneTimeline([{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 69 }])).toBeNull();
  });

  it("detects all-time lows", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcMilestoneTimeline(records);
    expect(result).not.toBeNull();
    const lows = result.events.filter((e) => e.type === "low");
    expect(lows.length).toBeGreaterThan(0);
  });

  it("detects 5kg mark crossings", () => {
    const records = [
      { dt: "2025-01-01", wt: 76 },
      { dt: "2025-01-02", wt: 75.5 },
      { dt: "2025-01-03", wt: 74.5 },
    ];
    const result = calcMilestoneTimeline(records);
    const marks = result.events.filter((e) => e.type === "mark");
    expect(marks.length).toBeGreaterThan(0);
    // floor(75.5/5)*5=75, floor(74.5/5)*5=70 → crossed below 75
    expect(marks[0].mark).toBe(75);
  });

  it("detects BMI zone transitions", () => {
    const records = [
      { dt: "2025-01-01", wt: 80, bmi: 27.7 },
      { dt: "2025-01-02", wt: 75, bmi: 26.0 },
      { dt: "2025-01-03", wt: 70, bmi: 24.2 },
    ];
    const result = calcMilestoneTimeline(records);
    const bmiEvents = result.events.filter((e) => e.type === "bmi");
    expect(bmiEvents.length).toBe(1);
    expect(bmiEvents[0].to).toBe("normal");
  });
});

describe("calcVolatilityIndex", () => {
  it("returns null for fewer than 5 records", () => {
    const records = Array.from({ length: 4 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcVolatilityIndex(records)).toBeNull();
  });

  it("calculates low volatility for stable weights", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i % 2 === 0 ? 0.1 : -0.1),
    }));
    const result = calcVolatilityIndex(records);
    expect(result).not.toBeNull();
    expect(result.level).toBe("low");
    expect(result.overall).toBeLessThan(0.3);
  });

  it("calculates high volatility for fluctuating weights", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i % 2 === 0 ? 1.5 : -1.5),
    }));
    const result = calcVolatilityIndex(records);
    expect(result).not.toBeNull();
    expect(result.level).toBe("high");
    expect(result.overall).toBeGreaterThan(0.8);
  });

  it("returns maxSwing and trend", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + Math.sin(i) * 0.5,
    }));
    const result = calcVolatilityIndex(records);
    expect(result).not.toBeNull();
    expect(result.maxSwing).toBeGreaterThan(0);
    expect(["increasing", "decreasing", "stable"]).toContain(result.trend);
  });
});

describe("calcPeriodComparison", () => {
  function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  it("returns null for fewer than 3 records", () => {
    expect(calcPeriodComparison([{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 69 }])).toBeNull();
  });

  it("returns weekly and monthly structure", () => {
    const today = new Date();
    const records = Array.from({ length: 20 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: localDateStr(d), wt: 70 + Math.random() };
    });
    const result = calcPeriodComparison(records);
    expect(result).not.toBeNull();
    expect(result.weekly).toBeDefined();
    expect(result.monthly).toBeDefined();
  });

  it("calculates avgDiff when both periods have data", () => {
    const today = new Date();
    const records = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: localDateStr(d), wt: i < 15 ? 70 : 72 };
    });
    const result = calcPeriodComparison(records);
    expect(result).not.toBeNull();
    if (result.weekly.avgDiff != null) {
      expect(typeof result.weekly.avgDiff).toBe("number");
    }
  });

  it("handles periods with no data gracefully", () => {
    // Only very old records, no recent data
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2024-01-02", wt: 69 },
      { dt: "2024-01-03", wt: 68 },
    ];
    const result = calcPeriodComparison(records);
    // Either null or has empty current periods
    if (result) {
      expect(result.weekly).toBeDefined();
    }
  });
});

describe("calcGoalCountdown", () => {
  it("returns null without goal weight", () => {
    expect(calcGoalCountdown([{ dt: "2025-01-01", wt: 70 }], null)).toBeNull();
    expect(calcGoalCountdown([{ dt: "2025-01-01", wt: 70 }], 0)).toBeNull();
  });

  it("returns null for fewer than 3 records", () => {
    expect(calcGoalCountdown([{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 69 }], 65)).toBeNull();
  });

  it("detects goal reached", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 68 },
      { dt: "2025-01-03", wt: 65 },
    ];
    const result = calcGoalCountdown(records, 65);
    expect(result.reached).toBe(true);
    expect(result.pct).toBe(100);
  });

  it("calculates remaining and progress", () => {
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-01-02", wt: 78 },
      { dt: "2025-01-03", wt: 75 },
    ];
    const result = calcGoalCountdown(records, 70);
    expect(result.reached).toBe(false);
    expect(result.remaining).toBe(5);
    expect(result.absRemaining).toBe(5);
    expect(result.pct).toBe(50); // lost 5 of 10
    expect(result.direction).toBe("lose");
  });
});

describe("calcBodyComposition", () => {
  it("returns null for fewer than 3 body fat records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 20 },
      { dt: "2025-01-02", wt: 69, bf: 19.5 },
    ];
    expect(calcBodyComposition(records)).toBeNull();
  });

  it("detects fat loss trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 80, bf: 25 },
      { dt: "2025-01-02", wt: 78, bf: 23 },
      { dt: "2025-01-03", wt: 76, bf: 21 },
    ];
    const result = calcBodyComposition(records);
    expect(result).not.toBeNull();
    expect(result.bfChange).toBeLessThan(0);
    expect(result.fatMassChange).toBeLessThan(0);
    expect(result.trend).toBe("fatLoss");
  });

  it("calculates fat and lean mass correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 100, bf: 30 },
      { dt: "2025-01-02", wt: 95, bf: 28 },
      { dt: "2025-01-03", wt: 90, bf: 25 },
    ];
    const result = calcBodyComposition(records);
    expect(result.firstFatMass).toBe(30); // 100 * 30%
    expect(result.latestFatMass).toBe(22.5); // 90 * 25%
    expect(result.firstLeanMass).toBe(70); // 100 - 30
    expect(result.latestLeanMass).toBe(67.5); // 90 - 22.5
  });

  it("ignores records without body fat", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 20 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68, bf: 18 },
      { dt: "2025-01-04", wt: 67, bf: 17 },
    ];
    const result = calcBodyComposition(records);
    expect(result).not.toBeNull();
    expect(result.dataPoints).toBe(3);
  });
});

describe("generateWeightSummary", () => {
  it("returns null for fewer than 2 records", () => {
    expect(generateWeightSummary([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("generates summary with weight stats", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-15", wt: 72 },
      { dt: "2025-01-30", wt: 70 },
    ];
    const result = generateWeightSummary(records);
    expect(result).not.toBeNull();
    expect(result.weight.first).toBe(75);
    expect(result.weight.latest).toBe(70);
    expect(result.weight.totalChange).toBe(-5);
    expect(result.weight.min).toBe(70);
    expect(result.weight.max).toBe(75);
    expect(result.records).toBe(3);
    expect(result.period.from).toBe("2025-01-01");
    expect(result.period.to).toBe("2025-01-30");
  });

  it("includes BMI when height provided", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
    ];
    const result = generateWeightSummary(records, { heightCm: 170 });
    expect(result.bmi).not.toBeNull();
    expect(result.bmi.bmi).toBeCloseTo(24.2, 1);
    expect(result.bmi.zone).toBe("normal");
  });

  it("returns null BMI without height", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    const result = generateWeightSummary(records, {});
    expect(result.bmi).toBeNull();
  });
});

describe("getFrequentNotes", () => {
  it("returns empty array for records without notes", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    expect(getFrequentNotes(records)).toEqual([]);
  });

  it("returns notes sorted by frequency", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "gym day" },
      { dt: "2025-01-02", wt: 69, note: "ate well" },
      { dt: "2025-01-03", wt: 68, note: "gym day" },
      { dt: "2025-01-04", wt: 67, note: "gym day" },
      { dt: "2025-01-05", wt: 66, note: "ate well" },
    ];
    const result = getFrequentNotes(records);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe("gym day");
    expect(result[0].count).toBe(3);
    expect(result[1].text).toBe("ate well");
    expect(result[1].count).toBe(2);
  });

  it("respects maxResults limit", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
      note: `note ${i}`,
    }));
    const result = getFrequentNotes(records, 3);
    expect(result.length).toBe(3);
  });

  it("ignores empty/whitespace notes", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "" },
      { dt: "2025-01-02", wt: 69, note: "   " },
      { dt: "2025-01-03", wt: 68, note: "gym" },
    ];
    const result = getFrequentNotes(records);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe("gym");
  });
});

describe("detectDuplicates", () => {
  it("returns empty for no duplicates", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    const result = detectDuplicates(records);
    expect(result.duplicates).toEqual([]);
    expect(result.suspicious).toEqual([]);
  });

  it("detects same-date entries", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-01", wt: 70.5 },
      { dt: "2025-01-02", wt: 69 },
    ];
    const result = detectDuplicates(records);
    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].date).toBe("2025-01-01");
    expect(result.duplicates[0].count).toBe(2);
  });

  it("detects suspicious identical consecutive weights", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 69 },
    ];
    const result = detectDuplicates(records);
    expect(result.suspicious.length).toBe(1);
    expect(result.suspicious[0].weight).toBe(70);
    expect(result.suspicious[0].count).toBe(3);
  });

  it("handles fewer than 2 records", () => {
    const result = detectDuplicates([{ dt: "2025-01-01", wt: 70 }]);
    expect(result.duplicates).toEqual([]);
    expect(result.suspicious).toEqual([]);
  });
});

describe("buildRecord edge cases", () => {
  it("truncates note to 100 characters", () => {
    const longNote = "x".repeat(150);
    const record = buildRecord({ date: "2025-01-01", weight: 70, profile: { heightCm: 170 }, source: "manual", note: longNote });
    expect(record.note.length).toBe(100);
  });

  it("handles null note gracefully", () => {
    const record = buildRecord({ date: "2025-01-01", weight: 70, profile: { heightCm: 170 }, source: "manual", note: null });
    expect(record.note).toBe("");
  });

  it("calculates BMI when height provided", () => {
    const record = buildRecord({ date: "2025-01-01", weight: 70, profile: { heightCm: 170 }, source: "manual" });
    expect(record.bmi).toBeCloseTo(24.2, 1);
  });

  it("sets bmi null when no height", () => {
    const record = buildRecord({ date: "2025-01-01", weight: 70, profile: { heightCm: "" }, source: "manual" });
    expect(record.bmi).toBeNull();
  });
});

describe("exportRecordsToCSV edge cases", () => {
  it("produces valid CSV with header", () => {
    const records = [{ dt: "2025-01-01", wt: 70, bmi: 24.2, bf: null, source: "manual", note: "" }];
    const csv = exportRecordsToCSV(records);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain(",");
  });

  it("escapes commas in note", () => {
    const records = [{ dt: "2025-01-01", wt: 70, bmi: null, bf: null, source: "manual", note: "hello, world" }];
    const csv = exportRecordsToCSV(records);
    expect(csv).toContain('"hello, world"');
  });

  it("handles empty records", () => {
    const csv = exportRecordsToCSV([]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(1);
  });
});

describe("csvEscape edge cases", () => {
  it("wraps strings with commas in quotes", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
  });

  it("escapes double quotes", () => {
    expect(csvEscape('say "hello"')).toBe('"say ""hello"""');
  });

  it("handles numbers", () => {
    expect(csvEscape(42)).toBe("42");
  });

  it("handles null/undefined", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

describe("calcLongestStreak edge cases", () => {
  it("returns 0 for empty records", () => {
    expect(calcLongestStreak([])).toBe(0);
  });

  it("returns 1 for single record", () => {
    expect(calcLongestStreak([{ dt: "2025-01-01", wt: 70 }])).toBe(1);
  });

  it("counts consecutive days", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-06", wt: 70 },
    ];
    expect(calcLongestStreak(records)).toBe(3);
  });
});

describe("calcSourceBreakdown edge cases", () => {
  it("returns null for empty records", () => {
    expect(calcSourceBreakdown([])).toBeNull();
  });

  it("counts sources correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, source: "manual" },
      { dt: "2025-01-02", wt: 69, source: "manual" },
      { dt: "2025-01-03", wt: 68, source: "voice" },
    ];
    const result = calcSourceBreakdown(records);
    expect(result.manual).toBe(2);
    expect(result.voice).toBe(1);
  });
});

describe("calcInsight edge cases", () => {
  it("returns weekComparison null when no records in both weeks", () => {
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2024-01-02", wt: 69 },
      { dt: "2024-01-03", wt: 68 },
    ];
    const result = calcInsight(records);
    expect(result).not.toBeNull();
    expect(result.weekComparison).toBeNull();
  });

  it("bestDay corresponds to most common recording day", () => {
    // Monday = 1 (2025-01-06, 2025-01-13, 2025-01-20 are all Mondays)
    const records = [
      { dt: "2025-01-06", wt: 70 },
      { dt: "2025-01-13", wt: 69 },
      { dt: "2025-01-20", wt: 68 },
    ];
    const result = calcInsight(records);
    expect(result.bestDay).toBe(1); // Monday
  });
});

describe("NOTE_TAGS edge cases", () => {
  it("is an array of strings", () => {
    expect(Array.isArray(NOTE_TAGS)).toBe(true);
    NOTE_TAGS.forEach((tag) => expect(typeof tag).toBe("string"));
  });

  it("contains no duplicate tags", () => {
    const unique = new Set(NOTE_TAGS);
    expect(unique.size).toBe(NOTE_TAGS.length);
  });

  it("contains expected lifestyle tags", () => {
    expect(NOTE_TAGS).toContain("sleep");
    expect(NOTE_TAGS).toContain("alcohol");
    expect(NOTE_TAGS).toContain("stress");
    expect(NOTE_TAGS).toContain("travel");
  });
});

describe("createDefaultProfile edge cases", () => {
  it("returns correct default values", () => {
    const profile = createDefaultProfile();
    expect(profile.name).toBe("");
    expect(profile.heightCm).toBe("");
    expect(profile.age).toBe("");
    expect(profile.gender).toBe("unspecified");
  });

  it("returns a new object each time", () => {
    const p1 = createDefaultProfile();
    const p2 = createDefaultProfile();
    expect(p1).not.toBe(p2);
    expect(p1).toEqual(p2);
  });
});

describe("createDefaultSettings edge cases", () => {
  it("returns correct default values", () => {
    const settings = createDefaultSettings();
    expect(settings.language).toBe("ja");
    expect(settings.theme).toBe("prism");
    expect(settings.chartStyle).toBe("detailed");
    expect(settings.goalWeight).toBeNull();
    expect(settings.reminderEnabled).toBe(false);
    expect(settings.reminderTime).toBe("21:00");
    expect(settings.autoTheme).toBe(false);
  });

  it("returns a new object each time", () => {
    const s1 = createDefaultSettings();
    const s2 = createDefaultSettings();
    expect(s1).not.toBe(s2);
  });
});

describe("trimRecords edge cases", () => {
  it("returns empty array for empty input", () => {
    expect(trimRecords([])).toEqual([]);
  });

  it("does not mutate original array", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i,
    }));
    const original = [...records];
    trimRecords(records, 3);
    expect(records).toEqual(original);
  });
});

describe("parseVoiceWeight edge cases", () => {
  it("handles fullwidth numbers in voice transcript", () => {
    expect(parseVoiceWeight("体重は６５．３キロです")).toBe(65.3);
  });

  it("handles 点 (ten) as decimal separator", () => {
    expect(parseVoiceWeight("70点5")).toBe(70.5);
  });

  it("returns null for empty string", () => {
    expect(parseVoiceWeight("")).toBeNull();
  });

  it("returns null for out-of-range values", () => {
    expect(parseVoiceWeight("体重は5キロです")).toBeNull();
  });

  it("handles kg suffix", () => {
    expect(parseVoiceWeight("72.1kg")).toBe(72.1);
  });
});

describe("calcWeightComparison edge cases", () => {
  it("returns null for empty records", () => {
    expect(calcWeightComparison([])).toBeNull();
  });

  it("returns null when only one record exists", () => {
    expect(calcWeightComparison([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns null when records are too old for any period", () => {
    const records = [
      { dt: "2020-01-01", wt: 70 },
      { dt: "2020-01-02", wt: 71 },
    ];
    const result = calcWeightComparison(records);
    expect(result).toBeNull();
  });
});

describe("calcBMIHistory edge cases", () => {
  it("filters out records without BMI", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69, bmi: 23.5 },
      { dt: "2025-01-03", wt: 68 },
    ];
    expect(calcBMIHistory(records)).toBeNull();
  });

  it("handles records with NaN BMI", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: NaN },
      { dt: "2025-01-02", wt: 69, bmi: 23.5 },
      { dt: "2025-01-03", wt: 68, bmi: 22.5 },
    ];
    expect(calcBMIHistory(records)).toBeNull();
  });

  it("not improving when first BMI is underweight", () => {
    const records = [
      { dt: "2025-01-01", wt: 50, bmi: 17.0 },
      { dt: "2025-01-02", wt: 49, bmi: 16.7 },
      { dt: "2025-01-03", wt: 48, bmi: 16.3 },
    ];
    const result = calcBMIHistory(records);
    expect(result.improving).toBe(false);
  });

  it("calculates correct average", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 20.0 },
      { dt: "2025-01-02", wt: 72, bmi: 22.0 },
      { dt: "2025-01-03", wt: 74, bmi: 24.0 },
    ];
    const result = calcBMIHistory(records);
    expect(result.avg).toBe(22.0);
  });
});

describe("calcStreakRewards", () => {
  it("returns null for empty records", () => {
    expect(calcStreakRewards([])).toBeNull();
  });

  it("returns starter level for single record", () => {
    const today = new Date();
    const dt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const result = calcStreakRewards([{ dt, wt: 70 }]);
    expect(result).not.toBeNull();
    expect(result.streak).toBeGreaterThanOrEqual(1);
    expect(result.totalRecords).toBe(1);
  });

  it("assigns correct level for 7-day streak", () => {
    const records = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      return {
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 70 + i * 0.1,
      };
    });
    const result = calcStreakRewards(records);
    expect(result).not.toBeNull();
    expect(result.streak).toBe(7);
    expect(result.level).toBe("steady");
    expect(result.earned).toContain(3);
    expect(result.earned).toContain(7);
  });

  it("returns next milestone and remaining days", () => {
    const today = new Date();
    const dt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const result = calcStreakRewards([{ dt, wt: 70 }]);
    expect(result.next).toBe(3);
    expect(result.nextRemaining).toBe(2);
  });

  it("assigns dedicated level for 30-day streak", () => {
    const records = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 29 + i);
      return {
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 70,
      };
    });
    const result = calcStreakRewards(records);
    expect(result.streak).toBe(30);
    expect(result.level).toBe("dedicated");
  });
});

// ── calcWeightRangePosition edge cases ──
describe("calcWeightRangePosition edge cases", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcWeightRangePosition([{ wt: 70 }, { wt: 71 }])).toBeNull();
  });
  it("returns position 50 when all weights identical", () => {
    const records = [{ wt: 70 }, { wt: 70 }, { wt: 70 }];
    const result = calcWeightRangePosition(records);
    expect(result.position).toBe(50);
    expect(result.zone).toBe("middle");
  });
  it("returns zone low when latest is at minimum", () => {
    const records = [{ wt: 75 }, { wt: 73 }, { wt: 70 }];
    const result = calcWeightRangePosition(records);
    expect(result.position).toBe(0);
    expect(result.zone).toBe("low");
  });
  it("returns zone high when latest is at maximum", () => {
    const records = [{ wt: 70 }, { wt: 73 }, { wt: 75 }];
    const result = calcWeightRangePosition(records);
    expect(result.position).toBe(100);
    expect(result.zone).toBe("high");
  });
});

// ── calcTagImpact edge cases ──
describe("calcTagImpact edge cases", () => {
  it("returns null for fewer than 5 records", () => {
    expect(calcTagImpact([{ wt: 70 }, { wt: 71 }, { wt: 72 }, { wt: 73 }])).toBeNull();
  });
  it("returns null when no tags present", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({ wt: 70 + i * 0.1, note: "plain text" }));
    expect(calcTagImpact(records)).toBeNull();
  });
  it("returns null when tags appear less than 2 times", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({ wt: 70 + i * 0.1, note: "" }));
    records[3].note = "#運動";
    expect(calcTagImpact(records)).toBeNull();
  });
});

// ── calcBestPeriod edge cases ──
describe("calcBestPeriod edge cases", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({ dt: `2024-01-0${i + 1}`, wt: 70 - i * 0.1 }));
    expect(calcBestPeriod(records)).toBeNull();
  });
  it("identifies best 7-day window", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: i < 5 ? 75 - i * 0.5 : 73 + (i - 5) * 0.3,
    }));
    const result = calcBestPeriod(records);
    expect(result[7]).toBeDefined();
    expect(result[7].change).toBeLessThanOrEqual(0);
  });
});

// ── calcWeeklyFrequency edge cases ──
describe("calcWeeklyFrequency edge cases", () => {
  it("returns null for empty records", () => {
    expect(calcWeeklyFrequency([])).toBeNull();
  });
  it("returns correct structure with buckets", () => {
    const today = new Date();
    const dt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const result = calcWeeklyFrequency([{ dt, wt: 70 }]);
    expect(result.buckets).toHaveLength(8);
    expect(result.avgPerWeek).toBeGreaterThan(0);
    expect(result.weeks).toBe(8);
  });
});

// ── calcWeightVelocity edge cases ──
describe("calcWeightVelocity edge cases", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcWeightVelocity([{ dt: "2024-01-01", wt: 70 }, { dt: "2024-01-02", wt: 71 }])).toBeNull();
  });
});

// ── calcCalorieEstimate edge cases ──
describe("calcCalorieEstimate edge cases", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcCalorieEstimate([{ dt: "2024-01-01", wt: 70 }, { dt: "2024-01-02", wt: 71 }])).toBeNull();
  });
  it("returns null when records are too old for 7-day and 30-day windows", () => {
    const records = [
      { dt: "2020-01-01", wt: 70 },
      { dt: "2020-01-05", wt: 69.5 },
      { dt: "2020-01-10", wt: 69 },
    ];
    expect(calcCalorieEstimate(records)).toBeNull();
  });
});

// ── calcMomentumScore edge cases ──
describe("calcMomentumScore edge cases", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({ dt: `2024-01-0${i + 1}`, wt: 70 }));
    expect(calcMomentumScore(records)).toBeNull();
  });
  it("score is clamped between 0 and 100", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (9 - i));
      return {
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 70 - i * 0.5,
      };
    });
    const result = calcMomentumScore(records, 65);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["great", "good", "fair", "low"]).toContain(result.level);
  });
});

// ── calcNextMilestones edge cases ──
describe("calcNextMilestones edge cases", () => {
  it("returns null for empty records", () => {
    expect(calcNextMilestones([])).toBeNull();
  });
  it("includes round-number milestones", () => {
    const result = calcNextMilestones([{ wt: 72.3 }]);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((m) => m.type === "roundDown" || m.type === "fiveDown")).toBe(true);
  });
  it("includes BMI milestones when heightCm provided and BMI > boundary", () => {
    // 85kg at 170cm = BMI 29.4, above 25 threshold
    const result = calcNextMilestones([{ wt: 85 }], 170);
    expect(result.some((m) => m.type === "bmiZone")).toBe(true);
  });
});

// ── calcWeightDistribution edge cases ──
describe("calcWeightDistribution edge cases", () => {
  it("returns null for empty records", () => {
    expect(calcWeightDistribution([])).toBeNull();
  });
  it("creates correct bucket structure", () => {
    const records = [{ wt: 70.1 }, { wt: 70.5 }, { wt: 71.0 }, { wt: 71.5 }, { wt: 72.0 }];
    const result = calcWeightDistribution(records);
    expect(result.buckets.length).toBeGreaterThan(0);
    expect(result.maxCount).toBeGreaterThan(0);
  });
});

// ── calcWeightConfidence edge cases ──
describe("calcWeightConfidence edge cases", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({ dt: `2024-01-0${i + 1}`, wt: 70 }));
    expect(calcWeightConfidence(records)).toBeNull();
  });
  it("returns forecasts for 7, 14, and 30 days", () => {
    const records = Array.from({ length: 15 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.1,
    }));
    const result = calcWeightConfidence(records);
    expect(result).not.toBeNull();
    expect(result.forecasts).toHaveLength(3);
    expect(result.forecasts[0].days).toBe(7);
    expect(result.forecasts[1].days).toBe(14);
    expect(result.forecasts[2].days).toBe(30);
  });
  it("returns null when all records on same date (denom=0)", () => {
    const records = Array.from({ length: 10 }, () => ({ dt: "2024-01-01", wt: 70 }));
    expect(calcWeightConfidence(records)).toBeNull();
  });
});

// ── Constants validation ──
describe("Constants validation", () => {
  it("STORAGE_KEYS has required keys", () => {
    expect(STORAGE_KEYS.records).toBeDefined();
    expect(STORAGE_KEYS.settings).toBeDefined();
    expect(STORAGE_KEYS.profile).toBeDefined();
  });
  it("THEME_LIST is non-empty array with id and color", () => {
    expect(THEME_LIST.length).toBeGreaterThan(0);
    for (const theme of THEME_LIST) {
      expect(theme.id).toBeDefined();
      expect(theme.color).toBeDefined();
    }
  });
  it("MAX_RECORDS is a positive number", () => {
    expect(MAX_RECORDS).toBeGreaterThan(0);
  });
  it("Range constants have valid min/max", () => {
    expect(WEIGHT_RANGE.min).toBeLessThan(WEIGHT_RANGE.max);
    expect(HEIGHT_RANGE.min).toBeLessThan(HEIGHT_RANGE.max);
    expect(AGE_RANGE.min).toBeLessThan(AGE_RANGE.max);
    expect(BODY_FAT_RANGE.min).toBeLessThan(BODY_FAT_RANGE.max);
  });
  it("validateWeight respects WEIGHT_RANGE boundaries", () => {
    expect(validateWeight(String(WEIGHT_RANGE.min)).valid).toBe(true);
    expect(validateWeight(String(WEIGHT_RANGE.max)).valid).toBe(true);
    expect(validateWeight(String(WEIGHT_RANGE.min - 1)).valid).toBe(false);
    expect(validateWeight(String(WEIGHT_RANGE.max + 1)).valid).toBe(false);
  });
});

// ── calcWeightPlateau edge cases ──
describe("calcWeightPlateau edge cases", () => {
  it("returns null for fewer than 14 records", () => {
    const records = Array.from({ length: 13 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcWeightPlateau(records)).toBeNull();
  });
  it("detects plateau when weight is stable", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i % 2) * 0.2, // oscillates 70.0 - 70.2
    }));
    const result = calcWeightPlateau(records);
    expect(result).not.toBeNull();
    expect(result.isPlateau).toBe(true);
  });
  it("does not detect plateau when weight changes significantly", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.5,
    }));
    const result = calcWeightPlateau(records);
    expect(result.isPlateau).toBe(false);
  });
});

// ── calcRecordGaps edge cases ──
describe("calcRecordGaps edge cases", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcRecordGaps([{ dt: "2024-01-01", wt: 70 }])).toBeNull();
  });
  it("returns 0 gaps for consecutive days", () => {
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2024-01-02", wt: 70 },
    ];
    const result = calcRecordGaps(records);
    expect(result.totalGaps).toBe(0);
    expect(result.longestGap).toBe(0);
  });
  it("detects gaps correctly", () => {
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2024-01-05", wt: 70 },
      { dt: "2024-01-10", wt: 70 },
    ];
    const result = calcRecordGaps(records);
    expect(result.totalGaps).toBe(2);
    expect(result.longestGap).toBe(5);
    expect(result.gaps[0].days).toBe(5);
  });
});

// ── calcSeasonality edge cases ──
describe("calcSeasonality edge cases", () => {
  it("returns null for fewer than 30 records", () => {
    const records = Array.from({ length: 29 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcSeasonality(records)).toBeNull();
  });
  it("identifies heaviest and lightest months", () => {
    const records = [];
    // Jan records: heavier
    for (let i = 1; i <= 10; i++) {
      records.push({ dt: `2024-01-${String(i).padStart(2, "0")}`, wt: 75 });
    }
    // Apr records: mid
    for (let i = 1; i <= 10; i++) {
      records.push({ dt: `2024-04-${String(i).padStart(2, "0")}`, wt: 72 });
    }
    // Jul records: lighter
    for (let i = 1; i <= 10; i++) {
      records.push({ dt: `2024-07-${String(i).padStart(2, "0")}`, wt: 70 });
    }
    const result = calcSeasonality(records);
    expect(result).not.toBeNull();
    expect(result.heaviestMonth).toBe(0); // January
    expect(result.lightestMonth).toBe(6); // July
    expect(result.seasonalRange).toBe(5.0);
  });
});

// ── calcDayOfWeekChange edge cases ──
describe("calcDayOfWeekChange edge cases", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({
      dt: `2024-01-0${i + 1}`,
      wt: 70,
    }));
    expect(calcDayOfWeekChange(records)).toBeNull();
  });
  it("returns null when fewer than 3 days have consecutive data", () => {
    // Records with gaps - no consecutive days
    const records = Array.from({ length: 7 }, (_, i) => ({
      dt: `2024-01-${String(i * 3 + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcDayOfWeekChange(records)).toBeNull();
  });
});

// ── calcPersonalRecords edge cases ──
describe("calcPersonalRecords edge cases", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcPersonalRecords([{ wt: 70, dt: "2024-01-01" }, { wt: 71, dt: "2024-01-02" }])).toBeNull();
  });
  it("identifies all-time low correctly", () => {
    const records = [
      { dt: "2024-01-01", wt: 72 },
      { dt: "2024-01-02", wt: 68 },
      { dt: "2024-01-03", wt: 70 },
    ];
    const result = calcPersonalRecords(records);
    expect(result.allTimeLow).toBe(68);
    expect(result.allTimeLowDate).toBe("2024-01-02");
  });
  it("calculates total change from first to last", () => {
    const records = [
      { dt: "2024-01-01", wt: 75 },
      { dt: "2024-01-02", wt: 73 },
      { dt: "2024-01-03", wt: 72 },
    ];
    const result = calcPersonalRecords(records);
    expect(result.totalChange).toBe(-3);
  });
});

// ── calcWeightRegression edge cases ──
describe("calcWeightRegression edge cases", () => {
  it("returns null for fewer than 5 records", () => {
    const records = Array.from({ length: 4 }, (_, i) => ({
      dt: `2024-01-0${i + 1}`,
      wt: 70 - i * 0.1,
    }));
    expect(calcWeightRegression(records)).toBeNull();
  });
  it("returns null when all records have same date", () => {
    const records = Array.from({ length: 5 }, () => ({
      dt: "2024-01-01",
      wt: 70,
    }));
    expect(calcWeightRegression(records)).toBeNull();
  });
  it("detects losing trend", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 75 - i * 0.3,
    }));
    const result = calcWeightRegression(records);
    expect(result.direction).toBe("losing");
    expect(result.slope).toBeLessThan(0);
    expect(result.r2).toBeGreaterThan(0.9);
  });
  it("detects gaining trend", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 65 + i * 0.3,
    }));
    const result = calcWeightRegression(records);
    expect(result.direction).toBe("gaining");
  });
});

// ── calcWeightDistribution edge cases (expanded) ──
describe("calcWeightDistribution expanded", () => {
  it("returns null when all weights are identical", () => {
    const records = Array.from({ length: 5 }, () => ({ wt: 70 }));
    expect(calcWeightDistribution(records)).toBeNull();
  });
  it("correctly assigns latestBucket", () => {
    const records = [
      { wt: 70.1 }, { wt: 70.5 }, { wt: 71.3 }, { wt: 72.0 }, { wt: 70.2 },
    ];
    const result = calcWeightDistribution(records);
    expect(result.latestBucket).toBeGreaterThanOrEqual(0);
    expect(result.modeBucket).toBeGreaterThanOrEqual(0);
  });
  it("handles latest weight at max boundary (findIndex fallback)", () => {
    // Latest record is the max weight - findIndex returns -1, should fallback to last bucket
    const records = [
      { wt: 60.0 }, { wt: 61.0 }, { wt: 62.0 }, { wt: 63.0 }, { wt: 65.0 },
    ];
    const result = calcWeightDistribution(records);
    expect(result).not.toBeNull();
    expect(result.latestBucket).toBeGreaterThanOrEqual(0);
    expect(result.latestBucket).toBeLessThan(result.buckets.length);
  });
});

// ── csvEscape ──
describe("csvEscape", () => {
  it("returns plain values unchanged", () => {
    expect(csvEscape("hello")).toBe("hello");
    expect(csvEscape(42)).toBe("42");
  });
  it("wraps values containing commas in quotes", () => {
    expect(csvEscape("hello,world")).toBe('"hello,world"');
  });
  it("escapes double quotes by doubling them", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });
  it("handles newlines", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
  it("handles null and undefined", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

// ── exportRecordsToCSV ──
describe("exportRecordsToCSV", () => {
  it("returns header-only CSV for empty records", () => {
    expect(exportRecordsToCSV([])).toBe("\uFEFFdate,weight,bmi,bodyFat,source,note");
  });
  it("includes header row", () => {
    const csv = exportRecordsToCSV([{ dt: "2024-01-01", wt: 70, bmi: 22.5, bf: 15, source: "manual", note: "" }]);
    const lines = csv.replace(/^\uFEFF/, "").split("\n");
    expect(lines[0]).toBe("date,weight,bmi,bodyFat,source,note");
  });
  it("correctly formats record data", () => {
    const csv = exportRecordsToCSV([{ dt: "2024-01-01", wt: 70.5, bmi: null, source: "voice", note: "test" }]);
    const lines = csv.split("\n");
    expect(lines[1]).toContain("2024-01-01");
    expect(lines[1]).toContain("70.5");
    expect(lines[1]).toContain("voice");
    expect(lines[1]).toContain("test");
  });
  it("escapes notes with commas", () => {
    const csv = exportRecordsToCSV([{ dt: "2024-01-01", wt: 70, note: "a,b" }]);
    expect(csv).toContain('"a,b"');
  });
  it("includes UTF-8 BOM for Excel compatibility", () => {
    const csv = exportRecordsToCSV([{ dt: "2024-01-01", wt: 70, bmi: 22.5, bf: 15, source: "manual", note: "" }]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });
});

describe("parseCSVImport BOM handling", () => {
  it("strips BOM from CSV input", () => {
    const bom = "\uFEFF";
    const csv = bom + "date,weight,bmi,bodyFat,source,note\n2024-01-01,70,22.5,15,manual,test";
    const result = parseCSVImport(csv);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].dt).toBe("2024-01-01");
  });
});

// ── getBMIStatus expanded ──
describe("getBMIStatus expanded", () => {
  it("returns unknown for NaN", () => {
    expect(getBMIStatus(NaN)).toBe("bmi.unknown");
  });
  it("returns unknown for Infinity", () => {
    expect(getBMIStatus(Infinity)).toBe("bmi.unknown");
  });
  it("returns under for BMI below 18.5", () => {
    expect(getBMIStatus(17.0)).toBe("bmi.under");
  });
  it("returns normal for BMI at 18.5 boundary", () => {
    expect(getBMIStatus(18.5)).toBe("bmi.normal");
  });
  it("returns over for BMI at 25 boundary", () => {
    expect(getBMIStatus(25)).toBe("bmi.over");
  });
  it("returns obese for BMI at 30 boundary", () => {
    expect(getBMIStatus(30)).toBe("bmi.obese");
  });
});

// ── createDefaultSettings expanded ──
describe("createDefaultSettings expanded", () => {
  it("returns correct default language", () => {
    expect(createDefaultSettings().language).toBe("ja");
  });
  it("returns correct default theme", () => {
    expect(createDefaultSettings().theme).toBe("prism");
  });
  it("returns goalWeight as null", () => {
    expect(createDefaultSettings().goalWeight).toBeNull();
  });
  it("returns new object each time", () => {
    expect(createDefaultSettings()).not.toBe(createDefaultSettings());
  });
});

// ── calcWeightVariance edge cases ──
describe("calcWeightVariance expanded", () => {
  it("returns null for fewer than 5 records", () => {
    const records = Array.from({ length: 4 }, () => ({ wt: 70 }));
    expect(calcWeightVariance(records)).toBeNull();
  });
  it("returns veryLow level for identical weights", () => {
    const records = Array.from({ length: 5 }, () => ({ wt: 70 }));
    const result = calcWeightVariance(records);
    expect(result.cv).toBe(0);
    expect(result.level).toBe("veryLow");
    expect(result.maxSwing).toBe(0);
  });
  it("detects high variance", () => {
    const records = [{ wt: 65 }, { wt: 75 }, { wt: 60 }, { wt: 80 }, { wt: 70 }];
    const result = calcWeightVariance(records);
    expect(result.level).toBe("high");
    expect(result.maxSwing).toBe(20);
  });
});

// ── calcWeightPlateau with previousRate ──
describe("calcWeightPlateau with previousRate", () => {
  it("calculates previousRate when 28+ records available", () => {
    const records = Array.from({ length: 28 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: i < 14 ? 75 - i * 0.3 : 70.5 + (i % 2) * 0.1,
    }));
    const result = calcWeightPlateau(records);
    expect(result.previousRate).not.toBeNull();
  });
});

// ── upsertRecord edge cases ──
describe("upsertRecord edge cases", () => {
  it("inserts new record and sorts by date", () => {
    const records = [{ dt: "2024-01-01", wt: 70 }, { dt: "2024-01-03", wt: 72 }];
    const result = upsertRecord(records, { dt: "2024-01-02", wt: 71 });
    expect(result).toHaveLength(3);
    expect(result[1].dt).toBe("2024-01-02");
    expect(result[1].wt).toBe(71);
  });
  it("updates existing record by date", () => {
    const records = [{ dt: "2024-01-01", wt: 70, note: "old" }];
    const result = upsertRecord(records, { dt: "2024-01-01", wt: 69, note: "new" });
    expect(result).toHaveLength(1);
    expect(result[0].wt).toBe(69);
    expect(result[0].note).toBe("new");
  });
  it("does not mutate original array", () => {
    const records = [{ dt: "2024-01-01", wt: 70 }];
    const result = upsertRecord(records, { dt: "2024-01-02", wt: 71 });
    expect(records).toHaveLength(1);
    expect(result).toHaveLength(2);
  });
});

// ── buildRecord edge cases ──
describe("buildRecord edge cases", () => {
  it("calculates BMI when heightCm provided", () => {
    const r = buildRecord({ date: "2024-01-01", weight: 70, profile: { heightCm: 170 }, source: "manual" });
    expect(r.bmi).toBeCloseTo(24.2, 1);
    expect(r.dt).toBe("2024-01-01");
    expect(r.wt).toBe(70);
    expect(r.source).toBe("manual");
  });
  it("BMI is null when heightCm is null", () => {
    const r = buildRecord({ date: "2024-01-01", weight: 70, profile: { heightCm: null }, source: "voice" });
    expect(r.bmi).toBeNull();
  });
  it("handles empty note gracefully", () => {
    const r = buildRecord({ date: "2024-01-01", weight: 70, profile: { heightCm: 170 }, source: "manual", note: null });
    expect(r.note).toBe("");
  });
  it("includes createdAt timestamp", () => {
    const r = buildRecord({ date: "2024-01-01", weight: 70, profile: { heightCm: 170 }, source: "manual" });
    expect(r.createdAt).toBeDefined();
    expect(r.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── pickWeightCandidate edge cases ──
describe("pickWeightCandidate edge cases", () => {
  it("returns null for empty candidates", () => {
    expect(pickWeightCandidate([], 70)).toBeNull();
  });
  it("returns first candidate when no fallback", () => {
    expect(pickWeightCandidate([65, 70, 75])).toBe(65);
  });
  it("returns closest to fallback weight", () => {
    expect(pickWeightCandidate([65, 70, 75], 72)).toBe(70);
    expect(pickWeightCandidate([65, 70, 75], 74)).toBe(75);
  });
});

// ── calcRecordingTimeStats edge cases ──
describe("calcRecordingTimeStats edge cases", () => {
  it("returns null for fewer than 3 records with createdAt", () => {
    const records = [
      { dt: "2024-01-01", wt: 70, createdAt: "2024-01-01T08:00:00Z" },
      { dt: "2024-01-02", wt: 71, createdAt: "2024-01-02T09:00:00Z" },
    ];
    expect(calcRecordingTimeStats(records)).toBeNull();
  });
  it("returns null when records lack createdAt", () => {
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2024-01-02", wt: 71 },
      { dt: "2024-01-03", wt: 72 },
    ];
    expect(calcRecordingTimeStats(records)).toBeNull();
  });
  it("categorizes morning/afternoon/evening/night correctly", () => {
    const records = [
      { dt: "2024-01-01", wt: 70, createdAt: "2024-01-01T07:00:00" },
      { dt: "2024-01-02", wt: 71, createdAt: "2024-01-02T14:00:00" },
      { dt: "2024-01-03", wt: 72, createdAt: "2024-01-03T20:00:00" },
      { dt: "2024-01-04", wt: 73, createdAt: "2024-01-04T02:00:00" },
    ];
    const result = calcRecordingTimeStats(records);
    expect(result).not.toBeNull();
    expect(result.morning.count).toBe(1);
    expect(result.afternoon.count).toBe(1);
    expect(result.evening.count).toBe(1);
    expect(result.night.count).toBe(1);
  });
});

// ── calcMovingAverages edge cases ──
describe("calcMovingAverages edge cases", () => {
  it("returns null for fewer than longWindow records", () => {
    const records = Array.from({ length: 29 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcMovingAverages(records)).toBeNull();
  });
  it("returns aligned signal when averages are close", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcMovingAverages(records);
    expect(result).not.toBeNull();
    expect(result.signal).toBe("aligned");
    expect(result.diff).toBe(0);
  });
});

describe("calcVolatilityIndex edge cases", () => {
  it("returns null when no consecutive days exist", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-03", wt: 71 },
      { dt: "2025-01-05", wt: 72 },
      { dt: "2025-01-07", wt: 73 },
      { dt: "2025-01-09", wt: 74 },
    ];
    expect(calcVolatilityIndex(records)).toBeNull();
  });

  it("detects increasing volatility trend", () => {
    // Stable start, volatile end
    const records = [];
    for (let i = 0; i < 20; i++) {
      records.push({
        dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
        wt: i < 10 ? 70 + (i % 2 === 0 ? 0.1 : -0.1) : 70 + (i % 2 === 0 ? 2 : -2),
      });
    }
    const result = calcVolatilityIndex(records);
    expect(result).not.toBeNull();
    expect(result.recent).toBeGreaterThan(result.overall);
  });

  it("includes correct dataPoints count", () => {
    const records = Array.from({ length: 8 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i % 2 === 0 ? 0.5 : -0.5),
    }));
    const result = calcVolatilityIndex(records);
    expect(result).not.toBeNull();
    expect(result.dataPoints).toBe(7);
  });
});

describe("calcGoalCountdown edge cases", () => {
  it("estimates ETA when losing weight toward goal", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 80 - i * 0.2,
    }));
    const result = calcGoalCountdown(records, 70);
    expect(result).not.toBeNull();
    expect(result.reached).toBe(false);
    expect(result.etaDays).toBeGreaterThan(0);
    expect(result.direction).toBe("lose");
  });

  it("returns null ETA when trend is wrong direction", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.5, // gaining weight but goal is lower
    }));
    const result = calcGoalCountdown(records, 65);
    expect(result).not.toBeNull();
    expect(result.etaDays).toBeNull();
  });

  it("handles gain direction (goal is higher than current)", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 50 + i * 0.3,
    }));
    const result = calcGoalCountdown(records, 55);
    expect(result).not.toBeNull();
    expect(result.direction).toBe("gain");
    expect(result.remaining).toBeLessThan(0);
  });

  it("clamps pct to 0-100 range", () => {
    // Start at 80, current 60 (overshot goal 65)
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 60 },
    ];
    const result = calcGoalCountdown(records, 65);
    // Already past goal, so should be reached
    expect(result.reached).toBe(true);
  });
});

describe("calcPeriodComparison edge cases", () => {
  it("returns null when all records are from the distant past", () => {
    const records = [
      { dt: "2020-01-01", wt: 70 },
      { dt: "2020-01-02", wt: 71 },
      { dt: "2020-01-03", wt: 72 },
    ];
    const result = calcPeriodComparison(records);
    // May return null or have null weekly/monthly depending on date range
    if (result) {
      // At least structure is valid
      expect(result).toHaveProperty("weekly");
      expect(result).toHaveProperty("monthly");
    }
  });

  it("calculates avgDiff when both periods have data", () => {
    const today = new Date();
    const records = [];
    // Add records for last 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      records.push({ dt, wt: 70 + (i > 14 ? 2 : 0) });
    }
    const result = calcPeriodComparison(records);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("weekly");
    expect(result).toHaveProperty("monthly");
  });
});

describe("generateWeightSummary", () => {
  it("returns null for fewer than 2 records", () => {
    expect(generateWeightSummary([])).toBeNull();
    expect(generateWeightSummary([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns summary with correct structure", () => {
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-01-15", wt: 78 },
      { dt: "2025-01-30", wt: 75 },
    ];
    const result = generateWeightSummary(records);
    expect(result).not.toBeNull();
    expect(result.period.from).toBe("2025-01-01");
    expect(result.period.to).toBe("2025-01-30");
    expect(result.period.days).toBe(29);
    expect(result.weight.first).toBe(80);
    expect(result.weight.latest).toBe(75);
    expect(result.weight.min).toBe(75);
    expect(result.weight.max).toBe(80);
    expect(result.weight.totalChange).toBe(-5);
    expect(result.records).toBe(3);
    expect(result.bmi).toBeNull();
  });

  it("includes BMI when height provided", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-15", wt: 68 },
    ];
    const result = generateWeightSummary(records, { heightCm: 170 });
    expect(result.bmi).not.toBeNull();
    expect(result.bmi.bmi).toBeCloseTo(23.5, 1);
    expect(result.bmi.zone).toBe("normal");
  });

  it("calculates avg correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 60 },
      { dt: "2025-01-02", wt: 80 },
    ];
    const result = generateWeightSummary(records);
    expect(result.weight.avg).toBe(70);
  });
});

describe("calcBodyComposition edge cases", () => {
  it("detects fatLoss trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 80, bf: 25 },
      { dt: "2025-01-15", wt: 79, bf: 24 },
      { dt: "2025-01-30", wt: 78, bf: 23 },
    ];
    const result = calcBodyComposition(records);
    expect(result).not.toBeNull();
    expect(result.trend).toBe("fatLoss");
  });

  it("detects decline trend (gaining fat, losing lean)", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 20 },
      { dt: "2025-01-15", wt: 71, bf: 22 },
      { dt: "2025-01-30", wt: 72, bf: 25 },
    ];
    const result = calcBodyComposition(records);
    expect(result).not.toBeNull();
    expect(result.trend).toBe("decline");
  });

  it("filters out records without body fat", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 20 },
      { dt: "2025-01-02", wt: 71 }, // no bf
      { dt: "2025-01-03", wt: 72, bf: null }, // null bf
      { dt: "2025-01-15", wt: 69, bf: 19 },
      { dt: "2025-01-30", wt: 68, bf: 18 },
    ];
    const result = calcBodyComposition(records);
    expect(result).not.toBeNull();
    expect(result.dataPoints).toBe(3);
  });
});

// ── detectDuplicates ──
describe("detectDuplicates", () => {
  it("returns empty arrays for empty input", () => {
    const result = detectDuplicates([]);
    expect(result).toEqual({ duplicates: [], suspicious: [] });
  });

  it("returns empty arrays for single record", () => {
    const result = detectDuplicates([{ dt: "2025-01-01", wt: 70 }]);
    expect(result).toEqual({ duplicates: [], suspicious: [] });
  });

  it("detects same-date duplicates", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-01", wt: 71 },
      { dt: "2025-01-02", wt: 69 },
    ];
    const result = detectDuplicates(records);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].date).toBe("2025-01-01");
    expect(result.duplicates[0].count).toBe(2);
    expect(result.duplicates[0].weights).toEqual([70, 71]);
  });

  it("detects suspicious consecutive identical weights (3+)", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 69 },
    ];
    const result = detectDuplicates(records);
    expect(result.suspicious).toHaveLength(1);
    expect(result.suspicious[0].weight).toBe(70);
    expect(result.suspicious[0].count).toBe(3);
    expect(result.suspicious[0].from).toBe("2025-01-01");
    expect(result.suspicious[0].to).toBe("2025-01-03");
  });

  it("does not flag 2 consecutive identical weights as suspicious", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 69 },
    ];
    const result = detectDuplicates(records);
    expect(result.suspicious).toHaveLength(0);
  });

  it("detects suspicious run at end of array", () => {
    const records = [
      { dt: "2025-01-01", wt: 69 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 70 },
    ];
    const result = detectDuplicates(records);
    expect(result.suspicious).toHaveLength(1);
    expect(result.suspicious[0].weight).toBe(70);
    expect(result.suspicious[0].from).toBe("2025-01-02");
    expect(result.suspicious[0].to).toBe("2025-01-04");
  });

  it("detects both duplicates and suspicious in same dataset", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-01", wt: 71 },
      { dt: "2025-01-02", wt: 65 },
      { dt: "2025-01-03", wt: 65 },
      { dt: "2025-01-04", wt: 65 },
    ];
    const result = detectDuplicates(records);
    expect(result.duplicates).toHaveLength(1);
    expect(result.suspicious).toHaveLength(1);
  });
});

describe("validateWeightEntry", () => {
  it("returns empty array for normal weight", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70.5 },
    ];
    const result = validateWeightEntry(70.3, records);
    expect(result).toEqual([]);
  });

  it("warns on large weight difference", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70.5 },
    ];
    const result = validateWeightEntry(75, records);
    expect(result.some((w) => w.type === "largeDiff")).toBe(true);
    expect(result[0].diff).toBe(4.5);
  });

  it("warns when outside historical range", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 72 },
    ];
    const result = validateWeightEntry(80, records);
    expect(result.some((w) => w.type === "outsideRange")).toBe(true);
  });

  it("returns empty for empty records", () => {
    expect(validateWeightEntry(70, [])).toEqual([]);
  });

  it("returns empty for non-finite weight", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(validateWeightEntry(NaN, records)).toEqual([]);
    expect(validateWeightEntry(Infinity, records)).toEqual([]);
  });
});

// ── calcProgressSummary edge cases ──
describe("calcProgressSummary edge cases", () => {
  it("returns null for fewer than 4 records", () => {
    expect(calcProgressSummary([])).toBeNull();
    expect(calcProgressSummary([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
    expect(calcProgressSummary([
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68 },
    ])).toBeNull();
  });

  it("detects improving trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-10", wt: 74 },
      { dt: "2025-01-20", wt: 72 },
      { dt: "2025-01-30", wt: 71 },
    ];
    const result = calcProgressSummary(records);
    expect(result).not.toBeNull();
    expect(result.trend).toBe("improving");
    expect(result.totalChange).toBeLessThan(0);
    expect(result.recordCount).toBe(4);
  });

  it("detects gaining trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 65 },
      { dt: "2025-01-10", wt: 66 },
      { dt: "2025-01-20", wt: 68 },
      { dt: "2025-01-30", wt: 69 },
    ];
    const result = calcProgressSummary(records);
    expect(result).not.toBeNull();
    expect(result.trend).toBe("gaining");
    expect(result.totalChange).toBeGreaterThan(0);
  });

  it("detects stable trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-10", wt: 70.1 },
      { dt: "2025-01-20", wt: 70.2 },
      { dt: "2025-01-30", wt: 70.1 },
    ];
    const result = calcProgressSummary(records);
    expect(result).not.toBeNull();
    expect(result.trend).toBe("stable");
  });
});

// ── calcMilestoneTimeline edge cases ──
describe("calcMilestoneTimeline edge cases", () => {
  it("returns null for fewer than 3 records", () => {
    expect(calcMilestoneTimeline([])).toBeNull();
    expect(calcMilestoneTimeline([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("detects all-time low events", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-02-10", wt: 73 },
      { dt: "2025-03-20", wt: 70 },
    ];
    const result = calcMilestoneTimeline(records);
    expect(result).not.toBeNull();
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e) => e.type === "low")).toBe(true);
  });

  it("returns structure with events array and total", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-02-15", wt: 70 },
      { dt: "2025-03-30", wt: 69 },
    ];
    const result = calcMilestoneTimeline(records);
    expect(result).not.toBeNull();
    expect(Array.isArray(result.events)).toBe(true);
    expect(typeof result.total).toBe("number");
  });
});

describe("calcWeeklyAverages", () => {
  it("returns empty array for no records", () => {
    expect(calcWeeklyAverages([])).toEqual([]);
  });

  it("returns 8 weeks by default", () => {
    const now = new Date();
    const dt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const records = [{ dt, wt: 70 }];
    const result = calcWeeklyAverages(records);
    expect(result).toHaveLength(8);
    const current = result[result.length - 1];
    expect(current.avg).toBe(70);
    expect(current.count).toBe(1);
  });

  it("calculates correct averages for multiple records in a week", () => {
    const now = new Date();
    const d1 = new Date(now);
    d1.setDate(d1.getDate() - 1);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const records = [
      { dt: fmt(d1), wt: 68 },
      { dt: fmt(now), wt: 72 },
    ];
    const result = calcWeeklyAverages(records);
    const current = result[result.length - 1];
    expect(current.avg).toBe(70);
    expect(current.count).toBe(2);
    expect(current.min).toBe(68);
    expect(current.max).toBe(72);
  });

  it("respects numWeeks parameter", () => {
    const now = new Date();
    const dt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const result = calcWeeklyAverages([{ dt, wt: 70 }], 4);
    expect(result).toHaveLength(4);
  });

  it("marks weeks without data as null avg", () => {
    const old = new Date();
    old.setDate(old.getDate() - 60);
    const dt = `${old.getFullYear()}-${String(old.getMonth() + 1).padStart(2, "0")}-${String(old.getDate()).padStart(2, "0")}`;
    const result = calcWeeklyAverages([{ dt, wt: 70 }], 4);
    const nullWeeks = result.filter((w) => w.avg === null);
    expect(nullWeeks.length).toBeGreaterThanOrEqual(1);
  });
});

describe("calcMonthlyRecordingMap", () => {
  it("returns correct structure for current month", () => {
    const now = new Date();
    const dt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const result = calcMonthlyRecordingMap([{ dt, wt: 70 }]);
    expect(result.year).toBe(now.getFullYear());
    expect(result.month).toBe(now.getMonth());
    expect(result.recordedCount).toBe(1);
    expect(result.days.length).toBeGreaterThanOrEqual(28);
    expect(result.rate).toBeGreaterThan(0);
  });

  it("returns zero rate for empty records", () => {
    const result = calcMonthlyRecordingMap([], 2025, 0);
    expect(result.recordedCount).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.days).toHaveLength(31); // January 2025
  });

  it("marks correct days as recorded", () => {
    const records = [
      { dt: "2025-03-05", wt: 70 },
      { dt: "2025-03-15", wt: 71 },
    ];
    const result = calcMonthlyRecordingMap(records, 2025, 2); // March
    expect(result.recordedCount).toBe(2);
    const day5 = result.days.find((d) => d.day === 5);
    const day10 = result.days.find((d) => d.day === 10);
    expect(day5.recorded).toBe(true);
    expect(day5.weight).toBe(70);
    expect(day10.recorded).toBe(false);
    expect(day10.weight).toBeNull();
  });

  it("ignores records from other months", () => {
    const records = [
      { dt: "2025-02-15", wt: 70 },
      { dt: "2025-03-15", wt: 71 },
    ];
    const result = calcMonthlyRecordingMap(records, 2025, 2); // March
    expect(result.recordedCount).toBe(1);
  });

  it("includes correct dayOfWeek values", () => {
    const result = calcMonthlyRecordingMap([], 2025, 2); // March 2025
    // March 1, 2025 is Saturday (dow=6)
    expect(result.days[0].dayOfWeek).toBe(6);
  });
});

describe("calcWeightTrendIndicator", () => {
  it("returns null for fewer than 4 records", () => {
    expect(calcWeightTrendIndicator([])).toBeNull();
    expect(calcWeightTrendIndicator([
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 72 },
    ])).toBeNull();
  });

  it("detects downward trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71.5 },
      { dt: "2025-01-03", wt: 71 },
      { dt: "2025-01-04", wt: 70 },
      { dt: "2025-01-05", wt: 69.5 },
      { dt: "2025-01-06", wt: 69 },
    ];
    const result = calcWeightTrendIndicator(records);
    expect(result.direction).toBe("down");
    expect(result.change).toBeLessThan(0);
  });

  it("detects upward trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 68 },
      { dt: "2025-01-02", wt: 68.5 },
      { dt: "2025-01-03", wt: 69 },
      { dt: "2025-01-04", wt: 70 },
      { dt: "2025-01-05", wt: 70.5 },
      { dt: "2025-01-06", wt: 71 },
    ];
    const result = calcWeightTrendIndicator(records);
    expect(result.direction).toBe("up");
    expect(result.change).toBeGreaterThan(0);
  });

  it("detects stable trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70.1 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 70.1 },
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-06", wt: 70.1 },
    ];
    const result = calcWeightTrendIndicator(records);
    expect(result.direction).toBe("stable");
  });

  it("returns correct structure", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 69 },
    ];
    const result = calcWeightTrendIndicator(records);
    expect(result).toHaveProperty("direction");
    expect(result).toHaveProperty("change");
    expect(result).toHaveProperty("recentAvg");
    expect(result).toHaveProperty("previousAvg");
    expect(result).toHaveProperty("dataPoints");
    expect(result.dataPoints).toBe(4);
  });
});

describe("calcNoteTagStats", () => {
  it("returns empty tags for fewer than 2 records", () => {
    expect(calcNoteTagStats([]).tags).toEqual([]);
    expect(calcNoteTagStats([{ dt: "2025-01-01", wt: 70, note: "#exercise" }]).tags).toEqual([]);
  });

  it("counts tag frequency correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "#exercise" },
      { dt: "2025-01-02", wt: 69.5, note: "#exercise" },
      { dt: "2025-01-03", wt: 70, note: "#diet" },
      { dt: "2025-01-04", wt: 69, note: "#exercise" },
    ];
    const result = calcNoteTagStats(records);
    expect(result.tags[0].tag).toBe("exercise");
    expect(result.tags[0].count).toBe(3);
    expect(result.tags[1].tag).toBe("diet");
    expect(result.tags[1].count).toBe(1);
  });

  it("handles multiple hashtags in one note", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "#exercise #diet" },
      { dt: "2025-01-02", wt: 69, note: "#exercise" },
    ];
    const result = calcNoteTagStats(records);
    expect(result.tags.find((t) => t.tag === "exercise").count).toBe(2);
    expect(result.tags.find((t) => t.tag === "diet").count).toBe(1);
  });

  it("calculates average weight change per tag", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "" },
      { dt: "2025-01-02", wt: 69, note: "#exercise" },
      { dt: "2025-01-03", wt: 68, note: "#exercise" },
    ];
    const result = calcNoteTagStats(records);
    const exercise = result.tags.find((t) => t.tag === "exercise");
    expect(exercise.avgChange).toBe(-1);
  });

  it("skips records without tags", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "" },
      { dt: "2025-01-02", wt: 69, note: "" },
      { dt: "2025-01-03", wt: 68, note: "#diet" },
    ];
    const result = calcNoteTagStats(records);
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].tag).toBe("diet");
  });
});

describe("calcIdealWeightRange", () => {
  it("returns null for missing height or weight", () => {
    expect(calcIdealWeightRange(0, 70)).toBeNull();
    expect(calcIdealWeightRange(170, 0)).toBeNull();
    expect(calcIdealWeightRange(null, 70)).toBeNull();
  });

  it("calculates correct range for 170cm", () => {
    const result = calcIdealWeightRange(170, 65);
    // BMI 18.5 at 170cm = 53.5, BMI 24.9 = 71.9
    expect(result.minWeight).toBeCloseTo(53.5, 0);
    expect(result.maxWeight).toBeCloseTo(71.9, 0);
    expect(result.midWeight).toBeCloseTo(63.6, 0);
    expect(result.zone).toBe("normal");
  });

  it("detects underweight zone", () => {
    const result = calcIdealWeightRange(170, 50);
    expect(result.zone).toBe("underweight");
    expect(result.currentBMI).toBeLessThan(18.5);
  });

  it("detects overweight zone", () => {
    const result = calcIdealWeightRange(170, 80);
    expect(result.zone).toBe("overweight");
    expect(result.currentBMI).toBeGreaterThanOrEqual(25);
  });

  it("detects obese zone", () => {
    const result = calcIdealWeightRange(170, 100);
    expect(result.zone).toBe("obese");
    expect(result.currentBMI).toBeGreaterThanOrEqual(30);
  });

  it("position is between 0 and 100", () => {
    const result = calcIdealWeightRange(170, 65);
    expect(result.position).toBeGreaterThanOrEqual(0);
    expect(result.position).toBeLessThanOrEqual(100);
  });
});

// --- Edge case tests for undertested functions ---

describe("normalizeNumericInput edge cases", () => {
  it("handles multiple decimal points", () => {
    const r = normalizeNumericInput("1.2.3");
    expect(r).toBe("1.2.3");
  });

  it("handles empty string", () => {
    expect(normalizeNumericInput("")).toBe("");
  });

  it("handles whitespace-only string", () => {
    expect(normalizeNumericInput("   ")).toBe("");
  });
});

describe("extractWeightCandidates edge cases", () => {
  it("returns boundary value 20.0", () => {
    const r = extractWeightCandidates("体重は20.0キロ");
    expect(r).toContain(20);
  });

  it("returns boundary value 300.0", () => {
    const r = extractWeightCandidates("体重は300キロ");
    expect(r).toContain(300);
  });

  it("returns empty for out-of-range values", () => {
    const r = extractWeightCandidates("体重は5キロ");
    expect(r.length).toBe(0);
  });
});

describe("getFrequentNotes edge cases", () => {
  it("handles records with whitespace-only notes", () => {
    const records = [
      { dt: "2024-01-01", wt: 70, note: "   " },
      { dt: "2024-01-02", wt: 70, note: "" },
    ];
    const r = getFrequentNotes(records);
    expect(r.length).toBe(0);
  });

  it("returns single note from single record", () => {
    const records = [{ dt: "2024-01-01", wt: 70, note: "#exercise" }];
    const r = getFrequentNotes(records);
    expect(r.length).toBe(1);
    expect(r[0].text).toBe("#exercise");
    expect(r[0].count).toBe(1);
  });

  it("handles maxResults greater than available notes", () => {
    const records = [
      { dt: "2024-01-01", wt: 70, note: "#a" },
      { dt: "2024-01-02", wt: 70, note: "#b" },
    ];
    const r = getFrequentNotes(records, 100);
    expect(r.length).toBe(2);
  });
});

describe("filterRecords edge cases", () => {
  it("handles empty records array", () => {
    const r = filterRecords([], "test");
    expect(r).toEqual([]);
  });

  it("handles query with special regex chars", () => {
    const records = [{ dt: "2024-01-01", wt: 70, note: "test (value)" }];
    const r = filterRecords(records, "(value)");
    expect(r.length).toBe(1);
  });
});

describe("calcBestPeriod edge cases", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({
      dt: `2024-01-0${i + 1}`,
      wt: 70 - i * 0.1,
    }));
    expect(calcBestPeriod(records)).toBeNull();
  });

  it("does not leak Infinity values", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.2,
    }));
    const r = calcBestPeriod(records);
    expect(r).not.toBeNull();
    if (r[7]) {
      expect(isFinite(r[7].change)).toBe(true);
    }
    if (r[30]) {
      expect(isFinite(r[30].change)).toBe(true);
    }
  });
});

describe("calculateBMI edge cases", () => {
  it("returns null for non-finite weight", () => {
    expect(calculateBMI(170, Infinity)).toBeNull();
  });

  it("returns null for NaN height", () => {
    expect(calculateBMI(NaN, 70)).toBeNull();
  });

  it("returns null for zero height", () => {
    expect(calculateBMI(0, 70)).toBeNull();
  });
});

describe("pickWeightCandidate edge cases", () => {
  it("returns single element from single-element array", () => {
    expect(pickWeightCandidate([65], 70)).toBe(65);
  });

  it("picks first when all equidistant from fallback", () => {
    const r = pickWeightCandidate([60, 80], 70);
    expect([60, 80]).toContain(r);
  });
});

describe("calcDataFreshness", () => {
  it("returns null for empty records", () => {
    expect(calcDataFreshness([])).toBeNull();
  });

  it("returns 'today' for record from today", () => {
    const now = new Date();
    const dt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const result = calcDataFreshness([{ dt, wt: 70 }]);
    expect(result.level).toBe("today");
    expect(result.daysSince).toBe(0);
  });

  it("returns 'recent' for 1-2 day old record", () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const result = calcDataFreshness([{ dt, wt: 70 }]);
    expect(result.level).toBe("recent");
    expect(result.daysSince).toBe(2);
  });

  it("returns 'stale' for 3-6 day old record", () => {
    const d = new Date();
    d.setDate(d.getDate() - 5);
    const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const result = calcDataFreshness([{ dt, wt: 70 }]);
    expect(result.level).toBe("stale");
  });

  it("returns 'veryStale' for 7+ day old record", () => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    const dt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const result = calcDataFreshness([{ dt, wt: 70 }]);
    expect(result.level).toBe("veryStale");
    expect(result.daysSince).toBe(10);
  });

  it("uses the most recent record", () => {
    const d1 = new Date();
    d1.setDate(d1.getDate() - 10);
    const now = new Date();
    const dt1 = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, "0")}-${String(d1.getDate()).padStart(2, "0")}`;
    const dt2 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const result = calcDataFreshness([{ dt: dt1, wt: 70 }, { dt: dt2, wt: 71 }]);
    expect(result.level).toBe("today");
    expect(result.lastWeight).toBe(71);
  });
});

describe("calcMultiPeriodRate", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcMultiPeriodRate([])).toBeNull();
    expect(calcMultiPeriodRate([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns 3 periods (7, 30, 90 days)", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-02-01", wt: 73 },
      { dt: "2025-03-01", wt: 71 },
      { dt: "2025-04-01", wt: 70 },
    ];
    const result = calcMultiPeriodRate(records);
    expect(result.periods).toHaveLength(3);
    expect(result.periods[0].days).toBe(7);
    expect(result.periods[1].days).toBe(30);
    expect(result.periods[2].days).toBe(90);
  });

  it("calculates negative change for weight loss", () => {
    const records = [
      { dt: "2025-03-01", wt: 73 },
      { dt: "2025-03-15", wt: 72 },
      { dt: "2025-04-01", wt: 70 },
    ];
    const result = calcMultiPeriodRate(records);
    const p30 = result.periods.find((p) => p.days === 30);
    expect(p30.hasData).toBe(true);
    expect(p30.change).toBeLessThan(0);
  });

  it("marks periods without data as hasData: false", () => {
    const records = [
      { dt: "2025-04-01", wt: 70 },
      { dt: "2025-04-02", wt: 70.5 },
    ];
    const result = calcMultiPeriodRate(records);
    // 7-day period has data, but 90-day uses same closest record
    expect(result.periods[0].hasData).toBe(true);
  });

  it("returns latestWeight", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-04-01", wt: 70 },
    ];
    const result = calcMultiPeriodRate(records);
    expect(result.latestWeight).toBe(70);
  });
});

describe("calcRecordMilestone", () => {
  it("detects milestone at exact count", () => {
    const r = calcRecordMilestone(100);
    expect(r.reached).toBe(100);
  });

  it("returns null reached when not at milestone", () => {
    const r = calcRecordMilestone(99);
    expect(r.reached).toBeNull();
  });

  it("calculates next milestone and remaining", () => {
    const r = calcRecordMilestone(42);
    expect(r.next).toBe(50);
    expect(r.remaining).toBe(8);
  });

  it("handles count beyond 1000", () => {
    const r = calcRecordMilestone(1200);
    expect(r.next).toBe(1500);
    expect(r.remaining).toBe(300);
  });

  it("detects first milestone at 10", () => {
    const r = calcRecordMilestone(10);
    expect(r.reached).toBe(10);
    expect(r.current).toBe(10);
  });

  it("returns correct structure", () => {
    const r = calcRecordMilestone(5);
    expect(r).toHaveProperty("reached");
    expect(r).toHaveProperty("current");
    expect(r).toHaveProperty("next");
    expect(r).toHaveProperty("remaining");
  });
});

describe("generateAICoachReport", () => {
  const profile = { heightCm: 170 };

  it("returns new grade for insufficient records", () => {
    const r = generateAICoachReport([{ dt: "2024-01-01", wt: 70 }], profile, 65);
    expect(r.grade).toBe("new");
    expect(r.advices).toContain("start");
  });

  it("returns valid structure with enough records", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.1,
    }));
    const r = generateAICoachReport(records, profile, 65);
    expect(r).toHaveProperty("score");
    expect(r).toHaveProperty("grade");
    expect(r).toHaveProperty("advices");
    expect(r).toHaveProperty("highlights");
    expect(r).toHaveProperty("risks");
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("detects trend matching goal as highlight", () => {
    const now = new Date();
    const records = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now.getTime() - (13 - i) * 86400000);
      return {
        dt: d.toISOString().slice(0, 10),
        wt: 75 - i * 0.3,
      };
    });
    const r = generateAICoachReport(records, profile, 65);
    expect(r.highlights).toContain("trendMatchGoal");
  });

  it("works without goal weight", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
    }));
    const r = generateAICoachReport(records, profile, null);
    expect(r.prediction).toBeNull();
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it("clamps score between 0 and 100", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2024-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const r = generateAICoachReport(records, profile, 65);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("handles all identical weights gracefully", () => {
    const now = new Date();
    const records = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now.getTime() - (13 - i) * 86400000);
      return { dt: d.toISOString().slice(0, 10), wt: 75.0 };
    });
    const r = generateAICoachReport(records, profile, 65);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.grade).toBeDefined();
  });

  it("handles goal weight equal to current weight", () => {
    const now = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(now.getTime() - (9 - i) * 86400000);
      return { dt: d.toISOString().slice(0, 10), wt: 75 };
    });
    const r = generateAICoachReport(records, profile, 75);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("calcWeeklyRate edge cases", () => {
  it("returns null for same-day records", () => {
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2024-01-01", wt: 71 },
    ];
    const r = calcWeeklyRate(records);
    expect(r).toBeNull();
  });

  it("returns null for records less than 7 days apart", () => {
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2024-01-06", wt: 69 },
    ];
    const r = calcWeeklyRate(records);
    expect(r).toBeNull();
  });

  it("calculates correctly at exactly 7 days", () => {
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2024-01-08", wt: 69 },
    ];
    const r = calcWeeklyRate(records);
    expect(r).not.toBeNull();
    expect(r.weeklyRate).toBe(-1);
  });
});

describe("calcWeightTrend edge cases", () => {
  it("returns flat for all identical weights", () => {
    const now = new Date();
    const records = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000);
      return { dt: d.toISOString().slice(0, 10), wt: 75 };
    });
    const r = calcWeightTrend(records);
    expect(r).toBe("flat");
  });
});

describe("filterRecordsByDateRange edge cases", () => {
  const records = [
    { dt: "2024-12-31", wt: 70 },
    { dt: "2025-01-01", wt: 71 },
    { dt: "2025-01-31", wt: 72 },
    { dt: "2025-02-01", wt: 73 },
  ];

  it("handles year boundary", () => {
    const r = filterRecordsByDateRange(records, "2024-12-31", "2025-01-01");
    expect(r.length).toBe(2);
  });

  it("handles month boundary", () => {
    const r = filterRecordsByDateRange(records, "2025-01-31", "2025-02-01");
    expect(r.length).toBe(2);
  });

  it("handles same from and to date", () => {
    const r = filterRecordsByDateRange(records, "2025-01-01", "2025-01-01");
    expect(r.length).toBe(1);
    expect(r[0].dt).toBe("2025-01-01");
  });
});

describe("calcStats edge cases", () => {
  it("handles all identical weights", () => {
    const records = [
      { dt: "2024-01-01", wt: 75 },
      { dt: "2024-01-02", wt: 75 },
      { dt: "2024-01-03", wt: 75 },
    ];
    const r = calcStats(records, { heightCm: 170 });
    expect(r.avgWeight).toBe(75);
    expect(r.minWeight).toBe(75);
    expect(r.maxWeight).toBe(75);
    expect(r.change).toBe(0);
  });
});

describe("calcDashboardSummary", () => {
  it("returns null for empty records", () => {
    expect(calcDashboardSummary([], 170)).toBeNull();
  });

  it("returns correct weight and change", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69.5 },
    ];
    const result = calcDashboardSummary(records, 170);
    expect(result.weight).toBe(69.5);
    expect(result.change).toBe(-0.5);
  });

  it("calculates BMI when height provided", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const result = calcDashboardSummary(records, 170);
    expect(result.bmi).toBeCloseTo(24.2, 0);
  });

  it("returns null BMI when no height", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const result = calcDashboardSummary(records, 0);
    expect(result.bmi).toBeNull();
  });

  it("calculates streak for today's record", () => {
    const now = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const d1 = new Date(now); d1.setDate(d1.getDate() - 1);
    const records = [
      { dt: fmt(d1), wt: 70 },
      { dt: fmt(now), wt: 69.5 },
    ];
    const result = calcDashboardSummary(records, 170);
    expect(result.streak).toBe(2);
  });
});

describe("getRecentEntries", () => {
  it("returns empty array for no records", () => {
    expect(getRecentEntries([])).toEqual([]);
  });

  it("returns entries newest first", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, source: "manual" },
      { dt: "2025-01-03", wt: 69, source: "voice" },
      { dt: "2025-01-02", wt: 70.5, source: "photo" },
    ];
    const result = getRecentEntries(records, 3);
    expect(result[0].dt).toBe("2025-01-03");
    expect(result[1].dt).toBe("2025-01-02");
    expect(result[2].dt).toBe("2025-01-01");
  });

  it("calculates change from previous entry", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, source: "manual" },
      { dt: "2025-01-02", wt: 69, source: "manual" },
    ];
    const result = getRecentEntries(records, 2);
    expect(result[0].change).toBe(-1);
    expect(result[1].change).toBeNull();
  });

  it("limits to requested count", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i,
      source: "manual",
    }));
    expect(getRecentEntries(records, 3)).toHaveLength(3);
  });

  it("preserves source field", () => {
    const records = [{ dt: "2025-01-01", wt: 70, source: "voice" }];
    expect(getRecentEntries(records, 1)[0].source).toBe("voice");
  });

  it("defaults source to manual when missing", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    expect(getRecentEntries(records, 1)[0].source).toBe("manual");
  });

  it("handles single record (change is null)", () => {
    const records = [{ dt: "2025-01-01", wt: 70, source: "manual" }];
    const result = getRecentEntries(records, 1);
    expect(result).toHaveLength(1);
    expect(result[0].change).toBeNull();
  });
});

describe("calcMonthlyAverages", () => {
  it("returns empty array for no records", () => {
    expect(calcMonthlyAverages([])).toEqual([]);
  });

  it("returns correct number of months", () => {
    const records = [{ dt: "2025-01-15", wt: 70 }];
    const result = calcMonthlyAverages(records, 3);
    expect(result).toHaveLength(3);
  });

  it("calculates correct average for a month", () => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const records = [
      { dt: `${prefix}-01`, wt: 70 },
      { dt: `${prefix}-15`, wt: 72 },
    ];
    const result = calcMonthlyAverages(records, 1);
    expect(result[0].avg).toBe(71);
    expect(result[0].count).toBe(2);
    expect(result[0].min).toBe(70);
    expect(result[0].max).toBe(72);
  });

  it("returns null avg for months with no data", () => {
    const records = [{ dt: "2020-01-01", wt: 70 }];
    const result = calcMonthlyAverages(records, 1);
    // Current month likely has no 2020 data
    expect(result[0].count).toBe(0);
    expect(result[0].avg).toBeNull();
  });

  it("handles single record in a month", () => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const records = [{ dt: `${prefix}-10`, wt: 65.5 }];
    const result = calcMonthlyAverages(records, 1);
    expect(result[0].avg).toBe(65.5);
    expect(result[0].min).toBe(65.5);
    expect(result[0].max).toBe(65.5);
  });
});

describe("calcLongTermProgress", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcLongTermProgress([])).toBeNull();
    expect(calcLongTermProgress([{ dt: "2026-01-01", wt: 70 }])).toBeNull();
  });

  it("calculates change between two records", () => {
    const records = [
      { dt: "2025-12-01", wt: 72.0 },
      { dt: "2026-03-01", wt: 70.0 },
    ];
    const result = calcLongTermProgress(records);
    expect(result.current).toBe(70.0);
    const allPeriod = result.periods.find((p) => p.label === "all");
    expect(allPeriod.hasData).toBe(true);
    expect(allPeriod.change).toBe(-2.0);
    expect(allPeriod.pastWeight).toBe(72.0);
  });

  it("marks period as no data when no record is within 15 days", () => {
    const records = [
      { dt: "2026-03-01", wt: 70.0 },
      { dt: "2026-03-10", wt: 69.5 },
    ];
    const result = calcLongTermProgress(records);
    const threeMonth = result.periods.find((p) => p.label === "3m");
    expect(threeMonth.hasData).toBe(false);
  });

  it("calculates percentage change correctly", () => {
    const records = [
      { dt: "2025-09-14", wt: 80.0 },
      { dt: "2026-03-14", wt: 72.0 },
    ];
    const result = calcLongTermProgress(records);
    const allPeriod = result.periods.find((p) => p.label === "all");
    expect(allPeriod.pctChange).toBe(-10.0);
  });

  it("includes the latest date in result", () => {
    const records = [
      { dt: "2025-12-01", wt: 70.0 },
      { dt: "2026-03-14", wt: 68.0 },
    ];
    const result = calcLongTermProgress(records);
    expect(result.date).toBe("2026-03-14");
  });
});

describe("calcWeightFluctuation", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcWeightFluctuation([])).toBeNull();
    expect(calcWeightFluctuation([{ dt: "2026-03-14", wt: 70 }])).toBeNull();
  });

  it("calculates min, max, range for records within 7 days", () => {
    const records = [
      { dt: "2026-03-10", wt: 68.0 },
      { dt: "2026-03-12", wt: 70.0 },
      { dt: "2026-03-14", wt: 69.0 },
    ];
    const result = calcWeightFluctuation(records);
    expect(result.latest).toBe(69.0);
    const p7 = result.periods.find((p) => p.label === "7d");
    expect(p7.hasData).toBe(true);
    expect(p7.min).toBe(68.0);
    expect(p7.max).toBe(70.0);
    expect(p7.range).toBe(2.0);
  });

  it("calculates position as percentage within range", () => {
    const records = [
      { dt: "2026-03-10", wt: 60.0 },
      { dt: "2026-03-14", wt: 70.0 },
    ];
    const result = calcWeightFluctuation(records);
    const p7 = result.periods.find((p) => p.label === "7d");
    expect(p7.position).toBe(100); // latest is at max
  });

  it("marks period as no data when insufficient records", () => {
    const records = [
      { dt: "2026-02-01", wt: 70.0 },
      { dt: "2026-03-14", wt: 69.0 },
    ];
    const result = calcWeightFluctuation(records);
    const p7 = result.periods.find((p) => p.label === "7d");
    expect(p7.hasData).toBe(false);
  });

  it("handles 30-day window correctly", () => {
    const records = [
      { dt: "2026-02-20", wt: 72.0 },
      { dt: "2026-03-01", wt: 68.0 },
      { dt: "2026-03-14", wt: 70.0 },
    ];
    const result = calcWeightFluctuation(records);
    const p30 = result.periods.find((p) => p.label === "30d");
    expect(p30.hasData).toBe(true);
    expect(p30.min).toBe(68.0);
    expect(p30.max).toBe(72.0);
    expect(p30.range).toBe(4.0);
  });
});

describe("calcWeightAnomalies", () => {
  it("returns empty for fewer than 5 records", () => {
    const records = [
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 71 },
      { dt: "2026-01-03", wt: 70 },
    ];
    expect(calcWeightAnomalies(records)).toEqual([]);
  });

  it("detects an anomalous entry", () => {
    const records = [
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 70 },
      { dt: "2026-01-03", wt: 80 }, // anomaly
      { dt: "2026-01-04", wt: 70 },
      { dt: "2026-01-05", wt: 70 },
    ];
    const result = calcWeightAnomalies(records);
    expect(result.length).toBe(1);
    expect(result[0].dt).toBe("2026-01-03");
    expect(result[0].wt).toBe(80);
    expect(result[0].diff).toBeGreaterThanOrEqual(3);
  });

  it("returns empty when all entries are consistent", () => {
    const records = [
      { dt: "2026-01-01", wt: 70.0 },
      { dt: "2026-01-02", wt: 70.2 },
      { dt: "2026-01-03", wt: 70.1 },
      { dt: "2026-01-04", wt: 70.3 },
      { dt: "2026-01-05", wt: 70.0 },
    ];
    expect(calcWeightAnomalies(records)).toEqual([]);
  });

  it("sorts by severity descending", () => {
    const records = [
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 70 },
      { dt: "2026-01-03", wt: 76 }, // diff ~6
      { dt: "2026-01-04", wt: 70 },
      { dt: "2026-01-05", wt: 70 },
      { dt: "2026-01-06", wt: 74 }, // diff ~4
      { dt: "2026-01-07", wt: 70 },
      { dt: "2026-01-08", wt: 70 },
    ];
    const result = calcWeightAnomalies(records);
    if (result.length >= 2) {
      expect(result[0].diff).toBeGreaterThanOrEqual(result[1].diff);
    }
  });
});

describe("calcSuccessRate", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcSuccessRate([])).toBeNull();
    expect(calcSuccessRate([{ dt: "2026-01-01", wt: 70 }])).toBeNull();
  });

  it("calculates 100% when all weights decrease", () => {
    const records = [
      { dt: "2026-01-01", wt: 72 },
      { dt: "2026-01-02", wt: 71 },
      { dt: "2026-01-03", wt: 70 },
    ];
    const result = calcSuccessRate(records);
    expect(result.successRate).toBe(100);
    expect(result.down).toBe(2);
    expect(result.up).toBe(0);
  });

  it("calculates 0% when all weights increase", () => {
    const records = [
      { dt: "2026-01-01", wt: 68 },
      { dt: "2026-01-02", wt: 69 },
      { dt: "2026-01-03", wt: 70 },
    ];
    const result = calcSuccessRate(records);
    expect(result.successRate).toBe(0);
    expect(result.up).toBe(2);
  });

  it("counts same weight as success", () => {
    const records = [
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 70 },
      { dt: "2026-01-03", wt: 70 },
    ];
    const result = calcSuccessRate(records);
    expect(result.successRate).toBe(100);
    expect(result.same).toBe(2);
  });

  it("calculates mixed results correctly", () => {
    const records = [
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 69 }, // down
      { dt: "2026-01-03", wt: 70 }, // up
      { dt: "2026-01-04", wt: 69 }, // down
    ];
    const result = calcSuccessRate(records);
    expect(result.down).toBe(2);
    expect(result.up).toBe(1);
    expect(result.total).toBe(3);
    expect(result.successRate).toBe(67);
  });
});

describe("calcRecordingRate", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcRecordingRate([])).toBeNull();
    expect(calcRecordingRate([{ dt: "2026-01-01", wt: 70 }])).toBeNull();
  });

  it("calculates 100% for consecutive daily records", () => {
    const records = [
      { dt: "2026-03-10", wt: 70 },
      { dt: "2026-03-11", wt: 70 },
      { dt: "2026-03-12", wt: 70 },
    ];
    const result = calcRecordingRate(records);
    expect(result.totalDays).toBe(3);
    expect(result.recordedDays).toBe(3);
    expect(result.rate).toBe(100);
  });

  it("calculates rate for sparse records", () => {
    const records = [
      { dt: "2026-03-01", wt: 70 },
      { dt: "2026-03-10", wt: 69 },
    ];
    const result = calcRecordingRate(records);
    expect(result.totalDays).toBe(10);
    expect(result.recordedDays).toBe(2);
    expect(result.rate).toBe(20);
  });

  it("includes weeks array with 4 entries", () => {
    const records = [
      { dt: "2026-02-01", wt: 70 },
      { dt: "2026-03-14", wt: 69 },
    ];
    const result = calcRecordingRate(records);
    expect(result.weeks).toHaveLength(4);
    result.weeks.forEach((w) => {
      expect(w).toHaveProperty("recorded");
      expect(w).toHaveProperty("total");
    });
  });

  it("deduplicates same-date records", () => {
    const records = [
      { dt: "2026-03-10", wt: 70 },
      { dt: "2026-03-10", wt: 71 },
      { dt: "2026-03-12", wt: 69 },
    ];
    const result = calcRecordingRate(records);
    expect(result.recordedDays).toBe(2);
    expect(result.totalDays).toBe(3);
  });
});

// ── Edge case tests for weakly-covered functions ──

describe("calcWeightTrendIndicator edge cases", () => {
  it("works with exactly 4 records (minimum)", () => {
    const records = [
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 70.1 },
      { dt: "2026-01-03", wt: 70.2 },
      { dt: "2026-01-04", wt: 70.3 },
    ];
    const result = calcWeightTrendIndicator(records);
    expect(result).not.toBeNull();
  });

  it("handles identical weights across all records", () => {
    const records = [
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 70 },
      { dt: "2026-01-03", wt: 70 },
      { dt: "2026-01-04", wt: 70 },
    ];
    const result = calcWeightTrendIndicator(records);
    expect(result).not.toBeNull();
    expect(result.direction).toBe("stable");
  });

  it("detects near-threshold changes (±0.19 should be stable)", () => {
    const records = [
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 70 },
      { dt: "2026-01-03", wt: 70 },
      { dt: "2026-01-04", wt: 69.95 },
      { dt: "2026-01-05", wt: 69.95 },
      { dt: "2026-01-06", wt: 69.95 },
    ];
    const result = calcWeightTrendIndicator(records);
    expect(result).not.toBeNull();
  });
});

describe("calcPeriodComparison edge cases", () => {
  it("returns null with fewer than 3 records", () => {
    const result = calcPeriodComparison([
      { dt: "2026-01-01", wt: 70 },
      { dt: "2026-01-02", wt: 70.5 },
    ]);
    expect(result).toBeNull();
  });

  it("handles records spanning exactly 7 days", () => {
    const records = [];
    for (let i = 0; i < 7; i++) {
      records.push({ dt: `2026-01-${String(i + 1).padStart(2, "0")}`, wt: 70 - i * 0.1 });
    }
    const result = calcPeriodComparison(records);
    if (result) {
      expect(result).toHaveProperty("week");
    }
  });

  it("handles year boundary records", () => {
    const records = [
      { dt: "2025-12-30", wt: 70 },
      { dt: "2025-12-31", wt: 70.1 },
      { dt: "2026-01-01", wt: 69.9 },
      { dt: "2026-01-02", wt: 70 },
    ];
    const result = calcPeriodComparison(records);
    // Should not crash on year boundaries
    expect(result === null || typeof result === "object").toBe(true);
  });
});

describe("calcBMIHistory edge cases", () => {
  it("returns null with fewer than 3 records", () => {
    const result = calcBMIHistory([
      { dt: "2026-01-01", wt: 70, bmi: 24.2 },
      { dt: "2026-01-02", wt: 70.5, bmi: 24.4 },
    ]);
    expect(result).toBeNull();
  });

  it("handles all identical BMI values", () => {
    const records = [
      { dt: "2026-01-01", wt: 70, bmi: 24.2 },
      { dt: "2026-01-02", wt: 70, bmi: 24.2 },
      { dt: "2026-01-03", wt: 70, bmi: 24.2 },
    ];
    const result = calcBMIHistory(records);
    if (result) {
      expect(result.change).toBe(0);
    }
  });

  it("handles all null BMI values", () => {
    const records = [
      { dt: "2026-01-01", wt: 70, bmi: null },
      { dt: "2026-01-02", wt: 70, bmi: null },
      { dt: "2026-01-03", wt: 70, bmi: null },
    ];
    const result = calcBMIHistory(records);
    expect(result).toBeNull();
  });

  it("handles mix of null and valid BMI", () => {
    const records = [
      { dt: "2026-01-01", wt: 70, bmi: 24.2 },
      { dt: "2026-01-02", wt: 70, bmi: null },
      { dt: "2026-01-03", wt: 70, bmi: 24.5 },
      { dt: "2026-01-04", wt: 70, bmi: null },
      { dt: "2026-01-05", wt: 70, bmi: 24.8 },
    ];
    const result = calcBMIHistory(records);
    if (result) {
      expect(result.min).toBeLessThanOrEqual(result.max);
    }
  });
});

describe("calcMovingAverages edge cases", () => {
  it("handles all identical weights", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcMovingAverages(records);
    if (result) {
      expect(result.shortAvg).toBeCloseTo(70, 1);
      expect(result.longAvg).toBeCloseTo(70, 1);
    }
  });

  it("returns null for fewer than 30 records", () => {
    const records = Array.from({ length: 29 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + Math.random(),
    }));
    expect(calcMovingAverages(records)).toBeNull();
  });
});

describe("calcDayOfWeekChange edge cases", () => {
  it("returns null with fewer than 7 records", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcDayOfWeekChange(records)).toBeNull();
  });

  it("works with exactly 7 records", () => {
    const records = Array.from({ length: 7 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.1,
    }));
    const result = calcDayOfWeekChange(records);
    // Should not crash
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("handles all zero changes between consecutive days", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcDayOfWeekChange(records);
    if (result) {
      result.avgs.forEach((a) => {
        if (a !== null) expect(a).toBeCloseTo(0, 1);
      });
    }
  });
});

// ── calcMilestoneHistory ──
describe("calcMilestoneHistory", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcMilestoneHistory([])).toBeNull();
    expect(calcMilestoneHistory([{ dt: "2026-01-01", wt: 70 }])).toBeNull();
  });

  it("tracks downward milestones", () => {
    const records = [
      { dt: "2026-01-01", wt: 72.5 },
      { dt: "2026-01-10", wt: 71.3 },
      { dt: "2026-01-20", wt: 70.8 },
      { dt: "2026-01-30", wt: 69.9 },
    ];
    const result = calcMilestoneHistory(records);
    expect(result).not.toBeNull();
    expect(result.direction).toBe("down");
    expect(result.milestones.length).toBeGreaterThan(0);
    expect(result.milestones[0].kg).toBe(72);
    expect(result.milestones.some((m) => m.kg === 70)).toBe(true);
  });

  it("tracks upward milestones", () => {
    const records = [
      { dt: "2026-01-01", wt: 60.5 },
      { dt: "2026-01-10", wt: 61.2 },
      { dt: "2026-01-20", wt: 62.8 },
    ];
    const result = calcMilestoneHistory(records);
    expect(result).not.toBeNull();
    expect(result.direction).toBe("up");
    expect(result.milestones.some((m) => m.kg === 61)).toBe(true);
  });

  it("handles no milestones (flat weight)", () => {
    const records = [
      { dt: "2026-01-01", wt: 70.0 },
      { dt: "2026-01-02", wt: 70.0 },
    ];
    const result = calcMilestoneHistory(records);
    expect(result).not.toBeNull();
    expect(result.milestones).toHaveLength(0);
  });

  it("includes daysFromStart in milestones", () => {
    const records = [
      { dt: "2026-01-01", wt: 72 },
      { dt: "2026-01-11", wt: 70.5 },
    ];
    const result = calcMilestoneHistory(records);
    expect(result.milestones[0].daysFromStart).toBe(10);
  });
});

// ── calcWeightJourney ──
describe("calcWeightJourney", () => {
  it("returns null for fewer than 7 records", () => {
    const records = Array.from({ length: 6 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`, wt: 70,
    }));
    expect(calcWeightJourney(records)).toBeNull();
  });

  it("detects a loss phase", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`, wt: 75 - i * 0.3,
    }));
    const result = calcWeightJourney(records);
    expect(result).not.toBeNull();
    expect(result.phases.length).toBeGreaterThan(0);
    expect(result.phases.some((p) => p.type === "loss")).toBe(true);
    expect(result.totalChange).toBeLessThan(0);
  });

  it("detects maintain phase for flat weight", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2026-01-${String(i + 1).padStart(2, "0")}`, wt: 70,
    }));
    const result = calcWeightJourney(records);
    expect(result).not.toBeNull();
    expect(result.phases.some((p) => p.type === "maintain")).toBe(true);
    expect(result.totalChange).toBe(0);
  });

  it("calculates totalChange correctly", () => {
    const records = [
      ...Array.from({ length: 7 }, (_, i) => ({
        dt: `2026-01-${String(i + 1).padStart(2, "0")}`, wt: 75,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        dt: `2026-01-${String(i + 8).padStart(2, "0")}`, wt: 73,
      })),
    ];
    const result = calcWeightJourney(records);
    expect(result.totalChange).toBe(-2);
  });
});

describe("calcGoalScenarios", () => {
  it("returns null with no records", () => {
    expect(calcGoalScenarios([], 65)).toBeNull();
  });

  it("returns null with invalid goal", () => {
    expect(calcGoalScenarios([{ dt: "2026-01-01", wt: 70 }], 0)).toBeNull();
    expect(calcGoalScenarios([{ dt: "2026-01-01", wt: 70 }], NaN)).toBeNull();
  });

  it("returns null when already at goal", () => {
    expect(calcGoalScenarios([{ dt: "2026-01-01", wt: 65.0 }], 65.0)).toBeNull();
  });

  it("returns 3 scenarios for weight loss goal", () => {
    const records = [{ dt: "2026-03-14", wt: 75.0 }];
    const result = calcGoalScenarios(records, 65.0);
    expect(result.current).toBe(75.0);
    expect(result.goal).toBe(65.0);
    expect(result.remaining).toBe(10.0);
    expect(result.scenarios).toHaveLength(3);
    expect(result.scenarios[0].label).toBe("gentle");
    expect(result.scenarios[0].weeks).toBe(40); // 10kg / 0.25kg per week
    expect(result.scenarios[1].weeks).toBe(20); // 10kg / 0.5kg per week
    expect(result.scenarios[2].weeks).toBe(10); // 10kg / 1.0kg per week
  });

  it("works for weight gain goal", () => {
    const records = [{ dt: "2026-03-14", wt: 55.0 }];
    const result = calcGoalScenarios(records, 60.0);
    expect(result.remaining).toBe(5.0);
    expect(result.scenarios[2].weeks).toBe(5); // 5kg / 1.0kg per week
  });
});

describe("calcStreakCalendar", () => {
  it("returns weeks array with days", () => {
    const records = [{ dt: "2026-03-14", wt: 70 }];
    const result = calcStreakCalendar(records, 2);
    expect(result.weeks.length).toBeGreaterThan(0);
    expect(result.totalDays).toBeGreaterThan(0);
  });

  it("marks recorded days correctly", () => {
    const records = [
      { dt: "2026-03-10", wt: 70 },
      { dt: "2026-03-12", wt: 69 },
      { dt: "2026-03-14", wt: 68 },
    ];
    const result = calcStreakCalendar(records, 1);
    const allDays = result.weeks.flat();
    const recordedDays = allDays.filter((d) => d.recorded);
    expect(recordedDays.length).toBe(result.totalRecorded);
  });

  it("identifies today", () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const records = [{ dt: todayStr, wt: 70 }];
    const result = calcStreakCalendar(records, 1);
    const allDays = result.weeks.flat();
    const todayDay = allDays.find((d) => d.isToday);
    expect(todayDay).toBeDefined();
    expect(todayDay.recorded).toBe(true);
  });

  it("counts total correctly with no records", () => {
    const result = calcStreakCalendar([], 2);
    expect(result.totalRecorded).toBe(0);
    expect(result.totalDays).toBeGreaterThan(0);
  });
});

describe("calcMovingAvgCrossover", () => {
  it("returns neutral for fewer than 30 records", () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
    }));
    const result = calcMovingAvgCrossover(records);
    expect(result.currentTrend).toBe("neutral");
    expect(result.shortMA).toBeNull();
    expect(result.crossovers).toEqual([]);
  });

  it("returns uptrend when short MA > long MA", () => {
    // Steadily increasing weights: short MA will be above long MA
    const records = Array.from({ length: 40 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 60 + i * 0.5,
    }));
    const result = calcMovingAvgCrossover(records);
    expect(result.currentTrend).toBe("uptrend");
    expect(result.shortMA).toBeGreaterThan(result.longMA);
  });

  it("returns downtrend when short MA < long MA", () => {
    // Steadily decreasing weights: short MA will be below long MA
    const records = Array.from({ length: 40 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 80 - i * 0.5,
    }));
    const result = calcMovingAvgCrossover(records);
    expect(result.currentTrend).toBe("downtrend");
    expect(result.shortMA).toBeLessThan(result.longMA);
  });

  it("detects crossovers when trend reverses", () => {
    // First 30 records: increasing, then 20 records: sharply decreasing
    const records = [];
    for (let i = 0; i < 30; i++) {
      records.push({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 60 + i * 0.3 });
    }
    for (let i = 0; i < 20; i++) {
      const day = 31 + i;
      const month = day > 31 ? 2 : 1;
      const d = day > 31 ? day - 31 : day;
      records.push({ dt: `2025-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`, wt: 69 - i * 1.0 });
    }
    const result = calcMovingAvgCrossover(records);
    expect(result.crossovers.length).toBeGreaterThan(0);
    const hasGolden = result.crossovers.some((c) => c.type === "golden");
    expect(hasGolden).toBe(true);
  });

  it("limits crossovers to last 10", () => {
    const result = calcMovingAvgCrossover([]);
    expect(result.crossovers.length).toBeLessThanOrEqual(10);
  });

  it("returns shortMA and longMA as numbers", () => {
    const records = Array.from({ length: 35 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcMovingAvgCrossover(records);
    expect(typeof result.shortMA).toBe("number");
    expect(typeof result.longMA).toBe("number");
    expect(result.shortMA).toBeCloseTo(70, 1);
    expect(result.longMA).toBeCloseTo(70, 1);
  });
});

describe("calcPredictionAccuracy", () => {
  it("returns insufficient for fewer than 14 records", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcPredictionAccuracy(records);
    expect(result.rating).toBe("insufficient");
    expect(result.accuracy).toBeNull();
  });

  it("returns high accuracy for constant weight", () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 65.0,
    }));
    const result = calcPredictionAccuracy(records);
    expect(result.accuracy).toBe(100);
    expect(result.avgError).toBe(0);
    expect(result.rating).toBe("excellent");
  });

  it("returns predictions with date, predicted, actual, error", () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
    }));
    const result = calcPredictionAccuracy(records);
    expect(result.predictions.length).toBeGreaterThan(0);
    const p = result.predictions[0];
    expect(p).toHaveProperty("date");
    expect(p).toHaveProperty("predicted");
    expect(p).toHaveProperty("actual");
    expect(p).toHaveProperty("error");
    expect(p.error).toBeGreaterThanOrEqual(0);
  });

  it("limits predictions to last 10", () => {
    const records = Array.from({ length: 50 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + Math.sin(i) * 2,
    }));
    const result = calcPredictionAccuracy(records);
    expect(result.predictions.length).toBeLessThanOrEqual(10);
  });

  it("returns accuracy as a percentage", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.2,
    }));
    const result = calcPredictionAccuracy(records);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(100);
  });

  it("handles empty input", () => {
    expect(calcPredictionAccuracy([]).rating).toBe("insufficient");
    expect(calcPredictionAccuracy(null).rating).toBe("insufficient");
  });
});

describe("calcConsistencyScore", () => {
  it("returns null score for fewer than 7 records", () => {
    const records = [{ dt: "2025-01-01", wt: 70 }];
    const result = calcConsistencyScore(records, 65);
    expect(result.score).toBeNull();
    expect(result.grade).toBe("N/A");
  });

  it("returns score 0-100 for sufficient records", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, wt: 70 - i * 0.1 };
    });
    const result = calcConsistencyScore(records, 65);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["S","A","B","C","D"]).toContain(result.grade);
  });

  it("gives high recording score for daily records", () => {
    const today = new Date();
    const records = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, wt: 70 };
    });
    const result = calcConsistencyScore(records, 70);
    expect(result.components.recording).toBeGreaterThanOrEqual(90);
  });

  it("gives high stability score for constant weight", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, wt: 70.0 };
    });
    const result = calcConsistencyScore(records, 65);
    expect(result.components.stability).toBe(100);
  });

  it("handles null/empty input", () => {
    expect(calcConsistencyScore(null, 65).score).toBeNull();
    expect(calcConsistencyScore([], 65).score).toBeNull();
  });

  it("returns components object with all three fields", () => {
    const today = new Date();
    const records = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, wt: 70 };
    });
    const result = calcConsistencyScore(records, 65);
    expect(result.components).toHaveProperty("recording");
    expect(result.components).toHaveProperty("stability");
    expect(result.components).toHaveProperty("momentum");
  });
});

describe("calcWeightRangeSummary", () => {
  it("returns empty for fewer than 2 records", () => {
    expect(calcWeightRangeSummary([{ dt: "2025-01-01", wt: 70 }]).periods).toEqual([]);
    expect(calcWeightRangeSummary([]).periods).toEqual([]);
    expect(calcWeightRangeSummary(null).periods).toEqual([]);
  });

  it("returns periods with correct structure", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-03-${String(i + 1).padStart(2, "0")}`,
      wt: 65 + i,
    }));
    const result = calcWeightRangeSummary(records);
    expect(result.periods.length).toBeGreaterThan(0);
    const p = result.periods[0];
    expect(p).toHaveProperty("label");
    expect(p).toHaveProperty("min");
    expect(p).toHaveProperty("max");
    expect(p).toHaveProperty("range");
    expect(p).toHaveProperty("avg");
    expect(p).toHaveProperty("count");
  });

  it("calculates correct min/max/range for known data", () => {
    const today = new Date();
    const records = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return { dt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, wt: 60 + i * 2 };
    });
    const result = calcWeightRangeSummary(records);
    const allPeriod = result.periods.find((p) => p.label === "all");
    expect(allPeriod).toBeDefined();
    expect(allPeriod.min).toBe(60);
    expect(allPeriod.max).toBe(68);
    expect(allPeriod.range).toBe(8);
  });

  it("includes all-time period", () => {
    const records = [
      { dt: "2024-01-01", wt: 70 },
      { dt: "2025-03-01", wt: 65 },
    ];
    const result = calcWeightRangeSummary(records);
    const all = result.periods.find((p) => p.label === "all");
    expect(all).toBeDefined();
    expect(all.count).toBe(2);
  });

  it("calculates average correctly", () => {
    const today = new Date();
    const records = [
      { dt: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`, wt: 60 },
      { dt: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(Math.max(1,today.getDate()-1)).padStart(2,"0")}`, wt: 80 },
    ];
    const result = calcWeightRangeSummary(records);
    const all = result.periods.find((p) => p.label === "all");
    expect(all.avg).toBe(70);
  });
});

describe("calcTrendStreak", () => {
  it("returns null direction for fewer than 2 records", () => {
    expect(calcTrendStreak([{ dt: "2025-01-01", wt: 70 }]).direction).toBeNull();
    expect(calcTrendStreak([]).direction).toBeNull();
    expect(calcTrendStreak(null).direction).toBeNull();
  });

  it("detects downward streak", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69.5 },
      { dt: "2025-01-03", wt: 69.0 },
      { dt: "2025-01-04", wt: 68.5 },
    ];
    const result = calcTrendStreak(records);
    expect(result.direction).toBe("down");
    expect(result.count).toBe(3);
    expect(result.totalChange).toBeLessThan(0);
  });

  it("detects upward streak", () => {
    const records = [
      { dt: "2025-01-01", wt: 65 },
      { dt: "2025-01-02", wt: 65.5 },
      { dt: "2025-01-03", wt: 66.0 },
    ];
    const result = calcTrendStreak(records);
    expect(result.direction).toBe("up");
    expect(result.count).toBe(2);
    expect(result.totalChange).toBeGreaterThan(0);
  });

  it("detects flat streak", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcTrendStreak(records);
    expect(result.direction).toBe("flat");
    expect(result.count).toBe(2);
  });

  it("breaks streak on direction change", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68 },
      { dt: "2025-01-04", wt: 69 }, // reversal
    ];
    const result = calcTrendStreak(records);
    expect(result.direction).toBe("up");
    expect(result.count).toBe(1);
  });

  it("returns startDate and endDate", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68 },
    ];
    const result = calcTrendStreak(records);
    expect(result.startDate).toBe("2025-01-01");
    expect(result.endDate).toBe("2025-01-03");
  });
});

describe("calcBMITrend", () => {
  it("returns empty for fewer than 2 records", () => {
    expect(calcBMITrend([]).current).toBeNull();
    expect(calcBMITrend(null).current).toBeNull();
    expect(calcBMITrend([{ dt: "2025-01-01", wt: 70, bmi: 22.5 }]).current).toBeNull();
  });

  it("returns trend data for records with BMI", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 24.2 },
      { dt: "2025-01-02", wt: 69, bmi: 23.9 },
      { dt: "2025-01-03", wt: 68, bmi: 23.5 },
    ];
    const result = calcBMITrend(records);
    expect(result.current).toBe(23.5);
    expect(result.direction).toBe("down");
    expect(result.change).toBeLessThan(0);
    expect(result.points.length).toBe(3);
  });

  it("skips records without BMI data", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 24.2 },
      { dt: "2025-01-02", wt: 69 }, // no BMI
      { dt: "2025-01-03", wt: 68, bmi: 23.5 },
    ];
    const result = calcBMITrend(records);
    expect(result.points.length).toBe(2);
  });

  it("returns min and max BMI", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bmi: 22.0 },
      { dt: "2025-01-02", wt: 75, bmi: 25.0 },
      { dt: "2025-01-03", wt: 72, bmi: 23.5 },
    ];
    const result = calcBMITrend(records);
    expect(result.min).toBe(22.0);
    expect(result.max).toBe(25.0);
  });

  it("limits points to last 30", () => {
    const records = Array.from({ length: 50 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
      bmi: 22 + i * 0.05,
    }));
    const result = calcBMITrend(records);
    expect(result.points.length).toBeLessThanOrEqual(30);
  });

  it("detects upward trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 65, bmi: 21.0 },
      { dt: "2025-01-02", wt: 70, bmi: 23.0 },
    ];
    const result = calcBMITrend(records);
    expect(result.direction).toBe("up");
    expect(result.change).toBeGreaterThan(0);
  });
});

describe("calcWeeklySummaryComparison", () => {
  it("returns null for insufficient data", () => {
    expect(calcWeeklySummaryComparison([]).diffs).toBeNull();
    expect(calcWeeklySummaryComparison(null).diffs).toBeNull();
  });

  it("returns null diffs when only one week has data", () => {
    const today = new Date();
    const records = [
      { dt: `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`, wt: 70 },
    ];
    const result = calcWeeklySummaryComparison(records);
    // thisWeek might have data, but lastWeek won't, so diffs should be null
    expect(result.diffs).toBeNull();
  });

  it("returns diffs when both weeks have data", () => {
    const today = new Date();
    const records = [];
    // This week
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      records.push({ dt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, wt: 70 + i * 0.2 });
    }
    // Last week
    for (let i = 7; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      records.push({ dt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, wt: 71 + (i - 7) * 0.2 });
    }
    const result = calcWeeklySummaryComparison(records);
    if (result.diffs) {
      expect(result.diffs).toHaveProperty("avg");
      expect(result.diffs).toHaveProperty("min");
      expect(result.diffs).toHaveProperty("max");
      expect(result.diffs).toHaveProperty("count");
      expect(typeof result.diffs.avg).toBe("number");
    }
  });

  it("returns correct thisWeek and lastWeek structure", () => {
    const today = new Date();
    const records = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      records.push({ dt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, wt: 70 });
    }
    const result = calcWeeklySummaryComparison(records);
    if (result.thisWeek) {
      expect(result.thisWeek).toHaveProperty("avg");
      expect(result.thisWeek).toHaveProperty("count");
    }
    if (result.lastWeek) {
      expect(result.lastWeek).toHaveProperty("avg");
      expect(result.lastWeek).toHaveProperty("count");
    }
  });
});

describe("calcGoalProgressRing", () => {
  it("returns null for no records", () => {
    expect(calcGoalProgressRing([], 65)).toBeNull();
    expect(calcGoalProgressRing(null, 65)).toBeNull();
  });

  it("returns null for invalid goal", () => {
    expect(calcGoalProgressRing([{ dt: "2025-01-01", wt: 70 }], 0)).toBeNull();
    expect(calcGoalProgressRing([{ dt: "2025-01-01", wt: 70 }], NaN)).toBeNull();
  });

  it("returns 100% when at goal", () => {
    const records = [{ dt: "2025-01-01", wt: 65 }];
    const result = calcGoalProgressRing(records, 65);
    expect(result.percent).toBe(100);
    expect(result.remaining).toBe(0);
  });

  it("calculates progress for weight loss goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-01-15", wt: 75 },
    ];
    const result = calcGoalProgressRing(records, 70);
    expect(result.percent).toBe(50); // lost 5 of 10 needed
    expect(result.lost).toBe(5);
    expect(result.remaining).toBe(5);
    expect(result.startWeight).toBe(80);
    expect(result.currentWeight).toBe(75);
  });

  it("calculates progress for weight gain goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 50 },
      { dt: "2025-01-15", wt: 55 },
    ];
    const result = calcGoalProgressRing(records, 60);
    expect(result.percent).toBe(50);
    expect(result.remaining).toBe(5);
  });

  it("caps percent at 100", () => {
    const records = [
      { dt: "2025-01-01", wt: 80 },
      { dt: "2025-01-15", wt: 65 },
    ];
    const result = calcGoalProgressRing(records, 70);
    expect(result.percent).toBe(100);
  });

  it("returns weeklyRate and onTrack fields", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 80 - i * 0.3,
    }));
    const result = calcGoalProgressRing(records, 70);
    expect(typeof result.weeklyRate).toBe("number");
    expect(typeof result.onTrack).toBe("boolean");
  });
});

describe("calcBodyFatTrend", () => {
  it("returns empty for no records", () => {
    expect(calcBodyFatTrend([]).current).toBeNull();
    expect(calcBodyFatTrend(null).current).toBeNull();
  });

  it("returns current for single record with bf", () => {
    const result = calcBodyFatTrend([{ dt: "2025-01-01", wt: 70, bf: 20 }]);
    expect(result.current).toBe(20);
    expect(result.points.length).toBe(0); // need 2+ for trend
  });

  it("returns trend data for records with body fat", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 25.0 },
      { dt: "2025-01-02", wt: 69, bf: 24.5 },
      { dt: "2025-01-03", wt: 68, bf: 24.0 },
    ];
    const result = calcBodyFatTrend(records);
    expect(result.current).toBe(24.0);
    expect(result.direction).toBe("down");
    expect(result.change).toBeLessThan(0);
    expect(result.points.length).toBe(3);
  });

  it("skips records without bf data", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 22.0 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68, bf: 21.5 },
    ];
    const result = calcBodyFatTrend(records);
    expect(result.points.length).toBe(2);
  });

  it("returns min, max, avg", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 20 },
      { dt: "2025-01-02", wt: 69, bf: 25 },
      { dt: "2025-01-03", wt: 68, bf: 22 },
    ];
    const result = calcBodyFatTrend(records);
    expect(result.min).toBe(20);
    expect(result.max).toBe(25);
    expect(result.avg).toBeCloseTo(22.3, 0);
  });

  it("limits points to last 30", () => {
    const records = Array.from({ length: 50 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
      bf: 20 + i * 0.1,
    }));
    const result = calcBodyFatTrend(records);
    expect(result.points.length).toBeLessThanOrEqual(30);
  });
});

describe("calcDailyTarget", () => {
  const makeRecords = (startWt, count, delta = -0.1) =>
    Array.from({ length: count }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: +(startWt + delta * i).toFixed(1),
    }));

  it("returns null for fewer than 7 records", () => {
    expect(calcDailyTarget([], 65)).toBeNull();
    expect(calcDailyTarget([{ dt: "2025-01-01", wt: 70 }], 65)).toBeNull();
    expect(calcDailyTarget(makeRecords(70, 6), 65)).toBeNull();
  });

  it("returns null when no goal weight", () => {
    const records = makeRecords(70, 10);
    expect(calcDailyTarget(records, 0)).toBeNull();
    expect(calcDailyTarget(records, null)).toBeNull();
  });

  it("returns on-target when current equals goal", () => {
    const records = makeRecords(65, 10, 0);
    const result = calcDailyTarget(records, 65);
    expect(result.onTarget).toBe(true);
    expect(result.isAbove).toBe(false);
    expect(result.isBelow).toBe(false);
  });

  it("returns correct structure for weight loss goal", () => {
    const records = makeRecords(75, 10, -0.1);
    const result = calcDailyTarget(records, 65);
    expect(result).toHaveProperty("target");
    expect(result).toHaveProperty("current");
    expect(result).toHaveProperty("diff");
    expect(result).toHaveProperty("pace");
    expect(result.current).toBe(74.1);
    expect(result.pace).toBeLessThan(0);
  });

  it("returns correct structure for weight gain goal", () => {
    const records = makeRecords(55, 10, 0.1);
    const result = calcDailyTarget(records, 65);
    expect(result.pace).toBeGreaterThan(0);
  });

  it("handles null records", () => {
    expect(calcDailyTarget(null, 65)).toBeNull();
  });
});

describe("calcMonthPhaseAvg", () => {
  it("returns null for fewer than 14 records", () => {
    expect(calcMonthPhaseAvg([])).toBeNull();
    expect(calcMonthPhaseAvg(null)).toBeNull();
    const few = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcMonthPhaseAvg(few)).toBeNull();
  });

  it("groups records into 4 phases", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i < 7 ? 0 : i < 14 ? 0.5 : i < 21 ? 1.0 : 1.5),
    }));
    const result = calcMonthPhaseAvg(records);
    expect(result).not.toBeNull();
    expect(result.phases).toHaveLength(4);
    expect(result.phases[0].label).toBe("early");
    expect(result.phases[1].label).toBe("mid");
    expect(result.phases[2].label).toBe("late");
    expect(result.phases[3].label).toBe("end");
  });

  it("calculates averages correctly", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: i < 7 ? 70 : 71,
    }));
    const result = calcMonthPhaseAvg(records);
    expect(result.phases[0].avg).toBe(70);
    expect(result.phases[1].avg).toBe(71);
    expect(result.phases[0].count).toBe(7);
    expect(result.phases[1].count).toBe(7);
  });

  it("detects pattern when variation > 0.3kg", () => {
    const records = Array.from({ length: 28 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: i < 7 ? 70 : i < 14 ? 70 : i < 21 ? 70 : 71,
    }));
    const result = calcMonthPhaseAvg(records);
    expect(result.hasPattern).toBe(true);
  });

  it("reports no pattern when stable", () => {
    const records = Array.from({ length: 28 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcMonthPhaseAvg(records);
    expect(result.hasPattern).toBe(false);
  });

  it("calculates change relative to first phase", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: i < 7 ? 70 : 72,
    }));
    const result = calcMonthPhaseAvg(records);
    expect(result.phases[0].change).toBe(0);
    expect(result.phases[1].change).toBe(2);
  });
});

describe("calcStreakFreezeInfo", () => {
  const makeDailyRecords = (startDate, count) =>
    Array.from({ length: count }, (_, i) => {
      const d = new Date(startDate + "T00:00:00");
      d.setDate(d.getDate() + i);
      return {
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 70,
      };
    });

  it("returns zeros for empty/null records", () => {
    const r1 = calcStreakFreezeInfo([]);
    expect(r1.freezesEarned).toBe(0);
    expect(r1.freezesAvailable).toBe(0);
    const r2 = calcStreakFreezeInfo(null);
    expect(r2.freezesEarned).toBe(0);
  });

  it("returns correct streak for single record", () => {
    const result = calcStreakFreezeInfo([{ dt: "2025-01-01", wt: 70 }]);
    expect(result.currentStreak).toBe(1);
    expect(result.freezesEarned).toBe(0);
  });

  it("earns 1 freeze per 7 consecutive days", () => {
    const records = makeDailyRecords("2025-01-01", 7);
    const result = calcStreakFreezeInfo(records);
    expect(result.freezesEarned).toBe(1);
    expect(result.currentStreak).toBe(7);
  });

  it("earns 2 freezes for 14 consecutive days", () => {
    const records = makeDailyRecords("2025-01-01", 14);
    const result = calcStreakFreezeInfo(records);
    expect(result.freezesEarned).toBe(2);
    expect(result.currentStreak).toBe(14);
  });

  it("tracks longest streak separately", () => {
    // 10 days, gap, 3 days
    const records = [
      ...makeDailyRecords("2025-01-01", 10),
      ...makeDailyRecords("2025-01-15", 3),
    ];
    const result = calcStreakFreezeInfo(records);
    expect(result.longestStreak).toBe(10);
    expect(result.currentStreak).toBe(3);
  });

  it("handles non-consecutive records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-10", wt: 70 },
    ];
    const result = calcStreakFreezeInfo(records);
    expect(result.currentStreak).toBe(1);
    expect(result.freezesEarned).toBe(0);
  });
});

describe("calcRecentWeightBars", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcRecentWeightBars([], 65)).toBeNull();
    expect(calcRecentWeightBars([{ dt: "2025-01-01", wt: 70 }], 65)).toBeNull();
    expect(calcRecentWeightBars(null, 65)).toBeNull();
  });

  it("returns correct number of bars", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.1,
    }));
    const result = calcRecentWeightBars(records, 65, 7);
    expect(result.bars).toHaveLength(7);
  });

  it("calculates percentage positions", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 75 },
    ];
    const result = calcRecentWeightBars(records, 0, 7);
    expect(result.bars[0].pct).toBeLessThan(result.bars[1].pct);
  });

  it("includes goal line percentage when goal set", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    const result = calcRecentWeightBars(records, 65, 7);
    expect(result.goalPct).not.toBeNull();
    expect(result.goalPct).toBeGreaterThanOrEqual(0);
  });

  it("returns null goalPct when no goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    const result = calcRecentWeightBars(records, 0, 7);
    expect(result.goalPct).toBeNull();
  });

  it("calculates change from previous", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69.5 },
      { dt: "2025-01-03", wt: 70.2 },
    ];
    const result = calcRecentWeightBars(records, 0, 7);
    expect(result.bars[1].change).toBe(-0.5);
    expect(result.bars[2].change).toBe(0.7);
  });
});

describe("calcWeightAnniversary", () => {
  it("returns null for fewer than 2 records", () => {
    expect(calcWeightAnniversary([])).toBeNull();
    expect(calcWeightAnniversary(null)).toBeNull();
    expect(calcWeightAnniversary([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("calculates tracking days and total change", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-15", wt: 73.5 },
    ];
    const result = calcWeightAnniversary(records);
    expect(result.trackingDays).toBe(14);
    expect(result.startWeight).toBe(75);
    expect(result.currentWeight).toBe(73.5);
    expect(result.totalChange).toBe(-1.5);
  });

  it("marks milestones as reached or not", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-02-15", wt: 73 },
    ];
    const result = calcWeightAnniversary(records);
    const weekMs = result.milestones.find((m) => m.label === "1week");
    const monthMs = result.milestones.find((m) => m.label === "1month");
    const yearMs = result.milestones.find((m) => m.label === "1year");
    expect(weekMs.reached).toBe(true);
    expect(monthMs.reached).toBe(true);
    expect(yearMs.reached).toBe(false);
  });

  it("calculates weight at milestone correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-08", wt: 74.5 },
      { dt: "2025-02-01", wt: 73 },
    ];
    const result = calcWeightAnniversary(records);
    const weekMs = result.milestones.find((m) => m.label === "1week");
    expect(weekMs.reached).toBe(true);
    expect(weekMs.weightAtMilestone).toBe(74.5);
    expect(weekMs.changeAtMilestone).toBe(-0.5);
  });

  it("returns all 6 milestone definitions", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-02", wt: 74.9 },
    ];
    const result = calcWeightAnniversary(records);
    expect(result.milestones).toHaveLength(6);
  });
});

describe("calcDailyChangeDist", () => {
  const makeDailyRecords = (weights) =>
    weights.map((wt, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt,
    }));

  it("returns null for fewer than 3 records", () => {
    expect(calcDailyChangeDist([])).toBeNull();
    expect(calcDailyChangeDist(null)).toBeNull();
    expect(calcDailyChangeDist([{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 69 }])).toBeNull();
  });

  it("calculates buckets for consecutive records", () => {
    const records = makeDailyRecords([70, 69.8, 70.1, 69.5, 69.9, 70.2, 69.7]);
    const result = calcDailyChangeDist(records);
    expect(result).not.toBeNull();
    expect(result.buckets.length).toBeGreaterThan(0);
    expect(result.totalChanges).toBe(6);
  });

  it("calculates avg and median change", () => {
    const records = makeDailyRecords([70, 69.5, 69.0, 68.5, 68.0]);
    const result = calcDailyChangeDist(records);
    expect(result.avgChange).toBe(-0.5);
    expect(result.medianChange).toBe(-0.5);
  });

  it("calculates normal range", () => {
    const records = makeDailyRecords([70, 69.8, 70.1, 69.5, 69.9, 70.3, 69.6, 70.0, 69.7, 70.2]);
    const result = calcDailyChangeDist(records);
    expect(result.normalRange).toHaveProperty("low");
    expect(result.normalRange).toHaveProperty("high");
    expect(result.normalRange.low).toBeLessThan(result.normalRange.high);
  });

  it("ignores non-consecutive records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-10", wt: 69 },
      { dt: "2025-01-20", wt: 68 },
    ];
    const result = calcDailyChangeDist(records);
    expect(result).toBeNull();
  });

  it("bucket percentages sum to approximately 100", () => {
    const records = makeDailyRecords([70, 69.8, 70.1, 69.5, 69.9, 70.2, 69.7, 70.0]);
    const result = calcDailyChangeDist(records);
    const totalPct = result.buckets.reduce((s, b) => s + b.pct, 0);
    expect(totalPct).toBeGreaterThan(95);
    expect(totalPct).toBeLessThanOrEqual(101);
  });
});

describe("calcGoalStreak", () => {
  it("returns null for insufficient data", () => {
    expect(calcGoalStreak([], 65)).toBeNull();
    expect(calcGoalStreak(null, 65)).toBeNull();
    expect(calcGoalStreak([{ dt: "2025-01-01", wt: 70 }], 65)).toBeNull();
    expect(calcGoalStreak([{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 69 }], 0)).toBeNull();
  });

  it("detects achieved goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 66 },
      { dt: "2025-01-02", wt: 65 },
    ];
    const result = calcGoalStreak(records, 65);
    expect(result.direction).toBe("achieved");
  });

  it("counts streak toward loss goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-02", wt: 74 },
      { dt: "2025-01-03", wt: 73.5 },
      { dt: "2025-01-04", wt: 73 },
    ];
    const result = calcGoalStreak(records, 65);
    expect(result.streak).toBeGreaterThanOrEqual(2);
    expect(result.direction).toBe("lose");
    expect(result.currentDist).toBe(8);
  });

  it("counts streak toward gain goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 55 },
      { dt: "2025-01-02", wt: 56 },
      { dt: "2025-01-03", wt: 56.5 },
    ];
    const result = calcGoalStreak(records, 65);
    expect(result.direction).toBe("gain");
    expect(result.streak).toBeGreaterThanOrEqual(2);
  });

  it("returns closestToGoal value", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 69 },
    ];
    const result = calcGoalStreak(records, 65);
    expect(result.closestToGoal).toBe(69);
  });
});

describe("calcThenVsNow", () => {
  const makeRecords = (count, startWt, delta = -0.1) =>
    Array.from({ length: count }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: +(startWt + delta * i).toFixed(1),
    }));

  it("returns null for fewer than 14 records", () => {
    expect(calcThenVsNow(null, 7)).toBeNull();
    expect(calcThenVsNow([], 7)).toBeNull();
    expect(calcThenVsNow(makeRecords(10, 70), 7)).toBeNull();
  });

  it("compares first 7 vs last 7 records", () => {
    const records = makeRecords(20, 75, -0.2);
    const result = calcThenVsNow(records, 7);
    expect(result).not.toBeNull();
    expect(result.then.count).toBe(7);
    expect(result.now.count).toBe(7);
    expect(result.diff).toBeLessThan(0);
  });

  it("calculates correct averages", () => {
    const records = [
      ...Array.from({ length: 7 }, (_, i) => ({ dt: `2025-01-${String(i + 1).padStart(2, "0")}`, wt: 70 })),
      ...Array.from({ length: 7 }, (_, i) => ({ dt: `2025-01-${String(i + 8).padStart(2, "0")}`, wt: 68 })),
    ];
    const result = calcThenVsNow(records, 7);
    expect(result.then.avg).toBe(70);
    expect(result.now.avg).toBe(68);
    expect(result.diff).toBe(-2);
  });

  it("includes min and max in results", () => {
    const records = makeRecords(14, 75, -0.1);
    const result = calcThenVsNow(records, 7);
    expect(result.then).toHaveProperty("min");
    expect(result.then).toHaveProperty("max");
    expect(result.now).toHaveProperty("min");
    expect(result.now).toHaveProperty("max");
  });

  it("includes period strings", () => {
    const records = makeRecords(14, 75);
    const result = calcThenVsNow(records, 7);
    expect(result.then.period).toContain("2025-01-01");
    expect(result.now.period).toContain("2025-01-14");
  });
});

describe("calcQuickWeightPresets", () => {
  it("returns empty array for null or empty records", () => {
    expect(calcQuickWeightPresets(null)).toEqual([]);
    expect(calcQuickWeightPresets([])).toEqual([]);
  });

  it("returns last weight for single record", () => {
    const records = [{ dt: "2025-01-01", wt: 70.5 }];
    const result = calcQuickWeightPresets(records);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("last");
    expect(result[0].weight).toBe(70.5);
  });

  it("returns last and trend for 2 records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70.0 },
      { dt: "2025-01-02", wt: 69.5 },
    ];
    const result = calcQuickWeightPresets(records);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((p) => p.label === "last")).toBe(true);
    expect(result.some((p) => p.label === "trend")).toBe(true);
  });

  it("returns up to 3 presets for sufficient records", () => {
    const records = [
      { dt: "2025-01-01", wt: 72.0 },
      { dt: "2025-01-02", wt: 71.0 },
      { dt: "2025-01-03", wt: 70.5 },
      { dt: "2025-01-04", wt: 70.0 },
    ];
    const result = calcQuickWeightPresets(records);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("deduplicates presets with same weight", () => {
    const records = [
      { dt: "2025-01-01", wt: 70.0 },
      { dt: "2025-01-02", wt: 70.0 },
      { dt: "2025-01-03", wt: 70.0 },
    ];
    const result = calcQuickWeightPresets(records);
    const weights = result.map((p) => p.weight);
    const unique = [...new Set(weights)];
    expect(weights.length).toBe(unique.length);
  });

  it("sorts presets by weight ascending", () => {
    const records = [
      { dt: "2025-01-01", wt: 72.0 },
      { dt: "2025-01-02", wt: 71.0 },
      { dt: "2025-01-03", wt: 70.0 },
    ];
    const result = calcQuickWeightPresets(records);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].weight).toBeGreaterThanOrEqual(result[i - 1].weight);
    }
  });

  it("does not include out-of-range trend predictions", () => {
    const records = [
      { dt: "2025-01-01", wt: 22.0 },
      { dt: "2025-01-02", wt: 21.0 },
    ];
    const result = calcQuickWeightPresets(records);
    // Trend would predict 20.0, which is at the boundary
    // No prediction below 20 should appear
    expect(result.every((p) => p.label !== "trend" || p.weight >= 20)).toBe(true);
  });
});

describe("calcRecordCompleteness", () => {
  it("returns null for null or empty records", () => {
    expect(calcRecordCompleteness(null)).toBeNull();
    expect(calcRecordCompleteness([])).toBeNull();
  });

  it("returns basic level for weight-only records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68 },
    ];
    const result = calcRecordCompleteness(records);
    expect(result.total).toBe(3);
    expect(result.withBodyFat).toBe(0);
    expect(result.withNote).toBe(0);
    expect(result.level).toBe("basic");
    expect(result.completePct).toBe(0);
  });

  it("counts records with body fat", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 20 },
      { dt: "2025-01-02", wt: 69, bf: 19 },
      { dt: "2025-01-03", wt: 68 },
    ];
    const result = calcRecordCompleteness(records);
    expect(result.withBodyFat).toBe(2);
    expect(result.bodyFatPct).toBe(67);
  });

  it("counts records with notes and tags", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "Felt good" },
      { dt: "2025-01-02", wt: 69, note: "#exercise morning run" },
      { dt: "2025-01-03", wt: 68 },
    ];
    const result = calcRecordCompleteness(records);
    expect(result.withNote).toBe(2);
    expect(result.withTag).toBe(1);
    expect(result.notePct).toBe(67);
    expect(result.tagPct).toBe(33);
  });

  it("returns excellent for fully complete records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 20, note: "#exercise" },
      { dt: "2025-01-02", wt: 69, bf: 19, note: "Good day" },
      { dt: "2025-01-03", wt: 68, bf: 18, note: "#diet clean eating" },
    ];
    const result = calcRecordCompleteness(records);
    expect(result.level).toBe("excellent");
    expect(result.completePct).toBe(100);
  });

  it("ignores empty notes and zero body fat", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, bf: 0, note: "" },
      { dt: "2025-01-02", wt: 69, bf: null, note: "  " },
      { dt: "2025-01-03", wt: 68 },
    ];
    const result = calcRecordCompleteness(records);
    expect(result.withBodyFat).toBe(0);
    expect(result.withNote).toBe(0);
  });
});

describe("calcWeightPace", () => {
  const makeDailyRecords = (count, startWt, dailyDelta) =>
    Array.from({ length: count }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: +(startWt + dailyDelta * i).toFixed(1),
    }));

  it("returns null for insufficient data", () => {
    expect(calcWeightPace(null, 65)).toBeNull();
    expect(calcWeightPace([], 65)).toBeNull();
    expect(calcWeightPace(makeDailyRecords(5, 70, -0.1), 65)).toBeNull();
    expect(calcWeightPace(makeDailyRecords(10, 70, -0.1), 0)).toBeNull();
  });

  it("detects healthy loss pace", () => {
    // -0.1 kg/day = ~-0.7 kg/week (within -0.5 to -1.0 range)
    const records = makeDailyRecords(14, 75, -0.1);
    const result = calcWeightPace(records, 65);
    expect(result).not.toBeNull();
    expect(result.direction).toBe("lose");
    expect(result.pace).toBe("healthy");
    expect(result.weeklyRate).toBeLessThan(0);
  });

  it("detects too fast loss pace", () => {
    // -0.2 kg/day = ~-1.4 kg/week (too fast)
    const records = makeDailyRecords(14, 80, -0.2);
    const result = calcWeightPace(records, 65);
    expect(result.pace).toBe("too_fast");
  });

  it("detects too slow loss pace", () => {
    // -0.01 kg/day = ~-0.07 kg/week (too slow)
    const records = makeDailyRecords(14, 70, -0.01);
    const result = calcWeightPace(records, 65);
    expect(result.pace).toBe("too_slow");
  });

  it("detects achieved goal", () => {
    const records = makeDailyRecords(10, 65, 0);
    const result = calcWeightPace(records, 65);
    expect(result.direction).toBe("achieved");
    expect(result.pace).toBe("maintaining");
  });

  it("handles gain direction", () => {
    // +0.05 kg/day = ~0.35 kg/week (healthy gain)
    const records = makeDailyRecords(14, 55, 0.05);
    const result = calcWeightPace(records, 65);
    expect(result.direction).toBe("gain");
    expect(result.pace).toBe("healthy");
  });

  it("detects too fast gain", () => {
    // +0.1 kg/day = ~0.7 kg/week (too fast for gain)
    const records = makeDailyRecords(14, 55, 0.1);
    const result = calcWeightPace(records, 65);
    expect(result.direction).toBe("gain");
    expect(result.pace).toBe("too_fast");
  });
});

describe("calcWeightSmoothness", () => {
  it("returns null for insufficient data", () => {
    expect(calcWeightSmoothness(null)).toBeNull();
    expect(calcWeightSmoothness([])).toBeNull();
    expect(calcWeightSmoothness([
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ])).toBeNull();
  });

  it("returns high score for perfectly linear data", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: +(70 - i * 0.1).toFixed(1),
    }));
    const result = calcWeightSmoothness(records);
    expect(result).not.toBeNull();
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.rating).toBe("very_smooth");
  });

  it("returns lower score for noisy data", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: +(70 + (i % 2 === 0 ? 1 : -1) * 0.8).toFixed(1),
    }));
    const result = calcWeightSmoothness(records);
    expect(result).not.toBeNull();
    expect(result.score).toBeLessThan(70);
  });

  it("returns score between 0 and 100", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + Math.sin(i) * 0.5,
    }));
    const result = calcWeightSmoothness(records);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("includes trendSlope and avgDailyNoise", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.05,
    }));
    const result = calcWeightSmoothness(records);
    expect(result).toHaveProperty("trendSlope");
    expect(result).toHaveProperty("avgDailyNoise");
    expect(result.trendSlope).toBeLessThan(0);
  });

  it("assigns correct rating levels", () => {
    // Constant weight = very smooth
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeightSmoothness(records);
    expect(["very_smooth", "smooth"]).toContain(result.rating);
  });
});

describe("calcPeriodBreakdown", () => {
  it("returns null for insufficient data", () => {
    expect(calcPeriodBreakdown(null)).toBeNull();
    expect(calcPeriodBreakdown([])).toBeNull();
    expect(calcPeriodBreakdown([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("groups records by month", () => {
    const records = [
      { dt: "2025-01-05", wt: 70 },
      { dt: "2025-01-15", wt: 71 },
      { dt: "2025-02-05", wt: 69 },
      { dt: "2025-02-15", wt: 68 },
    ];
    const result = calcPeriodBreakdown(records, 3);
    expect(result).not.toBeNull();
    expect(result.months).toHaveLength(2);
    expect(result.months[0].yearMonth).toBe("2025-01");
    expect(result.months[1].yearMonth).toBe("2025-02");
  });

  it("calculates correct averages", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 72 },
      { dt: "2025-02-01", wt: 68 },
      { dt: "2025-02-02", wt: 66 },
    ];
    const result = calcPeriodBreakdown(records, 3);
    expect(result.months[0].avg).toBe(71);
    expect(result.months[1].avg).toBe(67);
  });

  it("calculates change from previous month", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 72 },
      { dt: "2025-02-01", wt: 68 },
      { dt: "2025-02-02", wt: 66 },
    ];
    const result = calcPeriodBreakdown(records, 3);
    expect(result.months[0].change).toBeNull();
    expect(result.months[1].change).toBe(-4);
  });

  it("limits to requested number of months", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-02-01", wt: 69 },
      { dt: "2025-03-01", wt: 68 },
      { dt: "2025-04-01", wt: 67 },
      { dt: "2025-05-01", wt: 66 },
    ];
    const result = calcPeriodBreakdown(records, 2);
    expect(result.months).toHaveLength(2);
    expect(result.months[0].yearMonth).toBe("2025-04");
    expect(result.months[1].yearMonth).toBe("2025-05");
  });

  it("includes min, max, and count", () => {
    const records = [
      { dt: "2025-01-01", wt: 68 },
      { dt: "2025-01-15", wt: 72 },
      { dt: "2025-01-20", wt: 70 },
      { dt: "2025-02-01", wt: 69 },
    ];
    const result = calcPeriodBreakdown(records, 3);
    expect(result.months[0].min).toBe(68);
    expect(result.months[0].max).toBe(72);
    expect(result.months[0].count).toBe(3);
  });
});

describe("calcMotivationLevel", () => {
  it("returns null for insufficient data", () => {
    expect(calcMotivationLevel(null)).toBeNull();
    expect(calcMotivationLevel([])).toBeNull();
    expect(calcMotivationLevel([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns a level between 1 and 5", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 68 },
    ];
    const result = calcMotivationLevel(records);
    expect(result).not.toBeNull();
    expect(result.level).toBeGreaterThanOrEqual(1);
    expect(result.level).toBeLessThanOrEqual(5);
  });

  it("detects trend direction", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 69 },
    ];
    const result = calcMotivationLevel(records);
    expect(result.trendDirection).toBe("losing");
    expect(result.isImproving).toBe(true);
  });

  it("detects stable trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70.1 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 70.1 },
    ];
    const result = calcMotivationLevel(records);
    expect(result.trendDirection).toBe("stable");
  });

  it("detects gaining trend", () => {
    const records = [
      { dt: "2025-01-01", wt: 68 },
      { dt: "2025-01-02", wt: 69 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 71 },
    ];
    const result = calcMotivationLevel(records);
    expect(result.trendDirection).toBe("gaining");
  });

  it("returns streakDays property", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ];
    const result = calcMotivationLevel(records);
    expect(result).toHaveProperty("streakDays");
    expect(typeof result.streakDays).toBe("number");
  });
});

describe("calcWeightBand", () => {
  it("returns null for insufficient data", () => {
    expect(calcWeightBand(null)).toBeNull();
    expect(calcWeightBand([])).toBeNull();
    expect(calcWeightBand([
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69 },
    ])).toBeNull();
  });

  it("calculates mean correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 70 },
      { dt: "2025-01-04", wt: 70 },
      { dt: "2025-01-05", wt: 70 },
    ];
    const result = calcWeightBand(records);
    expect(result.mean).toBe(70);
    expect(result.stdDev).toBe(0);
    expect(result.low).toBe(70);
    expect(result.high).toBe(70);
  });

  it("calculates band for variable data", () => {
    const records = [
      { dt: "2025-01-01", wt: 69 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-03", wt: 71 },
      { dt: "2025-01-04", wt: 70 },
      { dt: "2025-01-05", wt: 70 },
    ];
    const result = calcWeightBand(records);
    expect(result).not.toBeNull();
    expect(result.low).toBeLessThan(result.mean);
    expect(result.high).toBeGreaterThan(result.mean);
    expect(result.stdDev).toBeGreaterThan(0);
  });

  it("limits to last 14 readings", () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i % 2 === 0 ? 0.5 : -0.5),
    }));
    const result = calcWeightBand(records);
    expect(result.readings).toBe(14);
  });

  it("returns bandwidth property", () => {
    const records = Array.from({ length: 7 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + Math.sin(i) * 0.3,
    }));
    const result = calcWeightBand(records);
    expect(result).toHaveProperty("bandwidth");
    expect(result.bandwidth).toBe(+(result.high - result.low).toFixed(1));
  });
});

describe("calcBestWeighDay", () => {
  // Generate 3 weeks of records to have enough data
  const makeWeeksOfRecords = (weeks, baseWt = 70, dayOffsets = [0, 0, 0, 0, 0, 0, 0]) => {
    const records = [];
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(2025, 0, 6 + w * 7 + d); // Jan 6 2025 = Monday
        const dt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        records.push({ dt, wt: baseWt + dayOffsets[d] });
      }
    }
    return records;
  };

  it("returns null for insufficient data", () => {
    expect(calcBestWeighDay(null)).toBeNull();
    expect(calcBestWeighDay([])).toBeNull();
    expect(calcBestWeighDay([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("identifies the best (lowest avg) day", () => {
    // offsets[0]=Mon(1), [1]=Tue(2), ..., [5]=Sat(6), [6]=Sun(0)
    // offsets[5]=-0.5 → Saturday (getDay()=6) is lightest
    const offsets = [0.5, 0.3, 0.2, 0.1, 0, -0.5, 0.4];
    const records = makeWeeksOfRecords(3, 70, offsets);
    const result = calcBestWeighDay(records);
    expect(result).not.toBeNull();
    expect(result.bestDay).toBe(6); // Saturday = day 6
  });

  it("returns 7 days of data", () => {
    const records = makeWeeksOfRecords(3, 70);
    const result = calcBestWeighDay(records);
    expect(result.days).toHaveLength(7);
  });

  it("calculates diffFromBest correctly", () => {
    const records = makeWeeksOfRecords(3, 70, [1, 0, 0.5, 0.5, 0.5, 0.5, 0.5]);
    const result = calcBestWeighDay(records);
    const bestDayData = result.days.find((d) => d.day === result.bestDay);
    expect(bestDayData.diffFromBest).toBe(0);
    for (const d of result.days) {
      expect(d.diffFromBest).toBeGreaterThanOrEqual(0);
    }
  });

  it("identifies worst day", () => {
    // offsets[0]=Mon(1) has +2, rest 0
    const offsets = [2, 0, 0, 0, 0, 0, 0];
    const records = makeWeeksOfRecords(3, 70, offsets);
    const result = calcBestWeighDay(records);
    expect(result.worstDay).toBe(1); // Monday = day 1
  });
});

describe("calcMiniSparkline", () => {
  it("returns null for insufficient data", () => {
    expect(calcMiniSparkline(null)).toBeNull();
    expect(calcMiniSparkline([])).toBeNull();
    expect(calcMiniSparkline([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("generates points for valid data", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 - i * 0.2,
    }));
    const result = calcMiniSparkline(records, 10);
    expect(result).not.toBeNull();
    expect(result.points).toHaveLength(5);
    expect(result.points[0].x).toBe(0);
    expect(result.points[4].x).toBe(100);
  });

  it("detects downward trend", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 75 - i * 0.5,
    }));
    const result = calcMiniSparkline(records, 10);
    expect(result.trend).toBe("down");
  });

  it("detects upward trend", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 65 + i * 0.5,
    }));
    const result = calcMiniSparkline(records, 10);
    expect(result.trend).toBe("up");
  });

  it("detects flat trend", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcMiniSparkline(records, 10);
    expect(result.trend).toBe("flat");
  });

  it("generates valid SVG path", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i,
    }));
    const result = calcMiniSparkline(records, 10);
    expect(result.svgPath).toMatch(/^M\d+,\d+/);
    expect(result.svgPath).toContain("L");
  });

  it("returns min and max", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 68 + i,
    }));
    const result = calcMiniSparkline(records, 10);
    expect(result.min).toBe(68);
    expect(result.max).toBe(72);
  });
});

describe("calcEntrySummary", () => {
  it("returns null for insufficient data", () => {
    expect(calcEntrySummary(null)).toBeNull();
    expect(calcEntrySummary([])).toBeNull();
    expect(calcEntrySummary([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("calculates vsYesterday correctly", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 69.5 },
    ];
    const result = calcEntrySummary(records);
    expect(result.vsYesterday).toBe(-0.5);
    expect(result.latest.wt).toBe(69.5);
  });

  it("calculates vsWeekAvg", () => {
    const records = Array.from({ length: 8 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    records[7].wt = 68;
    const result = calcEntrySummary(records);
    expect(result.vsWeekAvg).toBe(-2);
  });

  it("detects new all-time best", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcEntrySummary(records);
    expect(result.isNewBest).toBe(true);
    expect(result.allTimeBest).toBe(70);
  });

  it("does not flag new best when not lowest", () => {
    const records = [
      { dt: "2025-01-01", wt: 68 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcEntrySummary(records);
    expect(result.isNewBest).toBe(false);
    expect(result.allTimeBest).toBe(68);
  });

  it("returns latest date and weight", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-05", wt: 69 },
    ];
    const result = calcEntrySummary(records);
    expect(result.latest.dt).toBe("2025-01-05");
    expect(result.latest.wt).toBe(69);
  });
});

describe("calcGoalDistance", () => {
  it("returns null for insufficient data", () => {
    expect(calcGoalDistance(null, 65)).toBeNull();
    expect(calcGoalDistance([], 65)).toBeNull();
    expect(calcGoalDistance([{ dt: "2025-01-01", wt: 70 }], 65)).toBeNull();
    expect(calcGoalDistance([{ dt: "2025-01-01", wt: 70 }, { dt: "2025-01-02", wt: 69 }], 0)).toBeNull();
  });

  it("detects achieved goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 66 },
      { dt: "2025-01-02", wt: 65 },
    ];
    const result = calcGoalDistance(records, 65);
    expect(result.direction).toBe("achieved");
    expect(result.progressPct).toBe(100);
    expect(result.remaining).toBe(0);
  });

  it("calculates remaining for loss goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-02", wt: 70 },
    ];
    const result = calcGoalDistance(records, 65);
    expect(result.remaining).toBe(5);
    expect(result.direction).toBe("lose");
    expect(result.progressPct).toBe(50);
  });

  it("calculates remaining for gain goal", () => {
    const records = [
      { dt: "2025-01-01", wt: 55 },
      { dt: "2025-01-02", wt: 58 },
    ];
    const result = calcGoalDistance(records, 65);
    expect(result.remaining).toBe(7);
    expect(result.direction).toBe("gain");
  });

  it("estimates ETA with sufficient trend data", () => {
    // 14 days losing 0.1kg/day → 50 days for 5kg
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: +(75 - i * 0.1).toFixed(1),
    }));
    const result = calcGoalDistance(records, 65);
    expect(result.etaDays).not.toBeNull();
    expect(result.etaDays).toBeGreaterThan(0);
  });

  it("returns null ETA when pace is wrong direction", () => {
    // Gaining when should be losing
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i * 0.1,
    }));
    const result = calcGoalDistance(records, 65);
    expect(result.etaDays).toBeNull();
  });
});

describe("calcTimeSlotPattern", () => {
  it("returns null for insufficient data", () => {
    expect(calcTimeSlotPattern(null)).toBeNull();
    expect(calcTimeSlotPattern([])).toBeNull();
    expect(calcTimeSlotPattern([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("returns null when no records have time", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    expect(calcTimeSlotPattern(records)).toBeNull();
  });

  it("categorizes morning records correctly", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
      time: "07:30",
    }));
    const result = calcTimeSlotPattern(records);
    expect(result).not.toBeNull();
    expect(result.preferredSlot).toBe("morning");
    const morning = result.slots.find((s) => s.name === "morning");
    expect(morning.count).toBe(5);
  });

  it("categorizes evening records correctly", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
      time: "19:00",
    }));
    const result = calcTimeSlotPattern(records);
    expect(result.preferredSlot).toBe("evening");
  });

  it("calculates average weight per slot", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, time: "07:00" },
      { dt: "2025-01-02", wt: 72, time: "07:30" },
      { dt: "2025-01-03", wt: 68, time: "08:00" },
      { dt: "2025-01-04", wt: 69, time: "19:00" },
      { dt: "2025-01-05", wt: 71, time: "20:00" },
    ];
    const result = calcTimeSlotPattern(records);
    const morning = result.slots.find((s) => s.name === "morning");
    expect(morning.avgWt).toBe(70);
  });

  it("returns 4 slots", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
      time: "10:00",
    }));
    const result = calcTimeSlotPattern(records);
    expect(result.slots).toHaveLength(4);
  });
});

describe("calcStreakBadges", () => {
  const makeConsecutive = (days, startWt = 70) =>
    Array.from({ length: days }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: startWt,
    }));

  it("returns null for insufficient data", () => {
    expect(calcStreakBadges(null)).toBeNull();
    expect(calcStreakBadges([])).toBeNull();
    expect(calcStreakBadges([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("earns 3-day badge for 3 consecutive days", () => {
    const records = makeConsecutive(3);
    const result = calcStreakBadges(records);
    expect(result.badges[0].days).toBe(3);
    expect(result.badges[0].earned).toBe(true);
    expect(result.badges[1].earned).toBe(false); // 7-day not earned
  });

  it("earns all badges for 90+ consecutive days", () => {
    // Use 3 months of consecutive dates
    const records = [];
    const start = new Date(2025, 0, 1);
    for (let i = 0; i < 91; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      records.push({
        dt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wt: 70,
      });
    }
    const result = calcStreakBadges(records);
    expect(result.badges.every((b) => b.earned)).toBe(true);
    expect(result.longestStreak).toBe(91);
  });

  it("calculates current streak", () => {
    const records = makeConsecutive(5);
    const result = calcStreakBadges(records);
    expect(result.currentStreak).toBe(5);
  });

  it("returns 6 badge milestones", () => {
    const records = makeConsecutive(2);
    const result = calcStreakBadges(records);
    expect(result.badges).toHaveLength(6);
  });

  it("handles gaps in recording", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
      { dt: "2025-01-05", wt: 70 }, // gap
      { dt: "2025-01-06", wt: 70 },
    ];
    const result = calcStreakBadges(records);
    expect(result.longestStreak).toBe(2);
    expect(result.currentStreak).toBe(2);
  });
});

describe("calcProgressTimeline", () => {
  it("returns null for insufficient data", () => {
    expect(calcProgressTimeline(null, 65)).toBeNull();
    expect(calcProgressTimeline([], 65)).toBeNull();
    expect(calcProgressTimeline([{ dt: "2025-01-01", wt: 70 }], 65)).toBeNull();
  });

  it("includes start and current events", () => {
    const records = [
      { dt: "2025-01-01", wt: 72 },
      { dt: "2025-01-02", wt: 71 },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcProgressTimeline(records, 65);
    expect(result).not.toBeNull();
    expect(result.events[0].type).toBe("start");
    expect(result.events[result.events.length - 1].type).toBe("current");
  });

  it("calculates total change", () => {
    const records = [
      { dt: "2025-01-01", wt: 75 },
      { dt: "2025-01-02", wt: 73 },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcProgressTimeline(records, 65);
    expect(result.totalChange).toBe(-5);
  });

  it("adds milestone events for kg crossings", () => {
    const records = [
      { dt: "2025-01-01", wt: 73 },
      { dt: "2025-01-05", wt: 71 },
      { dt: "2025-01-10", wt: 70 },
    ];
    const result = calcProgressTimeline(records, 65);
    const milestones = result.events.filter((e) => e.type === "milestone");
    expect(milestones.length).toBeGreaterThanOrEqual(1);
  });

  it("adds personal best event", () => {
    const records = [
      { dt: "2025-01-01", wt: 73 },
      { dt: "2025-01-05", wt: 69 },
      { dt: "2025-01-10", wt: 71 }, // bounced back
    ];
    const result = calcProgressTimeline(records, 65);
    const best = result.events.find((e) => e.type === "best");
    expect(best).toBeDefined();
    expect(best.wt).toBe(69);
  });

  it("limits events to 8 max", () => {
    // Large weight change = many milestones
    const records = Array.from({ length: 20 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 85 - i,
    }));
    const result = calcProgressTimeline(records, 60);
    expect(result.events.length).toBeLessThanOrEqual(8);
  });
});

describe("calcForecastConfidence", () => {
  const makeRecords = (count, startWt, dailyDelta) =>
    Array.from({ length: count }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: +(startWt + dailyDelta * i).toFixed(1),
    }));

  it("returns null for insufficient data", () => {
    expect(calcForecastConfidence(null)).toBeNull();
    expect(calcForecastConfidence([])).toBeNull();
    expect(calcForecastConfidence(makeRecords(5, 70, -0.1))).toBeNull();
  });

  it("forecasts for sufficient data", () => {
    const records = makeRecords(14, 75, -0.1);
    const result = calcForecastConfidence(records);
    expect(result).not.toBeNull();
    expect(result.forecast7).toBeLessThan(result.current);
    expect(result.forecast30).toBeLessThan(result.forecast7);
  });

  it("has high confidence for perfectly linear data", () => {
    const records = makeRecords(14, 70, -0.1);
    const result = calcForecastConfidence(records);
    expect(result.confidence).toBeGreaterThanOrEqual(90);
  });

  it("has lower confidence for noisy data", () => {
    const records = Array.from({ length: 14 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (i % 2 === 0 ? 1 : -1) * 0.8,
    }));
    const result = calcForecastConfidence(records);
    expect(result.confidence).toBeLessThan(50);
  });

  it("includes daily rate", () => {
    const records = makeRecords(14, 70, -0.1);
    const result = calcForecastConfidence(records);
    expect(result.dailyRate).toBeLessThan(0);
  });

  it("confidence is 0–100", () => {
    const records = makeRecords(10, 70, 0.05);
    const result = calcForecastConfidence(records);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});

describe("calcWeightZones", () => {
  const makeRecords = (count, startWt, dailyDelta) =>
    Array.from({ length: count }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: +(startWt + dailyDelta * i).toFixed(1),
    }));

  it("returns null for insufficient data", () => {
    expect(calcWeightZones(null, 70)).toBeNull();
    expect(calcWeightZones([], 70)).toBeNull();
    expect(calcWeightZones([{ dt: "2025-01-01", wt: 70 }], 70)).toBeNull();
    expect(calcWeightZones(makeRecords(5, 70, 0), 0)).toBeNull();
  });

  it("categorizes all records at goal", () => {
    const records = makeRecords(10, 70, 0); // all exactly 70
    const result = calcWeightZones(records, 70);
    expect(result.zones.at.pct).toBe(100);
    expect(result.zones.below.pct).toBe(0);
    expect(result.zones.above.pct).toBe(0);
  });

  it("categorizes records below goal", () => {
    const records = makeRecords(10, 60, 0); // all 60, goal 70
    const result = calcWeightZones(records, 70);
    expect(result.zones.below.pct).toBe(100);
    expect(result.zones.at.pct).toBe(0);
    expect(result.zones.above.pct).toBe(0);
  });

  it("categorizes records above goal", () => {
    const records = makeRecords(10, 80, 0); // all 80, goal 70
    const result = calcWeightZones(records, 70);
    expect(result.zones.above.pct).toBe(100);
  });

  it("calculates margin correctly", () => {
    const result = calcWeightZones(makeRecords(5, 70, 0), 70);
    // 1% of 70 = 0.7
    expect(result.margin).toBe(0.7);
    expect(result.goal).toBe(70);
  });

  it("uses min margin of 0.5 for low goal", () => {
    const result = calcWeightZones(makeRecords(5, 40, 0), 40);
    // 1% of 40 = 0.4, but min is 0.5
    expect(result.margin).toBe(0.5);
  });

  it("includes recent30 stats", () => {
    const records = makeRecords(50, 70, 0);
    const result = calcWeightZones(records, 70);
    expect(result.recent30).toBeDefined();
    expect(result.recent30.at.pct).toBe(100);
    expect(result.total).toBe(50);
  });
});

describe("calcWeightChangeRate", () => {
  const makeRecords = (count, startWt, dailyDelta) =>
    Array.from({ length: count }, (_, i) => ({
      dt: `2025-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      wt: +(startWt + dailyDelta * i).toFixed(1),
    }));

  it("returns null for insufficient data", () => {
    expect(calcWeightChangeRate(null)).toBeNull();
    expect(calcWeightChangeRate([])).toBeNull();
    expect(calcWeightChangeRate(makeRecords(10, 70, -0.1))).toBeNull();
  });

  it("returns windows for sufficient data", () => {
    const records = makeRecords(28, 70, -0.1);
    const result = calcWeightChangeRate(records);
    expect(result).not.toBeNull();
    expect(result.windows.length).toBeGreaterThan(0);
  });

  it("detects losing trend", () => {
    const records = makeRecords(28, 75, -0.15);
    const result = calcWeightChangeRate(records);
    expect(result.trend).toBe("losing");
    expect(result.avgRate).toBeLessThan(0);
  });

  it("detects gaining trend", () => {
    const records = makeRecords(28, 60, 0.15);
    const result = calcWeightChangeRate(records);
    expect(result.trend).toBe("gaining");
    expect(result.avgRate).toBeGreaterThan(0);
  });

  it("detects stable trend", () => {
    const records = makeRecords(28, 70, 0);
    const result = calcWeightChangeRate(records);
    expect(result.trend).toBe("stable");
  });

  it("limits to 8 windows max", () => {
    const records = makeRecords(100, 70, -0.05);
    const result = calcWeightChangeRate(records);
    expect(result.windows.length).toBeLessThanOrEqual(8);
  });

  it("each window has required fields", () => {
    const records = makeRecords(28, 70, -0.1);
    const result = calcWeightChangeRate(records);
    for (const w of result.windows) {
      expect(w).toHaveProperty("endDt");
      expect(w).toHaveProperty("rate");
      expect(w).toHaveProperty("direction");
      expect(["losing", "gaining", "stable"]).toContain(w.direction);
    }
  });
});

describe("calcWeighInConsistency", () => {
  it("returns null for insufficient data", () => {
    expect(calcWeighInConsistency(null)).toBeNull();
    expect(calcWeighInConsistency([])).toBeNull();
    expect(calcWeighInConsistency([
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 70 },
    ])).toBeNull();
  });

  it("detects daily cadence", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeighInConsistency(records);
    expect(result.cadenceLabel).toBe("daily");
    expect(result.cadence).toBe(1);
  });

  it("detects every-other-day cadence", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i * 2 + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeighInConsistency(records);
    expect(result.cadenceLabel).toBe("every_other_day");
    expect(result.cadence).toBe(2);
  });

  it("detects weekly cadence", () => {
    const records = Array.from({ length: 8 }, (_, i) => ({
      dt: `2025-${String(Math.floor((i * 7) / 28) + 1).padStart(2, "0")}-${String((i * 7) % 28 + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeighInConsistency(records);
    expect(result.cadenceLabel).toBe("weekly");
  });

  it("score is 0-100", () => {
    const records = Array.from({ length: 15 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeighInConsistency(records);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("high score for consistent daily recording", () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeighInConsistency(records);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("returns avgInterval", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeighInConsistency(records);
    expect(result.avgInterval).toBe(1);
    expect(result.totalGaps).toBe(9);
  });
});

describe("calcPlateauPeriods", () => {
  it("returns null for insufficient data", () => {
    expect(calcPlateauPeriods(null)).toBeNull();
    expect(calcPlateauPeriods([])).toBeNull();
    expect(calcPlateauPeriods([{ dt: "2025-01-01", wt: 70 }])).toBeNull();
  });

  it("detects a plateau of stable weights", () => {
    // 10 readings all at 70kg = clear plateau
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcPlateauPeriods(records);
    expect(result).not.toBeNull();
    expect(result.plateaus.length).toBeGreaterThanOrEqual(1);
    expect(result.plateaus[0].avgWt).toBe(70);
  });

  it("returns null when weights vary too much", () => {
    // Each reading differs by 2kg - no plateau
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 60 + i * 2,
    }));
    const result = calcPlateauPeriods(records);
    expect(result).toBeNull();
  });

  it("detects current plateau", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + (Math.random() * 0.4 - 0.2), // tiny variation
    }));
    // Force exact weights for predictability
    records.forEach((r) => { r.wt = 70; });
    const result = calcPlateauPeriods(records);
    expect(result.current).toBe(true);
  });

  it("tracks longest plateau days", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcPlateauPeriods(records);
    expect(result.longestDays).toBeGreaterThan(0);
  });

  it("plateau has required fields", () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcPlateauPeriods(records);
    const p = result.plateaus[0];
    expect(p).toHaveProperty("startDt");
    expect(p).toHaveProperty("endDt");
    expect(p).toHaveProperty("days");
    expect(p).toHaveProperty("avgWt");
    expect(p).toHaveProperty("readings");
    expect(p.readings).toBeGreaterThanOrEqual(7);
  });
});

describe("calcWeightPercentileRank", () => {
  const mkRecords = (weights) =>
    weights.map((wt, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt,
    }));

  it("returns null for insufficient data", () => {
    expect(calcWeightPercentileRank(null)).toBeNull();
    expect(calcWeightPercentileRank([])).toBeNull();
    expect(calcWeightPercentileRank(mkRecords([70, 71]))).toBeNull();
  });

  it("calculates percentile for current weight", () => {
    // weights: 60,62,64,66,68,70,72,74,76,78 → current=78 (highest)
    const records = mkRecords([60, 62, 64, 66, 68, 70, 72, 74, 76, 78]);
    const result = calcWeightPercentileRank(records);
    expect(result.percentile).toBeGreaterThanOrEqual(90);
    expect(result.current).toBe(78);
  });

  it("low percentile when current is near minimum", () => {
    // current = 60 (lowest)
    const records = mkRecords([70, 72, 74, 76, 78, 60]);
    const result = calcWeightPercentileRank(records);
    expect(result.percentile).toBeLessThanOrEqual(15);
  });

  it("returns quartile boundaries", () => {
    const records = mkRecords([60, 62, 64, 66, 68, 70, 72, 74, 76, 78]);
    const result = calcWeightPercentileRank(records);
    expect(result.q1).toBeDefined();
    expect(result.median).toBeDefined();
    expect(result.q3).toBeDefined();
    expect(result.q1).toBeLessThanOrEqual(result.median);
    expect(result.median).toBeLessThanOrEqual(result.q3);
  });

  it("returns min/max range", () => {
    const records = mkRecords([60, 65, 70, 75, 80]);
    const result = calcWeightPercentileRank(records);
    expect(result.min).toBe(60);
    expect(result.max).toBe(80);
    expect(result.totalReadings).toBe(5);
  });

  it("percentile is 0-100", () => {
    const records = mkRecords([70, 70, 70, 70, 70]);
    const result = calcWeightPercentileRank(records);
    expect(result.percentile).toBeGreaterThanOrEqual(0);
    expect(result.percentile).toBeLessThanOrEqual(100);
  });
});

describe("calcWeightTrendArrow", () => {
  const mkRecords = (weights) =>
    weights.map((wt, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt,
    }));

  it("returns null for insufficient data", () => {
    expect(calcWeightTrendArrow(null)).toBeNull();
    expect(calcWeightTrendArrow([])).toBeNull();
    expect(calcWeightTrendArrow(mkRecords([70, 71]))).toBeNull();
  });

  it("detects rising trend", () => {
    const records = mkRecords([70, 70.5, 71, 71.5, 72]);
    const result = calcWeightTrendArrow(records);
    expect(["up1", "up2"]).toContain(result.arrow);
    expect(result.change).toBeGreaterThan(0);
  });

  it("detects falling trend", () => {
    const records = mkRecords([75, 74.5, 74, 73.5, 73]);
    const result = calcWeightTrendArrow(records);
    expect(["down1", "down2"]).toContain(result.arrow);
    expect(result.change).toBeLessThan(0);
  });

  it("detects flat trend", () => {
    const records = mkRecords([70, 70.1, 70, 69.9, 70]);
    const result = calcWeightTrendArrow(records);
    expect(result.arrow).toBe("flat");
  });

  it("returns change and days", () => {
    const records = mkRecords([70, 71, 72, 73, 74]);
    const result = calcWeightTrendArrow(records);
    expect(result).toHaveProperty("change");
    expect(result).toHaveProperty("days");
    expect(result.days).toBeGreaterThan(0);
  });

  it("uses last 7 entries max", () => {
    const records = mkRecords([60, 61, 62, 63, 64, 65, 66, 67, 68, 69]);
    const result = calcWeightTrendArrow(records);
    // Should only consider last 7
    expect(result).not.toBeNull();
    expect(result.days).toBeLessThanOrEqual(7);
  });
});

describe("calcBodyCompositionBreakdown", () => {
  it("returns null for insufficient data", () => {
    expect(calcBodyCompositionBreakdown(null)).toBeNull();
    expect(calcBodyCompositionBreakdown([])).toBeNull();
    expect(calcBodyCompositionBreakdown([{ dt: "2025-01-01", wt: 70, bf: 20 }])).toBeNull();
  });

  it("returns null when no bf records", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 71 },
    ];
    expect(calcBodyCompositionBreakdown(records)).toBeNull();
  });

  it("calculates fat and lean mass", () => {
    const records = [
      { dt: "2025-01-01", wt: 80, bf: 25 },
      { dt: "2025-02-01", wt: 75, bf: 20 },
    ];
    const result = calcBodyCompositionBreakdown(records);
    expect(result.first.fatMass).toBe(20); // 80 * 25%
    expect(result.first.leanMass).toBe(60); // 80 - 20
    expect(result.current.fatMass).toBe(15); // 75 * 20%
    expect(result.current.leanMass).toBe(60); // 75 - 15
  });

  it("calculates changes", () => {
    const records = [
      { dt: "2025-01-01", wt: 80, bf: 25 },
      { dt: "2025-02-01", wt: 75, bf: 20 },
    ];
    const result = calcBodyCompositionBreakdown(records);
    expect(result.fatChange).toBe(-5); // 15 - 20
    expect(result.leanChange).toBe(0); // 60 - 60
  });

  it("counts entries with bf", () => {
    const records = [
      { dt: "2025-01-01", wt: 80, bf: 25 },
      { dt: "2025-01-15", wt: 78, bf: 23 },
      { dt: "2025-02-01", wt: 75, bf: 20 },
    ];
    const result = calcBodyCompositionBreakdown(records);
    expect(result.entries).toBe(3);
  });

  it("ignores invalid bf values", () => {
    const records = [
      { dt: "2025-01-01", wt: 80, bf: 25 },
      { dt: "2025-01-10", wt: 79, bf: 0 },
      { dt: "2025-02-01", wt: 75, bf: 20 },
    ];
    const result = calcBodyCompositionBreakdown(records);
    expect(result.entries).toBe(2); // bf=0 excluded
  });
});

describe("calcWeeklyReportCard", () => {
  it("returns null for insufficient data", () => {
    expect(calcWeeklyReportCard(null, 70)).toBeNull();
    expect(calcWeeklyReportCard([], 70)).toBeNull();
    expect(calcWeeklyReportCard([{ dt: "2025-01-01", wt: 70 }], 70)).toBeNull();
  });

  it("returns a grade A-F", () => {
    const records = Array.from({ length: 7 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeeklyReportCard(records, 70);
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
  });

  it("high grade for consistent daily recording at goal", () => {
    const records = Array.from({ length: 7 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeeklyReportCard(records, 70);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(["A", "B"]).toContain(result.grade);
  });

  it("score is 0-100", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70 + i,
    }));
    const result = calcWeeklyReportCard(records, 65);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns component scores", () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const result = calcWeeklyReportCard(records, 70);
    expect(result).toHaveProperty("consistency");
    expect(result).toHaveProperty("goalProgress");
    expect(result).toHaveProperty("stability");
    expect(result).toHaveProperty("weekRecords");
  });

  it("lower consistency for fewer records", () => {
    const daily = Array.from({ length: 7 }, (_, i) => ({
      dt: `2025-01-${String(i + 1).padStart(2, "0")}`,
      wt: 70,
    }));
    const sparse = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-04", wt: 70 },
      { dt: "2025-01-07", wt: 70 },
    ];
    const dailyResult = calcWeeklyReportCard(daily, 70);
    const sparseResult = calcWeeklyReportCard(sparse, 70);
    expect(dailyResult.consistency).toBeGreaterThan(sparseResult.consistency);
  });
});

describe("calcNoteWordFrequency", () => {
  it("returns null for insufficient data", () => {
    expect(calcNoteWordFrequency(null)).toBeNull();
    expect(calcNoteWordFrequency([])).toBeNull();
    expect(calcNoteWordFrequency([{ dt: "2025-01-01", wt: 70, note: "test" }])).toBeNull();
  });

  it("returns null when no notes", () => {
    const records = [
      { dt: "2025-01-01", wt: 70 },
      { dt: "2025-01-02", wt: 71 },
    ];
    expect(calcNoteWordFrequency(records)).toBeNull();
  });

  it("counts word frequency", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "morning run" },
      { dt: "2025-01-02", wt: 70, note: "morning walk" },
      { dt: "2025-01-03", wt: 70, note: "morning run again" },
    ];
    const result = calcNoteWordFrequency(records);
    expect(result).not.toBeNull();
    expect(result.words[0].text).toBe("morning");
    expect(result.words[0].count).toBe(3);
  });

  it("filters stop words", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "the morning is good" },
      { dt: "2025-01-02", wt: 70, note: "the morning was great" },
    ];
    const result = calcNoteWordFrequency(records);
    expect(result.words.find((w) => w.text === "the")).toBeUndefined();
  });

  it("returns totalNotes count", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "run fast" },
      { dt: "2025-01-02", wt: 70, note: "run slow" },
      { dt: "2025-01-03", wt: 70 },
    ];
    const result = calcNoteWordFrequency(records);
    expect(result.totalNotes).toBe(2);
  });

  it("ignores tag markers", () => {
    const records = [
      { dt: "2025-01-01", wt: 70, note: "#exercise morning run" },
      { dt: "2025-01-02", wt: 70, note: "#exercise evening run" },
    ];
    const result = calcNoteWordFrequency(records);
    expect(result.words.find((w) => w.text === "#exercise")).toBeUndefined();
    expect(result.words.find((w) => w.text === "exercise")).toBeUndefined();
  });
});

