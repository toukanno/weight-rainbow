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
  const daySpan = Math.max(1, (new Date(recent[recent.length - 1].dt) - new Date(recent[0].dt)) / 86400000);
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
  const daySpan = (new Date(last.dt) - new Date(first.dt)) / 86400000;
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
    byMonth[key].push(r.wt);
  }
  const months = Object.keys(byMonth).sort().reverse();
  return months.map((key) => {
    const weights = byMonth[key];
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

  // Single-pass CSV parser handling quoted fields with newlines, commas, and escaped quotes
  const text = csvText.trim();
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

    if (!dt || !/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
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

    records.push({ dt, wt, bmi: Number.isFinite(bmi) ? bmi : null, bf: Number.isFinite(bf) ? bf : null, source: "import", note: note.slice(0, 100), createdAt: new Date().toISOString() });
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
  const sorted = [...dates].sort();
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
    mostCommon: most[0],
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
  if (/[,"\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportRecordsToCSV(records) {
  if (!records.length) return "";
  const header = "date,weight,bmi,bodyFat,source,note";
  const rows = records.map((r) =>
    [r.dt, r.wt, r.bmi ?? "", r.bf ?? "", r.source ?? "", r.note ?? ""].map(csvEscape).join(",")
  );
  return [header, ...rows].join("\n");
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
    if (data.count < 2) continue;
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
