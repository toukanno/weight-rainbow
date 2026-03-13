import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import {
  STORAGE_KEYS,
  MAX_RECORDS,
  buildRecord,
  calcStats,
  calcDailyDiff,
  calcGoalProgress,
  calcPeriodSummary,
  createDefaultProfile,
  createDefaultSettings,
  extractWeightCandidates,
  getBMIStatus,
  pickWeightCandidate,
  parseVoiceWeight,
  trimRecords,
  upsertRecord,
  validateProfile,
  validateWeight,
  THEME_LIST,
} from "./logic.js";
import { createTranslator } from "./i18n.js";
import { NativeSpeechRecognition } from "./native-speech.js";
import * as XLSX from "xlsx";

const app = document.getElementById("app");
const APP_VERSION = "1.0.0";
const isNativePlatform = Capacitor.isNativePlatform();
const BrowserSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const supportsSpeech = isNativePlatform || Boolean(BrowserSpeechRecognition);
const supportsTextDetection = "TextDetector" in window;

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
let reminderTimer = null;

// Initialize quick weight from last record
{
  const lastRecord = state.records[state.records.length - 1];
  if (lastRecord) quickWeight = lastRecord.wt;
}

// First-launch language selection
if (!window.localStorage.getItem(STORAGE_KEYS.firstLaunchDone)) {
  showFirstLaunchModal();
} else {
  render();
}

// Initialize reminder system
initReminder();

function loadState() {
  return {
    records: safeParse(STORAGE_KEYS.records, []),
    profile: { ...createDefaultProfile(), ...safeParse(STORAGE_KEYS.profile, {}) },
    settings: { ...createDefaultSettings(), ...safeParse(STORAGE_KEYS.settings, {}) },
    form: {
      weight: "",
      date: new Date().toISOString().slice(0, 10),
      imageName: "",
      pickerInt: 65,
      pickerDec: 0,
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
      <div class="lang-modal">
        <h2>ようこそ / Welcome</h2>
        <p>言語を選択してください<br>Choose your language</p>
        <div class="lang-modal-buttons">
          <button type="button" data-lang="ja">🇯🇵 日本語</button>
          <button type="button" data-lang="en">🇬🇧 English</button>
        </div>
      </div>
    </div>
  `;
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

function setStatus(message, kind = "ok") {
  statusMessage = message;
  statusKind = kind;
  render();
}

function updateLanguage(language) {
  state.settings.language = language;
  t = createTranslator(language);
  persist();
  render();
}

function formatWeight(weight) {
  return `${Number(weight).toFixed(1)}kg`;
}

function formatBMI(bmi) {
  return bmi ? bmi.toFixed(1) : t("chart.none");
}

function render() {
  document.documentElement.lang = state.settings.language;
  document.title = t("app.title");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t("app.description"));
  document.body.dataset.theme = state.settings.theme;

  const stats = calcStats(state.records, state.profile);
  const dailyDiff = calcDailyDiff(state.records);
  const goalWeight = Number(state.settings.goalWeight);
  const goalProgress = calcGoalProgress(state.records, goalWeight);
  const periodDays = summaryPeriod === "week" ? 7 : 30;
  const periodSummary = calcPeriodSummary(state.records, periodDays);
  const bmiStatus = stats?.latestBMI ? t(getBMIStatus(stats.latestBMI)) : t("bmi.unknown");
  const previewWeightResult = validateWeight(state.form.weight);
  const currentBMI = previewWeightResult.valid && state.profile.heightCm
    ? buildRecord({
        date: state.form.date || new Date().toISOString().slice(0, 10),
        weight: previewWeightResult.weight,
        profile: state.profile,
        source: activeEntryMode,
        imageName: state.form.imageName,
      }).bmi
    : null;

  app.innerHTML = `
    <div class="app-shell">
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
            </div>
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
        </div>

        <!-- Daily Diff & Goal Progress -->
        <div class="hero-bottom" style="grid-template-columns: 1fr 1fr; margin-top: 12px;">
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
                <div class="progress-bar-track">
                  <div class="progress-bar-fill" style="width: ${goalProgress.percent}%"></div>
                </div>
                <div class="progress-text">
                  <span>${t("goal.progress")}</span>
                  <span>${goalProgress.remaining <= 0 ? t("goal.achieved") : `${t("goal.remaining")}: ${goalProgress.remaining.toFixed(1)}kg`}</span>
                </div>`
              : `<div class="diff-value zero">--</div>
                <div class="diff-detail">${t("goal.notSet")}</div>`}
          </div>
        </div>
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

            <div class="tab-row">
              ${renderTab("manual", t("entry.manual"))}
              ${renderTab("voice", t("entry.voice"))}
              ${renderTab("photo", t("entry.photo"))}
            </div>

            <div class="entry-layout">
              <div class="input-grid">
                <div class="field">
                  <label>${t("entry.weight")}</label>
                  <div class="weight-picker">
                    <select id="pickerInt" name="pickerInt">
                      ${renderPickerIntOptions(state.form.pickerInt)}
                    </select>
                    <span class="picker-dot">.</span>
                    <select id="pickerDec" name="pickerDec">
                      ${renderPickerDecOptions(state.form.pickerDec)}
                    </select>
                    <span class="picker-unit">${t("picker.kg")}</span>
                  </div>
                </div>
                <div class="field">
                  <label for="recordDate">${t("entry.date")}</label>
                  <input id="recordDate" name="date" type="date" value="${escapeAttr(state.form.date)}" />
                </div>
              </div>

              <!-- Quick Record Section -->
              <div class="quick-section">
                <h3>${t("quick.title")}</h3>
                <p class="helper">${t("quick.hint")}</p>
                <div class="quick-display" id="quickDisplay">${quickWeight.toFixed(1)} kg</div>
                <div class="quick-buttons">
                  <button type="button" data-quick-adj="-1.0">-1.0</button>
                  <button type="button" data-quick-adj="-0.5">-0.5</button>
                  <button type="button" data-quick-adj="-0.1">-0.1</button>
                  <button type="button" data-quick-adj="+0.1">+0.1</button>
                  <button type="button" data-quick-adj="+0.5">+0.5</button>
                  <button type="button" data-quick-adj="+1.0">+1.0</button>
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
                  <span class="helper">${voiceActive ? t("status.listening") : ""}</span>
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
                  <span class="helper">${supportsTextDetection ? "" : t("entry.photoFallback")}</span>
                </div>
                ${imagePreviewUrl ? `<img class="photo-preview" src="${imagePreviewUrl}" alt="${t("entry.photoPreview")}" />` : ""}
                ${detectedWeights.length ? `<div style="margin-top: 12px;"><div class="helper">${t("entry.photoDetected")}</div><div class="chip-row" style="margin-top: 8px;">${detectedWeights.map((weight) => `<button type="button" class="chip" data-pick-weight="${weight}">${formatWeight(weight)}</button>`).join("")}</div></div>` : ""}
              </div>

              <div class="row">
                <button type="button" class="btn" data-action="save-record">${t("entry.save")}</button>
                <div class="helper">${state.profile.heightCm ? `${t("entry.bmiReady")}: ${formatBMI(currentBMI)}` : t("bmi.unknown")}</div>
              </div>
            </div>

            <div class="status ${statusKind === "error" ? "warn" : ""}" role="status" aria-live="polite">${statusMessage}</div>
          </section>

          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("section.chart")}</h2>
                <p>${stats?.latestDate ?? t("chart.empty")}</p>
              </div>
            </div>
            <canvas id="chart" width="960" height="${state.settings.chartStyle === "compact" ? 220 : 320}"></canvas>
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
            <div class="summary-tabs">
              <button type="button" class="summary-tab ${summaryPeriod === "week" ? "active" : ""}" data-summary="week">${t("summary.week")}</button>
              <button type="button" class="summary-tab ${summaryPeriod === "month" ? "active" : ""}" data-summary="month">${t("summary.month")}</button>
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
            <div class="record-list">
              ${state.records.length ? renderRecordList() : `<div class="helper">${t("records.empty")}</div>`}
            </div>
            <div class="export-grid">
              <button type="button" class="btn secondary" data-action="export-excel">${t("export.excel")}</button>
              <button type="button" class="btn secondary" data-action="export-csv">${t("export.csv")}</button>
              <button type="button" class="btn secondary" data-action="export-text">${t("export.text")}</button>
            </div>
          </section>
        </div>

        <div class="column">
          <section class="panel">
            <div class="section-header">
              <div>
                <h2>${t("section.settings")}</h2>
                <p>${t("settings.saved")}</p>
              </div>
              <button type="button" class="btn secondary" data-action="save-settings">${t("section.settings")}</button>
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
                <div class="theme-grid">
                  ${THEME_LIST.map((theme) => `
                    <button type="button" class="theme-swatch ${state.settings.theme === theme.id ? "active" : ""}" data-theme-pick="${theme.id}">
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
            <div class="row" style="margin-top: 16px;">
              <button type="button" class="btn secondary" data-action="export-data">${t("settings.export")}</button>
              <button type="button" class="btn ghost" data-action="reset-data">${t("settings.reset")}</button>
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
              <input id="goalWeight" name="goalWeight" inputmode="decimal" value="${escapeAttr(state.settings.goalWeight ?? "")}" />
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
              <button type="button" class="btn secondary" data-action="save-reminder">${t("reminder.saved").split("しました")[0] || t("goal.save")}</button>
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
    </div>
    ${rainbowVisible ? `
    <div class="rainbow-overlay" id="rainbowOverlay">
      <div class="confetti-container" id="confettiContainer"></div>
      <div class="rainbow-card">
        <div class="rainbow-emoji">🌈✨</div>
        <div class="rainbow-text">${t("rainbow.congrats")}</div>
        <div class="rainbow-detail">${rainbowDetail}</div>
      </div>
    </div>
    ` : ""}
  `;

  bindEvents();
  drawChart();

  if (rainbowVisible) {
    spawnConfetti();
    setTimeout(() => {
      const overlay = document.getElementById("rainbowOverlay");
      if (overlay) {
        overlay.classList.add("fade-out");
        setTimeout(() => {
          rainbowVisible = false;
          overlay.remove();
        }, 500);
      }
    }, 2500);
  }
}

function renderMetric(label, value) {
  return `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function renderStat(label, value) {
  return `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function renderOption(value, selectedValue, label) {
  return `<option value="${value}" ${String(value) === String(selectedValue) ? "selected" : ""}>${label}</option>`;
}

function renderTab(mode, label) {
  return `<button type="button" class="tab ${activeEntryMode === mode ? "active" : ""}" data-mode="${mode}">${label}</button>`;
}

function renderRecord(record) {
  const bmiText = record.bmi ? `${record.bmi.toFixed(1)} / ${t(getBMIStatus(record.bmi))}` : t("chart.none");
  return `
    <div class="record-item">
      <div class="record-row">
        <div class="tag">${t(`entry.source.${record.source}`)}</div>
        <div>
          <div class="record-weight">${formatWeight(record.wt)}</div>
          <div class="helper">${escapeHtml(record.dt)}${record.imageName ? ` / ${escapeHtml(record.imageName)}` : ""}</div>
        </div>
        <div class="helper">${t("bmi.title")}: ${bmiText}</div>
      </div>
      <button type="button" class="record-delete" data-delete-date="${escapeAttr(record.dt)}">${t("records.delete")}</button>
    </div>
  `;
}

function renderRecordList() {
  const reversed = state.records.slice().reverse();
  const displayed = showAllRecords ? reversed : reversed.slice(0, 5);
  return displayed.map(renderRecord).join("");
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
  app.querySelector('[data-action="quick-save"]')?.addEventListener("click", quickSaveRecord);
  app.querySelector('[data-action="toggle-records"]')?.addEventListener("click", () => {
    showAllRecords = !showAllRecords;
    render();
  });
  app.querySelector('[data-action="export-excel"]')?.addEventListener("click", exportExcel);
  app.querySelector('[data-action="export-csv"]')?.addEventListener("click", exportCSV);
  app.querySelector('[data-action="export-text"]')?.addEventListener("click", exportText);
  app.querySelector('[data-action="save-goal"]')?.addEventListener("click", saveGoal);
  app.querySelector('[data-action="save-reminder"]')?.addEventListener("click", saveReminder);

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

  app.querySelectorAll("[data-delete-date]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!window.confirm(t("confirm.deleteRecord"))) return;
      state.records = state.records.filter((r) => r.dt !== button.dataset.deleteDate);
      persist();
      render();
    });
  });

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

  app.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", handleFieldInput);
    element.addEventListener("change", handleFieldInput);
  });
}

function handleFieldInput(event) {
  const { name, value } = event.target;

  if (["name", "heightCm", "age", "gender"].includes(name)) {
    state.profile = { ...state.profile, [name]: value };
    return;
  }

  if (name === "pickerInt") {
    state.form.pickerInt = parseInt(value, 10);
    state.form.weight = `${state.form.pickerInt}.${state.form.pickerDec}`;
    return;
  }

  if (name === "pickerDec") {
    state.form.pickerDec = parseInt(value, 10);
    state.form.weight = `${state.form.pickerInt}.${state.form.pickerDec}`;
    return;
  }

  if (["weight", "date"].includes(name)) {
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

function saveRecordWithWeight(weight, source) {
  const profileResult = validateProfile(state.profile);
  if (!profileResult.valid) {
    setStatus(t(profileResult.error), "error");
    return;
  }

  const weightResult = validateWeight(String(weight));
  if (!weightResult.valid) {
    setStatus(t(weightResult.error || "entry.noWeight"), "error");
    return;
  }

  state.profile = {
    ...profileResult.profile,
    heightCm: profileResult.profile.heightCm ?? "",
    age: profileResult.profile.age ?? "",
  };

  checkRainbow(weightResult.weight);

  const record = buildRecord({
    date: state.form.date || new Date().toISOString().slice(0, 10),
    weight: weightResult.weight,
    profile: state.profile,
    source,
    imageName: state.form.imageName,
  });

  const updated = upsertRecord(state.records, record);
  state.records = trimRecords(updated, MAX_RECORDS);
  quickWeight = weightResult.weight;
  state.form = {
    ...state.form,
    weight: weightResult.weight.toFixed(1),
    pickerInt: Math.floor(weightResult.weight),
    pickerDec: Math.round((weightResult.weight - Math.floor(weightResult.weight)) * 10),
    imageName: source === "photo" ? state.form.imageName : "",
  };
  if (!persist()) {
    setStatus(t("status.storageError"), "error");
    return;
  }
  setStatus(`${t("entry.saved")} · ${t("bmi.title")}: ${record.bmi ? record.bmi.toFixed(1) : t("bmi.unknown")}`);
}

function saveRecord() {
  saveRecordFromPicker();
}

async function handlePhotoSelection(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  imagePreviewUrl = URL.createObjectURL(file);
  state.form.imageName = file.name;
  detectedWeights = [];

  if (supportsTextDetection) {
    try {
      const detector = new window.TextDetector();
      const bitmap = await createImageBitmap(file);
      const textBlocks = await detector.detect(bitmap);
      const extracted = textBlocks.map((block) => block.rawValue || "").join(" ");
      const candidates = extractWeightCandidates(extracted);
      detectedWeights = candidates;
      const picked = pickWeightCandidate(candidates, state.records.at(-1)?.wt ?? null);
      if (picked) {
        state.form.weight = picked.toFixed(1);
      }
    } catch {
      detectedWeights = [];
    }
  }

  setStatus(t("status.photoReady"));
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
      promptLabelCancel: state.settings.language === "ja" ? "キャンセル" : "Cancel",
      promptLabelPhoto: state.settings.language === "ja" ? "フォトライブラリ" : "Photo Library",
      promptLabelPicture: state.settings.language === "ja" ? "カメラ" : "Camera",
    });

    imagePreviewUrl = photo.webPath || "";
    state.form.imageName = photo.path?.split("/").pop() || "camera-photo.jpeg";
    detectedWeights = [];

    if (photo.webPath && supportsTextDetection) {
      try {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        const detector = new window.TextDetector();
        const textBlocks = await detector.detect(bitmap);
        const extracted = textBlocks.map((block) => block.rawValue || "").join(" ");
        const candidates = extractWeightCandidates(extracted);
        detectedWeights = candidates;
        const picked = pickWeightCandidate(candidates, state.records.at(-1)?.wt ?? null);
        if (picked) {
          state.form.weight = picked.toFixed(1);
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
  const rows = state.records.map((r) => ({
    Date: r.dt,
    "Weight (kg)": r.wt,
    BMI: r.bmi ?? "",
    Source: r.source,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Weight Records");
  XLSX.writeFile(wb, `weight-rainbow-${new Date().toISOString().slice(0, 10)}.xlsx`);
  setStatus(t("export.excelDone"));
}

function exportCSV() {
  if (!state.records.length) {
    setStatus(t("records.empty"), "error");
    return;
  }
  const header = "Date,Weight (kg),BMI,Source";
  const lines = state.records.map((r) =>
    `${r.dt},${r.wt},${r.bmi ?? ""},${r.source}`
  );
  const csv = [header, ...lines].join("\n");
  downloadFile(csv, `weight-rainbow-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
  setStatus(t("export.csvDone"));
}

function exportText() {
  if (!state.records.length) {
    setStatus(t("records.empty"), "error");
    return;
  }
  const lines = state.records.map((r) => {
    const bmiStr = r.bmi ? ` / BMI: ${r.bmi.toFixed(1)}` : "";
    return `${r.dt}  ${r.wt.toFixed(1)}kg${bmiStr}  (${r.source})`;
  });
  const text = `Rainbow Weight Log - ${new Date().toISOString().slice(0, 10)}\n${"=".repeat(48)}\n${lines.join("\n")}`;
  downloadFile(text, `weight-rainbow-${new Date().toISOString().slice(0, 10)}.txt`, "text/plain");
  setStatus(t("export.textDone"));
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

function spawnConfetti() {
  const container = document.getElementById("confettiContainer");
  if (!container) return;
  const colors = ["#ff0000", "#ff9a00", "#d0de21", "#4fdc4a", "#3fdad8", "#2f6bec", "#8b45db", "#ec4899"];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = `${Math.random() * 100}%`;
    el.style.top = `${Math.random() * 60}%`;
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = `${Math.random() * 0.8}s`;
    el.style.animationDuration = `${1 + Math.random() * 1}s`;
    container.appendChild(el);
  }
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    settings: state.settings,
    records: state.records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `weight-rainbow-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus(t("status.exported"));
}

function resetData() {
  if (!window.confirm(t("confirm.reset"))) return;

  state = {
    ...loadState(),
    profile: createDefaultProfile(),
    settings: state.settings,
  };
  state.records = [];
  state.form = {
    weight: "",
    date: new Date().toISOString().slice(0, 10),
    imageName: "",
    pickerInt: 65,
    pickerDec: 0,
  };
  quickWeight = 65.0;
  voiceTranscript = "";
  detectedWeights = [];

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

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!state.records.length) {
    context.fillStyle = "#7c7f9b";
    context.font = "16px sans-serif";
    context.fillText(t("chart.empty"), 24, 48);
    return;
  }

  const weights = state.records.map((record) => record.wt);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 2;
  const padX = 40;
  const padY = 28;
  const width = canvas.width;
  const height = canvas.height;

  const toX = (index) => padX + (index / Math.max(state.records.length - 1, 1)) * (width - padX * 2);
  const toY = (weight) => height - padY - ((weight - min) / range) * (height - padY * 2);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, getComputedStyle(document.body).getPropertyValue("--accent"));
  gradient.addColorStop(0.5, getComputedStyle(document.body).getPropertyValue("--accent-2"));
  gradient.addColorStop(1, getComputedStyle(document.body).getPropertyValue("--accent-3"));

  context.strokeStyle = "rgba(120,130,180,0.18)";
  context.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    const y = padY + (index / 4) * (height - padY * 2);
    context.beginPath();
    context.moveTo(padX, y);
    context.lineTo(width - padX, y);
    context.stroke();
  }

  context.strokeStyle = gradient;
  context.lineWidth = 4;
  context.beginPath();
  state.records.forEach((record, index) => {
    const x = toX(index);
    const y = toY(record.wt);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = gradient;
  state.records.forEach((record, index) => {
    const x = toX(index);
    const y = toY(record.wt);
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fill();
  });

  context.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  context.font = "12px sans-serif";
  context.textAlign = "center";
  [0, Math.floor((state.records.length - 1) / 2), state.records.length - 1]
    .filter((value, index, array) => array.indexOf(value) === index)
    .forEach((index) => {
      const record = state.records[index];
      context.fillText(record.dt.slice(5), toX(index), height - 8);
    });
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

function escapeHtml(value) {
  return escapeAttr(value);
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
  setStatus(t("goal.save"));
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
    const todayStr = now.toISOString().slice(0, 10);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const targetTime = state.settings.reminderTime || "21:00";

    if (currentTime === targetTime && lastNotifiedDate !== todayStr) {
      const hasRecordToday = state.records.some((r) => r.dt === todayStr);
      if (!hasRecordToday) {
        new Notification(t("app.title"), {
          body: t("reminder.body"),
          icon: "./assets/icon.svg",
        });
        lastNotifiedDate = todayStr;
      }
    }
  }, 30000); // Check every 30 seconds
}

window.addEventListener("resize", () => drawChart());
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
});
