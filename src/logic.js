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

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateStr(d);
}

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
  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) {
    return null;
  }

  const bmi = weight / ((height / 100) ** 2);
  return Math.round(bmi * 10) / 10;
}

export function calcBMIZoneWeights(heightCm) {
  const h = Number(heightCm);
  if (!Number.isFinite(h) || h <= 0) return null;
  const hm = h / 100;
  const hm2 = hm * hm;
  return {
    underMax: Math.round(18.5 * hm2 * 10) / 10,
    normalMax: Math.round(25 * hm2 * 10) / 10,
    overMax: Math.round(30 * hm2 * 10) / 10,
  };
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
    const target = localDateStr(targetDate);
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
  const today = localDateStr();
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = localDateStr(yd);
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

export function calcGoalMilestones(records, goalWeight) {
  if (!records.length || !Number.isFinite(goalWeight)) return null;
  const firstWeight = records[0].wt;
  const latestWeight = records[records.length - 1].wt;
  const totalToLose = firstWeight - goalWeight;
  if (totalToLose <= 0) return null;
  const checkpoints = [25, 50, 75, 100];
  return checkpoints.map((pct) => {
    const targetWeight = firstWeight - (totalToLose * pct) / 100;
    const reached = latestWeight <= targetWeight;
    return { pct, targetWeight: Math.round(targetWeight * 10) / 10, reached };
  });
}

export function calcStreak(records) {
  if (!records.length) return 0;
  const dates = new Set(records.map((r) => r.dt));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
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
  const cutoff = daysAgoStr(days);
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
  const cutoff = daysAgoStr(14);
  const recent = records.filter((r) => r.dt >= cutoff);
  if (recent.length < 2) return { achieved: false, insufficient: true };

  const firstRecent = recent[0].wt;
  const lastRecent = recent[recent.length - 1].wt;
  const daySpan = Math.max(1, (new Date(recent[recent.length - 1].dt + "T00:00:00") - new Date(recent[0].dt + "T00:00:00")) / 86400000);
  const dailyChange = (lastRecent - firstRecent) / daySpan;

  if (dailyChange >= 0) return { achieved: false, noTrend: true };

  const remaining = latestWeight - goalWeight;
  const days = Math.ceil(remaining / Math.abs(dailyChange));
  const pd = new Date();
  pd.setDate(pd.getDate() + days);
  const predictedDate = localDateStr(pd);
  return { achieved: false, days, predictedDate };
}

export function calcPeriodSummary(records, days) {
  const cutoff = daysAgoStr(days);
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
  const daySpan = (new Date(last.dt + "T00:00:00") - new Date(first.dt + "T00:00:00")) / 86400000;
  if (daySpan < 7) return null;
  const totalChange = last.wt - first.wt;
  const weeklyRate = Math.round((totalChange / daySpan) * 7 * 100) / 100;
  return { weeklyRate, totalDays: Math.round(daySpan), totalChange: Math.round(totalChange * 10) / 10 };
}

export function buildCalendarMonth(records, year, month) {
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
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

export function calcMonthlyStats(records) {
  if (!records.length) return [];
  const byMonth = {};
  for (const r of records) {
    const key = r.dt.slice(0, 7); // "YYYY-MM"
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(r);
  }
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
  return months.map((key) => {
    const sorted = byMonth[key].sort((a, b) => a.dt.localeCompare(b.dt));
    const weights = sorted.map((r) => r.wt);
    const avg = Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10;
    const min = Math.round(Math.min(...weights) * 10) / 10;
    const max = Math.round(Math.max(...weights) * 10) / 10;
    const change = Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10;
    return { month: key, count: weights.length, avg, min, max, change };
  });
}

export function calcInsight(records) {
  if (records.length < 3) return null;
  // Find most common recording day of week
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const r of records) {
    const dow = new Date(r.dt + "T00:00:00").getDay();
    dayCounts[dow]++;
  }
  const bestDay = dayCounts.indexOf(Math.max(...dayCounts));

  // This week vs last week average
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const thisWeekStr = localDateStr(thisWeekStart);
  const lastWeekStr = localDateStr(lastWeekStart);

  const thisWeek = records.filter((r) => r.dt >= thisWeekStr);
  const lastWeek = records.filter((r) => r.dt >= lastWeekStr && r.dt < thisWeekStr);

  let weekComparison = null;
  if (thisWeek.length && lastWeek.length) {
    const thisAvg = thisWeek.reduce((s, r) => s + r.wt, 0) / thisWeek.length;
    const lastAvg = lastWeek.reduce((s, r) => s + r.wt, 0) / lastWeek.length;
    weekComparison = Math.round((thisAvg - lastAvg) * 10) / 10;
  }

  return { bestDay, weekComparison };
}

export const NOTE_TAGS = ["exercise", "diet", "cheatday", "sick", "travel", "stress", "sleep", "alcohol"];

export function toggleNoteTag(note, tag) {
  const tagStr = `#${tag}`;
  const current = String(note || "").trim();
  if (current.includes(tagStr)) {
    return current.replace(tagStr, "").replace(/\s{2,}/g, " ").trim();
  }
  const combined = current ? `${current} ${tagStr}` : tagStr;
  return combined.slice(0, 100);
}

export function filterRecords(records, query) {
  if (!query || !query.trim()) return records;
  const q = query.trim().toLowerCase();
  return records.filter((r) => {
    if (r.dt.includes(q)) return true;
    if (r.note && r.note.toLowerCase().includes(q)) return true;
    if (r.source && r.source.toLowerCase().includes(q)) return true;
    if (String(r.wt).includes(q)) return true;
    return false;
  });
}

export function calcDayOfWeekAvg(records) {
  if (records.length < 7) return null;
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const r of records) {
    const dow = new Date(r.dt + "T00:00:00").getDay();
    sums[dow] += r.wt;
    counts[dow]++;
  }
  const avgs = sums.map((s, i) => counts[i] > 0 ? Math.round((s / counts[i]) * 10) / 10 : null);
  const validAvgs = avgs.filter((a) => a !== null);
  if (!validAvgs.length) return null;
  const overallAvg = Math.round((validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length) * 10) / 10;
  return { avgs, counts, overallAvg };
}

export function calcSourceBreakdown(records) {
  if (!records.length) return null;
  const counts = {};
  for (const r of records) {
    const src = r.source || "manual";
    counts[src] = (counts[src] || 0) + 1;
  }
  return counts;
}

export function calcWeightStability(records, days = 7) {
  if (records.length < 3) return null;
  const cutoff = daysAgoStr(days);
  const recent = records.filter((r) => r.dt >= cutoff);
  if (recent.length < 3) return null;
  const weights = recent.map((r) => r.wt);
  const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
  const variance = weights.reduce((s, w) => s + (w - avg) ** 2, 0) / weights.length;
  const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;
  // Score: 0-100, lower stdDev = higher score
  // stdDev of 0 = 100, stdDev of 2+ = 0
  const score = Math.max(0, Math.min(100, Math.round((1 - stdDev / 2) * 100)));
  return { stdDev, score, count: recent.length, avg: Math.round(avg * 10) / 10 };
}

export function detectMilestone(records, newWeight, heightCm) {
  if (!records.length) return null;
  const weights = records.map((r) => r.wt);
  const allTimeMin = Math.min(...weights);

  // New all-time low
  if (newWeight < allTimeMin) {
    return { type: "allTimeLow", diff: Math.round((allTimeMin - newWeight) * 10) / 10 };
  }

  // Round number crossing (e.g., dropped below 70.0)
  const lastWeight = weights[weights.length - 1];
  if (lastWeight > newWeight) {
    const lastFloor = Math.floor(lastWeight);
    const newFloor = Math.floor(newWeight);
    if (newFloor < lastFloor) {
      return { type: "roundNumber", value: lastFloor };
    }
  }

  // BMI threshold crossing
  if (heightCm) {
    const prevBMI = calculateBMI(lastWeight, heightCm);
    const newBMI = calculateBMI(newWeight, heightCm);
    if (prevBMI && newBMI) {
      const thresholds = [30, 25, 18.5];
      for (const th of thresholds) {
        if (prevBMI >= th && newBMI < th) {
          return { type: "bmiCrossing", threshold: th, bmi: newBMI };
        }
      }
    }
  }

  return null;
}

export function filterRecordsByDateRange(records, fromDate, toDate) {
  if (!fromDate && !toDate) return records;
  return records.filter((r) => {
    if (fromDate && r.dt < fromDate) return false;
    if (toDate && r.dt > toDate) return false;
    return true;
  });
}

export function parseCSVImport(csvText) {
  if (!csvText || !csvText.trim()) return { records: [], errors: [] };

  // Strip UTF-8 BOM if present (Excel exports BOM-prefixed files)
  // Single-pass CSV parser handling quoted fields with newlines, commas, and escaped quotes
  const text = csvText.replace(/^\uFEFF/, "").trim();
  const allRows = [];
  let fields = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(field); field = "";
    } else if (ch === "\r" && text[i + 1] === "\n") {
      fields.push(field); field = "";
      allRows.push(fields); fields = [];
      i++; // skip \n
    } else if (ch === "\n") {
      fields.push(field); field = "";
      allRows.push(fields); fields = [];
    } else {
      field += ch;
    }
  }
  if (inQuotes) {
    return { records: [], errors: ["CSV contains unterminated quoted field"] };
  }
  fields.push(field);
  allRows.push(fields);

  if (allRows.length < 2) return { records: [], errors: ["No data rows found"] };

  // Skip header row
  const records = [];
  const errors = [];
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (row.length === 1 && !row[0].trim()) continue;

    const dt = row[0]?.trim();
    const wt = Number(row[1]?.trim());

    if (!dt || !/^\d{4}-\d{2}-\d{2}$/.test(dt) || isNaN(new Date(dt + "T00:00:00").getTime())) {
      errors.push(`Row ${i + 1}: invalid date "${row[0]}"`);
      continue;
    }
    if (!Number.isFinite(wt) || wt < WEIGHT_RANGE.min || wt > WEIGHT_RANGE.max) {
      errors.push(`Row ${i + 1}: invalid weight "${row[1]}"`);
      continue;
    }

    const bmi = row[2]?.trim() ? Number(row[2]) : null;
    const bf = row[3]?.trim() ? Number(row[3]) : null;
    const note = row[5]?.trim() || "";

    const VALID_SOURCES = ["manual", "voice", "photo", "quick", "import"];
    const rawSource = row[4]?.trim().toLowerCase() || "";
    const source = VALID_SOURCES.includes(rawSource) ? rawSource : "import";
    records.push({ dt, wt, bmi: Number.isFinite(bmi) ? bmi : null, bf: Number.isFinite(bf) ? bf : null, source, note: note.slice(0, 100), createdAt: new Date().toISOString() });
  }

  return { records, errors };
}

export function calcBodyFatStats(records) {
  const withBF = records.filter((r) => r.bf != null && Number.isFinite(Number(r.bf)));
  if (withBF.length < 2) return null;

  const values = withBF.map((r) => Number(r.bf));
  const latest = values[values.length - 1];
  const first = values[0];
  const min = Math.round(Math.min(...values) * 10) / 10;
  const max = Math.round(Math.max(...values) * 10) / 10;
  const avg = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
  const change = Math.round((latest - first) * 10) / 10;

  return { latest, first, min, max, avg, change, count: withBF.length };
}

export function calcDaysSinceLastRecord(records) {
  if (!records.length) return null;
  const lastDate = records[records.length - 1].dt;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(lastDate + "T00:00:00");
  const diffMs = today - last;
  return Math.max(0, Math.floor(diffMs / 86400000));
}

export function calcLongestStreak(records) {
  if (!records.length) return 0;
  const dates = new Set(records.map((r) => r.dt));
  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    const diffDays = (curr - prev) / 86400000;
    if (diffDays === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

export function calcTrendForecast(records, forecastDays = 14) {
  if (records.length < 7) return null;
  // Use last 14 days to calculate linear regression
  const cutoff = daysAgoStr(14);
  const recent = records.filter((r) => r.dt >= cutoff);
  if (recent.length < 4) return null;

  // Simple linear regression: day index vs weight
  const startDate = new Date(recent[0].dt + "T00:00:00");
  const points = recent.map((r) => {
    const dayIdx = (new Date(r.dt + "T00:00:00") - startDate) / 86400000;
    return { x: dayIdx, y: r.wt };
  });

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecast points
  const lastDayIdx = points[points.length - 1].x;
  const forecast = [];
  for (let d = 0; d <= forecastDays; d++) {
    const dayIdx = lastDayIdx + d;
    const weight = Math.round((slope * dayIdx + intercept) * 10) / 10;
    if (weight < 20 || weight > 300) break;
    forecast.push({ dayOffset: d, weight });
  }

  return { slope: Math.round(slope * 100) / 100, forecast };
}

export function calcSmoothedWeight(records, smoothing = 0.1) {
  if (!records.length) return null;
  if (records.length === 1) return { smoothed: records[0].wt, trend: 0 };

  // Exponential moving average (EMA)
  let ema = records[0].wt;
  for (let i = 1; i < records.length; i++) {
    ema = smoothing * records[i].wt + (1 - smoothing) * ema;
  }
  const smoothed = Math.round(ema * 10) / 10;

  // Trend: compare current EMA to EMA from 7 records ago
  const lookback = Math.min(7, records.length - 1);
  let emaOld = records[0].wt;
  const targetIdx = records.length - 1 - lookback;
  for (let i = 1; i <= targetIdx; i++) {
    emaOld = smoothing * records[i].wt + (1 - smoothing) * emaOld;
  }
  const trend = lookback > 0 ? Math.round((smoothed - Math.round(emaOld * 10) / 10) * 10) / 10 : 0;

  return { smoothed, trend };
}

export function calcCalendarChangeMap(records) {
  if (records.length < 2) return {};
  const map = {};
  for (let i = 1; i < records.length; i++) {
    const diff = Math.round((records[i].wt - records[i - 1].wt) * 10) / 10;
    map[records[i].dt] = diff;
  }
  return map;
}

export function calcBMIDistribution(records) {
  const withBMI = records.filter((r) => r.bmi != null && Number.isFinite(r.bmi));
  if (!withBMI.length) return null;
  const zones = { under: 0, normal: 0, over: 0, obese: 0 };
  for (const r of withBMI) {
    if (r.bmi < 18.5) zones.under++;
    else if (r.bmi < 25) zones.normal++;
    else if (r.bmi < 30) zones.over++;
    else zones.obese++;
  }
  const total = withBMI.length;
  return {
    under: { count: zones.under, pct: Math.round((zones.under / total) * 100) },
    normal: { count: zones.normal, pct: Math.round((zones.normal / total) * 100) },
    over: { count: zones.over, pct: Math.round((zones.over / total) * 100) },
    obese: { count: zones.obese, pct: Math.round((zones.obese / total) * 100) },
    total,
  };
}

export function calcWeightPercentile(records) {
  if (records.length < 3) return null;
  const latest = records[records.length - 1].wt;
  const sorted = records.map((r) => r.wt).sort((a, b) => a - b);
  let below = 0;
  for (const w of sorted) {
    if (w < latest) below++;
    else break;
  }
  const percentile = Math.round((below / sorted.length) * 100);
  return {
    percentile,
    latest,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    rank: below + 1,
    total: sorted.length,
  };
}

export function calcRecordingTimeStats(records) {
  const withTime = records.filter((r) => r.createdAt);
  if (withTime.length < 3) return null;
  const hours = withTime.map((r) => new Date(r.createdAt).getHours());
  const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const h of hours) {
    if (h >= 5 && h < 12) buckets.morning++;
    else if (h >= 12 && h < 17) buckets.afternoon++;
    else if (h >= 17 && h < 22) buckets.evening++;
    else buckets.night++;
  }
  const total = withTime.length;
  const avgHour = Math.round(hours.reduce((s, h) => s + h, 0) / total);
  const most = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
  return {
    morning: { count: buckets.morning, pct: Math.round((buckets.morning / total) * 100) },
    afternoon: { count: buckets.afternoon, pct: Math.round((buckets.afternoon / total) * 100) },
    evening: { count: buckets.evening, pct: Math.round((buckets.evening / total) * 100) },
    night: { count: buckets.night, pct: Math.round((buckets.night / total) * 100) },
    avgHour,
    mostCommon: most?.[0] || "morning",
    total,
  };
}

export function calcMovingAverages(records, shortWindow = 7, longWindow = 30) {
  if (records.length < longWindow) return null;
  const weights = records.map((r) => r.wt);
  const shortAvg = weights.slice(-shortWindow).reduce((s, w) => s + w, 0) / shortWindow;
  const longAvg = weights.slice(-longWindow).reduce((s, w) => s + w, 0) / longWindow;
  const diff = Math.round((shortAvg - longAvg) * 100) / 100;
  // Check previous crossing: was short above or below long before the latest record?
  let prevSignal = null;
  if (records.length >= longWindow + 1) {
    const prevShort = weights.slice(-(shortWindow + 1), -1).reduce((s, w) => s + w, 0) / shortWindow;
    const prevLong = weights.slice(-(longWindow + 1), -1).reduce((s, w) => s + w, 0) / longWindow;
    const prevDiff = prevShort - prevLong;
    if (prevDiff > 0 && diff <= 0) prevSignal = "crossDown";
    else if (prevDiff < 0 && diff >= 0) prevSignal = "crossUp";
  }
  return {
    shortAvg: Math.round(shortAvg * 10) / 10,
    longAvg: Math.round(longAvg * 10) / 10,
    diff,
    signal: diff < -0.3 ? "below" : diff > 0.3 ? "above" : "aligned",
    crossing: prevSignal,
  };
}

export function calcConsistencyStreak(records, tolerance = 0.5) {
  if (records.length < 2) return null;
  const latest = records[records.length - 1].wt;
  let streak = 1;
  for (let i = records.length - 2; i >= 0; i--) {
    if (Math.abs(records[i].wt - latest) <= tolerance) streak++;
    else break;
  }
  // Find best ever consistency streak
  let best = 1;
  let current = 1;
  for (let i = 1; i < records.length; i++) {
    if (Math.abs(records[i].wt - records[i - 1].wt) <= tolerance) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return { streak, best, tolerance, latest };
}

export function calcDataHealth(records) {
  if (records.length < 2) return null;
  const issues = [];
  // Check for large gaps (>7 days)
  for (let i = 1; i < records.length; i++) {
    const prev = new Date(records[i - 1].dt + "T00:00:00");
    const curr = new Date(records[i].dt + "T00:00:00");
    const gap = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (gap > 7) {
      issues.push({ type: "gap", days: gap, from: records[i - 1].dt, to: records[i].dt });
    }
  }
  // Check for outliers (>3kg from neighbors)
  for (let i = 1; i < records.length - 1; i++) {
    const avg = (records[i - 1].wt + records[i + 1].wt) / 2;
    const diff = Math.abs(records[i].wt - avg);
    if (diff > 3) {
      issues.push({ type: "outlier", date: records[i].dt, weight: records[i].wt, expected: Math.round(avg * 10) / 10 });
    }
  }
  // Check for missing BMI (no height set)
  const missingBMI = records.filter((r) => r.bmi == null).length;
  if (missingBMI > 0 && missingBMI === records.length) {
    issues.push({ type: "noBMI", count: missingBMI });
  }
  const score = Math.max(0, 100 - issues.length * 15);
  return { score, issues, total: records.length };
}

export function calcWeekdayVsWeekend(records) {
  if (records.length < 5) return null;
  const weekday = [];
  const weekend = [];
  for (const r of records) {
    const day = new Date(r.dt + "T00:00:00").getDay();
    if (day === 0 || day === 6) weekend.push(r.wt);
    else weekday.push(r.wt);
  }
  if (!weekday.length || !weekend.length) return null;
  const wdAvg = Math.round((weekday.reduce((s, w) => s + w, 0) / weekday.length) * 10) / 10;
  const weAvg = Math.round((weekend.reduce((s, w) => s + w, 0) / weekend.length) * 10) / 10;
  const diff = Math.round((weAvg - wdAvg) * 10) / 10;
  return {
    weekdayAvg: wdAvg,
    weekendAvg: weAvg,
    diff,
    weekdayCount: weekday.length,
    weekendCount: weekend.length,
    heavier: diff > 0.2 ? "weekend" : diff < -0.2 ? "weekday" : "similar",
  };
}

export function csvEscape(val) {
  const str = String(val ?? "");
  if (/[,"\r\n\t]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportRecordsToCSV(records) {
  const header = "date,weight,bmi,bodyFat,source,note";
  if (!records.length) return "\uFEFF" + header;
  const rows = records.map((r) =>
    [r.dt, r.wt, r.bmi ?? "", r.bf ?? "", r.source ?? "", r.note ?? ""].map(csvEscape).join(",")
  );
  return "\uFEFF" + [header, ...rows].join("\n");
}

export function calcWeightRangePosition(records) {
  if (records.length < 3) return null;
  const latest = records[records.length - 1].wt;
  const weights = records.map((r) => r.wt);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min;
  if (range === 0) return { position: 50, latest, min, max, zone: "middle" };
  const position = Math.round(((latest - min) / range) * 100);
  const zone = position <= 25 ? "low" : position >= 75 ? "high" : "middle";
  return { position, latest, min, max, zone };
}

export function calcTagImpact(records) {
  if (records.length < 5) return null;
  const tagData = {};
  for (let i = 1; i < records.length; i++) {
    const note = records[i].note || "";
    const diff = Math.round((records[i].wt - records[i - 1].wt) * 10) / 10;
    for (const tag of NOTE_TAGS) {
      if (note.includes(`#${tag}`)) {
        if (!tagData[tag]) tagData[tag] = { diffs: [], count: 0 };
        tagData[tag].diffs.push(diff);
        tagData[tag].count++;
      }
    }
  }
  const results = [];
  for (const [tag, data] of Object.entries(tagData)) {
    if (data.count < 3) continue;
    const avg = Math.round((data.diffs.reduce((s, d) => s + d, 0) / data.count) * 100) / 100;
    results.push({ tag, avgChange: avg, count: data.count });
  }
  if (!results.length) return null;
  results.sort((a, b) => a.avgChange - b.avgChange);
  return results;
}

export function calcBestPeriod(records) {
  if (records.length < 7) return null;
  const result = {};
  for (const window of [7, 30]) {
    if (records.length < window) continue;
    let bestChange = Infinity;
    let bestStart = 0;
    for (let i = 0; i <= records.length - window; i++) {
      const change = records[i + window - 1].wt - records[i].wt;
      if (change < bestChange) {
        bestChange = change;
        bestStart = i;
      }
    }
    if (bestChange === Infinity) continue;
    result[window] = {
      change: Math.round(bestChange * 10) / 10,
      from: records[bestStart].dt,
      to: records[bestStart + window - 1].dt,
      startWeight: records[bestStart].wt,
      endWeight: records[bestStart + window - 1].wt,
    };
  }
  return Object.keys(result).length ? result : null;
}

export function calcWeeklyFrequency(records, weeks = 8) {
  if (!records.length) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - dayOfWeek);

  const buckets = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    const endStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;
    const count = records.filter((r) => r.dt >= startStr && r.dt <= endStr).length;
    buckets.push({ startStr, count });
  }
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const totalRecords = buckets.reduce((s, b) => s + b.count, 0);
  const avgPerWeek = Math.round((totalRecords / weeks) * 10) / 10;
  return { buckets, maxCount, avgPerWeek, weeks };
}

export function calcWeightVelocity(records) {
  if (records.length < 3) return null;
  const calc = (days) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    const recent = records.filter((r) => r.dt >= cutoffStr);
    if (recent.length < 2) return null;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const daySpan = (new Date(last.dt + "T00:00:00") - new Date(first.dt + "T00:00:00")) / 86400000;
    if (daySpan < 1) return null;
    const dailyRate = (last.wt - first.wt) / daySpan;
    return {
      dailyRate: Math.round(dailyRate * 100) / 100,
      monthlyProjection: Math.round(dailyRate * 30 * 10) / 10,
      change: Math.round((last.wt - first.wt) * 10) / 10,
      days: Math.round(daySpan),
    };
  };
  const week = calc(7);
  const month = calc(30);
  if (!week && !month) return null;
  return { week, month };
}

export function calcWeightVariance(records) {
  if (records.length < 5) return null;
  const last14 = records.slice(-14);
  const weights = last14.map((r) => r.wt);
  const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
  if (avg === 0) return null;
  const variance = weights.reduce((s, w) => s + (w - avg) ** 2, 0) / weights.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100; // coefficient of variation in %
  const maxSwing = Math.round((Math.max(...weights) - Math.min(...weights)) * 10) / 10;
  // Daily diffs
  const diffs = [];
  for (let i = 1; i < weights.length; i++) {
    diffs.push(Math.abs(weights[i] - weights[i - 1]));
  }
  const avgDailySwing = diffs.length ? Math.round((diffs.reduce((s, d) => s + d, 0) / diffs.length) * 100) / 100 : 0;
  const level = cv < 0.5 ? "veryLow" : cv < 1.0 ? "low" : cv < 2.0 ? "moderate" : "high";
  return {
    cv: Math.round(cv * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    avg: Math.round(avg * 10) / 10,
    maxSwing,
    avgDailySwing,
    count: weights.length,
    level,
  };
}

export function calcWeightPlateau(records) {
  if (records.length < 14) return null;
  const recent = records.slice(-14);
  const weights = recent.map((r) => r.wt);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = Math.round((max - min) * 10) / 10;
  const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const daySpan = Math.max(1, (new Date(last.dt + "T00:00:00") - new Date(first.dt + "T00:00:00")) / 86400000);
  const recentChange = Math.abs(last.wt - first.wt);

  // Check previous period for comparison
  let previousRate = null;
  if (records.length >= 28) {
    const prev = records.slice(-28, -14);
    const prevFirst = prev[0];
    const prevLast = prev[prev.length - 1];
    const prevDays = Math.max(1, (new Date(prevLast.dt + "T00:00:00") - new Date(prevFirst.dt + "T00:00:00")) / 86400000);
    previousRate = Math.round(((prevLast.wt - prevFirst.wt) / prevDays) * 100) / 100;
  }

  // Plateau: range <= 1.0kg AND change <= 0.5kg over the period
  const isPlateau = range <= 1.0 && recentChange <= 0.5;
  return {
    isPlateau,
    days: Math.round(daySpan),
    range,
    avg,
    recentChange: Math.round(recentChange * 10) / 10,
    previousRate,
  };
}

export function calcRecordGaps(records) {
  if (records.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < records.length; i++) {
    const prev = new Date(records[i - 1].dt + "T00:00:00");
    const curr = new Date(records[i].dt + "T00:00:00");
    const days = Math.round((curr - prev) / 86400000);
    if (days > 1) {
      gaps.push({ from: records[i - 1].dt, to: records[i].dt, days });
    }
  }
  gaps.sort((a, b) => b.days - a.days);
  const totalDays = Math.max(1, (new Date(records[records.length - 1].dt + "T00:00:00") - new Date(records[0].dt + "T00:00:00")) / 86400000);
  const coverage = Math.round((records.length / (totalDays + 1)) * 100);
  return {
    gaps: gaps.slice(0, 5),
    totalGaps: gaps.length,
    longestGap: gaps.length ? gaps[0].days : 0,
    coverage,
    totalDays: Math.round(totalDays),
    recordCount: records.length,
  };
}

export function calcCalorieEstimate(records) {
  if (records.length < 3) return null;
  const KCAL_PER_KG = 7700;
  const calc = (days) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    const recent = records.filter((r) => r.dt >= cutoffStr);
    if (recent.length < 2) return null;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const daySpan = (new Date(last.dt + "T00:00:00") - new Date(first.dt + "T00:00:00")) / 86400000;
    if (daySpan < 1) return null;
    const weightChange = last.wt - first.wt;
    const totalKcal = Math.round(weightChange * KCAL_PER_KG);
    const dailyKcal = Math.round(totalKcal / daySpan);
    return { weightChange: Math.round(weightChange * 10) / 10, totalKcal, dailyKcal, days: Math.round(daySpan) };
  };
  const week = calc(7);
  const month = calc(30);
  if (!week && !month) return null;
  return { week, month };
}

export function calcMomentumScore(records, goalWeight = null) {
  if (records.length < 7) return null;
  let score = 50;
  const factors = [];

  // Factor 1: 7-day trend direction (±20 points)
  const recent7 = records.slice(-7);
  const change7 = recent7[recent7.length - 1].wt - recent7[0].wt;
  const isLossGoal = !Number.isFinite(goalWeight) || goalWeight < records[0].wt;
  if (isLossGoal) {
    if (change7 < -0.3) { score += 20; factors.push("trendGood"); }
    else if (change7 < 0) { score += 10; factors.push("trendOk"); }
    else if (change7 > 0.3) { score -= 15; factors.push("trendBad"); }
  } else {
    if (change7 > 0.3) { score += 20; factors.push("trendGood"); }
    else if (change7 > 0) { score += 10; factors.push("trendOk"); }
    else if (change7 < -0.3) { score -= 15; factors.push("trendBad"); }
  }

  // Factor 2: Recording consistency (±15 points)
  const now = new Date();
  let freq = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (records.some((r) => r.dt === ds)) freq++;
  }
  if (freq >= 6) { score += 15; factors.push("consistencyHigh"); }
  else if (freq >= 4) { score += 5; factors.push("consistencyMed"); }
  else { score -= 10; factors.push("consistencyLow"); }

  // Factor 3: Stability (±10 points)
  if (records.length >= 5) {
    const last5 = records.slice(-5).map((r) => r.wt);
    const avg5 = last5.reduce((s, w) => s + w, 0) / last5.length;
    const maxDev = Math.max(...last5.map((w) => Math.abs(w - avg5)));
    if (maxDev < 0.5) { score += 10; factors.push("stable"); }
    else if (maxDev > 2) { score -= 10; factors.push("volatile"); }
  }

  // Factor 4: Near goal bonus (+5 points)
  if (Number.isFinite(goalWeight)) {
    const latest = records[records.length - 1].wt;
    if (Math.abs(latest - goalWeight) < 1) { score += 5; factors.push("nearGoal"); }
  }

  score = Math.max(0, Math.min(100, score));
  const level = score >= 75 ? "great" : score >= 50 ? "good" : score >= 25 ? "fair" : "low";
  return { score, level, factors };
}

export function calcNextMilestones(records, heightCm = null) {
  if (!records.length) return null;
  const latest = records[records.length - 1].wt;
  const milestones = [];

  // Next round number below current weight
  const nextRoundDown = Math.floor(latest);
  if (nextRoundDown >= WEIGHT_RANGE.min && nextRoundDown < latest) {
    milestones.push({
      type: "roundDown",
      target: nextRoundDown,
      remaining: Math.round((latest - nextRoundDown) * 10) / 10,
    });
  }

  // Next 5kg milestone below
  const next5Down = Math.floor(latest / 5) * 5;
  if (next5Down >= WEIGHT_RANGE.min && next5Down < latest && next5Down !== nextRoundDown) {
    milestones.push({
      type: "fiveDown",
      target: next5Down,
      remaining: Math.round((latest - next5Down) * 10) / 10,
    });
  }

  // BMI zone boundary milestones
  if (heightCm) {
    const hm2 = (heightCm / 100) ** 2;
    const currentBMI = latest / hm2;
    const boundaries = [
      { bmi: 25, label: "normalMax" },
      { bmi: 18.5, label: "underMax" },
      { bmi: 30, label: "overMax" },
    ];
    for (const b of boundaries) {
      const targetWt = Math.round(b.bmi * hm2 * 10) / 10;
      if (currentBMI > b.bmi && targetWt < latest) {
        milestones.push({
          type: "bmiZone",
          target: targetWt,
          remaining: Math.round((latest - targetWt) * 10) / 10,
          bmiLabel: b.label,
          bmiValue: b.bmi,
        });
      }
    }
  }

  milestones.sort((a, b) => a.remaining - b.remaining);
  return milestones.length ? milestones.slice(0, 3) : null;
}

export function calcSeasonality(records) {
  if (records.length < 30) return null;
  const monthData = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }));
  for (const r of records) {
    const month = parseInt(r.dt.slice(5, 7), 10) - 1;
    monthData[month].sum += r.wt;
    monthData[month].count++;
  }
  const avgs = monthData.map((m) => m.count > 0 ? Math.round((m.sum / m.count) * 10) / 10 : null);
  const validAvgs = avgs.filter((a) => a !== null);
  if (validAvgs.length < 3) return null;
  const overallAvg = Math.round((validAvgs.reduce((s, a) => s + a, 0) / validAvgs.length) * 10) / 10;
  const lightest = avgs.reduce((best, a, i) => a !== null && (best === null || a < avgs[best]) ? i : best, null);
  const heaviest = avgs.reduce((best, a, i) => a !== null && (best === null || a > avgs[best]) ? i : best, null);
  const seasonalRange = lightest !== null && heaviest !== null
    ? Math.round((avgs[heaviest] - avgs[lightest]) * 10) / 10
    : 0;
  return {
    monthAvgs: avgs,
    counts: monthData.map((m) => m.count),
    overallAvg,
    lightestMonth: lightest,
    heaviestMonth: heaviest,
    seasonalRange,
  };
}

export function calcWeightDistribution(records, bucketSize = 1) {
  if (records.length < 5) return null;
  const weights = records.map((r) => r.wt);
  const min = Math.floor(Math.min(...weights));
  const max = Math.ceil(Math.max(...weights));
  if (min === max) return null;

  const buckets = [];
  for (let start = min; start < max; start += bucketSize) {
    const end = start + bucketSize;
    const count = weights.filter((w) => w >= start && w < end).length;
    buckets.push({ start, end, count });
  }
  // Include max in last bucket
  const lastBucket = buckets[buckets.length - 1];
  lastBucket.count += weights.filter((w) => w === max).length;

  const maxCount = Math.max(...buckets.map((b) => b.count));
  const latest = weights[weights.length - 1];
  const latestBucketIdx = buckets.findIndex((b) => latest >= b.start && latest < b.end);
  const latestBucket = latestBucketIdx >= 0 ? latestBucketIdx : buckets.length - 1;
  const modeBucket = buckets.reduce((best, b, i) => b.count > buckets[best].count ? i : best, 0);

  return {
    buckets,
    maxCount,
    latestBucket,
    modeBucket,
    modeRange: `${buckets[modeBucket].start}-${buckets[modeBucket].end}`,
    total: records.length,
  };
}

export function calcDayOfWeekChange(records) {
  if (records.length < 7) return null;
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 1; i < records.length; i++) {
    const prev = new Date(records[i - 1].dt + "T00:00:00");
    const curr = new Date(records[i].dt + "T00:00:00");
    const gap = (curr - prev) / 86400000;
    if (gap !== 1) continue; // only consecutive days
    const dow = curr.getDay();
    const diff = records[i].wt - records[i - 1].wt;
    sums[dow] += diff;
    counts[dow]++;
  }
  const avgs = sums.map((s, i) => counts[i] > 0 ? Math.round((s / counts[i]) * 100) / 100 : null);
  const valid = avgs.filter((a) => a !== null);
  if (valid.length < 3) return null;
  const worstDay = avgs.reduce((best, a, i) => a !== null && (best === null || a > avgs[best]) ? i : best, null);
  const bestDay = avgs.reduce((best, a, i) => a !== null && (best === null || a < avgs[best]) ? i : best, null);
  return { avgs, counts, worstDay, bestDay };
}

export function calcPersonalRecords(records) {
  if (records.length < 3) return null;
  const weights = records.map((r) => r.wt);
  const allTimeLow = Math.min(...weights);
  const allTimeLowDate = records.find((r) => r.wt === allTimeLow)?.dt ?? null;

  // Biggest single-day drop
  let biggestDrop = 0;
  let biggestDropDate = null;
  for (let i = 1; i < records.length; i++) {
    const drop = records[i - 1].wt - records[i].wt;
    if (drop > biggestDrop) {
      biggestDrop = drop;
      biggestDropDate = records[i].dt;
    }
  }
  biggestDrop = Math.round(biggestDrop * 10) / 10;

  // Best 7-day change
  let best7 = Infinity;
  let best7From = null;
  if (records.length >= 7) {
    for (let i = 0; i <= records.length - 7; i++) {
      const change = records[i + 6].wt - records[i].wt;
      if (change < best7) {
        best7 = change;
        best7From = records[i].dt;
      }
    }
  }
  best7 = best7 === Infinity ? null : Math.round(best7 * 10) / 10;

  // Total weight lost from first record
  const totalChange = Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10;

  return {
    allTimeLow,
    allTimeLowDate,
    biggestDrop,
    biggestDropDate,
    best7DayChange: best7,
    best7DayFrom: best7From,
    totalChange,
    totalRecords: records.length,
    firstDate: records[0].dt,
    latestDate: records[records.length - 1].dt,
  };
}

export function calcWeightRegression(records) {
  if (records.length < 5) return null;
  const startDate = new Date(records[0].dt + "T00:00:00");
  const points = records.map((r) => ({
    x: (new Date(r.dt + "T00:00:00") - startDate) / 86400000,
    y: r.wt,
  }));
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  const ssTotal = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssResidual = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTotal > 0 ? Math.round((1 - ssResidual / ssTotal) * 1000) / 1000 : 0;

  const totalDays = points[points.length - 1].x;
  const weeklyRate = Math.round(slope * 7 * 100) / 100;
  const direction = slope < -0.01 ? "losing" : slope > 0.01 ? "gaining" : "maintaining";
  const fit = r2 >= 0.7 ? "strong" : r2 >= 0.3 ? "moderate" : "weak";

  return {
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 10) / 10,
    r2,
    weeklyRate,
    direction,
    fit,
    totalDays: Math.round(totalDays),
  };
}

export function calcBMIHistory(records) {
  const withBMI = records.filter((r) => r.bmi != null && Number.isFinite(r.bmi));
  if (withBMI.length < 3) return null;
  const bmis = withBMI.map((r) => r.bmi);
  const first = Math.round(bmis[0] * 10) / 10;
  const latest = Math.round(bmis[bmis.length - 1] * 10) / 10;
  const min = Math.round(Math.min(...bmis) * 10) / 10;
  const max = Math.round(Math.max(...bmis) * 10) / 10;
  const change = Math.round((latest - first) * 10) / 10;
  const avg = Math.round((bmis.reduce((s, b) => s + b, 0) / bmis.length) * 10) / 10;

  // Time in each zone
  const zones = { under: 0, normal: 0, over: 0, obese: 0 };
  for (const b of bmis) {
    if (b < 18.5) zones.under++;
    else if (b < 25) zones.normal++;
    else if (b < 30) zones.over++;
    else zones.obese++;
  }
  const total = bmis.length;
  const zonePcts = {
    under: Math.round((zones.under / total) * 100),
    normal: Math.round((zones.normal / total) * 100),
    over: Math.round((zones.over / total) * 100),
    obese: Math.round((zones.obese / total) * 100),
  };

  const currentZone = latest < 18.5 ? "under" : latest < 25 ? "normal" : latest < 30 ? "over" : "obese";
  const improving = change < 0 && first > 18.5; // BMI decreasing from overweight is improvement

  return { first, latest, min, max, change, avg, zones: zonePcts, currentZone, improving, count: total };
}

/**
 * Calculates a weekly weight-change heatmap for the last 12 weeks.
 * Each cell represents one day with a change intensity level (0-4).
 */
export function calcWeightHeatmap(records) {
  if (records.length < 7) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const byDate = new Map(sorted.map((r) => [r.dt, r.wt]));

  // Build last 12 weeks (84 days)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  // Start from the beginning of the week 11 weeks ago
  const startOffset = dayOfWeek + 7 * 11;
  const weeks = [];
  let totalChanges = 0;
  let changeCount = 0;

  for (let w = 0; w < 12; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const daysBack = startOffset - (w * 7 + d);
      const date = new Date(today);
      date.setDate(date.getDate() - daysBack);
      const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const wt = byDate.get(ds) ?? null;

      // Find previous day's weight for change calc
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDs = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
      const prevWt = byDate.get(prevDs) ?? null;
      let change = null;
      if (wt != null && prevWt != null) {
        change = Math.round((wt - prevWt) * 100) / 100;
        totalChanges += Math.abs(change);
        changeCount++;
      }
      week.push({ date: ds, weight: wt, change, isFuture: daysBack < 0 });
    }
    weeks.push(week);
  }

  // Determine thresholds for intensity levels
  const avgChange = changeCount > 0 ? totalChanges / changeCount : 0.3;
  const threshold = Math.max(avgChange, 0.1);

  // Assign intensity levels: 0=no data, 1=small, 2=moderate, 3=large, 4=very large
  for (const week of weeks) {
    for (const day of week) {
      if (day.isFuture || day.weight == null) {
        day.level = 0;
      } else if (day.change == null) {
        day.level = 1; // has weight but no change data
      } else {
        const absChange = Math.abs(day.change);
        if (absChange < threshold * 0.5) day.level = 1;
        else if (absChange < threshold) day.level = 2;
        else if (absChange < threshold * 2) day.level = 3;
        else day.level = 4;
        day.direction = day.change < 0 ? "loss" : day.change > 0 ? "gain" : "same";
      }
    }
  }

  return { weeks, threshold: Math.round(threshold * 100) / 100, daysWithData: changeCount };
}

/**
 * Calculates streak-based rewards/milestones for consistent weight recording.
 * Returns the current streak, next milestone, and earned badges.
 */
export function calcStreakRewards(records) {
  if (records.length < 1) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));

  // Calculate current streak from today backwards
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dateSet = new Set(sorted.map((r) => r.dt));

  let streak = 0;
  const d = new Date(today);
  // Allow starting from today or yesterday
  if (!dateSet.has(todayStr)) {
    d.setDate(d.getDate() - 1);
  }
  while (true) {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dateSet.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // Milestone thresholds
  const milestones = [3, 7, 14, 21, 30, 60, 90, 120, 180, 365];
  const earned = milestones.filter((m) => streak >= m);
  const next = milestones.find((m) => streak < m) || null;
  const nextRemaining = next ? next - streak : 0;

  // Badge level based on highest earned milestone
  let level = "starter";
  if (streak >= 365) level = "legend";
  else if (streak >= 180) level = "master";
  else if (streak >= 90) level = "expert";
  else if (streak >= 30) level = "dedicated";
  else if (streak >= 14) level = "committed";
  else if (streak >= 7) level = "steady";
  else if (streak >= 3) level = "beginner";

  return { streak, level, earned, next, nextRemaining, totalRecords: records.length };
}

/**
 * Calculates weight prediction with confidence intervals.
 * Uses recent trend + variance to show optimistic/pessimistic/expected weight at target dates.
 */
export function calcWeightConfidence(records) {
  if (records.length < 7) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-30); // Use last 30 records for trend
  if (recent.length < 7) return null;

  // Calculate daily rate via linear regression on recent data
  const firstDate = new Date(recent[0].dt + "T00:00:00");
  const xs = recent.map((r) => (new Date(r.dt + "T00:00:00") - firstDate) / 86400000);
  const ys = recent.map((r) => r.wt);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate standard deviation of residuals
  const residuals = xs.map((x, i) => ys[i] - (intercept + slope * x));
  const residualSq = residuals.reduce((a, r) => a + r * r, 0);
  const stdDev = Math.sqrt(residualSq / (n - 2));

  // Current weight and predictions
  const latest = recent[recent.length - 1].wt;
  const lastDay = xs[xs.length - 1];

  // Forecast at 7, 14, 30 days from last record
  const forecasts = [7, 14, 30].map((days) => {
    const futureX = lastDay + days;
    const predicted = intercept + slope * futureX;
    const margin = stdDev * 1.96; // 95% confidence
    return {
      days,
      predicted: Math.round(predicted * 10) / 10,
      low: Math.round((predicted - margin) * 10) / 10,
      high: Math.round((predicted + margin) * 10) / 10,
      margin: Math.round(margin * 10) / 10,
    };
  });

  // Confidence level based on R² and data density
  const ssTotal = ys.reduce((a, y) => a + (y - sumY / n) ** 2, 0);
  const r2 = ssTotal > 0 ? 1 - residualSq / ssTotal : 0;
  let confidence = "low";
  if (r2 > 0.7 && n >= 14) confidence = "high";
  else if (r2 > 0.4 && n >= 7) confidence = "medium";

  return {
    dailyRate: Math.round(slope * 100) / 100,
    weeklyRate: Math.round(slope * 7 * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    confidence,
    r2: Math.round(r2 * 100) / 100,
    forecasts,
    latest,
    dataPoints: n,
  };
}

/**
 * Calculates a weight progress summary comparing two periods.
 * Compares first half vs second half of records for improvement detection.
 */
export function calcProgressSummary(records) {
  if (records.length < 4) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avg = (arr) => Math.round((arr.reduce((s, r) => s + r.wt, 0) / arr.length) * 10) / 10;
  const stdDev = (arr) => {
    const mean = arr.reduce((s, r) => s + r.wt, 0) / arr.length;
    return Math.round(Math.sqrt(arr.reduce((s, r) => s + (r.wt - mean) ** 2, 0) / arr.length) * 100) / 100;
  };

  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);
  const change = Math.round((secondAvg - firstAvg) * 10) / 10;
  const firstStd = stdDev(firstHalf);
  const secondStd = stdDev(secondHalf);

  // Stability improvement: lower std dev in second half = more stable
  const moreStable = secondStd < firstStd;

  // Total journey
  const firstWt = sorted[0].wt;
  const lastWt = sorted[sorted.length - 1].wt;
  const totalChange = Math.round((lastWt - firstWt) * 10) / 10;
  const totalDays = Math.max(1, Math.round((new Date(sorted[sorted.length - 1].dt + "T00:00:00") - new Date(sorted[0].dt + "T00:00:00")) / 86400000));

  // Direction assessment
  let trend = "stable";
  if (change < -0.5) trend = "improving";
  else if (change > 0.5) trend = "gaining";

  return {
    firstHalfAvg: firstAvg,
    secondHalfAvg: secondAvg,
    change,
    trend,
    moreStable,
    firstStd,
    secondStd,
    totalChange,
    totalDays,
    firstDate: sorted[0].dt,
    lastDate: sorted[sorted.length - 1].dt,
    recordCount: sorted.length,
  };
}

/**
 * Builds a timeline of significant weight milestones.
 * Detects: 5kg marks crossed, all-time lows, BMI zone transitions.
 */
export function calcMilestoneTimeline(records) {
  if (records.length < 3) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const events = [];
  let allTimeLow = sorted[0].wt;
  let prevBmiZone = null;

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;

    // All-time low
    if (r.wt < allTimeLow) {
      allTimeLow = r.wt;
      events.push({ type: "low", date: r.dt, weight: r.wt });
    }

    // 5kg mark crossed
    if (prev) {
      const prevMark = Math.floor(prev.wt / 5) * 5;
      const curMark = Math.floor(r.wt / 5) * 5;
      if (curMark < prevMark) {
        // Crossed below a 5kg boundary (e.g. dropped below 75)
        events.push({ type: "mark", date: r.dt, weight: r.wt, mark: prevMark });
      }
    }

    // BMI zone transition
    if (r.bmi != null) {
      const zone = r.bmi < 18.5 ? "under" : r.bmi < 25 ? "normal" : r.bmi < 30 ? "over" : "obese";
      if (prevBmiZone && zone !== prevBmiZone) {
        events.push({ type: "bmi", date: r.dt, weight: r.wt, from: prevBmiZone, to: zone });
      }
      prevBmiZone = zone;
    }
  }

  // Deduplicate: keep max 1 all-time-low per month, keep all marks and bmi transitions
  const dedupLows = new Map();
  const filtered = [];
  for (const e of events) {
    if (e.type === "low") {
      const month = e.date.slice(0, 7);
      dedupLows.set(month, e); // keep latest low per month
    } else {
      filtered.push(e);
    }
  }
  filtered.push(...dedupLows.values());
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  return { events: filtered.slice(-10), total: filtered.length };
}

/**
 * Calculates a volatility index measuring day-to-day weight fluctuation.
 * Compares recent (7-day) vs overall volatility to detect trend changes.
 */
export function calcVolatilityIndex(records) {
  if (records.length < 5) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));

  // Calculate consecutive-day changes
  const changes = [];
  for (let i = 1; i < sorted.length; i++) {
    const dayDiff = Math.round((new Date(sorted[i].dt + "T00:00:00") - new Date(sorted[i - 1].dt + "T00:00:00")) / 86400000);
    if (dayDiff === 1) {
      changes.push(Math.abs(sorted[i].wt - sorted[i - 1].wt));
    }
  }
  if (changes.length < 3) return null;

  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const overallAvg = Math.round(avg(changes) * 100) / 100;

  // Recent volatility (last 7 changes)
  const recentChanges = changes.slice(-7);
  const recentAvg = Math.round(avg(recentChanges) * 100) / 100;

  // Max single-day swing
  const maxSwing = Math.round(Math.max(...changes) * 100) / 100;

  // Volatility level
  let level = "moderate";
  if (overallAvg < 0.3) level = "low";
  else if (overallAvg > 0.8) level = "high";

  // Trend: is volatility increasing or decreasing?
  let trend = "stable";
  if (recentAvg > overallAvg * 1.3) trend = "increasing";
  else if (recentAvg < overallAvg * 0.7) trend = "decreasing";

  return {
    overall: overallAvg,
    recent: recentAvg,
    maxSwing,
    level,
    trend,
    dataPoints: changes.length,
  };
}

/**
 * Compares weight stats between this week/month and previous week/month.
 * Returns side-by-side comparison with improvement indicators.
 */
export function calcPeriodComparison(records) {
  if (records.length < 3) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function statsForRange(recs) {
    if (recs.length === 0) return null;
    const weights = recs.map((r) => r.wt);
    const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
    const min = Math.round(Math.min(...weights) * 10) / 10;
    const max = Math.round(Math.max(...weights) * 10) / 10;
    return { avg, min, max, count: recs.length };
  }

  // Weekly comparison
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const weekStartStr = dateStr(weekStart);
  const prevWeekStartStr = dateStr(prevWeekStart);

  const thisWeek = sorted.filter((r) => r.dt >= weekStartStr && r.dt <= todayStr);
  const prevWeek = sorted.filter((r) => r.dt >= prevWeekStartStr && r.dt < weekStartStr);

  // Monthly comparison
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStart = dateStr(prevMonth);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const prevMonthEndStr = dateStr(prevMonthEnd);

  const thisMonth = sorted.filter((r) => r.dt >= monthStart && r.dt <= todayStr);
  const lastMonth = sorted.filter((r) => r.dt >= prevMonthStart && r.dt <= prevMonthEndStr);

  const weekly = {
    current: statsForRange(thisWeek),
    previous: statsForRange(prevWeek),
  };
  if (weekly.current && weekly.previous) {
    weekly.avgDiff = Math.round((weekly.current.avg - weekly.previous.avg) * 10) / 10;
  }

  const monthly = {
    current: statsForRange(thisMonth),
    previous: statsForRange(lastMonth),
  };
  if (monthly.current && monthly.previous) {
    monthly.avgDiff = Math.round((monthly.current.avg - monthly.previous.avg) * 10) / 10;
  }

  if (!weekly.current && !monthly.current) return null;

  return { weekly, monthly };
}

/**
 * Calculates goal countdown with ETA and progress percentage.
 * Uses recent trend rate to estimate days until goal is reached.
 */
export function calcGoalCountdown(records, goalWeight) {
  if (!goalWeight || records.length < 3) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1].wt;
  const remaining = Math.round((latest - goalWeight) * 10) / 10;
  const absRemaining = Math.abs(remaining);

  const first = sorted[0].wt;
  const isLossGoal = first > goalWeight;

  // Already at or past goal
  if (absRemaining < 0.1 || (isLossGoal && latest <= goalWeight) || (!isLossGoal && latest >= goalWeight)) {
    return { reached: true, latest, goal: goalWeight, remaining: 0, pct: 100 };
  }

  // Calculate progress from starting weight
  const totalToLose = first - goalWeight;
  const lost = first - latest;
  const pct = totalToLose !== 0 ? Math.max(0, Math.min(100, Math.round((lost / totalToLose) * 100))) : 0;

  // Estimate days remaining using last 14 records trend
  const recent = sorted.slice(-14);
  let etaDays = null;
  if (recent.length >= 3) {
    const daySpan = Math.max(1, Math.round((new Date(recent[recent.length - 1].dt + "T00:00:00") - new Date(recent[0].dt + "T00:00:00")) / 86400000));
    const rate = (recent[recent.length - 1].wt - recent[0].wt) / daySpan; // kg/day
    // Only estimate if trend is in the right direction
    if (rate < -0.01 && remaining > 0) {
      etaDays = Math.ceil(remaining / Math.abs(rate));
    } else if (rate > 0.01 && remaining < 0) {
      etaDays = Math.ceil(absRemaining / rate);
    }
  }

  return {
    reached: false,
    latest,
    goal: goalWeight,
    remaining,
    absRemaining,
    pct,
    etaDays,
    direction: remaining > 0 ? "lose" : "gain",
  };
}

/**
 * Analyzes body fat trends vs weight trends to detect body composition changes.
 * Identifies whether fat loss, muscle gain, or mixed changes are occurring.
 */
export function calcBodyComposition(records) {
  const withBf = records.filter((r) => r.bf != null && Number.isFinite(r.bf) && r.bf > 0);
  if (withBf.length < 3) return null;
  const sorted = [...withBf].sort((a, b) => a.dt.localeCompare(b.dt));

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  // Body fat change
  const bfChange = Math.round((latest.bf - first.bf) * 10) / 10;
  const wtChange = Math.round((latest.wt - first.wt) * 10) / 10;

  // Estimated fat mass and lean mass
  const firstFatMass = Math.round((first.wt * first.bf / 100) * 10) / 10;
  const latestFatMass = Math.round((latest.wt * latest.bf / 100) * 10) / 10;
  const firstLeanMass = Math.round((first.wt - firstFatMass) * 10) / 10;
  const latestLeanMass = Math.round((latest.wt - latestFatMass) * 10) / 10;

  const fatMassChange = Math.round((latestFatMass - firstFatMass) * 10) / 10;
  const leanMassChange = Math.round((latestLeanMass - firstLeanMass) * 10) / 10;

  // Determine body composition trend
  let trend = "mixed";
  if (fatMassChange < -0.3 && leanMassChange >= 0) trend = "fatLoss";
  else if (fatMassChange >= 0 && leanMassChange > 0.3) trend = "muscleGain";
  else if (fatMassChange < -0.3 && leanMassChange > 0.3) trend = "recomp";
  else if (fatMassChange > 0.3 && leanMassChange < 0) trend = "decline";

  // Average body fat
  const avgBf = Math.round((sorted.reduce((s, r) => s + r.bf, 0) / sorted.length) * 10) / 10;

  return {
    firstBf: first.bf,
    latestBf: latest.bf,
    bfChange,
    wtChange,
    fatMassChange,
    leanMassChange,
    firstFatMass,
    latestFatMass,
    firstLeanMass,
    latestLeanMass,
    trend,
    avgBf,
    dataPoints: sorted.length,
  };
}

/**
 * Generates a shareable text summary of weight journey statistics.
 */
export function generateWeightSummary(records, profile = {}) {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const weights = sorted.map((r) => r.wt);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
  const totalChange = Math.round((latest.wt - first.wt) * 10) / 10;
  const days = Math.max(1, Math.round((new Date(latest.dt + "T00:00:00") - new Date(first.dt + "T00:00:00")) / 86400000));

  // BMI if height available
  let bmiInfo = null;
  if (profile.heightCm) {
    const h = profile.heightCm / 100;
    const latestBmi = Math.round((latest.wt / (h * h)) * 10) / 10;
    const zone = latestBmi < 18.5 ? "underweight" : latestBmi < 25 ? "normal" : latestBmi < 30 ? "overweight" : "obese";
    bmiInfo = { bmi: latestBmi, zone };
  }

  return {
    period: { from: first.dt, to: latest.dt, days },
    weight: { first: Math.round(first.wt * 10) / 10, latest: Math.round(latest.wt * 10) / 10, min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, avg, totalChange },
    records: sorted.length,
    bmi: bmiInfo,
  };
}

/**
 * Returns commonly used note templates based on user's past notes.
 * Analyzes existing records to find frequently used note texts.
 */
export function getFrequentNotes(records, maxResults = 5) {
  const counts = new Map();
  for (const r of records) {
    if (r.note && r.note.trim()) {
      const note = r.note.trim();
      counts.set(note, (counts.get(note) || 0) + 1);
    }
  }
  // Sort by frequency, then alphabetically
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxResults);
  return sorted.map(([text, count]) => ({ text, count }));
}

/**
 * Detects potential duplicate or suspicious records.
 * Finds same-date entries and near-identical consecutive records.
 */
export function detectDuplicates(records) {
  if (records.length < 2) return { duplicates: [], suspicious: [] };
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));

  // Same-date entries (true duplicates)
  const dateGroups = new Map();
  for (const r of sorted) {
    if (!dateGroups.has(r.dt)) dateGroups.set(r.dt, []);
    dateGroups.get(r.dt).push(r);
  }
  const duplicates = [];
  for (const [date, recs] of dateGroups) {
    if (recs.length > 1) {
      duplicates.push({ date, count: recs.length, weights: recs.map((r) => r.wt) });
    }
  }

  // Suspicious: identical weight on consecutive days (3+ in a row)
  const suspicious = [];
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].wt === sorted[i - 1].wt) {
      run++;
    } else {
      if (run >= 3) {
        suspicious.push({
          weight: sorted[i - 1].wt,
          from: sorted[i - run].dt,
          to: sorted[i - 1].dt,
          count: run,
        });
      }
      run = 1;
    }
  }
  if (run >= 3) {
    suspicious.push({
      weight: sorted[sorted.length - 1].wt,
      from: sorted[sorted.length - run].dt,
      to: sorted[sorted.length - 1].dt,
      count: run,
    });
  }

  return { duplicates, suspicious };
}

/**
 * Validates a new weight entry against recent records.
 * Returns warnings for suspicious changes (potential typos).
 */
export function validateWeightEntry(newWeight, records, threshold = 3) {
  const warnings = [];
  if (!Number.isFinite(newWeight) || records.length === 0) return warnings;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1];
  const diff = Math.abs(newWeight - latest.wt);

  if (diff >= threshold) {
    warnings.push({
      type: "largeDiff",
      diff: Math.round(diff * 10) / 10,
      previous: latest.wt,
      date: latest.dt,
    });
  }

  // Check if outside historical range (with 2kg buffer)
  const weights = sorted.map((r) => r.wt);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  if (newWeight < min - 2 || newWeight > max + 2) {
    warnings.push({
      type: "outsideRange",
      min,
      max,
    });
  }

  return warnings;
}

/**
 * Calculate weekly averages for the last N weeks.
 * Returns array of { weekStart, weekEnd, avg, count, min, max } sorted oldest→newest.
 */
export function calcWeeklyAverages(records, numWeeks = 8) {
  if (records.length === 0) return [];
  const now = new Date();
  const todayDay = now.getDay(); // 0=Sun
  // Start of current week (Monday)
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - ((todayDay + 6) % 7));
  currentWeekStart.setHours(0, 0, 0, 0);

  const weeks = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    const inWeek = records.filter((r) => r.dt >= startStr && r.dt <= endStr);
    if (inWeek.length === 0) {
      weeks.push({ weekStart: startStr, weekEnd: endStr, avg: null, count: 0, min: null, max: null });
    } else {
      const weights = inWeek.map((r) => r.wt);
      const sum = weights.reduce((s, w) => s + w, 0);
      weeks.push({
        weekStart: startStr,
        weekEnd: endStr,
        avg: Math.round((sum / weights.length) * 10) / 10,
        count: weights.length,
        min: Math.round(Math.min(...weights) * 10) / 10,
        max: Math.round(Math.max(...weights) * 10) / 10,
      });
    }
  }
  return weeks;
}

/**
 * Build a recording frequency map for the current month.
 * Returns { year, month, days[], recordedDates: Set, totalDays, recordedCount, rate }.
 * Each day in days[]: { date, dayOfWeek, recorded, weight }
 */
export function calcMonthlyRecordingMap(records, year, month) {
  const y = year ?? new Date().getFullYear();
  const m = month ?? new Date().getMonth(); // 0-based
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;

  const dateMap = new Map();
  for (const r of records) {
    if (r.dt.startsWith(prefix)) {
      dateMap.set(r.dt, r.wt);
    }
  }

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = `${prefix}-${String(d).padStart(2, "0")}`;
    const dow = new Date(y, m, d).getDay();
    days.push({
      date: dt,
      day: d,
      dayOfWeek: dow,
      recorded: dateMap.has(dt),
      weight: dateMap.get(dt) ?? null,
    });
  }

  const recordedCount = dateMap.size;
  return {
    year: y,
    month: m,
    monthName: `${y}-${String(m + 1).padStart(2, "0")}`,
    days,
    recordedCount,
    totalDays: daysInMonth,
    rate: daysInMonth > 0 ? Math.round((recordedCount / daysInMonth) * 100) : 0,
  };
}

/**
 * Calculate a short-term weight trend indicator.
 * Compares the last 3-day average to the previous 3-day average.
 * Returns { direction: "down"|"up"|"stable", change, recentAvg, previousAvg, dataPoints }
 */
export function calcWeightTrendIndicator(records) {
  if (records.length < 4) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent3 = sorted.slice(-3);
  const prev3 = sorted.slice(-6, -3);
  if (prev3.length === 0) return null;

  const recentAvg = recent3.reduce((s, r) => s + r.wt, 0) / recent3.length;
  const prevAvg = prev3.reduce((s, r) => s + r.wt, 0) / prev3.length;
  const change = Math.round((recentAvg - prevAvg) * 10) / 10;

  let direction = "stable";
  if (change <= -0.2) direction = "down";
  else if (change >= 0.2) direction = "up";

  return {
    direction,
    change,
    recentAvg: Math.round(recentAvg * 10) / 10,
    previousAvg: Math.round(prevAvg * 10) / 10,
    dataPoints: sorted.length,
  };
}

/**
 * Analyze note tag usage frequency and associated weight changes.
 * Returns { tags: [{ tag, count, pct, avgChange }], totalTagged, totalRecords }
 */
export function calcNoteTagStats(records) {
  if (records.length < 2) return { tags: [], totalTagged: 0, totalRecords: records.length };
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const tagCounts = {};
  const tagChanges = {};

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (!r.note) continue;
    const tags = (r.note.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F]+/g) || []).map((s) => s.slice(1));
    const prev = i > 0 ? sorted[i - 1] : null;
    const change = prev ? r.wt - prev.wt : 0;
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      if (!tagChanges[tag]) tagChanges[tag] = [];
      if (prev) tagChanges[tag].push(change);
    }
  }

  const totalTagged = Object.values(tagCounts).reduce((s, c) => s + c, 0);
  const tags = Object.entries(tagCounts)
    .map(([tag, count]) => {
      const changes = tagChanges[tag] || [];
      const avgChange = changes.length > 0
        ? Math.round((changes.reduce((s, c) => s + c, 0) / changes.length) * 10) / 10
        : 0;
      return {
        tag,
        count,
        pct: records.length > 0 ? Math.round((count / records.length) * 100) : 0,
        avgChange,
      };
    })
    .sort((a, b) => b.count - a.count);

  return { tags, totalTagged, totalRecords: records.length };
}

/**
 * Calculate ideal weight range based on height using BMI 18.5-24.9.
 * Returns { minWeight, maxWeight, midWeight, currentBMI, currentWeight, position }
 * position: 0-100 (0=underweight, 50=ideal center, 100=overweight)
 */
export function calcIdealWeightRange(heightCm, currentWeight) {
  if (!heightCm || heightCm <= 0 || !currentWeight || currentWeight <= 0) return null;
  const heightM = heightCm / 100;
  const h2 = heightM * heightM;
  const minWeight = Math.round(18.5 * h2 * 10) / 10;
  const maxWeight = Math.round(24.9 * h2 * 10) / 10;
  const midWeight = Math.round(22.0 * h2 * 10) / 10;
  const currentBMI = Math.round((currentWeight / h2) * 10) / 10;

  // Position: 0% at BMI 15, 100% at BMI 30, ideal range maps to ~23%-83%
  const bmiRange = 30 - 15;
  const position = Math.max(0, Math.min(100, Math.round(((currentBMI - 15) / bmiRange) * 100)));

  let zone = "normal";
  if (currentBMI < 18.5) zone = "underweight";
  else if (currentBMI >= 25 && currentBMI < 30) zone = "overweight";
  else if (currentBMI >= 30) zone = "obese";

  return {
    minWeight,
    maxWeight,
    midWeight,
    currentBMI,
    currentWeight: Math.round(currentWeight * 10) / 10,
    position,
    zone,
    toMin: Math.round((currentWeight - minWeight) * 10) / 10,
    toMax: Math.round((maxWeight - currentWeight) * 10) / 10,
  };
}

/**
 * Calculate how stale the latest record is.
 * Returns { daysSince, lastDate, lastWeight, level: "today"|"recent"|"stale"|"veryStale" }
 */
export function calcDataFreshness(records) {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const last = sorted[sorted.length - 1];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const lastDate = new Date(last.dt + "T00:00:00");
  const todayDate = new Date(today + "T00:00:00");
  const daysSince = Math.round((todayDate - lastDate) / 86400000);

  let level = "today";
  if (daysSince >= 7) level = "veryStale";
  else if (daysSince >= 3) level = "stale";
  else if (daysSince >= 1) level = "recent";

  return {
    daysSince,
    lastDate: last.dt,
    lastWeight: last.wt,
    level,
  };
}

/**
 * Calculate weight change rate over multiple time windows.
 * Returns { periods: [{ days, change, weeklyRate, hasData }] } for 7, 30, 90 day windows.
 */
export function calcMultiPeriodRate(records) {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.dt + "T00:00:00");
  const windows = [7, 30, 90];

  const periods = windows.map((days) => {
    const cutoff = new Date(latestDate);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    // Find the record closest to the cutoff date
    let closest = null;
    let closestDist = Infinity;
    for (const r of sorted) {
      const dist = Math.abs(new Date(r.dt + "T00:00:00") - cutoff);
      if (dist < closestDist && r.dt <= latest.dt) {
        closestDist = dist;
        closest = r;
      }
    }
    if (!closest || closest.dt === latest.dt) {
      return { days, change: 0, weeklyRate: 0, hasData: false };
    }
    const actualDays = Math.max(1, Math.round((latestDate - new Date(closest.dt + "T00:00:00")) / 86400000));
    const change = Math.round((latest.wt - closest.wt) * 10) / 10;
    const weeklyRate = Math.round((change / actualDays) * 7 * 10) / 10;
    return { days, change, weeklyRate, hasData: true };
  });

  return { periods, latestWeight: latest.wt };
}

/**
 * Check if the user has reached a recording milestone.
 * Returns { reached, milestone, next, remaining } or null if no milestone is near.
 */
export function calcRecordMilestone(recordCount) {
  const milestones = [10, 25, 50, 100, 200, 365, 500, 750, 1000];
  let reached = null;
  let next = null;

  for (const m of milestones) {
    if (recordCount === m) {
      reached = m;
    }
    if (m > recordCount && next === null) {
      next = m;
    }
  }

  if (next === null) {
    // Beyond 1000, milestone every 500
    const nextBig = Math.ceil((recordCount + 1) / 500) * 500;
    next = nextBig;
    if (recordCount === nextBig - 500 && recordCount > 1000) {
      reached = recordCount;
    }
  }

  return {
    reached,
    current: recordCount,
    next,
    remaining: next - recordCount,
  };
}

/**
 * AI Coach: Generates personalized advice by combining multiple analytics signals.
 * Returns { score, grade, advices[], weeklyReport, prediction }
 */
export function generateAICoachReport(records, profile, goalWeight) {
  if (records.length < 2) {
    return {
      score: 0,
      grade: "new",
      advices: ["start"],
      weeklyReport: null,
      prediction: null,
      highlights: [],
      risks: [],
    };
  }

  const advices = [];
  const highlights = [];
  const risks = [];
  let score = 50; // Base score

  // 1. Trend analysis
  const trend = calcWeightTrend(records);
  const weeklyRate = calcWeeklyRate(records);
  const hasGoal = Number.isFinite(goalWeight) && goalWeight > 0;
  const latest = records[records.length - 1].wt;
  const wantsLoss = hasGoal && goalWeight < latest;
  const wantsGain = hasGoal && goalWeight > latest;

  if (trend === "down" && wantsLoss) {
    score += 15;
    highlights.push("trendMatchGoal");
  } else if (trend === "up" && wantsGain) {
    score += 15;
    highlights.push("trendMatchGoal");
  } else if (trend === "down" && wantsGain) {
    score -= 10;
    risks.push("trendAgainstGoal");
  } else if (trend === "up" && wantsLoss) {
    score -= 10;
    risks.push("trendAgainstGoal");
  } else if (!trend && (wantsLoss || wantsGain)) {
    score -= 5;
    risks.push("flatTrend");
  }

  // 2. Weekly rate check (healthy: 0.2-0.5 kg/week loss)
  if (weeklyRate) {
    const absRate = Math.abs(weeklyRate.weeklyRate);
    if (absRate > 1.0) {
      risks.push("rapidChange");
      advices.push("slowDown");
      score -= 10;
    } else if (absRate >= 0.2 && absRate <= 0.7 && wantsLoss && weeklyRate.weeklyRate < 0) {
      highlights.push("healthyPace");
      score += 10;
    }
  }

  // 3. Consistency (streak)
  const streak = calcStreak(records);
  if (streak >= 14) {
    score += 15;
    highlights.push("greatStreak");
  } else if (streak >= 7) {
    score += 8;
    highlights.push("goodStreak");
  } else if (streak <= 2 && records.length > 7) {
    risks.push("inconsistent");
    advices.push("buildHabit");
    score -= 5;
  }

  // 4. Stability
  const stability = calcWeightStability(records);
  if (stability) {
    if (stability.score >= 70) {
      highlights.push("stableWeight");
      score += 5;
    } else if (stability.score < 30) {
      risks.push("highVolatility");
      advices.push("stabilize");
    }
  }

  // 5. Plateau detection
  const plateau = calcWeightPlateau(records);
  if (plateau && plateau.isPlateau) {
    risks.push("plateau");
    advices.push("breakPlateau");
    score -= 5;
  }

  // 6. Goal proximity
  if (hasGoal) {
    const progress = calcGoalProgress(records, goalWeight);
    if (progress && progress.percent >= 90) {
      highlights.push("nearGoal");
      score += 10;
    }
    const prediction = calcGoalPrediction(records, goalWeight);
    if (prediction && !prediction.achieved && !prediction.insufficient && !prediction.noTrend) {
      if (prediction.days <= 30) {
        highlights.push("goalSoon");
      }
    }
  }

  // 7. BMI-based advice
  if (profile.heightCm) {
    const bmi = calculateBMI(latest, profile.heightCm);
    if (bmi < 18.5) {
      advices.push("underweight");
    } else if (bmi >= 30) {
      advices.push("obeseRange");
    }
  }

  // 8. Day-of-week pattern
  const dowAvg = calcDayOfWeekAvg(records);
  if (dowAvg) {
    const avgs = dowAvg.avgs.filter((a) => a !== null);
    if (avgs.length > 0 && Math.max(...avgs) - Math.min(...avgs) > 1.0) {
      advices.push("weekendPattern");
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Grade
  const grade = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : score >= 30 ? "needsWork" : "critical";

  // Generate weekly report
  const weeklyReport = generateWeeklyReport(records, goalWeight, profile);

  // Generate prediction
  const prediction = hasGoal ? calcGoalPrediction(records, goalWeight) : null;

  return {
    score,
    grade,
    advices,
    weeklyReport,
    prediction,
    highlights,
    risks,
  };
}

/**
 * Generate a weekly summary report with key metrics.
 */
function generateWeeklyReport(records, goalWeight, profile) {
  if (records.length < 3) return null;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);

  const thisWeek = records.filter(r => r.dt >= oneWeekAgo);
  const lastWeek = records.filter(r => r.dt >= twoWeeksAgo && r.dt < oneWeekAgo);

  if (thisWeek.length === 0) return null;

  const thisAvg = thisWeek.reduce((s, r) => s + r.wt, 0) / thisWeek.length;
  const lastAvg = lastWeek.length ? lastWeek.reduce((s, r) => s + r.wt, 0) / lastWeek.length : null;
  const weekChange = lastAvg !== null ? thisAvg - lastAvg : null;

  const thisMin = Math.min(...thisWeek.map(r => r.wt));
  const thisMax = Math.max(...thisWeek.map(r => r.wt));

  return {
    avg: Math.round(thisAvg * 10) / 10,
    change: weekChange !== null ? Math.round(weekChange * 10) / 10 : null,
    min: thisMin,
    max: thisMax,
    entries: thisWeek.length,
    range: Math.round((thisMax - thisMin) * 10) / 10,
  };
}

/**
 * Build a compact dashboard summary with the 4 most important metrics.
 * Returns { weight, change, bmi, streak } or null if no records.
 */
export function calcDashboardSummary(records, heightCm) {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1];
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const change = prev ? Math.round((latest.wt - prev.wt) * 10) / 10 : 0;

  let bmi = null;
  if (heightCm && heightCm > 0) {
    const hm = heightCm / 100;
    bmi = Math.round((latest.wt / (hm * hm)) * 10) / 10;
  }

  // Calculate current streak
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dates = new Set(sorted.map((r) => r.dt));
  let streak = 0;
  const d = new Date(now);
  // Check if today or yesterday has a record to start counting
  if (!dates.has(todayStr)) {
    d.setDate(d.getDate() - 1);
    const yStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dates.has(yStr)) return { weight: latest.wt, change, bmi, streak: 0, date: latest.dt };
  }
  while (true) {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dates.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return { weight: latest.wt, change, bmi, streak, date: latest.dt };
}

/**
 * Get the most recent N entries with day-over-day changes.
 * Returns [{ dt, wt, change, source }] newest first.
 */
export function getRecentEntries(records, count = 5) {
  if (records.length === 0) return [];
  const sorted = [...records].sort((a, b) => b.dt.localeCompare(a.dt));
  return sorted.slice(0, count).map((r, i) => {
    const prev = sorted[i + 1];
    return {
      dt: r.dt,
      wt: r.wt,
      change: prev ? Math.round((r.wt - prev.wt) * 10) / 10 : null,
      source: r.source || "manual",
    };
  });
}

/**
 * Calculate monthly average weights for the last N months.
 * Returns [{ year, month, label, avg, count, min, max }] oldest→newest.
 */
export function calcMonthlyAverages(records, numMonths = 6) {
  if (records.length === 0) return [];
  const now = new Date();
  const months = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    const inMonth = records.filter((r) => r.dt.startsWith(prefix));
    if (inMonth.length === 0) {
      months.push({ year: y, month: m, label: prefix, avg: null, count: 0, min: null, max: null });
    } else {
      const weights = inMonth.map((r) => r.wt);
      const sum = weights.reduce((s, w) => s + w, 0);
      months.push({
        year: y,
        month: m,
        label: prefix,
        avg: Math.round((sum / weights.length) * 10) / 10,
        count: weights.length,
        min: Math.round(Math.min(...weights) * 10) / 10,
        max: Math.round(Math.max(...weights) * 10) / 10,
      });
    }
  }
  return months;
}

/**
 * Calculate long-term progress comparing current weight to past periods.
 * Returns { current, periods: [{ label, days, pastWeight, change, pctChange, hasData }] }
 */
export function calcLongTermProgress(records) {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.dt + "T00:00:00");
  const periods = [
    { label: "1m", days: 30 },
    { label: "3m", days: 90 },
    { label: "6m", days: 180 },
    { label: "1y", days: 365 },
    { label: "all", days: null },
  ];
  const result = periods.map((p) => {
    let target;
    if (p.days === null) {
      target = sorted[0];
    } else {
      const cutoff = new Date(latestDate);
      cutoff.setDate(cutoff.getDate() - p.days);
      // Find closest record to cutoff date
      let closest = null;
      let closestDiff = Infinity;
      for (const r of sorted) {
        const diff = Math.abs(new Date(r.dt + "T00:00:00") - cutoff);
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = r;
        }
      }
      // Only use if within 15 days of target
      if (closestDiff > 15 * 86400000) {
        return { label: p.label, days: p.days, pastWeight: null, change: null, pctChange: null, hasData: false };
      }
      target = closest;
    }
    const change = Math.round((latest.wt - target.wt) * 10) / 10;
    const pctChange = Math.round((change / target.wt) * 1000) / 10;
    return {
      label: p.label,
      days: p.days,
      pastWeight: target.wt,
      change,
      pctChange,
      hasData: true,
    };
  });
  return { current: latest.wt, date: latest.dt, periods: result };
}

/**
 * Calculate weight fluctuation range for recent periods (7d, 30d).
 * Returns { latest, periods: [{ label, days, min, max, range, position }] }
 * position: 0-100 indicating where latest weight falls within the range.
 */
export function calcWeightFluctuation(records) {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.dt + "T00:00:00");
  const windows = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
  ];
  const periods = windows.map((w) => {
    const cutoff = new Date(latestDate);
    cutoff.setDate(cutoff.getDate() - w.days);
    const cutoffStr = localDateStr(cutoff);
    const inRange = sorted.filter((r) => r.dt >= cutoffStr);
    if (inRange.length < 2) return { label: w.label, days: w.days, min: null, max: null, range: null, position: null, hasData: false };
    const weights = inRange.map((r) => r.wt);
    const min = Math.round(Math.min(...weights) * 10) / 10;
    const max = Math.round(Math.max(...weights) * 10) / 10;
    const range = Math.round((max - min) * 10) / 10;
    const position = range > 0 ? Math.round(((latest.wt - min) / range) * 100) : 50;
    return { label: w.label, days: w.days, min, max, range, position, hasData: true };
  });
  return { latest: latest.wt, periods };
}

/**
 * Detect weight anomalies — entries that deviate significantly from neighbors.
 * threshold: kg difference from moving average of neighbors to flag as anomaly.
 * Returns [{ dt, wt, expected, diff }] sorted by severity.
 */
export function calcWeightAnomalies(records, threshold = 3) {
  if (records.length < 5) return [];
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const anomalies = [];
  for (let i = 2; i < sorted.length - 2; i++) {
    const neighbors = [sorted[i - 2], sorted[i - 1], sorted[i + 1], sorted[i + 2]];
    const avg = neighbors.reduce((s, r) => s + r.wt, 0) / neighbors.length;
    const diff = Math.round(Math.abs(sorted[i].wt - avg) * 10) / 10;
    if (diff >= threshold) {
      anomalies.push({
        dt: sorted[i].dt,
        wt: sorted[i].wt,
        expected: Math.round(avg * 10) / 10,
        diff,
      });
    }
  }
  return anomalies.sort((a, b) => b.diff - a.diff);
}

/**
 * Calculate success rate — percentage of recordings where weight decreased or stayed the same.
 * Returns { total, down, same, up, successRate, recentRate (last 30 entries) }
 */
export function calcSuccessRate(records) {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  let down = 0, same = 0, up = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].wt - sorted[i - 1].wt;
    if (diff < -0.05) down++;
    else if (diff > 0.05) up++;
    else same++;
  }
  const total = sorted.length - 1;
  const successRate = Math.round(((down + same) / total) * 100);

  // Recent rate (last 30 entries)
  const recent = sorted.slice(-31);
  let rDown = 0, rSame = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i].wt - recent[i - 1].wt;
    if (diff < -0.05) rDown++;
    else if (Math.abs(diff) <= 0.05) rSame++;
  }
  const rTotal = recent.length - 1;
  const recentRate = rTotal > 0 ? Math.round(((rDown + rSame) / rTotal) * 100) : null;

  return { total, down, same, up, successRate, recentRate };
}

/**
 * Calculate recording rate — how consistently the user records weights.
 * Returns { totalDays, recordedDays, rate, weeks: [{ start, recorded, total }] }
 */
export function calcRecordingRate(records) {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const firstDate = new Date(sorted[0].dt + "T00:00:00");
  const lastDate = new Date(sorted[sorted.length - 1].dt + "T00:00:00");
  const totalDays = Math.round((lastDate - firstDate) / 86400000) + 1;
  const uniqueDates = new Set(sorted.map((r) => r.dt));
  const recordedDays = uniqueDates.size;
  const rate = Math.round((recordedDays / totalDays) * 100);

  // Last 4 weeks breakdown
  const weeks = [];
  for (let w = 3; w >= 0; w--) {
    const weekEnd = new Date(lastDate);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    let recorded = 0;
    let total = 0;
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const ds = localDateStr(d);
      if (ds >= sorted[0].dt) {
        total++;
        if (uniqueDates.has(ds)) recorded++;
      }
    }
    weeks.push({ start: localDateStr(weekStart), recorded, total });
  }

  return { totalDays, recordedDays, rate, weeks };
}

/**
 * Track weight milestone history — when each kg milestone was first reached.
 * Direction: "down" tracks decreasing milestones, "up" tracks increasing.
 * Returns { direction, milestones: [{ kg, date, daysFromStart }] }
 */
export function calcMilestoneHistory(records) {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const startWt = sorted[0].wt;
  const latestWt = sorted[sorted.length - 1].wt;
  const direction = latestWt <= startWt ? "down" : "up";
  const startDate = new Date(sorted[0].dt + "T00:00:00");

  const milestones = [];
  const reached = new Set();

  if (direction === "down") {
    // Track each kg below start
    const startFloor = Math.floor(startWt);
    for (const r of sorted) {
      const floorWt = Math.floor(r.wt);
      for (let kg = startFloor; kg >= floorWt; kg--) {
        if (kg < startWt && !reached.has(kg)) {
          reached.add(kg);
          const days = Math.round((new Date(r.dt + "T00:00:00") - startDate) / 86400000);
          milestones.push({ kg, date: r.dt, daysFromStart: days });
        }
      }
    }
  } else {
    // Track each kg above start
    const startCeil = Math.ceil(startWt);
    for (const r of sorted) {
      const ceilWt = Math.ceil(r.wt);
      for (let kg = startCeil; kg <= ceilWt; kg++) {
        if (kg > startWt && !reached.has(kg)) {
          reached.add(kg);
          const days = Math.round((new Date(r.dt + "T00:00:00") - startDate) / 86400000);
          milestones.push({ kg, date: r.dt, daysFromStart: days });
        }
      }
    }
  }

  return { direction, startWt, latestWt, milestones };
}

/**
 * Summarize the weight journey as a series of phases (loss, gain, maintain).
 * Uses a 7-day smoothed average to determine phases.
 * Returns { phases: [{ type, startDate, endDate, startWt, endWt, change, days }], totalChange }
 */
export function calcWeightJourney(records) {
  if (records.length < 7) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));

  // Calculate 7-point moving averages
  const avgs = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(0, i - 3);
    const end = Math.min(sorted.length - 1, i + 3);
    let sum = 0, count = 0;
    for (let j = start; j <= end; j++) { sum += sorted[j].wt; count++; }
    avgs.push({ dt: sorted[i].dt, avg: Math.round((sum / count) * 10) / 10 });
  }

  const THRESHOLD = 0.3; // kg per phase transition
  const phases = [];
  let phaseStart = 0;
  let phaseType = "maintain";

  for (let i = 1; i < avgs.length; i++) {
    const change = avgs[i].avg - avgs[phaseStart].avg;
    let currentType;
    if (change < -THRESHOLD) currentType = "loss";
    else if (change > THRESHOLD) currentType = "gain";
    else currentType = "maintain";

    if (currentType !== phaseType && i - phaseStart >= 3) {
      phases.push({
        type: phaseType,
        startDate: avgs[phaseStart].dt,
        endDate: avgs[i - 1].dt,
        startWt: avgs[phaseStart].avg,
        endWt: avgs[i - 1].avg,
        change: Math.round((avgs[i - 1].avg - avgs[phaseStart].avg) * 10) / 10,
        days: Math.round((new Date(avgs[i - 1].dt + "T00:00:00") - new Date(avgs[phaseStart].dt + "T00:00:00")) / 86400000),
      });
      phaseStart = i;
      phaseType = currentType;
    }
  }
  // Final phase
  phases.push({
    type: phaseType,
    startDate: avgs[phaseStart].dt,
    endDate: avgs[avgs.length - 1].dt,
    startWt: avgs[phaseStart].avg,
    endWt: avgs[avgs.length - 1].avg,
    change: Math.round((avgs[avgs.length - 1].avg - avgs[phaseStart].avg) * 10) / 10,
    days: Math.round((new Date(avgs[avgs.length - 1].dt + "T00:00:00") - new Date(avgs[phaseStart].dt + "T00:00:00")) / 86400000),
  });

  const totalChange = Math.round((sorted[sorted.length - 1].wt - sorted[0].wt) * 10) / 10;
  return { phases, totalChange };
}

/**
 * Calculate goal weight scenarios with different paces.
 * Returns { current, goal, remaining, scenarios: [{ pace, label, weeks, date }] } or null.
 */
export function calcGoalScenarios(records, goalWeight) {
  if (records.length < 1 || !Number.isFinite(goalWeight) || goalWeight <= 0) return null;
  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const current = sorted[sorted.length - 1].wt;
  const remaining = Math.round(Math.abs(current - goalWeight) * 10) / 10;
  if (remaining < 0.1) return null;
  const direction = current > goalWeight ? -1 : 1;

  const paces = [
    { label: "gentle", rate: 0.25 },
    { label: "moderate", rate: 0.5 },
    { label: "aggressive", rate: 1.0 },
  ];

  const today = new Date();
  const scenarios = paces.map((p) => {
    const weeks = Math.ceil(remaining / p.rate);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + weeks * 7);
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
    return {
      pace: p.rate * direction,
      label: p.label,
      weeks,
      date: dateStr,
    };
  });

  return { current, goal: goalWeight, remaining, scenarios };
}

/**
 * Generate a streak calendar grid for the last N weeks.
 * Returns { weeks: [[{ date, recorded, isToday }]], totalRecorded, totalDays }
 */
export function calcStreakCalendar(records, numWeeks = 12) {
  const dateSet = new Set(records.map((r) => r.dt));
  const today = new Date();
  const todayStr = localDateStr(today);
  // Find start of grid: go back numWeeks*7 days, align to Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - (numWeeks * 7 - 1) - start.getDay());

  const weeks = [];
  let totalRecorded = 0;
  let totalDays = 0;
  const d = new Date(start);
  while (d <= today) {
    const week = [];
    for (let dow = 0; dow < 7 && d <= today; dow++) {
      const ds = localDateStr(d);
      const recorded = dateSet.has(ds);
      if (recorded) totalRecorded++;
      totalDays++;
      week.push({ date: ds, recorded, isToday: ds === todayStr });
      d.setDate(d.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, totalRecorded, totalDays };
}

/**
 * Detect moving average crossovers (7-day vs 30-day).
 * A "golden cross" means short MA drops below long MA (weight trending down = good for loss).
 * A "death cross" means short MA rises above long MA (weight trending up = bad for loss).
 * Returns { crossovers: [{ date, type, shortMA, longMA }], currentTrend, shortMA, longMA }
 */
export function calcMovingAvgCrossover(records) {
  if (!records || records.length < 30) {
    return { crossovers: [], currentTrend: "neutral", shortMA: null, longMA: null };
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));

  function movingAvg(arr, idx, window) {
    const start = Math.max(0, idx - window + 1);
    const slice = arr.slice(start, idx + 1);
    return slice.reduce((s, r) => s + r.wt, 0) / slice.length;
  }

  const crossovers = [];
  let prevShort = null;
  let prevLong = null;

  for (let i = 29; i < sorted.length; i++) {
    const shortMA = movingAvg(sorted, i, 7);
    const longMA = movingAvg(sorted, i, 30);

    if (prevShort !== null && prevLong !== null) {
      const prevDiff = prevShort - prevLong;
      const currDiff = shortMA - longMA;

      if (prevDiff >= 0 && currDiff < 0) {
        crossovers.push({ date: sorted[i].dt, type: "golden", shortMA: +shortMA.toFixed(2), longMA: +longMA.toFixed(2) });
      } else if (prevDiff <= 0 && currDiff > 0) {
        crossovers.push({ date: sorted[i].dt, type: "death", shortMA: +shortMA.toFixed(2), longMA: +longMA.toFixed(2) });
      }
    }

    prevShort = shortMA;
    prevLong = longMA;
  }

  const lastShort = movingAvg(sorted, sorted.length - 1, 7);
  const lastLong = movingAvg(sorted, sorted.length - 1, 30);
  const currentTrend = lastShort < lastLong ? "downtrend" : lastShort > lastLong ? "uptrend" : "neutral";

  return {
    crossovers: crossovers.slice(-10),
    currentTrend,
    shortMA: +lastShort.toFixed(2),
    longMA: +lastLong.toFixed(2),
  };
}

/**
 * Calculate prediction accuracy by comparing past trend-based predictions to actual weights.
 * Uses rolling 7-day windows to predict the next value and measures error.
 * Returns { accuracy, avgError, predictions: [{ date, predicted, actual, error }], rating }
 */
export function calcPredictionAccuracy(records) {
  if (!records || records.length < 14) {
    return { accuracy: null, avgError: null, predictions: [], rating: "insufficient" };
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const predictions = [];

  for (let i = 7; i < sorted.length; i++) {
    // Use last 7 records to predict the next one via linear trend
    const window = sorted.slice(i - 7, i);
    const n = window.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let j = 0; j < n; j++) {
      sumX += j;
      sumY += window[j].wt;
      sumXY += j * window[j].wt;
      sumX2 += j * j;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) continue;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const predicted = +(intercept + slope * n).toFixed(2);
    const actual = sorted[i].wt;
    const error = +Math.abs(predicted - actual).toFixed(2);

    predictions.push({ date: sorted[i].dt, predicted, actual, error });
  }

  if (!predictions.length) {
    return { accuracy: null, avgError: null, predictions: [], rating: "insufficient" };
  }

  const avgError = +(predictions.reduce((s, p) => s + p.error, 0) / predictions.length).toFixed(2);
  // Accuracy: percentage of predictions within 0.5kg
  const withinThreshold = predictions.filter((p) => p.error <= 0.5).length;
  const accuracy = +((withinThreshold / predictions.length) * 100).toFixed(1);
  const rating = accuracy >= 80 ? "excellent" : accuracy >= 60 ? "good" : accuracy >= 40 ? "fair" : "poor";

  return {
    accuracy,
    avgError,
    predictions: predictions.slice(-10),
    rating,
  };
}

/**
 * Calculate a consistency score (0-100) based on recording regularity,
 * weight stability, and trend adherence over the last 30 days.
 * Returns { score, components: { recording, stability, momentum }, grade }
 */
export function calcConsistencyScore(records, goalWeight) {
  if (!records || records.length < 7) {
    return { score: null, components: { recording: 0, stability: 0, momentum: 0 }, grade: "N/A" };
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const today = localDateStr();

  // Last 30 days window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = localDateStr(cutoff);
  const recent = sorted.filter((r) => r.dt >= cutoffStr && r.dt <= today);

  // 1. Recording regularity (0-100): % of last 30 days with records
  const dateSet = new Set(recent.map((r) => r.dt));
  const totalDays = Math.min(30, Math.max(1,
    Math.ceil((new Date(today + "T00:00:00") - new Date(cutoffStr + "T00:00:00")) / 86400000) + 1
  ));
  const recordingScore = Math.min(100, Math.round((dateSet.size / totalDays) * 100));

  // 2. Weight stability (0-100): inverse of coefficient of variation
  let stabilityScore = 50;
  if (recent.length >= 3) {
    const weights = recent.map((r) => r.wt);
    const mean = weights.reduce((s, w) => s + w, 0) / weights.length;
    const variance = weights.reduce((s, w) => s + (w - mean) ** 2, 0) / weights.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    // CV of 0 = perfect stability (100), CV >= 0.03 = low stability (0)
    stabilityScore = Math.min(100, Math.max(0, Math.round((1 - cv / 0.03) * 100)));
  }

  // 3. Momentum (0-100): are we moving toward goal?
  let momentumScore = 50;
  if (recent.length >= 2 && Number.isFinite(goalWeight) && goalWeight > 0) {
    const first = recent[0].wt;
    const last = recent[recent.length - 1].wt;
    const needed = goalWeight - first;
    const actual = last - first;
    if (Math.abs(needed) > 0.1) {
      const progress = actual / needed; // 1.0 = perfect, 0 = no progress, negative = wrong direction
      momentumScore = Math.min(100, Math.max(0, Math.round(progress * 100)));
    } else {
      // Already at goal
      momentumScore = 100;
    }
  }

  const score = Math.round(recordingScore * 0.4 + stabilityScore * 0.3 + momentumScore * 0.3);
  const grade = score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";

  return {
    score,
    components: {
      recording: recordingScore,
      stability: stabilityScore,
      momentum: momentumScore,
    },
    grade,
  };
}

/**
 * Calculate weight range summary across multiple time periods.
 * Returns { periods: [{ label, days, min, max, range, avg, count }] }
 */
export function calcWeightRangeSummary(records) {
  if (!records || records.length < 2) {
    return { periods: [] };
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const today = localDateStr();

  function periodStats(days, label) {
    let subset;
    if (days === 0) {
      subset = sorted;
    } else {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = localDateStr(cutoff);
      subset = sorted.filter((r) => r.dt >= cutoffStr && r.dt <= today);
    }
    if (subset.length < 2) return null;
    const weights = subset.map((r) => r.wt);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = +(weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1);
    return { label, days, min: +min.toFixed(1), max: +max.toFixed(1), range: +(max - min).toFixed(1), avg, count: subset.length };
  }

  const periods = [
    periodStats(7, "7d"),
    periodStats(30, "30d"),
    periodStats(90, "90d"),
    periodStats(0, "all"),
  ].filter(Boolean);

  return { periods };
}

/**
 * Calculate the current trend streak — consecutive records where weight
 * keeps moving in the same direction compared to the previous record.
 * Returns { direction, count, totalChange, startDate, endDate }
 * direction: "down" | "up" | "flat" | null
 */
export function calcTrendStreak(records) {
  if (!records || records.length < 2) {
    return { direction: null, count: 0, totalChange: 0, startDate: null, endDate: null };
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  let count = 1;
  let dir = null;

  // Walk backwards from the end
  for (let i = sorted.length - 1; i > 0; i--) {
    const diff = sorted[i].wt - sorted[i - 1].wt;
    const thisDir = diff < -0.05 ? "down" : diff > 0.05 ? "up" : "flat";

    if (dir === null) {
      dir = thisDir;
      count = 1;
      continue;
    }

    if (thisDir === dir) {
      count++;
    } else {
      break;
    }
  }

  if (dir === null) dir = "flat";

  const endIdx = sorted.length - 1;
  const startIdx = Math.max(0, endIdx - count);
  const totalChange = +(sorted[endIdx].wt - sorted[startIdx].wt).toFixed(2);

  return {
    direction: dir,
    count,
    totalChange,
    startDate: sorted[startIdx].dt,
    endDate: sorted[endIdx].dt,
  };
}

/**
 * Calculate BMI trend data points over time.
 * Returns { points: [{ dt, bmi }], change, direction, current, min, max }
 * Only works if records have BMI data.
 */
export function calcBMITrend(records) {
  if (!records || records.length < 2) {
    return { points: [], change: 0, direction: "neutral", current: null, min: null, max: null };
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const points = sorted
    .filter((r) => r.bmi != null && Number.isFinite(r.bmi))
    .map((r) => ({ dt: r.dt, bmi: +r.bmi.toFixed(1) }));

  if (points.length < 2) {
    return { points: [], change: 0, direction: "neutral", current: null, min: null, max: null };
  }

  const current = points[points.length - 1].bmi;
  const first = points[0].bmi;
  const change = +(current - first).toFixed(1);
  const direction = change < -0.1 ? "down" : change > 0.1 ? "up" : "neutral";
  const bmis = points.map((p) => p.bmi);

  return {
    points: points.slice(-30),
    change,
    direction,
    current,
    min: +Math.min(...bmis).toFixed(1),
    max: +Math.max(...bmis).toFixed(1),
  };
}

/**
 * Compare current week vs previous week statistics.
 * Returns { thisWeek, lastWeek, diffs } where each has { avg, min, max, count, range }.
 * diffs shows the change for each metric.
 */
export function calcWeeklySummaryComparison(records) {
  if (!records || records.length < 2) {
    return { thisWeek: null, lastWeek: null, diffs: null };
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  // Start of this week (Monday)
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeekStr = localDateStr(thisWeekStart);
  const lastWeekStr = localDateStr(lastWeekStart);
  const thisWeekEndStr = localDateStr(today);

  const thisWeekRecs = records.filter((r) => r.dt >= thisWeekStr && r.dt <= thisWeekEndStr);
  const lastWeekRecs = records.filter((r) => r.dt >= lastWeekStr && r.dt < thisWeekStr);

  function weekStats(recs) {
    if (recs.length === 0) return null;
    const weights = recs.map((r) => r.wt);
    const min = +Math.min(...weights).toFixed(1);
    const max = +Math.max(...weights).toFixed(1);
    const avg = +(weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1);
    return { avg, min, max, count: recs.length, range: +(max - min).toFixed(1) };
  }

  const tw = weekStats(thisWeekRecs);
  const lw = weekStats(lastWeekRecs);

  if (!tw || !lw) {
    return { thisWeek: tw, lastWeek: lw, diffs: null };
  }

  return {
    thisWeek: tw,
    lastWeek: lw,
    diffs: {
      avg: +(tw.avg - lw.avg).toFixed(1),
      min: +(tw.min - lw.min).toFixed(1),
      max: +(tw.max - lw.max).toFixed(1),
      count: tw.count - lw.count,
      range: +(tw.range - lw.range).toFixed(1),
    },
  };
}

/**
 * Calculate detailed goal progress data for a ring/donut chart.
 * Returns { percent, startWeight, currentWeight, goalWeight, lost, remaining,
 *           weeklyRate, estimatedWeeks, onTrack }
 */
export function calcGoalProgressRing(records, goalWeight) {
  if (!records || records.length < 1 || !Number.isFinite(goalWeight) || goalWeight <= 0) {
    return null;
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const startWeight = sorted[0].wt;
  const currentWeight = sorted[sorted.length - 1].wt;
  const totalToLose = startWeight - goalWeight;

  if (Math.abs(totalToLose) < 0.1) {
    return { percent: 100, startWeight, currentWeight, goalWeight, lost: 0, remaining: 0, weeklyRate: 0, estimatedWeeks: 0, onTrack: true };
  }

  const lost = startWeight - currentWeight;
  const direction = totalToLose > 0 ? 1 : -1; // 1 = need to lose, -1 = need to gain
  const progress = (lost * direction) / (Math.abs(totalToLose));
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const remaining = +(Math.abs(currentWeight - goalWeight)).toFixed(1);

  // Weekly rate from last 4 weeks
  let weeklyRate = 0;
  if (sorted.length >= 7) {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const cutoffStr = `${fourWeeksAgo.getFullYear()}-${String(fourWeeksAgo.getMonth() + 1).padStart(2, "0")}-${String(fourWeeksAgo.getDate()).padStart(2, "0")}`;
    const recent = sorted.filter((r) => r.dt >= cutoffStr);
    if (recent.length >= 2) {
      const firstR = recent[0].wt;
      const lastR = recent[recent.length - 1].wt;
      const daySpan = Math.max(1, Math.ceil((new Date(recent[recent.length - 1].dt + "T00:00:00") - new Date(recent[0].dt + "T00:00:00")) / 86400000));
      weeklyRate = +((firstR - lastR) / daySpan * 7).toFixed(2);
    }
  }

  const estimatedWeeks = weeklyRate * direction > 0.05 ? Math.ceil(remaining / Math.abs(weeklyRate)) : null;
  const onTrack = weeklyRate * direction > 0;

  return {
    percent,
    startWeight: +startWeight.toFixed(1),
    currentWeight: +currentWeight.toFixed(1),
    goalWeight: +goalWeight,
    lost: +(lost * direction).toFixed(1),
    remaining,
    weeklyRate: +weeklyRate.toFixed(2),
    estimatedWeeks,
    onTrack,
  };
}

/**
 * Calculate body fat percentage trend over time.
 * Returns { points: [{ dt, bf }], change, direction, current, min, max, avg }
 */
export function calcBodyFatTrend(records) {
  if (!records || records.length < 1) {
    return { points: [], change: 0, direction: "neutral", current: null, min: null, max: null, avg: null };
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const points = sorted
    .filter((r) => r.bf != null && Number.isFinite(Number(r.bf)) && Number(r.bf) > 0)
    .map((r) => ({ dt: r.dt, bf: +Number(r.bf).toFixed(1) }));

  if (points.length < 2) {
    return { points: [], change: 0, direction: "neutral", current: points.length === 1 ? points[0].bf : null, min: null, max: null, avg: null };
  }

  const current = points[points.length - 1].bf;
  const first = points[0].bf;
  const change = +(current - first).toFixed(1);
  const direction = change < -0.1 ? "down" : change > 0.1 ? "up" : "neutral";
  const bfs = points.map((p) => p.bf);
  const avg = +(bfs.reduce((s, v) => s + v, 0) / bfs.length).toFixed(1);

  return {
    points: points.slice(-30),
    change,
    direction,
    current,
    min: +Math.min(...bfs).toFixed(1),
    max: +Math.max(...bfs).toFixed(1),
    avg,
  };
}

/**
 * Calculate a daily weight target based on goal weight and current pace.
 * Uses the user's actual weekly rate to project where they should be today.
 * Returns { target, current, diff, pace, isAbove, isBelow, onTarget }
 */
export function calcDailyTarget(records, goalWeight) {
  if (!records || records.length < 7 || !Number.isFinite(goalWeight) || goalWeight <= 0) {
    return null;
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const current = sorted[sorted.length - 1].wt;
  const remaining = goalWeight - current;

  if (Math.abs(remaining) < 0.1) {
    return { target: +goalWeight.toFixed(1), current: +current.toFixed(1), diff: 0, pace: 0, isAbove: false, isBelow: false, onTarget: true };
  }

  // Calculate ideal pace: 0.5kg/week in the right direction
  const direction = remaining > 0 ? 1 : -1; // 1 = gain, -1 = lose
  const idealPace = 0.5 * direction; // kg per week

  // Find the reference point from ~7 days ago
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, "0")}-${String(weekAgo.getDate()).padStart(2, "0")}`;
  const recentStart = sorted.find((r) => r.dt >= weekAgoStr) || sorted[Math.max(0, sorted.length - 7)];
  const daysSinceRef = Math.max(1, Math.ceil(
    (new Date(sorted[sorted.length - 1].dt + "T00:00:00") - new Date(recentStart.dt + "T00:00:00")) / 86400000
  ));

  // Where weight "should" be today based on ideal pace
  const dailyIdeal = idealPace / 7;
  const target = +(recentStart.wt + dailyIdeal * daysSinceRef).toFixed(1);

  const diff = +(current - target).toFixed(1);
  // For loss: being below target is good. For gain: being above target is good.
  const isAbove = diff > 0.1;
  const isBelow = diff < -0.1;
  const onTarget = Math.abs(diff) <= 0.1;

  return {
    target,
    current: +current.toFixed(1),
    diff,
    pace: +idealPace.toFixed(2),
    isAbove,
    isBelow,
    onTarget,
  };
}

/**
 * Calculate average weight grouped by month phase (early/mid/late/end).
 * Helps identify monthly patterns (e.g. payday eating, end-of-month stress).
 * Returns { phases: [{ label, days, avg, count, change }], hasPattern }
 */
export function calcMonthPhaseAvg(records) {
  if (!records || records.length < 14) return null;

  const phases = [
    { label: "early", days: "1-7", sums: 0, counts: 0, weights: [] },
    { label: "mid", days: "8-14", sums: 0, counts: 0, weights: [] },
    { label: "late", days: "15-21", sums: 0, counts: 0, weights: [] },
    { label: "end", days: "22-31", sums: 0, counts: 0, weights: [] },
  ];

  for (const r of records) {
    const day = parseInt(r.dt.slice(8), 10);
    let idx;
    if (day <= 7) idx = 0;
    else if (day <= 14) idx = 1;
    else if (day <= 21) idx = 2;
    else idx = 3;
    phases[idx].sums += r.wt;
    phases[idx].counts += 1;
    phases[idx].weights.push(r.wt);
  }

  const result = phases.map((p, i) => ({
    label: p.label,
    days: p.days,
    avg: p.counts > 0 ? +(p.sums / p.counts).toFixed(1) : null,
    count: p.counts,
    change: null,
  }));

  // Calculate change relative to the first phase
  if (result[0].avg !== null) {
    for (let i = 0; i < result.length; i++) {
      if (result[i].avg !== null) {
        result[i].change = +(result[i].avg - result[0].avg).toFixed(2);
      }
    }
  }

  // Determine if there's a noticeable pattern (max variation > 0.3kg)
  const avgs = result.filter((r) => r.avg !== null).map((r) => r.avg);
  const maxVar = avgs.length > 1 ? Math.max(...avgs) - Math.min(...avgs) : 0;

  return {
    phases: result,
    hasPattern: maxVar > 0.3,
  };
}

/**
 * Calculate streak freeze info — gamification feature.
 * Users earn 1 "freeze day" for every 7 consecutive recording days.
 * A freeze day allows skipping one day without breaking the streak.
 * Returns { freezesEarned, freezesUsed, freezesAvailable, currentStreak, longestStreak }
 */
export function calcStreakFreezeInfo(records) {
  if (!records || records.length < 2) {
    return { freezesEarned: 0, freezesUsed: 0, freezesAvailable: 0, currentStreak: records?.length || 0, longestStreak: records?.length || 0 };
  }

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const dateSet = new Set(sorted.map((r) => r.dt));

  // Walk through dates to find streaks and gaps
  let currentStreak = 1;
  let longestStreak = 1;
  let totalConsecutiveDays = 0;
  let freezesUsed = 0;
  let streak = 1;
  let frozeInCurrentStreak = false;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].dt + "T00:00:00");
    const curr = new Date(sorted[i].dt + "T00:00:00");
    const diffDays = Math.round((curr - prev) / 86400000);

    if (diffDays === 1) {
      streak++;
    } else if (diffDays === 2 && !frozeInCurrentStreak) {
      // 1-day gap — use a freeze if available
      const freezesAtPoint = Math.floor(streak / 7);
      if (freezesAtPoint > 0) {
        freezesUsed++;
        frozeInCurrentStreak = true;
        streak++;
      } else {
        totalConsecutiveDays += streak;
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
        frozeInCurrentStreak = false;
      }
    } else {
      totalConsecutiveDays += streak;
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
      frozeInCurrentStreak = false;
    }
  }
  totalConsecutiveDays += streak;
  longestStreak = Math.max(longestStreak, streak);
  currentStreak = streak;

  const freezesEarned = Math.floor(totalConsecutiveDays / 7);
  const freezesAvailable = Math.max(0, freezesEarned - freezesUsed);

  return {
    freezesEarned,
    freezesUsed,
    freezesAvailable,
    currentStreak,
    longestStreak,
  };
}

/**
 * Prepare data for a recent weight bar chart visualization.
 * Returns the last N entries with percentage positions relative to a min-max range.
 * Each bar shows date, weight, change from previous, and percentage height.
 * Returns { bars: [{ dt, wt, change, pct, isGoal }], min, max, goalPct }
 */
export function calcRecentWeightBars(records, goalWeight = 0, count = 7) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-count);

  const weights = recent.map((r) => r.wt);
  if (goalWeight > 0) weights.push(goalWeight);
  const min = Math.min(...weights) - 0.5;
  const max = Math.max(...weights) + 0.5;
  const range = max - min || 1;

  const bars = recent.map((r, i) => {
    const prev = i > 0 ? recent[i - 1].wt : (sorted.length > count ? sorted[sorted.length - count - 1]?.wt : null);
    const change = prev !== null ? +(r.wt - prev).toFixed(1) : null;
    return {
      dt: r.dt,
      wt: r.wt,
      change,
      pct: +((r.wt - min) / range * 100).toFixed(1),
    };
  });

  const goalPct = goalWeight > 0 ? +((goalWeight - min) / range * 100).toFixed(1) : null;

  return { bars, min, max, goalPct };
}

/**
 * Calculate weight tracking anniversary milestones.
 * Shows how long the user has been tracking and weight change since start.
 * Returns { trackingDays, startDate, startWeight, currentWeight, totalChange,
 *           milestones: [{ label, days, reached, weightAtMilestone, changeAtMilestone }] }
 */
export function calcWeightAnniversary(records) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const startDate = sorted[0].dt;
  const startWeight = sorted[0].wt;
  const currentWeight = sorted[sorted.length - 1].wt;
  const totalChange = +(currentWeight - startWeight).toFixed(1);

  const start = new Date(startDate + "T00:00:00");
  const latest = new Date(sorted[sorted.length - 1].dt + "T00:00:00");
  const trackingDays = Math.round((latest - start) / 86400000);

  const milestoneDefs = [
    { label: "1week", days: 7 },
    { label: "1month", days: 30 },
    { label: "3months", days: 90 },
    { label: "6months", days: 180 },
    { label: "1year", days: 365 },
    { label: "2years", days: 730 },
  ];

  const milestones = milestoneDefs.map((m) => {
    const reached = trackingDays >= m.days;
    let weightAtMilestone = null;
    let changeAtMilestone = null;

    if (reached) {
      const targetDate = new Date(start);
      targetDate.setDate(targetDate.getDate() + m.days);
      const targetStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
      // Find closest record to the milestone date
      let closest = sorted[0];
      let closestDiff = Infinity;
      for (const r of sorted) {
        const diff = Math.abs(new Date(r.dt + "T00:00:00") - targetDate);
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = r;
        }
      }
      weightAtMilestone = closest.wt;
      changeAtMilestone = +(closest.wt - startWeight).toFixed(1);
    }

    return {
      label: m.label,
      days: m.days,
      reached,
      weightAtMilestone,
      changeAtMilestone,
    };
  });

  return {
    trackingDays,
    startDate,
    startWeight,
    currentWeight,
    totalChange,
    milestones,
  };
}

/**
 * Calculate distribution of day-to-day weight changes.
 * Groups changes into buckets (e.g., -1.0 to -0.5, -0.5 to 0, 0 to 0.5, etc.)
 * Returns { buckets: [{ label, min, max, count, pct }], avgChange, medianChange, normalRange }
 */
export function calcDailyChangeDist(records) {
  if (!records || records.length < 3) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const changes = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].dt + "T00:00:00");
    const curr = new Date(sorted[i].dt + "T00:00:00");
    const daysDiff = Math.round((curr - prev) / 86400000);
    // Only include consecutive or near-consecutive days (1-2 days apart)
    if (daysDiff >= 1 && daysDiff <= 2) {
      changes.push(+(sorted[i].wt - sorted[i - 1].wt).toFixed(2));
    }
  }

  if (changes.length < 3) return null;

  // Create buckets of 0.5kg width
  const bucketSize = 0.5;
  const minChange = Math.min(...changes);
  const maxChange = Math.max(...changes);
  const startBucket = Math.floor(minChange / bucketSize) * bucketSize;
  const endBucket = Math.ceil(maxChange / bucketSize) * bucketSize;

  const buckets = [];
  for (let b = startBucket; b < endBucket; b += bucketSize) {
    const bMin = +b.toFixed(1);
    const bMax = +(b + bucketSize).toFixed(1);
    const count = changes.filter((c) => c >= bMin && c < bMax).length;
    buckets.push({
      label: `${bMin >= 0 ? "+" : ""}${bMin}`,
      min: bMin,
      max: bMax,
      count,
      pct: +(count / changes.length * 100).toFixed(1),
    });
  }

  // Stats
  const sortedChanges = [...changes].sort((a, b) => a - b);
  const medianChange = sortedChanges.length % 2 === 0
    ? +((sortedChanges[sortedChanges.length / 2 - 1] + sortedChanges[sortedChanges.length / 2]) / 2).toFixed(2)
    : +sortedChanges[Math.floor(sortedChanges.length / 2)].toFixed(2);
  const avgChange = +(changes.reduce((s, c) => s + c, 0) / changes.length).toFixed(2);

  // Normal range: middle 80% (10th to 90th percentile)
  const p10 = sortedChanges[Math.floor(sortedChanges.length * 0.1)];
  const p90 = sortedChanges[Math.floor(sortedChanges.length * 0.9)];

  return {
    buckets,
    avgChange,
    medianChange,
    normalRange: { low: +p10.toFixed(2), high: +p90.toFixed(2) },
    totalChanges: changes.length,
  };
}

/**
 * Calculate how many consecutive recent records are on the "right side" of the goal.
 * For weight loss: counts days where weight <= goal or trending toward it.
 * For weight gain: counts days where weight >= goal or trending toward it.
 * Returns { streak, direction, goalWeight, closestToGoal, currentDist }
 */
export function calcGoalStreak(records, goalWeight) {
  if (!records || records.length < 2 || !Number.isFinite(goalWeight) || goalWeight <= 0) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const current = sorted[sorted.length - 1].wt;
  const direction = current > goalWeight ? "lose" : current < goalWeight ? "gain" : "achieved";

  if (direction === "achieved") {
    return { streak: 1, direction: "achieved", goalWeight, closestToGoal: current, currentDist: 0 };
  }

  // Count consecutive records moving toward goal from the end
  // Each record should be closer to goal than the one before it (with tolerance)
  let streak = 1;
  let closestToGoal = current;
  let closestDist = Math.abs(current - goalWeight);

  for (let i = sorted.length - 2; i >= 0; i--) {
    const prevDist = Math.abs(sorted[i].wt - goalWeight);
    const nextDist = Math.abs(sorted[i + 1].wt - goalWeight);
    // Previous record was farther from goal or roughly equal — streak continues
    if (prevDist >= nextDist - 0.2) {
      streak++;
      if (Math.abs(sorted[i].wt - goalWeight) < closestDist) {
        closestDist = Math.abs(sorted[i].wt - goalWeight);
        closestToGoal = sorted[i].wt;
      }
    } else {
      break;
    }
  }

  return {
    streak,
    direction,
    goalWeight,
    closestToGoal: +closestToGoal.toFixed(1),
    currentDist: +Math.abs(current - goalWeight).toFixed(1),
  };
}

/**
 * Compare the user's first N days of tracking vs the last N days.
 * Shows concrete "then vs now" progress.
 * Returns { then: { avg, min, max, count, period }, now: { avg, min, max, count, period }, diff }
 */
export function calcThenVsNow(records, days = 7) {
  if (!records || records.length < days * 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const first = sorted.slice(0, days);
  const last = sorted.slice(-days);

  const calcGroup = (group) => {
    const weights = group.map((r) => r.wt);
    const avg = +(weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1);
    return {
      avg,
      min: +Math.min(...weights).toFixed(1),
      max: +Math.max(...weights).toFixed(1),
      count: group.length,
      period: `${group[0].dt} ~ ${group[group.length - 1].dt}`,
    };
  };

  const thenData = calcGroup(first);
  const nowData = calcGroup(last);

  return {
    then: thenData,
    now: nowData,
    diff: +(nowData.avg - thenData.avg).toFixed(1),
  };
}

/**
 * Calculate quick weight presets for faster entry.
 * Returns up to 3 suggested weights based on recent history.
 * Returns [{ label, weight }] — deduplicated and sorted.
 */
export function calcQuickWeightPresets(records) {
  if (!records || records.length === 0) return [];

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const last = sorted[sorted.length - 1].wt;
  const presets = new Map();

  // Last recorded weight
  presets.set(last.toFixed(1), { label: "last", weight: +last.toFixed(1) });

  // Average of last 3
  if (sorted.length >= 3) {
    const recent3 = sorted.slice(-3);
    const avg3 = +(recent3.reduce((s, r) => s + r.wt, 0) / 3).toFixed(1);
    if (!presets.has(avg3.toFixed(1))) {
      presets.set(avg3.toFixed(1), { label: "avg3", weight: avg3 });
    }
  }

  // Typical next weight (based on recent trend)
  if (sorted.length >= 2) {
    const prev = sorted[sorted.length - 2].wt;
    const trend = last - prev;
    const predicted = +(last + trend).toFixed(1);
    if (predicted >= 20 && predicted <= 300 && !presets.has(predicted.toFixed(1))) {
      presets.set(predicted.toFixed(1), { label: "trend", weight: predicted });
    }
  }

  return [...presets.values()].sort((a, b) => a.weight - b.weight);
}

/**
 * Analyze record completeness — how many records include body fat, notes, tags.
 * Encourages users to enter richer data.
 * Returns { total, withBodyFat, withNote, withTag, completePct, bodyFatPct, notePct, tagPct, level }
 */
export function calcRecordCompleteness(records) {
  if (!records || records.length === 0) return null;

  let withBodyFat = 0;
  let withNote = 0;
  let withTag = 0;

  for (const r of records) {
    if (r.bf != null && Number(r.bf) > 0) withBodyFat++;
    if (r.note && r.note.trim().length > 0) withNote++;
    if (r.note && /#\w+/.test(r.note)) withTag++;
  }

  const total = records.length;
  const bodyFatPct = Math.round((withBodyFat / total) * 100);
  const notePct = Math.round((withNote / total) * 100);
  const tagPct = Math.round((withTag / total) * 100);
  const completePct = Math.round(((withBodyFat + withNote) / (total * 2)) * 100);

  let level;
  if (completePct >= 75) level = "excellent";
  else if (completePct >= 50) level = "good";
  else if (completePct >= 25) level = "fair";
  else level = "basic";

  return { total, withBodyFat, withNote, withTag, completePct, bodyFatPct, notePct, tagPct, level };
}

/**
 * Calculate weight change pace and compare to healthy guidelines.
 * Loss: healthy is 0.5–1.0 kg/week. Gain: healthy is 0.25–0.5 kg/week.
 * Returns { weeklyRate, direction, pace, healthyMin, healthyMax }
 * pace: "too_fast" | "healthy" | "too_slow" | "maintaining"
 */
export function calcWeightPace(records, goalWeight) {
  if (!records || records.length < 7 || !goalWeight || goalWeight <= 0) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-14);
  if (recent.length < 7) return null;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const daysDiff = Math.max(1, Math.round((new Date(last.dt + "T00:00:00") - new Date(first.dt + "T00:00:00")) / 86400000));
  const totalChange = last.wt - first.wt;
  const weeklyRate = +((totalChange / daysDiff) * 7).toFixed(2);

  const currentWt = last.wt;
  const direction = currentWt > goalWeight ? "lose" : currentWt < goalWeight ? "gain" : "achieved";

  if (direction === "achieved") {
    return { weeklyRate, direction, pace: "maintaining", healthyMin: 0, healthyMax: 0 };
  }

  let healthyMin, healthyMax, pace;
  if (direction === "lose") {
    healthyMin = -1.0;
    healthyMax = -0.5;
    if (weeklyRate < healthyMin) pace = "too_fast";
    else if (weeklyRate >= healthyMin && weeklyRate <= healthyMax) pace = "healthy";
    else pace = "too_slow";
  } else {
    healthyMin = 0.25;
    healthyMax = 0.5;
    if (weeklyRate > healthyMax) pace = "too_fast";
    else if (weeklyRate < 0.1) pace = "too_slow";
    else if (weeklyRate >= healthyMin) pace = "healthy";
    else pace = "too_slow";
  }

  return { weeklyRate, direction, pace, healthyMin, healthyMax };
}

/**
 * Calculate weight measurement smoothness score.
 * Measures how consistent day-to-day changes are relative to the overall trend.
 * Low noise = consistent measurement conditions; high noise = erratic.
 * Returns { score (0–100), avgDailyNoise, trendSlope, rating }
 * rating: "very_smooth" | "smooth" | "normal" | "noisy" | "erratic"
 */
export function calcWeightSmoothness(records) {
  if (!records || records.length < 7) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-30);
  if (recent.length < 7) return null;

  // Calculate trend slope via simple linear regression
  const n = recent.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recent[i].wt;
    sumXY += i * recent[i].wt;
    sumX2 += i * i;
  }
  const trendSlope = +((n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)).toFixed(4);

  // Calculate noise: deviation from trend for each point
  const intercept = (sumY - trendSlope * sumX) / n;
  let totalNoise = 0;
  for (let i = 0; i < n; i++) {
    const expected = intercept + trendSlope * i;
    totalNoise += Math.abs(recent[i].wt - expected);
  }
  const avgDailyNoise = +(totalNoise / n).toFixed(3);

  // Score: 100 = perfectly smooth, 0 = very noisy
  // Baseline: 0.3kg noise is average for daily weighing
  const score = Math.max(0, Math.min(100, Math.round(100 - (avgDailyNoise / 0.6) * 100)));

  let rating;
  if (score >= 90) rating = "very_smooth";
  else if (score >= 70) rating = "smooth";
  else if (score >= 50) rating = "normal";
  else if (score >= 30) rating = "noisy";
  else rating = "erratic";

  return { score, avgDailyNoise, trendSlope, rating };
}

/**
 * Break down weight stats by recent months.
 * Returns { months: [{ yearMonth, avg, min, max, count, change }] }
 * change is difference in avg from previous month (null for first month).
 */
export function calcPeriodBreakdown(records, numMonths = 3) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));

  // Group by year-month
  const groups = new Map();
  for (const r of sorted) {
    const ym = r.dt.slice(0, 7);
    if (!groups.has(ym)) groups.set(ym, []);
    groups.get(ym).push(r.wt);
  }

  // Get last N months
  const allMonths = [...groups.keys()].sort();
  const recentMonths = allMonths.slice(-numMonths);
  if (recentMonths.length === 0) return null;

  const months = [];
  let prevAvg = null;

  // Include the month before the first recent month for change calculation
  const firstIdx = allMonths.indexOf(recentMonths[0]);
  if (firstIdx > 0) {
    const prevWeights = groups.get(allMonths[firstIdx - 1]);
    prevAvg = +(prevWeights.reduce((s, w) => s + w, 0) / prevWeights.length).toFixed(1);
  }

  for (const ym of recentMonths) {
    const weights = groups.get(ym);
    const avg = +(weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1);
    const min = +Math.min(...weights).toFixed(1);
    const max = +Math.max(...weights).toFixed(1);
    const change = prevAvg !== null ? +(avg - prevAvg).toFixed(1) : null;
    months.push({ yearMonth: ym, avg, min, max, count: weights.length, change });
    prevAvg = avg;
  }

  return { months };
}

/**
 * Calculate a motivation level based on recent activity and progress.
 * Considers: recording streak, weight trend, and consistency.
 * Returns { level (1-5), streakDays, trendDirection, isImproving }
 * level 1 = needs encouragement, 5 = doing great
 */
export function calcMotivationLevel(records) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));

  // Calculate streak (consecutive recent days)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  let streakDays = 0;
  const dateSet = new Set(sorted.map((r) => r.dt));
  for (let d = 0; d < 60; d++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - d);
    const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (dateSet.has(ds)) {
      streakDays++;
    } else if (d > 0) {
      break;
    }
  }

  // Check trend direction (last 7 entries)
  const recent = sorted.slice(-7);
  let trendDirection = "stable";
  if (recent.length >= 3) {
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const avgFirst = firstHalf.reduce((s, r) => s + r.wt, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, r) => s + r.wt, 0) / secondHalf.length;
    const diff = avgSecond - avgFirst;
    if (diff < -0.2) trendDirection = "losing";
    else if (diff > 0.2) trendDirection = "gaining";
  }

  // Check consistency (records in last 7 days)
  const last7dates = new Set();
  for (let d = 0; d < 7; d++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - d);
    const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (dateSet.has(ds)) last7dates.add(ds);
  }
  const weeklyConsistency = last7dates.size;

  // Calculate level
  let level = 1;
  if (streakDays >= 7) level += 2;
  else if (streakDays >= 3) level += 1;
  if (weeklyConsistency >= 5) level += 1;
  if (trendDirection === "losing" || trendDirection === "stable") level += 1;
  level = Math.min(5, Math.max(1, level));

  const isImproving = trendDirection === "losing";

  return { level, streakDays, trendDirection, isImproving };
}

/**
 * Calculate a confidence band for the user's "true weight" based on recent variance.
 * Uses the last 7–14 readings to compute a mean and standard deviation,
 * then returns a band (mean ± 1 SD) showing the likely true weight range.
 * Returns { mean, low, high, stdDev, readings, bandwidth }
 */
export function calcWeightBand(records) {
  if (!records || records.length < 5) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-14);
  if (recent.length < 5) return null;

  const weights = recent.map((r) => r.wt);
  const n = weights.length;
  const mean = +(weights.reduce((s, w) => s + w, 0) / n).toFixed(1);

  const variance = weights.reduce((s, w) => s + (w - mean) ** 2, 0) / n;
  const stdDev = +Math.sqrt(variance).toFixed(2);

  const low = +(mean - stdDev).toFixed(1);
  const high = +(mean + stdDev).toFixed(1);
  const bandwidth = +(high - low).toFixed(1);

  return { mean, low, high, stdDev, readings: n, bandwidth };
}

/**
 * Find the best (lowest average) day of the week for weigh-ins.
 * Returns { days: [{ day (0-6), avg, count, diffFromBest }], bestDay, worstDay }
 * day: 0=Sun, 1=Mon, ... 6=Sat
 */
export function calcBestWeighDay(records) {
  if (!records || records.length < 14) return null;

  const dayTotals = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));

  for (const r of records) {
    const d = new Date(r.dt + "T00:00:00");
    const dow = d.getDay();
    dayTotals[dow].sum += r.wt;
    dayTotals[dow].count++;
  }

  const days = dayTotals.map((d, i) => ({
    day: i,
    avg: d.count > 0 ? +(d.sum / d.count).toFixed(1) : null,
    count: d.count,
  })).filter((d) => d.avg !== null);

  if (days.length < 3) return null;

  const minAvg = Math.min(...days.map((d) => d.avg));
  const maxAvg = Math.max(...days.map((d) => d.avg));
  const bestDay = days.find((d) => d.avg === minAvg).day;
  const worstDay = days.find((d) => d.avg === maxAvg).day;

  for (const d of days) {
    d.diffFromBest = +(d.avg - minAvg).toFixed(1);
  }

  return { days, bestDay, worstDay };
}

/**
 * Generate sparkline data points for the last N weight readings.
 * Returns { points: [{ x, y }], min, max, trend, svgPath }
 * x/y are normalized 0-100 for easy SVG rendering.
 * trend: "up" | "down" | "flat"
 */
export function calcMiniSparkline(records, count = 10) {
  if (!records || records.length < 3) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-count);
  if (recent.length < 3) return null;

  const weights = recent.map((r) => r.wt);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = weights.map((w, i) => ({
    x: Math.round((i / (weights.length - 1)) * 100),
    y: Math.round(100 - ((w - min) / range) * 100),
  }));

  const svgPath = "M" + points.map((p) => `${p.x},${p.y}`).join(" L");

  const firstAvg = weights.slice(0, Math.floor(weights.length / 2)).reduce((s, w) => s + w, 0) / Math.floor(weights.length / 2);
  const lastAvg = weights.slice(Math.floor(weights.length / 2)).reduce((s, w) => s + w, 0) / (weights.length - Math.floor(weights.length / 2));
  const diff = lastAvg - firstAvg;
  const trend = diff < -0.2 ? "down" : diff > 0.2 ? "up" : "flat";

  return { points, min: +min.toFixed(1), max: +max.toFixed(1), trend, svgPath };
}

/**
 * Generate a summary comparing the latest entry to recent history.
 * Returns { latest, vsYesterday, vsWeekAvg, allTimeBest, isNewBest }
 */
export function calcEntrySummary(records) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  const vsYesterday = +(latest.wt - prev.wt).toFixed(1);

  // Weekly average (last 7 entries excluding latest)
  const recentExcluding = sorted.slice(-8, -1);
  const weekAvg = +(recentExcluding.reduce((s, r) => s + r.wt, 0) / recentExcluding.length).toFixed(1);
  const vsWeekAvg = +(latest.wt - weekAvg).toFixed(1);

  // All-time best (lowest)
  const allTimeBest = +Math.min(...sorted.map((r) => r.wt)).toFixed(1);
  const isNewBest = latest.wt <= allTimeBest;

  return {
    latest: { dt: latest.dt, wt: +latest.wt.toFixed(1) },
    vsYesterday,
    vsWeekAvg,
    allTimeBest,
    isNewBest,
  };
}

/**
 * Calculate distance to goal weight with progress and ETA.
 * Returns { current, goal, remaining, progressPct, direction, etaDays }
 * etaDays: estimated days to reach goal based on recent pace, null if not estimable.
 */
export function calcGoalDistance(records, goalWeight) {
  if (!records || records.length < 2 || !goalWeight || goalWeight <= 0) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const current = sorted[sorted.length - 1].wt;
  const start = sorted[0].wt;
  const remaining = +(current - goalWeight).toFixed(1);

  if (Math.abs(remaining) < 0.1) {
    return { current: +current.toFixed(1), goal: goalWeight, remaining: 0, progressPct: 100, direction: "achieved", etaDays: 0 };
  }

  const direction = current > goalWeight ? "lose" : "gain";
  const totalJourney = Math.abs(start - goalWeight);
  const covered = totalJourney - Math.abs(remaining);
  const progressPct = totalJourney > 0 ? Math.max(0, Math.min(100, Math.round((covered / totalJourney) * 100))) : 0;

  // Estimate days using last 14 days pace
  let etaDays = null;
  const recent = sorted.slice(-14);
  if (recent.length >= 7) {
    const daysDiff = Math.max(1, Math.round((new Date(recent[recent.length - 1].dt) - new Date(recent[0].dt)) / 86400000));
    const dailyRate = (recent[recent.length - 1].wt - recent[0].wt) / daysDiff;
    if ((direction === "lose" && dailyRate < -0.01) || (direction === "gain" && dailyRate > 0.01)) {
      etaDays = Math.round(Math.abs(remaining) / Math.abs(dailyRate));
      if (etaDays > 730) etaDays = null; // Cap at 2 years
    }
  }

  return { current: +current.toFixed(1), goal: goalWeight, remaining: +Math.abs(remaining).toFixed(1), progressPct, direction, etaDays };
}

/**
 * Analyze recording time patterns by time-of-day slot.
 * Slots: morning (5-11), afternoon (12-17), evening (18-21), night (22-4).
 * Returns { slots: [{ name, count, pct, avgWt }], preferredSlot, totalWithTime }
 */
export function calcTimeSlotPattern(records) {
  if (!records || records.length < 5) return null;

  const slots = {
    morning: { count: 0, totalWt: 0 },
    afternoon: { count: 0, totalWt: 0 },
    evening: { count: 0, totalWt: 0 },
    night: { count: 0, totalWt: 0 },
  };

  let totalWithTime = 0;

  for (const r of records) {
    if (!r.time) continue;
    const hour = parseInt(r.time.split(":")[0], 10);
    if (isNaN(hour)) continue;
    totalWithTime++;

    let slot;
    if (hour >= 5 && hour < 12) slot = "morning";
    else if (hour >= 12 && hour < 18) slot = "afternoon";
    else if (hour >= 18 && hour < 22) slot = "evening";
    else slot = "night";

    slots[slot].count++;
    slots[slot].totalWt += r.wt;
  }

  if (totalWithTime < 3) return null;

  const result = Object.entries(slots).map(([name, data]) => ({
    name,
    count: data.count,
    pct: Math.round((data.count / totalWithTime) * 100),
    avgWt: data.count > 0 ? +(data.totalWt / data.count).toFixed(1) : null,
  }));

  const preferredSlot = result.reduce((best, s) => s.count > best.count ? s : best, result[0]).name;

  return { slots: result, preferredSlot, totalWithTime };
}

/**
 * Calculate streak badges earned based on longest consecutive recording days.
 * Milestones: 3, 7, 14, 30, 60, 90 days.
 * Returns { badges: [{ days, earned, icon }], longestStreak, currentStreak }
 */
export function calcStreakBadges(records) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const dateSet = new Set(sorted.map((r) => r.dt));
  const dates = [...dateSet].sort();

  // Calculate longest streak
  let longestStreak = 1;
  let currentRun = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      currentRun++;
      longestStreak = Math.max(longestStreak, currentRun);
    } else {
      currentRun = 1;
    }
  }

  // Calculate current streak (from most recent date backwards)
  let currentStreak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const curr = new Date(dates[i] + "T00:00:00");
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  const milestones = [3, 7, 14, 30, 60, 90];
  const icons = ["🔥", "⭐", "💪", "🏆", "💎", "👑"];

  const badges = milestones.map((days, i) => ({
    days,
    earned: longestStreak >= days,
    icon: icons[i],
  }));

  return { badges, longestStreak, currentStreak };
}

/**
 * Build a progress timeline of key weight milestones.
 * Each 1kg milestone crossed from start weight toward goal.
 * Returns { events: [{ dt, wt, type, label }], totalChange }
 * type: "start" | "milestone" | "best" | "current"
 */
export function calcProgressTimeline(records, goalWeight) {
  if (!records || records.length < 3) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const startWt = sorted[0].wt;
  const currentWt = sorted[sorted.length - 1].wt;
  const events = [];

  events.push({ dt: sorted[0].dt, wt: +startWt.toFixed(1), type: "start" });

  // Track each whole-kg milestone crossed
  const direction = goalWeight && goalWeight > 0 ? (startWt > goalWeight ? -1 : 1) : (currentWt < startWt ? -1 : 1);
  const milestonesHit = new Set();

  let bestWt = sorted[0].wt;
  let bestDt = sorted[0].dt;

  for (const r of sorted.slice(1)) {
    // Track personal best (lowest)
    if (r.wt < bestWt) {
      bestWt = r.wt;
      bestDt = r.dt;
    }

    // Check for kg milestones
    const kgFromStart = Math.floor(Math.abs(r.wt - startWt));
    if (kgFromStart > 0) {
      for (let k = 1; k <= kgFromStart && k <= 20; k++) {
        const mKey = direction === -1 ? -k : k;
        if (!milestonesHit.has(mKey)) {
          milestonesHit.add(mKey);
          const mWt = +(startWt + mKey).toFixed(1);
          events.push({ dt: r.dt, wt: mWt, type: "milestone" });
        }
      }
    }
  }

  // Add personal best if different from start/current
  if (bestWt < startWt && bestWt < currentWt) {
    events.push({ dt: bestDt, wt: +bestWt.toFixed(1), type: "best" });
  }

  events.push({ dt: sorted[sorted.length - 1].dt, wt: +currentWt.toFixed(1), type: "current" });

  // Sort by date
  events.sort((a, b) => a.dt.localeCompare(b.dt));

  // Limit to 8 most significant events
  if (events.length > 8) {
    const start = events[0];
    const current = events[events.length - 1];
    const best = events.find((e) => e.type === "best");
    const milestones = events.filter((e) => e.type === "milestone");
    const kept = [start];
    if (best) kept.push(best);
    // Keep evenly spaced milestones
    const step = Math.max(1, Math.floor(milestones.length / 5));
    for (let i = 0; i < milestones.length; i += step) {
      if (kept.length < 7) kept.push(milestones[i]);
    }
    kept.push(current);
    kept.sort((a, b) => a.dt.localeCompare(b.dt));
    return { events: kept, totalChange: +(currentWt - startWt).toFixed(1) };
  }

  return { events, totalChange: +(currentWt - startWt).toFixed(1) };
}

/**
 * Project weight at 7 and 30 days with confidence based on trend consistency.
 * Returns { current, forecast7, forecast30, dailyRate, confidence }
 * confidence: 0–100 (how consistent the recent trend is)
 */
export function calcForecastConfidence(records) {
  if (!records || records.length < 10) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-14);
  if (recent.length < 7) return null;

  const current = recent[recent.length - 1].wt;

  // Calculate daily rate from linear regression
  const n = recent.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recent[i].wt;
    sumXY += i * recent[i].wt;
    sumX2 += i * i;
  }
  const dailyRate = +((n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)).toFixed(4);

  // Calculate confidence: how well the data fits the trend line
  const intercept = (sumY - dailyRate * sumX) / n;
  let ssRes = 0, ssTot = 0;
  const mean = sumY / n;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + dailyRate * i;
    ssRes += (recent[i].wt - predicted) ** 2;
    ssTot += (recent[i].wt - mean) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const confidence = Math.round(r2 * 100);

  const forecast7 = +(current + dailyRate * 7).toFixed(1);
  const forecast30 = +(current + dailyRate * 30).toFixed(1);

  return { current: +current.toFixed(1), forecast7, forecast30, dailyRate, confidence };
}

/**
 * Categorize weight readings into zones relative to goal weight.
 * Zones: below (< goal - margin), at (within margin), above (> goal + margin)
 * margin = 1% of goal weight (min 0.5 kg)
 * Returns { zones: { below, at, above } with count/pct, margin, goal, recent30 }
 */
export function calcWeightZones(records, goalWeight) {
  if (!records || records.length < 3 || !goalWeight || goalWeight <= 0) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const margin = Math.max(0.5, goalWeight * 0.01);
  const low = goalWeight - margin;
  const high = goalWeight + margin;

  let below = 0, at = 0, above = 0;
  for (const r of sorted) {
    if (r.wt < low) below++;
    else if (r.wt > high) above++;
    else at++;
  }

  const total = sorted.length;

  // Also calculate for recent 30 entries
  const recent = sorted.slice(-30);
  let rBelow = 0, rAt = 0, rAbove = 0;
  for (const r of recent) {
    if (r.wt < low) rBelow++;
    else if (r.wt > high) rAbove++;
    else rAt++;
  }
  const rTotal = recent.length;

  return {
    zones: {
      below: { count: below, pct: Math.round((below / total) * 100) },
      at: { count: at, pct: Math.round((at / total) * 100) },
      above: { count: above, pct: Math.round((above / total) * 100) },
    },
    recent30: {
      below: { count: rBelow, pct: Math.round((rBelow / rTotal) * 100) },
      at: { count: rAt, pct: Math.round((rAt / rTotal) * 100) },
      above: { count: rAbove, pct: Math.round((rAbove / rTotal) * 100) },
    },
    margin: +margin.toFixed(1),
    goal: goalWeight,
    total,
  };
}

/**
 * Calculate rolling 7-day weight change rates over time.
 * Returns up to the last 8 windows so it can be rendered as a mini bar chart.
 * Each window: { endDt, rate (kg/week), direction }
 */
export function calcWeightChangeRate(records) {
  if (!records || records.length < 14) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));

  // Build weekly windows: take pairs 7 entries apart
  const windowSize = 7;
  const rates = [];
  for (let i = windowSize; i < sorted.length; i += windowSize) {
    const start = sorted[i - windowSize];
    const end = sorted[i];
    const daysDiff = (new Date(end.dt) - new Date(start.dt)) / 86400000;
    if (daysDiff <= 0) continue;
    const rate = +((end.wt - start.wt) / daysDiff * 7).toFixed(2); // kg per week
    rates.push({
      endDt: end.dt,
      rate,
      direction: rate < -0.1 ? "losing" : rate > 0.1 ? "gaining" : "stable",
    });
  }

  if (rates.length === 0) return null;

  // Keep last 8 windows
  const recent = rates.slice(-8);
  const maxAbs = Math.max(...recent.map((r) => Math.abs(r.rate)), 0.1);
  const avgRate = +(recent.reduce((s, r) => s + r.rate, 0) / recent.length).toFixed(2);

  return {
    windows: recent,
    maxAbsRate: +maxAbs.toFixed(2),
    avgRate,
    trend: avgRate < -0.1 ? "losing" : avgRate > 0.1 ? "gaining" : "stable",
  };
}

/**
 * Analyze weigh-in interval consistency.
 * Detects the user's natural cadence and scores how well they stick to it.
 * Returns { avgInterval, medianInterval, cadence, score (0-100), totalGaps, regularGaps }
 */
export function calcWeighInConsistency(records) {
  if (!records || records.length < 5) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round((new Date(sorted[i].dt) - new Date(sorted[i - 1].dt)) / 86400000);
    if (days > 0) gaps.push(days);
  }

  if (gaps.length < 3) return null;

  // Average and median interval
  const avgInterval = +(gaps.reduce((s, g) => s + g, 0) / gaps.length).toFixed(1);
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianInterval = sortedGaps[Math.floor(sortedGaps.length / 2)];

  // Detect natural cadence: 1 = daily, 2 = every other day, 7 = weekly, etc.
  const cadence = medianInterval <= 1.5 ? 1 : medianInterval <= 3 ? 2 : medianInterval <= 5 ? 3 : 7;

  // Score: how many gaps are within ±1 day of the cadence
  const tolerance = cadence <= 2 ? 1 : 2;
  let regularGaps = 0;
  for (const g of gaps) {
    if (Math.abs(g - cadence) <= tolerance) regularGaps++;
  }

  const score = Math.round((regularGaps / gaps.length) * 100);

  // Cadence label
  let cadenceLabel;
  if (cadence === 1) cadenceLabel = "daily";
  else if (cadence === 2) cadenceLabel = "every_other_day";
  else if (cadence === 3) cadenceLabel = "every_few_days";
  else cadenceLabel = "weekly";

  return {
    avgInterval,
    medianInterval,
    cadence,
    cadenceLabel,
    score,
    totalGaps: gaps.length,
    regularGaps,
  };
}

/**
 * Identify plateau periods where weight stayed within a narrow band.
 * A plateau = 7+ consecutive readings within ±0.5kg of their mean.
 * Returns { plateaus: [{ startDt, endDt, days, avgWt, readings }], current, longestDays }
 */
export function calcPlateauPeriods(records) {
  if (!records || records.length < 7) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const band = 0.5; // kg tolerance
  const minReadings = 7;

  const plateaus = [];
  let start = 0;

  while (start < sorted.length) {
    // Try to extend a window from start
    let end = start;
    let sum = sorted[start].wt;
    let count = 1;
    let mean = sum;

    while (end + 1 < sorted.length) {
      const nextWt = sorted[end + 1].wt;
      const newSum = sum + nextWt;
      const newMean = newSum / (count + 1);
      // Check if all readings in window are within band of new mean
      let allInBand = Math.abs(nextWt - newMean) <= band;
      if (allInBand) {
        for (let j = start; j <= end; j++) {
          if (Math.abs(sorted[j].wt - newMean) > band) {
            allInBand = false;
            break;
          }
        }
      }
      if (allInBand) {
        end++;
        sum = newSum;
        count++;
        mean = newMean;
      } else {
        break;
      }
    }

    if (count >= minReadings) {
      const days = Math.round((new Date(sorted[end].dt) - new Date(sorted[start].dt)) / 86400000);
      plateaus.push({
        startDt: sorted[start].dt,
        endDt: sorted[end].dt,
        days: Math.max(days, 1),
        avgWt: +mean.toFixed(1),
        readings: count,
      });
      start = end + 1;
    } else {
      start++;
    }
  }

  if (plateaus.length === 0) return null;

  const longestDays = Math.max(...plateaus.map((p) => p.days));
  const lastRecord = sorted[sorted.length - 1];
  const current = plateaus.length > 0 && plateaus[plateaus.length - 1].endDt === lastRecord.dt;

  return { plateaus, current, longestDays };
}

/**
 * Calculate where the current weight falls as a percentile within all readings.
 * Also shows quartile boundaries (Q1, median, Q3).
 * Returns { percentile, current, min, max, q1, median, q3, totalReadings }
 */
export function calcWeightPercentileRank(records) {
  if (!records || records.length < 5) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const current = sorted[sorted.length - 1].wt;
  const weights = sorted.map((r) => r.wt).sort((a, b) => a - b);
  const n = weights.length;

  // Count how many readings are below current
  const belowCount = weights.filter((w) => w < current).length;
  const equalCount = weights.filter((w) => w === current).length;
  // Percentile rank: (below + 0.5 * equal) / total * 100
  const percentile = Math.round(((belowCount + 0.5 * equalCount) / n) * 100);

  const q1 = weights[Math.floor(n * 0.25)];
  const median = weights[Math.floor(n * 0.5)];
  const q3 = weights[Math.floor(n * 0.75)];

  return {
    percentile,
    current: +current.toFixed(1),
    min: +weights[0].toFixed(1),
    max: +weights[n - 1].toFixed(1),
    q1: +q1.toFixed(1),
    median: +median.toFixed(1),
    q3: +q3.toFixed(1),
    totalReadings: n,
  };
}

/**
 * Calculate a simple trend arrow based on last 3–7 days of data.
 * Returns { arrow, label, change, days }
 * arrow: "up2" (rising fast), "up1" (rising), "flat", "down1" (falling), "down2" (falling fast)
 * Thresholds: ±0.3kg = flat, ±0.3–0.8 = moderate, >0.8 = strong
 */
export function calcWeightTrendArrow(records) {
  if (!records || records.length < 3) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-7);
  if (recent.length < 3) return null;

  const first = recent[0].wt;
  const last = recent[recent.length - 1].wt;
  const change = +(last - first).toFixed(1);
  const days = Math.max(1, Math.round((new Date(recent[recent.length - 1].dt) - new Date(recent[0].dt)) / 86400000));
  const dailyChange = change / days;

  let arrow;
  if (dailyChange > 0.12) arrow = "up2";
  else if (dailyChange > 0.04) arrow = "up1";
  else if (dailyChange < -0.12) arrow = "down2";
  else if (dailyChange < -0.04) arrow = "down1";
  else arrow = "flat";

  return { arrow, change, days };
}

/**
 * Calculate fat mass vs lean mass breakdown from records with body fat %.
 * Compares first and latest readings to show composition change.
 * Returns { current, first, fatChange, leanChange, entries }
 */
export function calcBodyCompositionBreakdown(records) {
  if (!records || records.length < 2) return null;

  const withBf = records
    .filter((r) => r.bf != null && r.bf > 0 && r.bf < 100)
    .sort((a, b) => a.dt.localeCompare(b.dt));

  if (withBf.length < 2) return null;

  const first = withBf[0];
  const latest = withBf[withBf.length - 1];

  const firstFat = +(first.wt * first.bf / 100).toFixed(1);
  const firstLean = +(first.wt - firstFat).toFixed(1);
  const latestFat = +(latest.wt * latest.bf / 100).toFixed(1);
  const latestLean = +(latest.wt - latestFat).toFixed(1);

  return {
    current: {
      dt: latest.dt,
      wt: +latest.wt.toFixed(1),
      bf: +latest.bf.toFixed(1),
      fatMass: latestFat,
      leanMass: latestLean,
    },
    first: {
      dt: first.dt,
      wt: +first.wt.toFixed(1),
      bf: +first.bf.toFixed(1),
      fatMass: firstFat,
      leanMass: firstLean,
    },
    fatChange: +(latestFat - firstFat).toFixed(1),
    leanChange: +(latestLean - firstLean).toFixed(1),
    entries: withBf.length,
  };
}

/**
 * Generate a weekly report card grading recording consistency, goal progress, and stability.
 * Grade: A (90+), B (70-89), C (50-69), D (30-49), F (<30)
 * Returns { grade, score, consistency, goalProgress, stability, weekRecords }
 */
export function calcWeeklyReportCard(records, goalWeight) {
  if (!records || records.length < 3) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.dt);

  // Get records from the last 7 calendar days
  const weekAgo = new Date(latestDate);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const weekRecords = sorted.filter((r) => r.dt >= weekStr);

  if (weekRecords.length < 1) return null;

  // 1. Consistency score (0-100): how many of the last 7 days have records
  const daysWithRecords = new Set(weekRecords.map((r) => r.dt)).size;
  const consistency = Math.round((daysWithRecords / 7) * 100);

  // 2. Goal progress score (0-100): are we moving toward goal?
  let goalProgress = 50; // neutral if no goal
  if (goalWeight && goalWeight > 0 && weekRecords.length >= 2) {
    const weekStart = weekRecords[0].wt;
    const weekEnd = weekRecords[weekRecords.length - 1].wt;
    const change = weekEnd - weekStart;
    const needed = goalWeight - weekStart;
    if (Math.abs(needed) < 0.3) {
      goalProgress = 100; // at goal
    } else if ((needed < 0 && change < 0) || (needed > 0 && change > 0)) {
      // Moving in right direction
      const ratio = Math.min(Math.abs(change / needed), 1);
      goalProgress = 60 + Math.round(ratio * 40);
    } else if (Math.abs(change) < 0.3) {
      goalProgress = 40; // stable but not at goal
    } else {
      goalProgress = Math.max(0, 30 - Math.round(Math.abs(change) * 10));
    }
  }

  // 3. Stability score (0-100): low daily fluctuation is good
  let stability = 50;
  if (weekRecords.length >= 2) {
    const wts = weekRecords.map((r) => r.wt);
    const mean = wts.reduce((s, w) => s + w, 0) / wts.length;
    const variance = wts.reduce((s, w) => s + (w - mean) ** 2, 0) / wts.length;
    const stdDev = Math.sqrt(variance);
    // stdDev < 0.3 = very stable (100), > 1.5 = very unstable (0)
    stability = Math.max(0, Math.min(100, Math.round((1.5 - stdDev) / 1.5 * 100)));
  }

  const score = Math.round(consistency * 0.4 + goalProgress * 0.35 + stability * 0.25);
  let grade;
  if (score >= 90) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 50) grade = "C";
  else if (score >= 30) grade = "D";
  else grade = "F";

  return { grade, score, consistency, goalProgress, stability, weekRecords: daysWithRecords };
}

/**
 * Analyze note text frequency from records.
 * Extracts words from notes, counts frequency, returns top words.
 * Returns { words: [{ text, count }], totalNotes, totalWords }
 */
export function calcNoteWordFrequency(records, topN = 10) {
  if (!records || records.length < 1) return null;

  const withNotes = records.filter((r) => r.note && r.note.trim().length > 0);
  if (withNotes.length < 2) return null;

  // Common stop words to filter out (ja + en)
  const stopWords = new Set([
    "the", "a", "an", "is", "was", "are", "were", "be", "been", "to", "of", "in", "for",
    "and", "on", "at", "it", "by", "with", "as", "or", "but", "not", "no", "so", "if",
    "my", "i", "me", "we", "he", "she", "they", "this", "that", "from", "had", "has", "have",
    "の", "は", "が", "を", "に", "で", "と", "も", "た", "て", "し", "な", "だ", "する",
    "した", "です", "ます", "ない", "ある", "いる", "こと", "もの", "その", "この",
  ]);

  const freq = {};
  for (const r of withNotes) {
    // Remove tag markers like #exercise, split on whitespace and punctuation
    const cleaned = r.note.replace(/#\w+/g, "").trim();
    const words = cleaned.split(/[\s,、。.!?！？\-/]+/).filter((w) => w.length >= 2 && !stopWords.has(w.toLowerCase()));
    for (const w of words) {
      const key = w.toLowerCase();
      freq[key] = (freq[key] || 0) + 1;
    }
  }

  const sorted = Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([text, count]) => ({ text, count }));

  if (sorted.length === 0) return null;

  return {
    words: sorted,
    totalNotes: withNotes.length,
    totalWords: Object.values(freq).reduce((s, c) => s + c, 0),
  };
}

/**
 * Generate a shareable text summary of weight journey.
 * Returns { currentWt, startWt, change, sign, days, streak, bmi, goalPct, totalRecords }
 */
export function calcShareText(records, goalWeight, heightCm) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const change = +(latest.wt - first.wt).toFixed(1);
  const days = Math.max(1, Math.round((new Date(latest.dt) - new Date(first.dt)) / 86400000));
  const sign = change > 0 ? "+" : "";

  const dates = new Set(sorted.map((r) => r.dt));
  let streak = 0;
  const latestDate = new Date(latest.dt);
  for (let i = 0; i < 365; i++) {
    const d = new Date(latestDate);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (dates.has(ds)) streak++;
    else if (i > 0) break;
  }

  let bmi = null;
  if (heightCm && heightCm > 0) {
    const hm = heightCm / 100;
    bmi = +(latest.wt / (hm * hm)).toFixed(1);
  }

  let goalPct = null;
  if (goalWeight && goalWeight > 0 && Math.abs(first.wt - goalWeight) > 0.5) {
    const total = first.wt - goalWeight;
    const progress = first.wt - latest.wt;
    goalPct = Math.max(0, Math.min(100, Math.round((progress / total) * 100)));
  }

  return {
    currentWt: +latest.wt.toFixed(1),
    startWt: +first.wt.toFixed(1),
    change,
    sign,
    days,
    streak,
    bmi,
    goalPct,
    totalRecords: sorted.length,
  };
}

/**
 * Count entries per month for the last N months.
 * Returns { months: [{ yearMonth, count, daysInMonth }], maxCount }
 */
export function calcEntryCountByMonth(records, numMonths = 6) {
  if (!records || records.length < 1) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latest = sorted[sorted.length - 1].dt;
  const latestDate = new Date(latest);

  const months = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const count = sorted.filter((r) => r.dt.startsWith(ym)).length;
    months.push({ yearMonth: ym, count, daysInMonth });
  }

  const maxCount = Math.max(...months.map((m) => m.count), 1);

  return { months, maxCount };
}

/**
 * Calculate daily weight fluctuation stats (moving range).
 * Shows how much weight changes day-to-day on average.
 * Returns { avgFluctuation, maxFluctuation, minFluctuation, fluctuations, stableDays }
 */
export function calcDailyFluctuation(records) {
  if (!records || records.length < 3) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const fluctuations = [];

  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.abs(sorted[i].wt - sorted[i - 1].wt);
    fluctuations.push({
      dt: sorted[i].dt,
      change: Math.round(diff * 100) / 100,
    });
  }

  const values = fluctuations.map((f) => f.change);
  const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const stableDays = values.filter((v) => v <= 0.3).length;
  const stablePct = Math.round((stableDays / values.length) * 100);

  return {
    avgFluctuation: avg,
    maxFluctuation: Math.round(max * 100) / 100,
    minFluctuation: Math.round(min * 100) / 100,
    fluctuations: fluctuations.slice(-14),
    stableDays,
    stablePct,
    totalDays: values.length,
  };
}

/**
 * Compare this week's average weight vs last week's average.
 * "Week" is Mon-Sun based on the latest record's date.
 * Returns { thisWeekAvg, lastWeekAvg, change, direction, thisWeekCount, lastWeekCount }
 */
export function calcWeekOverWeek(records) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latestDate = new Date(sorted[sorted.length - 1].dt + "T00:00:00");

  // Find Monday of the latest record's week
  const day = latestDate.getDay(); // 0=Sun
  const diffToMon = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(latestDate);
  thisMonday.setDate(thisMonday.getDate() - diffToMon);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const thisMon = fmt(thisMonday);
  const lastMon = fmt(lastMonday);

  const thisWeek = sorted.filter((r) => r.dt >= thisMon);
  const lastWeek = sorted.filter((r) => r.dt >= lastMon && r.dt < thisMon);

  if (thisWeek.length === 0 || lastWeek.length === 0) return null;

  const avg = (arr) => Math.round((arr.reduce((s, r) => s + r.wt, 0) / arr.length) * 10) / 10;
  const thisWeekAvg = avg(thisWeek);
  const lastWeekAvg = avg(lastWeek);
  const change = Math.round((thisWeekAvg - lastWeekAvg) * 10) / 10;
  const direction = change < 0 ? "down" : change > 0 ? "up" : "flat";

  return { thisWeekAvg, lastWeekAvg, change, direction, thisWeekCount: thisWeek.length, lastWeekCount: lastWeek.length };
}

/**
 * Generate a summary status key describing the user's recent weight trend.
 * Analyzes last 7 days of records to determine a status category.
 * Returns { status, changeKg, days, latestWt, avgWt }
 * status: "losing_fast" | "losing" | "stable" | "gaining" | "gaining_fast" | "insufficient"
 */
export function calcTrendSummary(records) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latestDt = sorted[sorted.length - 1].dt;
  const latestDate = new Date(latestDt + "T00:00:00");
  const cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;

  const recent = sorted.filter((r) => r.dt >= cutoffStr);
  if (recent.length < 2) {
    return { status: "insufficient", changeKg: 0, days: 0, latestWt: sorted[sorted.length - 1].wt, avgWt: sorted[sorted.length - 1].wt };
  }

  const first = recent[0].wt;
  const last = recent[recent.length - 1].wt;
  const changeKg = Math.round((last - first) * 10) / 10;
  const daySpan = Math.max(1, Math.round((new Date(recent[recent.length - 1].dt + "T00:00:00") - new Date(recent[0].dt + "T00:00:00")) / 86400000));
  const dailyRate = changeKg / daySpan;
  const avgWt = Math.round((recent.reduce((s, r) => s + r.wt, 0) / recent.length) * 10) / 10;

  let status;
  if (dailyRate <= -0.15) status = "losing_fast";
  else if (dailyRate < -0.03) status = "losing";
  else if (dailyRate <= 0.03) status = "stable";
  else if (dailyRate < 0.15) status = "gaining";
  else status = "gaining_fast";

  return { status, changeKg, days: daySpan, latestWt: last, avgWt };
}

/**
 * Detect tracking anniversary milestones.
 * Returns { totalDays, milestone, nextMilestone, nextMilestoneDays, firstDt, latestDt }
 * milestone is the most recent milestone reached (in days), or null if none.
 */
export function calcTrackingAnniversary(records) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const firstDt = sorted[0].dt;
  const latestDt = sorted[sorted.length - 1].dt;
  const first = new Date(firstDt + "T00:00:00");
  const latest = new Date(latestDt + "T00:00:00");
  const totalDays = Math.round((latest - first) / 86400000);

  const milestones = [7, 30, 60, 90, 180, 365, 730, 1095];
  let milestone = null;
  let nextMilestone = milestones[0];

  for (const m of milestones) {
    if (totalDays >= m) {
      milestone = m;
    } else {
      nextMilestone = m;
      break;
    }
  }

  if (totalDays >= milestones[milestones.length - 1]) {
    nextMilestone = null;
  }

  const nextMilestoneDays = nextMilestone != null ? nextMilestone - totalDays : null;

  return { totalDays, milestone, nextMilestone, nextMilestoneDays, firstDt, latestDt };
}

/**
 * Calculate weight change per month for the last N months.
 * Uses first and last reading of each month to compute the change.
 * Returns { months: [{ yearMonth, startWt, endWt, change }], bestMonth, worstMonth }
 */
export function calcMonthlyChange(records, numMonths = 3) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latestDate = new Date(sorted[sorted.length - 1].dt + "T00:00:00");

  const months = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthRecords = sorted.filter((r) => r.dt.startsWith(ym));
    if (monthRecords.length < 2) {
      months.push({ yearMonth: ym, startWt: null, endWt: null, change: null });
      continue;
    }
    const startWt = monthRecords[0].wt;
    const endWt = monthRecords[monthRecords.length - 1].wt;
    const change = Math.round((endWt - startWt) * 10) / 10;
    months.push({ yearMonth: ym, startWt, endWt, change });
  }

  const withChange = months.filter((m) => m.change !== null);
  const bestMonth = withChange.length > 0 ? withChange.reduce((a, b) => (a.change < b.change ? a : b)).yearMonth : null;
  const worstMonth = withChange.length > 0 ? withChange.reduce((a, b) => (a.change > b.change ? a : b)).yearMonth : null;

  return { months, bestMonth, worstMonth };
}

/**
 * Generate a text sparkline from the last N weight readings.
 * Uses Unicode block characters ▁▂▃▄▅▆▇█ to represent relative values.
 * Returns { sparkline, min, max, values }
 */
export function calcWeightSparkline(records, count = 10) {
  if (!records || records.length < 3) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const recent = sorted.slice(-count);
  const values = recent.map((r) => r.wt);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const bars = "▁▂▃▄▅▆▇█";

  const sparkline = values.map((v) => {
    if (range === 0) return bars[3];
    const idx = Math.min(7, Math.floor(((v - min) / range) * 7.99));
    return bars[idx];
  }).join("");

  return { sparkline, min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, values };
}

/**
 * Calculate data completeness: percentage of days with recordings in last N days.
 * Returns { recordedDays, totalDays, pct, grade }
 * grade: "A" (>=90%), "B" (>=70%), "C" (>=50%), "D" (>=30%), "F" (<30%)
 */
export function calcDataCompleteness(records, totalDays = 30) {
  if (!records || records.length === 0) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const latestDate = new Date(sorted[sorted.length - 1].dt + "T00:00:00");
  const cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - totalDays + 1);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;

  const uniqueDays = new Set(sorted.filter((r) => r.dt >= cutoffStr).map((r) => r.dt));
  const recordedDays = uniqueDays.size;
  const pct = Math.round((recordedDays / totalDays) * 100);

  let grade;
  if (pct >= 90) grade = "A";
  else if (pct >= 70) grade = "B";
  else if (pct >= 50) grade = "C";
  else if (pct >= 30) grade = "D";
  else grade = "F";

  return { recordedDays, totalDays, pct, grade };
}

/**
 * Track personal best (lowest weight) and how close current weight is.
 * Returns { allTimeLow, allTimeHigh, currentWt, isNewLow, isNewHigh, distFromLow, distFromHigh, lowDt, highDt }
 */
export function calcPersonalBest(records) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => a.dt.localeCompare(b.dt));
  const currentWt = sorted[sorted.length - 1].wt;

  let allTimeLow = Infinity;
  let allTimeHigh = -Infinity;
  let lowDt = "";
  let highDt = "";

  for (const r of sorted) {
    if (r.wt < allTimeLow) { allTimeLow = r.wt; lowDt = r.dt; }
    if (r.wt > allTimeHigh) { allTimeHigh = r.wt; highDt = r.dt; }
  }

  const isNewLow = currentWt <= allTimeLow;
  const isNewHigh = currentWt >= allTimeHigh;
  const distFromLow = Math.round((currentWt - allTimeLow) * 10) / 10;
  const distFromHigh = Math.round((allTimeHigh - currentWt) * 10) / 10;

  return { allTimeLow, allTimeHigh, currentWt, isNewLow, isNewHigh, distFromLow, distFromHigh, lowDt, highDt };
}

