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
  const latestBucket = buckets.findIndex((b) => latest >= b.start && latest < b.end) ?? buckets.length - 1;
  const modeBucket = buckets.reduce((best, b, i) => b.count > buckets[best].count ? i : best, 0);

  return {
    buckets,
    maxCount,
    latestBucket: latestBucket >= 0 ? latestBucket : buckets.length - 1,
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
  const first = bmis[0];
  const latest = bmis[bmis.length - 1];
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
    weight: { first: first.wt, latest: latest.wt, min, max, avg, totalChange },
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
