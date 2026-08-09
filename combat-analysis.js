const db = window.MS_COMBAT_ANALYSIS_DB || {};
const levelRows = Array.isArray(db.levels) ? db.levels : [];
const COOKIE_DAYS = 180;
const CAPTURE_INTERVAL_MS = 10000;
const OCR_REGION_AUTO = "auto";
const OCR_REGION_COOKIE = "ms_combat_ocr_resolution";
const OCR_REGION_PRESETS = {
  "1366x768": {
    exp: { x: 0.528913, y: 0.955321, width: 0.090558, height: 0.017685 },
    meso: { x: 0.848105, y: 0.394967, width: 0.112695, height: 0.030088 },
  },
  "1920x1080": {
    exp: { x: 0.519505, y: 0.968093, width: 0.064862, height: 0.013179 },
    meso: { x: 0.892415, y: 0.283051, width: 0.079214, height: 0.018941 },
  },
  "2560x1440": {
    exp: { x: 0.529064, y: 0.959139, width: 0.090317, height: 0.015446 },
    meso: { x: 0.848442, y: 0.397155, width: 0.110875, height: 0.024178 },
  },
  "2732x1440": {
    exp: { x: 0.526452, y: 0.958579, width: 0.086042, height: 0.015653 },
    meso: { x: 0.857949, y: 0.39307, width: 0.103671, height: 0.032763 },
  },
  "3840x2160": {
    exp: { x: 0.518695, y: 0.971186, width: 0.060811, height: 0.011738 },
    meso: { x: 0.898966, y: 0.265834, width: 0.073318, height: 0.017707 },
  },
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
    rawText: normalized,
  };

  const levelMatch = compact.match(/(?:LV\.?|Lv\.?|L[Vv])[^0-9]{0,5}([0-9]{1,3})/);
  if (levelMatch) result.level = Number(levelMatch[1]);

  const expMatch = compact.match(/EXP[^0-9]{0,8}([0-9,]{2,12})[\[(（]?([0-9]{1,3}(?:\.[0-9]{1,2})?)%/) || compact.match(/([0-9,]{3,12})[\[(（]([0-9]{1,3}(?:\.[0-9]{1,2})?)%/);
  if (expMatch) {
    result.exp = parseNumber(expMatch[1]);
    result.percent = Number(expMatch[2]);
  }

  const mesoMatch = compact.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})楓幣/) || compact.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})/);
  if (mesoMatch) result.meso = parseNumber(mesoMatch[1]);
  return result;
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

function findRegionPreset(width, height) {
  const key = resolutionKey(width, height);
  if (OCR_REGION_PRESETS[key]) {
    return { key, exact: true, regions: OCR_REGION_PRESETS[key] };
  }
  let best = null;
  const currentAspect = width / Math.max(1, height);
  for (const [candidateKey, regions] of Object.entries(OCR_REGION_PRESETS)) {
    const size = presetDimensions(candidateKey);
    if (!size) continue;
    const candidateAspect = size.width / Math.max(1, size.height);
    const widthScore = Math.abs(Math.log(width / size.width));
    const heightScore = Math.abs(Math.log(height / size.height));
    const aspectScore = Math.abs(currentAspect - candidateAspect);
    const score = widthScore + heightScore + aspectScore * 3;
    if (!best || score < best.score) {
      best = { key: candidateKey, exact: false, regions, score };
    }
  }
  return best;
}

function selectedRegionPreset(width, height) {
  if (OCR_REGION_PRESETS[state.ocrResolutionKey]) {
    return {
      key: state.ocrResolutionKey,
      exact: resolutionKey(width, height) === state.ocrResolutionKey,
      forced: true,
      regions: OCR_REGION_PRESETS[state.ocrResolutionKey],
    };
  }
  return findRegionPreset(width, height);
}

function regionToRect(region, width, height) {
  const x = clamp(region?.x, 0, 0.995);
  const y = clamp(region?.y, 0, 0.995);
  const regionWidth = clamp(region?.width, 0.003, 1 - x);
  const regionHeight = clamp(region?.height, 0.003, 1 - y);
  const rectX = Math.round(x * width);
  const rectY = Math.round(y * height);
  return {
    x: Math.min(Math.max(0, rectX), Math.max(0, width - 1)),
    y: Math.min(Math.max(0, rectY), Math.max(0, height - 1)),
    width: Math.min(Math.max(1, Math.round(regionWidth * width)), Math.max(1, width - rectX)),
    height: Math.min(Math.max(1, Math.round(regionHeight * height)), Math.max(1, height - rectY)),
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
    el.regionPresetStatus.textContent = `${current} · 手動使用 ${preset.key} 辨識區塊`;
    return;
  }
  el.regionPresetStatus.textContent = preset.exact
    ? `${current} · 使用 ${preset.key} 辨識區塊`
    : `${current} · 使用最接近的 ${preset.key} 辨識區塊推估`;
}

function rectFor(type, width, height) {
  const preset = selectedRegionPreset(width, height);
  const region = preset?.regions?.[type];
  if (region) return regionToRect(region, width, height);
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
  if (!level || level < 1 || level > 200 || exp === null) return null;
  const expToNext = getExpToNext(level);
  const normalizedExp = Math.max(0, Math.min(expToNext || exp, exp));
  return {
    time: Date.now(),
    level,
    exp: normalizedExp,
    percent: percent === null && expToNext ? (normalizedExp / expToNext) * 100 : percent,
    meso,
    rawText: "手動校正",
  };
}

function updateFieldsFromSnapshot(snapshot) {
  if (!snapshot) return;
  if (el.manualLevel && snapshot.level) el.manualLevel.value = String(snapshot.level);
  if (el.manualExp && snapshot.exp !== null && snapshot.exp !== undefined) el.manualExp.value = formatNumber(snapshot.exp);
  if (el.manualPercent && snapshot.percent !== null && snapshot.percent !== undefined) el.manualPercent.value = formatPercent(snapshot.percent).replace("%", "");
  if (el.manualMeso && snapshot.meso !== null && snapshot.meso !== undefined) el.manualMeso.value = formatNumber(snapshot.meso);
}

function addSnapshot(snapshot) {
  if (!snapshot) return false;
  state.snapshots.push(snapshot);
  state.latest = snapshot;
  updateFieldsFromSnapshot(snapshot);
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
  const expRegion = rectFor("exp", sourceCanvas.width, sourceCanvas.height);
  const mesoRegion = rectFor("meso", sourceCanvas.width, sourceCanvas.height);
  drawRegion(sourceCanvas, expRegion, el.expCrop);
  drawRegion(sourceCanvas, mesoRegion, el.mesoCrop);

  const [expDetection, mesoDetection] = await Promise.all([
    detectTextFromCanvas(el.expCrop),
    detectTextFromCanvas(el.mesoCrop),
  ]);
  const parsedExp = parseDetectedText(expDetection.text);
  const parsedMeso = parseDetectedText(mesoDetection.text);
  const fallback = snapshotFromFields();
  const level = parsedExp.level || fallback?.level || null;
  let exp = parsedExp.exp;
  const percent = parsedExp.percent ?? fallback?.percent ?? null;
  const expToNext = getExpToNext(level);
  if ((exp === null || exp === undefined) && percent !== null && expToNext) {
    exp = Math.floor(expToNext * percent / 100);
  }
  if ((exp === null || exp === undefined) && fallback) exp = fallback.exp;

  const snapshot = level && exp !== null && exp !== undefined ? {
    time: Date.now(),
    level,
    exp: Math.max(0, Math.min(expToNext || exp, exp)),
    percent,
    meso: parsedMeso.meso ?? fallback?.meso ?? null,
    rawText: [parsedExp.rawText, parsedMeso.rawText].filter(Boolean).join(" | "),
  } : null;

  if (!state.ocrAvailable && state.tesseractFailed) {
    setStatus("OCR 無法載入；請用校正欄加入紀錄。");
  } else if (!snapshot) {
    setStatus("尚未辨識到完整 EXP，請確認分享的是遊戲視窗。");
  } else {
    const mesoText = snapshot.meso === null || snapshot.meso === undefined ? "楓幣未讀取" : `楓幣 ${formatNumber(snapshot.meso)}`;
    setStatus(`已讀取 Lv.${snapshot.level} · EXP ${formatNumber(snapshot.exp)} · ${mesoText}`);
  }
  if (snapshot && addToTimeline) addSnapshot(snapshot);
  else if (snapshot) {
    state.latest = snapshot;
    updateFieldsFromSnapshot(snapshot);
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

function computeStats() {
  const snapshots = state.snapshots.filter(row => row.level && row.exp !== null && row.exp !== undefined);
  if (snapshots.length < 2) return null;
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const elapsedMinutes = Math.max(0, (last.time - first.time) / 60000);
  const firstAbs = getAbsoluteExp(first);
  const lastAbs = getAbsoluteExp(last);
  if (!elapsedMinutes || firstAbs === null || lastAbs === null) return null;
  const expDelta = Math.max(0, lastAbs - firstAbs);
  const mesoDelta = first.meso !== null && first.meso !== undefined && last.meso !== null && last.meso !== undefined
    ? Math.max(0, Number(last.meso) - Number(first.meso))
    : null;
  const expPerMin = expDelta / elapsedMinutes;
  const mesoPerMin = mesoDelta === null ? null : mesoDelta / elapsedMinutes;
  const expToNext = getExpToNext(last.level);
  const remainingExp = expToNext ? Math.max(0, expToNext - Number(last.exp || 0)) : null;
  return {
    elapsedMinutes,
    expDelta,
    mesoDelta,
    expPerMin,
    mesoPerMin,
    expToNext,
    remainingExp,
    etaMinutes: remainingExp !== null && expPerMin > 0 ? remainingExp / expPerMin : null,
  };
}

function renderSummaryCards(stats) {
  const expPerMin = stats?.expPerMin || 0;
  const mesoPerMin = stats?.mesoPerMin || 0;
  return `
    <div class="combatMetricCard">
      <strong>${formatRate(expPerMin)}</strong>
      <span>EXP / 分</span>
    </div>
    <div class="combatMetricCard">
      <strong>${formatRate(expPerMin * 10)}</strong>
      <span>EXP / 10 分</span>
    </div>
    <div class="combatMetricCard">
      <strong>${formatRate(expPerMin * 60)}</strong>
      <span>EXP / 小時</span>
    </div>
    <div class="combatMetricCard">
      <strong>${formatDuration(stats?.etaMinutes)}</strong>
      <span>升下一級</span>
    </div>
    <div class="combatMetricCard">
      <strong>${formatRate(mesoPerMin)}</strong>
      <span>楓幣 / 分</span>
    </div>
    <div class="combatMetricCard">
      <strong>${formatRate(mesoPerMin * 10)}</strong>
      <span>楓幣 / 10 分</span>
    </div>
    <div class="combatMetricCard">
      <strong>${formatRate(mesoPerMin * 60)}</strong>
      <span>楓幣 / 小時</span>
    </div>
    <div class="combatMetricCard">
      <strong>${state.snapshots.length}</strong>
      <span>已記錄</span>
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
    <p class="combatHint">${stats ? `已分析 ${stats.elapsedMinutes.toFixed(1)} 分鐘，累積 ${formatNumber(stats.expDelta)} EXP。` : "至少需要兩筆紀錄才會開始估算效率。"}</p>
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
    addSnapshot(snapshot);
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
