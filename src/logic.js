export const STORAGE_KEYS = {
  records: "weightRainbow.records",
  profile: "weightRainbow.profile",
  settings: "weightRainbow.settings",
  firstLaunchDone: "weightRainbow.firstLaunchDone",
};

export const THEME_LIST = [
  { id: "prism",    color: "#ff5f6d" },
  { id: "sunrise",  color: "#ff7a59" },
  { id: "mist",     color: "#0ea5e9" },
  { id: "forest",   color: "#10b981" },
  { id: "lavender", color: "#8b5cf6" },
  { id: "ocean",    color: "#3b82f6" },
  { id: "cherry",   color: "#ec4899" },
  { id: "midnight", color: "#818cf8" },
  { id: "amber",    color: "#f59e0b" },
  { id: "rose",     color: "#f43f5e" },
  { id: "mint",     color: "#14b8a6" },
];

export const MAX_RECORDS = 180;
export const WEIGHT_RANGE = { min: 20, max: 300 };
export const HEIGHT_RANGE = { min: 80, max: 250 };
export const AGE_RANGE = { min: 1, max: 120 };
export const BODY_FAT_RANGE = { min: 1, max: 70 };

export function normalizeNumericInput(value) {
  return String(value ?? "")
    .trim()
    .replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10))
    .replace(/[．，]/g, ".")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");
}

export function validateWeight(value) {
  const normalized = normalizeNumericInput(value);
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) {
    return { valid: false, error: "weight.invalid" };
  }

  const weight = Number(normalized);
  if (!Number.isFinite(weight) || weight < WEIGHT_RANGE.min || weight > WEIGHT_RANGE.max) {
    return { valid: false, error: "weight.range" };
  }

  return { valid: true, weight };
}

export function validateBodyFat(value) {
  if (!value && value !== 0) return { valid: true, bodyFat: null };
  const normalized = normalizeNumericInput(value);
  if (!normalized) return { valid: true, bodyFat: null };
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(normalized)) {
    return { valid: false, error: "bodyFat.invalid" };
  }
  const bodyFat = Number(normalized);
  if (!Number.isFinite(bodyFat) || bodyFat < BODY_FAT_RANGE.min || bodyFat > BODY_FAT_RANGE.max) {
    return { valid: false, error: "bodyFat.range" };
  }
  return { valid: true, bodyFat };
}

export function validateProfile(profile) {
  const result = {
    name: String(profile.name ?? "").trim().slice(0, 40),
    heightCm: null,
    age: null,
    gender: String(profile.gender ?? "unspecified"),
  };

  const heightValue = normalizeNumericInput(profile.heightCm);
  if (heightValue) {
    const heightCm = Number(heightValue);
    if (!Number.isFinite(heightCm) || heightCm < HEIGHT_RANGE.min || heightCm > HEIGHT_RANGE.max) {
      return { valid: false, error: "profile.heightRange" };
    }
    result.heightCm = heightCm;
  }

  const ageValue = normalizeNumericInput(profile.age);
  if (ageValue) {
    const age = Number(ageValue);
    if (!Number.isInteger(age) || age < AGE_RANGE.min || age > AGE_RANGE.max) {
      return { valid: false, error: "profile.ageRange" };
    }
    result.age = age;
  }

  if (!["female", "male", "nonbinary", "unspecified"].includes(result.gender)) {
    result.gender = "unspecified";
  }

  return { valid: true, profile: result };
}

export function calculateBMI(weightKg, heightCm) {
  const weight = Number(weightKg);
  const height = Number(heightCm);
  if (!Number.isFinite(weight) || !Number.isFinite(height) || height <= 0) {
    return null;
  }

  const bmi = weight / ((height / 100) ** 2);
  return Math.round(bmi * 10) / 10;
}

export function getBMIStatus(bmi) {
  if (!Number.isFinite(bmi)) return "bmi.unknown";
  if (bmi < 18.5) return "bmi.under";
  if (bmi < 25) return "bmi.normal";
  if (bmi < 30) return "bmi.over";
  return "bmi.obese";
}

export function extractWeightCandidates(text) {
  const normalized = normalizeNumericInput(text)
    .replace(/kg/gi, " ")
    .replace(/キロ/g, " ")
    .replace(/点/g, ".")
    .replace(/[^\d.]/g, " ");

  const matches = normalized.match(/\d{2,3}(?:\.\d{1,2})?/g) ?? [];
  const candidates = matches
    .map((token) => Number(token))
    .filter((weight) => weight >= WEIGHT_RANGE.min && weight <= WEIGHT_RANGE.max);

  return [...new Set(candidates)];
}

export function pickWeightCandidate(candidates, fallbackWeight = null) {
  if (!candidates.length) return null;
  if (!Number.isFinite(fallbackWeight)) return candidates[0];

  return [...candidates].sort((left, right) => {
    const leftDelta = Math.abs(left - fallbackWeight);
    const rightDelta = Math.abs(right - fallbackWeight);
    return leftDelta - rightDelta;
  })[0];
}

export function parseVoiceWeight(transcript, fallbackWeight = null) {
  const candidates = extractWeightCandidates(transcript);
  return pickWeightCandidate(candidates, fallbackWeight);
}

export function buildRecord({ date, weight, profile, source, imageName = "", bodyFat = null, note = "" }) {
  const bmi = calculateBMI(weight, profile.heightCm);
  return {
    dt: date,
    wt: weight,
    bmi,
    bf: bodyFat,
    note: String(note || "").trim().slice(0, 100),
    source,
    imageName,
    createdAt: new Date().toISOString(),
  };
}

export function upsertRecord(records, record) {
  const next = [...records];
  const existingIndex = next.findIndex((entry) => entry.dt === record.dt);

  if (existingIndex >= 0) {
    next[existingIndex] = { ...next[existingIndex], ...record };
  } else {
    next.push(record);
  }

  next.sort((left, right) => left.dt.localeCompare(right.dt));
  return next;
}

export function trimRecords(records, maxCount = MAX_RECORDS) {
  if (records.length <= maxCount) return records;
  return records.slice(records.length - maxCount);
}

export function calcStats(records, profile = {}) {
  if (!records.length) return null;

  const weights = records.map((record) => record.wt);
  const latestWeight = weights[weights.length - 1];
  const firstWeight = weights[0];
  const avgWeight = weights.reduce((sum, value) => sum + value, 0) / weights.length;
  const latestBMI = calculateBMI(latestWeight, profile.heightCm);

  return {
    latestWeight,
    minWeight: Math.min(...weights),
    maxWeight: Math.max(...weights),
    change: Math.round((latestWeight - firstWeight) * 10) / 10,
    avgWeight: Math.round(avgWeight * 10) / 10,
    latestBMI,
    latestDate: records[records.length - 1].dt,
  };
}

export function createDefaultProfile() {
  return {
    name: "",
    heightCm: "",
    age: "",
    gender: "unspecified",
  };
}

export function createDefaultSettings() {
  return {
    language: "ja",
    theme: "prism",
    chartStyle: "detailed",
    adPreviewEnabled: true,
    goalWeight: null,
    reminderEnabled: false,
    reminderTime: "21:00",
    autoTheme: false,
  };
}

export function calcWeightComparison(records) {
  if (records.length < 2) return null;
  const latest = records[records.length - 1];
  const result = {};

  const findRecordNearDate = (targetDate) => {
    const target = targetDate.toISOString().slice(0, 10);
    // Find closest record on or before target date
    let closest = null;
    for (const r of records) {
      if (r.dt <= target) closest = r;
    }
    return closest;
  };

  const periods = [
    { key: "week", days: 7 },
    { key: "month", days: 30 },
    { key: "quarter", days: 90 },
  ];

  for (const { key, days } of periods) {
    const pastDate = new Date(Date.now() - days * 86400000);
    const pastRecord = findRecordNearDate(pastDate);
    if (pastRecord && pastRecord.dt !== latest.dt) {
      const diff = Math.round((latest.wt - pastRecord.wt) * 10) / 10;
      result[key] = { diff, from: pastRecord.wt, to: latest.wt, fromDate: pastRecord.dt };
    }
  }

  return Object.keys(result).length ? result : null;
}

export function calcDailyDiff(records) {
  if (records.length < 2) return null;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const todayRecord = records.find((r) => r.dt === today);
  const yesterdayRecord = records.find((r) => r.dt === yesterday);
  if (!todayRecord || !yesterdayRecord) return null;
  const diff = Math.round((todayRecord.wt - yesterdayRecord.wt) * 10) / 10;
  return { today: todayRecord.wt, yesterday: yesterdayRecord.wt, diff };
}

export function calcGoalProgress(records, goalWeight) {
  if (!records.length || !Number.isFinite(goalWeight)) return null;
  const firstWeight = records[0].wt;
  const latestWeight = records[records.length - 1].wt;
  const totalToLose = firstWeight - goalWeight;
  if (totalToLose === 0) return { percent: 100, remaining: 0 };
  const lost = firstWeight - latestWeight;
  const percent = Math.max(0, Math.min(100, Math.round((lost / totalToLose) * 100)));
  const remaining = Math.round((latestWeight - goalWeight) * 10) / 10;
  return { percent, remaining };
}

export function calcStreak(records) {
  if (!records.length) return 0;
  const dates = new Set(records.map((r) => r.dt));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (dates.has(dateStr)) {
      streak++;
    } else {
      // Allow gap of today if no record yet today
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

export function calcWeightTrend(records, days = 7) {
  if (records.length < 2) return null;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const recent = records.filter((r) => r.dt >= cutoff);
  if (recent.length < 2) return null;
  const first = recent[0].wt;
  const last = recent[recent.length - 1].wt;
  const diff = Math.round((last - first) * 10) / 10;
  if (diff < -0.1) return "down";
  if (diff > 0.1) return "up";
  return "flat";
}

export function calcGoalPrediction(records, goalWeight) {
  if (!records.length || !Number.isFinite(goalWeight)) return null;
  const latestWeight = records[records.length - 1].wt;
  if (latestWeight <= goalWeight) return { achieved: true, days: 0 };

  // Use last 14 days of data to calculate average daily change
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const recent = records.filter((r) => r.dt >= cutoff);
  if (recent.length < 2) return { achieved: false, insufficient: true };

  const firstRecent = recent[0].wt;
  const lastRecent = recent[recent.length - 1].wt;
  const daySpan = Math.max(1, (new Date(recent[recent.length - 1].dt) - new Date(recent[0].dt)) / 86400000);
  const dailyChange = (lastRecent - firstRecent) / daySpan;

  if (dailyChange >= 0) return { achieved: false, noTrend: true };

  const remaining = latestWeight - goalWeight;
  const days = Math.ceil(remaining / Math.abs(dailyChange));
  const predictedDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  return { achieved: false, days, predictedDate };
}

export function calcPeriodSummary(records, days) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const filtered = records.filter((r) => r.dt >= cutoff);
  if (!filtered.length) return null;
  const weights = filtered.map((r) => r.wt);
  const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
  return {
    count: filtered.length,
    avg,
    min: Math.min(...weights),
    max: Math.max(...weights),
    change: filtered.length >= 2
      ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10
      : 0,
  };
}

export function calcWeeklyRate(records) {
  if (records.length < 2) return null;
  const first = records[0];
  const last = records[records.length - 1];
  const daySpan = (new Date(last.dt) - new Date(first.dt)) / 86400000;
  if (daySpan < 7) return null;
  const totalChange = last.wt - first.wt;
  const weeklyRate = Math.round((totalChange / daySpan) * 7 * 100) / 100;
  return { weeklyRate, totalDays: Math.round(daySpan), totalChange: Math.round(totalChange * 10) / 10 };
}

export function buildCalendarMonth(records, year, month) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const recordMap = {};
  for (const r of records) {
    recordMap[r.dt] = r.wt;
  }

  const monthWeights = [];
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const wt = recordMap[dt] ?? null;
    if (wt !== null) monthWeights.push(wt);
    days.push({ day: d, dt, wt });
  }

  const minWt = monthWeights.length ? Math.min(...monthWeights) : 0;
  const maxWt = monthWeights.length ? Math.max(...monthWeights) : 0;
  const range = maxWt - minWt || 1;

  for (const d of days) {
    d.intensity = d.wt !== null ? (d.wt - minWt) / range : null;
  }

  return {
    year,
    month,
    startDow,
    daysInMonth,
    days,
    recordCount: monthWeights.length,
    label: `${year}-${String(month + 1).padStart(2, "0")}`,
  };
}

export function calcAchievements(records, streak, goalWeight) {
  const achievements = [];
  if (!records.length) return achievements;

  // Record count milestones
  const countMilestones = [1, 10, 30, 50, 100, 180];
  for (const m of countMilestones) {
    if (records.length >= m) {
      achievements.push({ id: `records_${m}`, icon: "📊", tier: m >= 100 ? "gold" : m >= 30 ? "silver" : "bronze" });
    }
  }

  // Streak milestones
  const streakMilestones = [3, 7, 14, 30, 60, 100];
  for (const m of streakMilestones) {
    if (streak >= m) {
      achievements.push({ id: `streak_${m}`, icon: "🔥", tier: m >= 30 ? "gold" : m >= 7 ? "silver" : "bronze" });
    }
  }

  // Weight loss milestones
  if (records.length >= 2) {
    const firstWt = records[0].wt;
    const latestWt = records[records.length - 1].wt;
    const lost = firstWt - latestWt;
    const lossMilestones = [1, 3, 5, 10, 20];
    for (const m of lossMilestones) {
      if (lost >= m) {
        achievements.push({ id: `loss_${m}`, icon: "⬇️", tier: m >= 10 ? "gold" : m >= 5 ? "silver" : "bronze" });
      }
    }
  }

  // Goal achieved
  if (Number.isFinite(goalWeight) && records[records.length - 1].wt <= goalWeight) {
    achievements.push({ id: "goal_achieved", icon: "🎯", tier: "gold" });
  }

  return achievements;
}
