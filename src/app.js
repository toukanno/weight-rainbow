import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import {
  STORAGE_KEYS,
  MAX_RECORDS,
  buildRecord,
  calcStats,
  calcDailyDiff,
  calcWeightComparison,
  calcGoalProgress,
  calcGoalPrediction,
  calcPeriodSummary,
  calcStreak,
  calcWeightTrend,
  calcAchievements,
  createDefaultProfile,
  createDefaultSettings,
  extractWeightCandidates,
  getBMIStatus,
  calcBMIZoneWeights,
  pickWeightCandidate,
  parseVoiceWeight,
  trimRecords,
  upsertRecord,
  validateProfile,
  validateBodyFat,
  validateWeight,
  normalizeNumericInput,
  THEME_LIST,
  buildCalendarMonth,
  calcWeeklyRate,
  calcMonthlyStats,
  filterRecords,
  calcInsight,
  NOTE_TAGS,
  toggleNoteTag,
  filterRecordsByDateRange,
  calcSourceBreakdown,
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
} from "./logic.js";
import { createTranslator } from "./i18n.js";
import { NativeSpeechRecognition } from "./native-speech.js";
import * as XLSX from "xlsx";

const app = document.getElementById("app");
const APP_VERSION = "1.0.0";

// Inline HTML escape for error handlers (escapeAttr may not be available yet)
function escHtml(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// Global error handler to prevent white screen
window.onerror = function(msg, src, line, col, err) {
  console.error("[WeightRainbow] Uncaught error:", msg, "at", src, line, col, err);
  if (app && !app.innerHTML.trim()) {
    app.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:system-ui;">
      <h2 style="color:#dc2626;">エラーが発生しました / An error occurred</h2>
      <p style="color:#666;margin:12px 0;">${escHtml(msg)}</p>
      <p style="color:#999;font-size:0.8rem;">Line ${line}:${col}</p>
      <button type="button" onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border-radius:8px;border:none;background:#ff5f6d;color:#fff;font-size:1rem;">再読み込み / Reload</button>
    </div>`;
  }
};
window.addEventListener("unhandledrejection", function(e) {
  console.error("[WeightRainbow] Unhandled rejection:", e.reason);
});
const isNativePlatform = Capacitor.isNativePlatform();
const BrowserSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const supportsSpeech = isNativePlatform || Boolean(BrowserSpeechRecognition);
const supportsTextDetection = "TextDetector" in window;
// supportsTextDetection controls OCR availability

let state = loadState();
let t = createTranslator(state.settings.language);
let recognition = null;
let nativeSpeechListenersReady = false;
let voiceActive = false;
let voiceTranscript = "";
let imagePreviewUrl = "";
let detectedWeights = [];
let activeEntryMode = "manual";
let statusMessage = "";
let statusKind = "ok";
let showAllRecords = false;
let quickWeight = 65.0;
let rainbowVisible = false;
let _rainbowDismissTimer = 0;
let rainbowDetail = "";
let summaryPeriod = "week";
let chartPeriod = "all"; // "7", "30", "90", "all"
let reminderTimer = null;
let lastNotifiedDate = "";
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let showMonthlyStats = false;
let showAdvancedAnalytics = false;
let recordSearchQuery = "";
let recordDateFrom = "";
let recordDateTo = "";
let searchDebounceTimer = null;

// Initialize quick weight from last record
{
  const lastRecord = state.records[state.records.length - 1];
  if (lastRecord) quickWeight = lastRecord.wt;
}

// First-launch language selection
try {
  if (!window.localStorage.getItem(STORAGE_KEYS.firstLaunchDone)) {
    showFirstLaunchModal();
  } else {
    render();
  }
} catch (e) {
  console.error("[WeightRainbow] Init error:", e);
  app.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:system-ui;">
    <h2 style="color:#dc2626;">${t("error.init")}</h2>
    <p style="color:#666;margin:12px 0;">${escHtml(e.message)}</p>
    <button type="button" onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border-radius:8px;border:none;background:#ff5f6d;color:#fff;font-size:1rem;">${t("error.reload")}</button>
    <button type="button" onclick="if(confirm('${escHtml(t("error.resetConfirm"))}')){localStorage.clear();location.reload()}" style="margin-top:8px;padding:8px 24px;border-radius:8px;border:1px solid #ccc;background:#fff;color:#333;font-size:1rem;">${t("error.resetData")}</button>
  </div>`;
}

// Initialize reminder system
initReminder();

// Auto dark mode: listen for system theme changes
function applySystemTheme() {
  if (!window.matchMedia) return;
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (state.settings.autoTheme) {
    if (!state.settings._savedTheme) state.settings._savedTheme = state.settings.theme;
    state.settings.theme = isDark ? "midnight" : (state.settings._savedTheme || "prism");
    document.body.dataset.theme = state.settings.theme;
  }
}
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.settings.autoTheme) { applySystemTheme(); render(); }
  });
  applySystemTheme();
}

function sanitizeProfile(p) {
  const defaults = createDefaultProfile();
  const hc = String(p.heightCm ?? "");
  const ag = String(p.age ?? "");
  return {
    name: typeof p.name === "string" ? p.name.slice(0, 50) : defaults.name,
    heightCm: hc === "" || (Number.isFinite(Number(hc)) && Number(hc) >= 50 && Number(hc) <= 300) ? hc : defaults.heightCm,
    age: ag === "" || (Number.isFinite(Number(ag)) && Number(ag) >= 1 && Number(ag) <= 150) ? ag : defaults.age,
    gender: ["male", "female", "nonbinary", "other", "unspecified", ""].includes(p.gender) ? p.gender : defaults.gender,
  };
}

function loadState() {
  const rawRecords = safeParse(STORAGE_KEYS.records, []);
  const records = Array.isArray(rawRecords)
    ? rawRecords.filter((r) => r && r.dt && Number.isFinite(r.wt))
    : [];
  const sorted = [...records].sort((a, b) => (a.dt > b.dt ? -1 : a.dt < b.dt ? 1 : 0));
  const lastWeight = sorted.length > 0 ? sorted[0].wt : 65;
  return {
    records,
    profile: sanitizeProfile({ ...createDefaultProfile(), ...safeParse(STORAGE_KEYS.profile, {}) }),
    settings: { ...createDefaultSettings(), ...safeParse(STORAGE_KEYS.settings, {}) },
    form: {
      weight: "",
      date: todayLocal(),
      imageName: "",
      pickerInt: Math.floor(lastWeight),
      pickerDec: Math.round((lastWeight - Math.floor(lastWeight)) * 10),
      bodyFat: "",
      note: "",
    },
  };
}

function safeParse(key, fallback) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(state.records));
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(state.profile));
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      setStatus(t("error.storageQuota"), "error");
    } else {
      console.error("[persist] storage error:", e?.name, e?.message);
      setStatus(t("status.storageError"), "error");
    }
    return false;
  }
}

function showFirstLaunchModal() {
  document.body.dataset.theme = "prism";
  app.innerHTML = `
    <div class="lang-modal-overlay">
      <div class="lang-modal" role="dialog" aria-modal="true" aria-labelledby="langModalTitle">
        <div style="font-size:2.4rem;margin-bottom:8px;" aria-hidden="true">🌈</div>
        <h2 id="langModalTitle">ようこそ / Welcome</h2>
        <p>言語を選択してください<br>Choose your language</p>
        <div class="lang-modal-buttons">
          <button type="button" data-lang="ja" aria-label="日本語を選択">🇯🇵 日本語</button>
          <button type="button" data-lang="en" aria-label="Select English">🇬🇧 English</button>
        </div>
      </div>
    </div>
  `;
  app.querySelector("[data-lang]")?.focus();
  const selectLang = (lang) => {
    state.settings.language = lang;
    t = createTranslator(lang);
    try {
      window.localStorage.setItem(STORAGE_KEYS.firstLaunchDone, "1");
    } catch { /* ignore */ }
    persist();
    render();
  };
  app.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => selectLang(button.dataset.lang));
  });
  const overlay = app.querySelector(".lang-modal-overlay");
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) selectLang("ja");
  });
  document.addEventListener("keydown", function onEsc(e) {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", onEsc);
      selectLang("ja");
    }
  });
}

let statusClearTimer = null;
let statusFadeTimer = null;
function setStatus(message, kind = "ok") {
  statusMessage = message;
  statusKind = kind;
  clearTimeout(statusClearTimer);
  clearTimeout(statusFadeTimer);
  if (kind === "ok" && message) {
    statusFadeTimer = setTimeout(() => {
      const el = app.querySelector(".status");
      if (el) el.classList.add("status-fade-out");
    }, 4000);
    statusClearTimer = setTimeout(() => {
      statusMessage = "";
      render();
    }, 4600);
  }
  render();
}

function updateLanguage(language) {
  state.settings.language = language;
  t = createTranslator(language);
  persist();
  render();
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatWeight(weight) {
  return `${Number(weight).toFixed(1)}kg`;
}

function formatBMI(bmi) {
  return bmi ? bmi.toFixed(1) : t("chart.none");
}

function formatNote(note) {
  return escHtml(note).replace(/#([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F]+)/g, '<span class="note-hashtag">#$1</span>');
}

function getMotivationalMessage(streak, trend, records, goalProgress) {
  if (records.length === 1) return t("motivation.firstRecord");
  if (goalProgress && goalProgress.remaining > 0 && goalProgress.remaining <= 2) return t("motivation.goalClose");
  if (records.length >= 2) {
    const weights = records.map((r) => r.wt);
    const latest = weights[weights.length - 1];
    const allTimeMin = Math.min(...weights.slice(0, -1));
    if (latest < allTimeMin) return t("motivation.newRecord");
  }
  if (streak >= 30) return t("motivation.streak30");
  if (streak >= 14) return t("motivation.streak14");
  if (streak >= 7) return t("motivation.streak7");
  if (streak >= 3) return t("motivation.streak3");
  if (trend === "down") return t("motivation.trendDown");
  return "";
}

let _renderRAF = 0;
function scheduleRender() {
  if (!_renderRAF) {
    _renderRAF = requestAnimationFrame(() => { _renderRAF = 0; render(); });
  }
}

function render() {
  try {
  const scrollY = window.scrollY;
  document.documentElement.lang = state.settings.language;
  document.title = t("app.title");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t("app.description"));
  document.body.dataset.theme = state.settings.theme;
  // Update browser theme-color to match current theme accent (deferred to ensure CSS applied)
  requestAnimationFrame(() => {
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim();
      if (accent) themeColor.setAttribute("content", accent);
    }
  });

  const stats = calcStats(state.records, state.profile);
  const dailyDiff = calcDailyDiff(state.records);
  const weightComp = calcWeightComparison(state.records);
  const goalWeight = Number(state.settings.goalWeight);
  const goalProgress = calcGoalProgress(state.records, goalWeight);
  const goalPrediction = calcGoalPrediction(state.records, goalWeight);
  const goalMilestones = calcGoalMilestones(state.records, goalWeight);
  const periodDays = summaryPeriod === "week" ? 7 : 30;
  const periodSummary = calcPeriodSummary(state.records, periodDays);
  const streak = calcStreak(state.records);
  const trend = calcWeightTrend(state.records);
  const weeklyRate = calcWeeklyRate(state.records);
  const bmiStatus = stats?.latestBMI ? t(getBMIStatus(stats.latestBMI)) : t("bmi.unknown");
  const motivation = getMotivationalMessage(streak, trend, state.records, goalProgress);
  const achievements = calcAchievements(state.records, streak, goalWeight);
  const insight = calcInsight(state.records);
  const daysSinceLast = calcDaysSinceLastRecord(state.records);
  const longestStreak = calcLongestStreak(state.records);
  const smoothedWeight = calcSmoothedWeight(state.records);
  const previewWeightResult = validateWeight(state.form.weight);
  const currentBMI = previewWeightResult.valid && state.profile.heightCm
    ? buildRecord({
        date: state.form.date || todayLocal(),
        weight: previewWeightResult.weight,
        profile: state.profile,
        source: activeEntryMode,
        imageName: state.form.imageName,
      }).bmi
    : null;

  // Weight change preview
  const lastRecord = state.records[state.records.length - 1];
  const previewDiff = previewWeightResult.valid && lastRecord
    ? Math.round((previewWeightResult.weight - lastRecord.wt) * 10) / 10
    : null;
  const previewLarge = previewDiff !== null && Math.abs(previewDiff) >= 2;

  // Search filter count (computed once, used in both header and record list)
  const filteredBySearch = recordSearchQuery ? filterRecords(state.records, recordSearchQuery) : state.records;
  const filteredSearchCount = filteredBySearch.length;

  // Duplicate date warning
  const selectedDate = state.form.date || todayLocal();
  const existingRecord = state.records.find((r) => r.dt === selectedDate);

  app.innerHTML = `
    <a href="#entrySection" class="skip-link">${t("a11y.skipToEntry")}</a>
    <main class="app-shell">
      <section class="hero">
        <div class="hero-top">
          <div>
            <div class="eyebrow">${t("status.ready")}</div>
            <h1>${t("app.title")}</h1>
            <p class="hero-copy">${t("app.subtitle")}</p>
            <p class="hero-copy">${t("hero.copy")}</p>
            <div class="pill-row">
              <span class="pill">${t("badge.local")}</span>
              <span class="pill">${t("badge.free")}</span>
              <span class="pill">${t("badge.safe")}</span>
              ${state.records.length ? `<span class="pill">${t("summary.count")}: ${state.records.length}</span>` : ""}
              ${streak > 0 ? `<span class="streak-badge${streak >= 7 ? " rainbow" : ""}" title="${t("streak.title")}">${streak >= 7 ? "🌈" : "🔥"} ${streak}${t("streak.days")} ${streak >= 7 ? t("streak.fire") : ""}</span>` : ""}
              ${trend ? `<span class="trend-indicator ${trend}">${trend === "down" ? "📉" : trend === "up" ? "📈" : "➡️"} ${t("trend." + trend)}</span>` : ""}
            </div>
            ${daysSinceLast !== null ? `<div class="freshness-indicator${daysSinceLast === 0 ? " fresh" : daysSinceLast >= 3 ? " stale" : ""}">
              ${daysSinceLast === 0 ? t("freshness.today") : daysSinceLast === 1 ? t("freshness.yesterday") : t("freshness.days").replace("{days}", daysSinceLast)}
              ${daysSinceLast >= 1 ? ` <span class="freshness-nudge">${t("freshness.nudge")}</span>` : ""}
            </div>` : ""}
            ${longestStreak >= 3 && longestStreak > streak ? `<div class="helper hint-small">${t("streak.longest").replace("{days}", longestStreak)}</div>` : ""}
            ${motivation ? `<p class="motivation-msg">${motivation}</p>` : ""}
            ${achievements.length ? `<div class="achievement-row">${achievements.map((a) => `<span class="achievement-badge ${a.tier}" title="${t("achievement." + a.id)}" aria-label="${escapeAttr(t("achievement." + a.id))}">${a.icon}</span>`).join("")}</div>` : ""}
          </div>
          <div class="hero-card">
            <div class="eyebrow">${t("bmi.title")}</div>
            <div class="bmi-score">${stats?.latestBMI ? stats.latestBMI.toFixed(1) : "--"}</div>
            <p class="bmi-label">${bmiStatus}</p>
            <p class="bmi-label">${t("hero.disclaimer")}</p>
          </div>
        </div>
        <div class="hero-bottom">
          ${renderMetric(t("chart.latest"), stats ? formatWeight(stats.latestWeight) : "--")}
          ${renderMetric(t("chart.change"), stats ? signedWeight(stats.change) : "--")}
          ${renderMetric(t("chart.avg"), stats ? formatWeight(stats.avgWeight) : "--")}
          ${renderMetric(t("chart.bmi"), stats?.latestBMI ? stats.latestBMI.toFixed(1) : "--")}
          ${smoothedWeight ? renderMetric(t("smoothed.value"), `${formatWeight(smoothedWeight.smoothed)} <span class="${smoothedWeight.trend < 0 ? "negative" : smoothedWeight.trend > 0 ? "positive" : ""}" style="font-size:0.7em">${smoothedWeight.trend > 0 ? "+" : ""}${smoothedWeight.trend.toFixed(1)}</span>`) : ""}
        </div>

        <!-- Daily Diff & Goal Progress -->
        <div class="hero-bottom hero-sub-2col">
          <div class="diff-box">
            <div class="label">${t("diff.title")}</div>
            ${dailyDiff
              ? `<div class="diff-value ${dailyDiff.diff > 0 ? "positive" : dailyDiff.diff < 0 ? "negative" : "zero"}">
                  ${dailyDiff.diff > 0 ? "+" : ""}${dailyDiff.diff.toFixed(1)} kg
                </div>
                <div class="diff-detail">
                  ${t("diff.yesterday")}: ${dailyDiff.yesterday.toFixed(1)}kg → ${t("diff.today")}: ${dailyDiff.today.toFixed(1)}kg
                  (${dailyDiff.diff > 0 ? t("diff.up") : dailyDiff.diff < 0 ? t("diff.down") : t("diff.same")})
                </div>`
              : `<div class="diff-value zero">--</div>
                <div class="diff-detail">${t("diff.noData")}</div>`}
          </div>
          <div class="goal-box">
            <div class="label">${t("goal.title")}: ${Number.isFinite(goalWeight) ? formatWeight(goalWeight) : t("goal.notSet")}</div>
            ${goalProgress
              ? `<div class="progress-percent">${goalProgress.percent}%</div>
                <div class="progress-bar-track" role="progressbar" aria-valuenow="${goalProgress.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="${t("goal.title")}">
                  <div class="progress-bar-fill" style="width: ${goalProgress.percent}%"></div>
                  ${goalMilestones ? goalMilestones.filter((m) => m.pct < 100).map((m) => `<div class="goal-milestone-marker${m.reached ? " reached" : ""}" style="left:${m.pct}%" title="${t("goal.milestone").replace("{pct}", m.pct)}"></div>`).join("") : ""}
                </div>
                <div class="progress-text">
                  <span>${t("goal.progress")}</span>
                  <span>${goalProgress.remaining <= 0 ? t("goal.achieved") : `${t("goal.remaining")}: ${goalProgress.remaining.toFixed(1)}kg`}</span>
                </div>
                ${goalMilestones ? `<div class="goal-milestones">${goalMilestones.map((m) => `<span class="goal-ms${m.reached ? " reached" : ""}">${m.reached ? "✅" : "⬜"} ${t("goal.milestone").replace("{pct}", m.pct)} <span class="hint-small">(${m.targetWeight}kg)</span></span>`).join("")}</div>` : ""}
                ${goalPrediction ? `<div class="prediction-text">${t("goal.prediction")}: ${
                  goalPrediction.achieved ? t("goal.predictionAchieved")
                  : goalPrediction.insufficient ? t("goal.predictionInsufficient")
                  : goalPrediction.noTrend ? t("goal.predictionNoTrend")
                  : `${t("goal.predictionDays").replace("{days}", goalPrediction.days)} (${goalPrediction.predictedDate})`
                }</div>` : ""}`
              : `<div class="diff-value zero">--</div>
                <div class="diff-detail">${t("goal.notSet")}</div>`}
          </div>
        </div>
        ${weightComp ? `
        <div class="hero-bottom hero-sub-3col">
          ${["week", "month", "quarter"].map((key) => {
            const c = weightComp[key];
            if (!c) return `<div class="diff-box"><div class="label">${t("compare." + key)}</div><div class="diff-value zero compact">--</div></div>`;
            const cls = c.diff > 0 ? "positive" : c.diff < 0 ? "negative" : "zero";
            return `<div class="diff-box"><div class="label">${t("compare." + key)}</div><div class="diff-value ${cls} compact">${c.diff > 0 ? "+" : ""}${c.diff.toFixed(1)}kg</div></div>`;
          }).join("")}
        </div>` : ""}
      </section>

      ${renderAICoach()}

      <div class="content-grid">
        <div class="column">
          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("section.profile")}</h2>
                <p>${t("profile.helper")}</p>
              </div>
              <button type="button" class="btn secondary" data-action="save-profile">${t("profile.save")}</button>
            </div>
            <div class="input-grid">
              <div class="field">
                <label for="name">${t("profile.name")}</label>
                <input id="name" name="name" maxlength="40" autocomplete="name" value="${escapeAttr(state.profile.name)}" />
              </div>
              <div class="field">
                <label for="gender">${t("profile.gender")}</label>
                <select id="gender" name="gender">
                  ${renderOption("female", state.profile.gender, t("gender.female"))}
                  ${renderOption("male", state.profile.gender, t("gender.male"))}
                  ${renderOption("nonbinary", state.profile.gender, t("gender.nonbinary"))}
                  ${renderOption("unspecified", state.profile.gender, t("gender.unspecified"))}
                </select>
              </div>
              <div class="field">
                <label for="heightCm">${t("profile.height")}</label>
                <input id="heightCm" name="heightCm" inputmode="decimal" autocomplete="off" value="${escapeAttr(state.profile.heightCm)}" />
              </div>
              <div class="field">
                <label for="age">${t("profile.age")}</label>
                <input id="age" name="age" inputmode="numeric" autocomplete="off" value="${escapeAttr(state.profile.age)}" />
              </div>
            </div>
          </section>

          <section class="panel" id="entrySection">
            <div class="section-header">
              <div>
                <h2>${t("section.entry")}</h2>
                <p>${t("review.permissions")}</p>
              </div>
              <div class="eyebrow">${t(`entry.source.${activeEntryMode}`)}</div>
            </div>

            <div class="tab-row" role="tablist" aria-label="${t("section.entry")}">
              ${renderTab("manual", "✏️ " + t("entry.manual"))}
              ${renderTab("voice", "🎤 " + t("entry.voice"))}
              ${renderTab("photo", "📷 " + t("entry.photo"))}
            </div>

            <div class="entry-layout">
              <div class="input-grid">
                <div class="field">
                  <label>${t("entry.weight")}</label>
                  <div class="weight-picker">
                    <select id="pickerInt" name="pickerInt" aria-label="${t("picker.integer")}">
                      ${renderPickerIntOptions(state.form.pickerInt)}
                    </select>
                    <span class="picker-dot" aria-hidden="true">.</span>
                    <select id="pickerDec" name="pickerDec" aria-label="${t("picker.decimal")}">
                      ${renderPickerDecOptions(state.form.pickerDec)}
                    </select>
                    <span class="picker-unit">${t("picker.kg")}</span>
                  </div>
                  ${(() => {
                    const presets = calcQuickWeightPresets(state.records);
                    if (presets.length === 0) return "";
                    return `<div class="weight-presets">${presets.map((p) => `<button type="button" class="weight-preset-btn" data-pick-weight="${p.weight}" title="${t("preset." + p.label)}">${t("preset." + p.label)} ${p.weight}kg</button>`).join("")}</div>`;
                  })()}
                </div>
                <div class="field">
                  <label for="recordDate">${t("entry.date")}</label>
                  <input id="recordDate" name="date" type="date" value="${escapeAttr(state.form.date)}" min="2000-01-01" max="${todayLocal()}" autocomplete="off" />
                  <div class="date-shortcuts">
                    <button type="button" class="date-shortcut" data-date-shortcut="today">${t("diff.today")}</button>
                    <button type="button" class="date-shortcut" data-date-shortcut="yesterday">${t("diff.yesterday")}</button>
                  </div>
                </div>
                <div class="field">
                  <label for="bodyFat">${t("bodyFat.label")}</label>
                  <input id="bodyFat" name="bodyFat" inputmode="decimal" autocomplete="off" placeholder="${escapeAttr(t("bodyFat.hint"))}" value="${escapeAttr(state.form.bodyFat)}" />
                </div>
              </div>
              <div class="field">
                <label for="entryNote">${t("entry.note")}</label>
                <input id="entryNote" name="note" type="text" maxlength="100" autocomplete="off" placeholder="${escapeAttr(t("entry.noteHint"))}" value="${escapeAttr(state.form.note)}" />
                ${(state.form.note || "").length > 50 ? `<div class="hint-small" style="text-align:right;">${(state.form.note || "").length}/100</div>` : ""}
                <div class="note-tags-row" role="group" aria-label="${t("note.tags")}">
                  ${NOTE_TAGS.map((tag) => {
                    const active = (state.form.note || "").includes(`#${tag}`);
                    return `<button type="button" class="note-tag${active ? " active" : ""}" data-note-tag="${tag}">${t("note.tag." + tag)}</button>`;
                  }).join("")}
                </div>
                ${(() => {
                  const freq = getFrequentNotes(state.records, 4);
                  if (freq.length === 0) return "";
                  return `<div class="quick-notes-row">
                    <span class="quick-notes-label">${t("quickNote.label")}:</span>
                    ${freq.map((n) => `<button type="button" class="quick-note-chip" data-quick-note="${escapeAttr(n.text)}">${escapeAttr(n.text.length > 15 ? n.text.slice(0, 15) + "…" : n.text)}</button>`).join("")}
                  </div>`;
                })()}
              </div>

              <!-- Quick Record Section -->
              <div class="quick-section">
                <h3>${t("quick.title")}</h3>
                <p class="helper">${t("quick.hint")}</p>
                <div class="quick-display" id="quickDisplay">${quickWeight.toFixed(1)} kg</div>
                <div class="quick-buttons" role="group" aria-label="${t("quick.title")}">
                  <button type="button" data-quick-adj="-1.0" aria-label="-1.0 kg">-1.0</button>
                  <button type="button" data-quick-adj="-0.5" aria-label="-0.5 kg">-0.5</button>
                  <button type="button" data-quick-adj="-0.1" aria-label="-0.1 kg">-0.1</button>
                  <button type="button" data-quick-adj="+0.1" aria-label="+0.1 kg">+0.1</button>
                  <button type="button" data-quick-adj="+0.5" aria-label="+0.5 kg">+0.5</button>
                  <button type="button" data-quick-adj="+1.0" aria-label="+1.0 kg">+1.0</button>
                </div>
                <div class="quick-buttons" style="margin-top:10px;">
                  <button type="button" class="quick-save" data-action="quick-save" aria-label="${t("quick.save")}">${t("quick.save")}</button>
                </div>
              </div>

              <div class="voice-box ${activeEntryMode === "voice" ? "" : "hidden"}">
                <h3>${t("entry.voice")}</h3>
                <p>${supportsSpeech ? t("entry.voiceHint") : t("entry.voiceUnsupported")}</p>
                <div class="row" style="margin-top: 12px;">
                  <button type="button" class="btn secondary" data-action="toggle-voice" ${supportsSpeech ? "" : "disabled"}>
                    ${voiceActive ? t("entry.voiceStop") : t("entry.voiceStart")}
                  </button>
                  ${voiceActive ? `<span class="voice-active-indicator">${t("status.listening")}</span>` : ""}
                </div>
                <div class="voice-transcript">${voiceTranscript || t("entry.lastVoice")}</div>
              </div>

              <div class="photo-box ${activeEntryMode === "photo" ? "" : "hidden"}">
                <h3>${t("entry.photo")}</h3>
                <p>${t("entry.photoHint")}</p>
                <div class="row" style="margin-top: 12px;">
                  ${isNativePlatform
                    ? `<button type="button" class="btn secondary" data-action="pick-native-photo">${t("entry.photoSelect")}</button>`
                    : `<label class="btn secondary" for="photoInput">${t("entry.photoSelect")}</label>
                  <input id="photoInput" type="file" accept="image/*" capture="environment" class="hidden" />`}
                </div>
                ${imagePreviewUrl ? `
                  <img class="photo-preview" src="${imagePreviewUrl}" alt="${t("entry.photoPreview")}" data-action="zoom-photo" role="button" tabindex="0" aria-label="${t("photo.zoomHint")}" />
                  <p class="helper hint-small" style="margin-top: 4px; text-align: center;">${t("photo.zoomHint")}</p>
                  ${!supportsTextDetection && !detectedWeights.length ? `<p class="helper" style="margin-top: 8px; text-align: center;">${t("photo.manualHint")}</p>` : ""}
                ` : ""}
                ${detectedWeights.length ? `<div style="margin-top: 12px;"><div class="helper">${t("entry.photoDetected")}</div><div class="chip-row" style="margin-top: 8px;">${detectedWeights.map((weight) => `<button type="button" class="chip" data-pick-weight="${weight}" aria-label="${formatWeight(weight)} kg">${formatWeight(weight)}</button>`).join("")}</div></div>` : ""}
                ${!supportsTextDetection && !imagePreviewUrl ? `<span class="helper">${t("entry.photoFallback")}</span>` : ""}
              </div>

              ${previewDiff !== null ? `<div class="entry-preview">
                <span class="entry-preview-diff ${previewDiff < 0 ? "negative" : previewDiff > 0 ? "positive" : "zero"}">${previewDiff > 0 ? "+" : ""}${previewDiff.toFixed(1)}kg ${t("entry.preview.vsLast")}</span>
                ${previewLarge ? `<span class="entry-preview-warn">${t("entry.preview.large")}</span>` : ""}
              </div>` : ""}
              ${existingRecord ? `<div class="duplicate-warn">
                <span>${t("entry.duplicate.warn")} ${existingRecord.wt.toFixed(1)}kg</span>
                <span class="hint-small">${t("entry.duplicate.overwrite")}</span>
              </div>` : ""}
              <div class="row">
                <button type="button" class="btn" data-action="save-record">${t("entry.save")}</button>
                <div>
                  <div class="helper">${state.profile.heightCm ? `${t("entry.bmiReady")}: ${formatBMI(currentBMI)}` : t("bmi.unknown")}</div>
                  <div class="helper hint-small">${t("record.dailyLimit")}</div>
                  <div class="helper hint-small desktop-only">⌘+Enter</div>
                </div>
              </div>
              <div class="validate-warnings" role="alert" aria-live="assertive" style="display:none"></div>
            </div>

            <div class="status ${statusKind === "error" ? "warn" : ""}" role="status" aria-live="polite">
              ${escapeAttr(statusMessage)}
              ${lastUndoState ? `<button type="button" class="undo-btn" data-action="undo">${t("undo.button")}</button>` : ""}
            </div>
          </section>

          ${renderRecentEntries()}

          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("section.chart")}</h2>
                <p>${stats?.latestDate ?? t("chart.empty")}</p>
              </div>
              ${state.records.length ? `<button type="button" class="btn secondary" data-action="share-chart">${t("share.chart")}</button>` : ""}
            </div>
            <div class="summary-tabs" style="margin-bottom:10px;" role="tablist" aria-label="${t("section.chart")}">
              <button type="button" class="summary-tab ${chartPeriod === "7" ? "active" : ""}" data-chart-period="7" role="tab" aria-selected="${chartPeriod === "7"}">${t("chart.period.7")}</button>
              <button type="button" class="summary-tab ${chartPeriod === "30" ? "active" : ""}" data-chart-period="30" role="tab" aria-selected="${chartPeriod === "30"}">${t("chart.period.30")}</button>
              <button type="button" class="summary-tab ${chartPeriod === "90" ? "active" : ""}" data-chart-period="90" role="tab" aria-selected="${chartPeriod === "90"}">${t("chart.period.90")}</button>
              <button type="button" class="summary-tab ${chartPeriod === "all" ? "active" : ""}" data-chart-period="all" role="tab" aria-selected="${chartPeriod === "all"}">${t("chart.period.all")}</button>
            </div>
            <canvas id="chart" width="960" height="${state.settings.chartStyle === "compact" ? 220 : 320}" role="img" aria-label="${t("section.chart")}${stats ? ` — ${stats.latestWeight.toFixed(1)}kg, ${t("chart.change")}: ${stats.change > 0 ? "+" : ""}${stats.change.toFixed(1)}kg, ${state.records.length} ${t("chart.records")}` : ""}"></canvas>
            <div id="chartTooltip" class="chart-tooltip" role="tooltip" aria-live="polite" style="display:none;"></div>
            ${state.records.length >= 3 ? `<div class="chart-legend">
              <span class="chart-legend-item"><span class="chart-legend-line gradient"></span>${t("chart.legend.weight")}</span>
              <span class="chart-legend-item"><span class="chart-legend-line dashed accent3"></span>${t("chart.legend.movingAvg")}</span>
              ${Number.isFinite(goalWeight) ? `<span class="chart-legend-item"><span class="chart-legend-line dashed ok"></span>${t("chart.legend.goal")}</span>` : ""}
              <span class="chart-legend-item"><span class="chart-legend-line dashed accent2"></span>${t("chart.legend.forecast")}</span>
            </div>` : ""}
            ${state.profile.heightCm ? `<div class="hint-small" style="margin-top:4px;">${t("chart.bmiZones")}</div>` : ""}
            <div class="stat-grid">
              ${renderStat(t("chart.latest"), stats ? formatWeight(stats.latestWeight) : "--")}
              ${renderStat(t("chart.min"), stats ? formatWeight(stats.minWeight) : "--")}
              ${renderStat(t("chart.max"), stats ? formatWeight(stats.maxWeight) : "--")}
              ${renderStat(t("chart.avg"), stats ? formatWeight(stats.avgWeight) : "--")}
            </div>
          </section>

          <!-- Summary Panel -->
          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("summary.title")}</h2>
              </div>
            </div>
            <div class="summary-tabs" role="tablist" aria-label="${t("summary.title")}">
              <button type="button" class="summary-tab ${summaryPeriod === "week" ? "active" : ""}" data-summary="week" role="tab" aria-selected="${summaryPeriod === "week"}">${t("summary.week")}</button>
              <button type="button" class="summary-tab ${summaryPeriod === "month" ? "active" : ""}" data-summary="month" role="tab" aria-selected="${summaryPeriod === "month"}">${t("summary.month")}</button>
            </div>
            ${periodSummary
              ? `<div class="stat-grid">
                  ${renderStat(t("summary.avg"), formatWeight(periodSummary.avg))}
                  ${renderStat(t("summary.min"), formatWeight(periodSummary.min))}
                  ${renderStat(t("summary.max"), formatWeight(periodSummary.max))}
                  ${renderStat(t("summary.change"), signedWeight(periodSummary.change))}
                </div>
                <div class="helper" style="margin-top: 10px;">${t("summary.count")}: ${periodSummary.count}</div>`
              : `<div class="helper">${t("summary.noData")}</div>`}
            <div class="rate-box">
              <div class="label">${t("rate.title")}</div>
              ${weeklyRate
                ? `<div class="rate-value ${weeklyRate.weeklyRate < 0 ? "loss" : weeklyRate.weeklyRate > 0 ? "gain" : "neutral"}">${weeklyRate.weeklyRate > 0 ? "+" : ""}${t("rate.value").replace("{rate}", weeklyRate.weeklyRate.toFixed(2))}</div>
                  <div class="helper">${t("rate.period").replace("{days}", weeklyRate.totalDays).replace("{change}", (weeklyRate.totalChange > 0 ? "+" : "") + weeklyRate.totalChange.toFixed(1))}</div>`
                : `<div class="helper">${t("rate.insufficient")}</div>`}
            </div>
            ${insight ? `<div class="insight-box">
              <div class="helper">${t("insight.bestDay").replace("{day}", t("day." + insight.bestDay))}</div>
              ${insight.weekComparison !== null ? `<div class="helper">${
                insight.weekComparison > 0.05 ? t("insight.weekUp").replace("{diff}", insight.weekComparison.toFixed(1))
                : insight.weekComparison < -0.05 ? t("insight.weekDown").replace("{diff}", insight.weekComparison.toFixed(1))
                : t("insight.weekSame")
              }</div>` : ""}
            </div>` : ""}
            ${renderDashboard()}
            ${renderDataFreshness()}
            ${renderRecordMilestone()}
            ${renderTrendIndicator()}
            ${renderMomentumScore()}
            ${renderStreakRewards()}
            ${renderGoalCountdown()}
            ${renderGoalScenarios()}
            ${renderNextMilestones()}
            ${renderDayOfWeekAvg()}
            ${renderStability()}
            ${renderBMIDistribution()}
            ${renderIdealWeight()}
            ${renderWeightVelocity()}
            ${renderMultiPeriodRate()}
            ${renderCalorieEstimate()}
            ${renderWeightConfidence()}
            ${renderBodyFatStats()}
            ${renderWeeklyAverages()}
            ${renderRecordingCalendar()}
            ${renderLongTermProgress()}
            ${renderWeightFluctuation()}
            ${renderSuccessRate()}
            ${renderRecordingRate()}
            ${renderStreakCalendar()}
            ${renderConsistencyScore()}
            ${renderWeightRangeSummary()}
            ${renderTrendStreak()}
            ${renderBMITrend()}
            ${renderBodyFatTrend()}
            ${renderWeeklySummaryComparison()}
            ${renderGoalProgressRing()}
            ${renderDailyTarget()}
            ${renderMonthPhaseAvg()}
            ${renderStreakFreeze()}
            ${renderRecentWeightBars()}
            ${renderWeightAnniversary()}
            ${renderTrendForecast()}
            ${renderGoalStreak()}
            ${renderThenVsNow()}
            ${renderWeightPace()}
            ${state.records.length >= 3 ? `
            <div class="analytics-toggle-section">
              <button type="button" class="btn ghost full-width-btn" data-action="toggle-analytics">
                ${showAdvancedAnalytics ? t("analytics.showLess") : t("analytics.showMore")}
              </button>
              ${showAdvancedAnalytics ? `
              <div class="advanced-analytics">
                ${renderWeekdayWeekend()}
                ${renderConsistencyStreak()}
                ${renderWeightPercentile()}
                ${renderMovingAverages()}
                ${renderWeightRange()}
                ${renderTagImpact()}
                ${renderBestPeriod()}
                ${renderWeeklyFrequency()}
                ${renderWeightVariance()}
                ${renderWeightPlateau()}
                ${renderRecordGaps()}
                ${renderSeasonality()}
                ${renderWeightDistribution()}
                ${renderDayOfWeekChange()}
                ${renderPersonalRecords()}
                ${renderWeightRegression()}
                ${renderBMIHistory()}
                ${renderWeightHeatmap()}
                ${renderProgressSummary()}
                ${renderMilestoneTimeline()}
                ${renderVolatilityIndex()}
                ${renderPeriodComparison()}
                ${renderBodyComposition()}
                ${renderShareSummary()}
                ${renderDuplicateCheck()}
                ${renderNoteTagStats()}
                ${renderWeightAnomalies()}
                ${renderMilestoneHistory()}
                ${renderWeightJourney()}
                ${renderMovingAvgCrossover()}
                ${renderPredictionAccuracy()}
                ${renderDailyChangeDist()}
                ${renderRecordCompleteness()}
              </div>
              ` : ""}
            </div>
            ` : ""}
          </section>

          <!-- Monthly Stats Panel -->
          ${renderMonthlyStats()}

          <!-- Monthly Averages Chart -->
          ${renderMonthlyAverages()}

          <!-- Calendar Panel -->
          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("calendar.title")}</h2>
                <p>${t("calendar.hint")}</p>
              </div>
            </div>
            ${renderCalendar()}
          </section>

          <!-- Records List Panel -->
          <section class="panel records-panel">
            <div class="section-header">
              <div>
                <h2>${t("section.records")}</h2>
                <p>${state.records.length} ${t("chart.records")}</p>
              </div>
              ${state.records.length > 5 ? `<button type="button" class="btn secondary" data-action="toggle-records">${showAllRecords ? t("records.showLess") : t("records.showAll")}</button>` : ""}
            </div>
            ${state.records.length > 3 ? `
            <div class="record-search">
              <input id="recordSearch" type="search" placeholder="${escapeAttr(t("records.search"))}" value="${escapeAttr(recordSearchQuery)}" autocomplete="off" aria-label="${t("records.search")}" />
              ${recordSearchQuery ? `<span class="helper">${t("records.searchResult").replace("{count}", filteredSearchCount)}</span>` : `<span class="helper hint-small desktop-only">⌘K</span>`}
            </div>
            <div class="record-date-range">
              <div class="helper hint-small">${t("records.dateRange")}</div>
              <div class="date-range-fields">
                <label>${t("records.from")}<input id="dateRangeFrom" type="date" autocomplete="off" value="${escapeAttr(recordDateFrom)}" max="${todayLocal()}" /></label>
                <label>${t("records.to")}<input id="dateRangeTo" type="date" autocomplete="off" value="${escapeAttr(recordDateTo)}" max="${todayLocal()}" /></label>
                ${recordDateFrom || recordDateTo ? `<button type="button" class="btn ghost" data-action="clear-date-range">${t("records.clearRange")}</button>` : ""}
              </div>
            </div>` : ""}
            ${state.records.length ? `<div class="export-row"><button type="button" class="btn ghost" data-action="export-csv">📤 ${t("export.csv")}</button><button type="button" class="btn ghost" data-action="import-csv">📥 ${t("import.csv")}</button><input type="file" id="csvImportInput" accept=".csv" style="display:none" /></div>` : `<div class="export-row"><button type="button" class="btn ghost" data-action="import-csv">📥 ${t("import.csv")}</button><input type="file" id="csvImportInput" accept=".csv" style="display:none" /></div>`}
            <div class="record-list">
              ${state.records.length ? renderRecordList() : `<div class="empty-state">
                <span class="empty-emoji" aria-hidden="true">📊</span>
                <div class="empty-msg">${t("records.empty")}</div>
                <div class="empty-hint">${t("records.emptyHint")}</div>
                <div class="empty-state-actions">
                  <button type="button" class="btn" data-mode="manual" aria-label="${t("entry.manual")}">✏️ ${t("entry.manual")}</button>
                  <button type="button" class="btn secondary" data-mode="voice" aria-label="${t("entry.voice")}">🎤 ${t("entry.voice")}</button>
                  <button type="button" class="btn secondary" data-mode="photo" aria-label="${t("entry.photo")}">📷 ${t("entry.photo")}</button>
                </div>
              </div>`}
            </div>
            ${renderSourceBreakdown()}
            ${renderRecordingTime()}
            ${renderDataHealth()}
            <div class="export-grid">
              <button type="button" class="btn secondary" data-action="export-excel">📊 ${t("export.excel")}</button>
              <button type="button" class="btn secondary" data-action="export-csv">📄 ${t("export.csv")}</button>
              <button type="button" class="btn secondary" data-action="export-text">📝 ${t("export.text")}</button>
            </div>
          </section>
        </div>

        <div class="column">
          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("section.settings")}</h2>
                <p>v${APP_VERSION}</p>
              </div>
              <button type="button" class="btn secondary" data-action="save-settings">${t("settings.save")}</button>
            </div>
            <div class="settings-grid">
              <div class="field">
                <label for="language">${t("settings.language")}</label>
                <select id="language" name="language">
                  ${renderOption("ja", state.settings.language, t("lang.ja"))}
                  ${renderOption("en", state.settings.language, t("lang.en"))}
                </select>
              </div>
              <div class="field span-2">
                <label>${t("settings.theme")}</label>
                <div class="theme-grid" role="radiogroup" aria-label="${t("settings.theme")}">
                  ${THEME_LIST.map((theme) => `
                    <button type="button" class="theme-swatch ${state.settings.theme === theme.id ? "active" : ""}" data-theme-pick="${theme.id}" role="radio" aria-checked="${state.settings.theme === theme.id}" aria-label="${t("settings.theme." + theme.id)}">
                      <span class="swatch-color" style="background: ${theme.color};"></span>
                      <span class="swatch-label">${t("settings.theme." + theme.id)}</span>
                    </button>
                  `).join("")}
                </div>
              </div>
              <div class="field">
                <label for="chartStyle">${t("settings.chartStyle")}</label>
                <select id="chartStyle" name="chartStyle">
                  ${renderOption("detailed", state.settings.chartStyle, t("settings.chartStyle.detailed"))}
                  ${renderOption("compact", state.settings.chartStyle, t("settings.chartStyle.compact"))}
                </select>
              </div>
              <div class="field">
                <label for="adPreviewEnabled">${t("settings.adPreview")}</label>
                <select id="adPreviewEnabled" name="adPreviewEnabled">
                  ${renderOption("true", String(state.settings.adPreviewEnabled), t("settings.on"))}
                  ${renderOption("false", String(state.settings.adPreviewEnabled), t("settings.off"))}
                </select>
              </div>
              <div class="field">
                <label for="autoTheme">${t("settings.autoTheme")}</label>
                <select id="autoTheme" name="autoTheme">
                  ${renderOption("true", String(state.settings.autoTheme), t("settings.autoTheme.on"))}
                  ${renderOption("false", String(state.settings.autoTheme), t("settings.autoTheme.off"))}
                </select>
                <div class="helper hint-small">${t("settings.autoTheme.hint")}</div>
              </div>
              <div class="field">
                <label>${t("settings.platforms")}</label>
                <input value="${t("settings.platformsValue")}" readonly />
              </div>
              <div class="field">
                <label>${t("settings.storage")}</label>
                <input value="${t("settings.storageValue")}" readonly />
              </div>
              <div class="field span-2">
                <label>${t("settings.version")}</label>
                <input value="${APP_VERSION}" readonly />
              </div>
            </div>
            <div class="data-actions">
              <button type="button" class="btn secondary" data-action="export-data">💾 ${t("settings.export")}</button>
              <label class="btn secondary" for="importInput">📥 ${t("import.button")}</label>
              <input id="importInput" type="file" accept=".json" class="hidden" />
              <button type="button" class="btn ghost" data-action="reset-data">🗑️ ${t("settings.reset")}</button>
            </div>
          </section>

          <!-- Google Drive Sync -->
          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("google.title")}</h2>
                <p>${t("google.hint")}</p>
              </div>
            </div>
            <div class="google-actions">
              <button type="button" class="google-btn" data-action="google-backup" ${isGoogleReady() ? "" : "disabled"}>
                <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                ${t("google.backup")}
              </button>
              <button type="button" class="google-btn" data-action="google-restore" ${isGoogleReady() ? "" : "disabled"}>
                <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                ${t("google.restore")}
              </button>
            </div>
          </section>

          <!-- Goal Weight -->
          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("goal.title")}</h2>
              </div>
              <button type="button" class="btn secondary" data-action="save-goal">${t("goal.save")}</button>
            </div>
            <div class="field">
              <label for="goalWeight">${t("goal.set")}</label>
              <input id="goalWeight" name="goalWeight" inputmode="decimal" autocomplete="off" value="${escapeAttr(state.settings.goalWeight ?? "")}" />
            </div>
          </section>

          <!-- Reminder -->
          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("reminder.title")}</h2>
              </div>
            </div>
            <div class="reminder-grid">
              <div class="field">
                <label for="reminderEnabled">${t("reminder.enable")}</label>
                <select id="reminderEnabled" name="reminderEnabled">
                  ${renderOption("true", String(state.settings.reminderEnabled), t("reminder.on"))}
                  ${renderOption("false", String(state.settings.reminderEnabled), t("reminder.off"))}
                </select>
              </div>
              <div class="field">
                <label for="reminderTime">${t("reminder.time")}</label>
                <input id="reminderTime" name="reminderTime" type="time" value="${escapeAttr(state.settings.reminderTime || "21:00")}" />
              </div>
            </div>
            <div style="margin-top: 12px;">
              <button type="button" class="btn secondary" data-action="save-reminder">${t("reminder.save")}</button>
            </div>
          </section>

          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("section.review")}</h2>
                <p>${t("review.note")}</p>
              </div>
            </div>
            <div class="privacy-box">
              <h3>${t("privacy.title")}</h3>
              <p>${t("privacy.body")}</p>
            </div>
            <div class="note-grid" style="margin-top: 12px;">
              <article class="review-card">
                <h3>${t("review.permissionsTitle")}</h3>
                <p>${t("review.permissions")}</p>
              </article>
              <article class="review-card">
                <h3>${t("review.medicalTitle")}</h3>
                <p>${t("review.medical")}</p>
              </article>
              <article class="review-card">
                <h3>${t("review.adsTitle")}</h3>
                <p>${t("review.ads")}</p>
              </article>
            </div>
            <div class="review-card" style="margin-top: 12px;">
              <h3>${t("review.checklistTitle")}</h3>
              <ul class="checklist">
                <li>${t("review.checklist.permissions")}</li>
                <li>${t("review.checklist.privacy")}</li>
                <li>${t("review.checklist.medical")}</li>
                <li>${t("review.checklist.ads")}</li>
              </ul>
            </div>
          </section>

          ${state.settings.adPreviewEnabled ? `
            <section class="panel">
              <div class="ad-slot">
                <div class="ad-badge">AD</div>
                <div>
                  <h3>${t("settings.adPreview")}</h3>
                  <p class="helper">${t("review.ads")}</p>
                </div>
              </div>
            </section>
          ` : ""}
        </div>
      </div>
    </main>
    <button type="button" class="scroll-top-btn" id="scrollTopBtn" aria-label="${t("scroll.top")}" title="${t("scroll.top")}">↑</button>
    ${rainbowVisible ? `
    <div class="rainbow-overlay" id="rainbowOverlay" role="alert" aria-live="assertive">
      <div class="confetti-container" id="confettiContainer"></div>
      <div class="rainbow-card">
        <div class="rainbow-emoji" aria-hidden="true">🌈✨</div>
        <div class="rainbow-text">${t("rainbow.congrats")}</div>
        <div class="rainbow-detail">${escapeAttr(rainbowDetail)}</div>
      </div>
    </div>
    ` : ""}
  `;

  bindEvents();
  drawChart();
  window.scrollTo(0, scrollY);

  if (rainbowVisible) {
    spawnConfetti();
    // Vibrate on supported devices for haptic feedback
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    clearTimeout(_rainbowDismissTimer);
    _rainbowDismissTimer = setTimeout(() => {
      const overlay = document.getElementById("rainbowOverlay");
      if (overlay) {
        overlay.classList.add("fade-out");
        setTimeout(() => {
          rainbowVisible = false;
          overlay.remove();
        }, 600);
      }
    }, 4200);
  }
  } catch (e) {
    console.error("[WeightRainbow] Render error:", e);
    app.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:system-ui;">
      <h2 style="color:#dc2626;">${t("error.render")}</h2>
      <p style="color:#666;margin:12px 0;">${escHtml(e.message)}</p>
      <p style="color:#999;font-size:0.8rem;">${e.stack ? e.stack.split('\n').slice(0, 3).map(l => escHtml(l)).join('<br>') : ''}</p>
      <button type="button" onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border-radius:8px;border:none;background:#ff5f6d;color:#fff;font-size:1rem;">${t("error.reload")}</button>
    </div>`;
  }
}

function renderMetric(label, value) {
  return `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function renderMonthlyStats() {
  const monthlyStats = calcMonthlyStats(state.records);
  if (!monthlyStats.length) return "";
  const visible = showMonthlyStats ? monthlyStats : monthlyStats.slice(0, 3);
  return `
    <section class="panel">
      <div class="section-header">
        <div>
          <h2>${t("monthly.title")}</h2>
          <p>${t("monthly.hint")}</p>
        </div>
      </div>
      <div class="monthly-stats-list">
        ${visible.map((m) => {
          const changeCls = m.change < 0 ? "loss" : m.change > 0 ? "gain" : "neutral";
          return `
            <div class="monthly-stats-row">
              <div class="monthly-label">${new Date(m.month + "-01T00:00:00").toLocaleDateString(state.settings.language === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "short" })}</div>
              <div class="monthly-values">
                <span title="${t("summary.avg")}">${t("summary.avg")}: ${m.avg.toFixed(1)}kg</span>
                <span title="${t("summary.min")}">↓${m.min.toFixed(1)}</span>
                <span title="${t("summary.max")}">↑${m.max.toFixed(1)}</span>
                <span class="monthly-change ${changeCls}">${m.change > 0 ? "+" : ""}${m.change.toFixed(1)}kg</span>
                <span class="helper">${t("monthly.records").replace("{count}", m.count)}</span>
              </div>
            </div>`;
        }).join("")}
      </div>
      ${monthlyStats.length > 3 ? `
        <button type="button" class="btn secondary full-width-btn" data-action="toggle-monthly">
          ${showMonthlyStats ? t("records.showLess") : t("monthly.showAll").replace("{count}", monthlyStats.length)}
        </button>` : ""}
    </section>`;
}

function renderCalendar() {
  const data = buildCalendarMonth(state.records, calendarYear, calendarMonth);
  if (!data) return `<div class="helper">${t("chart.empty")}</div>`;
  const dayNames = ["calendar.sun", "calendar.mon", "calendar.tue", "calendar.wed", "calendar.thu", "calendar.fri", "calendar.sat"];
  const now = new Date();
  const isCurrentMonthView = calendarYear === now.getFullYear() && calendarMonth === now.getMonth();
  let html = `<div class="calendar-nav">
    <button type="button" data-action="cal-prev" aria-label="${t("calendar.prev")}">${t("calendar.prev")}</button>
    <span class="calendar-label">${new Date(calendarYear, calendarMonth).toLocaleDateString(state.settings.language === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "long" })}</span>
    <button type="button" data-action="cal-next" aria-label="${t("calendar.next")}">${t("calendar.next")}</button>
    ${!isCurrentMonthView ? `<button type="button" class="btn ghost" data-action="cal-today" style="margin-left:4px;font-size:0.75rem;">${t("diff.today")}</button>` : ""}
  </div>`;
  html += `<div class="calendar-grid">`;
  for (const key of dayNames) {
    html += `<div class="calendar-header">${t(key)}</div>`;
  }
  for (let i = 0; i < data.startDow; i++) {
    html += `<div class="calendar-cell empty"></div>`;
  }
  const todayDate = new Date();
  const isCurrentMonth = calendarYear === todayDate.getFullYear() && calendarMonth === todayDate.getMonth();
  const todayDay = todayDate.getDate();
  const changeMap = calcCalendarChangeMap(state.records);
  for (const d of data.days) {
    const hasRecord = d.wt !== null;
    const isToday = isCurrentMonth && d.day === todayDay;
    const change = changeMap[d.dt];
    let bg = "";
    let changeLabel = "";
    if (hasRecord && change !== undefined) {
      if (change < 0) {
        const alpha = Math.min(50, Math.round(Math.abs(change) * 30 + 15));
        bg = `background: color-mix(in srgb, var(--ok) ${alpha}%, transparent)`;
      } else if (change > 0) {
        const alpha = Math.min(50, Math.round(change * 30 + 15));
        bg = `background: color-mix(in srgb, var(--warn) ${alpha}%, transparent)`;
      } else {
        bg = `background: color-mix(in srgb, var(--accent) 20%, transparent)`;
      }
      changeLabel = ` (${change > 0 ? "+" : ""}${change.toFixed(1)})`;
    } else if (hasRecord) {
      const intensity = d.intensity !== null ? d.intensity : 0;
      bg = `background: color-mix(in srgb, var(--accent) ${Math.round(20 + intensity * 60)}%, transparent)`;
    }
    html += `<div class="calendar-cell${hasRecord ? " has-record" : ""}${isToday ? " today" : ""}" style="${bg}" title="${hasRecord ? `${Number(d.wt).toFixed(1)}kg${changeLabel}` : ""}"${hasRecord ? ` aria-label="${d.day}${t("calendar.dayUnit")} ${Number(d.wt).toFixed(1)}kg${changeLabel}"` : ""}>
      <span class="calendar-day">${d.day}</span>
      ${hasRecord ? `<span class="calendar-wt">${Number(d.wt).toFixed(1)}</span>` : ""}
    </div>`;
  }
  html += `</div>`;
  html += `<div class="calendar-legend"><span class="cal-legend-item"><span class="cal-dot cal-dot-down"></span>${t("calendar.decreased")}</span><span class="cal-legend-item"><span class="cal-dot cal-dot-up"></span>${t("calendar.increased")}</span></div>`;
  html += `<div class="helper" style="margin-top:4px">${t("calendar.records").replace("{count}", data.recordCount)}</div>`;
  return html;
}

function renderStat(label, value) {
  return `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function renderOption(value, selectedValue, label) {
  return `<option value="${value}" ${String(value) === String(selectedValue) ? "selected" : ""}>${label}</option>`;
}

function renderTab(mode, label) {
  const isActive = activeEntryMode === mode;
  return `<button type="button" class="tab ${isActive ? "active" : ""}" data-mode="${mode}" role="tab" aria-selected="${isActive}" tabindex="${isActive ? "0" : "-1"}">${label}</button>`;
}

function renderRecord(record, prevRecord, badge) {
  const bmiText = record.bmi ? `${record.bmi.toFixed(1)} / ${t(getBMIStatus(record.bmi))}` : t("chart.none");
  let diffHtml = "";
  if (prevRecord) {
    const diff = Math.round((record.wt - prevRecord.wt) * 10) / 10;
    if (diff !== 0) {
      const cls = diff < 0 ? "negative" : "positive";
      diffHtml = `<span class="record-diff ${cls}">${diff > 0 ? "+" : ""}${diff.toFixed(1)}</span>`;
    }
  }
  const badgeHtml = badge ? ` <span class="record-badge record-badge-${badge.type}" title="${badge.label}">${badge.icon}</span>` : "";
  return `
    <div class="record-item${badge ? ` record-${badge.type}` : ""}">
      <div class="record-row">
        <div class="tag tag-${record.source}">${t(`entry.source.${record.source}`)}${badgeHtml}</div>
        <div>
          <div class="record-weight">${formatWeight(record.wt)} ${diffHtml}</div>
          <div class="helper">${escapeAttr(record.dt)} (${t("day." + new Date(record.dt + "T00:00:00").getDay())})${record.imageName ? ` / ${escapeAttr(record.imageName)}` : ""}</div>
        </div>
        <div class="helper">${t("bmi.title")}: ${bmiText}${record.bf ? ` / ${t("bodyFat.label")}: ${Number(record.bf).toFixed(1)}%` : ""}</div>
        ${record.note ? `<div class="helper record-note">📝 ${formatNote(record.note)}</div>` : ""}
      </div>
      <button type="button" class="record-delete" data-delete-date="${escapeAttr(record.dt)}" aria-label="${t("records.delete")} ${escapeAttr(record.dt)} ${record.wt.toFixed(1)}kg">${t("records.delete")}</button>
    </div>
  `;
}

function renderSourceBreakdown() {
  const breakdown = calcSourceBreakdown(state.records);
  if (!breakdown) return "";
  const sourceIcons = { manual: "✏️", voice: "🎤", photo: "📷", quick: "⚡", import: "📥" };
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  return `
    <div class="source-breakdown">
      <div class="helper">${t("source.breakdown")}</div>
      <div class="source-breakdown-row">
        ${entries.map(([src, count]) => {
          const icon = sourceIcons[src] || "📊";
          const pct = Math.round((count / state.records.length) * 100);
          return `<span class="source-chip"><span class="source-icon" aria-hidden="true">${icon}</span> ${t("entry.source." + src)} <strong>${count}</strong> (${pct}%)</span>`;
        }).join("")}
      </div>
    </div>
  `;
}

function renderWeekdayWeekend() {
  const wdwe = calcWeekdayVsWeekend(state.records);
  if (!wdwe) return "";
  const diffCls = wdwe.diff > 0 ? "positive" : wdwe.diff < 0 ? "negative" : "";
  return `
    <div class="wdwe-section">
      <div class="helper">${t("wdwe.title")}</div>
      <div class="wdwe-display">
        <div class="wdwe-col">
          <div class="wdwe-label">${t("wdwe.weekday")}</div>
          <div class="wdwe-value">${wdwe.weekdayAvg.toFixed(1)}kg</div>
          <div class="hint-small">${wdwe.weekdayCount} ${t("chart.records")}</div>
        </div>
        <div class="wdwe-vs">${t("wdwe.vs")}</div>
        <div class="wdwe-col">
          <div class="wdwe-label">${t("wdwe.weekend")}</div>
          <div class="wdwe-value">${wdwe.weekendAvg.toFixed(1)}kg</div>
          <div class="hint-small">${wdwe.weekendCount} ${t("chart.records")}</div>
        </div>
        <div class="wdwe-col">
          <div class="wdwe-label">${t("wdwe.diff")}</div>
          <div class="wdwe-value ${diffCls}">${wdwe.diff > 0 ? "+" : ""}${wdwe.diff.toFixed(1)}kg</div>
        </div>
      </div>
      <div class="helper hint-small" style="margin-top:4px;">${t("wdwe.heavier." + wdwe.heavier)}</div>
    </div>
  `;
}

function renderDataHealth() {
  const health = calcDataHealth(state.records);
  if (!health) return "";
  const level = health.score >= 80 ? "high" : health.score >= 50 ? "medium" : "low";
  const issueHtml = health.issues.length === 0
    ? `<div class="helper hint-small" style="color:var(--ok);font-weight:600;">${t("health.perfect")}</div>`
    : health.issues.slice(0, 3).map((issue) => {
      if (issue.type === "gap") return `<div class="health-issue">📅 ${t("health.gap").replace("{days}", issue.days).replace("{from}", issue.from).replace("{to}", issue.to)}</div>`;
      if (issue.type === "outlier") return `<div class="health-issue">📊 ${t("health.outlier").replace("{date}", issue.date).replace("{weight}", Number(issue.weight).toFixed(1)).replace("{expected}", Number(issue.expected).toFixed(1))}</div>`;
      if (issue.type === "noBMI") return `<div class="health-issue">📏 ${t("health.noBMI")}</div>`;
      return "";
    }).join("");
  return `
    <div class="health-section">
      <div class="helper">${t("health.title")}</div>
      <div class="health-display">
        <div class="health-score ${level}" role="meter" aria-valuenow="${health.score}" aria-valuemin="0" aria-valuemax="100" aria-label="${t("health.title")}">${health.score}</div>
        <div class="health-details">
          <div class="helper hint-small">${t("health.score").replace("{score}", health.score)}</div>
          ${issueHtml}
        </div>
      </div>
    </div>
  `;
}

function renderWeightRange() {
  const range = calcWeightRangePosition(state.records);
  if (!range) return "";
  const zoneCls = range.zone === "low" ? "range-low" : range.zone === "high" ? "range-high" : "range-mid";
  return `
    <div class="range-section">
      <div class="helper">${t("range.title")}</div>
      <div class="range-bar-container">
        <div class="range-bar-track" role="meter" aria-valuenow="${range.position}" aria-valuemin="0" aria-valuemax="100" aria-label="${t("range.title")}">
          <div class="range-bar-fill" style="width:${range.position}%"></div>
          <div class="range-bar-marker" style="left:${range.position}%"></div>
        </div>
        <div class="range-labels">
          <span class="hint-small">${t("range.min").replace("{weight}", range.min.toFixed(1))}</span>
          <span class="hint-small">${t("range.max").replace("{weight}", range.max.toFixed(1))}</span>
        </div>
      </div>
      <div class="helper hint-small ${zoneCls}">${t("range.position").replace("{pct}", range.position)}</div>
      <div class="helper hint-small" style="margin-top:2px;">${t("range." + range.zone)}</div>
    </div>
  `;
}

function renderTagImpact() {
  const impact = calcTagImpact(state.records);
  if (!impact) return "";
  const rows = impact.map((item) => {
    const sign = item.avgChange > 0 ? "+" : "";
    const cls = item.avgChange > 0.05 ? "tag-gain" : item.avgChange < -0.05 ? "tag-loss" : "tag-neutral";
    return `
      <div class="tag-impact-row ${cls}">
        <span class="tag-impact-tag">#${t("note.tag." + item.tag)}</span>
        <span class="tag-impact-change">${sign}${item.avgChange.toFixed(2)}kg</span>
        <span class="hint-small">${t("tagImpact.count").replace("{count}", item.count)}</span>
      </div>`;
  }).join("");
  return `
    <div class="tag-impact-section">
      <div class="helper">${t("tagImpact.title")}</div>
      <div class="helper hint-small" style="margin-bottom:6px;">${t("tagImpact.hint")}</div>
      ${rows}
    </div>
  `;
}

function renderBestPeriod() {
  const best = calcBestPeriod(state.records);
  if (!best) return "";
  const renderRow = (key, data) => {
    if (!data || data.change >= 0) return "";
    return `
      <div class="best-period-row">
        <div class="best-period-label">${t("bestPeriod." + key)}</div>
        <div class="best-period-change">${t("bestPeriod.change").replace("{change}", data.change.toFixed(1))}</div>
        <div class="hint-small">${t("bestPeriod.range").replace("{from}", data.from).replace("{to}", data.to)}</div>
        <div class="hint-small">${t("bestPeriod.weight").replace("{start}", data.startWeight.toFixed(1)).replace("{end}", data.endWeight.toFixed(1))}</div>
      </div>`;
  };
  const weekRow = renderRow("week", best[7]);
  const monthRow = renderRow("month", best[30]);
  if (!weekRow && !monthRow) return "";
  return `
    <div class="best-period-section">
      <div class="helper">${t("bestPeriod.title")}</div>
      ${weekRow}${monthRow}
    </div>
  `;
}

function renderWeeklyFrequency() {
  const freq = calcWeeklyFrequency(state.records);
  if (!freq) return "";
  const hasPerfect = freq.buckets.some((b) => b.count >= 7);
  const bars = freq.buckets.map((b) => {
    const pct = Math.round((b.count / freq.maxCount) * 100);
    return `<div class="freq-bar-col"><div class="freq-bar" style="height:${Math.max(pct, 4)}%">${b.count}</div></div>`;
  }).join("");
  return `
    <div class="freq-section">
      <div class="helper">${t("freq.title")}</div>
      <div class="freq-chart">${bars}</div>
      <div class="helper hint-small">${t("freq.avg").replace("{avg}", freq.avgPerWeek)} · ${t("freq.hint").replace("{weeks}", freq.weeks)}</div>
      ${hasPerfect ? `<div class="helper hint-small" style="color:var(--ok);font-weight:600;margin-top:2px;">${t("freq.perfect")}</div>` : ""}
    </div>
  `;
}

function renderWeightVelocity() {
  const vel = calcWeightVelocity(state.records);
  if (!vel) return "";
  const renderPeriod = (key, data) => {
    if (!data) return "";
    const status = data.dailyRate < -0.01 ? "losing" : data.dailyRate > 0.01 ? "gaining" : "stable";
    const statusCls = status === "losing" ? "vel-loss" : status === "gaining" ? "vel-gain" : "vel-stable";
    return `
      <div class="vel-period">
        <div class="vel-label">${t("velocity." + key)}</div>
        <div class="vel-rate ${statusCls}">${t("velocity.daily").replace("{rate}", (data.dailyRate > 0 ? "+" : "") + data.dailyRate.toFixed(2))}</div>
        <div class="hint-small">${t("velocity.projection").replace("{amount}", (data.monthlyProjection > 0 ? "+" : "") + data.monthlyProjection.toFixed(1))}</div>
        <div class="hint-small vel-status">${t("velocity." + status)}</div>
      </div>`;
  };
  return `
    <div class="vel-section">
      <div class="helper">${t("velocity.title")}</div>
      <div class="vel-display">
        ${renderPeriod("week", vel.week)}
        ${renderPeriod("month", vel.month)}
      </div>
    </div>
  `;
}

function renderWeightVariance() {
  const v = calcWeightVariance(state.records);
  if (!v) return "";
  const levelColor = v.level === "veryLow" || v.level === "low" ? "var(--ok)" : v.level === "moderate" ? "var(--warn)" : "var(--error)";
  return `
    <div class="variance-section">
      <div class="helper">${t("variance.title")}</div>
      <div class="variance-badge" style="color:${levelColor};font-weight:700;">${t("variance." + v.level)}</div>
      <div class="variance-stats">
        <span>${t("variance.cv").replace("{cv}", Number(v.cv).toFixed(1))}</span>
        <span>${t("variance.swing").replace("{swing}", Number(v.maxSwing).toFixed(1))}</span>
        <span>${t("variance.daily").replace("{avg}", Number(v.avgDailySwing).toFixed(1))}</span>
      </div>
      <div class="helper hint-small">${t("variance.hint").replace("{count}", v.count)}</div>
    </div>
  `;
}

function renderWeightPlateau() {
  const p = calcWeightPlateau(state.records);
  if (!p) return "";
  const statusColor = p.isPlateau ? "var(--warn)" : "var(--ok)";
  const statusIcon = p.isPlateau ? "⏸" : "📈";
  return `
    <div class="plateau-section">
      <div class="helper">${t("plateau.title")}</div>
      <div class="plateau-status" style="color:${statusColor};font-weight:700;">
        ${statusIcon} ${p.isPlateau ? t("plateau.detected") : t("plateau.notDetected")}
      </div>
      <div class="plateau-stats">
        <span>${t("plateau.days").replace("{days}", p.days)}</span>
        <span>${t("plateau.range").replace("{range}", p.range)}</span>
        <span>${t("plateau.change").replace("{change}", p.recentChange)}</span>
      </div>
      ${p.previousRate !== null ? `<div class="plateau-prev">${t("plateau.prevRate").replace("{rate}", p.previousRate)}</div>` : ""}
      <div class="helper hint-small">${t("plateau.hint")}</div>
    </div>
  `;
}

function renderRecordGaps() {
  const g = calcRecordGaps(state.records);
  if (!g) return "";
  const gapsList = g.gaps.length
    ? g.gaps.map((gap) => `<div class="gaps-item">${t("gaps.period").replace("{from}", gap.from).replace("{to}", gap.to).replace("{days}", gap.days)}</div>`).join("")
    : `<div class="gaps-perfect">${t("gaps.perfect")}</div>`;
  return `
    <div class="gaps-section">
      <div class="helper">${t("gaps.title")}</div>
      <div class="gaps-summary">
        <span>${t("gaps.coverage").replace("{pct}", g.coverage)}</span>
        <span>${t("gaps.longest").replace("{days}", g.longestGap)}</span>
        <span>${t("gaps.total").replace("{count}", g.totalGaps)}</span>
      </div>
      <div class="gaps-list">${gapsList}</div>
      <div class="helper hint-small">${t("gaps.hint")}</div>
    </div>
  `;
}

function renderCalorieEstimate() {
  const c = calcCalorieEstimate(state.records);
  if (!c) return "";
  const renderPeriod = (data, labelKey) => {
    if (!data) return "";
    const status = data.dailyKcal > 50 ? "surplus" : data.dailyKcal < -50 ? "deficit" : "balanced";
    const color = status === "deficit" ? "var(--ok)" : status === "surplus" ? "var(--warn)" : "var(--text)";
    return `
      <div class="calorie-card">
        <div class="calorie-label">${t("calorie." + labelKey)}</div>
        <div class="calorie-status" style="color:${color};font-weight:600;">${t("calorie." + status)}</div>
        <div class="calorie-value">${t("calorie.daily").replace("{kcal}", Math.abs(data.dailyKcal))}</div>
        <div class="calorie-total">${t("calorie.total").replace("{kcal}", Math.abs(data.totalKcal))}</div>
      </div>`;
  };
  return `
    <div class="calorie-section">
      <div class="helper">${t("calorie.title")}</div>
      <div class="calorie-cards">
        ${renderPeriod(c.week, "week")}
        ${renderPeriod(c.month, "month")}
      </div>
      <div class="helper hint-small">${t("calorie.hint")}</div>
    </div>
  `;
}

function renderMomentumScore() {
  const m = calcMomentumScore(state.records, state.settings.goalWeight);
  if (!m) return "";
  const color = m.level === "great" ? "var(--ok)" : m.level === "good" ? "var(--accent)" : m.level === "fair" ? "var(--warn)" : "var(--error)";
  const pct = m.score;
  return `
    <div class="momentum-section">
      <div class="helper">${t("momentum.title")}</div>
      <div class="momentum-bar-track">
        <div class="momentum-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
      <div class="momentum-info">
        <span class="momentum-score" style="color:${color};font-weight:700;">${t("momentum.score").replace("{score}", m.score)}</span>
        <span class="momentum-label" style="color:${color};">${t("momentum." + m.level)}</span>
      </div>
      <div class="helper hint-small">${t("momentum.hint")}</div>
    </div>
  `;
}

function renderNextMilestones() {
  const ms = calcNextMilestones(state.records, state.profile.heightCm);
  if (!ms) return "";
  const items = ms.map((m) => {
    const key = `milestone.next.${m.type}`;
    let text = t(key).replace("{target}", m.target).replace("{remaining}", m.remaining);
    if (m.bmiValue) text = text.replace("{bmi}", m.bmiValue);
    return `<div class="next-milestone-item">🎯 ${text}</div>`;
  }).join("");
  return `
    <div class="next-milestone-section">
      <div class="helper">${t("milestone.next.title")}</div>
      ${items}
      <div class="helper hint-small">${t("milestone.next.hint")}</div>
    </div>
  `;
}

function renderSeasonality() {
  const s = calcSeasonality(state.records);
  if (!s) return "";
  const bars = s.monthAvgs.map((avg, i) => {
    if (avg === null) return `<div class="season-bar-wrap"><div class="season-bar-label">${t("season.month." + (i + 1))}</div><div class="season-bar" style="height:0"></div></div>`;
    const diff = avg - s.overallAvg;
    const pct = Math.min(100, Math.max(5, 50 + diff * 10));
    const color = i === s.lightestMonth ? "var(--ok)" : i === s.heaviestMonth ? "var(--warn)" : "var(--accent)";
    return `<div class="season-bar-wrap"><div class="season-bar" style="height:${pct}%;background:${color};" title="${Number(avg).toFixed(1)}kg"></div><div class="season-bar-label">${t("season.month." + (i + 1))}</div></div>`;
  }).join("");
  return `
    <div class="season-section">
      <div class="helper">${t("season.title")}</div>
      <div class="season-chart">${bars}</div>
      <div class="season-info">
        <div>${t("season.lightest").replace("{month}", s.lightestMonth + 1).replace("{avg}", Number(s.monthAvgs[s.lightestMonth]).toFixed(1))}</div>
        <div>${t("season.heaviest").replace("{month}", s.heaviestMonth + 1).replace("{avg}", Number(s.monthAvgs[s.heaviestMonth]).toFixed(1))}</div>
        <div>${t("season.range").replace("{range}", s.seasonalRange)}</div>
      </div>
      <div class="helper hint-small">${t("season.hint")}</div>
    </div>
  `;
}

function renderWeightDistribution() {
  const d = calcWeightDistribution(state.records);
  if (!d) return "";
  const bars = d.buckets.map((b, i) => {
    const pct = d.maxCount > 0 ? Math.round((b.count / d.maxCount) * 100) : 0;
    const isCurrent = i === d.latestBucket;
    const isMode = i === d.modeBucket;
    const color = isCurrent ? "var(--accent)" : isMode ? "var(--ok)" : "color-mix(in srgb, var(--accent) 40%, transparent)";
    return `<div class="dist-bar-wrap">
      ${isCurrent ? `<div class="dist-current-marker">${t("dist.current")}</div>` : ""}
      <div class="dist-bar" style="height:${Math.max(2, pct)}%;background:${color};" title="${b.start}-${b.end}kg: ${b.count}"></div>
      <div class="dist-bar-label">${b.start}</div>
    </div>`;
  }).join("");
  return `
    <div class="dist-section">
      <div class="helper">${t("dist.title")}</div>
      <div class="dist-chart">${bars}</div>
      <div class="dist-info">${t("dist.mode").replace("{range}", d.modeRange).replace("{count}", d.buckets[d.modeBucket].count)}</div>
      <div class="helper hint-small">${t("dist.hint")}</div>
    </div>
  `;
}

function renderDayOfWeekChange() {
  const d = calcDayOfWeekChange(state.records);
  if (!d) return "";
  const dayKeys = [0, 1, 2, 3, 4, 5, 6];
  const maxAbs = Math.max(...d.avgs.filter((a) => a !== null).map((a) => Math.abs(a)), 0.1);
  const bars = dayKeys.map((i) => {
    const avg = d.avgs[i];
    if (avg === null) return `<div class="dow-change-col"><div class="dow-change-label">${t("day." + i)}</div></div>`;
    const pct = Math.round((Math.abs(avg) / maxAbs) * 50);
    const isGain = avg > 0.01;
    const isLoss = avg < -0.01;
    const color = isLoss ? "var(--ok)" : isGain ? "var(--warn)" : "var(--text)";
    const isBest = i === d.bestDay;
    const isWorst = i === d.worstDay;
    return `<div class="dow-change-col ${isBest ? "best" : ""} ${isWorst ? "worst" : ""}">
      <div class="dow-change-val" style="color:${color};">${avg > 0 ? "+" : ""}${Number(avg).toFixed(2)}</div>
      <div class="dow-change-bar-track"><div class="dow-change-bar" style="height:${pct}%;background:${color};"></div></div>
      <div class="dow-change-label">${t("day." + i)}</div>
    </div>`;
  }).join("");
  return `
    <div class="dow-change-section">
      <div class="helper">${t("dowChange.title")}</div>
      <div class="dow-change-chart">${bars}</div>
      <div class="dow-change-info">
        ${d.bestDay !== null ? `<div>${t("dowChange.best").replace("{day}", t("day." + d.bestDay)).replace("{avg}", Number(d.avgs[d.bestDay]).toFixed(2))}</div>` : ""}
        ${d.worstDay !== null ? `<div>${t("dowChange.worst").replace("{day}", t("day." + d.worstDay)).replace("{avg}", Number(d.avgs[d.worstDay]).toFixed(2))}</div>` : ""}
      </div>
      <div class="helper hint-small">${t("dowChange.hint")}</div>
    </div>
  `;
}

function renderPersonalRecords() {
  const pr = calcPersonalRecords(state.records);
  if (!pr) return "";
  const items = [];
  items.push(`<div class="pr-item">🏆 ${t("pr.allTimeLow").replace("{weight}", pr.allTimeLow).replace("{date}", pr.allTimeLowDate)}</div>`);
  if (pr.biggestDrop > 0) {
    items.push(`<div class="pr-item">⬇️ ${t("pr.biggestDrop").replace("{drop}", pr.biggestDrop).replace("{date}", pr.biggestDropDate)}</div>`);
  }
  if (pr.best7DayChange !== null) {
    items.push(`<div class="pr-item">📅 ${t("pr.best7").replace("{change}", pr.best7DayChange).replace("{from}", pr.best7DayFrom)}</div>`);
  }
  items.push(`<div class="pr-item">📊 ${t("pr.totalChange").replace("{change}", pr.totalChange > 0 ? "+" + pr.totalChange : pr.totalChange)}</div>`);
  items.push(`<div class="pr-item">📝 ${t("pr.totalRecords").replace("{count}", pr.totalRecords)}</div>`);
  return `
    <div class="pr-section">
      <div class="helper">${t("pr.title")}</div>
      ${items.join("")}
      <div class="helper hint-small">${t("pr.hint")}</div>
    </div>
  `;
}

function renderWeightRegression() {
  const reg = calcWeightRegression(state.records);
  if (!reg) return "";
  const dirColor = reg.direction === "losing" ? "var(--ok)" : reg.direction === "gaining" ? "var(--warn)" : "var(--text)";
  const fitColor = reg.fit === "strong" ? "var(--ok)" : reg.fit === "moderate" ? "var(--warn)" : "var(--text)";
  const r2Pct = Math.round(reg.r2 * 100);
  return `
    <div class="regression-section">
      <div class="helper">${t("regression.title")}</div>
      <div class="regression-main">
        <span class="regression-dir" style="color:${dirColor};font-weight:700;">${t("regression." + reg.direction)}</span>
        <span class="regression-rate">${t("regression.rate").replace("{rate}", reg.weeklyRate)}</span>
      </div>
      <div class="regression-r2">
        <div class="regression-r2-bar-track">
          <div class="regression-r2-bar-fill" style="width:${r2Pct}%;background:${fitColor};"></div>
        </div>
        <div class="regression-r2-info">
          <span>${t("regression.r2").replace("{r2}", reg.r2)}</span>
          <span style="color:${fitColor};">${t("regression." + reg.fit)}</span>
        </div>
      </div>
      <div class="helper hint-small">${t("regression.hint")}</div>
    </div>
  `;
}

function renderBMIHistory() {
  const bh = calcBMIHistory(state.records);
  if (!bh) return "";
  const zoneColors = { under: "var(--accent-3)", normal: "var(--ok)", over: "var(--warn)", obese: "var(--error)" };
  const zoneBar = ["under", "normal", "over", "obese"]
    .filter((z) => bh.zones[z] > 0)
    .map((z) => `<div class="bmi-hist-seg" style="width:${bh.zones[z]}%;background:${zoneColors[z]};" title="${t("bmi." + z)} ${bh.zones[z]}%"></div>`)
    .join("");
  const changeStr = bh.change > 0 ? "+" + bh.change : String(bh.change);
  return `
    <div class="bmi-hist-section">
      <div class="helper">${t("bmiHist.title")}</div>
      <div class="bmi-hist-stats">
        <span>${t("bmiHist.first").replace("{bmi}", bh.first)}</span>
        <span>${t("bmiHist.latest").replace("{bmi}", bh.latest)}</span>
        <span>${t("bmiHist.change").replace("{change}", changeStr)}</span>
      </div>
      <div class="bmi-hist-bar">${zoneBar}</div>
      <div class="bmi-hist-detail">
        <span>${t("bmiHist.range").replace("{min}", bh.min).replace("{max}", bh.max)}</span>
        <span>${t("bmiHist.avg").replace("{avg}", bh.avg)}</span>
      </div>
      ${bh.improving ? `<div class="bmi-hist-improving">${t("bmiHist.improving")}</div>` : ""}
      <div class="helper hint-small">${t("bmiHist.hint")}</div>
    </div>
  `;
}

function renderWeightHeatmap() {
  const hm = calcWeightHeatmap(state.records);
  if (!hm) return "";
  const dayLabels = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => t("recCal." + d));
  const rows = dayLabels.map((label, dayIdx) => {
    const cells = hm.weeks.map((week) => {
      const day = week[dayIdx];
      if (day.isFuture) return `<div class="heatmap-cell" data-level="0"></div>`;
      const dir = day.direction || "";
      const title = day.weight != null
        ? `${day.date}: ${Number(day.weight).toFixed(1)}kg${day.change != null ? ` (${day.change > 0 ? "+" : ""}${day.change.toFixed(1)}kg)` : ""}`
        : `${day.date}: ${t("heatmap.noData")}`;
      return `<div class="heatmap-cell ${dir}" data-level="${day.level}" title="${title}"></div>`;
    }).join("");
    return `<div class="heatmap-row"><span class="heatmap-label">${label}</span>${cells}</div>`;
  }).join("");
  return `
    <div class="heatmap-section">
      <div class="helper">${t("heatmap.title")}</div>
      <div class="heatmap-grid">${rows}</div>
      <div class="heatmap-legend">
        <span class="heatmap-legend-text">${t("heatmap.low")}</span>
        <div class="heatmap-cell" data-level="1"></div>
        <div class="heatmap-cell" data-level="2"></div>
        <div class="heatmap-cell" data-level="3"></div>
        <div class="heatmap-cell" data-level="4"></div>
        <span class="heatmap-legend-text">${t("heatmap.high")}</span>
      </div>
      <div class="heatmap-legend" style="margin-top:2px;">
        <span class="heatmap-legend-text loss-text">${t("heatmap.loss")}</span>
        <span class="heatmap-legend-text gain-text">${t("heatmap.gain")}</span>
      </div>
      <div class="helper hint-small">${t("heatmap.hint").replace("{days}", hm.daysWithData)}</div>
    </div>
  `;
}

function renderStreakRewards() {
  const sr = calcStreakRewards(state.records);
  if (!sr || sr.streak < 1) return "";
  const icons = { starter: "🌱", beginner: "🌿", steady: "🌳", committed: "💪", dedicated: "🔥", expert: "⭐", master: "👑", legend: "🏆" };
  const icon = icons[sr.level] || "🌱";
  const pct = sr.next ? Math.round((sr.streak / sr.next) * 100) : 100;
  return `
    <div class="streak-reward-section">
      <div class="helper">${t("streakReward.title")}</div>
      <div class="streak-reward-main">
        <span class="streak-reward-icon" aria-hidden="true">${icon}</span>
        <div class="streak-reward-info">
          <div class="streak-reward-badge">${t("streakReward." + sr.level)}</div>
          <div class="streak-reward-days">${t("streakReward.days").replace("{streak}", sr.streak)}</div>
        </div>
      </div>
      <div class="streak-reward-progress-track">
        <div class="streak-reward-progress-fill" style="width:${pct}%"></div>
      </div>
      ${sr.next ? `<div class="streak-reward-next">${t("streakReward.next").replace("{next}", sr.next).replace("{remaining}", sr.nextRemaining)}</div>` : ""}
      <div class="helper hint-small">${t("streakReward.hint")}</div>
    </div>
  `;
}

function renderWeightConfidence() {
  const fc = calcWeightConfidence(state.records);
  if (!fc) return "";
  const confColors = { high: "var(--ok)", medium: "var(--warn)", low: "var(--error)" };
  const confColor = confColors[fc.confidence] || confColors.low;
  const rows = fc.forecasts.map((f) => `
    <div class="forecast-row">
      <span class="forecast-label">${t("forecast.days").replace("{days}", f.days)}</span>
      <span class="forecast-value">${t("forecast.predicted").replace("{wt}", f.predicted)}</span>
      <span class="forecast-range">${t("forecast.range").replace("{low}", f.low).replace("{high}", f.high)}</span>
    </div>
  `).join("");
  return `
    <div class="forecast-section">
      <div class="helper">${t("forecast.title")}</div>
      <div class="forecast-meta">
        <span class="forecast-rate">${t("forecast.rate").replace("{rate}", fc.weeklyRate > 0 ? "+" + fc.weeklyRate : String(fc.weeklyRate))}</span>
        <span class="forecast-conf" style="color:${confColor};">${t("forecast.confidence")}: ${t("forecast." + fc.confidence)}</span>
      </div>
      <div class="forecast-table">${rows}</div>
      <div class="helper hint-small">${t("forecast.hint").replace("{n}", fc.dataPoints)}</div>
    </div>
  `;
}

function renderProgressSummary() {
  const ps = calcProgressSummary(state.records);
  if (!ps) return "";
  const trendColors = { improving: "var(--ok)", gaining: "var(--error)", stable: "var(--accent-3)" };
  const trendColor = trendColors[ps.trend] || trendColors.stable;
  const changeStr = ps.change > 0 ? "+" + ps.change : String(ps.change);
  const totalStr = ps.totalChange > 0 ? "+" + ps.totalChange : String(ps.totalChange);
  return `
    <div class="progress-section">
      <div class="helper">${t("progress.title")}</div>
      <div class="progress-period">${t("progress.period").replace("{from}", ps.firstDate).replace("{to}", ps.lastDate).replace("{days}", ps.totalDays).replace("{count}", ps.recordCount)}</div>
      <div class="progress-compare">
        <div class="progress-half">
          <span class="progress-half-label">${t("progress.firstHalf")}</span>
          <span class="progress-half-value">${ps.firstHalfAvg}kg</span>
        </div>
        <div class="progress-arrow">${ps.change < 0 ? "↓" : ps.change > 0 ? "↑" : "→"}</div>
        <div class="progress-half">
          <span class="progress-half-label">${t("progress.secondHalf")}</span>
          <span class="progress-half-value">${ps.secondHalfAvg}kg</span>
        </div>
      </div>
      <div class="progress-stats">
        <span>${t("progress.change")}: <strong style="color:${trendColor}">${changeStr}kg</strong></span>
        <span>${t("progress.totalChange").replace("{change}", totalStr)}</span>
      </div>
      <div class="progress-trend" style="color:${trendColor}">${t("progress." + ps.trend)}</div>
      <div class="progress-stability">${ps.moreStable ? t("progress.moreStable") : t("progress.lessStable")}</div>
    </div>
  `;
}

function renderMilestoneTimeline() {
  const tl = calcMilestoneTimeline(state.records);
  if (!tl || tl.events.length === 0) return "";
  const icons = { low: "⬇️", mark: "🎯", bmi: "📊" };
  const items = tl.events.map((e) => {
    let label = "";
    if (e.type === "low") label = t("timeline.low").replace("{wt}", Number(e.weight).toFixed(1));
    else if (e.type === "mark") label = t("timeline.mark").replace("{mark}", e.mark);
    else if (e.type === "bmi") {
      label = e.to === "normal"
        ? t("timeline.bmi.normal")
        : t("timeline.bmi.change").replace("{from}", e.from).replace("{to}", e.to);
    }
    return `<div class="timeline-item"><span class="timeline-icon" aria-hidden="true">${icons[e.type]}</span><div class="timeline-content"><span class="timeline-date">${e.date}</span><span class="timeline-label">${label}</span></div></div>`;
  }).join("");
  return `
    <div class="timeline-section">
      <div class="helper">${t("timeline.title")}</div>
      <div class="timeline-list">${items}</div>
      <div class="helper hint-small">${t("timeline.hint").replace("{count}", tl.events.length)}</div>
    </div>
  `;
}

function renderVolatilityIndex() {
  const vi = calcVolatilityIndex(state.records);
  if (!vi) return "";
  const levelColors = { low: "var(--ok)", moderate: "var(--warn)", high: "var(--error)" };
  const color = levelColors[vi.level] || levelColors.moderate;
  // Scale bar: map overall avg to 0-100 (0.3=low threshold, 0.8=high threshold)
  const pct = Math.min(100, Math.round((vi.overall / 1.2) * 100));
  return `
    <div class="volatility-section">
      <div class="helper">${t("volatility.title")}</div>
      <div class="volatility-badge" style="color:${color}">${t("volatility." + vi.level)}</div>
      <div class="volatility-bar-track">
        <div class="volatility-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="volatility-stats">
        <span>${t("volatility.overall").replace("{val}", Number(vi.overall).toFixed(1))}</span>
        <span>${t("volatility.recent").replace("{val}", Number(vi.recent).toFixed(1))}</span>
        <span>${t("volatility.max").replace("{val}", Number(vi.maxSwing).toFixed(1))}</span>
      </div>
      <div class="volatility-trend">${t("volatility." + vi.trend)}</div>
      <div class="helper hint-small">${t("volatility.hint")}</div>
    </div>
  `;
}

function renderPeriodComparison() {
  const pc = calcPeriodComparison(state.records);
  if (!pc) return "";

  function renderPair(label, period, curLabel, prevLabel) {
    if (!period.current && !period.previous) return "";
    const cur = period.current;
    const prev = period.previous;
    const diffStr = period.avgDiff != null
      ? (period.avgDiff > 0 ? "+" + period.avgDiff.toFixed(1) : period.avgDiff.toFixed(1))
      : "—";
    const diffColor = period.avgDiff != null
      ? (period.avgDiff < 0 ? "var(--ok)" : period.avgDiff > 0 ? "var(--error)" : "var(--text)")
      : "var(--text)";
    return `
      <div class="compare-pair">
        <div class="compare-pair-title">${label}</div>
        <div class="compare-row">
          <div class="compare-cell">
            <span class="compare-label">${curLabel}</span>
            <span class="compare-value">${cur ? t("compare.avg").replace("{val}", cur.avg) : t("compare.noData")}</span>
            ${cur ? `<span class="compare-count">${t("compare.records").replace("{n}", cur.count)}</span>` : ""}
          </div>
          <div class="compare-cell">
            <span class="compare-label">${prevLabel}</span>
            <span class="compare-value">${prev ? t("compare.avg").replace("{val}", prev.avg) : t("compare.noData")}</span>
            ${prev ? `<span class="compare-count">${t("compare.records").replace("{n}", prev.count)}</span>` : ""}
          </div>
        </div>
        ${period.avgDiff != null ? `<div class="compare-diff" style="color:${diffColor}">${t("compare.diff").replace("{val}", diffStr)}</div>` : ""}
      </div>
    `;
  }

  return `
    <div class="compare-section">
      <div class="helper">${t("compare.title")}</div>
      ${renderPair(t("compare.weekly"), pc.weekly, t("compare.thisWeek"), t("compare.lastWeek"))}
      ${renderPair(t("compare.monthly"), pc.monthly, t("compare.thisMonth"), t("compare.lastMonth"))}
    </div>
  `;
}

function renderGoalCountdown() {
  const goalWeight = Number(state.settings.goalWeight);
  if (!goalWeight) return "";
  const gc = calcGoalCountdown(state.records, goalWeight);
  if (!gc) return "";
  if (gc.reached) {
    return `
      <div class="countdown-section countdown-reached">
        <div class="helper">${t("countdown.title")}</div>
        <div class="countdown-congrats">${t("countdown.reached")}</div>
      </div>
    `;
  }
  return `
    <div class="countdown-section">
      <div class="helper">${t("countdown.title")}</div>
      <div class="countdown-current">${t("countdown.current").replace("{wt}", Number(gc.latest).toFixed(1)).replace("{goal}", Number(gc.goal).toFixed(1))}</div>
      <div class="countdown-remaining">${t("countdown.remaining").replace("{val}", Number(gc.absRemaining).toFixed(1))}</div>
      <div class="countdown-bar-track">
        <div class="countdown-bar-fill" style="width:${gc.pct}%"></div>
      </div>
      <div class="countdown-pct">${t("countdown.pct").replace("{pct}", Math.round(gc.pct))}</div>
      <div class="countdown-eta">${gc.etaDays ? t("countdown.eta").replace("{days}", gc.etaDays) : t("countdown.noEta")}</div>
    </div>
  `;
}

function renderBodyComposition() {
  const bc = calcBodyComposition(state.records);
  if (!bc) return "";
  const bfStr = bc.bfChange > 0 ? "+" + bc.bfChange : String(bc.bfChange);
  const fatStr = bc.fatMassChange > 0 ? "+" + bc.fatMassChange : String(bc.fatMassChange);
  const leanStr = bc.leanMassChange > 0 ? "+" + bc.leanMassChange : String(bc.leanMassChange);
  return `
    <div class="body-comp-section">
      <div class="helper">${t("bodyComp.title")}</div>
      <div class="body-comp-trend body-comp-trend-${bc.trend}">${t("bodyComp." + bc.trend)}</div>
      <div class="body-comp-bf">${t("bodyComp.bf").replace("{first}", bc.firstBf).replace("{latest}", bc.latestBf).replace("{change}", bfStr)}</div>
      <div class="body-comp-masses">
        <div class="body-comp-mass fat">${t("bodyComp.fatMass").replace("{change}", fatStr)}</div>
        <div class="body-comp-mass lean">${t("bodyComp.leanMass").replace("{change}", leanStr)}</div>
      </div>
      <div class="helper hint-small">${t("bodyComp.hint").replace("{n}", bc.dataPoints)}</div>
    </div>
  `;
}

function renderShareSummary() {
  const summary = generateWeightSummary(state.records, state.profile);
  if (!summary) return "";
  const changeStr = summary.weight.totalChange > 0 ? "+" + summary.weight.totalChange : String(summary.weight.totalChange);
  const lines = [
    t("share.period").replace("{from}", summary.period.from).replace("{to}", summary.period.to).replace("{days}", summary.period.days),
    t("share.weight").replace("{first}", summary.weight.first).replace("{latest}", summary.weight.latest).replace("{change}", changeStr),
    t("share.range").replace("{min}", summary.weight.min).replace("{max}", summary.weight.max).replace("{avg}", summary.weight.avg),
    t("share.records").replace("{n}", summary.records),
  ];
  if (summary.bmi) {
    lines.push(t("share.bmi").replace("{bmi}", summary.bmi.bmi).replace("{zone}", summary.bmi.zone));
  }
  lines.push(t("share.footer"));
  const text = lines.join("\n");
  return `
    <div class="share-summary-section">
      <div class="helper">${t("share.title")}</div>
      <pre class="share-summary-text">${text}</pre>
      <button type="button" class="btn ghost share-summary-btn" data-action="copy-summary" data-text="${escapeAttr(text)}">${t("share.btn")}</button>
    </div>
  `;
}

function renderDuplicateCheck() {
  const dd = detectDuplicates(state.records);
  if (dd.duplicates.length === 0 && dd.suspicious.length === 0) return "";
  const items = [];
  for (const d of dd.duplicates) {
    items.push(`<div class="dupes-item dupes-warn">${t("dupes.duplicate").replace("{date}", d.date).replace("{count}", d.count)}</div>`);
  }
  for (const s of dd.suspicious) {
    items.push(`<div class="dupes-item dupes-info">${t("dupes.suspicious").replace("{weight}", s.weight).replace("{count}", s.count).replace("{from}", s.from).replace("{to}", s.to)}</div>`);
  }
  return `
    <div class="dupes-section">
      <div class="helper">${t("dupes.title")}</div>
      ${items.join("")}
    </div>
  `;
}

function renderWeeklyAverages() {
  const weeks = calcWeeklyAverages(state.records, 8);
  const withData = weeks.filter((w) => w.avg !== null);
  if (withData.length < 2) return "";
  const allAvgs = withData.map((w) => w.avg);
  const minAvg = Math.min(...allAvgs);
  const maxAvg = Math.max(...allAvgs);
  const range = maxAvg - minAvg || 1;
  const bars = weeks.map((w, i) => {
    if (w.avg === null) {
      return `<div class="weekly-avg-bar-wrap"><div class="weekly-avg-bar empty"></div><div class="weekly-avg-label">${t("weeklyAvg.noData")}</div></div>`;
    }
    const pct = Math.max(10, ((w.avg - minAvg) / range) * 80 + 10);
    const prev = i > 0 ? weeks[i - 1] : null;
    const change = prev && prev.avg !== null ? Math.round((w.avg - prev.avg) * 10) / 10 : null;
    const changeClass = change !== null ? (change < -0.1 ? "down" : change > 0.1 ? "up" : "flat") : "";
    const startLabel = w.weekStart.slice(5).replace("-", "/");
    return `<div class="weekly-avg-bar-wrap">
      <div class="weekly-avg-value">${w.avg.toFixed(1)}</div>
      <div class="weekly-avg-bar ${changeClass}" style="height:${pct}%"></div>
      <div class="weekly-avg-label">${startLabel}</div>
      ${change !== null ? `<div class="weekly-avg-change ${changeClass}">${change > 0 ? "+" : ""}${change.toFixed(1)}</div>` : ""}
    </div>`;
  });
  return `
    <div class="weekly-avg-section">
      <div class="helper">${t("weeklyAvg.title")}</div>
      <div class="weekly-avg-chart">${bars.join("")}</div>
    </div>
  `;
}

function renderRecordingCalendar() {
  if (state.records.length === 0) return "";
  const cal = calcMonthlyRecordingMap(state.records);
  const todayStr = todayLocal();
  const dayHeaders = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    .map((d) => `<div class="rec-cal-header">${t("recCal." + d)}</div>`).join("");
  const firstDow = cal.days[0].dayOfWeek;
  const blanks = Array.from({ length: firstDow }, () => `<div class="rec-cal-blank"></div>`).join("");
  const cells = cal.days.map((d) => {
    const isToday = d.date === todayStr;
    const isFuture = d.date > todayStr;
    const cls = isFuture ? "future" : d.recorded ? "recorded" : "missed";
    const title = d.recorded ? `${d.date}: ${d.weight.toFixed(1)}kg` : d.date;
    return `<div class="rec-cal-cell ${cls}${isToday ? " today" : ""}" title="${title}"><span>${d.day}</span></div>`;
  }).join("");
  const elapsed = cal.days.filter((d) => d.date <= todayStr).length;
  const adjustedRate = elapsed > 0 ? Math.round((cal.recordedCount / elapsed) * 100) : 0;
  const rateText = t("recCal.rate").replace("{rate}", adjustedRate).replace("{count}", cal.recordedCount).replace("{total}", elapsed);
  return `
    <div class="rec-cal-section">
      <div class="helper">${t("recCal.title")}</div>
      <div class="rec-cal-grid">${dayHeaders}${blanks}${cells}</div>
      <div class="helper hint-small" style="margin-top:6px">${rateText}</div>
    </div>
  `;
}

function renderTrendIndicator() {
  const trend = calcWeightTrendIndicator(state.records);
  if (!trend) return "";
  const arrow = trend.direction === "down" ? "↓" : trend.direction === "up" ? "↑" : "→";
  const cls = trend.direction === "down" ? "trend-down" : trend.direction === "up" ? "trend-up" : "trend-stable";
  let msg;
  if (trend.direction === "down") {
    msg = `${Math.abs(trend.change).toFixed(1)}kg ${t("trend.down")}`;
  } else if (trend.direction === "up") {
    msg = `+${trend.change.toFixed(1)}kg ${t("trend.up")}`;
  } else {
    msg = t("trend.stable");
  }
  const recentText = t("trend.recent").replace("{avg}", trend.recentAvg.toFixed(1));
  return `
    <div class="trend-card ${cls}">
      <span class="trend-arrow">${arrow}</span>
      <div class="trend-text">
        <div class="trend-msg">${msg}</div>
        <div class="trend-detail">${recentText}</div>
      </div>
    </div>
  `;
}

function renderNoteTagStats() {
  const stats = calcNoteTagStats(state.records);
  if (stats.tags.length === 0) return "";
  const tagIcons = { exercise: "🏃", diet: "🥗", cheatday: "🍕", sick: "🤒", travel: "✈️", stress: "😰", sleep: "😴", alcohol: "🍺" };
  const rows = stats.tags.slice(0, 6).map((t_) => {
    const icon = tagIcons[t_.tag] || "🏷️";
    const changeSign = t_.avgChange > 0 ? "+" : "";
    const changeClass = t_.avgChange < 0 ? "tag-stat-down" : t_.avgChange > 0 ? "tag-stat-up" : "";
    return `<div class="tag-stat-row">
      <span class="tag-stat-name">${icon} ${escapeAttr(t_.tag)}</span>
      <span class="tag-stat-count">${t("tagStats.count").replace("{count}", t_.count).replace("{pct}", t_.pct)}</span>
      <span class="tag-stat-change ${changeClass}">${changeSign}${t_.avgChange.toFixed(1)}kg</span>
    </div>`;
  }).join("");
  return `
    <div class="tag-stats-section">
      <div class="helper">${t("tagStats.title")}</div>
      ${rows}
    </div>
  `;
}

function renderIdealWeight() {
  if (!state.profile.heightCm || state.records.length === 0) return "";
  const latest = [...state.records].sort((a, b) => a.dt.localeCompare(b.dt)).pop();
  const ideal = calcIdealWeightRange(Number(state.profile.heightCm), latest.wt);
  if (!ideal) return "";
  const zoneLabel = t("ideal." + ideal.zone);
  const rangeText = t("ideal.range").replace("{min}", Number(ideal.minWeight).toFixed(1)).replace("{max}", Number(ideal.maxWeight).toFixed(1));
  const currentText = t("ideal.current").replace("{weight}", Number(ideal.currentWeight).toFixed(1)).replace("{bmi}", Number(ideal.currentBMI).toFixed(1));
  const centerText = t("ideal.center").replace("{mid}", Number(ideal.midWeight).toFixed(1));
  // Position marker on a gradient bar
  const idealStart = Math.round(((18.5 - 15) / 15) * 100);
  const idealEnd = Math.round(((24.9 - 15) / 15) * 100);
  return `
    <div class="ideal-section">
      <div class="helper">${t("ideal.title")}</div>
      <div class="ideal-bar-container">
        <div class="ideal-bar">
          <div class="ideal-zone ideal-under" style="width:${idealStart}%"></div>
          <div class="ideal-zone ideal-normal" style="width:${idealEnd - idealStart}%"></div>
          <div class="ideal-zone ideal-over" style="width:${100 - idealEnd}%"></div>
          <div class="ideal-marker" style="left:${ideal.position}%"></div>
        </div>
        <div class="ideal-labels">
          <span>${t("ideal.underweight")}</span>
          <span>${t("ideal.normal")}</span>
          <span>${t("ideal.overweight")}</span>
        </div>
      </div>
      <div class="helper hint-small">${currentText} — ${zoneLabel}</div>
      <div class="helper hint-small">${rangeText}</div>
      <div class="helper hint-small">${centerText}</div>
    </div>
  `;
}

function renderMonthlyAverages() {
  const months = calcMonthlyAverages(state.records, 6);
  const withData = months.filter((m) => m.avg !== null);
  if (withData.length < 2) return "";
  const allAvgs = withData.map((m) => m.avg);
  const minAvg = Math.min(...allAvgs);
  const maxAvg = Math.max(...allAvgs);
  const range = maxAvg - minAvg || 1;
  const bars = months.map((m, i) => {
    if (m.avg === null) {
      return `<div class="mavg-bar-wrap"><div class="mavg-bar empty"></div><div class="mavg-label">${t("monthAvg.label").replace("{m}", m.label.slice(5))}</div></div>`;
    }
    const pct = Math.max(10, ((m.avg - minAvg) / range) * 80 + 10);
    const prev = i > 0 ? months[i - 1] : null;
    const cls = prev && prev.avg !== null ? (m.avg < prev.avg ? "down" : m.avg > prev.avg ? "up" : "") : "";
    return `<div class="mavg-bar-wrap">
      <div class="mavg-value">${m.avg.toFixed(1)}</div>
      <div class="mavg-bar ${cls}" style="height:${pct}%"></div>
      <div class="mavg-label">${t("monthAvg.label").replace("{m}", m.label.slice(5))}</div>
      <div class="mavg-count">${m.count}</div>
    </div>`;
  }).join("");
  return `
    <div class="mavg-section">
      <div class="helper">${t("monthAvg.title")}</div>
      <div class="mavg-chart">${bars}</div>
    </div>
  `;
}

function renderLongTermProgress() {
  const progress = calcLongTermProgress(state.records);
  if (!progress || progress.periods.every((p) => !p.hasData)) return "";
  const labelMap = { "1m": "ltp.1m", "3m": "ltp.3m", "6m": "ltp.6m", "1y": "ltp.1y", "all": "ltp.all" };
  const rows = progress.periods
    .filter((p) => p.hasData)
    .map((p) => {
      const sign = p.change > 0 ? "+" : "";
      const cls = p.change < 0 ? "down" : p.change > 0 ? "up" : "";
      return `<div class="ltp-row">
        <span class="ltp-label">${t(labelMap[p.label])}</span>
        <span class="ltp-past">${p.pastWeight.toFixed(1)}</span>
        <span class="ltp-arrow">→</span>
        <span class="ltp-current">${progress.current.toFixed(1)}</span>
        <span class="ltp-change ${cls}">${sign}${p.change.toFixed(1)}kg (${sign}${p.pctChange}%)</span>
      </div>`;
    })
    .join("");
  return `
    <div class="ltp-section">
      <div class="helper">${t("ltp.title")}</div>
      ${rows}
    </div>
  `;
}

function renderWeightFluctuation() {
  const fluct = calcWeightFluctuation(state.records);
  if (!fluct) return "";
  const withData = fluct.periods.filter((p) => p.hasData);
  if (withData.length === 0) return "";
  const labelMap = { "7d": "fluct.7d", "30d": "fluct.30d" };
  const rows = withData.map((p) => {
    const pos = Math.max(0, Math.min(100, p.position));
    return `<div class="fluct-row">
      <span class="fluct-label">${t(labelMap[p.label])}</span>
      <div class="fluct-bar-wrap">
        <span class="fluct-min">${p.min.toFixed(1)}</span>
        <div class="fluct-bar">
          <div class="fluct-marker" style="left:${pos}%"></div>
        </div>
        <span class="fluct-max">${p.max.toFixed(1)}</span>
      </div>
      <span class="fluct-range">${t("fluct.range")} ${p.range.toFixed(1)}kg</span>
    </div>`;
  }).join("");
  return `
    <div class="fluct-section">
      <div class="helper">${t("fluct.title")}</div>
      ${rows}
    </div>
  `;
}

function renderWeightAnomalies() {
  const anomalies = calcWeightAnomalies(state.records);
  if (anomalies.length === 0) return "";
  const rows = anomalies.slice(0, 5).map((a) => {
    const text = t("anomaly.entry")
      .replace("{date}", a.dt.slice(5).replace("-", "/"))
      .replace("{wt}", a.wt.toFixed(1))
      .replace("{expected}", a.expected.toFixed(1))
      .replace("{diff}", a.diff.toFixed(1));
    return `<div class="anomaly-row">⚠️ ${text}</div>`;
  }).join("");
  return `
    <div class="anomaly-section">
      <div class="helper">${t("anomaly.title")}</div>
      <div class="helper hint-small">${t("anomaly.hint")}</div>
      ${rows}
    </div>
  `;
}

function renderSuccessRate() {
  const sr = calcSuccessRate(state.records);
  if (!sr) return "";
  const total = sr.down + sr.same + sr.up;
  const downPct = Math.round((sr.down / total) * 100);
  const samePct = Math.round((sr.same / total) * 100);
  const upPct = 100 - downPct - samePct;
  return `
    <div class="success-section">
      <div class="helper">${t("success.title")}</div>
      <div class="success-rate-big">${sr.successRate}%</div>
      <div class="success-bar">
        <div class="success-seg down" style="width:${downPct}%" title="${t("success.down")} ${downPct}%"></div>
        <div class="success-seg same" style="width:${samePct}%" title="${t("success.same")} ${samePct}%"></div>
        <div class="success-seg up" style="width:${upPct}%" title="${t("success.up")} ${upPct}%"></div>
      </div>
      <div class="success-legend">
        <span class="success-leg-item"><span class="success-dot down"></span>${t("success.down")} ${sr.down}</span>
        <span class="success-leg-item"><span class="success-dot same"></span>${t("success.same")} ${sr.same}</span>
        <span class="success-leg-item"><span class="success-dot up"></span>${t("success.up")} ${sr.up}</span>
      </div>
      ${sr.recentRate !== null ? `<div class="helper hint-small" style="margin-top:4px;">${t("success.recent")}: ${sr.recentRate}%</div>` : ""}
    </div>
  `;
}

function renderRecordingRate() {
  const rr = calcRecordingRate(state.records);
  if (!rr) return "";
  const summary = t("recRate.summary").replace("{recorded}", rr.recordedDays).replace("{total}", rr.totalDays);
  const weekBars = rr.weeks.map((w) => {
    const pct = w.total > 0 ? Math.round((w.recorded / w.total) * 100) : 0;
    return `<div class="rr-week">
      <div class="rr-bar-track"><div class="rr-bar-fill" style="width:${pct}%"></div></div>
      <span class="rr-week-label">${w.recorded}/${w.total}</span>
    </div>`;
  }).join("");
  return `
    <div class="rr-section">
      <div class="helper">${t("recRate.title")}</div>
      <div class="rr-rate-big">${rr.rate}%</div>
      <div class="helper hint-small">${summary}</div>
      <div class="helper hint-small" style="margin-top:6px;">${t("recRate.weeks")}</div>
      <div class="rr-weeks">${weekBars}</div>
    </div>
  `;
}

function renderMilestoneHistory() {
  const mh = calcMilestoneHistory(state.records);
  if (!mh || mh.milestones.length === 0) return "";
  const dirLabel = mh.direction === "down" ? t("msHist.down") : t("msHist.up");
  const recent = mh.milestones.slice(-8).reverse();
  const rows = recent.map((m) => {
    const text = t("msHist.reached")
      .replace("{kg}", m.kg)
      .replace("{date}", m.date.slice(5).replace("-", "/"))
      .replace("{days}", m.daysFromStart);
    return `<div class="msh-row">${mh.direction === "down" ? "📉" : "📈"} ${text}</div>`;
  }).join("");
  return `
    <div class="msh-section">
      <div class="helper">${t("msHist.title")}</div>
      <div class="helper hint-small">${dirLabel}</div>
      ${rows}
    </div>
  `;
}

function renderWeightJourney() {
  const journey = calcWeightJourney(state.records);
  if (!journey || journey.phases.length === 0) return "";
  const typeLabel = { loss: "journey.loss", gain: "journey.gain", maintain: "journey.maintain" };
  const typeIcon = { loss: "📉", gain: "📈", maintain: "➡️" };
  const typeCls = { loss: "loss", gain: "gain", maintain: "maintain" };
  const rows = journey.phases.slice(-6).map((p) => {
    const sign = p.change > 0 ? "+" : "";
    return `<div class="jny-row ${typeCls[p.type]}">
      <span class="jny-icon">${typeIcon[p.type]}</span>
      <span class="jny-type">${t(typeLabel[p.type])}</span>
      <span class="jny-dates">${p.startDate.slice(5).replace("-", "/")}〜${p.endDate.slice(5).replace("-", "/")}</span>
      <span class="jny-change">${sign}${p.change.toFixed(1)}kg</span>
      <span class="jny-days">${p.days}d</span>
    </div>`;
  }).join("");
  const totalSign = journey.totalChange > 0 ? "+" : "";
  return `
    <div class="jny-section">
      <div class="helper">${t("journey.title")}</div>
      ${rows}
      <div class="jny-total">${t("journey.total")}: ${totalSign}${journey.totalChange.toFixed(1)}kg</div>
    </div>
  `;
}

function renderGoalScenarios() {
  const goalWeight = Number(state.settings.goalWeight);
  const scenarios = calcGoalScenarios(state.records, goalWeight);
  if (!scenarios) return "";
  const labelMap = { gentle: "scenario.gentle", moderate: "scenario.moderate", aggressive: "scenario.aggressive" };
  const rows = scenarios.scenarios.map((s) => {
    const weeksText = t("scenario.weeks").replace("{weeks}", s.weeks);
    return `<div class="scn-row">
      <span class="scn-label">${t(labelMap[s.label])}</span>
      <span class="scn-rate">${Math.abs(s.pace).toFixed(2)}kg${t("scenario.perWeek")}</span>
      <span class="scn-weeks">${weeksText}</span>
      <span class="scn-date">${s.date.slice(2).replace(/-/g, "/")}</span>
    </div>`;
  }).join("");
  return `
    <div class="scn-section">
      <div class="helper">${t("scenario.title")}</div>
      ${rows}
    </div>
  `;
}

function renderStreakCalendar() {
  if (state.records.length < 3) return "";
  const cal = calcStreakCalendar(state.records, 12);
  const cells = cal.weeks.map((week) => {
    const days = week.map((d) => {
      const cls = d.recorded ? "sc-day filled" : "sc-day";
      const todayCls = d.isToday ? " sc-today" : "";
      return `<div class="${cls}${todayCls}" title="${d.date}"></div>`;
    }).join("");
    return `<div class="sc-week">${days}</div>`;
  }).join("");
  const summary = t("streakCal.summary")
    .replace("{recorded}", cal.totalRecorded)
    .replace("{total}", cal.totalDays);
  return `
    <div class="sc-section">
      <div class="helper">${t("streakCal.title")}</div>
      <div class="sc-grid">${cells}</div>
      <div class="helper hint-small">${summary}</div>
    </div>
  `;
}

function renderMovingAvgCrossover() {
  const data = calcMovingAvgCrossover(state.records);
  if (!data.shortMA) return "";

  const trendLabel = data.currentTrend === "downtrend" ? t("cross.downtrend")
    : data.currentTrend === "uptrend" ? t("cross.uptrend") : t("cross.neutral");
  const trendIcon = data.currentTrend === "downtrend" ? "📉" : data.currentTrend === "uptrend" ? "📈" : "➡️";
  const trendCls = data.currentTrend === "downtrend" ? "mac-down" : data.currentTrend === "uptrend" ? "mac-up" : "mac-neutral";

  const crossRows = data.crossovers.length
    ? data.crossovers.slice(-5).reverse().map((c) => {
        const icon = c.type === "golden" ? "🟢" : "🔴";
        const label = c.type === "golden" ? t("cross.golden") : t("cross.death");
        return `<div class="mac-row"><span class="mac-icon">${icon}</span><span class="mac-date">${c.date.slice(5).replace("-", "/")}</span><span class="mac-label">${label}</span></div>`;
      }).join("")
    : `<div class="helper hint-small">${t("cross.none")}</div>`;

  return `
    <div class="mac-section">
      <div class="helper">${t("cross.title")}</div>
      <div class="mac-trend ${trendCls}">
        <span class="mac-trend-icon">${trendIcon}</span>
        <span class="mac-trend-text">${trendLabel}</span>
      </div>
      <div class="mac-ma-row">
        <span>${t("cross.shortMA")}: <strong>${data.shortMA.toFixed(1)}kg</strong></span>
        <span>${t("cross.longMA")}: <strong>${data.longMA.toFixed(1)}kg</strong></span>
      </div>
      ${crossRows}
    </div>
  `;
}

function renderPredictionAccuracy() {
  const data = calcPredictionAccuracy(state.records);
  if (data.accuracy === null) return "";

  const ratingLabels = { excellent: t("pred.excellent"), good: t("pred.good"), fair: t("pred.fair"), poor: t("pred.poor") };
  const ratingColors = { excellent: "pa-excellent", good: "pa-good", fair: "pa-fair", poor: "pa-poor" };
  const ratingLabel = ratingLabels[data.rating] || data.rating;
  const ratingCls = ratingColors[data.rating] || "";

  const recentRows = data.predictions.slice(-5).reverse().map((p) =>
    `<div class="pa-row"><span class="pa-date">${p.date.slice(5).replace("-", "/")}</span><span class="pa-pred">${p.predicted.toFixed(1)}</span><span class="pa-arrow">→</span><span class="pa-actual">${p.actual.toFixed(1)}</span><span class="pa-err ${p.error <= 0.5 ? "pa-hit" : "pa-miss"}">±${p.error.toFixed(1)}</span></div>`
  ).join("");

  return `
    <div class="pa-section">
      <div class="helper">${t("pred.title")}</div>
      <div class="pa-summary">
        <div class="pa-stat">
          <span class="pa-big ${ratingCls}">${data.accuracy}%</span>
          <span class="pa-label">${t("pred.accuracy")}</span>
        </div>
        <div class="pa-stat">
          <span class="pa-big">${data.avgError.toFixed(1)}kg</span>
          <span class="pa-label">${t("pred.avgError")}</span>
        </div>
        <div class="pa-badge ${ratingCls}">${ratingLabel}</div>
      </div>
      <div class="pa-recent">
        <div class="helper hint-small">${t("pred.recent")}</div>
        <div class="pa-header"><span>${""}</span><span>${t("pred.predicted")}</span><span></span><span>${t("pred.actual")}</span><span></span></div>
        ${recentRows}
      </div>
    </div>
  `;
}

function renderConsistencyScore() {
  const goalWeight = Number(state.settings.goalWeight);
  const data = calcConsistencyScore(state.records, goalWeight);
  if (data.score === null) return "";

  const gradeColors = { S: "cs-s", A: "cs-a", B: "cs-b", C: "cs-c", D: "cs-d" };
  const gradeCls = gradeColors[data.grade] || "";

  const bar = (label, value) =>
    `<div class="cs-bar-row"><span class="cs-bar-label">${label}</span><div class="cs-bar-track"><div class="cs-bar-fill" style="width:${value}%"></div></div><span class="cs-bar-val">${value}</span></div>`;

  return `
    <div class="cs-section">
      <div class="helper">${t("cscore.title")}</div>
      <div class="cs-top">
        <div class="cs-score-circle ${gradeCls}">
          <span class="cs-score-num">${data.score}</span>
          <span class="cs-score-label">/100</span>
        </div>
        <div class="cs-grade ${gradeCls}">${data.grade}</div>
      </div>
      <div class="cs-bars">
        ${bar(t("cscore.recording"), data.components.recording)}
        ${bar(t("cscore.stability"), data.components.stability)}
        ${bar(t("cscore.momentum"), data.components.momentum)}
      </div>
    </div>
  `;
}

function renderWeightRangeSummary() {
  const data = calcWeightRangeSummary(state.records);
  if (!data.periods.length) return "";

  const labelMap = { "7d": t("wrange.7d"), "30d": t("wrange.30d"), "90d": t("wrange.90d"), "all": t("wrange.all") };
  // Find global min/max for visual scaling
  const globalMin = Math.min(...data.periods.map((p) => p.min));
  const globalMax = Math.max(...data.periods.map((p) => p.max));
  const spread = globalMax - globalMin || 1;

  const rows = data.periods.map((p) => {
    const leftPct = ((p.min - globalMin) / spread * 80).toFixed(1);
    const widthPct = Math.max(2, ((p.range) / spread * 80)).toFixed(1);
    const avgPct = ((p.avg - globalMin) / spread * 80).toFixed(1);
    return `<div class="wr-row">
      <span class="wr-label">${labelMap[p.label] || p.label}</span>
      <div class="wr-bar-wrap">
        <div class="wr-bar" style="left:${leftPct}%;width:${widthPct}%">
          <div class="wr-avg-marker" style="left:${p.range > 0 ? ((p.avg - p.min) / p.range * 100).toFixed(1) : 50}%"></div>
        </div>
      </div>
      <span class="wr-vals">${p.min.toFixed(1)}–${p.max.toFixed(1)}</span>
    </div>`;
  }).join("");

  return `
    <div class="wr-section">
      <div class="helper">${t("wrange.title")}</div>
      <div class="wr-legend">
        <span>${t("wrange.min")}: ${globalMin.toFixed(1)}</span>
        <span>${t("wrange.max")}: ${globalMax.toFixed(1)}</span>
      </div>
      ${rows}
    </div>
  `;
}

function renderTrendStreak() {
  const data = calcTrendStreak(state.records);
  if (!data.direction || data.count < 2) return "";

  const msgKey = `tstreak.${data.direction}`;
  const msg = t(msgKey).replace("{count}", data.count);
  const cls = data.direction === "down" ? "ts-down" : data.direction === "up" ? "ts-up" : "ts-flat";
  const changeSign = data.totalChange > 0 ? "+" : "";

  return `
    <div class="ts-section ${cls}">
      <div class="ts-msg">${msg}</div>
      <div class="ts-detail">
        <span>${t("tstreak.change")}: <strong>${changeSign}${data.totalChange.toFixed(1)}kg</strong></span>
        <span>${t("tstreak.period")}: ${data.startDate.slice(5).replace("-", "/")} → ${data.endDate.slice(5).replace("-", "/")}</span>
      </div>
    </div>
  `;
}

function renderBMITrend() {
  const data = calcBMITrend(state.records);
  if (!data.current) return "";

  const dirLabel = t(`bmiTrend.${data.direction}`);
  const dirCls = data.direction === "down" ? "bt-down" : data.direction === "up" ? "bt-up" : "bt-neutral";
  const changeSign = data.change > 0 ? "+" : "";

  // Sparkline: render as inline SVG
  const pts = data.points;
  const svgW = 200, svgH = 40;
  const bMin = data.min - 0.5, bMax = data.max + 0.5, bRange = bMax - bMin || 1;
  const pathD = pts.map((p, i) => {
    const x = (i / Math.max(pts.length - 1, 1)) * svgW;
    const y = svgH - ((p.bmi - bMin) / bRange) * svgH;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `
    <div class="bt-section">
      <div class="helper">${t("bmiTrend.title")}</div>
      <div class="bt-top">
        <div class="bt-current">
          <span class="bt-big">${data.current.toFixed(1)}</span>
          <span class="bt-badge ${dirCls}">${changeSign}${data.change.toFixed(1)} ${dirLabel}</span>
        </div>
        <svg class="bt-spark" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none">
          <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
      </div>
      <div class="bt-meta">
        <span>${t("bmiTrend.range")}: ${data.min.toFixed(1)} – ${data.max.toFixed(1)}</span>
        <span>${pts.length} ${t("chart.records")}</span>
      </div>
    </div>
  `;
}

function renderWeeklySummaryComparison() {
  const data = calcWeeklySummaryComparison(state.records);
  if (!data.diffs) return "";

  const tw = data.thisWeek;
  const lw = data.lastWeek;
  const d = data.diffs;

  function diffCell(val) {
    if (val === 0) return `<span class="wc-zero">±0</span>`;
    const cls = val < 0 ? "wc-neg" : "wc-pos";
    return `<span class="${cls}">${val > 0 ? "+" : ""}${typeof val === "number" && !Number.isInteger(val) ? val.toFixed(1) : val}</span>`;
  }

  const metrics = [
    { label: t("wcomp.avg"), tw: tw.avg.toFixed(1), lw: lw.avg.toFixed(1), diff: d.avg },
    { label: t("wcomp.min"), tw: tw.min.toFixed(1), lw: lw.min.toFixed(1), diff: d.min },
    { label: t("wcomp.max"), tw: tw.max.toFixed(1), lw: lw.max.toFixed(1), diff: d.max },
    { label: t("wcomp.count"), tw: tw.count, lw: lw.count, diff: d.count },
  ];

  const rows = metrics.map((m) =>
    `<div class="wc-row"><span class="wc-label">${m.label}</span><span class="wc-val">${m.lw}</span><span class="wc-val">${m.tw}</span><span class="wc-val">${diffCell(m.diff)}</span></div>`
  ).join("");

  return `
    <div class="wc-section">
      <div class="helper">${t("wcomp.title")}</div>
      <div class="wc-header"><span></span><span>${t("wcomp.lastWeek")}</span><span>${t("wcomp.thisWeek")}</span><span>${t("wcomp.diff")}</span></div>
      ${rows}
    </div>
  `;
}

function renderGoalProgressRing() {
  const goalWeight = Number(state.settings.goalWeight);
  const data = calcGoalProgressRing(state.records, goalWeight);
  if (!data) return "";

  const r = 54, cx = 60, cy = 60, stroke = 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (data.percent / 100) * circ;
  const trackColor = "var(--border)";
  const fillColor = data.percent >= 100 ? "var(--ok)" : data.onTrack ? "var(--accent)" : "var(--error)";

  const statusLabel = data.percent >= 100 ? t("gring.done")
    : data.onTrack ? t("gring.onTrack") : t("gring.offTrack");
  const statusCls = data.percent >= 100 ? "gr-done" : data.onTrack ? "gr-on" : "gr-off";
  const rateSign = data.weeklyRate > 0 ? "-" : data.weeklyRate < 0 ? "+" : "";
  const etaText = data.estimatedWeeks ? t("gring.eta").replace("{weeks}", data.estimatedWeeks) : "";

  return `
    <div class="gr-section">
      <div class="helper">${t("gring.title")}</div>
      <div class="gr-layout">
        <svg class="gr-ring" viewBox="0 0 120 120">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="${stroke}"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${fillColor}" stroke-width="${stroke}"
            stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
            stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"
            style="transition:stroke-dashoffset 0.5s ease"/>
          <text x="${cx}" y="${cy - 6}" text-anchor="middle" class="gr-pct-text">${data.percent}%</text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="gr-goal-text">${data.goalWeight.toFixed(1)}kg</text>
        </svg>
        <div class="gr-stats">
          <div class="gr-stat"><span class="gr-stat-label">${t("gring.lost")}</span><span class="gr-stat-val">${data.lost.toFixed(1)}kg</span></div>
          <div class="gr-stat"><span class="gr-stat-label">${t("gring.remaining")}</span><span class="gr-stat-val">${data.remaining.toFixed(1)}kg</span></div>
          <div class="gr-stat"><span class="gr-stat-label">${t("gring.rate")}</span><span class="gr-stat-val">${rateSign}${Math.abs(data.weeklyRate).toFixed(1)}kg/w</span></div>
          <div class="gr-badge ${statusCls}">${statusLabel}</div>
          ${etaText ? `<div class="gr-eta">${etaText}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderBodyFatTrend() {
  const data = calcBodyFatTrend(state.records);
  if (!data.current || data.points.length < 2) return "";

  const dirLabel = t(`bfTrend.${data.direction}`);
  const dirCls = data.direction === "down" ? "bft-down" : data.direction === "up" ? "bft-up" : "bft-neutral";
  const changeSign = data.change > 0 ? "+" : "";

  // Sparkline SVG
  const pts = data.points;
  const svgW = 200, svgH = 40;
  const bMin = data.min - 0.5, bMax = data.max + 0.5, bRange = bMax - bMin || 1;
  const pathD = pts.map((p, i) => {
    const x = (i / Math.max(pts.length - 1, 1)) * svgW;
    const y = svgH - ((p.bf - bMin) / bRange) * svgH;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `
    <div class="bft-section">
      <div class="helper">${t("bfTrend.title")}</div>
      <div class="bft-top">
        <div class="bft-current">
          <span class="bft-big">${data.current.toFixed(1)}%</span>
          <span class="bft-badge ${dirCls}">${changeSign}${data.change.toFixed(1)}% ${dirLabel}</span>
        </div>
        <svg class="bft-spark" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none">
          <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
      </div>
      <div class="bft-meta">
        <span>${t("bfTrend.avg")}: ${data.avg.toFixed(1)}%</span>
        <span>${t("bfTrend.range")}: ${data.min.toFixed(1)}–${data.max.toFixed(1)}%</span>
      </div>
    </div>
  `;
}

function renderDailyTarget() {
  const goalWeight = Number(state.settings.goalWeight);
  if (!goalWeight || state.records.length < 2) return "";
  const data = calcDailyTarget(state.records, goalWeight);
  if (!data) return "";

  let statusMsg, statusCls;
  if (data.onTarget) {
    statusMsg = t("dtarget.onTarget");
    statusCls = "dt-on";
  } else if (data.isAbove) {
    statusMsg = t("dtarget.above").replace("{diff}", Math.abs(data.diff).toFixed(1));
    statusCls = "dt-above";
  } else {
    statusMsg = t("dtarget.below").replace("{diff}", Math.abs(data.diff).toFixed(1));
    statusCls = "dt-below";
  }

  const paceStr = t("dtarget.pace").replace("{pace}", Math.abs(data.pace).toFixed(2));

  return `
    <div class="dt-section">
      <div class="helper">${t("dtarget.title")}</div>
      <div class="dt-grid">
        <div class="dt-cell">
          <span class="dt-label">${t("dtarget.target")}</span>
          <span class="dt-val">${data.target}kg</span>
        </div>
        <div class="dt-cell">
          <span class="dt-label">${t("dtarget.current")}</span>
          <span class="dt-val">${data.current}kg</span>
        </div>
      </div>
      <div class="dt-status ${statusCls}">${statusMsg}</div>
      <div class="dt-pace">${paceStr}</div>
    </div>
  `;
}

function renderMonthPhaseAvg() {
  const data = calcMonthPhaseAvg(state.records);
  if (!data) return "";

  const phaseLabels = {
    early: t("mphase.early"),
    mid: t("mphase.mid"),
    late: t("mphase.late"),
    end: t("mphase.end"),
  };

  const rows = data.phases.map((p) => {
    if (p.avg === null) return "";
    const changeStr = p.change !== null && p.change !== 0
      ? `<span class="mp-change ${p.change > 0 ? "mp-up" : "mp-down"}">${p.change > 0 ? "+" : ""}${p.change.toFixed(2)}kg</span>`
      : "";
    return `
      <div class="mp-row">
        <span class="mp-label">${phaseLabels[p.label]}</span>
        <span class="mp-avg">${p.avg}kg</span>
        ${changeStr}
        <span class="mp-count">${p.count} ${t("mphase.records")}</span>
      </div>
    `;
  }).join("");

  const statusMsg = data.hasPattern ? t("mphase.pattern") : t("mphase.noPattern");
  const statusCls = data.hasPattern ? "mp-has-pattern" : "mp-stable";

  return `
    <div class="mp-section">
      <div class="helper">${t("mphase.title")}</div>
      ${rows}
      <div class="mp-status ${statusCls}">${statusMsg}</div>
    </div>
  `;
}

function renderStreakFreeze() {
  const data = calcStreakFreezeInfo(state.records);
  if (data.currentStreak < 3 && data.freezesEarned === 0) return "";

  return `
    <div class="sf-section">
      <div class="helper">${t("sfreeze.title")}</div>
      <div class="sf-grid">
        <div class="sf-cell">
          <span class="sf-num">${data.currentStreak}</span>
          <span class="sf-label">${t("sfreeze.current")}</span>
        </div>
        <div class="sf-cell">
          <span class="sf-num">${data.longestStreak}</span>
          <span class="sf-label">${t("sfreeze.longest")}</span>
        </div>
        <div class="sf-cell sf-highlight">
          <span class="sf-num">${data.freezesAvailable}</span>
          <span class="sf-label">${t("sfreeze.available")}</span>
        </div>
      </div>
      <div class="sf-detail">
        <span>${t("sfreeze.earned")}: ${data.freezesEarned}</span>
        <span>${t("sfreeze.used")}: ${data.freezesUsed}</span>
      </div>
      <div class="sf-info">${t("sfreeze.info")}</div>
    </div>
  `;
}

function renderRecentWeightBars() {
  const goalWeight = Number(state.settings.goalWeight);
  const data = calcRecentWeightBars(state.records, goalWeight, 7);
  if (!data) return "";

  const barsHtml = data.bars.map((b) => {
    const changeCls = b.change !== null ? (b.change < 0 ? "rb-down" : b.change > 0 ? "rb-up" : "") : "";
    const changeStr = b.change !== null ? `<span class="rb-change ${changeCls}">${b.change > 0 ? "+" : ""}${b.change.toFixed(1)}</span>` : "";
    return `
      <div class="rb-col">
        <div class="rb-val">${b.wt.toFixed(1)}</div>
        ${changeStr}
        <div class="rb-bar-wrap">
          <div class="rb-bar" style="height:${Math.max(b.pct, 3)}%"></div>
        </div>
        <div class="rb-date">${b.dt.slice(5).replace("-", "/")}</div>
      </div>
    `;
  }).join("");

  const goalLine = data.goalPct !== null
    ? `<div class="rb-goal-line" style="bottom:${data.goalPct}%"><span class="rb-goal-label">${t("rbars.goal")}</span></div>`
    : "";

  return `
    <div class="rb-section">
      <div class="helper">${t("rbars.title")}</div>
      <div class="rb-chart">
        ${goalLine}
        ${barsHtml}
      </div>
    </div>
  `;
}

function renderWeightAnniversary() {
  const data = calcWeightAnniversary(state.records);
  if (!data || data.trackingDays < 7) return "";

  const changeSign = data.totalChange > 0 ? "+" : "";
  const changeCls = data.totalChange < 0 ? "av-loss" : data.totalChange > 0 ? "av-gain" : "";

  const milestoneHtml = data.milestones.map((m) => {
    if (!m.reached && data.trackingDays < m.days * 0.8) return "";
    const label = t(`anniv.${m.label}`);
    if (m.reached) {
      const mChangeSign = m.changeAtMilestone > 0 ? "+" : "";
      const mCls = m.changeAtMilestone < 0 ? "av-loss" : m.changeAtMilestone > 0 ? "av-gain" : "";
      return `<div class="av-milestone av-done"><span class="av-ms-label">${label}</span><span class="av-ms-val ${mCls}">${mChangeSign}${m.changeAtMilestone}kg</span></div>`;
    }
    const daysLeft = m.days - data.trackingDays;
    return `<div class="av-milestone av-pending"><span class="av-ms-label">${label}</span><span class="av-ms-soon">${t("anniv.upcoming")} (${daysLeft}${t("sfreeze.days")})</span></div>`;
  }).filter(Boolean).join("");

  return `
    <div class="av-section">
      <div class="helper">${t("anniv.title")}</div>
      <div class="av-header">${t("anniv.tracking").replace("{days}", data.trackingDays)}</div>
      <div class="av-summary">
        <span>${t("anniv.start")}: ${data.startWeight.toFixed(1)}kg</span>
        <span class="${changeCls}">${t("anniv.total")}: ${changeSign}${data.totalChange}kg</span>
      </div>
      <div class="av-milestones">${milestoneHtml}</div>
    </div>
  `;
}

function renderTrendForecast() {
  const data = calcTrendForecast(state.records, 14);
  if (!data || data.forecast.length < 8) return "";

  const weeklyChange = +(data.slope * 7).toFixed(2);
  const trendLabel = weeklyChange < -0.05 ? t("tfc.losing") : weeklyChange > 0.05 ? t("tfc.gaining") : t("tfc.stable");
  const trendCls = weeklyChange < -0.05 ? "fc-loss" : weeklyChange > 0.05 ? "fc-gain" : "fc-stable";

  const day7 = data.forecast.find((f) => f.dayOffset === 7);
  const day14 = data.forecast.find((f) => f.dayOffset === 14);
  const current = data.forecast[0]?.weight;

  return `
    <div class="fc-section">
      <div class="helper">${t("tfc.title")}</div>
      <div class="fc-trend ${trendCls}">
        ${trendLabel} · ${weeklyChange > 0 ? "+" : ""}${weeklyChange}kg ${t("tfc.perWeek")}
      </div>
      <div class="fc-grid">
        ${day7 ? `<div class="fc-cell">
          <span class="fc-label">${t("tfc.in7days")}</span>
          <span class="fc-val">${day7.weight.toFixed(1)}kg</span>
          <span class="fc-diff ${(day7.weight - current) < 0 ? "fc-loss" : "fc-gain"}">${(day7.weight - current) > 0 ? "+" : ""}${(day7.weight - current).toFixed(1)}</span>
        </div>` : ""}
        ${day14 ? `<div class="fc-cell">
          <span class="fc-label">${t("tfc.in14days")}</span>
          <span class="fc-val">${day14.weight.toFixed(1)}kg</span>
          <span class="fc-diff ${(day14.weight - current) < 0 ? "fc-loss" : "fc-gain"}">${(day14.weight - current) > 0 ? "+" : ""}${(day14.weight - current).toFixed(1)}</span>
        </div>` : ""}
      </div>
    </div>
  `;
}

function renderDailyChangeDist() {
  const data = calcDailyChangeDist(state.records);
  if (!data || data.buckets.length < 2) return "";

  const maxCount = Math.max(...data.buckets.map((b) => b.count));

  const barsHtml = data.buckets.map((b) => {
    const height = maxCount > 0 ? Math.max((b.count / maxCount) * 100, 3) : 3;
    const cls = b.min >= 0 ? "cd-pos" : "cd-neg";
    return `
      <div class="cd-col">
        <div class="cd-bar-wrap"><div class="cd-bar ${cls}" style="height:${height}%"></div></div>
        <div class="cd-blabel">${b.label}</div>
      </div>
    `;
  }).join("");

  const avgSign = data.avgChange > 0 ? "+" : "";
  const medSign = data.medianChange > 0 ? "+" : "";

  return `
    <div class="cd-section">
      <div class="helper">${t("cdist.title")}</div>
      <div class="cd-chart">${barsHtml}</div>
      <div class="cd-stats">
        <span>${t("cdist.avg")}: ${avgSign}${data.avgChange}kg</span>
        <span>${t("cdist.median")}: ${medSign}${data.medianChange}kg</span>
      </div>
      <div class="cd-range">${t("cdist.normal")}: ${data.normalRange.low > 0 ? "+" : ""}${data.normalRange.low} ${t("cdist.to")} ${data.normalRange.high > 0 ? "+" : ""}${data.normalRange.high}kg</div>
    </div>
  `;
}

function renderGoalStreak() {
  const goalWeight = Number(state.settings.goalWeight);
  if (!goalWeight) return "";
  const data = calcGoalStreak(state.records, goalWeight);
  if (!data || data.streak < 2) return "";

  if (data.direction === "achieved") {
    return `
      <div class="gs-section gs-achieved">
        <div class="helper">${t("gstreak.title")}</div>
        <div class="gs-msg">${t("gstreak.achieved")}</div>
      </div>
    `;
  }

  return `
    <div class="gs-section">
      <div class="helper">${t("gstreak.title")}</div>
      <div class="gs-count">${data.streak}</div>
      <div class="gs-label">${t("gstreak.days")}</div>
      <div class="gs-detail">
        <span>${t("gstreak.dist")}: ${data.currentDist}kg</span>
        <span>${t("gstreak.closest")}: ${data.closestToGoal}kg</span>
      </div>
    </div>
  `;
}

function renderThenVsNow() {
  const data = calcThenVsNow(state.records, 7);
  if (!data) return "";

  const diffSign = data.diff > 0 ? "+" : "";
  const diffCls = data.diff < 0 ? "tvn-loss" : data.diff > 0 ? "tvn-gain" : "";

  return `
    <div class="tvn-section">
      <div class="helper">${t("tvn.title")}</div>
      <div class="tvn-grid">
        <div class="tvn-col tvn-then">
          <div class="tvn-period">${t("tvn.then")}</div>
          <div class="tvn-avg">${data.then.avg}kg</div>
          <div class="tvn-range">${data.then.min}–${data.then.max}kg</div>
        </div>
        <div class="tvn-arrow">${data.diff < 0 ? "📉" : data.diff > 0 ? "📈" : "➡️"}</div>
        <div class="tvn-col tvn-now">
          <div class="tvn-period">${t("tvn.now")}</div>
          <div class="tvn-avg">${data.now.avg}kg</div>
          <div class="tvn-range">${data.now.min}–${data.now.max}kg</div>
        </div>
      </div>
      <div class="tvn-diff ${diffCls}">${t("tvn.change")}: ${diffSign}${data.diff}kg</div>
    </div>
  `;
}

function renderRecordCompleteness() {
  const data = calcRecordCompleteness(state.records);
  if (!data || data.total < 3) return "";

  const barColor = data.level === "excellent" ? "var(--ok)" : data.level === "good" ? "var(--accent-3)" : data.level === "fair" ? "var(--warn)" : "var(--muted)";

  return `
    <div class="rc-section">
      <div class="helper">${t("rcomp.title")}</div>
      <div class="rc-level" style="color:${barColor}">${t("rcomp.level." + data.level)}</div>
      <div class="rc-bars">
        <div class="rc-bar-row"><span class="rc-bar-label">${t("rcomp.bodyFat")}</span><div class="rc-bar-track"><div class="rc-bar-fill" style="width:${data.bodyFatPct}%;background:${barColor}"></div></div><span class="rc-bar-val">${data.bodyFatPct}%</span></div>
        <div class="rc-bar-row"><span class="rc-bar-label">${t("rcomp.note")}</span><div class="rc-bar-track"><div class="rc-bar-fill" style="width:${data.notePct}%;background:${barColor}"></div></div><span class="rc-bar-val">${data.notePct}%</span></div>
        <div class="rc-bar-row"><span class="rc-bar-label">${t("rcomp.tag")}</span><div class="rc-bar-track"><div class="rc-bar-fill" style="width:${data.tagPct}%;background:${barColor}"></div></div><span class="rc-bar-val">${data.tagPct}%</span></div>
      </div>
      ${data.level !== "excellent" ? `<div class="rc-tip">${t("rcomp.tip")}</div>` : ""}
    </div>
  `;
}

function renderWeightPace() {
  const goalWeight = Number(state.settings.goalWeight);
  const data = calcWeightPace(state.records, goalWeight);
  if (!data) return "";

  const paceColor = data.pace === "healthy" ? "var(--ok)" : data.pace === "too_fast" ? "var(--error)" : data.pace === "too_slow" ? "var(--warn)" : "var(--muted)";
  const paceLabel = data.pace === "healthy" ? t("wpace.healthy_pace") : data.pace === "too_fast" ? t("wpace.too_fast") : data.pace === "too_slow" ? t("wpace.too_slow") : t("wpace.maintaining");
  const sign = data.weeklyRate > 0 ? "+" : "";

  return `
    <div class="wp-section">
      <div class="helper">${t("wpace.title")}</div>
      <div class="wp-meter">
        <div class="wp-rate" style="color:${paceColor}">${sign}${data.weeklyRate} kg/${t("wpace.weekly")}</div>
        <div class="wp-badge" style="background:color-mix(in srgb, ${paceColor} 15%, transparent);color:${paceColor}">${paceLabel}</div>
      </div>
      ${data.pace !== "maintaining" ? `<div class="wp-range">${t("wpace.range").replace("{min}", String(data.healthyMin)).replace("{max}", String(data.healthyMax))}</div>` : ""}
    </div>
  `;
}

function renderRecentEntries() {
  const entries = getRecentEntries(state.records, 5);
  if (entries.length === 0) return "";
  const sourceIcons = { manual: "✏️", voice: "🎤", photo: "📷", quick: "⚡", import: "📥" };
  const rows = entries.map((e) => {
    const icon = sourceIcons[e.source] || "✏️";
    const changeStr = e.change !== null
      ? `<span class="recent-change ${e.change < 0 ? "down" : e.change > 0 ? "up" : ""}">${e.change > 0 ? "+" : ""}${e.change.toFixed(1)}</span>`
      : "";
    return `<div class="recent-row">${icon} <span class="recent-date">${e.dt.slice(5).replace("-", "/")}</span><span class="recent-wt">${e.wt.toFixed(1)}kg</span>${changeStr}</div>`;
  }).join("");
  return `
    <div class="recent-entries">
      <div class="helper">${t("recent.title")}</div>
      ${rows}
    </div>
  `;
}

function renderDashboard() {
  const dash = calcDashboardSummary(state.records, Number(state.profile.heightCm));
  if (!dash) return "";
  const changeSign = dash.change > 0 ? "+" : "";
  const changeCls = dash.change < 0 ? "dash-down" : dash.change > 0 ? "dash-up" : "";
  return `
    <div class="dash-grid">
      <div class="dash-card">
        <div class="dash-label">${t("dash.weight")}</div>
        <div class="dash-value">${dash.weight.toFixed(1)}<small>kg</small></div>
      </div>
      <div class="dash-card ${changeCls}">
        <div class="dash-label">${t("dash.change")}</div>
        <div class="dash-value">${changeSign}${dash.change.toFixed(1)}<small>kg</small></div>
      </div>
      <div class="dash-card">
        <div class="dash-label">${t("dash.bmi")}</div>
        <div class="dash-value">${dash.bmi !== null ? dash.bmi.toFixed(1) : "—"}</div>
      </div>
      <div class="dash-card">
        <div class="dash-label">${t("dash.streak")}</div>
        <div class="dash-value">${t("dash.days").replace("{n}", dash.streak)}</div>
      </div>
    </div>
  `;
}

function renderDataFreshness() {
  const fresh = calcDataFreshness(state.records);
  if (!fresh) return "";
  if (fresh.level === "today") return "";
  let msg;
  if (fresh.level === "recent") {
    msg = t("fresh.recent").replace("{days}", fresh.daysSince).replace("{weight}", fresh.lastWeight.toFixed(1));
  } else if (fresh.level === "stale") {
    msg = t("fresh.stale").replace("{days}", fresh.daysSince);
  } else {
    msg = t("fresh.veryStale").replace("{days}", fresh.daysSince);
  }
  const cls = fresh.level === "veryStale" ? "fresh-warn" : fresh.level === "stale" ? "fresh-nudge" : "fresh-info";
  return `<div class="freshness-banner ${cls}">${msg}</div>`;
}

function renderMultiPeriodRate() {
  const data = calcMultiPeriodRate(state.records);
  if (!data) return "";
  const hasAny = data.periods.some((p) => p.hasData);
  if (!hasAny) return "";
  const cols = data.periods.map((p) => {
    if (!p.hasData) {
      return `<div class="mpr-col"><div class="mpr-label">${t("multiRate.days").replace("{days}", p.days)}</div><div class="mpr-value">${t("multiRate.noData")}</div></div>`;
    }
    const sign = p.change > 0 ? "+" : "";
    const cls = p.change < -0.1 ? "mpr-down" : p.change > 0.1 ? "mpr-up" : "mpr-flat";
    const wsign = p.weeklyRate > 0 ? "+" : "";
    return `<div class="mpr-col ${cls}">
      <div class="mpr-label">${t("multiRate.days").replace("{days}", p.days)}</div>
      <div class="mpr-value">${sign}${p.change.toFixed(1)}kg</div>
      <div class="mpr-weekly">${wsign}${p.weeklyRate.toFixed(1)}kg/w</div>
    </div>`;
  }).join("");
  return `
    <div class="mpr-section">
      <div class="helper">${t("multiRate.title")}</div>
      <div class="mpr-grid">${cols}</div>
    </div>
  `;
}

function renderRecordMilestone() {
  const ms = calcRecordMilestone(state.records.length);
  if (!ms) return "";
  if (ms.reached) {
    return `<div class="milestone-banner milestone-reached">${t("milestone.reached").replace("{count}", ms.reached)}</div>`;
  }
  if (ms.remaining <= 5) {
    return `<div class="milestone-banner milestone-close">${t("milestone.next").replace("{next}", ms.next).replace("{remaining}", ms.remaining)}</div>`;
  }
  return "";
}

function renderRecordingTime() {
  const timeStats = calcRecordingTimeStats(state.records);
  if (!timeStats) return "";
  const periods = ["morning", "afternoon", "evening", "night"];
  const icons = { morning: "🌅", afternoon: "☀️", evening: "🌆", night: "🌙" };
  return `
    <div class="time-stats-section">
      <div class="helper">${t("timeStats.title")}</div>
      <div class="time-stats-bar">
        ${periods.filter((p) => timeStats[p].pct > 0).map((p) => `<div class="time-stats-segment time-${p}" style="width:${timeStats[p].pct}%" title="${t("timeStats." + p)}: ${timeStats[p].count} (${timeStats[p].pct}%)"></div>`).join("")}
      </div>
      <div class="time-stats-legend">
        ${periods.map((p) => `<span class="time-stats-item">${icons[p]} ${t("timeStats." + p)} ${timeStats[p].pct}%</span>`).join("")}
      </div>
      <div class="helper hint-small" style="margin-top:4px;">${t("timeStats.most").replace("{period}", t("timeStats." + timeStats.mostCommon))}</div>
    </div>
  `;
}

function renderAICoach() {
  const goalWeight = Number(state.settings.goalWeight);
  const report = generateAICoachReport(state.records, state.profile, goalWeight);
  if (report.grade === "new" && state.records.length < 2) {
    return `
    <section class="ai-coach-panel panel">
      <div class="ai-coach-header">
        <div class="ai-coach-icon">🤖</div>
        <div>
          <h2>${t("ai.title")}</h2>
          <p class="helper">${t("ai.subtitle")}</p>
        </div>
      </div>
      <div class="ai-coach-empty">
        <div class="ai-empty-icon">📊</div>
        <p>${t("ai.advice.start")}</p>
      </div>
    </section>`;
  }

  const gradeColors = { excellent: "var(--ok)", good: "var(--ok)", fair: "var(--warn)", needsWork: "var(--warn)", critical: "var(--error)" };
  const gradeColor = gradeColors[report.grade] || "var(--muted)";
  const scoreAngle = (report.score / 100) * 360;

  return `
    <section class="ai-coach-panel panel">
      <div class="ai-coach-header">
        <div class="ai-coach-icon">🤖</div>
        <div>
          <h2>${t("ai.title")}</h2>
          <p class="helper">${t("ai.subtitle")}</p>
        </div>
        <div class="ai-score-ring" style="--score-angle: ${scoreAngle}deg; --score-color: ${gradeColor}">
          <span class="ai-score-value">${report.score}</span>
          <span class="ai-score-label">${t("ai.grade." + report.grade)}</span>
        </div>
      </div>

      ${report.weeklyReport ? `
      <div class="ai-weekly-report">
        <h3>${t("ai.weeklyReport")}</h3>
        <div class="ai-weekly-grid">
          <div class="ai-weekly-stat">
            <span class="ai-weekly-label">${t("ai.weeklyAvg")}</span>
            <span class="ai-weekly-value">${report.weeklyReport.avg}kg</span>
          </div>
          ${report.weeklyReport.change !== null ? `
          <div class="ai-weekly-stat">
            <span class="ai-weekly-label">${t("ai.weeklyChange")}</span>
            <span class="ai-weekly-value ${report.weeklyReport.change > 0 ? "positive" : report.weeklyReport.change < 0 ? "negative" : ""}">${report.weeklyReport.change > 0 ? "+" : ""}${report.weeklyReport.change}kg</span>
          </div>` : ""}
          <div class="ai-weekly-stat">
            <span class="ai-weekly-label">${t("ai.weeklyRange")}</span>
            <span class="ai-weekly-value">${report.weeklyReport.range}kg</span>
          </div>
          <div class="ai-weekly-stat">
            <span class="ai-weekly-label">${t("ai.weeklyEntries")}</span>
            <span class="ai-weekly-value">${report.weeklyReport.entries}</span>
          </div>
        </div>
      </div>` : ""}

      ${report.highlights.length ? `
      <div class="ai-section ai-highlights">
        <h3>${t("ai.highlights")}</h3>
        <div class="ai-items">
          ${report.highlights.map(h => `<div class="ai-item ai-highlight">${t("ai.highlight." + h)}</div>`).join("")}
        </div>
      </div>` : ""}

      ${report.risks.length ? `
      <div class="ai-section ai-risks">
        <h3>${t("ai.risks")}</h3>
        <div class="ai-items">
          ${report.risks.map(r => `<div class="ai-item ai-risk">${t("ai.risk." + r)}</div>`).join("")}
        </div>
      </div>` : ""}

      ${report.advices.length ? `
      <div class="ai-section ai-advices">
        <h3>${t("ai.advice")}</h3>
        <div class="ai-items">
          ${report.advices.map(a => `<div class="ai-item ai-advice-item">${t("ai.advice." + a)}</div>`).join("")}
        </div>
      </div>` : ""}

      ${report.prediction ? `
      <div class="ai-section ai-prediction">
        <h3>${t("ai.prediction.title")}</h3>
        <div class="ai-prediction-content">
          ${report.prediction.achieved ? t("ai.prediction.achieved")
            : report.prediction.noTrend ? t("ai.prediction.noTrend")
            : report.prediction.insufficient ? t("ai.prediction.insufficient")
            : `<div class="ai-prediction-days">${t("ai.prediction.goalDays").replace("{days}", report.prediction.days)}</div>
               <div class="ai-prediction-date">${t("ai.prediction.goalDate").replace("{date}", report.prediction.predictedDate)}</div>`}
        </div>
      </div>` : ""}
    </section>`;
}

function renderStability() {
  const stability = calcWeightStability(state.records);
  if (!stability) return "";
  const level = stability.score >= 70 ? "high" : stability.score >= 40 ? "medium" : "low";
  return `
    <div class="stability-section">
      <div class="helper">${t("stability.title")}</div>
      <div class="stability-display">
        <div class="stability-score-ring ${level}">
          <span class="stability-score-value">${stability.score}</span>
        </div>
        <div class="stability-details">
          <div class="stability-label ${level}">${t("stability." + level)}</div>
          <div class="helper">${t("stability.stddev")}: ${stability.stdDev.toFixed(2)}kg</div>
          <div class="helper">${t("chart.avg")}: ${stability.avg.toFixed(1)}kg (${stability.count} ${t("chart.records")})</div>
        </div>
      </div>
    </div>
  `;
}

function renderConsistencyStreak() {
  const cs = calcConsistencyStreak(state.records);
  if (!cs || cs.streak < 2) return "";
  return `
    <div class="consistency-section">
      <div class="helper">${t("consistency.title")}</div>
      <div class="consistency-display">
        <span class="consistency-badge${cs.streak >= 5 ? " great" : ""}">${cs.streak >= 5 ? "🎯" : "📊"} ${t("consistency.current").replace("{days}", cs.streak).replace("{tol}", cs.tolerance)}</span>
        ${cs.best > cs.streak ? `<span class="helper hint-small">${t("consistency.best").replace("{days}", cs.best)}</span>` : ""}
        ${cs.streak >= 5 ? `<span class="helper hint-small" style="color:var(--ok);font-weight:600;">${t("consistency.great")}</span>` : ""}
      </div>
    </div>
  `;
}

function renderBMIDistribution() {
  const dist = calcBMIDistribution(state.records);
  if (!dist) return "";
  const zones = [
    { key: "under", color: "var(--accent-3)" },
    { key: "normal", color: "var(--ok)" },
    { key: "over", color: "var(--warn)" },
    { key: "obese", color: "var(--error)" },
  ];
  const bars = zones
    .filter((z) => dist[z.key].pct > 0)
    .map((z) => `<div class="bmi-dist-segment" style="width:${dist[z.key].pct}%;background:${z.color}" title="${t("bmiDist." + z.key)}: ${dist[z.key].count} (${dist[z.key].pct}%)"></div>`)
    .join("");
  const legend = zones
    .map((z) => `<span class="bmi-dist-legend-item"><span class="bmi-dist-dot" style="background:${z.color}"></span>${t("bmiDist." + z.key)} ${dist[z.key].pct}%</span>`)
    .join("");
  return `
    <div class="bmi-dist-section">
      <div class="helper">${t("bmiDist.title")}</div>
      <div class="bmi-dist-bar" role="img" aria-label="${zones.map((z) => `${t("bmiDist." + z.key)}: ${dist[z.key].pct}%`).join(", ")}">${bars}</div>
      <div class="bmi-dist-legend">${legend}</div>
      <div class="helper hint-small" style="margin-top:4px;">${t("bmiDist.total").replace("{count}", dist.total)}</div>
    </div>
  `;
}

function renderWeightPercentile() {
  const pctl = calcWeightPercentile(state.records);
  if (!pctl) return "";
  const level = pctl.percentile <= 20 ? "excellent" : pctl.percentile <= 40 ? "good" : "neutral";
  return `
    <div class="percentile-section">
      <div class="helper">${t("percentile.title")}</div>
      <div class="percentile-display">
        <div class="percentile-ring ${level}">
          <span class="percentile-value">${pctl.percentile}%</span>
        </div>
        <div class="percentile-details">
          <div class="percentile-label">${t("percentile.value").replace("{pct}", pctl.percentile)}</div>
          <div class="helper hint-small">${t("percentile.rank").replace("{rank}", pctl.rank).replace("{total}", pctl.total)}</div>
          ${pctl.percentile <= 10 ? `<div class="helper hint-small" style="color:var(--ok);font-weight:600;">${t("percentile.best")}</div>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderMovingAverages() {
  const ma = calcMovingAverages(state.records);
  if (!ma) return "";
  const signalCls = ma.signal === "below" ? "negative" : ma.signal === "above" ? "positive" : "";
  return `
    <div class="ma-section">
      <div class="helper">${t("ma.title")}</div>
      <div class="ma-display">
        <div class="ma-values">
          <span class="ma-value">${t("ma.short")}: <strong>${ma.shortAvg.toFixed(1)}kg</strong></span>
          <span class="ma-value">${t("ma.long")}: <strong>${ma.longAvg.toFixed(1)}kg</strong></span>
          <span class="ma-diff ${signalCls}">${ma.diff > 0 ? "+" : ""}${ma.diff.toFixed(2)}kg</span>
        </div>
        <div class="helper hint-small">${t("ma." + ma.signal)}</div>
        ${ma.crossing ? `<div class="ma-crossing">${t("ma." + ma.crossing)}</div>` : ""}
      </div>
    </div>
  `;
}

function renderBodyFatStats() {
  const bfStats = calcBodyFatStats(state.records);
  if (!bfStats) return "";
  const changeCls = bfStats.change < 0 ? "loss" : bfStats.change > 0 ? "gain" : "neutral";
  return `
    <div class="bodyfat-stats-section">
      <div class="helper">${t("bodyFat.stats")}</div>
      <div class="stat-grid">
        ${renderStat(t("bodyFat.latest"), `${bfStats.latest.toFixed(1)}%`)}
        ${renderStat(t("bodyFat.change"), `<span class="${changeCls}">${bfStats.change > 0 ? "+" : ""}${bfStats.change.toFixed(1)}%</span>`)}
        ${renderStat(t("bodyFat.min"), `${bfStats.min.toFixed(1)}%`)}
        ${renderStat(t("bodyFat.max"), `${bfStats.max.toFixed(1)}%`)}
      </div>
      <div class="helper hint-small" style="margin-top:4px;">${t("bodyFat.count").replace("{count}", bfStats.count)}</div>
    </div>
  `;
}

function renderDayOfWeekAvg() {
  const dowData = calcDayOfWeekAvg(state.records);
  if (!dowData) return "";
  return `
    <div class="dow-avg-section">
      <div class="helper">${t("dowAvg.title")}</div>
      <div class="dow-avg-row">
        ${dowData.avgs.map((avg, i) => {
          if (avg === null) return "";
          const diff = Math.round((avg - dowData.overallAvg) * 10) / 10;
          const cls = diff < -0.1 ? "loss" : diff > 0.1 ? "gain" : "neutral";
          return `<div class="dow-avg-item">
            <span class="dow-label">${t("day." + i)}</span>
            <span class="dow-value">${avg.toFixed(1)}</span>
            <span class="dow-diff ${cls}">${diff > 0 ? "+" : ""}${diff.toFixed(1)}</span>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;
}

function renderRecordList() {
  let filtered = filterRecords(state.records, recordSearchQuery);
  filtered = filterRecordsByDateRange(filtered, recordDateFrom, recordDateTo);
  const reversed = filtered.slice().reverse();
  const hasFilter = recordSearchQuery || recordDateFrom || recordDateTo;
  const displayed = showAllRecords || hasFilter ? reversed : reversed.slice(0, 5);

  // Find all-time min/max for badge display (only when 3+ records)
  let minDt = null;
  let maxDt = null;
  if (state.records.length >= 3) {
    let minWt = Infinity;
    let maxWt = -Infinity;
    for (const r of state.records) {
      if (r.wt < minWt) { minWt = r.wt; minDt = r.dt; }
      if (r.wt > maxWt) { maxWt = r.wt; maxDt = r.dt; }
    }
  }

  if (hasFilter && displayed.length === 0) {
    return `<div class="empty-state"><div class="helper">${t("records.noMatch")}</div></div>`;
  }

  // Build dt→index map for O(1) lookup instead of O(n) indexOf
  const dtIndex = new Map(state.records.map((r, i) => [r.dt, i]));
  return displayed.map((record) => {
    const idx = dtIndex.get(record.dt) ?? -1;
    const prevRecord = idx > 0 ? state.records[idx - 1] : null;
    let badge = null;
    if (record.dt === minDt) badge = { type: "best", icon: "⭐", label: t("records.best") };
    else if (record.dt === maxDt) badge = { type: "highest", icon: "📍", label: t("records.highest") };
    return renderRecord(record, prevRecord, badge);
  }).join("");
}

function renderPickerIntOptions(selected) {
  let html = "";
  for (let i = 20; i <= 300; i++) {
    html += `<option value="${i}" ${i === selected ? "selected" : ""}>${i}</option>`;
  }
  return html;
}

function renderPickerDecOptions(selected) {
  let html = "";
  for (let i = 0; i <= 9; i++) {
    html += `<option value="${i}" ${i === selected ? "selected" : ""}>${i}</option>`;
  }
  return html;
}

function bindEvents() {
  // Arrow key navigation for tablists (WCAG requirement)
  app.querySelectorAll('[role="tablist"]').forEach((tablist) => {
    tablist.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tabs = [...tablist.querySelectorAll('[role="tab"]')];
      const idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      const next = e.key === "ArrowRight" ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  });

  app.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      if (voiceActive && button.dataset.mode !== "voice") {
        recognition?.stop();
        recognition = null;
        voiceActive = false;
      }
      activeEntryMode = button.dataset.mode;
      render();
      // Focus primary input in the selected mode
      if (activeEntryMode === "manual") {
        document.getElementById("pickerInt")?.focus();
      } else if (activeEntryMode === "voice") {
        app.querySelector("[data-action='toggle-voice']")?.focus();
      } else if (activeEntryMode === "photo") {
        (app.querySelector("[data-action='pick-native-photo']") || app.querySelector("label[for='photoInput']"))?.focus();
      }
    });
  });

  app.querySelector('[data-action="save-profile"]')?.addEventListener("click", saveProfile);
  app.querySelector('[data-action="save-settings"]')?.addEventListener("click", saveSettings);
  app.querySelector('[data-action="save-record"]')?.addEventListener("click", saveRecordFromPicker);
  app.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="confirm-save"]')) {
      const container = document.querySelector(".validate-warnings");
      if (container) { container.style.display = "none"; container.innerHTML = ""; }
      saveRecordFromPicker();
    }
    if (e.target.closest('[data-action="dismiss-warning"]')) {
      const container = document.querySelector(".validate-warnings");
      if (container) { container.style.display = "none"; container.innerHTML = ""; }
      validationBypass = false;
    }
  });
  app.querySelector('[data-action="export-data"]')?.addEventListener("click", exportData);
  app.querySelector('[data-action="reset-data"]')?.addEventListener("click", resetData);
  app.querySelector('[data-action="pick-native-photo"]')?.addEventListener("click", pickNativePhoto);
  app.querySelector('[data-action="toggle-voice"]')?.addEventListener("click", toggleVoiceInput);
  app.querySelector("#photoInput")?.addEventListener("change", handlePhotoSelection);
  app.querySelector("#importInput")?.addEventListener("change", handleImportData);
  app.querySelector('[data-action="quick-save"]')?.addEventListener("click", quickSaveRecord);
  app.querySelector('[data-action="toggle-records"]')?.addEventListener("click", () => {
    showAllRecords = !showAllRecords;
    render();
  });
  app.querySelector('[data-action="toggle-monthly"]')?.addEventListener("click", () => {
    showMonthlyStats = !showMonthlyStats;
    render();
  });
  app.querySelector('[data-action="toggle-analytics"]')?.addEventListener("click", () => {
    showAdvancedAnalytics = !showAdvancedAnalytics;
    render();
  });
  app.querySelector('[data-action="copy-summary"]')?.addEventListener("click", async (e) => {
    const text = e.target.dataset.text;
    try {
      await navigator.clipboard.writeText(text);
      e.target.textContent = t("share.copied");
      clearTimeout(e.target._copyTimer);
      e.target._copyTimer = setTimeout(() => { e.target.textContent = t("share.btn"); }, 2000);
    } catch { /* clipboard not available */ }
  });
  app.querySelector("#recordSearch")?.addEventListener("input", (e) => {
    recordSearchQuery = e.target.value;
    const pos = e.target.selectionStart;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      render();
      const input = document.getElementById("recordSearch");
      if (input) { input.focus(); input.selectionStart = input.selectionEnd = pos; }
    }, 150);
  });
  app.querySelector("#dateRangeFrom")?.addEventListener("change", (e) => {
    recordDateFrom = e.target.value;
    if (recordDateFrom && recordDateTo && recordDateFrom > recordDateTo) {
      recordDateTo = recordDateFrom;
    }
    render();
  });
  app.querySelector("#dateRangeTo")?.addEventListener("change", (e) => {
    recordDateTo = e.target.value;
    if (recordDateFrom && recordDateTo && recordDateFrom > recordDateTo) {
      recordDateFrom = recordDateTo;
    }
    render();
  });
  app.querySelector('[data-action="clear-date-range"]')?.addEventListener("click", () => {
    recordDateFrom = "";
    recordDateTo = "";
    render();
  });
  app.querySelectorAll('[data-action="export-excel"]').forEach((b) => b.addEventListener("click", exportExcel));
  app.querySelectorAll('[data-action="export-csv"]').forEach((b) => b.addEventListener("click", exportCSV));
  app.querySelectorAll('[data-action="export-text"]').forEach((b) => b.addEventListener("click", exportText));
  app.querySelector('[data-action="import-csv"]')?.addEventListener("click", () => {
    document.getElementById("csvImportInput")?.click();
  });
  document.getElementById("csvImportInput")?.addEventListener("change", handleCSVImport);
  app.querySelector('[data-action="save-goal"]')?.addEventListener("click", saveGoal);
  app.querySelector('[data-action="save-reminder"]')?.addEventListener("click", saveReminder);
  app.querySelector('[data-action="google-backup"]')?.addEventListener("click", googleBackup);
  app.querySelector('[data-action="google-restore"]')?.addEventListener("click", googleRestore);
  app.querySelector('[data-action="undo"]')?.addEventListener("click", undoLastSave);
  const zoomEl = app.querySelector('[data-action="zoom-photo"]');
  zoomEl?.addEventListener("click", handlePhotoZoom);
  zoomEl?.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePhotoZoom(); } });
  app.querySelector('[data-action="cal-prev"]')?.addEventListener("click", () => {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    render();
  });
  app.querySelector('[data-action="cal-next"]')?.addEventListener("click", () => {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    render();
  });
  app.querySelector('[data-action="cal-today"]')?.addEventListener("click", () => {
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    render();
  });

  app.querySelectorAll("[data-summary]").forEach((button) => {
    button.addEventListener("click", () => {
      summaryPeriod = button.dataset.summary;
      render();
    });
  });

  app.querySelectorAll("[data-quick-adj]").forEach((button) => {
    button.addEventListener("click", () => {
      const adj = parseFloat(button.dataset.quickAdj);
      if (!Number.isFinite(adj)) return;
      quickWeight = Math.round((quickWeight + adj) * 10) / 10;
      quickWeight = Math.max(20, Math.min(300, quickWeight));
      const display = document.getElementById("quickDisplay");
      if (display) display.textContent = `${quickWeight.toFixed(1)} kg`;
    });
  });

  app.querySelectorAll("[data-pick-weight]").forEach((button) => {
    button.addEventListener("click", () => {
      const w = parseFloat(button.dataset.pickWeight);
      if (!Number.isFinite(w)) return;
      state.form.pickerInt = Math.floor(w);
      state.form.pickerDec = Math.round((w - Math.floor(w)) * 10);
      render();
    });
  });

  app.querySelectorAll("[data-chart-period]").forEach((button) => {
    button.addEventListener("click", () => {
      chartPeriod = button.dataset.chartPeriod;
      render();
    });
  });

  app.querySelectorAll("[data-date-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.dateShortcut;
      if (key === "yesterday") {
        const d = new Date(todayLocal() + "T00:00:00");
        d.setDate(d.getDate() - 1);
        state.form.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } else {
        state.form.date = todayLocal();
      }
      render();
    });
  });

  app.querySelectorAll("[data-delete-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const dt = button.dataset.deleteDate;
      const rec = state.records.find((r) => r.dt === dt);
      const detail = rec ? `${dt} (${rec.wt.toFixed(1)}kg)` : dt;
      if (!window.confirm(t("confirm.deleteRecord") + "\n" + detail)) return;
      lastUndoState = { records: [...state.records], quickWeight };
      state.records = state.records.filter((r) => r.dt !== dt);
      persist();
      showUndoSnackbar(t("records.deleted"));
    });
  });

  app.querySelector('[data-action="share-chart"]')?.addEventListener("click", shareChart);

  // Rainbow overlay click to dismiss
  document.getElementById("rainbowOverlay")?.addEventListener("click", () => {
    rainbowVisible = false;
    document.getElementById("rainbowOverlay")?.remove();
  });

  app.querySelectorAll("[data-theme-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.theme = button.dataset.themePick;
      persist();
      render();
    });
  });

  app.querySelectorAll("[data-note-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      state.form.note = toggleNoteTag(state.form.note, button.dataset.noteTag);
      render();
    });
  });
  app.querySelectorAll("[data-quick-note]").forEach((button) => {
    button.addEventListener("click", () => {
      state.form.note = button.dataset.quickNote;
      render();
    });
  });

  app.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", handleFieldInput);
    element.addEventListener("change", handleFieldInput);
  });

  // Enter key on note or body fat field triggers save
  const noteInput = document.getElementById("entryNote");
  const bfInput = document.getElementById("bodyFat");
  const handleEnterSave = (e) => { if (e.key === "Enter") { e.preventDefault(); saveRecordFromPicker(); } };
  noteInput?.addEventListener("keydown", handleEnterSave);
  bfInput?.addEventListener("keydown", handleEnterSave);
}

function handleFieldInput(event) {
  const { name, value } = event.target;

  if (["name", "heightCm", "age", "gender"].includes(name)) {
    if (name === "heightCm" && value !== "") {
      const h = Number(value);
      if (!Number.isFinite(h) || h < 50 || h > 300) return;
    }
    if (name === "age" && value !== "") {
      const a = Number(value);
      if (!Number.isFinite(a) || a < 1 || a > 150 || !Number.isInteger(a)) return;
    }
    state.profile = { ...state.profile, [name]: value };
    persist();
    if (name === "heightCm") render();
    return;
  }

  if (name === "pickerInt") {
    const v = parseInt(value, 10);
    if (!Number.isFinite(v)) return;
    state.form.pickerInt = v;
    state.form.weight = `${state.form.pickerInt}.${state.form.pickerDec}`;
    scheduleRender();
    return;
  }

  if (name === "pickerDec") {
    const v = parseInt(value, 10);
    if (!Number.isFinite(v)) return;
    state.form.pickerDec = v;
    state.form.weight = `${state.form.pickerInt}.${state.form.pickerDec}`;
    scheduleRender();
    return;
  }

  if (["weight", "date", "bodyFat", "note"].includes(name)) {
    state.form = { ...state.form, [name]: value };
    return;
  }

  if (name === "language") {
    state.settings.language = value;
    t = createTranslator(value);
    persist();
    render();
    return;
  }

  if (name === "theme" || name === "chartStyle") {
    state.settings[name] = value;
    persist();
    render();
    return;
  }

  if (name === "adPreviewEnabled") {
    state.settings.adPreviewEnabled = value === "true";
    persist();
    render();
    return;
  }

  if (name === "goalWeight") {
    if (value !== "" && value != null) {
      const gw = parseFloat(value);
      if (!Number.isFinite(gw) || gw < 20 || gw > 300) {
        setStatus(t("validate.goalWeight"), "error");
        return;
      }
      state.settings.goalWeight = gw;
    } else {
      state.settings.goalWeight = "";
    }
    persist();
    return;
  }

  if (name === "reminderEnabled") {
    state.settings.reminderEnabled = value === "true";
    persist();
    return;
  }

  if (name === "reminderTime") {
    state.settings.reminderTime = value;
    persist();
    return;
  }

  if (name === "autoTheme") {
    state.settings.autoTheme = value === "true";
    if (state.settings.autoTheme) {
      applySystemTheme();
    }
    persist();
    render();
    return;
  }
}

function saveProfile() {
  const result = validateProfile(state.profile);
  if (!result.valid) {
    setStatus(t(result.error), "error");
    return;
  }

  state.profile = {
    ...result.profile,
    heightCm: result.profile.heightCm ?? "",
    age: result.profile.age ?? "",
  };
  if (!persist()) {
    setStatus(t("status.storageError"), "error");
    return;
  }
  setStatus(t("profile.saved"));
}

function saveSettings() {
  if (!persist()) {
    setStatus(t("status.storageError"), "error");
    return;
  }
  updateLanguage(state.settings.language);
  setStatus(t("settings.saved"));
}

function checkRainbow(newWeight) {
  const lastRecord = state.records[state.records.length - 1];
  if (lastRecord && newWeight < lastRecord.wt) {
    const diff = Math.round((lastRecord.wt - newWeight) * 10) / 10;
    rainbowDetail = `-${diff.toFixed(1)}kg (${lastRecord.wt.toFixed(1)} → ${newWeight.toFixed(1)})`;
    // Check for special milestones
    const milestone = detectMilestone(state.records, newWeight, state.profile.heightCm);
    if (milestone) {
      if (milestone.type === "allTimeLow") {
        rainbowDetail += ` ⭐ ${t("milestone.allTimeLow").replace("{diff}", milestone.diff.toFixed(1))}`;
      } else if (milestone.type === "roundNumber") {
        rainbowDetail += ` 🎯 ${t("milestone.roundNumber").replace("{value}", milestone.value)}`;
      } else if (milestone.type === "bmiCrossing") {
        rainbowDetail += ` 💪 ${t("milestone.bmiCrossing").replace("{threshold}", milestone.threshold)}`;
      }
    }
    rainbowVisible = true;
  }
}

let _saveLock = false;
function saveRecordFromPicker() {
  if (_saveLock) return;
  _saveLock = true;
  setTimeout(() => { _saveLock = false; }, 300);
  const weight = state.form.pickerInt + state.form.pickerDec / 10;
  state.form.weight = weight.toFixed(1);
  saveRecordWithWeight(weight, activeEntryMode);
}

function quickSaveRecord() {
  saveRecordWithWeight(quickWeight, "quick");
}

let lastUndoState = null;
let undoTimer = null;
let validationBypass = false;

function saveRecordWithWeight(weight, source) {
  const weightResult = validateWeight(String(weight));
  if (!weightResult.valid) {
    validationBypass = false;
    setStatus(t(weightResult.error || "entry.noWeight"), "error");
    return;
  }

  // Entry validation warnings (skip if user already confirmed)
  if (!validationBypass && state.records.length > 0) {
    const warnings = validateWeightEntry(weightResult.weight, state.records);
    if (warnings.length > 0) {
      const container = document.querySelector(".validate-warnings");
      if (container) {
        const msgs = warnings.map((w) => {
          if (w.type === "largeDiff") return escHtml(t("validate.largeDiff").replace("{diff}", w.diff).replace("{previous}", w.previous).replace("{date}", w.date));
          if (w.type === "outsideRange") return escHtml(t("validate.outsideRange").replace("{min}", w.min).replace("{max}", w.max));
          return "";
        }).filter(Boolean);
        container.innerHTML = `<div class="validate-warning-box"><p class="validate-warning-title">${escHtml(t("validate.title"))}</p>${msgs.map((m) => `<p class="validate-warning-msg">${m}</p>`).join("")}<div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn ghost validate-confirm" data-action="confirm-save">${escHtml(t("entry.save"))}</button><button type="button" class="btn ghost" data-action="dismiss-warning">${escHtml(t("camera.cancel"))}</button></div></div>`;
        container.style.display = "block";
        validationBypass = true;
        return;
      }
    }
  }
  validationBypass = false;

  const bfResult = validateBodyFat(state.form.bodyFat);
  if (!bfResult.valid) {
    validationBypass = false;
    setStatus(t(bfResult.error), "error");
    return;
  }

  // Validate profile but don't block weight save — only use valid fields for BMI
  const profileResult = validateProfile(state.profile);
  const profileForRecord = profileResult.valid ? {
    ...profileResult.profile,
    heightCm: profileResult.profile.heightCm ?? "",
    age: profileResult.profile.age ?? "",
  } : state.profile;

  // Save undo state before modifying
  lastUndoState = { records: [...state.records], quickWeight };

  checkRainbow(weightResult.weight);

  if (profileResult.valid) {
    state.profile = profileForRecord;
  }

  const record = buildRecord({
    date: state.form.date || todayLocal(),
    weight: weightResult.weight,
    profile: profileForRecord,
    source,
    imageName: state.form.imageName,
    bodyFat: bfResult.bodyFat,
    note: state.form.note,
  });

  const updated = upsertRecord(state.records, record);
  state.records = trimRecords(updated, MAX_RECORDS);
  quickWeight = weightResult.weight;
  if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreviewUrl);
  }
  imagePreviewUrl = "";
  detectedWeights = [];
  activeEntryMode = "manual";
  state.form = {
    ...state.form,
    weight: weightResult.weight.toFixed(1),
    date: todayLocal(),
    pickerInt: Math.floor(weightResult.weight),
    pickerDec: Math.round((weightResult.weight - Math.floor(weightResult.weight)) * 10),
    imageName: "",
    bodyFat: "",
    note: "",
  };
  if (!persist()) {
    validationBypass = false;
    setStatus(t("status.storageError"), "error");
    return;
  }
  if (navigator.vibrate) navigator.vibrate(50);
  const vwContainer = document.querySelector(".validate-warnings");
  if (vwContainer) { vwContainer.style.display = "none"; vwContainer.innerHTML = ""; }
  showUndoSnackbar(`${t("entry.saved")} · ${record.wt.toFixed(1)}kg`);
  // Scroll to chart after save
  setTimeout(() => {
    document.getElementById("chart")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);
}

function showUndoSnackbar(message) {
  statusMessage = message;
  statusKind = "ok";
  // Clear previous timer
  if (undoTimer) clearTimeout(undoTimer);
  render();
  // Show undo option for 5 seconds
  undoTimer = setTimeout(() => {
    lastUndoState = null;
    undoTimer = null;
    render();
  }, 5000);
}

function undoLastSave() {
  if (!lastUndoState) return;
  state.records = lastUndoState.records;
  quickWeight = lastUndoState.quickWeight;
  lastUndoState = null;
  if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
  persist();
  setStatus(t("undo.done"));
  render();
  drawChart();
}

async function preprocessImageForOCR(source) {
  // Enhance contrast and sharpen to improve OCR accuracy for scale displays
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  let bitmap;
  if (source instanceof Blob || source instanceof File) {
    bitmap = await createImageBitmap(source);
  } else {
    bitmap = source;
  }
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  ctx.drawImage(bitmap, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale and increase contrast
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Increase contrast: shift values away from middle
    const contrast = 1.5;
    const adjusted = Math.min(255, Math.max(0, ((gray - 128) * contrast) + 128));
    // Threshold for clearer text
    const threshold = adjusted > 128 ? 255 : 0;
    data[i] = threshold;
    data[i + 1] = threshold;
    data[i + 2] = threshold;
  }
  ctx.putImageData(imageData, 0, 0);
  return await createImageBitmap(canvas);
}

async function detectWeightsFromImage(source) {
  if (!supportsTextDetection) return [];
  try {
    const detector = new window.TextDetector();
    // Try with original image first
    let bitmap;
    if (source instanceof Blob || source instanceof File) {
      bitmap = await createImageBitmap(source);
    } else {
      bitmap = source;
    }
    const textBlocks = await detector.detect(bitmap);
    let extracted = textBlocks.map((block) => block.rawValue || "").join(" ");
    let candidates = extractWeightCandidates(extracted);

    // If no candidates found, try with preprocessed image
    if (candidates.length === 0) {
      const enhanced = await preprocessImageForOCR(source);
      const enhancedBlocks = await detector.detect(enhanced);
      extracted = enhancedBlocks.map((block) => block.rawValue || "").join(" ");
      candidates = extractWeightCandidates(extracted);
    }

    return candidates;
  } catch {
    return [];
  }
}

async function handlePhotoSelection(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  imagePreviewUrl = URL.createObjectURL(file);
  state.form.imageName = file.name;
  detectedWeights = [];

  const photoBtn = app.querySelector('[data-action="pick-native-photo"]') || app.querySelector('label[for="photoInput"]');
  if (photoBtn) photoBtn.classList.add("loading");
  setStatus(t("status.photoAnalyzing"));
  render();

  try {
    const candidates = await detectWeightsFromImage(file);
    detectedWeights = candidates;
    const picked = pickWeightCandidate(candidates, state.records.at(-1)?.wt ?? null);
    if (picked) {
      state.form.weight = picked.toFixed(1);
      state.form.pickerInt = Math.floor(picked);
      state.form.pickerDec = Math.round((picked - Math.floor(picked)) * 10);
    }

    if (candidates.length > 0) {
      setStatus(t("status.photoReady"));
    } else if (supportsTextDetection) {
      setStatus(t("status.photoNoDetection"));
    } else {
      setStatus(t("entry.photoFallback"));
    }
  } catch {
    detectedWeights = [];
    setStatus(t("status.photoNoDetection"), "error");
  } finally {
    if (photoBtn) photoBtn.classList.remove("loading");
  }
  render();
}

async function pickNativePhoto() {
  const photoBtn = app.querySelector('[data-action="pick-native-photo"]');
  if (photoBtn) photoBtn.classList.add("loading");
  try {
    const permissions = await Camera.checkPermissions();
    if (permissions.photos === "denied" || permissions.camera === "denied") {
      const requested = await Camera.requestPermissions({ permissions: ["photos", "camera"] });
      if (requested.photos === "denied" || requested.camera === "denied") {
        setStatus(t("status.permissionDenied"), "error");
        if (photoBtn) photoBtn.classList.remove("loading");
        return;
      }
    }

    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      quality: 92,
      correctOrientation: true,
      promptLabelHeader: t("entry.photo"),
      promptLabelCancel: t("camera.cancel"),
      promptLabelPhoto: t("camera.photo"),
      promptLabelPicture: t("camera.picture"),
    });

    if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    imagePreviewUrl = photo.webPath || "";
    state.form.imageName = photo.path?.split("/").pop() || "camera-photo.jpeg";
    detectedWeights = [];

    if (photo.webPath) {
      try {
        const response = await fetchWithTimeout(photo.webPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const candidates = await detectWeightsFromImage(blob);
        detectedWeights = candidates;
        const picked = pickWeightCandidate(candidates, state.records.at(-1)?.wt ?? null);
        if (picked) {
          state.form.weight = picked.toFixed(1);
          state.form.pickerInt = Math.floor(picked);
          state.form.pickerDec = Math.round((picked - Math.floor(picked)) * 10);
        }
      } catch {
        detectedWeights = [];
      }
    }

    activeEntryMode = "photo";
    setStatus(detectedWeights.length ? t("status.photoReady") : t("status.photoNoDetection"));
  } catch {
    setStatus(t("status.permissionDenied"), "error");
    if (photoBtn) photoBtn.classList.remove("loading");
    return;
  }

  if (photoBtn) photoBtn.classList.remove("loading");
  render();
}

async function toggleVoiceInput() {
  if (isNativePlatform) {
    await toggleNativeVoiceInput();
    return;
  }

  if (!supportsSpeech) {
    setStatus(t("entry.voiceUnsupported"), "error");
    return;
  }

  if (voiceActive) {
    recognition?.stop();
    recognition = null;
    voiceActive = false;
    render();
    return;
  }

  recognition = new BrowserSpeechRecognition();
  recognition.lang = state.settings.language === "ja" ? "ja-JP" : "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    voiceActive = true;
    statusMessage = "";
    render();
  };

  recognition.onresult = (event) => {
    voiceTranscript = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ");

    const weight = parseVoiceWeight(voiceTranscript, state.records.at(-1)?.wt ?? null);
    if (weight) {
      state.form.weight = weight.toFixed(1);
      state.form.pickerInt = Math.floor(weight);
      state.form.pickerDec = Math.round((weight - Math.floor(weight)) * 10);
    }
    render();
  };

  recognition.onerror = (e) => {
    voiceActive = false;
    try { recognition.abort(); } catch { /* already stopped */ }
    if (e.error === "no-speech") {
      setStatus(t("status.voiceNoSpeech"), "warn");
    } else {
      setStatus(t("status.voiceError"), "error");
    }
    render();
  };

  recognition.onend = () => {
    voiceActive = false;
    render();
  };

  try { recognition.start(); } catch {
    voiceActive = false;
    setStatus(t("entry.voiceUnsupported"), "error");
    render();
  }
}

async function toggleNativeVoiceInput() {
  try {
    const available = await NativeSpeechRecognition.available();
    if (!available.available) {
      setStatus(t("entry.voiceUnsupported"), "error");
      return;
    }

    if (voiceActive) {
      await NativeSpeechRecognition.stop();
      voiceActive = false;
      render();
      return;
    }

    const permissions = await NativeSpeechRecognition.requestPermissions();
    if (
      permissions.speechRecognition !== "granted"
      || permissions.microphone !== "granted"
    ) {
      setStatus(t("status.permissionDenied"), "error");
      return;
    }

    if (!nativeSpeechListenersReady) {
      await NativeSpeechRecognition.removeAllListeners();
      await NativeSpeechRecognition.addListener("partialResults", ({ matches }) => {
        voiceTranscript = matches?.join(" ") || "";
        const weight = parseVoiceWeight(voiceTranscript, state.records.at(-1)?.wt ?? null);
        if (weight) {
          state.form.weight = weight.toFixed(1);
          state.form.pickerInt = Math.floor(weight);
          state.form.pickerDec = Math.round((weight - Math.floor(weight)) * 10);
        }
        render();
      });
      await NativeSpeechRecognition.addListener("listeningState", ({ status }) => {
        voiceActive = status === "started";
        render();
      });
      nativeSpeechListenersReady = true;
    }

    activeEntryMode = "voice";
    voiceTranscript = "";
    await NativeSpeechRecognition.start({
      language: state.settings.language === "ja" ? "ja-JP" : "en-US",
      maxResults: 1,
      partialResults: true,
      popup: false,
      prompt: t("entry.voice"),
    });
    voiceActive = true;
    render();
  } catch {
    voiceActive = false;
    setStatus(t("status.voiceError"), "error");
  }
}

function exportExcel() {
  if (!state.records.length) {
    setStatus(t("records.empty"), "error");
    return;
  }
  try {
    const rows = state.records.map((r) => ({
      [t("export.header.date")]: r.dt,
      [t("export.header.weight")]: r.wt,
      [t("export.header.bmi")]: r.bmi ?? "",
      [t("export.header.bodyFat")]: r.bf ?? "",
      [t("export.header.source")]: r.source ?? "manual",
      [t("export.header.note")]: r.note ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("chart.records"));
    XLSX.writeFile(wb, `weight-rainbow-${todayLocal()}.xlsx`);
    setStatus(t("export.excelDone"));
  } catch {
    setStatus(t("export.error"), "error");
  }
}



function exportCSV() {
  if (!state.records.length) {
    setStatus(t("records.empty"), "error");
    return;
  }
  try {
    const headers = [t("export.header.date"), t("export.header.weight"), t("export.header.bmi"), t("export.header.bodyFat"), t("export.header.source"), t("export.header.note")];
    const header = headers.map(csvEscape).join(",");
    const lines = state.records.map((r) =>
      [r.dt, r.wt, r.bmi ?? "", r.bf ?? "", r.source ?? "manual", r.note ?? ""].map(csvEscape).join(",")
    );
    const csv = "\uFEFF" + [header, ...lines].join("\r\n");
    downloadFile(csv, `weight-rainbow-${todayLocal()}.csv`, "text/csv;charset=utf-8");
    setStatus(t("export.csvDone"));
  } catch {
    setStatus(t("export.error"), "error");
  }
}

function handleCSVImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    const { records, errors } = parseCSVImport(text);
    if (!records.length) {
      setStatus(t("import.csv.empty"), "error");
      e.target.value = "";
      return;
    }
    if (!confirm(t("import.csv.confirm").replace("{count}", records.length))) {
      e.target.value = "";
      return;
    }
    const prevRecords = [...state.records];
    let merged = [...state.records];
    for (const rec of records) {
      merged = upsertRecord(merged, rec);
    }
    merged = trimRecords(merged);
    state.records = merged;
    if (!persist()) { state.records = prevRecords; setStatus(t("status.storageError"), "error"); e.target.value = ""; return; }
    let msg = t("import.csv.success").replace("{count}", records.length);
    if (errors.length) {
      msg += " " + t("import.csv.errors").replace("{count}", errors.length);
    }
    setStatus(msg);
    e.target.value = "";
    render();
  };
  reader.onerror = () => {
    setStatus(t("import.error"), "error");
    e.target.value = "";
  };
  reader.readAsText(file);
}

function exportText() {
  if (!state.records.length) {
    setStatus(t("records.empty"), "error");
    return;
  }
  try {
    const lines = state.records.map((r) => {
      const bmiStr = r.bmi ? ` / ${t("bmi.title")}: ${r.bmi.toFixed(1)}` : "";
      const bfStr = r.bf ? ` / ${t("bodyFat.label")}: ${Number(r.bf).toFixed(1)}%` : "";
      const noteStr = r.note ? `  [${r.note}]` : "";
      const dow = t("day." + new Date(r.dt + "T00:00:00").getDay());
      return `${r.dt} (${dow})  ${r.wt.toFixed(1)}kg${bmiStr}${bfStr}  (${r.source})${noteStr}`;
    });
    const stats = calcStats(state.records, state.profile);
    const summaryLines = [];
    if (stats) {
      summaryLines.push("");
      summaryLines.push("=".repeat(48));
      summaryLines.push(`${t("chart.latest")}: ${stats.latestWeight.toFixed(1)}kg / ${t("chart.avg")}: ${stats.avgWeight.toFixed(1)}kg`);
      summaryLines.push(`${t("chart.min")}: ${stats.minWeight.toFixed(1)}kg / ${t("chart.max")}: ${stats.maxWeight.toFixed(1)}kg`);
      summaryLines.push(`${t("chart.change")}: ${stats.change > 0 ? "+" : ""}${stats.change.toFixed(1)}kg / ${t("summary.count")}: ${state.records.length}`);
      if (stats.latestBMI) summaryLines.push(`BMI: ${stats.latestBMI.toFixed(1)} (${t(getBMIStatus(stats.latestBMI))})`);
    }
    const text = `${t("app.title")} - ${todayLocal()}\n${"=".repeat(48)}\n${lines.join("\n")}${summaryLines.join("\n")}`;
    downloadFile(text, `weight-rainbow-${todayLocal()}.txt`, "text/plain");
    setStatus(t("export.textDone"));
  } catch {
    setStatus(t("export.error"), "error");
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareChart() {
  const canvas = document.getElementById("chart");
  if (!canvas) return;
  const shareBtn = app.querySelector('[data-action="share-chart"]');
  if (shareBtn?.disabled) return;
  if (shareBtn) { shareBtn.disabled = true; shareBtn.classList.add("loading"); }
  try {
    const blob = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("toBlob timeout")), 5000);
      canvas.toBlob((b) => { clearTimeout(timer); resolve(b); }, "image/png");
    });
    if (!blob) { setStatus(t("share.error"), "error"); return; }
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], "weight-chart.png", { type: "image/png" });
      const shareData = { files: [file] };
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        setStatus(t("share.done"));
        return;
      }
    }
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weight-chart-${todayLocal()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(t("share.done"));
  } catch {
    setStatus(t("share.error"), "error");
  } finally {
    if (shareBtn) { shareBtn.disabled = false; shareBtn.classList.remove("loading"); }
  }
}

function spawnConfetti() {
  const container = document.getElementById("confettiContainer");
  if (!container) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#ff0000", "#ff9a00", "#d0de21", "#4fdc4a", "#3fdad8", "#2f6bec", "#8b45db", "#ec4899"];
  const shapes = ["circle", "square", "star"];
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 80; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = 6 + Math.random() * 10;
    el.style.left = `${Math.random() * 100}%`;
    el.style.top = `${-10 + Math.random() * 20}%`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.setProperty("--confetti-delay", `${Math.random() * 1.2}s`);
    el.style.setProperty("--confetti-duration", `${1.5 + Math.random() * 2}s`);
    if (shape === "circle") el.style.borderRadius = "50%";
    else if (shape === "star") {
      el.style.borderRadius = "2px";
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
    }
    el.style.opacity = `${0.7 + Math.random() * 0.3}`;
    fragment.appendChild(el);
  }
  container.appendChild(fragment);
  // Clean up confetti after animation completes
  setTimeout(() => { container.innerHTML = ""; }, 4000);
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    settings: state.settings,
    records: state.records,
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    `weight-rainbow-${todayLocal()}.json`,
    "application/json"
  );
  setStatus(t("status.exported"));
}

function handleImportData(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.records)) {
        setStatus(t("import.invalid"), "error");
        return;
      }

      const validImportRecords = data.records.filter((r) =>
        r.dt && /^\d{4}-\d{2}-\d{2}$/.test(r.dt) && Number.isFinite(r.wt) && r.wt >= 20 && r.wt <= 300
      );
      if (!validImportRecords.length) {
        setStatus(t("import.csv.empty"), "error");
        return;
      }

      if (!window.confirm(t("import.confirm").replace("{count}", validImportRecords.length))) return;

      // Snapshot state before import so we can rollback on persist failure
      const prevRecords = [...state.records];
      const prevSettings = { ...state.settings };
      const prevProfile = { ...state.profile };
      const beforeCount = state.records.length;
      // Merge records by date (imported records fill gaps, don't overwrite)
      for (const record of validImportRecords) {
        state.records = upsertRecord(state.records, record);
      }
      state.records = trimRecords(state.records, MAX_RECORDS);
      const newCount = state.records.length - beforeCount;

      // Import settings if present
      if (data.settings) {
        if (data.settings.goalWeight != null && Number.isFinite(Number(data.settings.goalWeight))) {
          state.settings.goalWeight = data.settings.goalWeight;
        }
        if (data.settings.theme && THEME_LIST.some((th) => th.id === data.settings.theme)) {
          state.settings.theme = data.settings.theme;
        }
      }

      // Import profile if present and current one is empty (sanitize)
      if (data.profile && !state.profile.name) {
        state.profile = sanitizeProfile({ ...createDefaultProfile(), ...data.profile });
      }

      if (!persist()) {
        // Rollback in-memory state to match localStorage
        state.records = prevRecords;
        state.settings = prevSettings;
        state.profile = prevProfile;
        setStatus(t("status.storageError"), "error");
        return;
      }
      quickWeight = state.records.length ? state.records[state.records.length - 1].wt : 65.0;
      const msg = t("import.success") + ` (${validImportRecords.length} ${t("chart.records")}${newCount > 0 ? `, +${newCount} ${t("import.new")}` : ""})`;
      setStatus(msg);
    } catch {
      setStatus(t("import.invalid"), "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function resetData() {
  const msg = state.records.length
    ? `${t("confirm.reset")}\n\n(${state.records.length} ${t("chart.records")})`
    : t("confirm.reset");
  if (!window.confirm(msg)) return;
  if (!window.confirm(t("confirm.resetFinal"))) return;

  state = {
    ...loadState(),
    profile: createDefaultProfile(),
    settings: state.settings,
  };
  state.records = [];
  state.form = {
    weight: "",
    date: todayLocal(),
    imageName: "",
    pickerInt: 65,
    pickerDec: 0,
    bodyFat: "",
    note: "",
  };
  quickWeight = 65.0;
  voiceTranscript = "";
  detectedWeights = [];
  if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreviewUrl);
  }
  imagePreviewUrl = "";
  activeEntryMode = "manual";
  showAllRecords = false;
  showMonthlyStats = false;
  showAdvancedAnalytics = false;
  recordSearchQuery = "";
  recordDateFrom = "";
  recordDateTo = "";

  try {
    window.localStorage.removeItem(STORAGE_KEYS.records);
    window.localStorage.removeItem(STORAGE_KEYS.profile);
  } catch {
    setStatus(t("status.storageError"), "error");
    return;
  }

  if (!persist()) {
    setStatus(t("status.storageError"), "error");
    return;
  }

  // Clear active timers
  if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
  if (reminderTimer) { clearInterval(reminderTimer); reminderTimer = null; }
  if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null; }
  lastUndoState = null;
  lastNotifiedDate = "";

  setStatus(t("status.reset"));
  render();
  drawChart();
}

function drawChart() {
  const canvas = document.getElementById("chart");
  if (!canvas) return;
  if (canvas._tooltipTimer) { clearTimeout(canvas._tooltipTimer); canvas._tooltipTimer = null; }

  // Fix DPI scaling for retina displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  if (width < 1 || height < 1) return;

  const cs = getComputedStyle(document.body);
  const isMidnight = state.settings.theme === "midnight";

  // Filter records by chart period
  let chartRecords = state.records;
  if (chartPeriod !== "all") {
    const days = parseInt(chartPeriod, 10);
    if (Number.isNaN(days)) return;
    const d = new Date(todayLocal() + "T00:00:00");
    d.setDate(d.getDate() - days);
    const cutoff = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    chartRecords = state.records.filter((r) => r.dt >= cutoff);
  }

  if (!chartRecords.length) {
    context.fillStyle = cs.getPropertyValue("--muted").trim() || "#7c7f9b";
    context.textAlign = "center";
    context.font = "32px sans-serif";
    context.fillText("📊", width / 2, height / 2 - 16);
    context.font = "14px sans-serif";
    context.fillText(t("chart.empty"), width / 2, height / 2 + 16);
    return;
  }

  const weights = chartRecords.map((record) => record.wt);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 2;
  const padX = 40;
  const padY = 28;

  const toX = (index) => padX + (index / Math.max(chartRecords.length - 1, 1)) * (width - padX * 2);
  const toY = (weight) => height - padY - ((weight - min) / range) * (height - padY * 2);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, cs.getPropertyValue("--accent").trim() || "#ff5f6d");
  gradient.addColorStop(0.5, cs.getPropertyValue("--accent-2").trim() || "#7c3aed");
  gradient.addColorStop(1, cs.getPropertyValue("--accent-3").trim() || "#0ea5e9");

  // Grid lines
  context.strokeStyle = isMidnight ? "rgba(139,146,176,0.14)" : "rgba(120,130,180,0.18)";
  context.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    const y = padY + (index / 4) * (height - padY * 2);
    context.beginPath();
    context.moveTo(padX, y);
    context.lineTo(width - padX, y);
    context.stroke();

    // Y-axis labels
    const weightVal = max - (index / 4) * range;
    const weightLabel = weightVal % 1 === 0 ? String(Math.round(weightVal)) : weightVal.toFixed(1);
    context.fillStyle = cs.getPropertyValue("--muted").trim() || "#6b7280";
    context.font = "11px sans-serif";
    context.textAlign = "right";
    context.fillText(weightLabel, padX - 6, y + 4);
  }

  // BMI zone bands (if height is set)
  const bmiZones = calcBMIZoneWeights(state.profile.heightCm);
  if (bmiZones) {
    const zoneAlpha = isMidnight ? 0.12 : 0.08;
    const zones = [
      { from: min, to: Math.min(bmiZones.underMax, max), color: `rgba(59, 130, 246, ${zoneAlpha})`, label: t("bmi.under") },
      { from: Math.max(bmiZones.underMax, min), to: Math.min(bmiZones.normalMax, max), color: `rgba(16, 185, 129, ${zoneAlpha})`, label: t("bmi.normal") },
      { from: Math.max(bmiZones.normalMax, min), to: Math.min(bmiZones.overMax, max), color: `rgba(245, 158, 11, ${zoneAlpha})`, label: t("bmi.over") },
      { from: Math.max(bmiZones.overMax, min), to: max, color: `rgba(239, 68, 68, ${zoneAlpha})`, label: t("bmi.obese") },
    ];
    context.save();
    for (const zone of zones) {
      if (zone.from >= zone.to) continue;
      const y1 = toY(zone.to);
      const y2 = toY(zone.from);
      context.fillStyle = zone.color;
      context.fillRect(padX, y1, width - padX * 2, y2 - y1);
      // Zone label on right edge
      context.fillStyle = isMidnight ? "rgba(139,146,176,0.6)" : "rgba(120,130,180,0.5)";
      context.font = "9px sans-serif";
      context.textAlign = "right";
      const labelY = (y1 + y2) / 2 + 3;
      if (y2 - y1 > 14) {
        context.fillText(zone.label, width - padX - 4, labelY);
      }
    }
    context.restore();
  }

  // Line chart with smooth curves
  context.strokeStyle = gradient;
  context.lineWidth = chartRecords.length > 60 ? 1.5 : chartRecords.length > 30 ? 2 : 3;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();
  chartRecords.forEach((record, index) => {
    const x = toX(index);
    const y = toY(record.wt);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  // Fill area under curve
  const fillGradient = context.createLinearGradient(0, 0, 0, height);
  fillGradient.addColorStop(0, (cs.getPropertyValue("--accent").trim() || "#ff5f6d") + "30");
  fillGradient.addColorStop(1, "transparent");
  context.fillStyle = fillGradient;
  context.beginPath();
  chartRecords.forEach((record, index) => {
    const x = toX(index);
    const y = toY(record.wt);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.lineTo(toX(chartRecords.length - 1), height - padY);
  context.lineTo(toX(0), height - padY);
  context.closePath();
  context.fill();

  // Data points - scale size based on record count
  const dotOuter = chartRecords.length > 60 ? 3 : chartRecords.length > 30 ? 4.5 : 6;
  const dotInner = chartRecords.length > 60 ? 2 : chartRecords.length > 30 ? 3 : 4;
  context.fillStyle = gradient;
  chartRecords.forEach((record, index) => {
    const x = toX(index);
    const y = toY(record.wt);
    // Outline (theme-aware)
    context.beginPath();
    context.arc(x, y, dotOuter, 0, Math.PI * 2);
    context.fillStyle = cs.getPropertyValue("--surface-strong").trim() || "white";
    context.fill();
    // Colored dot
    context.beginPath();
    context.arc(x, y, dotInner, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
  });

  // 7-day moving average line
  if (chartRecords.length >= 3) {
    const movingAvg = [];
    for (let i = 0; i < chartRecords.length; i++) {
      const windowSize = Math.min(7, i + 1);
      let sum = 0;
      for (let j = i - windowSize + 1; j <= i; j++) sum += chartRecords[j].wt;
      movingAvg.push(sum / windowSize);
    }
    context.save();
    context.setLineDash([6, 5]);
    context.strokeStyle = cs.getPropertyValue("--accent-3").trim() || "#0ea5e9";
    context.lineWidth = 1.8;
    context.globalAlpha = 0.65;
    context.beginPath();
    movingAvg.forEach((avg, i) => {
      const x = toX(i);
      const y = toY(avg);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();
  }

  // Goal weight line
  const goalWeight = Number(state.settings.goalWeight);
  if (Number.isFinite(goalWeight) && goalWeight >= min && goalWeight <= max) {
    const goalY = toY(goalWeight);
    context.save();
    context.setLineDash([8, 6]);
    context.strokeStyle = cs.getPropertyValue("--ok").trim() || "#10b981";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(padX, goalY);
    context.lineTo(width - padX, goalY);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = cs.getPropertyValue("--ok").trim() || "#10b981";
    context.font = "bold 11px sans-serif";
    context.textAlign = "left";
    context.fillText(`${t("goal.title")} ${goalWeight.toFixed(1)}`, padX + 4, goalY - 6);
    context.restore();
  }

  // Trend forecast line
  const trendForecast = calcTrendForecast(chartRecords);
  if (trendForecast && trendForecast.forecast.length >= 2) {
    context.save();
    context.setLineDash([3, 5]);
    context.strokeStyle = cs.getPropertyValue("--accent-2").trim() || "#ff9a00";
    context.lineWidth = 1.5;
    context.globalAlpha = 0.5;
    context.beginPath();
    const lastX = toX(chartRecords.length - 1);
    const lastY = toY(chartRecords[chartRecords.length - 1].wt);
    context.moveTo(lastX, lastY);
    const totalDays = trendForecast.forecast[trendForecast.forecast.length - 1].dayOffset;
    const pxPerDay = totalDays > 0 ? (width - padX - lastX) * 0.8 / totalDays : 0;
    for (const pt of trendForecast.forecast) {
      if (pt.dayOffset === 0) continue;
      const fx = lastX + pt.dayOffset * pxPerDay;
      const fy = toY(Math.max(min, Math.min(max, pt.weight)));
      if (fx > width - padX) break;
      context.lineTo(fx, fy);
    }
    context.stroke();
    // Label
    const lastPt = trendForecast.forecast[Math.min(trendForecast.forecast.length - 1, 7)];
    if (lastPt) {
      const labelX = Math.min(lastX + lastPt.dayOffset * pxPerDay, width - padX - 40);
      const labelY = toY(Math.max(min, Math.min(max, lastPt.weight)));
      context.setLineDash([]);
      context.globalAlpha = 0.7;
      context.fillStyle = cs.getPropertyValue("--accent-2").trim() || "#ff9a00";
      context.font = "9px sans-serif";
      context.textAlign = "left";
      context.fillText(t("chart.forecast"), labelX + 4, labelY - 4);
    }
    context.restore();
  }

  // Today marker
  const todayStr = todayLocal();
  const todayIdx = chartRecords.findIndex((r) => r.dt === todayStr);
  if (todayIdx >= 0) {
    const tx = toX(todayIdx);
    context.save();
    context.setLineDash([2, 3]);
    context.strokeStyle = cs.getPropertyValue("--accent").trim() || "#ff5f6d";
    context.lineWidth = 1;
    context.globalAlpha = 0.4;
    context.beginPath();
    context.moveTo(tx, padY);
    context.lineTo(tx, height - padY);
    context.stroke();
    context.restore();
  }

  // X-axis labels
  context.fillStyle = cs.getPropertyValue("--muted").trim() || "#6b7280";
  context.font = "12px sans-serif";
  context.textAlign = "center";
  const labelCount = chartRecords.length > 60 ? 5 : chartRecords.length > 20 ? 4 : 3;
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round(i * (chartRecords.length - 1) / (labelCount - 1))
  ).filter((v, i, a) => a.indexOf(v) === i);
  labelIndices.forEach((index) => {
    const record = chartRecords[index];
    context.fillText(record.dt.slice(5), toX(index), height - 8);
  });

  // Touch/click/hover tooltip - store handlers to avoid listener leak
  if (canvas._chartClickHandler) {
    canvas.removeEventListener("click", canvas._chartClickHandler);
  }
  if (canvas._chartMoveHandler) {
    canvas.removeEventListener("mousemove", canvas._chartMoveHandler);
  }
  if (canvas._chartLeaveHandler) {
    canvas.removeEventListener("mouseleave", canvas._chartLeaveHandler);
  }
  const snapRecords = [...chartRecords];
  const showTooltipForEvent = (e) => {
    const cr = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - cr.left;
    let ci = 0;
    let cd = Infinity;
    snapRecords.forEach((_, i) => {
      const d = Math.abs(toX(i) - cx);
      if (d < cd) { cd = d; ci = i; }
    });
    const tip = document.getElementById("chartTooltip");
    if (cd < 30 && tip) {
      const r = snapRecords[ci];
      const dow = t("day." + new Date(r.dt + "T00:00:00").getDay());
      tip.textContent = `${r.dt} (${dow}): ${r.wt.toFixed(1)}kg${r.bmi ? ` (BMI ${r.bmi.toFixed(1)})` : ""}${r.bf ? ` BF ${Number(r.bf).toFixed(1)}%` : ""}${r.note ? ` — ${r.note}` : ""}`;
      tip.style.display = "block";
      clearTimeout(canvas._tooltipTimer);
    } else if (tip) {
      tip.style.display = "none";
    }
  };
  canvas._chartClickHandler = (e) => {
    showTooltipForEvent(e);
    // Auto-hide after 3 seconds on click/touch
    clearTimeout(canvas._tooltipTimer);
    canvas._tooltipTimer = setTimeout(() => {
      const tip = document.getElementById("chartTooltip");
      if (tip) tip.style.display = "none";
    }, 3500);
  };
  canvas._chartMoveHandler = (e) => { showTooltipForEvent(e); };
  canvas._chartLeaveHandler = () => {
    const tip = document.getElementById("chartTooltip");
    if (tip) tip.style.display = "none";
  };
  canvas.addEventListener("click", canvas._chartClickHandler);
  canvas.addEventListener("mousemove", canvas._chartMoveHandler);
  canvas.addEventListener("mouseleave", canvas._chartLeaveHandler);
  // Touch drag support for mobile chart interaction
  if (canvas._chartTouchHandler) {
    canvas.removeEventListener("touchmove", canvas._chartTouchHandler);
  }
  if (canvas._chartTouchEndHandler) {
    canvas.removeEventListener("touchend", canvas._chartTouchEndHandler);
  }
  canvas._chartTouchHandler = (e) => {
    e.preventDefault();
    showTooltipForEvent(e);
  };
  canvas._chartTouchEndHandler = () => {
    clearTimeout(canvas._tooltipTimer);
    canvas._tooltipTimer = setTimeout(() => {
      const tip = document.getElementById("chartTooltip");
      if (tip) tip.style.display = "none";
    }, 3500);
  };
  canvas.addEventListener("touchmove", canvas._chartTouchHandler, { passive: false });
  canvas.addEventListener("touchend", canvas._chartTouchEndHandler);
}

function signedWeight(weight) {
  return `${weight > 0 ? "+" : ""}${weight.toFixed(1)}kg`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


function saveGoal() {
  const raw = document.getElementById("goalWeight")?.value || "";
  if (!raw.trim()) {
    state.settings.goalWeight = null;
  } else {
    const val = parseFloat(normalizeNumericInput(raw));
    if (!Number.isFinite(val) || val < 20 || val > 300) {
      setStatus(t("weight.range"), "error");
      return;
    }
    state.settings.goalWeight = val;
  }
  if (!persist()) {
    setStatus(t("status.storageError"), "error");
    return;
  }
  setStatus(t("goal.saved"));
  render();
}

function saveReminder() {
  const enabled = state.settings.reminderEnabled;
  const time = state.settings.reminderTime || "21:00";
  state.settings.reminderTime = time;

  if (enabled && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm === "denied") {
        state.settings.reminderEnabled = false;
        setStatus(t("reminder.denied"), "error");
        persist();
        render();
        return;
      }
      persist();
      initReminder();
      setStatus(t("reminder.saved"));
      render();
    }).catch(() => {
      state.settings.reminderEnabled = false;
      setStatus(t("reminder.denied"), "error");
      persist();
      render();
    });
    return;
  }

  if (enabled && "Notification" in window && Notification.permission === "denied") {
    state.settings.reminderEnabled = false;
    setStatus(t("reminder.denied"), "error");
    persist();
    render();
    return;
  }

  if (!persist()) {
    setStatus(t("status.storageError"), "error");
    return;
  }
  initReminder();
  setStatus(t("reminder.saved"));
  render();
}

function initReminder() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }

  if (!state.settings.reminderEnabled || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  reminderTimer = setInterval(() => {
    const now = new Date();
    const todayStr = todayLocal();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const targetTime = state.settings.reminderTime || "21:00";

    if (currentTime === targetTime && lastNotifiedDate !== todayStr) {
      lastNotifiedDate = todayStr;
      const hasRecordToday = state.records.some((r) => r.dt === todayStr);
      if (!hasRecordToday) {
        new Notification(t("app.title"), {
          body: t("reminder.body"),
          icon: "./assets/icon.svg",
        });
      }
    }
  }, 15000); // Check every 15 seconds for reliability
}

// --- Google Drive Integration ---
const GOOGLE_CLIENT_ID = window.__GOOGLE_CLIENT_ID__ || "";
const BACKUP_FILENAME = "weight-rainbow-backup.json";
const DRIVE_TIMEOUT = 30000;
function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), DRIVE_TIMEOUT);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}
let gTokenClient = null;
let gToken = null;
let gTokenExpiresAt = 0;

function isGoogleReady() {
  return !!(GOOGLE_CLIENT_ID && typeof google !== "undefined" && google.accounts?.oauth2);
}

function googleAuth() {
  if (!isGoogleReady()) return null;
  if (gTokenClient) return gTokenClient;
  gTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/drive.appdata",
    callback: () => {},
  });
  return gTokenClient;
}

function googleGetToken() {
  return new Promise((resolve, reject) => {
    const c = googleAuth();
    if (!c) { reject(new Error("not_configured")); return; }
    if (gToken && Date.now() < gTokenExpiresAt) { resolve(gToken); return; }
    const timeout = setTimeout(() => reject(new Error("auth_timeout")), DRIVE_TIMEOUT);
    c.callback = (r) => {
      clearTimeout(timeout);
      if (r.error) reject(new Error(r.error));
      else {
        gToken = r.access_token;
        gTokenExpiresAt = Date.now() + (r.expires_in || 3600) * 1000 - 60000;
        resolve(r.access_token);
      }
    };
    c.requestAccessToken();
  });
}

async function googleBackup() {
  if (!GOOGLE_CLIENT_ID) { setStatus(t("google.notConfigured"), "error"); return; }
  const backupBtn = app.querySelector('[data-action="google-backup"]');
  if (backupBtn?.disabled) return;
  if (backupBtn) { backupBtn.disabled = true; backupBtn.classList.add("loading"); }
  try {
    const tk = await googleGetToken();
    const data = {
      exportedAt: new Date().toISOString(),
      records: state.records.map((r) => ({
        dt: r.dt, wt: r.wt, bmi: r.bmi, bf: r.bf ?? null, source: r.source, note: r.note ?? "", createdAt: r.createdAt,
      })),
      settings: { ...state.settings },
      profile: { ...state.profile },
    };
    const sr = await fetchWithTimeout(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}'+and+trashed=false&spaces=appDataFolder&fields=files(id)`,
      { headers: { Authorization: `Bearer ${tk}` } },
    );
    if (!sr.ok) throw new Error("drive_error");
    const sd = await sr.json();
    const ex = sd.files?.[0];
    const bd = JSON.stringify(data, null, 2);
    let ur;
    if (ex) {
      ur = await fetchWithTimeout(
        `https://www.googleapis.com/upload/drive/v3/files/${ex.id}?uploadType=media`,
        { method: "PATCH", headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" }, body: bd },
      );
    } else {
      const boundary = "weight_rainbow_boundary";
      const multipartBody =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: BACKUP_FILENAME, mimeType: "application/json", parents: ["appDataFolder"] }) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${bd}\r\n--${boundary}--`;
      ur = await fetchWithTimeout(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        { method: "POST", headers: { Authorization: `Bearer ${tk}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipartBody },
      );
    }
    if (!ur.ok) throw new Error("drive_error");
    setStatus(t("google.backupDone"));
  } catch (e) {
    setStatus(e.message === "not_configured" ? t("google.notConfigured") : t("google.error"), "error");
  } finally {
    if (backupBtn) { backupBtn.disabled = false; backupBtn.classList.remove("loading"); }
  }
}

async function googleRestore() {
  if (!GOOGLE_CLIENT_ID) { setStatus(t("google.notConfigured"), "error"); return; }
  const restoreBtn = app.querySelector('[data-action="google-restore"]');
  if (restoreBtn?.disabled) return;
  if (restoreBtn) { restoreBtn.disabled = true; restoreBtn.classList.add("loading"); }
  try {
    const tk = await googleGetToken();
    const sr = await fetchWithTimeout(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}'+and+trashed=false&spaces=appDataFolder&fields=files(id)`,
      { headers: { Authorization: `Bearer ${tk}` } },
    );
    if (!sr.ok) throw new Error("drive_error");
    const sd = await sr.json();
    const f = sd.files?.[0];
    if (!f) { setStatus(t("google.noData"), "error"); return; }
    const cr = await fetchWithTimeout(
      `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
      { headers: { Authorization: `Bearer ${tk}` } },
    );
    if (!cr.ok) throw new Error("drive_error");
    let bd;
    try { bd = await cr.json(); } catch { throw new Error("drive_error"); }
    if (!bd.records?.length) { setStatus(t("google.noData"), "error"); return; }
    const validBackupRecords = bd.records.filter((r) => r.dt && Number.isFinite(r.wt));
    if (!validBackupRecords.length) { setStatus(t("google.noData"), "error"); return; }
    if (!window.confirm(t("google.restoreConfirm") + ` (${validBackupRecords.length} ${t("chart.records")})`)) return;
    const prevRecords = [...state.records];
    const prevSettings = { ...state.settings };
    const prevProfile = { ...state.profile };
    const beforeCount = state.records.length;
    let m = [...state.records];
    for (const r of validBackupRecords) {
      m = upsertRecord(m, { ...r, bmi: r.bmi ?? null, bf: r.bf ?? null, note: r.note ?? "", source: r.source || "manual", imageName: "" });
    }
    state.records = trimRecords(m, MAX_RECORDS);
    const newCount = state.records.length - beforeCount;
    if (bd.settings) {
      if (bd.settings.goalWeight != null) state.settings.goalWeight = bd.settings.goalWeight;
      if (bd.settings.theme) state.settings.theme = bd.settings.theme;
      if (bd.settings.reminderEnabled != null) state.settings.reminderEnabled = bd.settings.reminderEnabled;
      if (bd.settings.reminderTime) state.settings.reminderTime = bd.settings.reminderTime;
    }
    // Import profile if present and current one is empty (sanitize)
    if (bd.profile && !state.profile.name && !state.profile.heightCm) {
      state.profile = sanitizeProfile({ ...createDefaultProfile(), ...bd.profile });
    }
    if (!persist()) {
      state.records = prevRecords;
      state.settings = prevSettings;
      state.profile = prevProfile;
      setStatus(t("status.storageError"), "error");
      return;
    }
    setStatus(t("google.restoreDone") + ` (${validBackupRecords.length} ${t("chart.records")}${newCount > 0 ? `, +${newCount} ${t("import.new")}` : ""})`);
    render();
  } catch (e) {
    setStatus(e.message === "not_configured" ? t("google.notConfigured") : t("google.error"), "error");
  } finally {
    if (restoreBtn) { restoreBtn.disabled = false; restoreBtn.classList.remove("loading"); }
  }
}

// Re-enable Google buttons once GSI library loads asynchronously
if (GOOGLE_CLIENT_ID) {
  const gsiCheck = setInterval(() => {
    if (isGoogleReady()) {
      clearInterval(gsiCheck);
      app.querySelectorAll('[data-action="google-backup"], [data-action="google-restore"]').forEach((b) => b.removeAttribute("disabled"));
    }
  }, 500);
  setTimeout(() => clearInterval(gsiCheck), 30000);
}

// Photo zoom
function handlePhotoZoom() {
  if (!imagePreviewUrl) return;
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.85);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;cursor:zoom-out;animation:fadeIn 0.2s ease-out";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-modal", "true");
  ov.setAttribute("aria-label", t("photo.zoomHint"));
  const im = document.createElement("img");
  im.src = imagePreviewUrl;
  im.alt = t("entry.photoPreview");
  im.style.cssText = "max-width:95vw;max-height:95dvh;object-fit:contain;border-radius:12px";
  ov.appendChild(im);
  ov.tabIndex = -1;
  const triggerEl = document.activeElement;
  const dismiss = () => { ov.remove(); document.removeEventListener("keydown", onKey); if (triggerEl && document.contains(triggerEl)) triggerEl.focus(); };
  const onKey = (e) => { if (e.key === "Escape") dismiss(); };
  ov.addEventListener("click", dismiss);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(ov);
  ov.focus();
}


let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawChart, 150);
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    scheduleRender();
    drawChart();
  }
});
window.addEventListener("beforeunload", () => {
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  if (reminderTimer) clearInterval(reminderTimer);
});
window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    saveRecordFromPicker();
  }

  if (event.key === "Escape" && voiceActive) {
    event.preventDefault();
    void toggleVoiceInput();
  } else if (event.key === "Escape" && rainbowVisible) {
    rainbowVisible = false;
    document.getElementById("rainbowOverlay")?.remove();
  }

  // Ctrl/Cmd+Z to undo last save
  if ((event.metaKey || event.ctrlKey) && event.key === "z" && !event.shiftKey) {
    if (lastUndoState) {
      event.preventDefault();
      undoLastSave();
    }
  }

  // Ctrl/Cmd+K to focus search
  if ((event.metaKey || event.ctrlKey) && event.key === "k") {
    event.preventDefault();
    const searchInput = document.getElementById("recordSearch");
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    } else if (state.records.length <= 3) {
      setStatus(t("records.searchMinRecords"), "warn");
    }
  }
});

// Scroll-to-top button visibility (throttled)
let scrollTicking = false;
window.addEventListener("scroll", () => {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(() => {
      const btn = document.getElementById("scrollTopBtn");
      if (btn) btn.classList.toggle("visible", window.scrollY > 400);
      scrollTicking = false;
    });
  }
}, { passive: true });

document.addEventListener("click", (e) => {
  if (e.target.id === "scrollTopBtn" || e.target.closest("#scrollTopBtn")) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
