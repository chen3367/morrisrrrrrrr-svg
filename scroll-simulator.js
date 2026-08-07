const db = window.MS_SCROLL_SIM_DB || {};
const COOKIE_DAYS = 180;
const SAMPLE_LIMIT = 8;
const SAMPLE_ATTEMPT_DETAIL_LIMIT = 500;
const OPTIMIZE_STATE_LIMIT = 1000000;
const STAT_LABELS = {
  incSTR: "力量",
  incDEX: "敏捷",
  incINT: "智力",
  incLUK: "幸運",
  incMHP: "MaxHP",
  incMMP: "MaxMP",
  incPAD: "攻擊力",
  incMAD: "魔法攻擊力",
  incPDD: "防禦力",
  incMDD: "魔法防禦力",
  incACC: "命中",
  incEVA: "迴避",
  incSpeed: "移動速度",
  incJump: "跳躍",
  incCraft: "熟練",
  knockback: "擊退",
  attackSpeed: "攻速",
  reqLevel: "等級",
  reqJob: "職業",
  tuc: "可強化次數",
  price: "賣店價格",
};
const STAT_ORDER = ["incPAD", "incMAD", "incSTR", "incDEX", "incINT", "incLUK", "incACC", "incEVA", "incPDD", "incMDD", "incMHP", "incMMP", "incSpeed", "incJump", "incCraft"];
const WEAPON_TYPES = ["單手劍", "單手斧", "單手棍", "短刀", "短杖", "雙手劍", "雙手斧", "雙手棍", "長杖", "弓", "弩", "拳套", "指虎", "槍", "矛", "火槍"];
const ONE_HAND_WEAPON_TYPES = ["單手劍", "單手斧", "單手棍", "短刀", "短杖"];
const TWO_HAND_WEAPON_TYPES = ["雙手劍", "雙手斧", "雙手棍", "長杖", "弓", "弩", "拳套", "指虎", "槍", "矛", "火槍"];
const ARMOR_TYPES = ["帽子", "上衣", "套服", "褲裙", "手套", "鞋子", "披風", "盾牌"];
const ACCESSORY_TYPES = ["耳環", "戒指", "墜飾", "腰帶", "眼飾", "臉飾"];
const EQUIPMENT_GROUP_SUBCATEGORIES = {
  armor: ["上衣", "手套", "盾牌", "套服", "帽子", "披風", "鞋子", "褲裙"],
  weapon: ["弓", "火槍", "矛", "弩", "長杖", "指虎", "拳套", "單手斧", "單手棍", "單手劍", "短刀", "短杖", "槍", "雙手斧", "雙手棍", "雙手劍"],
  accessory: ["耳環", "戒指", "眼飾", "腰帶", "墜飾", "勳章", "臉飾"],
  other: ["裝備", "寵物裝備", "騎寵", "騎寵鞍座"],
};
const EQUIPMENT_JOB_BITS = {
  warrior: 1,
  magician: 2,
  bowman: 4,
  thief: 8,
  pirate: 16,
};
const EQUIPMENT_SCROLL_SYNONYMS = {
  上衣: ["上衣"],
  套服: ["套服", "全身盔甲", "全身鎧甲"],
  褲裙: ["褲裙", "褲子", "褲/裙", "褲、裙", "裙"],
  帽子: ["帽子", "頭盔"],
  手套: ["手套"],
  鞋子: ["鞋子"],
  披風: ["披風"],
  盾牌: ["盾牌"],
  單手劍: ["單手劍"],
  單手斧: ["單手斧"],
  單手棍: ["單手棍", "單手鈍器"],
  雙手劍: ["雙手劍"],
  雙手斧: ["雙手斧"],
  雙手棍: ["雙手棍", "雙手鈍器"],
  短刀: ["短刀", "短劍"],
  短杖: ["短杖"],
  長杖: ["長杖"],
  弓: ["弓"],
  弩: ["弩"],
  拳套: ["拳套"],
  指虎: ["指虎"],
  槍: ["槍"],
  矛: ["矛"],
  火槍: ["火槍"],
  耳環: ["耳環"],
  戒指: ["戒指", "戒子"],
  墜飾: ["墜飾", "項鍊"],
  腰帶: ["腰帶"],
  眼飾: ["眼飾", "眼鏡", "龍眼鏡"],
  臉飾: ["臉飾"],
  寵物裝備: ["寵物"],
};
const SEARCH_HISTORY_COOKIE = "ms_search_history";
const SEARCH_HISTORY_LIMIT = 20;
const SEARCH_HISTORY_MAX_LENGTH = 40;

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
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  } catch (_error) {}
}

function cookieValue(name, fallback = "") {
  const raw = readCookie(name);
  return raw === "" ? fallback : raw;
}

function cookieBool(name, fallback = false) {
  const raw = cookieValue(name);
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
}

function saveBool(name, value) {
  writeCookie(name, value ? "1" : "0");
}

function initialTheme() {
  const cookieTheme = cookieValue("ms_theme");
  if (cookieTheme === "dark" || cookieTheme === "light") return cookieTheme;
  try {
    return localStorage.getItem("ms-theme") === "dark" ? "dark" : "light";
  } catch (_error) {
    return "light";
  }
}

function normalizedSearchTerm(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, SEARCH_HISTORY_MAX_LENGTH);
}

function escapeSearchOption(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function parseSearchHistory() {
  const raw = cookieValue(SEARCH_HISTORY_COOKIE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(value => normalizedSearchTerm(value)).filter(Boolean).slice(0, SEARCH_HISTORY_LIMIT);
    }
  } catch (_error) {}
  return raw.split("\\n").map(value => normalizedSearchTerm(value)).filter(Boolean).slice(0, SEARCH_HISTORY_LIMIT);
}

function saveSearchHistory(rows) {
  const unique = [];
  rows.forEach(row => {
    const term = normalizedSearchTerm(row);
    if (term && !unique.includes(term)) unique.push(term);
  });
  writeCookie(SEARCH_HISTORY_COOKIE, JSON.stringify(unique.slice(0, SEARCH_HISTORY_LIMIT)));
}

function renderSearchHistoryOptions() {
  const list = document.getElementById("searchHistoryOptions");
  if (!list) return;
  list.innerHTML = parseSearchHistory()
    .map(term => `<option value="${escapeSearchOption(term)}"></option>`)
    .join("");
}

function rememberSearchTerm(value) {
  const term = normalizedSearchTerm(value);
  if (term.length < 2) return;
  const rows = parseSearchHistory().filter(row => row !== term);
  rows.unshift(term);
  saveSearchHistory(rows);
  renderSearchHistoryOptions();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function norm(value) {
  return String(value || "").toLowerCase().trim();
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function integerValue(value, fallback = 0) {
  return Math.max(0, Math.floor(numberValue(value, fallback)));
}

function moneyValue(value, fallback = 0) {
  const text = String(value ?? "").replace(/[^\d]/g, "");
  if (!text) return fallback;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function moneyDigits(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  return digits || "0";
}

function formatMoneyInput(value) {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return "";
  const digits = moneyDigits(raw);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatChineseMeso(value) {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return "";
  const number = BigInt(moneyDigits(raw));
  const yi = number / 100000000n;
  const wan = (number % 100000000n) / 10000n;
  const rest = number % 10000n;
  const parts = [];
  if (yi) parts.push(`${yi}億`);
  if (wan) parts.push(`${wan}萬`);
  if (rest || !parts.length) parts.push(String(rest));
  return `${parts.join("")}楓幣`;
}

function setPriceHint(hint, value) {
  if (hint) hint.textContent = formatChineseMeso(value);
}

function formatPriceInput(input, hint) {
  if (!input) return 0;
  const before = input.value;
  const selection = input.selectionStart ?? before.length;
  const digitsBeforeCursor = before.slice(0, selection).replace(/[^\d]/g, "").length;
  const formatted = formatMoneyInput(before);
  input.value = formatted;
  if (document.activeElement === input) {
    let seenDigits = 0;
    let nextCursor = formatted.length;
    for (let index = 0; index < formatted.length; index += 1) {
      if (/\d/.test(formatted[index])) seenDigits += 1;
      if (seenDigits >= digitsBeforeCursor) {
        nextCursor = index + 1;
        break;
      }
    }
    try {
      input.setSelectionRange(nextCursor, nextCursor);
    } catch (_error) {}
  }
  setPriceHint(hint, formatted);
  return moneyValue(formatted, 0);
}

function numericLevelText(value) {
  return String(value || "").replace(/[^\d]/g, "").slice(0, 3);
}

function levelFilterValue(value) {
  const number = Number(numericLevelText(value));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : escapeHtml(value);
}

function formatSigned(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return escapeHtml(value);
  return `${number > 0 ? "+" : ""}${number.toLocaleString()}`;
}

function formatMeso(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number).toLocaleString()} 楓幣` : "無法估算";
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0%";
  return `${(number * 100).toFixed(number >= 0.1 ? 2 : 4).replace(/\.?0+$/, "")}%`;
}

function formatStatEffects(effects) {
  const rows = Object.entries(effects || {})
    .sort((a, b) => {
      const ai = STAT_ORDER.indexOf(a[0]);
      const bi = STAT_ORDER.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a[0].localeCompare(b[0]);
    })
    .map(([key, value]) => `${STAT_LABELS[key] || key}${formatSigned(value)}`);
  return rows.length ? rows.join("、") : "無效果";
}

function assetImage(src, alt, fallback, className) {
  if (src) {
    return `<img class="${className} assetImage" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }
  return `<div class="${className}">${escapeHtml(fallback)}</div>`;
}

function formatReqJob(value) {
  const mask = Number(value || 0);
  if (!mask) return "全職";
  const rows = [];
  if (mask & 1) rows.push("劍士");
  if (mask & 2) rows.push("法師");
  if (mask & 4) rows.push("弓箭手");
  if (mask & 8) rows.push("盜賊");
  if (mask & 16) rows.push("海盜");
  return rows.length ? rows.join(" / ") : `職業 ${mask}`;
}

function scrollMatchText(scroll) {
  return norm(`${scroll?.target || ""} ${scroll?.name || ""} ${scroll?.desc || ""}`)
    .replace(/短劍/g, "短刀")
    .replace(/頭盔/g, "帽子")
    .replace(/全身盔甲|全身鎧甲/g, "套服")
    .replace(/褲\/裙|褲、裙|褲子/g, "褲裙")
    .replace(/戒子/g, "戒指");
}

function scrollMatchesEquipment(scroll, equipment) {
  if (!scroll || !equipment) return true;
  const type = equipment.subcategory || "";
  const text = scrollMatchText(scroll);
  const hasToken = token => {
    const normalized = norm(token);
    if (type === "槍" && normalized === "槍" && text.includes("火槍")) return false;
    return text.includes(normalized);
  };
  if (!type) return true;
  if (equipment.name && text.includes(norm(equipment.name))) return true;
  if (text.includes("寵物")) return type === "寵物裝備";
  const mentionsOneHand = text.includes("單手武器");
  const mentionsTwoHand = text.includes("雙手武器");
  if (mentionsOneHand && ONE_HAND_WEAPON_TYPES.includes(type)) return true;
  if (mentionsTwoHand && TWO_HAND_WEAPON_TYPES.includes(type)) return true;
  if (text.includes("武器") && !mentionsOneHand && !mentionsTwoHand && WEAPON_TYPES.includes(type)) return true;
  if (text.includes("防具") && ARMOR_TYPES.includes(type)) return true;
  if ((text.includes("飾品") || text.includes("裝飾品")) && ACCESSORY_TYPES.includes(type)) return true;
  return (EQUIPMENT_SCROLL_SYNONYMS[type] || [type]).some(hasToken);
}

function maxSlots() {
  return Math.max(0, Number(selectedEquipment()?.stats?.tuc || 0));
}

function strategySlotCount(excludeIndex = -1) {
  return state.strategy.reduce((sum, row, index) => {
    if (index === excludeIndex) return sum;
    return sum + Math.max(0, integerValue(row.count, 0));
  }, 0);
}

function availableSlots(excludeIndex = -1) {
  return Math.max(0, maxSlots() - strategySlotCount(excludeIndex));
}

function clampInteger(value, min, max, fallback) {
  const number = integerValue(value, fallback);
  return Math.max(min, Math.min(max, number));
}

function statBaseValue(equipment, key) {
  const range = equipment?.statRanges?.[key];
  const value = range && range.base !== undefined ? range.base : equipment?.stats?.[key];
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function statInputRange(equipment, key) {
  const range = equipment?.statRanges?.[key];
  const base = statBaseValue(equipment, key);
  const min = Number(range?.min);
  const max = Number(range?.max);
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return {
      base,
      min: Math.min(min, max),
      max: Math.max(min, max),
      floating: Math.min(min, max) !== Math.max(min, max),
    };
  }
  return { base, min: base, max: base, floating: false };
}

function initialStatKeys(equipment) {
  if (!equipment) return [];
  const ranges = equipment.statRanges || {};
  const stats = equipment.stats || {};
  return STAT_ORDER.filter(key => ranges[key] || Number(stats[key]));
}

function defaultInitialStats(equipment) {
  const rows = {};
  initialStatKeys(equipment).forEach(key => {
    rows[key] = statInputRange(equipment, key).base;
  });
  return rows;
}

function resetInitialStatsForEquipment() {
  state.initialStats = defaultInitialStats(selectedEquipment());
}

function configuredInitialStats(equipment = selectedEquipment()) {
  const rows = defaultInitialStats(equipment);
  Object.keys(rows).forEach(key => {
    const range = statInputRange(equipment, key);
    rows[key] = clampInteger(state.initialStats[key], range.min, range.max, range.base);
  });
  return rows;
}

const state = {
  equipmentQuery: "",
  equipmentGroup: "",
  equipmentPart: "",
  equipmentJob: "",
  equipmentLevelMin: "",
  equipmentLevelMax: "",
  equipmentSourcedOnly: false,
  scrollQuery: "",
  scrollSuccess: "",
  scrollSourcedOnly: false,
  selectedEquipmentId: null,
  selectedScrollId: null,
  initialStats: {},
  strategy: [],
  equipmentPrice: cookieValue("ms_scroll_sim_equipment_price", "0"),
  trialCount: cookieValue("ms_scroll_sim_trials", "3000"),
  showIds: cookieBool("ms_show_ids"),
  theme: initialTheme(),
  settingsOpen: cookieBool("ms_settings_open"),
};

const els = {
  meta: document.getElementById("buildMeta"),
  count: document.getElementById("resultCount"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsToggle: document.getElementById("settingsToggle"),
  clearFilters: document.getElementById("clearFilters"),
  themeToggle: document.getElementById("themeToggle"),
  idToggle: document.getElementById("idToggle"),
  equipmentSearch: document.getElementById("equipmentSearch"),
  equipmentGroup: document.getElementById("equipmentGroupFilter"),
  equipmentPart: document.getElementById("equipmentPartFilter"),
  equipmentJob: document.getElementById("equipmentJobFilter"),
  equipmentLevelMin: document.getElementById("itemLevelMin"),
  equipmentLevelMax: document.getElementById("itemLevelMax"),
  equipmentSourcedOnly: document.getElementById("equipmentSourcedOnly"),
  equipmentSelect: document.getElementById("equipmentSelect"),
  equipmentPicker: document.getElementById("equipmentPicker"),
  initialStatsPanel: document.getElementById("initialStatsPanel"),
  equipmentPrice: document.getElementById("equipmentPrice"),
  equipmentPriceHint: document.getElementById("equipmentPriceHint"),
  scrollSearch: document.getElementById("scrollSearch"),
  scrollSuccess: document.getElementById("scrollSuccessFilter"),
  scrollSourcedOnly: document.getElementById("scrollSourcedOnly"),
  scrollSelect: document.getElementById("scrollSelect"),
  scrollPicker: document.getElementById("scrollPicker"),
  scrollCount: document.getElementById("scrollCount"),
  scrollTarget: document.getElementById("scrollTarget"),
  scrollPrice: document.getElementById("scrollPrice"),
  scrollPriceHint: document.getElementById("scrollPriceHint"),
  addScroll: document.getElementById("addScroll"),
  strategyList: document.getElementById("strategyList"),
  trialCount: document.getElementById("trialCount"),
  runSimulation: document.getElementById("runSimulation"),
  detail: document.getElementById("simulatorDetail"),
};

const equipmentById = new Map((db.equipment || []).map(item => [Number(item.id), item]));
const scrollById = new Map((db.scrolls || []).map(item => [Number(item.id), item]));

function applyTheme() {
  const isDark = state.theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  if (!els.themeToggle) return;
  const themeLabel = isDark ? "切換為白底" : "切換為黑底";
  els.themeToggle.setAttribute("aria-pressed", String(isDark));
  els.themeToggle.setAttribute("aria-label", themeLabel);
  els.themeToggle.textContent = isDark ? "☀" : "☾";
  els.themeToggle.title = themeLabel;
}

function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  applyTheme();
  writeCookie("ms_theme", state.theme);
  try {
    localStorage.setItem("ms-theme", state.theme);
  } catch (_error) {}
}

function applySettingsPanel() {
  if (!els.settingsToggle || !els.settingsPanel) return;
  els.settingsPanel.hidden = !state.settingsOpen;
  els.settingsToggle.setAttribute("aria-expanded", String(state.settingsOpen));
}

function renderBuildMeta() {
  const meta = db.metadata || {};
  const parts = [];
  if (meta.gameVersion) parts.push(`遊戲版本 ${meta.gameVersion}`);
  if (meta.generatedAtText) parts.push(`更新 ${meta.generatedAtText}`);
  if (els.meta) els.meta.textContent = parts.join(" · ");
}

function equipmentPartOptions() {
  const allParts = [...new Set((db.equipment || []).map(item => item.subcategory).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "zh-Hant"));
  const groupRows = EQUIPMENT_GROUP_SUBCATEGORIES[state.equipmentGroup] || [];
  return groupRows.length ? allParts.filter(part => groupRows.includes(part)) : allParts;
}

function equipmentMatchesGroup(item) {
  if (!state.equipmentGroup) return true;
  return (EQUIPMENT_GROUP_SUBCATEGORIES[state.equipmentGroup] || []).includes(item.subcategory || "");
}

function equipmentMatchesJob(item) {
  if (!state.equipmentJob) return true;
  const bit = EQUIPMENT_JOB_BITS[state.equipmentJob];
  if (!bit) return true;
  const rawMask = item.stats?.reqJob;
  if (rawMask === null || rawMask === undefined || rawMask === "") return false;
  const mask = Number(rawMask);
  if (!Number.isFinite(mask)) return false;
  if (mask <= 0) return true;
  return (mask & bit) === bit;
}

function equipmentMatchesLevel(item) {
  const minLevel = levelFilterValue(state.equipmentLevelMin);
  const maxLevel = levelFilterValue(state.equipmentLevelMax);
  if (minLevel === null && maxLevel === null) return true;
  const rawLevel = item.stats?.reqLevel;
  const level = Number(rawLevel);
  if (!Number.isFinite(level)) return false;
  if (minLevel !== null && level < minLevel) return false;
  if (maxLevel !== null && level > maxLevel) return false;
  return true;
}

function filteredEquipment() {
  const query = norm(state.equipmentQuery);
  return (db.equipment || []).filter(item => {
    if (state.equipmentSourcedOnly && !item.hasSource) return false;
    if (state.equipmentPart && item.subcategory !== state.equipmentPart) return false;
    if (!equipmentMatchesGroup(item)) return false;
    if (!equipmentMatchesJob(item)) return false;
    if (!equipmentMatchesLevel(item)) return false;
    if (query && !norm(item.search || item.name).includes(query)) return false;
    return true;
  });
}

function baseCompatibleScrolls() {
  const equipment = selectedEquipment();
  if (!equipment) return [];
  const selectedIds = new Set(state.strategy.map(row => Number(row.scrollId)));
  return (db.scrolls || []).filter(item => (
    !selectedIds.has(Number(item.id))
      && (!state.scrollSourcedOnly || item.hasSource)
      && scrollMatchesEquipment(item, equipment)
  ));
}

function scrollSuccessOptions() {
  return [...new Set(baseCompatibleScrolls().map(item => Number(item.successRate)).filter(Number.isFinite))]
    .sort((a, b) => b - a);
}

function filteredScrolls() {
  const query = norm(state.scrollQuery);
  const success = Number(state.scrollSuccess);
  return baseCompatibleScrolls().filter(item => {
    if (Number.isFinite(success) && state.scrollSuccess !== "" && Number(item.successRate) !== success) return false;
    if (query && !norm(item.search || item.name).includes(query)) return false;
    return true;
  });
}

function optionText(item, extra = "") {
  return `${item.name}${extra ? ` · ${extra}` : ""}${state.showIds ? ` · ${item.id}` : ""}`;
}

function renderPickerEmpty(label) {
  return `<div class="simPickerEmpty">${escapeHtml(label)}</div>`;
}

function renderEquipmentPickerRow(item) {
  const selected = Number(item.id) === Number(state.selectedEquipmentId);
  const level = item.stats?.reqLevel ? `Lv.${item.stats.reqLevel}` : "無等級限制";
  const slots = `${formatNumber(item.stats?.tuc || 0)} 次`;
  return `
    <button class="simPickerRow${selected ? " active" : ""}" type="button" role="option" aria-selected="${selected}" data-id="${escapeHtml(item.id)}">
      ${itemIcon(item, "simPickerIcon")}
      <span class="simPickerText">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.subcategory || "裝備")} · ${escapeHtml(level)}${state.showIds ? ` · ID ${escapeHtml(item.id)}` : ""}</span>
      </span>
      <span class="simPickerBadge">${escapeHtml(slots)}</span>
    </button>
  `;
}

function renderScrollPickerRow(item) {
  const selected = Number(item.id) === Number(state.selectedScrollId);
  const destroy = item.destroyRate ? ` · 破壞 ${item.destroyRate}%` : "";
  return `
    <button class="simPickerRow${selected ? " active" : ""}" type="button" role="option" aria-selected="${selected}" data-id="${escapeHtml(item.id)}">
      ${itemIcon(item, "simPickerIcon")}
      <span class="simPickerText">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.successRate)}%${escapeHtml(destroy)} · ${escapeHtml(formatStatEffects(item.effects))}${state.showIds ? ` · ID ${escapeHtml(item.id)}` : ""}</span>
      </span>
    </button>
  `;
}

function renderInitialStatsPanel() {
  if (!els.initialStatsPanel) return;
  const equipment = selectedEquipment();
  const keys = initialStatKeys(equipment);
  if (!equipment || !keys.length) {
    els.initialStatsPanel.innerHTML = "";
    return;
  }
  const ranges = equipment.statRanges || {};
  const hasFloating = keys.some(key => statInputRange(equipment, key).floating);
  const sourceText = (equipment.statRangeSources || []).join("、");
  els.initialStatsPanel.innerHTML = `
    <div class="initialStatsHeader">
      <div>
        <strong>初始屬性</strong>
        <span>${hasFloating ? `可在${sourceText || "裝備"}浮動範圍內調整` : "此裝備沒有可調整浮動範圍"}</span>
      </div>
      <button id="resetInitialStats" class="iconMiniButton" type="button" title="重置初始屬性">↺</button>
    </div>
    <div class="initialStatsGrid">
      ${keys.map(key => {
        const range = statInputRange(equipment, key);
        const value = configuredInitialStats(equipment)[key] ?? range.base;
        const disabled = !range.floating;
        return `
          <label class="initialStatField">
            <span>${escapeHtml(STAT_LABELS[key] || key)}</span>
            <input class="initialStatInput" data-key="${escapeHtml(key)}" type="number" min="${escapeHtml(range.min)}" max="${escapeHtml(range.max)}" step="1" value="${escapeHtml(value)}"${disabled ? " disabled" : ""} />
            <small>${range.floating ? `${escapeHtml(range.min)} ~ ${escapeHtml(range.max)}` : "固定"}</small>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderEquipmentOptions() {
  const rows = filteredEquipment().slice(0, 350);
  const previousEquipmentId = state.selectedEquipmentId;
  if (!state.selectedEquipmentId && rows.length) state.selectedEquipmentId = Number(rows[0].id);
  if (!rows.some(item => Number(item.id) === Number(state.selectedEquipmentId)) && rows.length) {
    state.selectedEquipmentId = Number(rows[0].id);
  }
  if (!rows.length) state.selectedEquipmentId = null;
  if (Number(previousEquipmentId) !== Number(state.selectedEquipmentId)) resetInitialStatsForEquipment();
  els.equipmentSelect.innerHTML = rows.map(item => {
    const level = item.stats?.reqLevel ? `Lv.${item.stats.reqLevel}` : "無等級限制";
    return `<option value="${escapeHtml(item.id)}"${Number(item.id) === Number(state.selectedEquipmentId) ? " selected" : ""}>${escapeHtml(optionText(item, `${item.subcategory || "裝備"} · ${level} · ${item.stats?.tuc || 0} 次`))}</option>`;
  }).join("");
  if (els.equipmentPicker) {
    els.equipmentPicker.innerHTML = rows.length
      ? rows.map(renderEquipmentPickerRow).join("")
      : renderPickerEmpty("找不到符合條件的裝備");
  }
  renderInitialStatsPanel();
}

function renderScrollOptions() {
  const rows = filteredScrolls().slice(0, 400);
  if (!state.selectedScrollId && rows.length) state.selectedScrollId = Number(rows[0].id);
  if (!rows.some(item => Number(item.id) === Number(state.selectedScrollId)) && rows.length) {
    state.selectedScrollId = Number(rows[0].id);
  }
  if (!rows.length) state.selectedScrollId = null;
  els.scrollSelect.innerHTML = rows.map(item => {
    const meta = `${item.successRate}%${item.destroyRate ? ` / 破壞${item.destroyRate}%` : ""} · ${formatStatEffects(item.effects)}`;
    return `<option value="${escapeHtml(item.id)}"${Number(item.id) === Number(state.selectedScrollId) ? " selected" : ""}>${escapeHtml(optionText(item, meta))}</option>`;
  }).join("");
  if (els.scrollPicker) {
    els.scrollPicker.innerHTML = rows.length
      ? rows.map(renderScrollPickerRow).join("")
      : renderPickerEmpty("沒有可用卷軸");
  }
  updateAddButton();
}

function renderEquipmentFilterOptions() {
  if (!els.equipmentPart) return;
  const parts = equipmentPartOptions();
  if (state.equipmentPart && !parts.includes(state.equipmentPart)) state.equipmentPart = "";
  els.equipmentPart.innerHTML = `<option value="">全部部位</option>${parts
    .map(part => `<option value="${escapeHtml(part)}"${part === state.equipmentPart ? " selected" : ""}>${escapeHtml(part)}</option>`)
    .join("")}`;
  if (els.equipmentGroup) els.equipmentGroup.value = state.equipmentGroup;
  if (els.equipmentJob) els.equipmentJob.value = state.equipmentJob;
  if (els.equipmentLevelMin && document.activeElement !== els.equipmentLevelMin) els.equipmentLevelMin.value = state.equipmentLevelMin;
  if (els.equipmentLevelMax && document.activeElement !== els.equipmentLevelMax) els.equipmentLevelMax.value = state.equipmentLevelMax;
  if (els.equipmentSourcedOnly) els.equipmentSourcedOnly.checked = state.equipmentSourcedOnly;
}

function renderScrollFilterOptions() {
  if (els.scrollSuccess) {
    const rates = scrollSuccessOptions();
    if (state.scrollSuccess !== "" && !rates.includes(Number(state.scrollSuccess))) state.scrollSuccess = "";
    els.scrollSuccess.innerHTML = `<option value="">全部成功率</option>${rates
      .map(rate => `<option value="${escapeHtml(rate)}"${String(rate) === String(state.scrollSuccess) ? " selected" : ""}>${escapeHtml(rate)}%</option>`)
      .join("")}`;
  }
  if (els.scrollSourcedOnly) els.scrollSourcedOnly.checked = state.scrollSourcedOnly;
}

function selectedEquipment() {
  return equipmentById.get(Number(state.selectedEquipmentId)) || null;
}

function selectedScroll() {
  return scrollById.get(Number(state.selectedScrollId)) || null;
}

function normalizeStrategyForEquipment() {
  const equipment = selectedEquipment();
  const slots = maxSlots();
  const seen = new Set();
  let used = 0;
  const normalized = [];
  for (const row of state.strategy) {
    const scroll = scrollById.get(Number(row.scrollId));
    if (!scroll || seen.has(Number(row.scrollId)) || !scrollMatchesEquipment(scroll, equipment) || used >= slots) continue;
    const count = clampInteger(row.count, 1, slots - used, 1);
    const target = clampInteger(row.target ?? Math.min(1, count), 0, count, Math.min(1, count));
    normalized.push({
      scrollId: Number(row.scrollId),
      count,
      target,
      price: integerValue(row.price, 0),
    });
    seen.add(Number(row.scrollId));
    used += count;
  }
  state.strategy = normalized;
}

function expandedAttempts() {
  const attempts = [];
  for (const [rowIndex, row] of state.strategy.entries()) {
    const scroll = scrollById.get(Number(row.scrollId));
    if (!scroll) continue;
    const count = Math.max(0, Number(row.count || 0));
    for (let i = 0; i < count; i += 1) {
      attempts.push({ scroll, rowIndex, price: Math.max(0, Number(row.price || 0)) });
    }
  }
  return attempts;
}

function buildStrategyPlan() {
  const rows = [];
  for (const [rowIndex, row] of state.strategy.entries()) {
    const scroll = scrollById.get(Number(row.scrollId));
    if (!scroll) continue;
    const count = Math.max(0, integerValue(row.count, 0));
    if (!count) continue;
    rows.push({
      rowIndex,
      scroll,
      count,
      target: clampInteger(row.target ?? 0, 0, count, 0),
      price: Math.max(0, moneyValue(row.price, 0)),
    });
  }
  return {
    rows,
    targets: rows.map(row => row.target),
    initialRemaining: rows.map(row => row.count),
    totalCount: rows.reduce((sum, row) => sum + row.count, 0),
  };
}

function addToMap(map, key, value) {
  map.set(key, (map.get(key) || 0) + value);
}

function successKey(counts) {
  return counts.map(value => Math.max(0, integerValue(value, 0))).join("|");
}

function parseSuccessKey(key) {
  if (!key) return [];
  return String(key).split("|").map(value => integerValue(value, 0));
}

function targetVector() {
  return state.strategy.map(row => clampInteger(row.target ?? 0, 0, integerValue(row.count, 0), 0));
}

function isTargetMet(counts, targets) {
  return targets.every((target, index) => (counts[index] || 0) >= target);
}

function formatSuccessCounts(counts, compact = false) {
  if (!state.strategy.length) return "0";
  return state.strategy.map((row, index) => {
    const scroll = scrollById.get(Number(row.scrollId));
    const name = scroll?.name || "卷軸";
    return `${name} ${formatNumber(counts[index] || 0)}`;
  }).join(compact ? " / " : "、");
}

function formatTargetSummary(targets) {
  const rows = state.strategy.map((row, index) => {
    const scroll = scrollById.get(Number(row.scrollId));
    return `${scroll?.name || "卷軸"} 過 ${formatNumber(targets[index] || 0)} / ${formatNumber(row.count || 0)}`;
  });
  return rows.join(" · ");
}

function planStateKey(successes, remaining) {
  return `${successKey(successes)};${remaining.map(value => Math.max(0, integerValue(value, 0))).join("|")}`;
}

function isPlanTargetMet(successes, plan) {
  return plan.targets.every((target, index) => (successes[index] || 0) >= target);
}

function isPlanImpossible(successes, remaining, plan) {
  return plan.targets.some((target, index) => (successes[index] || 0) + (remaining[index] || 0) < target);
}

function nextPlanState(successes, remaining, actionIndex, succeeded) {
  const nextSuccesses = successes.slice();
  const nextRemaining = remaining.slice();
  nextRemaining[actionIndex] = Math.max(0, (nextRemaining[actionIndex] || 0) - 1);
  if (succeeded) nextSuccesses[actionIndex] = (nextSuccesses[actionIndex] || 0) + 1;
  return { successes: nextSuccesses, remaining: nextRemaining };
}

function estimatePlanStateCount(plan) {
  return plan.rows.reduce((product, row) => product * Math.max(1, (row.count + 1) * (Math.min(row.target, row.count) + 1)), 1);
}

function evaluateAdjustedPlan(equipmentPrice, plan, lambda) {
  const memo = new Map();
  const actions = new Map();
  function solve(successes, remaining) {
    if (isPlanTargetMet(successes, plan)) return -lambda;
    if (isPlanImpossible(successes, remaining, plan)) return 0;
    const key = planStateKey(successes, remaining);
    if (memo.has(key)) return memo.get(key);
    let best = Infinity;
    let bestAction = -1;
    for (let actionIndex = 0; actionIndex < plan.rows.length; actionIndex += 1) {
      if ((remaining[actionIndex] || 0) <= 0) continue;
      const row = plan.rows[actionIndex];
      const p = Math.max(0, Math.min(1, Number(row.scroll.successRate || 0) / 100));
      const destroyOnFail = Math.max(0, Math.min(1, Number(row.scroll.destroyRate || 0) / 100));
      const successState = nextPlanState(successes, remaining, actionIndex, true);
      const failState = nextPlanState(successes, remaining, actionIndex, false);
      const value = row.price
        + p * solve(successState.successes, successState.remaining)
        + (1 - p) * (1 - destroyOnFail) * solve(failState.successes, failState.remaining);
      if (
        value < best - 1e-9
        || (Math.abs(value - best) <= 1e-9 && row.price < (plan.rows[bestAction]?.price ?? Infinity))
      ) {
        best = value;
        bestAction = actionIndex;
      }
    }
    if (bestAction < 0) best = 0;
    memo.set(key, best);
    if (bestAction >= 0) actions.set(key, bestAction);
    return best;
  }
  const initialSuccesses = Array.from({ length: plan.rows.length }, () => 0);
  return {
    value: equipmentPrice + solve(initialSuccesses, plan.initialRemaining),
    actions,
  };
}

function combineOutcomeMap(target, source, weight) {
  source.forEach((value, key) => addToMap(target, key, value * weight));
}

function evaluatePolicyOutcome(equipmentPrice, plan, policy) {
  const memo = new Map();
  function solve(successes, remaining) {
    if (isPlanTargetMet(successes, plan)) {
      return {
        cost: 0,
        successProb: 1,
        stoppedProb: 0,
        destroyedProb: 0,
        successMap: new Map([[successKey(successes), 1]]),
        stoppedMap: new Map(),
        destroyedMap: new Map(),
      };
    }
    if (isPlanImpossible(successes, remaining, plan)) {
      return {
        cost: 0,
        successProb: 0,
        stoppedProb: 1,
        destroyedProb: 0,
        successMap: new Map(),
        stoppedMap: new Map([[successKey(successes), 1]]),
        destroyedMap: new Map(),
      };
    }
    const key = planStateKey(successes, remaining);
    if (memo.has(key)) return memo.get(key);
    const actionIndex = policy.actions.get(key);
    if (actionIndex === undefined || (remaining[actionIndex] || 0) <= 0) {
      const fallback = {
        cost: 0,
        successProb: 0,
        stoppedProb: 1,
        destroyedProb: 0,
        successMap: new Map(),
        stoppedMap: new Map([[successKey(successes), 1]]),
        destroyedMap: new Map(),
      };
      memo.set(key, fallback);
      return fallback;
    }
    const row = plan.rows[actionIndex];
    const p = Math.max(0, Math.min(1, Number(row.scroll.successRate || 0) / 100));
    const destroyOnFail = Math.max(0, Math.min(1, Number(row.scroll.destroyRate || 0) / 100));
    const successState = nextPlanState(successes, remaining, actionIndex, true);
    const failState = nextPlanState(successes, remaining, actionIndex, false);
    const success = solve(successState.successes, successState.remaining);
    const fail = solve(failState.successes, failState.remaining);
    const result = {
      cost: row.price + p * success.cost + (1 - p) * (1 - destroyOnFail) * fail.cost,
      successProb: p * success.successProb + (1 - p) * (1 - destroyOnFail) * fail.successProb,
      stoppedProb: p * success.stoppedProb + (1 - p) * (1 - destroyOnFail) * fail.stoppedProb,
      destroyedProb: (1 - p) * destroyOnFail + p * success.destroyedProb + (1 - p) * (1 - destroyOnFail) * fail.destroyedProb,
      successMap: new Map(),
      stoppedMap: new Map(),
      destroyedMap: new Map([[successKey(successes), (1 - p) * destroyOnFail]]),
    };
    combineOutcomeMap(result.successMap, success.successMap, p);
    combineOutcomeMap(result.successMap, fail.successMap, (1 - p) * (1 - destroyOnFail));
    combineOutcomeMap(result.stoppedMap, success.stoppedMap, p);
    combineOutcomeMap(result.stoppedMap, fail.stoppedMap, (1 - p) * (1 - destroyOnFail));
    combineOutcomeMap(result.destroyedMap, success.destroyedMap, p);
    combineOutcomeMap(result.destroyedMap, fail.destroyedMap, (1 - p) * (1 - destroyOnFail));
    memo.set(key, result);
    return result;
  }
  const initialSuccesses = Array.from({ length: plan.rows.length }, () => 0);
  const outcome = solve(initialSuccesses, plan.initialRemaining);
  const expectedCost = equipmentPrice + outcome.cost;
  const allKeys = new Set([...outcome.successMap.keys(), ...outcome.stoppedMap.keys(), ...outcome.destroyedMap.keys()]);
  const distribution = [...allKeys].map(key => {
    const counts = parseSuccessKey(key);
    const alive = outcome.successMap.get(key) || 0;
    const stopped = outcome.stoppedMap.get(key) || 0;
    const destroyed = outcome.destroyedMap.get(key) || 0;
    return {
      key,
      counts,
      label: formatSuccessCounts(counts),
      alive,
      stopped,
      destroyed,
      targetAlive: isPlanTargetMet(counts, plan) ? alive : 0,
    };
  }).sort((a, b) => {
    const totalA = a.counts.reduce((sum, value) => sum + value, 0);
    const totalB = b.counts.reduce((sum, value) => sum + value, 0);
    return totalA - totalB || a.label.localeCompare(b.label);
  });
  return {
    destroyedProb: outcome.destroyedProb,
    stoppedProb: outcome.stoppedProb,
    targetProbability: outcome.successProb,
    expectedCost,
    expectedCostPerTarget: outcome.successProb > 0 ? expectedCost / outcome.successProb : Infinity,
    distribution,
  };
}

function buildFallbackPolicy(plan) {
  const actions = new Map();
  function visit(successes, remaining) {
    if (isPlanTargetMet(successes, plan) || isPlanImpossible(successes, remaining, plan)) return;
    const key = planStateKey(successes, remaining);
    if (actions.has(key)) return;
    const actionIndex = remaining.findIndex(value => value > 0);
    if (actionIndex < 0) return;
    actions.set(key, actionIndex);
    visit(nextPlanState(successes, remaining, actionIndex, true).successes, nextPlanState(successes, remaining, actionIndex, true).remaining);
    visit(nextPlanState(successes, remaining, actionIndex, false).successes, nextPlanState(successes, remaining, actionIndex, false).remaining);
  }
  visit(Array.from({ length: plan.rows.length }, () => 0), plan.initialRemaining);
  return { actions, fallback: true };
}

function optimizeStrategyPlan(equipmentPrice, plan) {
  if (!plan.rows.length) {
    const policy = { actions: new Map(), fallback: false };
    return { policy, exact: evaluatePolicyOutcome(equipmentPrice, plan, policy), paths: [], stateEstimate: 1 };
  }
  const stateEstimate = estimatePlanStateCount(plan);
  let policy = null;
  let warning = "";
  if (stateEstimate > OPTIMIZE_STATE_LIMIT) {
    policy = buildFallbackPolicy(plan);
    warning = "卷軸組合狀態過多，已使用目前策略順序搭配停損規則計算。";
  } else {
    let low = 0;
    let high = Math.max(1, equipmentPrice + plan.rows.reduce((sum, row) => sum + row.price * row.count, 0));
    let adjusted = evaluateAdjustedPlan(equipmentPrice, plan, high);
    let guard = 0;
    while (adjusted.value > 0 && high < 1e15 && guard < 60) {
      high *= 2;
      adjusted = evaluateAdjustedPlan(equipmentPrice, plan, high);
      guard += 1;
    }
    for (let iteration = 0; iteration < 54; iteration += 1) {
      const mid = (low + high) / 2;
      const result = evaluateAdjustedPlan(equipmentPrice, plan, mid);
      if (result.value > 0) low = mid;
      else high = mid;
    }
    const finalAdjusted = evaluateAdjustedPlan(equipmentPrice, plan, high);
    policy = { actions: finalAdjusted.actions, fallback: false };
  }
  const exact = evaluatePolicyOutcome(equipmentPrice, plan, policy);
  return { policy, exact, paths: policyPreviewPaths(plan, policy), stateEstimate, warning };
}

function policyPreviewPaths(plan, policy) {
  function trace(mode) {
    const successes = Array.from({ length: plan.rows.length }, () => 0);
    const remaining = plan.initialRemaining.slice();
    const steps = [];
    while (!isPlanTargetMet(successes, plan) && !isPlanImpossible(successes, remaining, plan) && steps.length < plan.totalCount) {
      const actionIndex = policy.actions.get(planStateKey(successes, remaining));
      if (actionIndex === undefined || (remaining[actionIndex] || 0) <= 0) break;
      steps.push(actionIndex);
      remaining[actionIndex] = Math.max(0, remaining[actionIndex] - 1);
      if (mode === "success") successes[actionIndex] = (successes[actionIndex] || 0) + 1;
    }
    return {
      steps,
      achieved: isPlanTargetMet(successes, plan),
      stopped: isPlanImpossible(successes, remaining, plan),
    };
  }
  return [
    { label: "全成功時", ...trace("success") },
    { label: "連續失敗時", ...trace("failure") },
  ].filter(row => row.steps.length);
}

function compactPolicyPath(plan, steps) {
  const rows = [];
  for (const actionIndex of steps) {
    const name = plan.rows[actionIndex]?.scroll?.name || "卷軸";
    const last = rows[rows.length - 1];
    if (last && last.name === name) last.count += 1;
    else rows.push({ name, count: 1 });
  }
  return rows.map(row => `${row.name}${row.count > 1 ? ` ×${formatNumber(row.count)}` : ""}`).join(" → ");
}

function simulateSingle(equipmentPrice, plan, policy, captureSteps = false) {
  let cost = equipmentPrice;
  const successes = Array.from({ length: plan.rows.length }, () => 0);
  const remaining = plan.initialRemaining.slice();
  let destroyed = false;
  let stopped = false;
  const gains = {};
  const steps = [];
  while (true) {
    if (isPlanTargetMet(successes, plan)) break;
    if (isPlanImpossible(successes, remaining, plan)) {
      stopped = true;
      break;
    }
    const key = planStateKey(successes, remaining);
    const actionIndex = policy.actions.get(key);
    if (actionIndex === undefined || (remaining[actionIndex] || 0) <= 0) {
      stopped = true;
      break;
    }
    const row = plan.rows[actionIndex];
    const scroll = row.scroll;
    remaining[actionIndex] = Math.max(0, remaining[actionIndex] - 1);
    cost += row.price;
    const roll = Math.random() * 100;
    let result = "失敗";
    if (roll < Number(scroll.successRate || 0)) {
      successes[actionIndex] = (successes[actionIndex] || 0) + 1;
      result = "成功";
      Object.entries(scroll.effects || {}).forEach(([key, value]) => {
        gains[key] = (gains[key] || 0) + Number(value || 0);
      });
    } else if (Math.random() * 100 < Number(scroll.destroyRate || 0)) {
      destroyed = true;
      result = "破壞";
    }
    if (captureSteps) steps.push({ index: steps.length + 1, scrollName: scroll.name, result, successes: successes.slice(), cost });
    if (destroyed) break;
  }
  return { cost, successes, destroyed, stopped, achieved: !destroyed && !stopped && isPlanTargetMet(successes, plan), gains, steps };
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

function runMonteCarlo(equipmentPrice, plan, policy, trials, exact) {
  if (!plan.rows.length && plan.targets.some(target => target > 0)) return null;
  if (exact.targetProbability <= 0 || exact.targetProbability < 0.0001) return null;
  const costs = [];
  const attemptCounts = [];
  const successDistribution = new Map();
  const aggregateGains = {};
  const samples = [];
  const maxAttemptsPerTarget = Math.min(200000, Math.max(200, Math.ceil(20 / exact.targetProbability)));
  for (let trial = 0; trial < trials; trial += 1) {
    let totalCost = 0;
    let attemptCount = 0;
    let final = null;
    const sampleAttempts = [];
    while (attemptCount < maxAttemptsPerTarget) {
      const capture = trial < SAMPLE_LIMIT && sampleAttempts.length < SAMPLE_ATTEMPT_DETAIL_LIMIT;
      const result = simulateSingle(equipmentPrice, plan, policy, capture);
      attemptCount += 1;
      totalCost += result.cost;
      if (capture) sampleAttempts.push(result);
      if (result.achieved) {
        final = result;
        break;
      }
    }
    if (!final) continue;
    costs.push(totalCost);
    attemptCounts.push(attemptCount);
    addToMap(successDistribution, successKey(final.successes), 1);
    Object.entries(final.gains).forEach(([key, value]) => {
      aggregateGains[key] = (aggregateGains[key] || 0) + Number(value || 0);
    });
    if (trial < SAMPLE_LIMIT) samples.push({
      totalCost,
      attemptCount,
      attempts: sampleAttempts,
      truncated: attemptCount > sampleAttempts.length,
    });
  }
  const sortedCosts = costs.slice().sort((a, b) => a - b);
  const sortedAttempts = attemptCounts.slice().sort((a, b) => a - b);
  const count = costs.length || 1;
  return {
    completedTrials: costs.length,
    averageCost: costs.reduce((sum, value) => sum + value, 0) / count,
    medianCost: quantile(sortedCosts, 0.5),
    p90Cost: quantile(sortedCosts, 0.9),
    p95Cost: quantile(sortedCosts, 0.95),
    averageAttempts: attemptCounts.reduce((sum, value) => sum + value, 0) / count,
    medianAttempts: quantile(sortedAttempts, 0.5),
    successDistribution,
    averageGains: Object.fromEntries(Object.entries(aggregateGains).map(([key, value]) => [key, value / count])),
    samples,
  };
}

function itemIcon(item, className = "itemGlyph") {
  return assetImage(item?.image, item?.name || "道具", String(item?.name || "?").slice(0, 1), className);
}

function renderEquipmentCard(equipment) {
  if (!equipment) return `<div class="empty">請先選擇一件裝備</div>`;
  const stats = equipment.stats || {};
  const initialStats = configuredInitialStats(equipment);
  const statRows = [
    ["reqLevel", stats.reqLevel ? `Lv.${formatNumber(stats.reqLevel)}` : "無等級限制"],
    ["reqJob", formatReqJob(stats.reqJob)],
    ["tuc", `${formatNumber(stats.tuc || 0)} 次`],
    ["price", stats.price ? formatMeso(stats.price) : "無"],
  ];
  const bonusRows = STAT_ORDER
    .filter(key => Number(initialStats[key]))
    .map(key => `<span>${escapeHtml(STAT_LABELS[key] || key)} ${formatSigned(initialStats[key])}</span>`)
    .join("");
  return `
    <article class="simHero">
      ${itemIcon(equipment, "itemMark")}
      <div>
        <h2>${escapeHtml(equipment.name)}</h2>
        <p>${escapeHtml(equipment.category || "裝備")} · ${escapeHtml(equipment.subcategory || "裝備")}${state.showIds ? ` · ID ${escapeHtml(equipment.id)}` : ""}</p>
        ${bonusRows ? `<div class="simChipLine">${bonusRows}</div>` : ""}
      </div>
      <div class="heroCounters">
        ${statRows.map(([label, value]) => `
          <div class="heroCounter">
            <strong>${escapeHtml(value)}</strong>
            <span>${escapeHtml(STAT_LABELS[label] || label)}</span>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderStrategy() {
  const slots = maxSlots();
  const used = strategySlotCount();
  const slotNote = `<div class="simSlotNote">已安排 ${formatNumber(used)} / ${formatNumber(slots)} 張卷軸</div>`;
  if (!state.strategy.length) {
    els.strategyList.innerHTML = `${slotNote}<div class="empty smallEmpty">尚未加入卷軸</div>`;
    updateAddButton();
    return;
  }
  els.strategyList.innerHTML = `${slotNote}${state.strategy.map((row, index) => {
    const scroll = scrollById.get(Number(row.scrollId));
    if (!scroll) return "";
    const maxCount = Math.max(1, row.count + availableSlots(index));
    const target = clampInteger(row.target ?? Math.min(1, row.count), 0, row.count, Math.min(1, row.count));
    return `
      <article class="strategyRow" data-index="${index}">
        ${itemIcon(scroll, "sourceMonsterImage")}
        <div>
          <strong>${escapeHtml(scroll.name)}</strong>
          <span>${escapeHtml(scroll.successRate)}%${scroll.destroyRate ? ` · 破壞 ${escapeHtml(scroll.destroyRate)}%` : ""} · ${escapeHtml(formatStatEffects(scroll.effects))}</span>
          <div class="strategyInputs">
            <label>張數 <input class="strategyCount" type="number" min="1" max="${escapeHtml(maxCount)}" step="1" value="${escapeHtml(row.count)}" /></label>
            <label>目標成功 <input class="strategyTarget" type="number" min="0" max="${escapeHtml(row.count)}" step="1" value="${escapeHtml(target)}" /></label>
            <label class="priceField">價格 <input class="strategyPrice" type="text" inputmode="numeric" value="${escapeHtml(formatMoneyInput(row.price))}" /><small class="priceHint strategyPriceHint">${escapeHtml(formatChineseMeso(row.price))}</small></label>
          </div>
        </div>
        <div class="strategyActions">
          <button class="iconMiniButton moveUp" type="button" title="上移">↑</button>
          <button class="iconMiniButton moveDown" type="button" title="下移">↓</button>
          <button class="iconMiniButton removeScroll" type="button" title="移除">×</button>
        </div>
      </article>
    `;
  }).join("")}`;
  updateAddButton();
}

function updateAddButton() {
  if (!els.addScroll) return;
  const slotsLeft = availableSlots();
  const scroll = selectedScroll();
  const disabled = !scroll || slotsLeft <= 0;
  els.addScroll.disabled = disabled;
  els.addScroll.textContent = slotsLeft <= 0 ? "欄位已滿" : scroll ? "加入卷軸" : "沒有可用卷軸";
  if (els.scrollCount) {
    els.scrollCount.max = String(Math.max(1, slotsLeft));
    if (slotsLeft > 0 && integerValue(els.scrollCount.value, 1) > slotsLeft) {
      els.scrollCount.value = String(slotsLeft);
    }
  }
  if (els.scrollTarget) {
    const count = clampInteger(els.scrollCount?.value, 1, Math.max(1, slotsLeft), 1);
    els.scrollTarget.max = String(count);
    els.scrollTarget.disabled = disabled;
    const target = clampInteger(els.scrollTarget.value, 0, count, Math.min(1, count));
    els.scrollTarget.value = String(target);
  }
}

function refreshStrategyControls() {
  const note = els.strategyList?.querySelector(".simSlotNote");
  if (note) note.textContent = `已安排 ${formatNumber(strategySlotCount())} / ${formatNumber(maxSlots())} 張卷軸`;
  els.strategyList?.querySelectorAll(".strategyRow").forEach(row => {
    const index = Number(row.dataset.index);
    const entry = state.strategy[index];
    if (!entry) return;
    const maxCount = Math.max(1, entry.count + availableSlots(index));
    const countInput = row.querySelector(".strategyCount");
    const targetInput = row.querySelector(".strategyTarget");
    if (countInput) countInput.max = String(maxCount);
    if (targetInput) {
      targetInput.max = String(entry.count);
      const target = clampInteger(entry.target ?? 0, 0, entry.count, 0);
      entry.target = target;
      if (integerValue(targetInput.value, 0) > entry.count) targetInput.value = String(target);
    }
  });
  updateAddButton();
}

function updateCount() {
  if (!els.count) return;
  els.count.textContent = `${formatNumber(filteredEquipment().length)} 裝備 · ${formatNumber(filteredScrolls().length)} 卷軸`;
}

function renderSelectors() {
  renderEquipmentFilterOptions();
  renderEquipmentOptions();
  normalizeStrategyForEquipment();
  renderScrollFilterOptions();
  renderScrollOptions();
  renderStrategy();
  updateCount();
}

function detailIntro() {
  return `
    ${renderEquipmentCard(selectedEquipment())}
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>等待計算</h3>
        <span>加入卷軸策略後開始計算</span>
      </div>
      <div class="simIntro">
        <p>理論值會依照裝備價格、每張卷軸價格、成功率與破壞率計算。混合卷軸會自動搜尋最低平均成本的使用路徑，每次成功或失敗後重新判斷下一張卷軸；若已不可能達標，會直接停損重做。</p>
      </div>
    </section>
  `;
}

function renderDistributionTable(exact) {
  return `
    <div class="simTableWrap">
      <table class="simTable">
        <thead><tr><th>成功組合</th><th>達標完成</th><th>停損失敗</th><th>途中破壞</th><th>達標機率</th></tr></thead>
        <tbody>
          ${exact.distribution.map(row => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              <td>${formatPercent(row.alive)}</td>
              <td>${formatPercent(row.stopped || 0)}</td>
              <td>${formatPercent(row.destroyed)}</td>
              <td>${formatPercent(row.targetAlive)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSimulationTables(sim) {
  if (!sim) {
    return `<div class="simWarning">目標機率過低或無法達成，已略過本地隨機模擬；請降低目標或調整卷軸策略。</div>`;
  }
  const successRows = [...sim.successDistribution.entries()]
    .sort((a, b) => {
      const totalA = parseSuccessKey(a[0]).reduce((sum, value) => sum + value, 0);
      const totalB = parseSuccessKey(b[0]).reduce((sum, value) => sum + value, 0);
      return totalA - totalB || a[0].localeCompare(b[0]);
    })
    .map(([key, count]) => `<tr><td>${escapeHtml(formatSuccessCounts(parseSuccessKey(key)))}</td><td>${formatNumber(count)}</td><td>${formatPercent(count / sim.completedTrials)}</td></tr>`)
    .join("");
  const gainRows = Object.entries(sim.averageGains)
    .sort((a, b) => {
      const ai = STAT_ORDER.indexOf(a[0]);
      const bi = STAT_ORDER.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .map(([key, value]) => `<tr><td>${escapeHtml(STAT_LABELS[key] || key)}</td><td>${formatSigned(Math.round(value * 100) / 100)}</td></tr>`)
    .join("");
  return `
    <div class="simTableGrid">
      <div class="simTableWrap">
        <h3>成功品分布</h3>
        <table class="simTable">
          <thead><tr><th>成功組合</th><th>次數</th><th>比例</th></tr></thead>
          <tbody>${successRows}</tbody>
        </table>
      </div>
      <div class="simTableWrap">
        <h3>成功品平均加成</h3>
        <table class="simTable">
          <thead><tr><th>屬性</th><th>平均增加</th></tr></thead>
          <tbody>${gainRows || `<tr><td colspan="2">沒有屬性加成</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSamples(sim) {
  if (!sim || !sim.samples.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>模擬過程樣本</h3>
        <span>前 ${formatNumber(sim.samples.length)} 次成功樣本</span>
      </div>
      <div class="simSamples">
        ${sim.samples.map((sample, sampleIndex) => `
          <details class="simSample">
            <summary>#${formatNumber(sampleIndex + 1)} · ${formatMeso(sample.totalCost)} · 重做 ${formatNumber(sample.attemptCount)} 輪</summary>
            <div class="simSampleBody">
              ${sample.attempts.map((attempt, attemptIndex) => `
                <article>
                  <strong>第 ${formatNumber(attemptIndex + 1)} 輪：${attempt.destroyed ? "破壞" : attempt.achieved ? "達標" : attempt.stopped ? "停損" : "未達標"} · ${formatMeso(attempt.cost)}</strong>
                  <ol>
                    ${attempt.steps.map(step => `<li>${escapeHtml(step.scrollName)}：${escapeHtml(step.result)}，累計 ${escapeHtml(formatSuccessCounts(step.successes, true))}</li>`).join("")}
                  </ol>
                </article>
              `).join("")}
              ${sample.truncated ? `<div class="simSampleNotice">此樣本重做 ${formatNumber(sample.attemptCount)} 輪，為避免頁面過重，已顯示前 ${formatNumber(sample.attempts.length)} 輪明細。</div>` : ""}
            </div>
          </details>
        `).join("")}
      </div>
    </section>
  `;
}

function renderOptimizedStrategy(optimized, plan) {
  if (!plan.rows.length) return "";
  const firstAction = optimized.policy.actions.get(planStateKey(Array.from({ length: plan.rows.length }, () => 0), plan.initialRemaining));
  const firstScroll = firstAction === undefined ? "" : plan.rows[firstAction]?.scroll?.name || "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>推薦策略</h3>
        <span>最低平均成本路徑</span>
      </div>
      <div class="simPolicyBox">
        <p>計算時會在已達標時停止；若剩餘卷軸已不可能達成目標，就直接停損重做。</p>
        ${optimized.warning ? `<div class="simWarning compactWarning">${escapeHtml(optimized.warning)}</div>` : ""}
        ${firstScroll ? `<div class="simPathLine"><strong>起手</strong><span>${escapeHtml(firstScroll)}</span></div>` : ""}
        ${optimized.paths.map(path => `
          <div class="simPathLine">
            <strong>${escapeHtml(path.label)}</strong>
            <span>${escapeHtml(compactPolicyPath(plan, path.steps))}${path.achieved ? "，達標停止" : path.stopped ? "，停損重做" : ""}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function targetGainStats(plan) {
  const gains = {};
  for (const row of plan.rows) {
    const target = clampInteger(row.target, 0, row.count, 0);
    Object.entries(row.scroll.effects || {}).forEach(([key, value]) => {
      gains[key] = (gains[key] || 0) + Number(value || 0) * target;
    });
  }
  return gains;
}

function renderSuccessPreview(plan) {
  const equipment = selectedEquipment();
  if (!equipment || !plan.rows.length) return "";
  const initial = configuredInitialStats(equipment);
  const gains = targetGainStats(plan);
  const keys = STAT_ORDER.filter(key => Number(initial[key]) || Number(gains[key]));
  if (!keys.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>成品屬性預覽</h3>
        <span>依照目標成功張數</span>
      </div>
      <div class="successPreviewGrid">
        ${keys.map(key => {
          const start = Number(initial[key] || 0);
          const gain = Number(gains[key] || 0);
          const finalValue = start + gain;
          return `
            <div class="successPreviewCell">
              <span>${escapeHtml(STAT_LABELS[key] || key)}</span>
              <strong>${escapeHtml(formatSigned(finalValue))}</strong>
              <em>初始 ${escapeHtml(formatSigned(start))}${gain ? ` / 卷軸 ${escapeHtml(formatSigned(gain))}` : ""}</em>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function runAndRender() {
  const equipment = selectedEquipment();
  if (!equipment) {
    els.detail.innerHTML = `<div class="empty">請先選擇一件裝備</div>`;
    return;
  }
  normalizeStrategyForEquipment();
  renderStrategy();
  const plan = buildStrategyPlan();
  const used = strategySlotCount();
  const slots = maxSlots();
  const equipmentPrice = moneyValue(els.equipmentPrice.value, 0);
  writeCookie("ms_scroll_sim_equipment_price", equipmentPrice);
  const trials = Math.max(100, Math.min(20000, integerValue(els.trialCount.value, 3000)));
  els.trialCount.value = String(trials);
  writeCookie("ms_scroll_sim_trials", trials);
  if (used > slots) {
    els.detail.innerHTML = `${renderEquipmentCard(equipment)}<section class="sectionBlock"><div class="simWarning">卷軸張數超過裝備可強化次數，請先降低張數。</div></section>`;
    return;
  }
  if (!plan.rows.length) {
    els.detail.innerHTML = `${renderEquipmentCard(equipment)}<section class="sectionBlock"><div class="empty">請先加入至少一張卷軸</div></section>`;
    return;
  }
  const targets = targetVector();
  const optimized = optimizeStrategyPlan(equipmentPrice, plan);
  const exact = optimized.exact;
  const sim = runMonteCarlo(equipmentPrice, plan, optimized.policy, trials, exact);
  els.detail.innerHTML = `
    ${renderEquipmentCard(equipment)}
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>成本摘要</h3>
        <span>${formatNumber(plan.totalCount)} 張卷軸 · ${escapeHtml(formatTargetSummary(targets))}</span>
      </div>
      <div class="statsGrid simStatsGrid">
        <div class="statCell"><span>單輪達標機率</span><strong>${formatPercent(exact.targetProbability)}</strong></div>
        <div class="statCell"><span>理論期望總成本</span><strong>${formatMeso(exact.expectedCostPerTarget)}</strong><em>重做到成功強化出一件</em></div>
        <div class="statCell"><span>單輪平均花費</span><strong>${formatMeso(exact.expectedCost)}</strong><em>含停損與途中破壞</em></div>
        <div class="statCell"><span>破壞機率</span><strong>${formatPercent(exact.destroyedProb)}</strong></div>
        <div class="statCell"><span>停損機率</span><strong>${formatPercent(exact.stoppedProb)}</strong><em>已不可能達標</em></div>
        <div class="statCell"><span>模擬平均總成本</span><strong>${sim ? formatMeso(sim.averageCost) : "未模擬"}</strong><em>${sim ? `${formatNumber(sim.completedTrials)} 次成功樣本` : "目標機率過低"}</em></div>
        <div class="statCell"><span>模擬中位數</span><strong>${sim ? formatMeso(sim.medianCost) : "未模擬"}</strong></div>
        <div class="statCell"><span>模擬 P90</span><strong>${sim ? formatMeso(sim.p90Cost) : "未模擬"}</strong><em>約 90% 成功樣本成本不超過此值</em></div>
        <div class="statCell"><span>模擬 P95</span><strong>${sim ? formatMeso(sim.p95Cost) : "未模擬"}</strong><em>約 95% 成功樣本成本不超過此值</em></div>
      </div>
    </section>
    ${renderSuccessPreview(plan)}
    ${renderOptimizedStrategy(optimized, plan)}
    <section class="sectionBlock">
      <div class="sectionTitle"><h3>單輪結果分布</h3><span>理論值</span></div>
      ${renderDistributionTable(exact)}
    </section>
    <section class="sectionBlock">
      <div class="sectionTitle"><h3>本地模擬分布</h3><span>${formatNumber(trials)} 次</span></div>
      ${renderSimulationTables(sim)}
    </section>
    ${renderSamples(sim)}
  `;
}

function addSelectedScroll() {
  const scroll = selectedScroll();
  const slotsLeft = availableSlots();
  if (!scroll || slotsLeft <= 0 || state.strategy.some(row => Number(row.scrollId) === Number(scroll.id))) return;
  const count = clampInteger(els.scrollCount.value, 1, slotsLeft, 1);
  const target = clampInteger(els.scrollTarget?.value, 0, count, Math.min(1, count));
  state.strategy.push({
    scrollId: Number(scroll.id),
    count,
    target,
    price: moneyValue(els.scrollPrice.value, 0),
  });
  renderScrollOptions();
  renderStrategy();
  updateCount();
}

function resetFilters() {
  state.equipmentQuery = "";
  state.equipmentGroup = "";
  state.equipmentPart = "";
  state.equipmentJob = "";
  state.equipmentLevelMin = "";
  state.equipmentLevelMax = "";
  state.equipmentSourcedOnly = false;
  state.scrollQuery = "";
  state.scrollSuccess = "";
  state.scrollSourcedOnly = false;
  state.strategy = [];
  els.equipmentSearch.value = "";
  if (els.equipmentGroup) els.equipmentGroup.value = "";
  if (els.equipmentPart) els.equipmentPart.value = "";
  if (els.equipmentJob) els.equipmentJob.value = "";
  if (els.equipmentLevelMin) els.equipmentLevelMin.value = "";
  if (els.equipmentLevelMax) els.equipmentLevelMax.value = "";
  if (els.equipmentSourcedOnly) els.equipmentSourcedOnly.checked = false;
  els.scrollSearch.value = "";
  if (els.scrollSuccess) els.scrollSuccess.value = "";
  if (els.scrollSourcedOnly) els.scrollSourcedOnly.checked = false;
  els.scrollPrice.value = "";
  setPriceHint(els.scrollPriceHint, "");
  els.scrollCount.value = "1";
  if (els.scrollTarget) els.scrollTarget.value = "1";
  els.equipmentPrice.value = "0";
  setPriceHint(els.equipmentPriceHint, "0");
  writeCookie("ms_scroll_sim_equipment_price", "0");
  renderSelectors();
  els.detail.innerHTML = detailIntro();
}

function selectEquipmentById(value) {
  const id = Number(value);
  if (!Number.isFinite(id)) return;
  state.selectedEquipmentId = id;
  resetInitialStatsForEquipment();
  normalizeStrategyForEquipment();
  renderEquipmentOptions();
  renderScrollFilterOptions();
  renderScrollOptions();
  renderStrategy();
  updateCount();
  els.detail.innerHTML = detailIntro();
}

function selectScrollById(value) {
  const id = Number(value);
  if (!Number.isFinite(id)) return;
  state.selectedScrollId = id;
  renderScrollOptions();
}

function bindEvents() {
  els.themeToggle?.addEventListener("click", () => setTheme(state.theme === "dark" ? "light" : "dark"));
  els.settingsToggle?.addEventListener("click", () => {
    state.settingsOpen = !state.settingsOpen;
    saveBool("ms_settings_open", state.settingsOpen);
    applySettingsPanel();
  });
  els.idToggle?.addEventListener("click", () => {
    state.showIds = !state.showIds;
    saveBool("ms_show_ids", state.showIds);
    els.idToggle.setAttribute("aria-pressed", String(state.showIds));
    renderSelectors();
    els.detail.innerHTML = detailIntro();
  });
  els.clearFilters?.addEventListener("click", resetFilters);
  els.equipmentSearch?.addEventListener("input", () => {
    state.equipmentQuery = els.equipmentSearch.value;
    renderSelectors();
  });
  els.equipmentSearch?.addEventListener("blur", () => rememberSearchTerm(els.equipmentSearch.value));
  els.equipmentGroup?.addEventListener("change", event => {
    state.equipmentGroup = event.target.value;
    renderSelectors();
    els.detail.innerHTML = detailIntro();
  });
  els.equipmentPart?.addEventListener("change", event => {
    state.equipmentPart = event.target.value;
    renderSelectors();
    els.detail.innerHTML = detailIntro();
  });
  els.equipmentJob?.addEventListener("change", event => {
    state.equipmentJob = event.target.value;
    renderSelectors();
    els.detail.innerHTML = detailIntro();
  });
  els.equipmentSourcedOnly?.addEventListener("change", event => {
    state.equipmentSourcedOnly = event.target.checked;
    renderSelectors();
    els.detail.innerHTML = detailIntro();
  });
  function handleEquipmentLevelInput(key, input) {
    state[key] = numericLevelText(input.value);
    input.value = state[key];
    renderSelectors();
    els.detail.innerHTML = detailIntro();
  }
  els.equipmentLevelMin?.addEventListener("input", event => handleEquipmentLevelInput("equipmentLevelMin", event.target));
  els.equipmentLevelMax?.addEventListener("input", event => handleEquipmentLevelInput("equipmentLevelMax", event.target));
  els.scrollSearch?.addEventListener("input", () => {
    state.scrollQuery = els.scrollSearch.value;
    renderScrollOptions();
    updateCount();
  });
  els.scrollSearch?.addEventListener("blur", () => rememberSearchTerm(els.scrollSearch.value));
  els.scrollSuccess?.addEventListener("change", event => {
    state.scrollSuccess = event.target.value;
    renderScrollOptions();
    updateCount();
  });
  els.scrollSourcedOnly?.addEventListener("change", event => {
    state.scrollSourcedOnly = event.target.checked;
    renderScrollFilterOptions();
    renderScrollOptions();
    updateCount();
  });
  els.equipmentSelect?.addEventListener("change", () => selectEquipmentById(els.equipmentSelect.value));
  els.equipmentPicker?.addEventListener("click", event => {
    const row = event.target.closest(".simPickerRow");
    if (row) selectEquipmentById(row.dataset.id);
  });
  els.initialStatsPanel?.addEventListener("input", event => {
    if (!event.target.classList.contains("initialStatInput")) return;
    const key = event.target.dataset.key;
    const equipment = selectedEquipment();
    if (!key || !equipment) return;
    const range = statInputRange(equipment, key);
    const value = clampInteger(event.target.value, range.min, range.max, range.base);
    state.initialStats[key] = value;
    event.target.value = String(value);
    els.detail.innerHTML = detailIntro();
  });
  els.initialStatsPanel?.addEventListener("click", event => {
    if (event.target.id !== "resetInitialStats") return;
    resetInitialStatsForEquipment();
    renderInitialStatsPanel();
    els.detail.innerHTML = detailIntro();
  });
  els.scrollSelect?.addEventListener("change", () => selectScrollById(els.scrollSelect.value));
  els.scrollPicker?.addEventListener("click", event => {
    const row = event.target.closest(".simPickerRow");
    if (row) selectScrollById(row.dataset.id);
  });
  els.addScroll?.addEventListener("click", addSelectedScroll);
  els.runSimulation?.addEventListener("click", runAndRender);
  els.equipmentPrice?.addEventListener("input", () => {
    const value = formatPriceInput(els.equipmentPrice, els.equipmentPriceHint);
    writeCookie("ms_scroll_sim_equipment_price", value);
  });
  els.scrollPrice?.addEventListener("input", () => {
    formatPriceInput(els.scrollPrice, els.scrollPriceHint);
  });
  els.trialCount?.addEventListener("input", () => writeCookie("ms_scroll_sim_trials", integerValue(els.trialCount.value, 3000)));
  els.scrollCount?.addEventListener("input", updateAddButton);
  els.scrollTarget?.addEventListener("input", () => {
    const slotsLeft = Math.max(1, availableSlots());
    const target = clampInteger(els.scrollTarget.value, 0, slotsLeft, 0);
    const count = clampInteger(els.scrollCount?.value, 1, slotsLeft, 1);
    if (target > count && els.scrollCount) els.scrollCount.value = String(target);
    updateAddButton();
  });
  els.strategyList?.addEventListener("input", event => {
    const row = event.target.closest(".strategyRow");
    if (!row) return;
    const index = Number(row.dataset.index);
    if (!state.strategy[index]) return;
    if (event.target.classList.contains("strategyCount")) {
      const maxCount = Math.max(1, availableSlots(index));
      state.strategy[index].count = clampInteger(event.target.value, 1, maxCount, 1);
      state.strategy[index].target = clampInteger(state.strategy[index].target ?? 0, 0, state.strategy[index].count, 0);
      refreshStrategyControls();
    }
    if (event.target.classList.contains("strategyTarget")) {
      state.strategy[index].target = clampInteger(event.target.value, 0, integerValue(state.strategy[index].count, 0), 0);
      event.target.value = String(state.strategy[index].target);
    }
    if (event.target.classList.contains("strategyPrice")) {
      state.strategy[index].price = formatPriceInput(event.target, row.querySelector(".strategyPriceHint"));
    }
  });
  els.strategyList?.addEventListener("click", event => {
    const actionButton = event.target.closest(".strategyActions button");
    if (!actionButton) return;
    const row = actionButton.closest(".strategyRow");
    if (!row) return;
    const index = Number(row.dataset.index);
    if (actionButton.classList.contains("removeScroll")) state.strategy.splice(index, 1);
    if (actionButton.classList.contains("moveUp") && index > 0) {
      [state.strategy[index - 1], state.strategy[index]] = [state.strategy[index], state.strategy[index - 1]];
    }
    if (actionButton.classList.contains("moveDown") && index < state.strategy.length - 1) {
      [state.strategy[index + 1], state.strategy[index]] = [state.strategy[index], state.strategy[index + 1]];
    }
    renderScrollOptions();
    renderStrategy();
    updateCount();
  });
}

function init() {
  renderBuildMeta();
  applyTheme();
  applySettingsPanel();
  renderSearchHistoryOptions();
  els.equipmentPrice.value = state.equipmentPrice;
  formatPriceInput(els.equipmentPrice, els.equipmentPriceHint);
  formatPriceInput(els.scrollPrice, els.scrollPriceHint);
  els.trialCount.value = state.trialCount;
  els.idToggle?.setAttribute("aria-pressed", String(state.showIds));
  bindEvents();
  renderSelectors();
  els.detail.innerHTML = detailIntro();
}

init();
