const db = window.MS_COMBAT_ANALYSIS_DB || {};
const mapDb = window.MS_MAP_DB || {};
const levelRows = Array.isArray(db.levels) ? db.levels : [];
const mapRows = Array.isArray(mapDb.maps) ? mapDb.maps : [];
const COMBAT_JOB_CANDIDATES = [
  { id: 0, label: "初心者" },
  { id: 100, label: "劍士" },
  { id: 110, label: "狂戰士" },
  { id: 120, label: "見習騎士" },
  { id: 130, label: "槍騎兵" },
  { id: 111, label: "十字軍" },
  { id: 121, label: "騎士" },
  { id: 131, label: "龍騎士" },
  { id: 112, label: "英雄" },
  { id: 122, label: "聖騎士" },
  { id: 132, label: "黑騎士" },
  { id: 200, label: "法師" },
  { id: 210, label: "巫師（火、毒）", aliases: ["巫師火毒"] },
  { id: 220, label: "巫師（冰、雷）", aliases: ["巫師冰雷"] },
  { id: 230, label: "僧侶" },
  { id: 211, label: "魔導士（火、毒）", aliases: ["魔導士火毒"] },
  { id: 221, label: "魔導士（冰、雷）", aliases: ["魔導士冰雷"] },
  { id: 231, label: "祭司" },
  { id: 212, label: "大魔導士（火、毒）", aliases: ["大魔導士火毒"] },
  { id: 222, label: "大魔導士（冰、雷）", aliases: ["大魔導士冰雷"] },
  { id: 232, label: "主教" },
  { id: 300, label: "弓箭手" },
  { id: 310, label: "獵人" },
  { id: 320, label: "弩弓手" },
  { id: 311, label: "遊俠" },
  { id: 321, label: "狙擊手" },
  { id: 312, label: "箭神" },
  { id: 322, label: "神射手" },
  { id: 400, label: "盜賊" },
  { id: 410, label: "刺客" },
  { id: 420, label: "俠盜" },
  { id: 411, label: "暗殺者" },
  { id: 421, label: "神偷" },
  { id: 412, label: "夜使者" },
  { id: 422, label: "暗影神偷" },
  { id: 500, label: "海盜" },
  { id: 510, label: "打手" },
  { id: 520, label: "槍手" },
  { id: 511, label: "格鬥家" },
  { id: 521, label: "神槍手" },
  { id: 512, label: "拳霸" },
  { id: 522, label: "槍神" },
];
const COOKIE_DAYS = 180;
const CAPTURE_INTERVAL_MS = 10000;
const OCR_REGION_AUTO = "auto";
const OCR_REGION_COOKIE = "ms_combat_ocr_resolution";
const REPORT_EMAIL = "morrisrrrrrrr-svg@users.noreply.github.com";
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
  "2732x1536": {
    lv: { x: 0.227149, y: 0.959786, width: 0.052363, height: 0.039222 },
    exp: { x: 0.526452, y: 0.958579, width: 0.086042, height: 0.015653 },
    meso: { x: 0.857949, y: 0.369792, width: 0.103671, height: 0.032763 },
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
const OCR_MESO_DIGIT_TEMPLATES = {
  "0": ["111111111111000000000000000000000000001111111100111110011111111110011111110000000011110000000011110000000011110000000011110000000011111110011111001111111100000000000000000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000001111111000011100001110011000001110111000000110111000000111111000000111111000000110011000001110011100001110000111111000000000000000000000000000000000000000111111111111","000000000000000000000000000000000000000000000000000000000000000000000000001111111000011000001110111000000111111000000111111000000110001111111100000000000000000000000000111111111111000000000000000000000000111111111111","111111111111000000000000000000000000000000000000001111111100001111111100111110011111110000000011110000000011110000000011110000000011110000000011110000000011110000000011110000000011111110011111001111111100001111111100","111111111111000000000000000000000000111110011111110000000011110000000011110000000011110000000011110000000011001111111100000000000000000000000000000000000000111111111111000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000111111111111000000000000000001100000011100001110111000000110111000000111111000000110011100001110000000000000000000000000111111111111000000000000000000000000000000000000","111111111111000000000000000000000000000000000000000000000000111111111111000000000000000001100000011100001110111000000110111000000111111000000110011000001110000111111000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000000000000000111111111111000000000000000001100000011111111100011000001110111000000110111000000111111000000110011000001110000111111000000000000000000000000000111111111111"],
  "1": ["111111111111000000000000000000000000001111100000111111100000111111100000000001100000000001100000000001100000000001100000000001100000000001111100111111111111000000000000000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000000011111111001111111111000000111111000000111111000000111111000000111111000000111111000000111111000000111111111111111111000000000000000000000000000000000000111111111111","000000000000000000000000000000000000000000000000000000000000000000000000000111110000000011110000000011110000000011110000000011110000111111111111000000000000000000000000111111111111000000000000000000000000111111111111","111111111111000000000000000000000000000000000000111111111111000000000000000000000000011111110000000011110000000011110000000011110000000011110000000000000000000000000000111111111111000000000000000000000000000000000000","111111111111000000000000000000000000111111100000000001100000000001100000000001100000000001100000000001100000111111111111000000000000000000000000000000000000111111111111000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000000000000000111111111111000000000000000000000000111111111111000001111111000001111111000001111111000001111111000001111111111111111111000000000000000000000000111111111111"],
  "3": ["111111111111000000000000000000000000111111111100110000011111110000011111000000011111000000011111001111111100000000011111000000000011110000011111111111111100000000000000000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000011111111100010000001111000000001111000000001110000011111100000011111110000000001111000000001111110000001111011111111100000000000000000000000000000000000000111111111111","000000000000000000000000000000000000000000000000000000000000000000000000011111111100000000001111000001111110000011111110000000000011111111111110000000000000000000000000111111111111000000000000000000000000111111111111","111111111111000000000000000000000000000000000000111111111100111111111100110000011111000000011111000000011111000000011111001111111100001111111100000000011111000000000011000000000011110000011111111111111100111111111100","111111111111000000000000000000000000110000011111000000011111000000011111001111111100000000011111000000000011111111111100000000000000000000000000000000000000111111111111000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000111111111111000000000000000001100000010000001111000000001110000011111100000000001111110000001111000000000000000000000000111111111111000000000000000000000000000000000000","111111111111000000000000000000000000000000000000000000000000111111111111000000000000000011100000111111111110000000001111000000001110000111111110000000001111000000001111111111111000000000000000000000000000111111111111"],
  "4": ["111111111111000000000000000000000000000000111100000000111100000000111100000011111100000011001100001100001100111111111111111111111111000000001100000000001100000000000000000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000000000111100000001111100000011111100000111011100001100011100011100011100111111111111000000011100000000011100000000011100000000000000000000000000000000000000111111111111","000000000000000000000000000000000000000000000000000000000000000000000000000001111100000111111100001100011100111000011100111111111111000000011100000000000000000000000000111111111111000000000000000000000000111111111111","111111111111000000000000000000000000000000000000000000111100000000111100000000111100000011111100000011111100000011001100001100001100001100001100111111111111111111111111111111111111000000001100000000001100000000001100","111111111111000000000000000000000000000000111100000011111100000011001100001100001100111111111111111111111111000000001100000000000000000000000000000000000000111111111111000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000111111111111000000000000000000000000000011111100001110011100011000011100111111111111000000011100000000000000000000000000111111111111000000000000000000000000000000000000","111111111111000000000000000000000000000000000000000000000000111111111111000000000000000000000000000001111100000111111100001110011100111000011100111111111111000000011100000000011100000000000000000000000000111111111111"],
  "9": ["111111111111000000000000000000000000000011111100001100001111001100001111111100000011111100000011001111001111000011110011000000000011000000001111001111111100000000000000000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000001111111100111100001110111100001111110000000011111100001111011111111111000000000011000000001111010000011110011111110000000000000000000000000000000000000000111111111111","000000000000000000000000000000000000000000000000000000000000000000000000001111111100111100001111111100000011011111111111000000001111111111111100000000000000000000000000111111111111000000000000000000000000111111111111","111111111111000000000000000000000000000000000000111111111111000000000000000001100000111100001110110000000011111100001111000000000011010000011110000000000000000000000000111111111111000000000000000000000000000000000000","111111111111000000000000000000000000000000000000000011111100000011111100001100001111111100000011111100000011111100000011001111001111001111001111000011110011000000000011000000000011000000001111001111111100001111111100","111111111111000000000000000000000000001100001111111100000011111100000011001111001111000011110011000000000011001111111100000000000000000000000000000000000000111111111111000000000000000000000000000000000000111111111111","111111111111000000000000000000000000000000000000000000000000111111111111000000000000000001100000011111111110111100001111110000000011011111111111000000000011000000001111011111110000000000000000000000000000111111111111"],
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

window.OCR_DIGIT_TEMPLATES = OCR_DIGIT_TEMPLATES;
window.OCR_MESO_DIGIT_TEMPLATES = OCR_MESO_DIGIT_TEMPLATES;

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
  identityScanPromise: null,
  lastIdentityScanAt: 0,
  lastReportFilename: "",
  shareJob: "",
  shareMapName: "",
  shareImageReady: false,
};

const el = {
  buildMeta: document.getElementById("buildMeta"),
  count: document.getElementById("resultCount"),
  panel: document.getElementById("combatAnalysisPanel"),
  themeToggle: document.getElementById("themeToggle"),
  video: document.getElementById("captureVideo"),
  share: document.getElementById("shareScreenButton"),
  start: document.getElementById("startAnalysisButton"),
  reset: document.getElementById("resetSnapshotsButton"),
  status: document.getElementById("ocrStatus"),
  ocrResolution: document.getElementById("ocrResolutionSelect"),
  regionPresetStatus: document.getElementById("regionPresetStatus"),
  lvCrop: document.getElementById("lvCropCanvas"),
  expCrop: document.getElementById("expCropCanvas"),
  mesoCrop: document.getElementById("mesoCropCanvas"),
  mapCrop: document.getElementById("mapCropCanvas"),
  jobCrop: document.getElementById("jobCropCanvas"),
  shareJobValue: document.getElementById("shareJobValue"),
  shareMapValue: document.getElementById("shareMapValue"),
  generateShare: document.getElementById("generateShareImageButton"),
  downloadShare: document.getElementById("downloadShareImageButton"),
  shareCanvas: document.getElementById("shareImageCanvas"),
  shareStatus: document.getElementById("shareImageStatus"),
  exportReport: document.getElementById("exportReportDatasetButton"),
  emailReport: document.getElementById("emailReportDatasetButton"),
  reportStatus: document.getElementById("reportDatasetStatus"),
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
  if (typeof value === "string") return value;
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

function setReportStatus(message) {
  if (el.reportStatus) el.reportStatus.textContent = message || "";
}

function setShareStatus(message) {
  if (el.shareStatus) el.shareStatus.textContent = message || "";
}

function cloneForReport(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch (_error) {
    return null;
  }
}

function canvasDataUrl(canvas) {
  try {
    if (!canvas || !canvas.width || !canvas.height) return "";
    return canvas.toDataURL("image/png");
  } catch (_error) {
    return "";
  }
}

function canvasReport(canvas) {
  return {
    width: Number(canvas?.width || 0),
    height: Number(canvas?.height || 0),
    imagePng: canvasDataUrl(canvas),
  };
}

function currentPresetReport() {
  const width = Number(el.video?.videoWidth || 0);
  const height = Number(el.video?.videoHeight || 0);
  const preset = width && height ? selectedRegionPreset(width, height) : null;
  return {
    selected: state.ocrResolutionKey,
    videoWidth: width,
    videoHeight: height,
    resolved: preset ? {
      key: preset.key,
      exact: Boolean(preset.exact),
      adjusted: Boolean(preset.adjusted),
      forced: Boolean(preset.forced),
      frame: cloneForReport(preset.frame),
      regions: cloneForReport(preset.regions),
    } : null,
  };
}

function buildReportDataset() {
  const meta = db.metadata || {};
  const screenInfo = window.screen || {};
  return {
    schema: 1,
    type: "maple-memory-combat-analysis-report",
    createdAt: new Date().toISOString(),
    page: "combat-analysis",
    site: {
      gameVersion: meta.gameVersion || "",
      generatedAt: meta.generatedAt || "",
      generatedAtText: meta.generatedAtText || "",
    },
    browser: {
      userAgent: navigator.userAgent || "",
      language: navigator.language || "",
      languages: cloneForReport(navigator.languages || []),
      viewport: { width: window.innerWidth || 0, height: window.innerHeight || 0 },
      screen: {
        width: screenInfo.width || 0,
        height: screenInfo.height || 0,
        availWidth: screenInfo.availWidth || 0,
        availHeight: screenInfo.availHeight || 0,
        devicePixelRatio: window.devicePixelRatio || 1,
      },
    },
    capture: {
      hasActiveStream: Boolean(state.stream),
      intervalMs: CAPTURE_INTERVAL_MS,
      preset: currentPresetReport(),
    },
    recognition: {
      nativeTextDetector: typeof window.TextDetector === "function",
      tesseractLoaded: Boolean(window.Tesseract),
      tesseractFailed: Boolean(state.tesseractFailed),
      pendingCalibration: cloneForReport(state.pendingCalibration),
      pendingMesoCandidate: cloneForReport(state.pendingMesoCandidate),
    },
    latest: cloneForReport(state.latest),
    snapshots: cloneForReport(state.snapshots),
    stats: cloneForReport(computeStats()),
    share: {
      job: state.shareJob || "",
      mapName: state.shareMapName || "",
      hasShareImage: Boolean(state.shareImageReady),
    },
    crops: {
      level: canvasReport(el.lvCrop),
      exp: canvasReport(el.expCrop),
      meso: canvasReport(el.mesoCrop),
      map: canvasReport(el.mapCrop),
      job: canvasReport(el.jobCrop),
    },
    privacy: {
      containsFullScreenshot: false,
      containsScreenRecording: false,
      containsCroppedOcrImages: true,
    },
  };
}

function reportFilename() {
  const stamp = new Date().toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `maple-combat-analysis-report-${stamp}.json`;
}

function downloadReportDataset(dataset, filename) {
  const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportReportDataset() {
  const dataset = buildReportDataset();
  const filename = reportFilename();
  downloadReportDataset(dataset, filename);
  state.lastReportFilename = filename;
  setReportStatus(`已下載 ${filename}`);
  return filename;
}

function emailReportDataset() {
  const filename = state.lastReportFilename || exportReportDataset();
  const subject = "楓憶MapleMemory 戰鬥分析錯誤回報";
  const body = [
    "我已在戰鬥分析頁打包回報資料。",
    `請查看附件：${filename}`,
    "",
    "問題描述：",
  ].join("\\n");
  window.location.href = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  setReportStatus(`已開啟信件草稿，請附上 ${filename}`);
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

function inferLevelFromExpPercent(expValue, percentValue, source = "EXP 推算等級", baseConfidence = 0.72) {
  const exp = sanitizeExpCandidate(expValue, 0);
  const percent = sanitizePercentCandidate(percentValue);
  if (exp === null || percent === null || percent <= 0) return null;
  const rows = levelRows
    .map(row => ({
      level: Number(row.level),
      expToNext: Number(row.expToNextLevel || 0),
    }))
    .filter(row => Number.isFinite(row.level)
      && row.level >= 1
      && row.level <= 200
      && row.expToNext > 0
      && exp <= row.expToNext)
    .map(row => ({
      ...row,
      expectedPercent: percentFromExp(exp, row.expToNext),
    }))
    .map(row => ({
      ...row,
      delta: Math.abs(row.expectedPercent - percent),
    }))
    .sort((a, b) => a.delta - b.delta || a.level - b.level);
  const best = rows[0];
  if (!best) return null;
  const tolerance = Math.max(0.18, Math.min(1.2, percent * 0.1));
  if (best.delta > tolerance) return null;
  return {
    value: best.level,
    source,
    confidence: Math.max(0.5, Math.min(0.96, baseConfidence - best.delta * 0.2)),
  };
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

function latestKnownExpSnapshot() {
  for (let index = state.snapshots.length - 1; index >= 0; index -= 1) {
    const snapshot = state.snapshots[index];
    if (
      Number.isFinite(Number(snapshot?.level))
      && Number.isFinite(Number(snapshot?.exp))
    ) {
      return {
        level: Number(snapshot.level),
        exp: Number(snapshot.exp),
      };
    }
  }
  return null;
}

function latestKnownLevel() {
  for (let index = state.snapshots.length - 1; index >= 0; index -= 1) {
    const level = Number(state.snapshots[index]?.level);
    if (Number.isFinite(level) && level >= 1 && level <= 200) return Math.round(level);
  }
  const latest = Number(state.latest?.level);
  return Number.isFinite(latest) && latest >= 1 && latest <= 200 ? Math.round(latest) : null;
}

function normalizeLevelCandidate(value) {
  const level = Number(value);
  if (!Number.isFinite(level)) return null;
  const rounded = Math.round(level);
  return rounded >= 1 && rounded <= 200 ? rounded : null;
}

function resolveLevelValue(candidates = [], allowPreviousFallback = false) {
  const previous = latestKnownLevel();
  const rows = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const value = normalizeLevelCandidate(candidate?.value);
    if (value === null) continue;
    const source = candidate?.source || "等級辨識";
    const key = `${value}:${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      value,
      source,
      confidence: Number(candidate?.confidence || 0.5),
    });
  }

  if (rows.length) {
    if (previous !== null) {
      const plausible = rows.filter(row => {
        const distance = Math.abs(row.value - previous);
        return distance <= 1 || (row.value > previous && row.value <= previous + 3 && row.confidence >= 0.82);
      });
      if (plausible.length) {
        plausible.sort((a, b) => Math.abs(a.value - previous) - Math.abs(b.value - previous) || b.confidence - a.confidence);
        return { level: plausible[0].value, source: plausible[0].source, reused: false };
      }
      if (allowPreviousFallback) return { level: previous, source: "上一筆等級", reused: true };
    }
    rows.sort((a, b) => b.confidence - a.confidence);
    return { level: rows[0].value, source: rows[0].source, reused: false };
  }

  if (allowPreviousFallback && previous !== null) {
    return { level: previous, source: "上一筆等級", reused: true };
  }
  return { level: null, source: "", reused: false };
}

function expMovesBackward(snapshot) {
  const previous = latestKnownExpSnapshot();
  if (!previous) return false;
  const level = Number(snapshot?.level);
  const exp = Number(snapshot?.exp);
  if (!Number.isFinite(level) || !Number.isFinite(exp)) return false;
  if (level < previous.level) return true;
  if (level === previous.level && exp < previous.exp) return true;
  return false;
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

function mesoDecreaseLimit(previous) {
  return Math.max(50000, Math.round((previous || 0) * 0.08));
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
  const maxDecrease = mesoDecreaseLimit(previous);
  const accepted = rows
    .map(row => ({
      ...row,
      delta: row.value - previous,
      distance: Math.abs(row.value - previous),
    }))
    .filter(row => row.delta >= -maxDecrease && row.delta <= maxIncrease);
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

function normalizeMapSearchText(text) {
  return normalizeOcrText(text)
    .replace(/小地圖|地圖|MINI\s*MAP|MAP/gi, "")
    .replace(/[^\u3400-\u9fff\wⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/g, "")
    .toLowerCase();
}

function normalizeJobSearchText(text) {
  return normalizeOcrText(text)
    .replace(/[（(][^）)]*[）)]/g, value => value.replace(/[（）(),，、\s]/g, ""))
    .replace(/[^\u3400-\u9fffA-Za-z0-9]/g, "")
    .toLowerCase();
}

function lcsLength(a, b) {
  const left = Array.from(a || "");
  const right = Array.from(b || "");
  if (!left.length || !right.length) return 0;
  const previous = new Array(right.length + 1).fill(0);
  const current = new Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = left[i - 1] === right[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }
  return previous[right.length];
}

function overlapRatio(a, b) {
  const source = Array.from(new Set(Array.from(a || ""))).filter(Boolean);
  if (!source.length) return 0;
  const target = new Set(Array.from(b || ""));
  return source.filter(char => target.has(char)).length / source.length;
}

function mapMatchScore(query, map) {
  const compact = normalizeMapSearchText(query);
  if (!compact) return 0;
  const id = String(map?.id || "");
  if (id && compact === id) return 1000;
  const name = normalizeMapSearchText(map?.name || "");
  const label = normalizeMapSearchText(map?.label || "");
  const street = normalizeMapSearchText(map?.street || "");
  const region = normalizeMapSearchText(map?.regionName || "");
  if (name && compact === name) return 950;
  if (label && compact === label) return 930;
  if (name && compact.includes(name)) return 860 + Math.min(40, name.length);
  if (name && name.includes(compact) && compact.length >= 2) return 740 + compact.length;
  if (label && compact.includes(label)) return 700;
  if (street && compact.includes(street) && name && compact.includes(name)) return 690;
  const nameLcs = name ? lcsLength(compact, name) / Math.max(compact.length, name.length, 1) : 0;
  const labelLcs = label ? lcsLength(compact, label) / Math.max(compact.length, label.length, 1) : 0;
  const overlap = Math.max(overlapRatio(name, compact), overlapRatio(compact, name));
  const regionBonus = region && compact.includes(region) ? 25 : 0;
  return Math.max(nameLcs * 100, labelLcs * 75, overlap * 70) + regionBonus;
}

function jobMatchScore(query, job) {
  const compact = normalizeJobSearchText(query);
  if (!compact) return 0;
  const aliases = [job?.label, ...(job?.aliases || [])]
    .map(normalizeJobSearchText)
    .filter(Boolean);
  let best = 0;
  for (const alias of aliases) {
    if (compact === alias) best = Math.max(best, 1000 + alias.length);
    if (compact.includes(alias)) best = Math.max(best, 860 + alias.length);
    if (alias.includes(compact) && compact.length >= 2) best = Math.max(best, 650 + compact.length);
    const lcs = lcsLength(compact, alias) / Math.max(compact.length, alias.length, 1);
    const overlap = Math.max(overlapRatio(alias, compact), overlapRatio(compact, alias));
    best = Math.max(best, lcs * 100, overlap * 80);
  }
  return best;
}

function resolveMapFromText(text) {
  const query = normalizeMapSearchText(text);
  if (!query || !mapRows.length) return null;
  const candidates = mapRows
    .map(map => ({ map, score: mapMatchScore(query, map) }))
    .filter(row => row.score >= 46)
    .sort((a, b) => b.score - a.score || String(a.map.name || "").localeCompare(String(b.map.name || ""), "zh-Hant"));
  return candidates[0] || null;
}

function resolveJobFromText(text) {
  const query = normalizeJobSearchText(text);
  if (!query) return null;
  const candidates = COMBAT_JOB_CANDIDATES
    .map(job => ({ job, score: jobMatchScore(query, job) }))
    .filter(row => row.score >= 52)
    .sort((a, b) => b.score - a.score || String(b.job.label || "").length - String(a.job.label || "").length);
  return candidates[0] || null;
}

function mapDisplayName(map) {
  if (!map) return "";
  return [map.regionName, map.name].filter(Boolean).join(" / ");
}

function representativeMonsterForMap(map) {
  const groups = new Map();
  for (const spawn of map?.monsterSpawns || []) {
    const id = spawn?.monsterId;
    if (!id) continue;
    const key = String(id);
    const current = groups.get(key) || {
      id: key,
      name: spawn.name || `怪物 ${key}`,
      level: Number(spawn.level || 0),
      image: spawn.image || "",
      count: 0,
      weightedCount: 0,
    };
    const hasPosition = Number.isFinite(Number(spawn.x)) && Number.isFinite(Number(spawn.y));
    current.count += 1;
    current.weightedCount += hasPosition ? 1 : 0.25;
    if (!current.image && spawn.image) current.image = spawn.image;
    current.level = Math.max(current.level, Number(spawn.level || 0));
    groups.set(key, current);
  }
  const rows = [...groups.values()]
    .filter(row => row.name && !/^怪物\s*\d+$/.test(row.name))
    .sort((a, b) => b.weightedCount - a.weightedCount || b.count - a.count || b.level - a.level || Number(a.id) - Number(b.id));
  return rows[0] || null;
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

function mapTextBandRegion(frame, width, height, yRatio) {
  const regionWidth = Math.min(frame.width, Math.max(240, Math.round(frame.width * 0.24)));
  const regionHeight = Math.min(frame.height, Math.max(58, Math.round(frame.height * 0.085)));
  const x = frame.x;
  const y = frame.y + Math.max(24, Math.round(frame.height * yRatio));
  const clampedX = clamp(x, 0, Math.max(0, width - regionWidth));
  const clampedY = clamp(y, 0, Math.max(0, height - regionHeight));
  return {
    x: clampedX,
    y: clampedY,
    width: Math.min(regionWidth, Math.max(1, width - clampedX)),
    height: Math.min(regionHeight, Math.max(1, height - clampedY)),
  };
}

function mapNameRegionCandidates(width, height) {
  const preset = selectedRegionPreset(width, height);
  const frame = preset?.frame || defaultFrame(width, height);
  const candidates = [];
  const seen = new Set();
  const addCandidate = (key, label, region) => {
    const rect = {
      x: clamp(Math.round(region.x), 0, Math.max(0, width - region.width)),
      y: clamp(Math.round(region.y), 0, Math.max(0, height - region.height)),
      width: Math.max(1, Math.round(region.width)),
      height: Math.max(1, Math.round(region.height)),
    };
    const dedupeKey = `${Math.round(rect.x / 3)}:${Math.round(rect.y / 3)}:${Math.round(rect.width / 3)}:${Math.round(rect.height / 3)}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    candidates.push({ key, label, region: rect });
  };

  [0.025, 0.045, 0.065, 0.085, 0.105, 0.125].forEach((yRatio, index) => {
    addCandidate(`map-text-${index}`, "下方文字", mapTextBandRegion(frame, width, height, yRatio));
  });
  return candidates;
}

function mapNameRegion(width, height) {
  return mapNameRegionCandidates(width, height)[0]?.region || { x: 0, y: 0, width, height };
}

function jobRegionFromLevelRect(lvRegion, width, height) {
  const regionWidth = Math.max(88, Math.round(width * 0.07));
  const regionHeight = Math.max(16, Math.round(lvRegion.height * 0.56));
  const x = Math.round(lvRegion.x + lvRegion.width * 0.92);
  const y = Math.round(lvRegion.y + lvRegion.height * 0.02);
  const clampedX = clamp(x, 0, Math.max(0, width - regionWidth));
  const clampedY = clamp(y, 0, Math.max(0, height - regionHeight));
  return {
    x: clampedX,
    y: clampedY,
    width: Math.min(regionWidth, Math.max(1, width - clampedX)),
    height: Math.min(regionHeight, Math.max(1, height - clampedY)),
  };
}

function jobNameRegion(width, height) {
  return jobRegionFromLevelRect(rectFor("lv", width, height), width, height);
}

function jobNameRegionCandidates(width, height) {
  const candidates = [];
  const seen = new Set();
  const addCandidate = (key, label, region) => {
    const rect = {
      x: clamp(Math.round(region.x), 0, Math.max(0, width - region.width)),
      y: clamp(Math.round(region.y), 0, Math.max(0, height - region.height)),
      width: Math.max(1, Math.round(region.width)),
      height: Math.max(1, Math.round(region.height)),
    };
    const dedupeKey = `${Math.round(rect.x / 3)}:${Math.round(rect.y / 3)}:${Math.round(rect.width / 3)}:${Math.round(rect.height / 3)}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    candidates.push({ key, label, region: rect });
  };

  addCandidate("selected", "目前", jobNameRegion(width, height));
  for (const [key, row] of Object.entries(OCR_REGION_PRESETS)) {
    if (!row.lv) continue;
    const size = presetDimensions(key);
    const frame = frameForPresetSize(size, width, height) || defaultFrame(width, height);
    const lvRegion = regionToRect(row.lv, width, height, frame);
    addCandidate(`preset-${key}`, key, jobRegionFromLevelRect(lvRegion, width, height));
  }
  return candidates;
}

function mesoCornerCandidateRects(width, height) {
  const preset = selectedRegionPreset(width, height);
  const frame = preset?.frame || defaultFrame(width, height);
  const candidates = [];
  const seen = new Set();
  const addCandidate = (key, label, region) => {
    const rect = {
      x: clamp(Math.round(region.x), 0, Math.max(0, width - region.width)),
      y: clamp(Math.round(region.y), 0, Math.max(0, height - region.height)),
      width: Math.max(1, Math.round(region.width)),
      height: Math.max(1, Math.round(region.height)),
    };
    const dedupeKey = `${Math.round(rect.x / 3)}:${Math.round(rect.y / 3)}:${Math.round(rect.width / 3)}:${Math.round(rect.height / 3)}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    candidates.push({ key, label, region: rect });
  };

  const baseRects = [];
  const addBase = (key, region) => {
    if (!region) return;
    const rect = regionToRect(region, width, height, frame);
    if (rect.width < 40 || rect.height < 12) return;
    baseRects.push({ key, rect });
  };
  addBase(preset?.key || "selected", preset?.regions?.meso);
  for (const [key, row] of Object.entries(OCR_REGION_PRESETS)) {
    addBase(`preset-${key}`, row.meso);
  }

  for (const { key, rect: base } of baseRects) {
    addCandidate(`${key}-direct`, "推估", base);
    const mesoTopOffset = Math.max(0, base.y - frame.y);
    const mesoLeftOffset = Math.max(2, Math.round(base.height * 0.16));
    const inventoryWidth = Math.min(frame.width, Math.max(base.width, Math.round(base.width * 1.38)));
    const inventoryHeight = Math.min(frame.height, Math.max(base.height, Math.round(mesoTopOffset + base.height * 2.35)));
    const topY = frame.y + mesoTopOffset;
    const bottomY = frame.y + frame.height - inventoryHeight + mesoTopOffset;
    const leftX = frame.x + mesoLeftOffset;
    const rightX = frame.x + frame.width - inventoryWidth + mesoLeftOffset;
    const makeRect = (x, y) => ({
      x: clamp(Math.round(x), 0, Math.max(0, width - base.width)),
      y: clamp(Math.round(y), 0, Math.max(0, height - base.height)),
      width: base.width,
      height: base.height,
    });
    const bottomOffsets = [0, Math.round(base.height * 0.45), Math.round(base.height * 0.9), Math.round(base.height * 1.35)];
    addCandidate(`${key}-top-left`, "左上", makeRect(leftX, topY));
    addCandidate(`${key}-top-right`, "右上", makeRect(rightX, topY));
    for (const offset of bottomOffsets) {
      addCandidate(`${key}-bottom-left-${offset}`, "左下", makeRect(leftX, bottomY + offset));
      addCandidate(`${key}-bottom-right-${offset}`, "右下", makeRect(rightX, bottomY + offset));
    }
  }
  return candidates;
}

function regionImageData(sourceCanvas, region) {
  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  return ctx.getImageData(region.x, region.y, region.width, region.height);
}

function jobRegionVisualScore(sourceCanvas, region) {
  const image = regionImageData(sourceCanvas, region);
  let brightText = 0;
  let blueGrayText = 0;
  let darkUi = 0;
  let greenScene = 0;
  const total = image.width * image.height;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      const r = image.data[index];
      const g = image.data[index + 1];
      const b = image.data[index + 2];
      const brightness = (r + g + b) / 3;
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      if (brightness > 150 && saturation < 95) brightText += 1;
      if (b > 95 && g > 80 && r < 150 && saturation > 18 && brightness > 85 && brightness < 180) blueGrayText += 1;
      if (brightness < 75 && saturation < 95) darkUi += 1;
      if (g > 85 && g > r * 1.18 && g > b * 1.08) greenScene += 1;
    }
  }
  const brightRatio = total ? brightText / total : 0;
  const blueGrayRatio = total ? blueGrayText / total : 0;
  const darkRatio = total ? darkUi / total : 0;
  const greenRatio = total ? greenScene / total : 0;
  return brightRatio * 4.2
    + blueGrayRatio * 1.3
    + Math.min(0.45, darkRatio) * 1.1
    - greenRatio * 2.6;
}

function mesoRegionVisualScore(sourceCanvas, region) {
  const image = regionImageData(sourceCanvas, region);
  let gold = 0;
  let whiteField = 0;
  let darkDigits = 0;
  let blueChrome = 0;
  let leftTotal = 0;
  let fieldTotal = 0;
  let total = image.width * image.height;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      const r = image.data[index];
      const g = image.data[index + 1];
      const b = image.data[index + 2];
      const brightness = (r + g + b) / 3;
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      const nx = x / Math.max(1, image.width);
      const ny = y / Math.max(1, image.height);
      if (nx < 0.17) {
        leftTotal += 1;
        if (r > 170 && g > 110 && g < 230 && b < 110 && saturation > 70) gold += 1;
      }
      if (nx > 0.16 && nx < 0.82 && ny > 0.12 && ny < 0.88) {
        fieldTotal += 1;
        if (r > 205 && g > 215 && b > 220 && saturation < 70) whiteField += 1;
        if (brightness < 95 && saturation < 110) darkDigits += 1;
      }
      if (b > 125 && g > 100 && r < 170 && saturation > 30) blueChrome += 1;
    }
  }
  const goldRatio = leftTotal ? gold / leftTotal : 0;
  const whiteRatio = fieldTotal ? whiteField / fieldTotal : 0;
  const darkRatio = fieldTotal ? darkDigits / fieldTotal : 0;
  const blueRatio = total ? blueChrome / total : 0;
  return goldRatio * 2.4
    + whiteRatio * 1.5
    + Math.min(1, darkRatio * 14) * 1.8
    + Math.min(1, blueRatio * 10) * 0.45;
}

function scoreMesoCornerCandidate(sourceCanvas, candidate) {
  const visualScore = mesoRegionVisualScore(sourceCanvas, candidate.region);
  const sampleScale = Math.max(1, typeScale(candidate.region));
  const rawCanvas = cropRegionCanvas(sourceCanvas, candidate.region, sampleScale);
  const template = readMesoFromCanvas(mesoOcrCanvas(rawCanvas));
  const meso = template.meso;
  const digitBonus = meso === null || meso === undefined
    ? 0
    : Math.min(2.4, String(meso).length * 0.32);
  const score = visualScore + digitBonus;
  return {
    ...candidate,
    meso,
    visualScore,
    score,
    confidence: Math.min(0.98, 0.45 + score / 5),
  };
}

function findMesoRegion(sourceCanvas) {
  const candidates = mesoCornerCandidateRects(sourceCanvas.width, sourceCanvas.height)
    .map(candidate => scoreMesoCornerCandidate(sourceCanvas, candidate))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0] || null;
  if (!best) return null;
  const hasReliableShape = best.visualScore >= 1.35;
  const hasReadableValue = best.meso !== null && best.meso !== undefined && best.score >= 1.2;
  if (!hasReliableShape && !hasReadableValue) {
    state.pendingMesoCandidate = {
      found: false,
      best: {
        label: best.label,
        score: Number(best.score.toFixed(3)),
        visualScore: Number(best.visualScore.toFixed(3)),
        meso: best.meso ?? null,
      },
    };
    return null;
  }
  state.pendingMesoCandidate = {
    found: true,
    label: best.label,
    score: Number(best.score.toFixed(3)),
    visualScore: Number(best.visualScore.toFixed(3)),
    meso: best.meso ?? null,
    region: { ...best.region },
  };
  return best;
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
      ink = levelOrangeInkPixel(r, g, b) || levelDigitInkPixel(r, g, b);
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
  return brightness > 158 && saturation < 125 && r > 125 && g > 125 && b > 120;
}

function levelOrangeInkPixel(r, g, b) {
  return r > 150 && g > 45 && g < 190 && b < 95 && (r - g) > 45;
}

function levelDigitInkPixel(r, g, b) {
  return levelOrangeInkPixel(r, g, b);
}

function mesoInkPixel(r, g, b) {
  return (r + g + b) / 3 < 80;
}

function mesoDigitInkPixel(r, g, b) {
  const brightness = (r + g + b) / 3;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  return brightness < 105 && saturation < 130;
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

function classifyDigit(mask, templateSets = [OCR_DIGIT_TEMPLATES]) {
  let best = null;
  for (const templates of templateSets) {
    for (const [digit, masks] of Object.entries(templates)) {
      for (const template of masks) {
        const score = digitDistance(mask, template);
        if (!best || score < best.score) best = { digit, score };
      }
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

function normalizeImageBand(image, band) {
  const source = band || { minX: 0, minY: 0, maxX: image.width - 1, maxY: image.height - 1 };
  const minX = clamp(Math.floor(source.minX), 0, image.width - 1);
  const minY = clamp(Math.floor(source.minY), 0, image.height - 1);
  const maxX = clamp(Math.ceil(source.maxX), minX, image.width - 1);
  const maxY = clamp(Math.ceil(source.maxY), minY, image.height - 1);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    source: source.source || "",
  };
}

function extractLevelDigitGroups(image, band) {
  const normalizedBand = normalizeImageBand(image, band);
  const insetX = Math.max(1, Math.round(normalizedBand.width * 0.035));
  const insetY = Math.max(0, Math.round(normalizedBand.height * 0.08));
  const minX = Math.min(image.width - 1, normalizedBand.minX + insetX);
  const maxX = Math.max(minX, normalizedBand.maxX - insetX);
  const minY = Math.min(image.height - 1, normalizedBand.minY + insetY);
  const maxY = Math.max(minY, normalizedBand.maxY - insetY);
  const bandHeight = maxY - minY + 1;
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
  }).filter(group => group
    && group.height >= Math.max(4, Math.round(bandHeight * 0.28))
    && group.height <= Math.max(8, Math.round(bandHeight * 0.94))
    && group.width <= Math.max(20, Math.round(bandHeight * 1.15)));
}

function levelSearchBands(image) {
  const bands = [];
  const seen = new Set();
  const addBand = source => {
    const band = normalizeImageBand(image, source);
    if (band.width < 4 || band.height < 4) return;
    const key = `${band.minX}:${band.minY}:${band.maxX}:${band.maxY}`;
    if (seen.has(key)) return;
    seen.add(key);
    bands.push(band);
  };

  const orangeGroups = extractExpGlyphGroups(image, levelOrangeInkPixel, 2)
    .filter(group => group.height >= Math.max(4, Math.round(image.height * 0.14)) && group.width >= Math.max(4, Math.round(image.width * 0.035)))
    .sort((a, b) => (b.width * b.height) - (a.width * a.height));

  for (const group of orangeGroups.slice(0, 3)) {
    const padY = Math.max(3, Math.round(group.height * 0.9));
    addBand({
      minX: Math.max(0, group.minX - Math.round(image.width * 0.06)),
      maxX: image.width - 1,
      minY: Math.max(0, group.minY - padY),
      maxY: Math.min(image.height - 1, group.maxY + padY),
      source: "lv-label",
    });
  }

  addBand({
    minX: Math.floor(image.width * 0.2),
    maxX: image.width - 1,
    minY: 0,
    maxY: image.height - 1,
    source: "right-side",
  });
  addBand({
    minX: 0,
    maxX: image.width - 1,
    minY: 0,
    maxY: image.height - 1,
    source: "full",
  });
  return bands;
}

function readLevelCandidatesFromGroups(image, digitGroups, maxScore = 0.34) {
  const groups = [...digitGroups].sort((a, b) => a.minX - b.minX);
  const candidates = [];
  for (let start = 0; start < groups.length; start += 1) {
    for (let length = 1; length <= 3 && start + length <= groups.length; length += 1) {
      const windowGroups = groups.slice(start, start + length);
      const result = readLevelFromDigitGroups(image, windowGroups, maxScore);
      if (!result) continue;
      candidates.push({
        ...result,
        minX: windowGroups[0].minX,
        maxX: windowGroups[windowGroups.length - 1].maxX,
      });
    }
  }
  return candidates;
}

function readLevelFromCanvas(canvas) {
  if (!canvas) return { level: null };
  const rawImage = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const image = downsampleImageData(rawImage, 8);
  const candidates = [];
  for (const band of levelSearchBands(image)) {
    const digitGroups = extractLevelDigitGroups(image, band);
    for (const candidate of readLevelCandidatesFromGroups(image, digitGroups, 0.34)) {
      candidates.push({ ...candidate, band: band.source });
    }
  }
  if (!candidates.length) return { level: null };
  candidates.sort((a, b) => b.digits - a.digits || a.score - b.score || b.maxX - a.maxX);
  const best = candidates[0];
  return {
    level: best.level,
    score: best.score,
    digits: best.digits,
    confidence: Math.max(0.55, Math.min(0.98, 1 - best.score)),
    source: `LV 圖樣 ${best.band || ""}`.trim(),
  };
}

function isLikelyMesoIconGroup(group, image) {
  return group.x1 < image.width * 0.2
    && group.width >= image.height * 0.42
    && group.height >= image.height * 0.42;
}

function mesoDigitGroupsFromImage(image) {
  const xStart = Math.max(0, Math.floor(image.width * 0.14));
  const xEnd = Math.min(image.width - 1, Math.ceil(image.width * 0.9));
  const yStart = Math.max(0, Math.floor(image.height * 0.34));
  const yEnd = Math.min(image.height - 1, Math.ceil(image.height * 0.72));
  const fieldWidth = xEnd - xStart + 1;
  const noisyRows = new Set();
  for (let y = yStart; y <= yEnd; y += 1) {
    let count = 0;
    for (let x = xStart; x <= xEnd; x += 1) {
      const [r, g, b] = imagePixel(image, x, y);
      if (mesoDigitInkPixel(r, g, b)) count += 1;
    }
    if (count > fieldWidth * 0.72) noisyRows.add(y);
  }
  const minColumnPixels = Math.max(1, Math.round((yEnd - yStart + 1) * 0.08));
  const columns = [];
  for (let x = xStart; x <= xEnd; x += 1) {
    let count = 0;
    for (let y = yStart; y <= yEnd; y += 1) {
      if (noisyRows.has(y)) continue;
      const [r, g, b] = imagePixel(image, x, y);
      if (mesoDigitInkPixel(r, g, b)) count += 1;
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
        runs.push({ x1: xStart + start, x2: xStart + index - gap });
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) runs.push({ x1: xStart + start, x2: xStart + columns.length - 1 });

  const minDigitHeight = Math.max(8, Math.round((yEnd - yStart + 1) * 0.42));
  const minDigitWidth = Math.max(6, Math.round(image.height * 0.08));
  return runs.map(run => {
    let minX = run.x2;
    let minY = yEnd;
    let maxX = run.x1;
    let maxY = yStart;
    let found = false;
    for (let x = run.x1; x <= run.x2; x += 1) {
      for (let y = yStart; y <= yEnd; y += 1) {
        if (noisyRows.has(y)) continue;
        const [r, g, b] = imagePixel(image, x, y);
        if (mesoDigitInkPixel(r, g, b)) {
          found = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (!found) return null;
    return {
      x1: minX,
      x2: maxX,
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  })
    .filter(Boolean)
    .filter(group => group.width >= minDigitWidth && group.height >= minDigitHeight)
    .slice(0, 10);
}

function trimMesoUnitGroups(groups) {
  if (!groups.length) return groups;
  const widths = groups.map(group => group.width).sort((a, b) => a - b);
  const medianWidth = widths[Math.floor(widths.length / 2)] || 1;
  const unitGap = Math.max(18, medianWidth * 1.3);
  for (let index = 1; index < groups.length; index += 1) {
    const gap = groups[index].x1 - groups[index - 1].x2;
    if (index >= 3 && gap >= unitGap) return groups.slice(0, index);
  }
  return groups;
}

function filterMesoSeparatorGroups(groups) {
  if (groups.length < 4) return groups;
  const heights = groups.map(group => group.height).sort((a, b) => a - b);
  const widths = groups.map(group => group.width).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 1;
  const medianWidth = widths[Math.floor(widths.length / 2)] || 1;
  return groups.filter(group => {
    const narrowSeparator = groups.length > 8
      && group.width < Math.max(7, medianWidth * 0.45)
      && group.height <= medianHeight * 1.05;
    return !narrowSeparator && group.height >= medianHeight * 0.68;
  });
}

function readMesoFromCanvas(canvas) {
  if (!canvas) return { meso: null };
  const image = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const groups = filterMesoSeparatorGroups(trimMesoUnitGroups(mesoDigitGroupsFromImage(image)));
  const digits = groups.map(group => classifyDigit(
    glyphMaskFromImage(image, group, mesoInkPixel),
    [OCR_MESO_DIGIT_TEMPLATES, OCR_DIGIT_TEMPLATES],
  ));
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

async function detectMapText(canvas) {
  if (!canvas) return { text: "", supported: false };
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
    const result = await tesseract.recognize(canvas, "chi_tra+eng", {
      logger(message) {
        if (message?.status === "recognizing text" && typeof message.progress === "number") {
          setShareStatus(`小地圖 OCR 辨識中 ${Math.round(message.progress * 100)}%`);
        }
      },
      tessedit_pageseg_mode: "6",
    });
    return { text: result?.data?.text || "", supported: true };
  } catch (_error) {
    try {
      const fallback = await tesseract.recognize(canvas, "eng", {
        tessedit_pageseg_mode: "6",
      });
      return { text: fallback?.data?.text || "", supported: true };
    } catch (__error) {
      return { text: "", supported: false };
    }
  }
}

async function detectJobText(canvas) {
  if (!canvas) return { text: "", supported: false };
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
    const result = await tesseract.recognize(canvas, "chi_tra+eng", {
      logger(message) {
        if (message?.status === "recognizing text" && typeof message.progress === "number") {
          setShareStatus(`職業 OCR 辨識中 ${Math.round(message.progress * 100)}%`);
        }
      },
      tessedit_pageseg_mode: "7",
    });
    return { text: result?.data?.text || "", supported: true };
  } catch (_error) {
    try {
      const fallback = await tesseract.recognize(canvas, "eng", {
        tessedit_pageseg_mode: "7",
      });
      return { text: fallback?.data?.text || "", supported: true };
    } catch (__error) {
      return { text: "", supported: false };
    }
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
  if (expMovesBackward(snapshot)) {
    setStatus("EXP 讀值倒退，已視為 OCR 誤判並略過這筆紀錄。");
    return false;
  }
  state.snapshots.push(snapshot);
  state.latest = snapshot;
  render();
  scrollHistoryToLatest();
  return true;
}

function scrollHistoryToLatest() {
  window.requestAnimationFrame(() => {
    const wrap = document.getElementById("snapshotHistoryWrap");
    if (wrap) wrap.scrollTop = 0;
  });
}

function analysisIsRunning() {
  return Boolean(state.timer);
}

function updateAnalysisToggleButton() {
  if (!el.start) return;
  const running = analysisIsRunning();
  el.start.textContent = running ? "停止分析" : "開始分析";
  el.start.setAttribute("aria-pressed", running ? "true" : "false");
  el.start.classList.toggle("combatButton", !running);
  el.start.classList.toggle("combatButtonDanger", running);
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
    refreshShareIdentityFromCanvas(currentScreenCanvas(), true);
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
  updateAnalysisToggleButton();
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
  const mesoCandidate = findMesoRegion(sourceCanvas);
  const mesoRegion = mesoCandidate?.region || rectFor("meso", sourceCanvas.width, sourceCanvas.height);
  const currentMapRegion = mapNameRegion(sourceCanvas.width, sourceCanvas.height);
  const currentJobRegion = jobNameRegion(sourceCanvas.width, sourceCanvas.height);
  drawRegion(sourceCanvas, lvRegion, el.lvCrop);
  drawRegion(sourceCanvas, expRegion, el.expCrop);
  drawRegion(sourceCanvas, mesoRegion, el.mesoCrop);
  if (el.mapCrop) drawRegion(sourceCanvas, currentMapRegion, el.mapCrop);
  if (el.jobCrop) drawRegion(sourceCanvas, currentJobRegion, el.jobCrop);
  refreshShareIdentityFromCanvas(sourceCanvas);

  const lvRawCanvas = cropRegionCanvas(sourceCanvas, lvRegion, 8);
  const expRawCanvas = cropRegionCanvas(sourceCanvas, expRegion, 8);
  const templateLevel = readLevelFromCanvas(lvRawCanvas);
  const templateExp = readExpFromCanvas(expRawCanvas);
  const shouldRunExpOcr = templateExp.exp === null || templateExp.percent === null || !templateLevel.level;

  const [lvDetection, expDetection, mesoDetection] = await Promise.all([
    templateLevel.level ? Promise.resolve({ text: "" }) : detectTextFromCanvas(thresholdRegionCanvas(sourceCanvas, lvRegion, "lv", 8)),
    shouldRunExpOcr ? detectTextFromCanvas(el.expCrop) : Promise.resolve({ text: "" }),
    mesoCandidate ? detectMesoText(mesoOcrCanvas(el.mesoCrop)) : Promise.resolve({ text: "" }),
  ]);
  const parsedLevel = parseLevelText(lvDetection.text);
  const parsedExp = parseDetectedText(expDetection.text);
  const parsedMeso = parseDetectedText(mesoDetection.text);
  const hasExpClue = templateExp.exp !== null
    || templateExp.percent !== null
    || parsedExp.exp !== null
    || parsedExp.percent !== null;
  const levelResult = resolveLevelValue([
    { value: templateLevel.level, source: templateLevel.source || "LV 圖樣", confidence: templateLevel.confidence || 0.9 },
    inferLevelFromExpPercent(templateExp.exp, parsedExp.percent, "EXP 圖樣 + OCR% 推算", 0.86),
    inferLevelFromExpPercent(templateExp.exp, templateExp.percent, "EXP 圖樣推算", 0.72),
    inferLevelFromExpPercent(parsedExp.exp, parsedExp.percent, "OCR EXP 推算", 0.62),
    inferLevelFromExpPercent(parsedExp.exp, templateExp.percent, "OCR EXP + EXP% 圖樣推算", 0.58),
    { value: parsedLevel, source: "OCR LV", confidence: 0.54 },
    { value: parsedExp.level, source: "OCR EXP", confidence: 0.42 },
  ], hasExpClue);
  const level = levelResult.level;
  const expToNext = getExpToNext(level);
  const expResult = resolveExpPercent(
    level,
    [
      { value: templateExp.exp, source: "EXP 圖樣", priority: 0 },
      { value: parsedExp.exp, source: "OCR EXP", priority: 1 },
    ],
    [
      { value: templateExp.percent, source: "EXP% 圖樣", priority: 0 },
      { value: parsedExp.percent, source: "OCR EXP%", priority: 1 },
    ],
  );
  const exp = expResult.exp;
  const percent = expResult.percent;
  const mesoTemplateConfidence = mesoCandidate?.meso === null || mesoCandidate?.meso === undefined
    ? 0
    : Math.min(0.68, mesoCandidate.confidence || 0.5);
  const mesoResult = resolveMesoValue(mesoCandidate ? [
    { value: mesoCandidate.meso, source: `楓幣圖樣 ${mesoCandidate.label}`, confidence: mesoTemplateConfidence },
    ...normalizeMesoTextCandidates(mesoDetection.text).map(row => ({
      ...row,
      source: `${row.source} ${mesoCandidate.label}`,
    })),
    { value: parsedMeso.meso, source: `OCR 楓幣 ${mesoCandidate.label}`, confidence: parsedMeso.mesoText?.includes(",") ? 0.9 : 0.55 },
  ] : []);
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
      levelSource: levelResult.source,
      reusedLevel: levelResult.reused,
    };
  } else {
    state.pendingCalibration = null;
  }

  if (!state.ocrAvailable && state.tesseractFailed) {
    setStatus("OCR 無法載入；請稍後再試，或打包回報資料協助檢查。");
  } else if (!snapshot && expResult.reason === "mismatch") {
    setStatus(formatExpConsistencyStatus(expResult));
  } else if (!snapshot) {
    if (exp !== null && exp !== undefined) {
      setStatus(`已讀取 EXP ${formatNumber(exp)}${percent !== null && percent !== undefined ? ` · ${formatPercent(percent)}` : ""}，但尚未辨識到等級，請確認 LV 區塊或解析度設定。`);
    } else {
      setStatus("尚未辨識到 EXP 數值，請確認分享的是遊戲視窗與解析度設定。");
    }
  } else {
    const mesoText = snapshot.meso === null || snapshot.meso === undefined ? "楓幣未讀取" : `楓幣 ${formatNumber(snapshot.meso)}`;
    const mesoNote = mesoResult.reason === "outlier" ? " · 楓幣讀值離群已略過" : "";
    const mesoCorner = mesoCandidate?.label ? ` · 道具欄${mesoCandidate.label}` : "";
    const levelNote = levelResult.reused ? "（沿用上一筆）" : "";
    setStatus(`已讀取 Lv.${snapshot.level}${levelNote} · EXP ${formatNumber(snapshot.exp)} · ${mesoText}${mesoCorner}${mesoNote}`);
  }
  if (snapshot && addToTimeline) {
    addSnapshot(snapshot);
  }
  else if (snapshot) {
    state.latest = snapshot;
    render();
  }
  return snapshot;
}

async function startAnalysis() {
  if (state.timer) return;
  const ready = await ensureScreenShare();
  if (!ready) return;
  await captureFrame(true);
  if (state.timer) window.clearInterval(state.timer);
  state.timer = window.setInterval(() => {
    captureFrame(true);
  }, CAPTURE_INTERVAL_MS);
  render();
  updateAnalysisToggleButton();
}

async function toggleAnalysis() {
  if (analysisIsRunning()) {
    stopAnalysis();
    return;
  }
  await startAnalysis();
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

function cumulativeSeries(segments, field, sinceTime = null) {
  const rows = [...segments]
    .filter(segment => segment?.from?.time && segment?.to?.time)
    .filter(segment => sinceTime === null || segment.to.time >= sinceTime)
    .sort((a, b) => a.to.time - b.to.time);
  if (!rows.length) return [];
  let total = 0;
  const series = [{ time: sinceTime === null ? rows[0].from.time : sinceTime, value: 0 }];
  for (const segment of rows) {
    total += Math.max(0, Number(segment[field] || 0));
    series.push({ time: segment.to.time, value: total });
  }
  return series;
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
  const recentExpPer10 = recentExp.minutes > 0 ? recentExp.delta / recentExp.minutes * 10 : 0;
  const recentMesoPer10 = recentMeso.minutes > 0 ? recentMeso.delta / recentMeso.minutes * 10 : null;
  const expToNext = getExpToNext(lastReliable.level);
  const remainingExp = expToNext ? Math.max(0, expToNext - Number(lastReliable.exp || 0)) : null;
  return {
    elapsedMinutes: totalExp.minutes,
    expDelta: totalExp.delta,
    mesoDelta: totalMeso.minutes > 0 ? totalMeso.delta : null,
    recentExpDelta: recentExp.delta,
    recentMesoDelta: recentMeso.minutes > 0 ? recentMeso.delta : null,
    recentExpMinutes: recentExp.minutes,
    recentMesoMinutes: recentMeso.minutes,
    recentExpPer10,
    recentMesoPer10,
    expPerMin,
    mesoPerMin,
    forecast30Exp: expPerMin * 30,
    forecastHourExp: expPerMin * 60,
    forecast30Meso: mesoPerMin === null ? null : mesoPerMin * 30,
    forecastHourMeso: mesoPerMin === null ? null : mesoPerMin * 60,
    expToNext,
    remainingExp,
    ignoredExpSegments,
    ignoredMesoSegments,
    acceptedExpSegments: expSegments.length,
    acceptedMesoSegments: mesoSegments.length,
    expSeries: cumulativeSeries(expSegments, "expDelta"),
    mesoSeries: cumulativeSeries(mesoSegments, "mesoDelta"),
    recentExpSeries: cumulativeSeries(expSegments, "expDelta", recentSince),
    recentMesoSeries: cumulativeSeries(mesoSegments, "mesoDelta", recentSince),
    etaMinutes: remainingExp !== null && expPerMin > 0 ? remainingExp / expPerMin : null,
  };
}

function renderAreaSparkline(points, kind = "exp") {
  const rows = (points || [])
    .filter(row => Number.isFinite(Number(row?.time)) && Number.isFinite(Number(row?.value)))
    .map(row => ({ time: Number(row.time), value: Math.max(0, Number(row.value)) }));
  if (rows.length < 2) return "";
  const minTime = rows[0].time;
  const maxTime = rows[rows.length - 1].time;
  const maxValue = Math.max(...rows.map(row => row.value), 1);
  const width = 120;
  const height = 56;
  const padTop = 7;
  const padBottom = 5;
  const usableHeight = height - padTop - padBottom;
  const pointsText = rows.map(row => {
    const x = maxTime === minTime ? 0 : ((row.time - minTime) / (maxTime - minTime)) * width;
    const y = height - padBottom - (row.value / maxValue) * usableHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const area = `M0,${height} L${pointsText.join(" L")} L${width},${height} Z`;
  const line = `M${pointsText.join(" L")}`;
  return `
    <svg class="combatMetricGroupSparkline ${kind}Sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${area}" fill="currentColor" opacity="0.18"></path>
      <path d="${line}" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"></path>
    </svg>
  `;
}

function renderMetricCard({ title, value, unit, detail, kind = "exp" }) {
  return `
    <div class="combatMetricCard ${kind}Metric">
      <div class="combatMetricContent">
        <strong>${formatMetricNumber(value)}</strong>
        <span>${escapeHtml(title)}</span>
        <small>${escapeHtml(unit || detail ? [unit, detail].filter(Boolean).join(" · ") : "")}</small>
      </div>
    </div>
  `;
}

function renderMetricGroup(title, subtitle, kind, cards, series = []) {
  return `
    <section class="combatMetricGroup ${kind}MetricGroup">
      ${renderAreaSparkline(series, kind)}
      <div class="combatMetricGroupHeader">
        <h3>${escapeHtml(title)}</h3>
        <span>${escapeHtml(subtitle || "")}</span>
      </div>
      <div class="combatMetricGroupGrid">
        ${cards.join("")}
      </div>
    </section>
  `;
}

function renderSummaryCards(stats) {
  const expPerMin = stats?.expPerMin ?? 0;
  const mesoPerMin = stats?.mesoPerMin ?? null;
  const expSeries = stats?.recentExpSeries || [];
  const mesoSeries = stats?.recentMesoSeries || [];
  const expCards = [
    renderMetricCard({ title: "累計每分鐘", value: expPerMin, unit: "EXP / 分", detail: stats ? `${stats.acceptedExpSegments} 段有效` : "等待資料", kind: "exp" }),
    renderMetricCard({ title: "累計10分鐘", value: stats?.recentExpDelta ?? 0, unit: "EXP", detail: "最近 10 分鐘實得", kind: "exp" }),
    renderMetricCard({ title: "總累計", value: stats?.expDelta ?? 0, unit: "EXP", detail: stats ? `排除 ${stats.ignoredExpSegments} 段` : "等待資料", kind: "exp" }),
    renderMetricCard({ title: "預估30分鐘", value: stats?.forecast30Exp ?? 0, unit: "EXP", detail: "依累計均速", kind: "exp" }),
    renderMetricCard({ title: "預估每小時", value: stats?.forecastHourExp ?? 0, unit: "EXP", detail: "依累計均速", kind: "exp" }),
    renderMetricCard({ title: "預估升等", value: stats ? formatDuration(stats.etaMinutes) : "等待資料", unit: "", detail: stats?.remainingExp !== null && stats?.remainingExp !== undefined ? `剩餘 ${formatNumber(stats.remainingExp)} EXP` : "需要等級與 EXP", kind: "exp" }),
  ];
  const mesoCards = [
    renderMetricCard({ title: "累計每分鐘", value: mesoPerMin, unit: "楓幣 / 分", detail: stats ? `${stats.acceptedMesoSegments} 段有效` : "等待資料", kind: "meso" }),
    renderMetricCard({ title: "累計10分鐘", value: stats?.recentMesoDelta ?? null, unit: "楓幣", detail: "最近 10 分鐘實得", kind: "meso" }),
    renderMetricCard({ title: "總累計", value: stats?.mesoDelta ?? null, unit: "楓幣", detail: stats ? `排除 ${stats.ignoredMesoSegments} 段` : "等待資料", kind: "meso" }),
    renderMetricCard({ title: "預估30分鐘", value: stats?.forecast30Meso ?? null, unit: "楓幣", detail: "依累計均速", kind: "meso" }),
    renderMetricCard({ title: "預估每小時", value: stats?.forecastHourMeso ?? null, unit: "楓幣", detail: "依累計均速", kind: "meso" }),
  ];
  return `
    ${renderMetricGroup("EXP 效率", "最近 10 分鐘趨勢", "exp", expCards, expSeries)}
    ${renderMetricGroup("楓幣效率", "最近 10 分鐘趨勢", "meso", mesoCards, mesoSeries)}
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
      <div class="combatSnapshot expSnapshot"><b>${formatNumber(snapshot.exp)}</b><span>目前 EXP ${percent !== null ? `· ${formatPercent(percent)}` : ""}</span></div>
      <div class="combatSnapshot expSnapshot"><b>${formatNumber(remaining)}</b><span>剩餘 EXP</span></div>
      <div class="combatSnapshot mesoSnapshot"><b>${snapshot.meso === null || snapshot.meso === undefined ? "未讀取" : formatNumber(snapshot.meso)}</b><span>目前楓幣</span></div>
    </div>
    <p class="combatHint">${stats ? `已分析 ${stats.elapsedMinutes.toFixed(1)} 分鐘，累積 ${formatNumber(stats.expDelta)} EXP；已排除 ${stats.ignoredExpSegments} 段可能誤判的 EXP 區間。` : "至少需要兩筆紀錄才會開始估算效率。"}</p>
  `;
}

function renderHistory() {
  if (!state.snapshots.length) {
    return `<p class="combatEmpty">尚未有紀錄。</p>`;
  }
  const rows = [...state.snapshots].sort((a, b) => Number(b.time || 0) - Number(a.time || 0));
  return `
    <div class="combatTableWrap combatHistoryWrap" id="snapshotHistoryWrap">
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
          ${rows.map(row => `
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

function currentScreenCanvas() {
  if (!el.video?.videoWidth || !el.video?.videoHeight) return null;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = el.video.videoWidth;
  sourceCanvas.height = el.video.videoHeight;
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceCtx.drawImage(el.video, 0, 0, sourceCanvas.width, sourceCanvas.height);
  return sourceCanvas;
}

function updateShareDetectionLabels() {
  if (el.shareJobValue) el.shareJobValue.textContent = state.shareJob || "尚未偵測";
  if (el.shareMapValue) el.shareMapValue.textContent = state.shareMapName || "尚未偵測";
}

function sanitizeMapOcrText(text) {
  return normalizeOcrText(text)
    .split(/[\n\r]+/)
    .map(line => line.replace(/小地圖|大地圖|mini\s*map/gi, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cloneCanvas(sourceCanvas) {
  if (!sourceCanvas) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(sourceCanvas, 0, 0);
  return canvas;
}

async function readShareJobFromCanvas(sourceCanvas) {
  if (!sourceCanvas) {
    return { job: state.shareJob || "", rawText: "", score: 0, source: "none" };
  }
  const candidates = jobNameRegionCandidates(sourceCanvas.width, sourceCanvas.height)
    .map(candidate => ({
      ...candidate,
      visualScore: jobRegionVisualScore(sourceCanvas, candidate.region),
    }))
    .sort((a, b) => b.visualScore - a.visualScore);
  const fallbackRegion = candidates[0]?.region || jobNameRegion(sourceCanvas.width, sourceCanvas.height);
  let bestResult = {
    job: "",
    rawText: "",
    score: 0,
    source: "none",
    region: fallbackRegion,
  };

  for (const candidate of candidates.slice(0, 6)) {
    const ocrCanvas = cropRegionCanvas(sourceCanvas, candidate.region, 5);
    const detection = await detectJobText(ocrCanvas);
    const rawText = normalizeOcrText(detection.text);
    const matched = resolveJobFromText(rawText);
    const score = matched?.score || 0;
    if (score > bestResult.score || (!bestResult.rawText && rawText)) {
      bestResult = {
        job: matched?.job?.label || "",
        rawText,
        score,
        source: detection.supported ? "ocr" : "none",
        region: candidate.region,
      };
    }
    if (score >= 860) break;
  }

  if (el.jobCrop) drawRegion(sourceCanvas, bestResult.region, el.jobCrop);
  const job = bestResult.job;
  if (job) {
    state.shareJob = job;
    updateShareDetectionLabels();
  }
  return {
    job,
    rawText: bestResult.rawText,
    score: bestResult.score,
    source: bestResult.source,
  };
}

async function readShareJobFromScreen() {
  if (!state.stream) {
    await ensureScreenShare();
  }
  const sourceCanvas = currentScreenCanvas();
  return readShareJobFromCanvas(sourceCanvas);
}

async function readShareMapFromCanvas(sourceCanvas) {
  if (!sourceCanvas) {
    const cached = state.shareMapName || "";
    const cachedMatch = cached ? resolveMapFromText(cached) : null;
    return { input: cached, rawText: "", map: cachedMatch?.map || null, score: cachedMatch?.score || 0, source: "none" };
  }
  const candidates = mapNameRegionCandidates(sourceCanvas.width, sourceCanvas.height);
  let bestResult = {
    input: "",
    rawText: "",
    map: null,
    score: 0,
    source: "none",
    region: candidates[0]?.region || mapNameRegion(sourceCanvas.width, sourceCanvas.height),
  };

  for (const candidate of candidates.slice(0, 6)) {
    const ocrCanvas = cropRegionCanvas(sourceCanvas, candidate.region, 3);
    const detection = await detectMapText(ocrCanvas);
    const rawText = normalizeOcrText(detection.text);
    const input = sanitizeMapOcrText(rawText);
    const matched = resolveMapFromText(input);
    const score = matched?.score || 0;
    if (score > bestResult.score || (!bestResult.input && input)) {
      bestResult = {
        input: matched?.map?.name || input,
        rawText,
        map: matched?.map || null,
        score,
        source: detection.supported ? "ocr" : "none",
        region: candidate.region,
      };
    }
    if (score >= 72) break;
  }

  if (el.mapCrop) drawRegion(sourceCanvas, bestResult.region, el.mapCrop);
  if (bestResult.map) {
    state.shareMapName = bestResult.map.name || "";
    updateShareDetectionLabels();
  } else if (bestResult.input) {
    state.shareMapName = bestResult.input;
    updateShareDetectionLabels();
  }
  return {
    input: bestResult.input,
    rawText: bestResult.rawText,
    map: bestResult.map,
    score: bestResult.score,
    source: bestResult.source,
  };
}

async function readShareMapFromScreen() {
  if (!state.stream) {
    await ensureScreenShare();
  }
  const sourceCanvas = currentScreenCanvas();
  return readShareMapFromCanvas(sourceCanvas);
}

function refreshShareIdentityFromCanvas(sourceCanvas, force = false) {
  if (!sourceCanvas) return;
  const now = Date.now();
  const needsInitialDetection = !state.shareJob || !state.shareMapName;
  if (state.identityScanPromise || (!force && !needsInitialDetection && now - state.lastIdentityScanAt < 60000)) return;
  if (!force && now - state.lastIdentityScanAt < 25000) return;
  const snapshotCanvas = cloneCanvas(sourceCanvas);
  if (!snapshotCanvas) return;
  state.lastIdentityScanAt = now;
  state.identityScanPromise = Promise.all([
    readShareJobFromCanvas(snapshotCanvas),
    readShareMapFromCanvas(snapshotCanvas),
  ]).catch(() => null).finally(() => {
    state.identityScanPromise = null;
  });
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.fillStyle = fillStyle;
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 2) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();
}

function loadImageForCanvas(src) {
  return new Promise(resolve => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    try {
      image.src = new URL(src, window.location.href).href;
    } catch (_error) {
      image.src = src;
    }
  });
}

function drawImageContain(ctx, image, x, y, width, height) {
  if (!image) return false;
  const ratio = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  ctx.imageSmoothingEnabled = true;
  return true;
}

function drawImageCover(ctx, image, x, y, width, height) {
  if (!image) return false;
  const ratio = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  ctx.imageSmoothingEnabled = true;
  return true;
}

function shareStatText(value, suffix) {
  if (!Number.isFinite(Number(value))) return "等待資料";
  return `${formatNumber(Math.round(Number(value)))} ${suffix}`;
}

function drawShareSparkline(ctx, points, x, y, width, height, color) {
  const rows = (points || [])
    .filter(row => Number.isFinite(Number(row?.time)) && Number.isFinite(Number(row?.value)))
    .map(row => ({ time: Number(row.time), value: Math.max(0, Number(row.value)) }));
  if (rows.length < 2) return;
  const minTime = rows[0].time;
  const maxTime = rows[rows.length - 1].time;
  const maxValue = Math.max(...rows.map(row => row.value), 1);
  const mapped = rows.map(row => ({
    x: x + (maxTime === minTime ? 0 : ((row.time - minTime) / (maxTime - minTime)) * width),
    y: y + height - (row.value / maxValue) * height,
  }));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  for (const point of mapped) ctx.lineTo(point.x, point.y);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.16;
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  mapped.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();
}

async function drawShareImage(payload) {
  const canvas = el.shareCanvas;
  if (!canvas) return false;
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  const isDark = state.theme === "dark";
  const bg = isDark ? "#0f172a" : "#fffaf0";
  const panel = isDark ? "rgba(30, 41, 59, 0.94)" : "rgba(255, 255, 255, 0.92)";
  const text = isDark ? "#e5edf7" : "#243043";
  const muted = isDark ? "#9fb0c8" : "#66758d";
  const gold = "#b7791f";
  const green = "#2f8a57";
  const monsterImage = await loadImageForCanvas(payload.monster?.image || payload.map?.markImage || "./assets/items/4031456.png");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, isDark ? "#12233d" : "#fff7df");
  gradient.addColorStop(0.56, isDark ? "#10251e" : "#edf9ed");
  gradient.addColorStop(1, isDark ? "#241b14" : "#fff1cd");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);
  drawShareSparkline(ctx, payload.stats?.recentExpSeries || [], 46, 340, 520, 190, green);
  drawShareSparkline(ctx, payload.stats?.recentMesoSeries || [], 620, 340, 520, 190, gold);

  fillRoundRect(ctx, 34, 34, 1132, 562, 28, panel);
  strokeRoundRect(ctx, 34, 34, 1132, 562, 28, isDark ? "rgba(116, 143, 173, 0.45)" : "rgba(132, 156, 184, 0.45)", 3);

  ctx.save();
  roundRectPath(ctx, 578, 56, 560, 504, 26);
  ctx.clip();
  const monsterBackdrop = ctx.createLinearGradient(578, 56, 1138, 560);
  monsterBackdrop.addColorStop(0, isDark ? "rgba(20, 83, 45, 0.1)" : "rgba(236, 253, 245, 0.1)");
  monsterBackdrop.addColorStop(1, isDark ? "rgba(146, 64, 14, 0.38)" : "rgba(254, 243, 199, 0.68)");
  ctx.fillStyle = monsterBackdrop;
  ctx.fillRect(578, 56, 560, 504);
  ctx.globalAlpha = 0.9;
  const imageDrawn = drawImageCover(ctx, monsterImage, 604, 72, 508, 462);
  ctx.globalAlpha = 1;
  const fade = ctx.createLinearGradient(578, 56, 850, 56);
  fade.addColorStop(0, panel);
  fade.addColorStop(0.72, isDark ? "rgba(30, 41, 59, 0.24)" : "rgba(255, 255, 255, 0.2)");
  fade.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = fade;
  ctx.fillRect(578, 56, 300, 504);
  ctx.restore();
  if (!imageDrawn) {
    ctx.fillStyle = muted;
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Maple", 870, 260);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = muted;
  ctx.font = "900 26px system-ui, sans-serif";
  ctx.fillText("楓憶 MapleMemory · 戰鬥分析", 78, 92);
  ctx.fillStyle = text;
  ctx.font = "900 58px system-ui, sans-serif";
  ctx.fillText(`Lv.${formatNumber(payload.level)} ${payload.job || "未設定職業"}`, 78, 162);
  ctx.fillStyle = muted;
  ctx.font = "800 30px system-ui, sans-serif";
  ctx.fillText(payload.mapLabel || payload.mapName || "未偵測地圖", 78, 216);

  const metricTop = 324;
  fillRoundRect(ctx, 78, metricTop, 490, 96, 18, isDark ? "rgba(23, 55, 42, 0.5)" : "rgba(231, 248, 235, 0.62)");
  strokeRoundRect(ctx, 78, metricTop, 490, 96, 18, isDark ? "rgba(74, 222, 128, 0.24)" : "rgba(47, 138, 87, 0.2)", 2);
  fillRoundRect(ctx, 78, metricTop + 114, 490, 96, 18, isDark ? "rgba(73, 48, 22, 0.5)" : "rgba(255, 244, 217, 0.62)");
  strokeRoundRect(ctx, 78, metricTop + 114, 490, 96, 18, isDark ? "rgba(245, 158, 11, 0.24)" : "rgba(183, 121, 31, 0.2)", 2);
  ctx.fillStyle = green;
  ctx.font = "950 22px system-ui, sans-serif";
  ctx.fillText("10分鐘平均經驗收入", 112, metricTop + 32);
  ctx.fillStyle = text;
  ctx.font = "950 42px system-ui, sans-serif";
  ctx.fillText(shareStatText(payload.stats?.recentExpPer10, "EXP"), 112, metricTop + 78);
  ctx.fillStyle = gold;
  ctx.font = "950 22px system-ui, sans-serif";
  ctx.fillText("10分鐘平均楓幣收入", 112, metricTop + 146);
  ctx.fillStyle = text;
  ctx.font = "950 42px system-ui, sans-serif";
  ctx.fillText(shareStatText(payload.stats?.recentMesoPer10, "楓幣"), 112, metricTop + 192);

  ctx.fillStyle = muted;
  ctx.font = "800 20px system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleString("zh-TW", { hour12: false }), 78, 560);
  state.shareImageReady = true;
  if (el.downloadShare) el.downloadShare.disabled = false;
  return true;
}

async function generateShareImage() {
  const latest = state.latest || state.snapshots[state.snapshots.length - 1];
  const stats = computeStats();
  if (!latest || !stats) {
    setShareStatus("至少需要兩筆有效紀錄後才能生成分享圖。");
    return;
  }
  setShareStatus("正在生成分享圖。");
  if (!state.stream) await ensureScreenShare();
  const sourceCanvas = currentScreenCanvas();
  const [jobResult, mapResult] = await Promise.all([
    readShareJobFromCanvas(sourceCanvas),
    readShareMapFromCanvas(sourceCanvas),
  ]);
  const map = mapResult.map || resolveMapFromText(mapResult.input)?.map || null;
  const monster = representativeMonsterForMap(map);
  const job = jobResult.job || state.shareJob || "";
  await drawShareImage({
    level: latest.level,
    job,
    map,
    mapName: mapResult.input || "",
    mapLabel: mapDisplayName(map) || mapResult.input || "",
    monster,
    stats,
  });
  const mapText = map ? mapDisplayName(map) : (mapResult.input ? `未能對上資料庫：${mapResult.input}` : "未偵測到小地圖名稱");
  const jobText = job ? `職業 ${job}` : (jobResult.rawText ? `未能對上職業：${jobResult.rawText}` : "未偵測到職業");
  setShareStatus(`${jobText} · ${mapText}${monster ? " · 已套用地圖怪物背景" : ""}`);
}

function downloadShareImage() {
  if (!el.shareCanvas || !state.shareImageReady) {
    setShareStatus("請先生成分享圖。");
    return;
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const link = document.createElement("a");
  link.href = el.shareCanvas.toDataURL("image/png");
  link.download = `maple-combat-share-${stamp}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setShareStatus("已下載分享圖。");
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
  if (el.buildMeta) el.buildMeta.textContent = parts.join(" · ");

  el.themeToggle?.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });
  el.share?.addEventListener("click", ensureScreenShare);
  el.start?.addEventListener("click", toggleAnalysis);
  el.reset?.addEventListener("click", resetSnapshots);
  if (el.ocrResolution) {
    el.ocrResolution.value = state.ocrResolutionKey;
    el.ocrResolution.addEventListener("change", () => {
      state.ocrResolutionKey = OCR_REGION_PRESETS[el.ocrResolution.value] ? el.ocrResolution.value : OCR_REGION_AUTO;
      writeCookie(OCR_REGION_COOKIE, state.ocrResolutionKey);
      updateRegionPresetStatus();
    });
  }
  updateShareDetectionLabels();
  el.generateShare?.addEventListener("click", generateShareImage);
  el.downloadShare?.addEventListener("click", downloadShareImage);
  el.exportReport?.addEventListener("click", exportReportDataset);
  el.emailReport?.addEventListener("click", emailReportDataset);
  el.video?.addEventListener("loadedmetadata", () => {
    updateRegionPresetStatus();
    refreshShareIdentityFromCanvas(currentScreenCanvas(), true);
  });
  updateRegionPresetStatus();
  render();
  updateAnalysisToggleButton();
  setStatus(state.ocrAvailable ? "可使用瀏覽器原生 OCR。" : "會在需要時載入前端 OCR 元件。");
}

initialize();
