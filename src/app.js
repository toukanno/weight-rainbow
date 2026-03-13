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
      <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border-radius:8px;border:none;background:#ff5f6d;color:#fff;font-size:1rem;">再読み込み / Reload</button>
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
let rainbowDetail = "";
let summaryPeriod = "week";
let chartPeriod = "all"; // "7", "30", "90", "all"
let reminderTimer = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let showMonthlyStats = false;
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
    <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border-radius:8px;border:none;background:#ff5f6d;color:#fff;font-size:1rem;">${t("error.reload")}</button>
    <button onclick="localStorage.clear();location.reload()" style="margin-top:8px;padding:8px 24px;border-radius:8px;border:1px solid #ccc;background:#fff;color:#333;font-size:1rem;">${t("error.resetData")}</button>
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

function loadState() {
  return {
    records: safeParse(STORAGE_KEYS.records, []),
    profile: { ...createDefaultProfile(), ...safeParse(STORAGE_KEYS.profile, {}) },
    settings: { ...createDefaultSettings(), ...safeParse(STORAGE_KEYS.settings, {}) },
    form: {
      weight: "",
      date: todayLocal(),
      imageName: "",
      pickerInt: 65,
      pickerDec: 0,
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
  } catch {
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
          <button type="button" data-lang="ja">🇯🇵 日本語</button>
          <button type="button" data-lang="en">🇬🇧 English</button>
        </div>
      </div>
    </div>
  `;
  app.querySelector("[data-lang]")?.focus();
  app.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      const lang = button.dataset.lang;
      state.settings.language = lang;
      t = createTranslator(lang);
      try {
        window.localStorage.setItem(STORAGE_KEYS.firstLaunchDone, "1");
      } catch { /* ignore */ }
      persist();
      render();
    });
  });
}

let statusClearTimer = null;
function setStatus(message, kind = "ok") {
  statusMessage = message;
  statusKind = kind;
  clearTimeout(statusClearTimer);
  if (kind === "ok" && message) {
    statusClearTimer = setTimeout(() => {
      statusMessage = "";
      render();
    }, 4000);
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
  return escapeAttr(note).replace(/#([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F]+)/g, '<span class="note-hashtag">#$1</span>');
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

function render() {
  try {
  document.documentElement.lang = state.settings.language;
  document.title = t("app.title");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t("app.description"));
  document.body.dataset.theme = state.settings.theme;
  // Update browser theme-color to match current theme accent
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim();
    if (accent) themeColor.setAttribute("content", accent);
  }

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

  // Duplicate date warning
  const selectedDate = state.form.date || todayLocal();
  const existingRecord = state.records.find((r) => r.dt === selectedDate);

  app.innerHTML = `
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
                <input id="name" name="name" maxlength="40" value="${escapeAttr(state.profile.name)}" />
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
                <input id="heightCm" name="heightCm" inputmode="decimal" value="${escapeAttr(state.profile.heightCm)}" />
              </div>
              <div class="field">
                <label for="age">${t("profile.age")}</label>
                <input id="age" name="age" inputmode="numeric" value="${escapeAttr(state.profile.age)}" />
              </div>
            </div>
          </section>

          <section class="panel">
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
                </div>
                <div class="field">
                  <label for="recordDate">${t("entry.date")}</label>
                  <input id="recordDate" name="date" type="date" value="${escapeAttr(state.form.date)}" />
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
                <input id="entryNote" name="note" type="text" maxlength="100" placeholder="${escapeAttr(t("entry.noteHint"))}" value="${escapeAttr(state.form.note)}" />
                ${(state.form.note || "").length > 50 ? `<div class="hint-small" style="text-align:right;">${(state.form.note || "").length}/100</div>` : ""}
                <div class="note-tags-row" role="group" aria-label="${t("note.tags")}">
                  ${NOTE_TAGS.map((tag) => {
                    const active = (state.form.note || "").includes(`#${tag}`);
                    return `<button type="button" class="note-tag${active ? " active" : ""}" data-note-tag="${tag}">${t("note.tag." + tag)}</button>`;
                  }).join("")}
                </div>
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
                  <button type="button" class="quick-save" data-action="quick-save">${t("quick.save")}</button>
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
                  <img class="photo-preview" src="${imagePreviewUrl}" alt="${t("entry.photoPreview")}" data-action="zoom-photo" />
                  <p class="helper hint-small" style="margin-top: 4px; text-align: center;">${t("photo.zoomHint")}</p>
                  ${!supportsTextDetection && !detectedWeights.length ? `<p class="helper" style="margin-top: 8px; text-align: center;">${t("photo.manualHint")}</p>` : ""}
                ` : ""}
                ${detectedWeights.length ? `<div style="margin-top: 12px;"><div class="helper">${t("entry.photoDetected")}</div><div class="chip-row" style="margin-top: 8px;">${detectedWeights.map((weight) => `<button type="button" class="chip" data-pick-weight="${weight}">${formatWeight(weight)}</button>`).join("")}</div></div>` : ""}
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
            </div>

            <div class="status ${statusKind === "error" ? "warn" : ""}" role="status" aria-live="polite">
              ${escapeAttr(statusMessage)}
              ${lastUndoState ? `<button type="button" class="undo-btn" data-action="undo">${t("undo.button")}</button>` : ""}
            </div>
          </section>

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
            <div id="chartTooltip" class="chart-tooltip" style="display:none;"></div>
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
            ${renderDayOfWeekAvg()}
            ${renderWeekdayWeekend()}
            ${renderStability()}
            ${renderConsistencyStreak()}
            ${renderBMIDistribution()}
            ${renderWeightPercentile()}
            ${renderMovingAverages()}
            ${renderWeightRange()}
            ${renderTagImpact()}
            ${renderBestPeriod()}
            ${renderWeeklyFrequency()}
            ${renderWeightVelocity()}
            ${renderBodyFatStats()}
          </section>

          <!-- Monthly Stats Panel -->
          ${renderMonthlyStats()}

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
              ${recordSearchQuery ? `<span class="helper">${t("records.searchResult").replace("{count}", filterRecords(state.records, recordSearchQuery).length)}</span>` : ""}
            </div>
            <div class="record-date-range">
              <div class="helper hint-small">${t("records.dateRange")}</div>
              <div class="date-range-fields">
                <label>${t("records.from")}<input id="dateRangeFrom" type="date" value="${escapeAttr(recordDateFrom)}" /></label>
                <label>${t("records.to")}<input id="dateRangeTo" type="date" value="${escapeAttr(recordDateTo)}" /></label>
                ${recordDateFrom || recordDateTo ? `<button type="button" class="btn ghost" data-action="clear-date-range">${t("records.clearRange")}</button>` : ""}
              </div>
            </div>` : ""}
            ${state.records.length ? `<div class="export-row"><button type="button" class="btn ghost" data-action="export-csv">📥 ${t("export.csv")}</button><button type="button" class="btn ghost" data-action="import-csv">📤 ${t("import.csv")}</button><input type="file" id="csvImportInput" accept=".csv" style="display:none" /></div>` : `<div class="export-row"><button type="button" class="btn ghost" data-action="import-csv">📤 ${t("import.csv")}</button><input type="file" id="csvImportInput" accept=".csv" style="display:none" /></div>`}
            <div class="record-list">
              ${state.records.length ? renderRecordList() : `<div class="empty-state">
                <div style="font-size:2.4rem;margin-bottom:8px;" aria-hidden="true">📊</div>
                <div class="helper">${t("records.empty")}</div>
                <div class="empty-state-actions">
                  <button type="button" class="btn secondary" data-mode="manual" aria-label="${t("entry.manual")}">✏️ ${t("entry.manual")}</button>
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

  if (rainbowVisible) {
    spawnConfetti();
    // Vibrate on supported devices for haptic feedback
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => {
      const overlay = document.getElementById("rainbowOverlay");
      if (overlay) {
        overlay.classList.add("fade-out");
        setTimeout(() => {
          rainbowVisible = false;
          overlay.remove();
        }, 600);
      }
    }, 3500);
  }
  } catch (e) {
    console.error("[WeightRainbow] Render error:", e);
    app.innerHTML = `<div style="padding:40px 20px;text-align:center;font-family:system-ui;">
      <h2 style="color:#dc2626;">${t("error.render")}</h2>
      <p style="color:#666;margin:12px 0;">${escHtml(e.message)}</p>
      <p style="color:#999;font-size:0.8rem;">${e.stack ? e.stack.split('\n').slice(0, 3).map(l => escHtml(l)).join('<br>') : ''}</p>
      <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border-radius:8px;border:none;background:#ff5f6d;color:#fff;font-size:1rem;">${t("error.reload")}</button>
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
              <div class="monthly-label">${new Date(m.month + "-01").toLocaleDateString(state.settings.language === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "short" })}</div>
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
    ${!isCurrentMonthView ? `<button type="button" class="btn ghost" data-action="cal-today" style="margin-left:4px;font-size:0.72rem;">${t("diff.today")}</button>` : ""}
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
        bg = `background: color-mix(in srgb, var(--ok, #10b981) ${alpha}%, transparent)`;
      } else if (change > 0) {
        const alpha = Math.min(50, Math.round(change * 30 + 15));
        bg = `background: color-mix(in srgb, var(--warn, #f59e0b) ${alpha}%, transparent)`;
      } else {
        bg = `background: color-mix(in srgb, var(--accent) 20%, transparent)`;
      }
      changeLabel = ` (${change > 0 ? "+" : ""}${change.toFixed(1)})`;
    } else if (hasRecord) {
      const intensity = d.intensity !== null ? d.intensity : 0;
      bg = `background: color-mix(in srgb, var(--accent) ${Math.round(20 + intensity * 60)}%, transparent)`;
    }
    html += `<div class="calendar-cell${hasRecord ? " has-record" : ""}${isToday ? " today" : ""}" style="${bg}" title="${hasRecord ? `${d.wt}kg${changeLabel}` : ""}"${hasRecord ? ` aria-label="${d.day}${t("calendar.dayUnit")} ${d.wt}kg${changeLabel}"` : ""}>
      <span class="calendar-day">${d.day}</span>
      ${hasRecord ? `<span class="calendar-wt">${d.wt}</span>` : ""}
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
          return `<span class="source-chip"><span class="source-icon">${icon}</span> ${t("entry.source." + src)} <strong>${count}</strong> (${pct}%)</span>`;
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
        <div class="wdwe-vs">vs</div>
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
    ? `<div class="helper hint-small" style="color:var(--ok,#10b981);font-weight:600;">${t("health.perfect")}</div>`
    : health.issues.slice(0, 3).map((issue) => {
      if (issue.type === "gap") return `<div class="health-issue">📅 ${t("health.gap").replace("{days}", issue.days).replace("{from}", issue.from).replace("{to}", issue.to)}</div>`;
      if (issue.type === "outlier") return `<div class="health-issue">📊 ${t("health.outlier").replace("{date}", issue.date).replace("{weight}", issue.weight).replace("{expected}", issue.expected)}</div>`;
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
      ${hasPerfect ? `<div class="helper hint-small" style="color:var(--ok,#10b981);font-weight:600;margin-top:2px;">${t("freq.perfect")}</div>` : ""}
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
        ${cs.streak >= 5 ? `<span class="helper hint-small" style="color:var(--ok,#10b981);font-weight:600;">${t("consistency.great")}</span>` : ""}
      </div>
    </div>
  `;
}

function renderBMIDistribution() {
  const dist = calcBMIDistribution(state.records);
  if (!dist) return "";
  const zones = [
    { key: "under", color: "var(--accent-3, #3b82f6)" },
    { key: "normal", color: "var(--ok, #10b981)" },
    { key: "over", color: "var(--warn, #f59e0b)" },
    { key: "obese", color: "var(--error, #ef4444)" },
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
          ${pctl.percentile <= 10 ? `<div class="helper hint-small" style="color:var(--ok,#10b981);font-weight:600;">${t("percentile.best")}</div>` : ""}
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
  app.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      activeEntryMode = button.dataset.mode;
      render();
    });
  });

  app.querySelector('[data-action="save-profile"]')?.addEventListener("click", saveProfile);
  app.querySelector('[data-action="save-settings"]')?.addEventListener("click", saveSettings);
  app.querySelector('[data-action="save-record"]')?.addEventListener("click", saveRecordFromPicker);
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
  app.querySelector("#recordSearch")?.addEventListener("input", (e) => {
    recordSearchQuery = e.target.value;
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      const pos = e.target.selectionStart;
      render();
      // Restore focus and cursor position after render
      const input = document.getElementById("recordSearch");
      if (input) { input.focus(); input.selectionStart = input.selectionEnd = pos; }
    }, 150);
  });
  app.querySelector("#dateRangeFrom")?.addEventListener("change", (e) => {
    recordDateFrom = e.target.value;
    render();
  });
  app.querySelector("#dateRangeTo")?.addEventListener("change", (e) => {
    recordDateTo = e.target.value;
    render();
  });
  app.querySelector('[data-action="clear-date-range"]')?.addEventListener("click", () => {
    recordDateFrom = "";
    recordDateTo = "";
    render();
  });
  app.querySelector('[data-action="export-excel"]')?.addEventListener("click", exportExcel);
  app.querySelector('[data-action="export-csv"]')?.addEventListener("click", exportCSV);
  app.querySelector('[data-action="export-text"]')?.addEventListener("click", exportText);
  app.querySelector('[data-action="import-csv"]')?.addEventListener("click", () => {
    document.getElementById("csvImportInput")?.click();
  });
  document.getElementById("csvImportInput")?.addEventListener("change", handleCSVImport);
  app.querySelector('[data-action="save-goal"]')?.addEventListener("click", saveGoal);
  app.querySelector('[data-action="save-reminder"]')?.addEventListener("click", saveReminder);
  app.querySelector('[data-action="google-backup"]')?.addEventListener("click", googleBackup);
  app.querySelector('[data-action="google-restore"]')?.addEventListener("click", googleRestore);
  app.querySelector('[data-action="undo"]')?.addEventListener("click", undoLastSave);
  app.querySelector('[data-action="zoom-photo"]')?.addEventListener("click", handlePhotoZoom);
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
      quickWeight = Math.round((quickWeight + adj) * 10) / 10;
      quickWeight = Math.max(20, Math.min(300, quickWeight));
      const display = document.getElementById("quickDisplay");
      if (display) display.textContent = `${quickWeight.toFixed(1)} kg`;
    });
  });

  app.querySelectorAll("[data-pick-weight]").forEach((button) => {
    button.addEventListener("click", () => {
      const w = parseFloat(button.dataset.pickWeight);
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
        const d = new Date();
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
      if (!window.confirm(t("confirm.deleteRecord"))) return;
      lastUndoState = { records: [...state.records], quickWeight };
      state.records = state.records.filter((r) => r.dt !== button.dataset.deleteDate);
      persist();
      setStatus(t("records.deleted"));
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
    state.profile = { ...state.profile, [name]: value };
    if (name === "heightCm") render();
    return;
  }

  if (name === "pickerInt") {
    state.form.pickerInt = parseInt(value, 10);
    state.form.weight = `${state.form.pickerInt}.${state.form.pickerDec}`;
    render();
    return;
  }

  if (name === "pickerDec") {
    state.form.pickerDec = parseInt(value, 10);
    state.form.weight = `${state.form.pickerInt}.${state.form.pickerDec}`;
    render();
    return;
  }

  if (["weight", "date", "bodyFat", "note"].includes(name)) {
    state.form = { ...state.form, [name]: value };
    return;
  }

  if (name === "language") {
    state.settings.language = value;
    t = createTranslator(value);
    render();
    return;
  }

  if (name === "theme" || name === "chartStyle") {
    state.settings[name] = value;
    render();
    return;
  }

  if (name === "adPreviewEnabled") {
    state.settings.adPreviewEnabled = value === "true";
    render();
    return;
  }

  if (name === "goalWeight") {
    state.settings.goalWeight = value;
    return;
  }

  if (name === "reminderEnabled") {
    state.settings.reminderEnabled = value === "true";
    return;
  }

  if (name === "reminderTime") {
    state.settings.reminderTime = value;
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

function saveRecordFromPicker() {
  const weight = state.form.pickerInt + state.form.pickerDec / 10;
  state.form.weight = weight.toFixed(1);
  saveRecordWithWeight(weight, activeEntryMode);
}

function quickSaveRecord() {
  saveRecordWithWeight(quickWeight, "quick");
}

let lastUndoState = null;
let undoTimer = null;

function saveRecordWithWeight(weight, source) {
  const weightResult = validateWeight(String(weight));
  if (!weightResult.valid) {
    setStatus(t(weightResult.error || "entry.noWeight"), "error");
    return;
  }

  const bfResult = validateBodyFat(state.form.bodyFat);
  if (!bfResult.valid) {
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
  imagePreviewUrl = "";
  detectedWeights = [];
  activeEntryMode = "manual";
  state.form = {
    ...state.form,
    weight: weightResult.weight.toFixed(1),
    pickerInt: Math.floor(weightResult.weight),
    pickerDec: Math.round((weightResult.weight - Math.floor(weightResult.weight)) * 10),
    imageName: "",
    bodyFat: "",
    note: "",
  };
  if (!persist()) {
    setStatus(t("status.storageError"), "error");
    return;
  }
  if (navigator.vibrate) navigator.vibrate(50);
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
  render();
}

async function pickNativePhoto() {
  try {
    const permissions = await Camera.checkPermissions();
    if (permissions.photos === "denied" || permissions.camera === "denied") {
      const requested = await Camera.requestPermissions({ permissions: ["photos", "camera"] });
      if (requested.photos === "denied" || requested.camera === "denied") {
        setStatus(t("status.permissionDenied"), "error");
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

    imagePreviewUrl = photo.webPath || "";
    state.form.imageName = photo.path?.split("/").pop() || "camera-photo.jpeg";
    detectedWeights = [];

    if (photo.webPath) {
      try {
        const response = await fetch(photo.webPath);
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
    setStatus(t("status.photoReady"));
  } catch {
    setStatus(t("status.permissionDenied"), "error");
    return;
  }

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

  recognition.onerror = () => {
    voiceActive = false;
    setStatus(t("status.voiceError"), "error");
  };

  recognition.onend = () => {
    voiceActive = false;
    render();
  };

  recognition.start();
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
    let merged = [...state.records];
    for (const rec of records) {
      merged = upsertRecord(merged, rec);
    }
    merged = trimRecords(merged);
    state.records = merged;
    persist();
    let msg = t("import.csv.success").replace("{count}", records.length);
    if (errors.length) {
      msg += " " + t("import.csv.errors").replace("{count}", errors.length);
    }
    setStatus(msg);
    e.target.value = "";
    render();
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
  anchor.click();
  URL.revokeObjectURL(url);
}

async function shareChart() {
  const canvas = document.getElementById("chart");
  if (!canvas) return;
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
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
    a.click();
    URL.revokeObjectURL(url);
    setStatus(t("share.done"));
  } catch {
    setStatus(t("share.error"), "error");
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

      if (!window.confirm(t("import.confirm"))) return;

      // Merge records by date (imported records fill gaps, don't overwrite)
      for (const record of data.records) {
        if (record.dt && Number.isFinite(record.wt)) {
          state.records = upsertRecord(state.records, record);
        }
      }
      state.records = trimRecords(state.records, MAX_RECORDS);

      // Import profile if present and current one is empty
      if (data.profile && !state.profile.name) {
        state.profile = { ...state.profile, ...data.profile };
      }

      if (!persist()) {
        setStatus(t("status.storageError"), "error");
        return;
      }
      quickWeight = state.records.length ? state.records[state.records.length - 1].wt : 65.0;
      setStatus(t("import.success"));
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
  imagePreviewUrl = "";
  activeEntryMode = "manual";

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

  setStatus(t("status.reset"));
}

function drawChart() {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

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
    const d = new Date();
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
    const weightLabel = (max - (index / 4) * range).toFixed(1);
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
    context.setLineDash([4, 4]);
    context.strokeStyle = cs.getPropertyValue("--accent-3").trim() || "#0ea5e9";
    context.lineWidth = 1.5;
    context.globalAlpha = 0.6;
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
  [0, Math.floor((chartRecords.length - 1) / 2), chartRecords.length - 1]
    .filter((value, index, array) => array.indexOf(value) === index)
    .forEach((index) => {
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
    }, 3000);
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
    }, 2000);
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
    const val = parseFloat(raw);
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

  let lastNotifiedDate = "";

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
    c.callback = (r) => {
      if (r.error) reject(new Error(r.error));
      else {
        gToken = r.access_token;
        gTokenExpiresAt = Date.now() + (r.expires_in || 3600) * 1000 - 60000;
        resolve(r.access_token);
      }
    };
    if (gToken && Date.now() < gTokenExpiresAt) resolve(gToken);
    else c.requestAccessToken();
  });
}

async function googleBackup() {
  if (!GOOGLE_CLIENT_ID) { setStatus(t("google.notConfigured"), "error"); return; }
  const btn = app.querySelector('[data-action="google-backup"]');
  btn?.classList.add("loading");
  try {
    const tk = await googleGetToken();
    const data = {
      exportedAt: new Date().toISOString(),
      records: state.records.map((r) => ({
        dt: r.dt, wt: r.wt, bmi: r.bmi, bf: r.bf ?? null, source: r.source, note: r.note ?? "", createdAt: r.createdAt,
      })),
      settings: {
        goalWeight: state.settings.goalWeight,
        theme: state.settings.theme,
        language: state.settings.language,
      },
    };
    const sr = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}'+and+trashed=false&spaces=appDataFolder&fields=files(id)`,
      { headers: { Authorization: `Bearer ${tk}` } },
    );
    if (!sr.ok) throw new Error("drive_error");
    const sd = await sr.json();
    const ex = sd.files?.[0];
    const bd = JSON.stringify(data, null, 2);
    let ur;
    if (ex) {
      ur = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${ex.id}?uploadType=media`,
        { method: "PATCH", headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" }, body: bd },
      );
    } else {
      const boundary = "weight_rainbow_boundary";
      const multipartBody =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: BACKUP_FILENAME, mimeType: "application/json", parents: ["appDataFolder"] }) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${bd}\r\n--${boundary}--`;
      ur = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        { method: "POST", headers: { Authorization: `Bearer ${tk}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipartBody },
      );
    }
    if (!ur.ok) throw new Error("drive_error");
    setStatus(t("google.backupDone"));
  } catch (e) {
    setStatus(e.message === "not_configured" ? t("google.notConfigured") : t("google.error"), "error");
  } finally {
    btn?.classList.remove("loading");
  }
}

async function googleRestore() {
  if (!GOOGLE_CLIENT_ID) { setStatus(t("google.notConfigured"), "error"); return; }
  const btn = app.querySelector('[data-action="google-restore"]');
  btn?.classList.add("loading");
  try {
    const tk = await googleGetToken();
    const sr = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}'+and+trashed=false&spaces=appDataFolder&fields=files(id)`,
      { headers: { Authorization: `Bearer ${tk}` } },
    );
    if (!sr.ok) throw new Error("drive_error");
    const sd = await sr.json();
    const f = sd.files?.[0];
    if (!f) { setStatus(t("google.noData"), "error"); return; }
    const cr = await fetch(
      `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
      { headers: { Authorization: `Bearer ${tk}` } },
    );
    if (!cr.ok) throw new Error("drive_error");
    const bd = await cr.json();
    if (!bd.records?.length) { setStatus(t("google.noData"), "error"); return; }
    if (!window.confirm(t("google.restoreConfirm"))) return;
    let m = [...state.records];
    for (const r of bd.records) {
      if (!r.dt || !Number.isFinite(r.wt)) continue;
      m = upsertRecord(m, { ...r, bmi: r.bmi ?? null, bf: r.bf ?? null, note: r.note ?? "", source: r.source || "manual", imageName: "" });
    }
    state.records = trimRecords(m, MAX_RECORDS);
    if (bd.settings?.goalWeight != null) state.settings.goalWeight = bd.settings.goalWeight;
    if (!persist()) { setStatus(t("status.storageError"), "error"); return; }
    setStatus(t("google.restoreDone"));
    render();
  } catch (e) {
    setStatus(e.message === "not_configured" ? t("google.notConfigured") : t("google.error"), "error");
  } finally {
    btn?.classList.remove("loading");
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
  ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out";
  ov.setAttribute("role", "dialog");
  ov.setAttribute("aria-label", t("photo.zoomHint"));
  const im = document.createElement("img");
  im.src = imagePreviewUrl;
  im.alt = t("entry.photoPreview");
  im.style.cssText = "max-width:95vw;max-height:95vh;object-fit:contain;border-radius:12px";
  ov.appendChild(im);
  ov.tabIndex = -1;
  const dismiss = () => { ov.remove(); document.removeEventListener("keydown", onKey); };
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
window.addEventListener("beforeunload", () => {
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
});
window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    saveRecordFromPicker();
  }

  if (event.key === "Escape" && voiceActive) {
    event.preventDefault();
    void toggleVoiceInput();
  }

  if (event.key === "Escape" && rainbowVisible) {
    rainbowVisible = false;
    document.getElementById("rainbowOverlay")?.remove();
  }

  // Ctrl/Cmd+K to focus search
  if ((event.metaKey || event.ctrlKey) && event.key === "k") {
    event.preventDefault();
    const searchInput = document.getElementById("recordSearch");
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }
});
