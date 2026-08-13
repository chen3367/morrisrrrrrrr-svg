const db = window.MS_COMBAT_ANALYSIS_DB || {};
const levelRows = Array.isArray(db.levels) ? db.levels : [];
const COOKIE_DAYS = 180;
const CAPTURE_INTERVAL_MS = 10000;
const OCR_REGION_AUTO = "auto";
const OCR_REGION_COOKIE = "ms_combat_ocr_resolution";
const OCR_REGION_PRESETS = {
  "1366x768": {
    lv: { x: 0.211973, y: 0.96, width: 0.051542, height: 0.038541 },
    exp: { x: 0.528913, y: 0.955321, width: 0.090558, height: 0.017685 },
    meso: { x: 0.848105, y: 0.394967, width: 0.112695, height: 0.030088 },
  },
  "1920x1080": {
    lv: { x: 0.295238, y: 0.96875, width: 0.036366, height: 0.03125 },
    exp: { x: 0.519505, y: 0.968093, width: 0.064862, height: 0.013179 },
    meso: { x: 0.892415, y: 0.283051, width: 0.079214, height: 0.018941 },
  },
  "2560x1440": {
    lv: { x: 0.210742, y: 0.96, width: 0.052362, height: 0.034895 },
    exp: { x: 0.529064, y: 0.959139, width: 0.090317, height: 0.015446 },
    meso: { x: 0.848442, y: 0.397155, width: 0.110875, height: 0.024178 },
  },
  "2732x1440": {
    lv: { x: 0.227149, y: 0.959786, width: 0.052363, height: 0.039222 },
    exp: { x: 0.526452, y: 0.958579, width: 0.086042, height: 0.015653 },
    meso: { x: 0.857949, y: 0.39307, width: 0.103671, height: 0.032763 },
  },
  "3840x2160": {
    lv: { x: 0.304671, y: 0.970209, width: 0.038418, height: 0.029791 },
    exp: { x: 0.518695, y: 0.971186, width: 0.060811, height: 0.011738 },
    meso: { x: 0.898966, y: 0.265834, width: 0.073318, height: 0.017707 },
  },
};
const OCR_DIGIT_TEMPLATES = {
  "0": ["001111111100001111111100001111111100110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011001111111100001111111100001111111100"],
  "1": ["000000111111000000111111000000111111111111111111111111111111000000111111000000111111000000111111000000111111000000111111000000111111000000111111000000111111000000111111000000111111000000111111000000111111"],
  "2": ["000111111000000111111000000111111000111000000111111000000111111000000111000000000111000000000111000000011000000000011000000001100000000001100000000110000000000110000000000110000000111111111111111111111111111111111111","001111111100001111111100001111111100110000000011110000000011000000000011000000000011000000000011000000011100000000011100000001100000000001100000000001100000001110000000001110000000111111111111111111111111111111111111","001111111100001111111100001111111100110000000011110000000011110000000011000000000011000000000011000000011100000000011100000001100000000001100000001110000000001110000000001110000000111111111111111111111111111111111111","001111111100001111111100110000000011110000000011110000000011110000000011000000000011000000000011000000001100000000001100000011110000000011110000001100000000001100000000001100000000001100000000111111111111111111111111"],
  "3": ["000111111000000111111000000111111000111000000111111000000111111000000111000000000111000000000111000001111000000001111000000000000111000000000111111000000111111000000111111000000111000111111000000111111000000111111000","001111111100001111111100001111111100110000000011110000000011000000000011000000000011000000000011000001111100000001111100000000000011000000000011000000000011110000000011110000000011001111111100001111111100001111111100","001111111100001111111100110000000011110000000011110000000011110000000011000000000011000000000011000001111100000001111100000000000011000000000011110000000011110000000011110000000011110000000011001111111100001111111100","001111111100001111111100110000000011110000000011110000000011110000000011000000000011000000000011000011111100000011111100000000000011000000000011110000000011110000000011110000000011110000000011001111111100001111111100","001111111100001111111100110000001111000000000011000000000011000000000011000000000011000000001100000011111100000011111100000000001111000000000011000000000011000000000011000000000011110000001111001111111100001111111100","001111111100001111111100110000011111110000011111000000000011000000000011000000011100000000011100001111111100001111111100000000000011000000000011000000000011000000000011000000000011000000000011111111111100111111111100","001111111100011110011110010000001110000000001111000000001111000000001111000000001110000000111100000011110000000000111110000000001111000000000011000000000011000000000011000000000011110000001111111111111110001111111100"],
  "4": ["000000011100000000011100000000111100000011011100000011011100000011011100000011011100000100011100011100011100011100011100011000011100111111111111111111111111000000011100000000011100000000011100000000011100000000011100","000000011100000000011100000001111100000001111100001110011100001110011100001110011100001110011100110000011100110000011100110000011100110000011100000000011111000000011111000000011100000000011100000000011100000000011100","000000011100000001111100000011111100000011101100000110001100000110001100001110001100001100001100011000001100011000001100110000011100111111111111000000011100000000001100000000001100000000001100000000001100000000001100"],
  "5": ["111111111111111111111111110000000000110000000000110000000000110000000000110000000000110000000000001111111100001111111100000000000011000000000011110000000011110000000011110000000011110000000011001111111100001111111100","111111111111111111111111111111111111110000000000110000000000110000000000110000000000110000000000001111111100001111111100000000000011000000000011000000000011110000000011110000000011001111111100001111111100001111111100","111111111111111111111111111111111111110000000000110000000000110000000000110000000000110000000000001111111100001111111100000000000011000000000011110000000011110000000011110000000011001111111100001111111100001111111100","111111111111111111111111111111111111111000000000111000000000111000000000111000000000111000000000000111111000000111111000000000000111000000000111111000000111111000000111111000000111000111111000000111111000000111111000"],
  "6": ["000001111100000001111100001110000000001110000000110000000000110000000000110000000000110000000000111110011111111110011111110000000011110000000011110000000011110000000011110000000011110000000011001111111100001111111100","000011111110001111101111001110000000011100000000011100000000011100000000011100000000110001111100111111111110111100000011111100000011010000000011011100000011011100000011011100000011011110000011001111111110000011111100","000111111100000111111100001110000100111000000000111000000000110000000000110000000000110001111000111000000100111000000100110000000111110000000111110000000111111000000111111000000111001000000100000111111000000111111000"],
  "7": ["111111111111111111111111111111111111000000000011000000000011000000000011000000000011000000000011000000000011000000000011000000011100000000011100000000011100000001100000000001100000000001100000000001100000000001100000"],
  "8": ["000011111100001110001110011100000011011100000011011100000011011100000011011110000010001111001110000011111100001110111110011100001111110000000011110000000011110000000011110000000011011100000011011110011110001111111100","000111111000000111111000000111111000111000000111111000000111111000000111111000000111111000000111000111111000000111111000111000000111111000000111111000000111111000000111111000000111000111111000000111111000000111111000","001111111000001111111000001000000100111000000100111000000100001000000100001000000100001110000100001111111000001111111000111000011100110000000111110000000111110000000111110000000111111000000100001111111000001111111000","001111111100001111111100001111111100110000000011110000000011110000000011110000000011110000000011001111111100001111111100110000000011110000000011110000000011110000000011110000000011001111111100001111111100001111111100","001111111100001111111100110000000011110000000011110000000011110000000011001110000000001110000000001111111100001111111100110000011111110000011111110000000011110000000011110000000011110000000011001111111100001111111100","001111111100001111111100110000000011110000000011110000000011110000000011110000000011110000000011001111111100001111111100110000000011110000000011110000000011110000000011110000000011110000000011001111111100001111111100"],
  "9": ["001111100000001111100000110000011100110000011100110000000011110000000011110000000011110000000011110000011111110000011111000000000011000000000011000000000011000000000011000000011100000000011100111111100000111111100000","001111111000001111111000111000011100110000000100110000000100110000000100110000000100110000000111111000011111111000011111000111100100000000000100000000000100000000000100000000000100110000011100001111100000001111100000","001111111100011110011110011100001110110000000011110000000011110000000011110000000011110000000011011100001111011111110011000011100011000000000011000000000011000000001110000000001110010000011110011111111100001111110000"],
};
const OCR_EXP_DIGIT_TEMPLATES = {
  "0": [{ width: 5, height: 7, bits: "01110100011000110001100011000101110" }],
  "1": [
    { width: 2, height: 7, bits: "11111101010101" },
    { width: 1, height: 7, bits: "1111111" },
  ],
  "2": [{ width: 5, height: 7, bits: "01110100010000100010001000100011111" }],
  "3": [{ width: 5, height: 7, bits: "01110100010000100110000011000101110" }],
  "4": [{ width: 5, height: 7, bits: "00010001100101010010111110001000010" }],
  "5": [{ width: 5, height: 7, bits: "11111100001000001110000011000101110" }],
  "6": [{ width: 5, height: 7, bits: "01110100011000011110100011000101110" }],
  "7": [{ width: 5, height: 7, bits: "11111000010000100001000100010000100" }],
  "8": [{ width: 5, height: 7, bits: "01110100011000101110100011000101110" }],
  "9": [{ width: 5, height: 7, bits: "01110100011000101111000011000101110" }],
};
const OCR_LEVEL_DIGIT_TEMPLATES = {
  "0": [{ width: 7, height: 7, bits: "0111110110001111000111100011110001111000110111110" }],
  "1": [{ width: 3, height: 7, bits: "011111011011011011011" }],
  "2": [{ width: 7, height: 7, bits: "0111110110001100000110011110011000011000001111111" }],
  "3": [{ width: 7, height: 7, bits: "0111110110001100000110011110000001111000110111110" }],
  "4": [{ width: 7, height: 7, bits: "0001110001111001101101100110111111100001100000110" }],
  "5": [{ width: 7, height: 7, bits: "1111111110000011000000111110000001111000110111110" }],
  "6": [{ width: 7, height: 7, bits: "0111110110001111000001111110110001111000110111110" }],
  "7": [{ width: 7, height: 7, bits: "1111111000001100001100001100000110000110000011000" }],
  "8": [{ width: 7, height: 7, bits: "0111110110001111000110111110110001111000110111110" }],
  "9": [{ width: 7, height: 7, bits: "0111110110001111000110111111000001111000110111110" }],
};

const state = {
  theme: initialTheme(),
  ocrResolutionKey: initialOcrResolutionKey(),
  stream: null,
  timer: null,
  snapshots: [],
  latest: null,
  ocrAvailable: typeof window.TextDetector === "function",
  tesseractPromise: null,
  tesseractFailed: false,
  pendingCalibration: null,
  pendingMesoCandidate: null,
};

const el = {
  buildMeta: document.getElementById("buildMeta"),
  count: document.getElementById("resultCount"),
  panel: document.getElementById("combatAnalysisPanel"),
  themeToggle: document.getElementById("themeToggle"),
  video: document.getElementById("captureVideo"),
  share: document.getElementById("shareScreenButton"),
  start: document.getElementById("startAnalysisButton"),
  captureOnce: document.getElementById("captureOnceButton"),
  stop: document.getElementById("stopAnalysisButton"),
  reset: document.getElementById("resetSnapshotsButton"),
  status: document.getElementById("ocrStatus"),
  ocrResolution: document.getElementById("ocrResolutionSelect"),
  regionPresetStatus: document.getElementById("regionPresetStatus"),
  lvCrop: document.getElementById("lvCropCanvas"),
  expCrop: document.getElementById("expCropCanvas"),
  mesoCrop: document.getElementById("mesoCropCanvas"),
  manualLevel: document.getElementById("manualLevel"),
  manualExp: document.getElementById("manualExp"),
  manualPercent: document.getElementById("manualPercent"),
  manualMeso: document.getElementById("manualMeso"),
  addManual: document.getElementById("addManualSnapshotButton"),
};

const levelMap = new Map(levelRows.map(row => [Number(row.level), Number(row.expToNextLevel || 0)]));
const cumulativeMap = new Map();
let cumulative = 0;
for (const row of levelRows) {
  const level = Number(row.level);
  cumulativeMap.set(level, cumulative);
  cumulative += Number(row.expToNextLevel || 0);
}

function readCookie(name) {
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const rows = document.cookie ? document.cookie.split("; ") : [];
    const row = rows.find(value => value.startsWith(prefix));
    return row ? decodeURIComponent(row.slice(prefix.length)) : "";
  } catch (_error) {
    return "";
  }
}

function writeCookie(name, value) {
  try {
    const maxAge = COOKIE_DAYS * 24 * 60 * 60;
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  } catch (_error) {}
}

function initialTheme() {
  try {
    const cookieTheme = readCookie("ms_theme");
    if (cookieTheme === "dark" || cookieTheme === "light") return cookieTheme;
    return localStorage.getItem("ms-theme") === "dark" ? "dark" : "light";
  } catch (_error) {
    return "light";
  }
}

function initialOcrResolutionKey() {
  const saved = readCookie(OCR_REGION_COOKIE);
  return OCR_REGION_PRESETS[saved] ? saved : OCR_REGION_AUTO;
}

function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  writeCookie("ms_theme", state.theme);
  try {
    localStorage.setItem("ms-theme", state.theme);
  } catch (_error) {}
  if (el.themeToggle) {
    const isDark = state.theme === "dark";
    el.themeToggle.textContent = isDark ? "☀" : "☾";
    el.themeToggle.setAttribute("aria-pressed", String(isDark));
    el.themeToggle.setAttribute("aria-label", isDark ? "切換為白底" : "切換為黑底");
    el.themeToggle.title = isDark ? "切換為白底" : "切換為黑底";
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/[^\d.-]/g, "");
  if (!normalized || normalized === "-" || normalized === ".") return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return Math.round(number).toLocaleString("en-US");
}

function formatRate(value) {
  if (!Number.isFinite(value) || value <= 0) return "等待資料";
  return formatNumber(value);
}

function formatMetricNumber(value) {
  if (!Number.isFinite(value)) return "等待資料";
  return formatNumber(Math.max(0, value));
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return `${number.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "等待資料";
  const totalSeconds = Math.round(minutes * 60);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}天 ${hours}小時`;
  if (hours > 0) return `${hours}小時 ${mins}分`;
  return `${Math.max(1, mins)}分`;
}

function setStatus(message) {
  if (el.status) el.status.textContent = message || "";
}

function getExpToNext(level) {
  return levelMap.get(Number(level)) || 0;
}

function getAbsoluteExp(snapshot) {
  if (!snapshot || !snapshot.level || snapshot.exp === null || snapshot.exp === undefined) return null;
  return (cumulativeMap.get(Number(snapshot.level)) || 0) + Number(snapshot.exp || 0);
}

function numericCandidate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sanitizeExpCandidate(value, expToNext = 0) {
  const number = numericCandidate(value);
  if (number === null) return null;
  const exp = Math.round(number);
  if (exp < 0) return null;
  if (expToNext && exp > expToNext) return null;
  return exp;
}

function sanitizePercentCandidate(value) {
  const number = numericCandidate(value);
  if (number === null || number < 0 || number > 100) return null;
  return Math.round(number * 100) / 100;
}

function normalizeCandidates(candidates, sanitizer) {
  const seen = new Set();
  const rows = [];
  for (const [index, candidate] of candidates.entries()) {
    const rawValue = candidate && typeof candidate === "object" && "value" in candidate
      ? candidate.value
      : candidate;
    const value = sanitizer(rawValue);
    if (value === null || value === undefined) continue;
    const key = String(value);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      value,
      source: candidate?.source || "",
      priority: Number.isFinite(candidate?.priority) ? candidate.priority : index,
    });
  }
  return rows;
}

function percentFromExp(exp, expToNext) {
  if (!expToNext) return null;
  return Math.round((Number(exp) / expToNext) * 10000) / 100;
}

function expFromPercent(percent, expToNext) {
  if (!expToNext) return null;
  return Math.floor(expToNext * Number(percent) / 100);
}

function expPercentTolerance(expToNext) {
  if (!expToNext) return 0.12;
  const expFloor = Math.max(40, Math.ceil(expToNext * 0.0002));
  return Math.max(0.12, Math.round((expFloor / expToNext) * 10000) / 100);
}

function resolveExpPercent(level, expCandidates = [], percentCandidates = []) {
  const expToNext = getExpToNext(level);
  const exps = normalizeCandidates(expCandidates, value => sanitizeExpCandidate(value, expToNext));
  const percents = normalizeCandidates(percentCandidates, sanitizePercentCandidate);
  const fallbackExp = exps[0]?.value ?? null;
  const fallbackPercent = percents[0]?.value ?? null;

  if (!level) {
    return { ok: false, reason: "missing-level", exp: fallbackExp, percent: fallbackPercent };
  }
  if (!expToNext) {
    return {
      ok: fallbackExp !== null,
      reason: fallbackExp !== null ? "" : "missing-exp",
      exp: fallbackExp,
      percent: fallbackPercent,
    };
  }

  if (exps.length && percents.length) {
    const tolerance = expPercentTolerance(expToNext);
    const pairs = [];
    for (const expRow of exps) {
      const expectedPercent = percentFromExp(expRow.value, expToNext);
      for (const percentRow of percents) {
        const delta = Math.abs(expectedPercent - percentRow.value);
        pairs.push({
          exp: expRow.value,
          percent: expectedPercent,
          readPercent: percentRow.value,
          delta,
          priority: expRow.priority + percentRow.priority,
          expSource: expRow.source,
          percentSource: percentRow.source,
        });
      }
    }
    pairs.sort((a, b) => a.delta - b.delta || a.priority - b.priority);
    const best = pairs[0];
    if (best && best.delta <= tolerance) {
      return { ok: true, ...best, tolerance };
    }
    const trustedExp = exps.find(row => row.source === "EXP 圖樣");
    if (trustedExp) {
      return {
        ok: true,
        exp: trustedExp.value,
        percent: percentFromExp(trustedExp.value, expToNext),
        expSource: trustedExp.source,
        ignoredPercent: fallbackPercent,
        reason: "percent-overridden",
      };
    }
    return {
      ok: false,
      reason: "mismatch",
      exp: fallbackExp,
      percent: fallbackPercent,
      expectedPercent: fallbackExp !== null ? percentFromExp(fallbackExp, expToNext) : null,
      expectedExp: fallbackPercent !== null ? expFromPercent(fallbackPercent, expToNext) : null,
      tolerance,
    };
  }

  if (exps.length) {
    return {
      ok: true,
      exp: exps[0].value,
      percent: percentFromExp(exps[0].value, expToNext),
      expSource: exps[0].source,
    };
  }
  if (percents.length) {
    const exp = expFromPercent(percents[0].value, expToNext);
    return {
      ok: true,
      exp,
      percent: percentFromExp(exp, expToNext),
      percentSource: percents[0].source,
    };
  }
  return { ok: false, reason: "missing-exp", exp: null, percent: null };
}

function formatExpConsistencyStatus(result) {
  if (result?.reason !== "mismatch") return "";
  const expText = result.exp === null || result.exp === undefined ? "未讀到" : formatNumber(result.exp);
  const readPercent = result.percent === null || result.percent === undefined ? "未讀到" : formatPercent(result.percent);
  const expectedPercent = result.expectedPercent === null || result.expectedPercent === undefined ? "未知" : formatPercent(result.expectedPercent);
  return `EXP 與百分比不一致，已略過這筆紀錄：EXP ${expText} 對應 ${expectedPercent}，但讀到 ${readPercent}。`;
}

function latestKnownMeso() {
  for (let index = state.snapshots.length - 1; index >= 0; index -= 1) {
    const meso = state.snapshots[index]?.meso;
    if (Number.isFinite(Number(meso))) return Number(meso);
  }
  if (Number.isFinite(Number(state.latest?.meso))) return Number(state.latest.meso);
  return null;
}

function normalizeMesoCandidate(value) {
  const number = parseNumber(value);
  if (number === null || number < 0) return null;
  return Math.round(number);
}

function normalizeMesoTextCandidates(text) {
  const normalized = normalizeOcrText(text);
  const compact = normalized.replace(/\s+/g, "");
  const candidates = [];
  const seen = new Set();
  const add = (value, confidence = 0.5, source = "OCR 楓幣") => {
    const meso = normalizeMesoCandidate(value);
    if (meso === null || seen.has(meso)) return;
    seen.add(meso);
    candidates.push({ value: meso, confidence, source });
  };

  for (const match of compact.matchAll(/[0-9]{1,3}(?:,[0-9]{3})+/g)) {
    add(match[0], 0.92, "OCR 逗號楓幣");
    const withoutComma = match[0].replace(/,/g, "");
    add(withoutComma, 0.84, "OCR 逗號楓幣");
  }
  for (const match of compact.matchAll(/[0-9]{4,12}/g)) {
    add(match[0], 0.55, "OCR 楓幣");
  }
  return candidates;
}

function mesoDeltaLimit(previous, minutes = null) {
  const base = Math.max(50000, Math.round((previous || 0) * 0.35));
  if (!Number.isFinite(minutes) || minutes <= 0) return base;
  return Math.max(base, Math.round(minutes * 1200000));
}

function resolveMesoValue(candidates, previous = latestKnownMeso()) {
  const rows = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const value = normalizeMesoCandidate(candidate?.value);
    if (value === null || seen.has(value)) continue;
    seen.add(value);
    rows.push({
      value,
      source: candidate?.source || "",
      confidence: Number.isFinite(candidate?.confidence) ? candidate.confidence : 0.5,
    });
  }
  if (!rows.length) return { value: null, reason: "missing" };
  if (previous === null || previous === undefined) {
    rows.sort((a, b) => b.confidence - a.confidence || String(b.value).length - String(a.value).length);
    return { value: rows[0].value, reason: "", source: rows[0].source };
  }

  const maxIncrease = mesoDeltaLimit(previous);
  const accepted = rows
    .map(row => ({
      ...row,
      delta: row.value - previous,
      distance: Math.abs(row.value - previous),
    }))
    .filter(row => row.delta >= 0 && row.delta <= maxIncrease);
  if (accepted.length) {
    accepted.sort((a, b) => a.distance - b.distance || b.confidence - a.confidence);
    return { value: accepted[0].value, reason: "", source: accepted[0].source };
  }

  rows.sort((a, b) => Math.abs(a.value - previous) - Math.abs(b.value - previous));
  return {
    value: null,
    reason: "outlier",
    rejected: rows[0]?.value ?? null,
    previous,
  };
}

function buildRowsWithCumulative() {
  let running = 0;
  return levelRows.map(row => {
    const exp = Number(row.expToNextLevel || 0);
    const output = {
      level: Number(row.level || 0),
      expToNextLevel: exp,
      cumulativeBefore: running,
      cumulativeAfter: running + exp,
    };
    running += exp;
    return output;
  });
}

function normalizeOcrText(text) {
  const fullWidthDigits = "０１２３４５６７８９";
  return String(text || "")
    .replace(/[０-９]/g, char => String(fullWidthDigits.indexOf(char)))
    .replace(/[％]/g, "%")
    .replace(/[，]/g, ",")
    .replace(/[［]/g, "[")
    .replace(/[］]/g, "]")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDetectedText(text) {
  const normalized = normalizeOcrText(text);
  const compact = normalized.replace(/\s+/g, "");
  const result = {
    level: null,
    exp: null,
    percent: null,
    meso: null,
    mesoText: "",
    rawText: normalized,
  };

  const levelMatch = compact.match(/(?:LV\.?|Lv\.?|L[Vv])[^0-9]{0,5}([0-9]{1,3})/);
  if (levelMatch) result.level = Number(levelMatch[1]);

  const percentMatch = compact.match(/([0-9]{1,3}(?:\.[0-9]{1,2})?)%/);
  if (percentMatch) {
    result.percent = Number(percentMatch[1]);
    const prefix = compact.slice(0, percentMatch.index).replace(/[)\]）]+$/, "");
    const expCandidates = [...prefix.matchAll(/([0-9][0-9,]{0,12})/g)]
      .map(match => match[1])
      .filter(value => parseNumber(value) !== result.level);
    if (expCandidates.length) result.exp = parseNumber(expCandidates[expCandidates.length - 1]);
  }
  if (result.exp === null || result.percent === null) {
    const expMatch = compact.match(/EXP[^0-9]{0,8}([0-9,]{2,12})[\[(（]?([0-9]{1,3}(?:\.[0-9]{1,2})?)%/) || compact.match(/([0-9,]{3,12})[\[(（]([0-9]{1,3}(?:\.[0-9]{1,2})?)%/);
    if (expMatch) {
      result.exp = parseNumber(expMatch[1]);
      result.percent = Number(expMatch[2]);
    }
  }

  const mesoMatch = compact.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})楓幣/) || compact.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})/);
  if (mesoMatch) {
    result.mesoText = mesoMatch[1];
    result.meso = parseNumber(mesoMatch[1]);
  }
  return result;
}

function parseLevelText(text) {
  const compact = normalizeOcrText(text).replace(/\s+/g, "");
  const withLabel = compact.match(/(?:LV\.?|Lv\.?|L[Vv])[^0-9]{0,5}([0-9]{1,3})/);
  if (withLabel) return Number(withLabel[1]);
  const values = [...compact.matchAll(/[0-9]{1,3}/g)]
    .map(match => Number(match[0]))
    .filter(value => value >= 1 && value <= 200);
  return values.length ? values[values.length - 1] : null;
}

function resolutionKey(width, height) {
  return `${Math.round(Number(width) || 0)}x${Math.round(Number(height) || 0)}`;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function presetDimensions(key) {
  const match = String(key).match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function defaultFrame(width, height) {
  return {
    x: 0,
    y: 0,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    adjusted: false,
  };
}

function frameForPresetSize(size, width, height) {
  if (!size || !width || !height) return null;
  if (Math.round(width) === size.width && Math.round(height) === size.height) {
    return { ...defaultFrame(width, height), exact: true };
  }
  const extraWidth = Math.round(width - size.width);
  const extraHeight = Math.round(height - size.height);
  if (extraWidth < 0 || extraHeight < 0) return null;

  const maxExtraWidth = Math.max(32, Math.round(size.width * 0.04));
  const maxExtraHeight = Math.max(48, Math.round(size.height * 0.08));
  if (extraWidth > maxExtraWidth || extraHeight > maxExtraHeight) return null;

  const sideBorder = Math.round(extraWidth / 2);
  const topChrome = extraHeight > sideBorder * 2
    ? extraHeight - sideBorder
    : Math.round(extraHeight / 2);
  const x = clamp(sideBorder, 0, Math.max(0, width - size.width));
  const y = clamp(topChrome, 0, Math.max(0, height - size.height));
  return {
    x,
    y,
    width: size.width,
    height: size.height,
    exact: false,
    adjusted: x > 0 || y > 0 || width !== size.width || height !== size.height,
    extraWidth,
    extraHeight,
  };
}

function findRegionPreset(width, height) {
  const key = resolutionKey(width, height);
  if (OCR_REGION_PRESETS[key]) {
    return { key, exact: true, regions: OCR_REGION_PRESETS[key], frame: defaultFrame(width, height) };
  }
  let best = null;
  const currentAspect = width / Math.max(1, height);
  for (const [candidateKey, regions] of Object.entries(OCR_REGION_PRESETS)) {
    const size = presetDimensions(candidateKey);
    if (!size) continue;
    const frame = frameForPresetSize(size, width, height);
    if (frame) {
      const score = frame.exact ? 0 : (frame.extraWidth + frame.extraHeight) / Math.max(1, size.width + size.height);
      if (!best || score < best.score) {
        best = { key: candidateKey, exact: frame.exact, adjusted: frame.adjusted, regions, frame, score };
      }
      continue;
    }
    const candidateAspect = size.width / Math.max(1, size.height);
    const widthScore = Math.abs(Math.log(width / size.width));
    const heightScore = Math.abs(Math.log(height / size.height));
    const aspectScore = Math.abs(currentAspect - candidateAspect);
    const score = widthScore + heightScore + aspectScore * 3;
    if (!best || score < best.score) {
      best = { key: candidateKey, exact: false, adjusted: false, regions, frame: defaultFrame(width, height), score };
    }
  }
  return best;
}

function selectedRegionPreset(width, height) {
  if (OCR_REGION_PRESETS[state.ocrResolutionKey]) {
    const size = presetDimensions(state.ocrResolutionKey);
    const frame = frameForPresetSize(size, width, height) || defaultFrame(width, height);
    return {
      key: state.ocrResolutionKey,
      exact: resolutionKey(width, height) === state.ocrResolutionKey,
      adjusted: Boolean(frame.adjusted),
      forced: true,
      regions: OCR_REGION_PRESETS[state.ocrResolutionKey],
      frame,
    };
  }
  return findRegionPreset(width, height);
}

function regionToRect(region, width, height, frame = null) {
  const base = frame || defaultFrame(width, height);
  const x = clamp(region?.x, 0, 0.995);
  const y = clamp(region?.y, 0, 0.995);
  const regionWidth = clamp(region?.width, 0.003, 1 - x);
  const regionHeight = clamp(region?.height, 0.003, 1 - y);
  const rectX = Math.round(base.x + x * base.width);
  const rectY = Math.round(base.y + y * base.height);
  return {
    x: Math.min(Math.max(0, rectX), Math.max(0, width - 1)),
    y: Math.min(Math.max(0, rectY), Math.max(0, height - 1)),
    width: Math.min(Math.max(1, Math.round(regionWidth * base.width)), Math.max(1, width - rectX)),
    height: Math.min(Math.max(1, Math.round(regionHeight * base.height)), Math.max(1, height - rectY)),
  };
}

function updateRegionPresetStatus(width = el.video?.videoWidth, height = el.video?.videoHeight) {
  if (!el.regionPresetStatus) return;
  if (!width || !height) {
    el.regionPresetStatus.textContent = OCR_REGION_PRESETS[state.ocrResolutionKey]
      ? `手動使用 ${state.ocrResolutionKey} 辨識區塊，分享畫面後會套用。`
      : "尚未取得畫面解析度。";
    return;
  }
  const preset = selectedRegionPreset(width, height);
  const current = resolutionKey(width, height);
  if (!preset) {
    el.regionPresetStatus.textContent = `${current} · 使用預設辨識區塊`;
    return;
  }
  if (preset.forced) {
    el.regionPresetStatus.textContent = preset.adjusted
      ? `${current} · 手動使用 ${preset.key}，已避開視窗外框`
      : `${current} · 手動使用 ${preset.key} 辨識區塊`;
    return;
  }
  el.regionPresetStatus.textContent = preset.adjusted
    ? `${current} · 自動校正為 ${preset.key} 遊戲畫面`
    : preset.exact
    ? `${current} · 使用 ${preset.key} 辨識區塊`
    : `${current} · 使用最接近的 ${preset.key} 辨識區塊推估`;
}

function rectFor(type, width, height) {
  const preset = selectedRegionPreset(width, height);
  const region = preset?.regions?.[type];
  if (region) return regionToRect(region, width, height, preset.frame);
  if (type === "lv") {
    return {
      x: Math.round(width * 0.2),
      y: Math.round(height * 0.94),
      width: Math.round(width * 0.09),
      height: Math.round(height * 0.06),
    };
  }
  if (type === "exp") {
    return {
      x: Math.round(width * 0.34),
      y: Math.round(height * 0.895),
      width: Math.round(width * 0.34),
      height: Math.round(height * 0.105),
    };
  }
  if (type === "meso") {
    return {
      x: Math.round(width * 0.72),
      y: Math.round(height * 0.015),
      width: Math.round(width * 0.275),
      height: Math.round(height * 0.49),
    };
  }
  return { x: 0, y: 0, width, height };
}

function drawRegion(sourceCanvas, region, targetCanvas) {
  const scale = typeScale(region);
  targetCanvas.width = Math.max(1, Math.round(region.width * scale));
  targetCanvas.height = Math.max(1, Math.round(region.height * scale));
  const targetCtx = targetCanvas.getContext("2d", { willReadFrequently: true });
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.filter = "contrast(170%) saturate(110%)";
  targetCtx.drawImage(
    sourceCanvas,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    targetCanvas.width,
    targetCanvas.height,
  );
}

function typeScale(region) {
  if (region.width < 480) return 3;
  if (region.width < 900) return 2;
  return 1;
}

function cropRegionCanvas(sourceCanvas, region, scale = 8) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(region.width * scale));
  canvas.height = Math.max(1, Math.round(region.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sourceCanvas,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

function thresholdRegionCanvas(sourceCanvas, region, type, scale = 8) {
  const raw = cropRegionCanvas(sourceCanvas, region, scale);
  const ctx = raw.getContext("2d", { willReadFrequently: true });
  const image = ctx.getImageData(0, 0, raw.width, raw.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const r = image.data[index];
    const g = image.data[index + 1];
    const b = image.data[index + 2];
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    let ink = false;
    if (type === "lv") {
      ink = r > 150 && g > 45 && g < 190 && b < 85;
    } else if (type === "meso") {
      ink = brightness < 125 && saturation < 95;
    } else {
      ink = brightness > 135 || (r > 140 && g > 55 && b < 80) || (g > 140 && r > 90);
    }
    const value = ink ? 0 : 255;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return raw;
}

function expWhiteInkPixel(r, g, b) {
  const brightness = (r + g + b) / 3;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  return brightness > 145 && saturation < 135;
}

function expBracketInkPixel(r, g, b) {
  return g > 125 && r < 190 && b < 170 && (g - r) > 25;
}

function levelWhiteInkPixel(r, g, b) {
  const brightness = (r + g + b) / 3;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  return brightness > 180 && saturation < 90 && r > 150 && g > 150 && b > 145;
}

function levelOrangeInkPixel(r, g, b) {
  return r > 150 && g > 45 && g < 190 && b < 95 && (r - g) > 45;
}

function levelDigitInkPixel(r, g, b) {
  return levelWhiteInkPixel(r, g, b);
}

function mesoInkPixel(r, g, b) {
  return (r + g + b) / 3 < 80;
}

function mesoOcrCanvas(canvas) {
  if (!canvas) return null;
  const output = document.createElement("canvas");
  output.width = canvas.width;
  output.height = canvas.height;
  const outputCtx = output.getContext("2d", { willReadFrequently: true });
  outputCtx.drawImage(canvas, 0, 0);
  const image = outputCtx.getImageData(0, 0, output.width, output.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const r = image.data[index];
    const g = image.data[index + 1];
    const b = image.data[index + 2];
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    const ink = brightness < 145 && saturation < 80;
    const value = ink ? 0 : 255;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  outputCtx.putImageData(image, 0, 0);
  return output;
}

function imagePixel(image, x, y) {
  const index = (y * image.width + x) * 4;
  return [image.data[index], image.data[index + 1], image.data[index + 2]];
}

function extractGlyphGroupsFromImage(image, inkFn, minColumnPixels = 0, closingGap = 2) {
  const columns = [];
  for (let x = 0; x < image.width; x += 1) {
    let count = 0;
    for (let y = 0; y < image.height; y += 1) {
      const [r, g, b] = imagePixel(image, x, y);
      if (inkFn(r, g, b)) count += 1;
    }
    columns.push(count);
  }

  const groups = [];
  let start = null;
  let gap = 0;
  for (let x = 0; x < columns.length; x += 1) {
    if (columns[x] > minColumnPixels) {
      if (start === null) start = x;
      gap = 0;
    } else if (start !== null) {
      gap += 1;
      if (gap >= closingGap) {
        groups.push({ x1: start, x2: x - gap });
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) groups.push({ x1: start, x2: columns.length - 1 });

  return groups.map(group => {
    let white = 0;
    let dark = 0;
    let minY = image.height;
    let maxY = -1;
    for (let x = group.x1; x <= group.x2; x += 1) {
      for (let y = 0; y < image.height; y += 1) {
        const [r, g, b] = imagePixel(image, x, y);
        const brightness = (r + g + b) / 3;
        if (brightness > 160) white += 1;
        if (brightness < 80) {
          dark += 1;
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    return {
      ...group,
      width: group.x2 - group.x1 + 1,
      height: maxY >= minY ? maxY - minY + 1 : 0,
      minY,
      maxY,
      white,
      dark,
    };
  });
}

function glyphMaskFromImage(image, group, inkFn, width = 12, height = 18) {
  let minX = group.x2;
  let minY = image.height;
  let maxX = group.x1;
  let maxY = -1;
  for (let x = group.x1; x <= group.x2; x += 1) {
    for (let y = 0; y < image.height; y += 1) {
      const [r, g, b] = imagePixel(image, x, y);
      if (inkFn(r, g, b)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxY < minY) return "";
  let output = "";
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.round(minX + (x + 0.5) * (maxX - minX + 1) / width - 0.5);
      const sourceY = Math.round(minY + (y + 0.5) * (maxY - minY + 1) / height - 0.5);
      const [r, g, b] = imagePixel(
        image,
        clamp(sourceX, 0, image.width - 1),
        clamp(sourceY, 0, image.height - 1),
      );
      output += inkFn(r, g, b) ? "1" : "0";
    }
  }
  return output;
}

function digitDistance(a, b) {
  if (!a || !b || a.length !== b.length) return 1;
  let different = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) different += 1;
  }
  return different / a.length;
}

function classifyDigit(mask) {
  let best = null;
  for (const [digit, masks] of Object.entries(OCR_DIGIT_TEMPLATES)) {
    for (const template of masks) {
      const score = digitDistance(mask, template);
      if (!best || score < best.score) best = { digit, score };
    }
  }
  return best;
}

function downsampleImageData(image, factor = 8) {
  if (!image || factor <= 1 || image.width < factor * 16 || image.height < factor * 6) return image;
  const width = Math.max(1, Math.round(image.width / factor));
  const height = Math.max(1, Math.round(image.height / factor));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x + 0.5) * factor));
      const sourceY = Math.min(image.height - 1, Math.floor((y + 0.5) * factor));
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      data[targetIndex] = image.data[sourceIndex];
      data[targetIndex + 1] = image.data[sourceIndex + 1];
      data[targetIndex + 2] = image.data[sourceIndex + 2];
      data[targetIndex + 3] = image.data[sourceIndex + 3];
    }
  }
  return { width, height, data };
}

function expGlyphBounds(image, group, inkFn) {
  let minX = group.x2;
  let minY = image.height;
  let maxX = group.x1;
  let maxY = -1;
  for (let x = group.x1; x <= group.x2; x += 1) {
    for (let y = 0; y < image.height; y += 1) {
      const [r, g, b] = imagePixel(image, x, y);
      if (inkFn(r, g, b)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxY < minY) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function extractExpGlyphGroups(image, inkFn, closingGap = 1, minColumnPixels = 0) {
  const columns = [];
  const yStart = Math.max(0, Math.floor(image.height * 0.12));
  const yEnd = Math.min(image.height, Math.ceil(image.height * 0.92));
  for (let x = 0; x < image.width; x += 1) {
    let count = 0;
    for (let y = yStart; y < yEnd; y += 1) {
      const [r, g, b] = imagePixel(image, x, y);
      if (inkFn(r, g, b)) count += 1;
    }
    columns.push(count);
  }

  const groups = [];
  let start = null;
  let gap = 0;
  for (let x = 0; x < columns.length; x += 1) {
    if (columns[x] > minColumnPixels) {
      if (start === null) start = x;
      gap = 0;
    } else if (start !== null) {
      gap += 1;
      if (gap >= closingGap) {
        const group = { x1: start, x2: x - gap };
        const bounds = expGlyphBounds(image, group, inkFn);
        if (bounds) groups.push({ ...group, ...bounds });
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) {
    const group = { x1: start, x2: columns.length - 1 };
    const bounds = expGlyphBounds(image, group, inkFn);
    if (bounds) groups.push({ ...group, ...bounds });
  }
  return groups;
}

function sampleExpGlyph(image, bounds, inkFn, width, height) {
  let output = "";
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.round(bounds.minX + (x + 0.5) * bounds.width / width - 0.5);
      const sourceY = Math.round(bounds.minY + (y + 0.5) * bounds.height / height - 0.5);
      const [r, g, b] = imagePixel(
        image,
        clamp(sourceX, 0, image.width - 1),
        clamp(sourceY, 0, image.height - 1),
      );
      output += inkFn(r, g, b) ? "1" : "0";
    }
  }
  return output;
}

function sampleGlyphGrid(image, bounds, inkFn, width, height, threshold = 0.25) {
  let output = "";
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.round(bounds.minY + y * bounds.height / height);
    const y1 = Math.max(y0 + 1, Math.round(bounds.minY + (y + 1) * bounds.height / height));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.round(bounds.minX + x * bounds.width / width);
      const x1 = Math.max(x0 + 1, Math.round(bounds.minX + (x + 1) * bounds.width / width));
      let total = 0;
      let ink = 0;
      for (let sourceY = Math.max(0, y0); sourceY < Math.min(image.height, y1); sourceY += 1) {
        for (let sourceX = Math.max(0, x0); sourceX < Math.min(image.width, x1); sourceX += 1) {
          const [r, g, b] = imagePixel(image, sourceX, sourceY);
          total += 1;
          if (inkFn(r, g, b)) ink += 1;
        }
      }
      output += total > 0 && ink / total >= threshold ? "1" : "0";
    }
  }
  return output;
}

function classifyNarrowExpOne(image, group) {
  if (group.width > 4 || group.height < 6) return null;
  let tallestColumn = 0;
  for (let x = group.minX; x <= group.maxX; x += 1) {
    let count = 0;
    for (let y = group.minY; y <= group.maxY; y += 1) {
      const [r, g, b] = imagePixel(image, x, y);
      if (expWhiteInkPixel(r, g, b)) count += 1;
    }
    tallestColumn = Math.max(tallestColumn, count);
  }
  return tallestColumn >= Math.max(5, Math.round(group.height * 0.75))
    ? { digit: "1", score: 0 }
    : null;
}

function classifyExpDigit(image, group) {
  const narrowOne = classifyNarrowExpOne(image, group);
  if (narrowOne) return narrowOne;
  let best = null;
  for (const [digit, templates] of Object.entries(OCR_EXP_DIGIT_TEMPLATES)) {
    for (const template of templates) {
      const mask = sampleExpGlyph(image, group, expWhiteInkPixel, template.width, template.height);
      const score = digitDistance(mask, template.bits);
      if (!best || score < best.score) best = { digit, score };
    }
  }
  return best;
}

function isLikelyExpDot(group, image) {
  return group.width <= Math.max(3, Math.round(image.width * 0.02))
    && group.height <= Math.max(4, Math.round(image.height * 0.35));
}

function readExpDigitsFromGroups(image, groups, options = {}) {
  const maxScore = options.maxScore ?? 0.3;
  return groups
    .filter(group => !options.skipDots || !isLikelyExpDot(group, image))
    .map(group => ({ group, match: classifyExpDigit(image, group) }))
    .filter(row => row.match && row.match.score <= maxScore)
    .map(row => row.match.digit);
}

function readExpFromCanvas(canvas) {
  if (!canvas) return { exp: null, percent: null };
  const rawImage = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const image = downsampleImageData(rawImage, 8);
  const bracketGroups = extractExpGlyphGroups(image, expBracketInkPixel, 2)
    .filter(group => group.width <= Math.max(6, Math.round(image.width * 0.04)));
  if (bracketGroups.length < 2) {
    return { exp: null, percent: null };
  }
  const openingBracket = bracketGroups[0];
  const closingBracket = bracketGroups[bracketGroups.length - 1];
  const whiteGroups = extractExpGlyphGroups(image, expWhiteInkPixel, 1);
  const expDigits = readExpDigitsFromGroups(
    image,
    whiteGroups.filter(group => group.x2 < openingBracket.x1),
  ).slice(-12);
  if (!expDigits.length) return { exp: null, percent: null };

  const exp = Number(expDigits.join(""));
  const percentDigits = readExpDigitsFromGroups(
    image,
    whiteGroups.filter(group => group.x1 > openingBracket.x2 && group.x2 < closingBracket.x1),
    { skipDots: true },
  ).join("");
  let percent = null;
  if (percentDigits.length >= 3) {
    percent = Number(`${percentDigits.slice(0, -2)}.${percentDigits.slice(-2)}`);
    if (percent > 100) percent = null;
  }
  return { exp, percent };
}

function classifyLevelDigit(image, group) {
  let best = null;
  for (const [digit, templates] of Object.entries(OCR_LEVEL_DIGIT_TEMPLATES)) {
    for (const template of templates) {
      if (digit === "1" && group.width > Math.max(4, Math.round(group.height * 0.55))) continue;
      const mask = sampleGlyphGrid(image, group, levelDigitInkPixel, template.width, template.height, 0.2);
      const score = digitDistance(mask, template.bits);
      if (!best || score < best.score) best = { digit, score };
    }
  }
  return best;
}

function readLevelFromDigitGroups(image, digitGroups, maxScore = 0.28) {
  const groups = [...digitGroups].sort((a, b) => a.minX - b.minX);
  if (!groups.length || groups.length > 3) return null;
  const matches = groups.map(group => classifyLevelDigit(image, group));
  if (matches.some(match => !match || match.score > maxScore)) return null;
  const level = Number(matches.map(match => match.digit).join(""));
  if (!Number.isFinite(level) || level < 1 || level > 200) return null;
  return {
    level,
    score: Math.max(...matches.map(match => match.score)),
    digits: groups.length,
  };
}

function extractLevelDigitGroups(image, band) {
  if (!band) return [];
  const insetX = Math.max(2, Math.round(band.width * 0.07));
  const insetY = Math.max(1, Math.round(band.height * 0.12));
  const minX = Math.min(image.width - 1, band.minX + insetX);
  const maxX = Math.max(minX, band.maxX - insetX);
  const minY = Math.min(image.height - 1, band.minY + insetY);
  const maxY = Math.max(minY, band.maxY - insetY);
  const minColumnPixels = Math.max(1, Math.round((maxY - minY + 1) * 0.12));
  const columns = [];
  for (let x = minX; x <= maxX; x += 1) {
    let count = 0;
    for (let y = minY; y <= maxY; y += 1) {
      const [r, g, b] = imagePixel(image, x, y);
      if (levelDigitInkPixel(r, g, b)) count += 1;
    }
    columns.push(count);
  }

  const runs = [];
  let start = null;
  let gap = 0;
  for (let index = 0; index < columns.length; index += 1) {
    if (columns[index] >= minColumnPixels) {
      if (start === null) start = index;
      gap = 0;
    } else if (start !== null) {
      gap += 1;
      if (gap >= 2) {
        const end = index - gap;
        if (end - start + 1 >= 2) runs.push({ x1: minX + start, x2: minX + end });
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) {
    const end = columns.length - 1;
    if (end - start + 1 >= 2) runs.push({ x1: minX + start, x2: minX + end });
  }

  return runs.map(run => {
    let glyphMinX = run.x2;
    let glyphMinY = maxY;
    let glyphMaxX = run.x1;
    let glyphMaxY = minY;
    let found = false;
    for (let x = run.x1; x <= run.x2; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const [r, g, b] = imagePixel(image, x, y);
        if (levelDigitInkPixel(r, g, b)) {
          found = true;
          glyphMinX = Math.min(glyphMinX, x);
          glyphMinY = Math.min(glyphMinY, y);
          glyphMaxX = Math.max(glyphMaxX, x);
          glyphMaxY = Math.max(glyphMaxY, y);
        }
      }
    }
    if (!found) return null;
    return {
      minX: glyphMinX,
      minY: glyphMinY,
      maxX: glyphMaxX,
      maxY: glyphMaxY,
      width: glyphMaxX - glyphMinX + 1,
      height: glyphMaxY - glyphMinY + 1,
    };
  }).filter(Boolean);
}

function readLevelFromCanvas(canvas) {
  if (!canvas) return { level: null };
  const rawImage = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const image = downsampleImageData(rawImage, 8);
  const orangeGroups = extractExpGlyphGroups(image, levelOrangeInkPixel, 2)
    .filter(group => group.height >= 5 && group.width >= 8 && group.minX > image.width * 0.35)
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const badgeLevel = readLevelFromDigitGroups(image, extractLevelDigitGroups(image, orangeGroups[0]), 0.28);
  return badgeLevel ? { level: badgeLevel.level } : { level: null };
}

function isLikelyMesoIconGroup(group, image) {
  return group.x1 < image.width * 0.2
    && group.width >= image.height * 0.42
    && group.height >= image.height * 0.42;
}

function mesoDigitGroupsFromImage(image) {
  const maxDigitGap = Math.max(28, Math.round(image.height * 0.32));
  const groups = extractGlyphGroupsFromImage(image, mesoInkPixel, 2, 8)
    .filter(group => !isLikelyMesoIconGroup(group, image))
    .sort((a, b) => a.x1 - b.x1);
  const sequences = [];
  let current = [];
  for (const group of groups) {
    const previous = current[current.length - 1];
    if (previous && group.x1 - previous.x2 > maxDigitGap) {
      sequences.push(current);
      current = [];
    }
    current.push(group);
  }
  if (current.length) sequences.push(current);

  const minDigitHeight = Math.max(8, Math.round(image.height * 0.25));
  const candidates = sequences
    .map(sequence => sequence.filter(group => group.width > 25 && group.height >= minDigitHeight))
    .filter(sequence => sequence.length);
  if (!candidates.length) return [];
  candidates.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return a[0].x1 - b[0].x1;
  });
  return candidates[0].slice(0, 10);
}

function readMesoFromCanvas(canvas) {
  if (!canvas) return { meso: null };
  const image = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const groups = mesoDigitGroupsFromImage(image);
  const digits = groups.map(group => classifyDigit(glyphMaskFromImage(image, group, mesoInkPixel)));
  if (!digits.length || digits.some(row => !row || row.score > 0.35)) return { meso: null };
  return { meso: Number(digits.map(row => row.digit).join("")) };
}

async function detectTextFromCanvas(canvas) {
  if (state.ocrAvailable) {
    try {
      const detector = new window.TextDetector();
      const detections = await detector.detect(canvas);
      const text = detections.map(row => row.rawValue || "").join(" ");
      if (text.trim()) return { text, supported: true };
    } catch (_error) {
      state.ocrAvailable = false;
    }
  }
  const tesseract = await ensureTesseract();
  if (!tesseract) return { text: "", supported: false };
  try {
    const result = await tesseract.recognize(canvas, "eng", {
      logger(message) {
        if (message?.status === "recognizing text" && typeof message.progress === "number") {
          setStatus(`OCR 辨識中 ${Math.round(message.progress * 100)}%`);
        }
      },
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzEXP%,.[]()楓幣 ",
    });
    return { text: result?.data?.text || "", supported: true };
  } catch (_error) {
    state.tesseractFailed = true;
    return { text: "", supported: false };
  }
}

async function detectMesoText(canvas) {
  const tesseract = await ensureTesseract();
  if (!tesseract) return { text: "", supported: false };
  try {
    const result = await tesseract.recognize(canvas, "eng", {
      logger(message) {
        if (message?.status === "recognizing text" && typeof message.progress === "number") {
          setStatus(`楓幣 OCR 辨識中 ${Math.round(message.progress * 100)}%`);
        }
      },
      tessedit_char_whitelist: "0123456789,",
      tessedit_pageseg_mode: "7",
    });
    return { text: result?.data?.text || "", supported: true };
  } catch (_error) {
    return { text: "", supported: false };
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureTesseract() {
  if (window.Tesseract) return window.Tesseract;
  if (state.tesseractFailed) return null;
  if (!state.tesseractPromise) {
    setStatus("OCR 元件載入中。");
    state.tesseractPromise = loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js")
      .then(() => window.Tesseract || null)
      .catch(() => {
        state.tesseractFailed = true;
        return null;
      });
  }
  return state.tesseractPromise;
}

function snapshotFromFields() {
  const level = parseNumber(el.manualLevel?.value);
  const exp = parseNumber(el.manualExp?.value);
  const percent = parseNumber(el.manualPercent?.value);
  const meso = parseNumber(el.manualMeso?.value);
  const hasManualValue = [level, exp, percent, meso].some(value => value !== null && value !== undefined);
  const pending = hasManualValue ? state.pendingCalibration || {} : {};
  const resolvedLevel = level ?? pending.level ?? null;
  const resolvedExp = exp ?? pending.exp ?? null;
  const resolvedPercent = percent ?? pending.percent ?? null;
  const resolvedMeso = meso ?? pending.meso ?? null;
  if (!resolvedLevel || resolvedLevel < 1 || resolvedLevel > 200 || (resolvedExp === null && resolvedPercent === null)) return null;
  const expResult = resolveExpPercent(
    resolvedLevel,
    [{ value: resolvedExp, source: "校正 EXP", priority: 0 }],
    [{ value: resolvedPercent, source: "校正 EXP%", priority: 0 }],
  );
  if (!expResult.ok) {
    return {
      invalid: true,
      level: resolvedLevel,
      exp: expResult.exp ?? resolvedExp,
      percent: expResult.percent ?? resolvedPercent,
      meso: resolvedMeso,
      reason: expResult.reason,
      status: formatExpConsistencyStatus(expResult),
    };
  }
  return {
    time: Date.now(),
    level: resolvedLevel,
    exp: expResult.exp,
    percent: expResult.percent,
    meso: resolvedMeso,
    rawText: "手動校正",
  };
}

function hasCalibrationFieldValues() {
  return [el.manualLevel, el.manualExp, el.manualPercent, el.manualMeso]
    .some(input => String(input?.value || "").trim());
}

function clearCalibrationFields() {
  for (const input of [el.manualLevel, el.manualExp, el.manualPercent, el.manualMeso]) {
    if (input) input.value = "";
  }
}

function addSnapshot(snapshot) {
  if (!snapshot) return false;
  if (snapshot.invalid) {
    setStatus(snapshot.status || "EXP 與百分比不一致，已略過這筆紀錄。");
    return false;
  }
  const expResult = resolveExpPercent(
    snapshot.level,
    [{ value: snapshot.exp, source: "紀錄 EXP", priority: 0 }],
    [{ value: snapshot.percent, source: "紀錄 EXP%", priority: 0 }],
  );
  if (!expResult.ok) {
    setStatus(formatExpConsistencyStatus(expResult) || "EXP 紀錄不完整，已略過這筆資料。");
    return false;
  }
  snapshot.exp = expResult.exp;
  snapshot.percent = expResult.percent;
  state.snapshots.push(snapshot);
  state.latest = snapshot;
  render();
  return true;
}

async function ensureScreenShare() {
  if (state.stream) return true;
  if (!navigator.mediaDevices?.getDisplayMedia) {
    setStatus("目前瀏覽器不支援分享螢幕。");
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 2, max: 5 },
        width: { ideal: 3840 },
        height: { ideal: 2160 },
      },
      audio: false,
    });
    state.stream = stream;
    el.video.srcObject = stream;
    await el.video.play();
    updateRegionPresetStatus();
    stream.getVideoTracks().forEach(track => {
      track.addEventListener("ended", stopAnalysis);
    });
    setStatus("已連接螢幕分享。");
    return true;
  } catch (_error) {
    setStatus("尚未取得螢幕分享。");
    return false;
  }
}

function stopAnalysis() {
  if (state.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }
  if (el.video) el.video.srcObject = null;
  render();
  setStatus("分析已停止。");
}

async function captureFrame(addToTimeline = true) {
  const ready = await ensureScreenShare();
  if (!ready || !el.video.videoWidth || !el.video.videoHeight) return null;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = el.video.videoWidth;
  sourceCanvas.height = el.video.videoHeight;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceCtx.drawImage(el.video, 0, 0, sourceCanvas.width, sourceCanvas.height);

  updateRegionPresetStatus(sourceCanvas.width, sourceCanvas.height);
  const lvRegion = rectFor("lv", sourceCanvas.width, sourceCanvas.height);
  const expRegion = rectFor("exp", sourceCanvas.width, sourceCanvas.height);
  const mesoRegion = rectFor("meso", sourceCanvas.width, sourceCanvas.height);
  drawRegion(sourceCanvas, lvRegion, el.lvCrop);
  drawRegion(sourceCanvas, expRegion, el.expCrop);
  drawRegion(sourceCanvas, mesoRegion, el.mesoCrop);

  const lvRawCanvas = cropRegionCanvas(sourceCanvas, lvRegion, 8);
  const expRawCanvas = cropRegionCanvas(sourceCanvas, expRegion, 8);
  const templateLevel = readLevelFromCanvas(lvRawCanvas);
  const templateExp = readExpFromCanvas(expRawCanvas);
  const fallback = snapshotFromFields();
  const fieldLevel = parseNumber(el.manualLevel?.value);
  const levelWasEdited = fieldLevel !== null && fieldLevel !== undefined;
  const hadManualCalibration = hasCalibrationFieldValues();

  const [lvDetection, expDetection, mesoDetection] = await Promise.all([
    levelWasEdited || templateLevel.level ? Promise.resolve({ text: "" }) : detectTextFromCanvas(thresholdRegionCanvas(sourceCanvas, lvRegion, "lv", 8)),
    templateExp.exp !== null ? Promise.resolve({ text: "" }) : detectTextFromCanvas(el.expCrop),
    detectMesoText(mesoOcrCanvas(el.mesoCrop)),
  ]);
  const parsedLevel = parseLevelText(lvDetection.text);
  const parsedExp = parseDetectedText(expDetection.text);
  const parsedMeso = parseDetectedText(mesoDetection.text);
  const level = levelWasEdited ? fieldLevel : (templateLevel.level || parsedLevel || parsedExp.level || fieldLevel || fallback?.level || null);
  const expToNext = getExpToNext(level);
  const expResult = resolveExpPercent(
    level,
    [
      { value: templateExp.exp, source: "EXP 圖樣", priority: 0 },
      { value: parsedExp.exp, source: "OCR EXP", priority: 1 },
      { value: fallback?.exp, source: "校正 EXP", priority: 2 },
    ],
    [
      { value: templateExp.percent, source: "EXP% 圖樣", priority: 0 },
      { value: parsedExp.percent, source: "OCR EXP%", priority: 1 },
      { value: fallback?.percent, source: "校正 EXP%", priority: 2 },
    ],
  );
  const exp = expResult.exp;
  const percent = expResult.percent;
  const mesoResult = resolveMesoValue([
    ...normalizeMesoTextCandidates(mesoDetection.text),
    { value: parsedMeso.meso, source: "OCR 楓幣", confidence: parsedMeso.mesoText?.includes(",") ? 0.9 : 0.55 },
    { value: fallback?.meso, source: "校正楓幣", confidence: 1 },
  ]);
  const meso = mesoResult.value;

  const snapshot = level && expResult.ok ? {
    time: Date.now(),
    level,
    exp: Math.max(0, Math.min(expToNext || exp, exp)),
    percent,
    meso,
    rawText: [lvDetection.text, parsedExp.rawText, parsedMeso.rawText].filter(Boolean).join(" | "),
  } : null;

  if (!snapshot) {
    state.pendingCalibration = {
      level,
      exp,
      percent,
      meso: meso ?? mesoResult.rejected ?? null,
    };
  } else {
    state.pendingCalibration = null;
  }

  if (!state.ocrAvailable && state.tesseractFailed) {
    setStatus("OCR 無法載入；請用校正欄加入紀錄。");
  } else if (!snapshot && expResult.reason === "mismatch") {
    setStatus(formatExpConsistencyStatus(expResult));
  } else if (!snapshot) {
    if (exp !== null && exp !== undefined) {
      setStatus(`已讀取 EXP ${formatNumber(exp)}${percent !== null && percent !== undefined ? ` · ${formatPercent(percent)}` : ""}，請在校正欄補上等級後再加入紀錄。`);
    } else {
      setStatus("尚未辨識到 EXP 數值，請確認分享的是遊戲視窗與解析度設定。");
    }
  } else {
    const mesoText = snapshot.meso === null || snapshot.meso === undefined ? "楓幣未讀取" : `楓幣 ${formatNumber(snapshot.meso)}`;
    const mesoNote = mesoResult.reason === "outlier" ? " · 楓幣讀值離群已略過" : "";
    setStatus(`已讀取 Lv.${snapshot.level} · EXP ${formatNumber(snapshot.exp)} · ${mesoText}${mesoNote}`);
  }
  if (snapshot && addToTimeline) {
    addSnapshot(snapshot);
    if (hadManualCalibration) clearCalibrationFields();
  }
  else if (snapshot) {
    state.latest = snapshot;
    if (hadManualCalibration) clearCalibrationFields();
    render();
  }
  return snapshot;
}

async function startAnalysis() {
  const ready = await ensureScreenShare();
  if (!ready) return;
  await captureFrame(true);
  if (state.timer) window.clearInterval(state.timer);
  state.timer = window.setInterval(() => {
    captureFrame(true);
  }, CAPTURE_INTERVAL_MS);
  render();
}

function resetSnapshots() {
  state.snapshots = [];
  state.latest = null;
  render();
  setStatus("紀錄已重設。");
}

function median(values) {
  const sorted = values
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function robustRateLimit(rates, floor) {
  const positive = rates.filter(value => Number.isFinite(value) && value > 0);
  if (positive.length < 4) return Infinity;
  const center = median(positive);
  const deviations = positive.map(value => Math.abs(value - center));
  const mad = median(deviations) || 0;
  return center + Math.max(center * 5, mad * 8, floor);
}

function buildAnalysisSegments(snapshots) {
  const points = snapshots
    .map(snapshot => ({
      snapshot,
      absExp: getAbsoluteExp(snapshot),
      meso: snapshot.meso === null || snapshot.meso === undefined ? null : Number(snapshot.meso),
    }))
    .filter(point => point.absExp !== null)
    .sort((a, b) => a.snapshot.time - b.snapshot.time);
  const rawSegments = [];
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];
    const minutes = (next.snapshot.time - prev.snapshot.time) / 60000;
    if (!Number.isFinite(minutes) || minutes <= 0) continue;
    const expDelta = next.absExp - prev.absExp;
    const mesoDelta = prev.meso === null || next.meso === null ? null : next.meso - prev.meso;
    const expToNext = getExpToNext(prev.snapshot.level) || getExpToNext(next.snapshot.level) || 0;
    const shortWindowLimit = minutes <= 1
      ? Math.max(100000, expToNext * 0.35)
      : Infinity;
    const mesoShortWindowLimit = minutes <= 1 ? 5000000 : Infinity;
    rawSegments.push({
      from: prev.snapshot,
      to: next.snapshot,
      minutes,
      expDelta,
      mesoDelta,
      expRate: expDelta / minutes,
      mesoRate: mesoDelta === null ? null : mesoDelta / minutes,
      expReason: expDelta < 0
        ? "negative"
        : expDelta > shortWindowLimit
          ? "spike"
          : "",
      mesoReason: mesoDelta === null
        ? "missing"
        : mesoDelta < 0
          ? "negative"
          : mesoDelta > mesoShortWindowLimit
            ? "spike"
            : "",
    });
  }

  const expLimit = robustRateLimit(
    rawSegments
      .filter(segment => !segment.expReason)
      .map(segment => segment.expRate),
    10000,
  );
  const mesoLimit = robustRateLimit(
    rawSegments
      .filter(segment => !segment.mesoReason)
      .map(segment => segment.mesoRate),
    1000000,
  );

  const expSegments = rawSegments.filter(segment => {
    if (segment.expReason) return false;
    return !Number.isFinite(expLimit) || segment.expRate <= expLimit;
  });
  const mesoSegments = rawSegments.filter(segment => {
    if (segment.mesoReason) return false;
    return !Number.isFinite(mesoLimit) || segment.mesoRate <= mesoLimit;
  });

  return {
    rawSegments,
    expSegments,
    mesoSegments,
    ignoredExpSegments: rawSegments.length - expSegments.length,
    ignoredMesoSegments: rawSegments.length - mesoSegments.length,
  };
}

function sumSegments(segments, field, sinceTime = null) {
  const filtered = sinceTime === null
    ? segments
    : segments.filter(segment => segment.to.time >= sinceTime);
  return {
    delta: filtered.reduce((total, segment) => total + Math.max(0, Number(segment[field] || 0)), 0),
    minutes: filtered.reduce((total, segment) => total + Number(segment.minutes || 0), 0),
  };
}

function computeStats() {
  const snapshots = state.snapshots.filter(row => row.level && row.exp !== null && row.exp !== undefined);
  if (snapshots.length < 2) return null;
  const { rawSegments, expSegments, mesoSegments, ignoredExpSegments, ignoredMesoSegments } = buildAnalysisSegments(snapshots);
  if (!rawSegments.length) return null;
  const lastReliable = expSegments[expSegments.length - 1]?.to || snapshots[snapshots.length - 1];
  const lastTime = lastReliable.time || snapshots[snapshots.length - 1].time;
  const totalExp = sumSegments(expSegments, "expDelta");
  const totalMeso = sumSegments(mesoSegments, "mesoDelta");
  const recentSince = lastTime - 10 * 60000;
  const recentExp = sumSegments(expSegments, "expDelta", recentSince);
  const recentMeso = sumSegments(mesoSegments, "mesoDelta", recentSince);
  const expPerMin = totalExp.minutes > 0 ? totalExp.delta / totalExp.minutes : 0;
  const mesoPerMin = totalMeso.minutes > 0 ? totalMeso.delta / totalMeso.minutes : null;
  const expToNext = getExpToNext(lastReliable.level);
  const remainingExp = expToNext ? Math.max(0, expToNext - Number(lastReliable.exp || 0)) : null;
  return {
    elapsedMinutes: totalExp.minutes,
    expDelta: totalExp.delta,
    mesoDelta: totalMeso.minutes > 0 ? totalMeso.delta : null,
    recentExpDelta: recentExp.delta,
    recentMesoDelta: recentMeso.minutes > 0 ? recentMeso.delta : null,
    expPerMin,
    mesoPerMin,
    forecast10Exp: expPerMin * 10,
    forecast30Exp: expPerMin * 30,
    forecast10Meso: mesoPerMin === null ? null : mesoPerMin * 10,
    forecast30Meso: mesoPerMin === null ? null : mesoPerMin * 30,
    expToNext,
    remainingExp,
    ignoredExpSegments,
    ignoredMesoSegments,
    acceptedExpSegments: expSegments.length,
    acceptedMesoSegments: mesoSegments.length,
    etaMinutes: remainingExp !== null && expPerMin > 0 ? remainingExp / expPerMin : null,
  };
}

function renderMetricCard(title, expValue, mesoValue = null, expSuffix = "EXP") {
  return `
    <div class="combatMetricCard">
      <strong>${formatMetricNumber(expValue)}</strong>
      <span>${title} ${expSuffix}</span>
      <small>${mesoValue === null || mesoValue === undefined ? "楓幣等待資料" : `${formatMetricNumber(mesoValue)} 楓幣`}</small>
    </div>
  `;
}

function renderSummaryCards(stats) {
  const expPerMin = stats?.expPerMin ?? 0;
  const mesoPerMin = stats?.mesoPerMin ?? null;
  return `
    ${renderMetricCard("累計每分鐘", expPerMin, mesoPerMin, "EXP")}
    ${renderMetricCard("累計10分鐘", stats?.recentExpDelta ?? 0, stats?.recentMesoDelta ?? null, "EXP")}
    ${renderMetricCard("總累計", stats?.expDelta ?? 0, stats?.mesoDelta ?? null, "EXP")}
    ${renderMetricCard("預估10分鐘", stats?.forecast10Exp ?? 0, stats?.forecast10Meso ?? null, "EXP")}
    ${renderMetricCard("預估30分鐘", stats?.forecast30Exp ?? 0, stats?.forecast30Meso ?? null, "EXP")}
    <div class="combatMetricCard">
      <strong>${formatDuration(stats?.etaMinutes)}</strong>
      <span>預估升等所需時間</span>
      <small>${stats ? `${stats.acceptedExpSegments} 段有效 · 排除 ${stats.ignoredExpSegments} 段` : `${state.snapshots.length} 筆紀錄`}</small>
    </div>
  `;
}

function renderCurrentSnapshot(snapshot, stats) {
  if (!snapshot) {
    return `<p class="combatEmpty">開始分析後，這裡會顯示最近一次讀到的等級、EXP、百分比與楓幣。</p>`;
  }
  const expToNext = getExpToNext(snapshot.level);
  const remaining = expToNext ? Math.max(0, expToNext - Number(snapshot.exp || 0)) : 0;
  const percent = snapshot.percent ?? (expToNext ? Number(snapshot.exp || 0) / expToNext * 100 : null);
  return `
    <div class="combatSnapshotGrid">
      <div class="combatSnapshot"><b>Lv.${formatNumber(snapshot.level)}</b><span>目前等級</span></div>
      <div class="combatSnapshot"><b>${formatNumber(snapshot.exp)}</b><span>目前 EXP ${percent !== null ? `· ${formatPercent(percent)}` : ""}</span></div>
      <div class="combatSnapshot"><b>${formatNumber(remaining)}</b><span>剩餘 EXP</span></div>
      <div class="combatSnapshot"><b>${snapshot.meso === null || snapshot.meso === undefined ? "未讀取" : formatNumber(snapshot.meso)}</b><span>目前楓幣</span></div>
    </div>
    <p class="combatHint">${stats ? `已分析 ${stats.elapsedMinutes.toFixed(1)} 分鐘，累積 ${formatNumber(stats.expDelta)} EXP；已排除 ${stats.ignoredExpSegments} 段可能誤判的 EXP 區間。` : "至少需要兩筆紀錄才會開始估算效率。"}</p>
  `;
}

function renderHistory() {
  if (!state.snapshots.length) {
    return `<p class="combatEmpty">尚未有紀錄。</p>`;
  }
  return `
    <div class="combatTableWrap">
      <table class="combatTable" id="snapshotTable">
        <thead>
          <tr>
            <th>時間</th>
            <th>等級</th>
            <th>EXP</th>
            <th>EXP %</th>
            <th>楓幣</th>
          </tr>
        </thead>
        <tbody>
          ${state.snapshots.map(row => `
            <tr>
              <td>${new Date(row.time).toLocaleTimeString("zh-TW", { hour12: false })}</td>
              <td>Lv.${formatNumber(row.level)}</td>
              <td>${formatNumber(row.exp)}</td>
              <td>${row.percent === null || row.percent === undefined ? "" : formatPercent(row.percent)}</td>
              <td>${row.meso === null || row.meso === undefined ? "" : formatNumber(row.meso)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderLevelExpTable() {
  const tableRows = buildRowsWithCumulative();
  return `
    <details class="levelExpDetails">
      <summary>等級經驗表</summary>
      <div class="combatTableWrap">
        <table class="levelExpTable" id="levelExpTable">
          <thead>
            <tr>
              <th>等級</th>
              <th>升下一級所需經驗</th>
              <th>累積至此等級</th>
              <th>累積至下一級</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.map(row => `
              <tr data-level="${row.level}">
                <td>Lv.${row.level}</td>
                <td>${formatNumber(row.expToNextLevel)}</td>
                <td>${formatNumber(row.cumulativeBefore)}</td>
                <td>${formatNumber(row.cumulativeAfter)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}

function render() {
  if (!el.panel) return;
  const stats = computeStats();
  if (el.count) el.count.textContent = `${levelRows.length} 級 · 螢幕分析`;
  el.panel.innerHTML = `
    <header class="combatHero">
      <div>
        <h2 id="combatAnalysisTitle">戰鬥分析</h2>
        <p>從分享螢幕擷取 EXP 與楓幣數值，估算目前練功效率與升級時間。</p>
      </div>
      <div class="combatMetricCard">
        <strong>${state.timer ? "進行中" : "待開始"}</strong>
        <span>狀態</span>
      </div>
    </header>
    <div class="combatSummaryGrid">
      ${renderSummaryCards(stats)}
    </div>
    <div class="combatDetailBody">
      <section class="combatCard">
        <header class="combatCardHeader">
          <h3>目前紀錄</h3>
          <span class="combatMuted">${state.ocrAvailable || window.Tesseract ? "本機 OCR" : "OCR/校正"}</span>
        </header>
        <div class="combatCardBody">${renderCurrentSnapshot(state.latest || state.snapshots[state.snapshots.length - 1], stats)}</div>
      </section>
      <section class="combatCard">
        <header class="combatCardHeader">
          <h3>紀錄列表</h3>
          <span class="combatMuted">${state.snapshots.length} 筆</span>
        </header>
        <div class="combatCardBody">${renderHistory()}</div>
      </section>
      ${renderLevelExpTable()}
    </div>
  `;
}

function initialize() {
  setTheme(state.theme);
  const meta = db.metadata || {};
  const parts = [];
  if (meta.gameVersion) parts.push(`遊戲版本 ${meta.gameVersion}`);
  if (meta.generatedAtText) parts.push(`更新 ${meta.generatedAtText}`);
  if (el.buildMeta) el.buildMeta.textContent = parts.join(" · ");

  el.themeToggle?.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });
  el.share?.addEventListener("click", ensureScreenShare);
  el.start?.addEventListener("click", startAnalysis);
  el.captureOnce?.addEventListener("click", () => captureFrame(true));
  el.stop?.addEventListener("click", stopAnalysis);
  el.reset?.addEventListener("click", resetSnapshots);
  if (el.ocrResolution) {
    el.ocrResolution.value = state.ocrResolutionKey;
    el.ocrResolution.addEventListener("change", () => {
      state.ocrResolutionKey = OCR_REGION_PRESETS[el.ocrResolution.value] ? el.ocrResolution.value : OCR_REGION_AUTO;
      writeCookie(OCR_REGION_COOKIE, state.ocrResolutionKey);
      updateRegionPresetStatus();
    });
  }
  el.addManual?.addEventListener("click", () => {
    const snapshot = snapshotFromFields();
    if (!snapshot) {
      setStatus("請至少填入等級與目前 EXP。");
      return;
    }
    if (snapshot.invalid) {
      setStatus(snapshot.status || "EXP 與百分比不一致，已略過這筆紀錄。");
      return;
    }
    addSnapshot(snapshot);
    state.pendingCalibration = null;
    clearCalibrationFields();
    setStatus("已加入校正紀錄。");
  });
  for (const input of [el.manualExp, el.manualMeso]) {
    input?.addEventListener("blur", () => {
      const number = parseNumber(input.value);
      if (number !== null) input.value = formatNumber(number);
    });
  }
  el.video?.addEventListener("loadedmetadata", () => updateRegionPresetStatus());
  updateRegionPresetStatus();
  render();
  setStatus(state.ocrAvailable ? "可使用瀏覽器原生 OCR。" : "會在需要時載入前端 OCR 元件。");
}

initialize();
