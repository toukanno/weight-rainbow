/**
 * Pure business logic extracted from index.html for testability.
 */

/**
 * Parse and validate a weight input value.
 * @param {string|number} value - Raw input value
 * @returns {{ valid: boolean, weight?: number, error?: string }}
 */
export function validateWeight(value) {
  const wt = parseFloat(value);
  if (!wt || isNaN(wt)) {
    return { valid: false, error: "体重を入力してください" };
  }
  if (wt < 0) {
    return { valid: false, error: "体重は正の値を入力してください" };
  }
  return { valid: true, weight: wt };
}

/**
 * Add or update a weight record in the log.
 * @param {Array<{dt: string, wt: number}>} records - Existing records
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {number} weight - Weight in kg
 * @returns {Array<{dt: string, wt: number}>} Updated records (sorted by date)
 */
export function upsertRecord(records, date, weight) {
  const d = [...records];
  const existing = d.findIndex(r => r.dt === date);
  if (existing >= 0) {
    d[existing] = { ...d[existing], wt: weight };
  } else {
    d.push({ dt: date, wt: weight });
  }
  d.sort((a, b) => a.dt.localeCompare(b.dt));
  return d;
}

/**
 * Trim records to a maximum count, removing the oldest entries.
 * @param {Array<{dt: string, wt: number}>} records - Sorted records
 * @param {number} maxCount - Maximum number of records to keep
 * @returns {Array<{dt: string, wt: number}>} Trimmed records
 */
export function trimRecords(records, maxCount = 90) {
  if (records.length <= maxCount) return records;
  return records.slice(records.length - maxCount);
}

/**
 * Calculate statistics from an array of weight values.
 * @param {number[]} weights - Array of weight values
 * @returns {{ latest: number, min: number, max: number, change: number, avg: string }}
 */
export function calcStats(weights) {
  if (!weights.length) return null;
  const latest = weights[weights.length - 1];
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const change = weights[weights.length - 1] - weights[0];
  const avg = (weights.reduce((s, v) => s + v, 0) / weights.length).toFixed(1);
  return { latest, min, max, change, avg };
}
