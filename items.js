const db = window.MS_ITEM_DB || window.MS_DROP_DB;
const COOKIE_DAYS = 180;

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
  } catch (_error) {
    // Cookie 被停用時，頁面仍保留本次操作狀態。
  }
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

function parseCookieSet(name) {
  return new Set(cookieValue(name).split("|").map(value => value.trim()).filter(Boolean));
}

function writeCookieSet(name, values) {
  writeCookie(name, [...values].join("|"));
}

const SEARCH_HISTORY_COOKIE = "ms_search_history";
const SEARCH_HISTORY_LIMIT = 20;
const SEARCH_HISTORY_MAX_LENGTH = 40;
let searchHistoryTimer = null;

function escapeSearchOption(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function normalizedSearchTerm(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, SEARCH_HISTORY_MAX_LENGTH);
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

function scheduleRememberSearchTerm(value) {
  window.clearTimeout(searchHistoryTimer);
  searchHistoryTimer = window.setTimeout(() => rememberSearchTerm(value), 900);
}

function bindSearchHistory() {
  if (!els.search) return;
  renderSearchHistoryOptions();
  els.search.addEventListener("keydown", event => {
    if (event.key === "Enter") rememberSearchTerm(els.search.value);
  });
  els.search.addEventListener("blur", () => rememberSearchTerm(els.search.value));
}

const state = {
  query: "",
  category: cookieValue("ms_item_category"),
  subcategory: cookieValue("ms_item_subcategory"),
  equipmentGroup: cookieValue("ms_item_equipment_group"),
  equipmentJob: cookieValue("ms_item_equipment_job"),
  itemLevelMin: cookieValue("ms_item_level_min"),
  itemLevelMax: cookieValue("ms_item_level_max"),
  nameOnlySearch: cookieBool("ms_item_name_only_search"),
  showUnnamedMapMonsters: initialShowUnnamedMapMonsters(),
  showItemMakeCrafts: cookieBool("ms_show_item_make_crafts"),
  showUnnamedItems: cookieBool("ms_show_unnamed_items"),
  hideNoSourceItems: cookieBool("ms_hide_no_source_items", true),
  showIds: cookieBool("ms_show_ids"),
  theme: initialTheme(),
  settingsOpen: cookieBool("ms_settings_open"),
  selectedId: initialItemId(),
  preserveSelectedDetail: Boolean(initialItemId()),
};

const els = {
  search: document.getElementById("itemSearch"),
  category: document.getElementById("categoryFilter"),
  subcategory: document.getElementById("subcategoryFilter"),
  equipmentGroup: document.getElementById("equipmentGroupFilter"),
  equipmentJob: document.getElementById("equipmentJobFilter"),
  itemLevelMin: document.getElementById("itemLevelMin"),
  itemLevelMax: document.getElementById("itemLevelMax"),
  itemLevelFields: Array.from(document.querySelectorAll(".itemLevelField")),
  clearFilters: document.getElementById("clearFilters"),
  nameOnlySearch: document.getElementById("nameOnlySearch"),
  nameOnlySearchControl: document.getElementById("nameOnlySearchControl"),
  unnamedMapToggle: document.getElementById("unnamedMapToggle"),
  itemMakeCraftToggle: document.getElementById("itemMakeCraftToggle"),
  unnamedToggle: document.getElementById("unnamedToggle"),
  hideNoSourceToggle: document.getElementById("hideNoSourceToggle"),
  idToggle: document.getElementById("idToggle"),
  themeToggle: document.getElementById("themeToggle"),
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  meta: document.getElementById("buildMeta"),
  list: document.getElementById("itemList"),
  detail: document.getElementById("itemDetail"),
  count: document.getElementById("resultCount"),
};

function renderBuildMeta() {
  if (!els.meta) return;
  const meta = db.metadata || {};
  const parts = [];
  if (meta.gameVersion) parts.push(`遊戲版本 ${meta.gameVersion}`);
  if (meta.generatedAtText) parts.push(`更新 ${meta.generatedAtText}`);
  els.meta.textContent = parts.join(" · ");
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
  } catch (_error) {
    // 使用者若停用本機儲存，仍可在本次瀏覽切換。
  }
}

function initialItemId() {
  const value = safeSearchParam("item");
  if (value && /^\d+$/.test(value)) return Number(value);
  const item = itemByName(value);
  return item ? Number(item.id) : null;
}

function initialShowUnnamedMapMonsters() {
  if (safeSearchParam("showUnnamedMaps") === "1") return true;
  return cookieBool("ms_show_unnamed_map_monsters");
}

function safeSearchParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch (_error) {
    const query = String(window.location.search || "").replace(/^\?/, "");
    for (const part of query.split("&")) {
      const [rawKey, ...rawValue] = part.split("=");
      const key = safeDecodeQueryPart(rawKey || "");
      if (key !== name) continue;
      return safeDecodeQueryPart(rawValue.join("="));
    }
  }
  return "";
}

function safeDecodeQueryPart(value) {
  const text = String(value || "").replace(/\+/g, " ");
  try {
    return decodeURIComponent(text);
  } catch (_error) {
    return text;
  }
}

function setItemUrl(itemId) {
  if (!itemId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("item", itemId);
  if (state.showUnnamedMapMonsters) {
    url.searchParams.set("showUnnamedMaps", "1");
  } else {
    url.searchParams.delete("showUnnamedMaps");
  }
  window.history.replaceState(null, "", url);
}

function monsterUrl(monsterId, includeUnnamedMaps = false) {
  const url = new URL("./index.html", window.location.href);
  url.searchParams.set("monster", monsterId);
  if (state.showUnnamedMapMonsters || includeUnnamedMaps) url.searchParams.set("showUnnamedMaps", "1");
  return `${url.pathname.split("/").pop()}${url.search}`;
}

function questUrl(questId) {
  return `./quests.html?quest=${encodeURIComponent(questId)}`;
}

function itemUrl(itemId) {
  const url = new URL("./items.html", window.location.href);
  url.searchParams.set("item", itemId);
  if (state.showUnnamedMapMonsters) url.searchParams.set("showUnnamedMaps", "1");
  return `${url.pathname.split("/").pop()}${url.search}`;
}

function questNpcImage(row, className = "sourceMonsterImage") {
  const npc = row.sourceNpc || row.rewardNpc || row.startNpc || row.endNpc || null;
  return assetImage(npc?.image, npc?.name || row.questName || "任務", "任", className);
}

const EQUIP_FIELD_GROUPS = [
  {
    title: "裝備需求",
    fields: [
      ["reqJob", "職業", formatReqJob],
      ["reqLevel", "等級"],
      ["reqSTR", "力量"],
      ["reqDEX", "敏捷"],
      ["reqINT", "智力"],
      ["reqLUK", "幸運"],
      ["reqPOP", "人氣"],
    ],
  },
  {
    title: "能力加成",
    fields: [
      ["incSTR", "力量", formatSigned],
      ["incDEX", "敏捷", formatSigned],
      ["incINT", "智力", formatSigned],
      ["incLUK", "幸運", formatSigned],
      ["incMHP", "MaxHP", formatSigned],
      ["incMMP", "MaxMP", formatSigned],
      ["incPAD", "攻擊力", formatSigned],
      ["incMAD", "魔法攻擊力", formatSigned],
      ["incPDD", "防禦力", formatSigned],
      ["incMDD", "魔法防禦力", formatSigned],
      ["incACC", "命中", formatSigned],
      ["incEVA", "迴避", formatSigned],
      ["incSpeed", "移動速度", formatSigned],
      ["incJump", "跳躍", formatSigned],
      ["incCraft", "熟練", formatSigned],
      ["knockback", "擊退"],
      ["attackSpeed", "攻速", formatAttackSpeed],
    ],
  },
  {
    title: "其他數值",
    fields: [
      ["tuc", "可升級次數"],
      ["price", "賣店價格", formatMeso],
      ["islot", "裝備欄位", formatEquipSlot],
      ["vslot", "外觀欄位", formatEquipSlot],
    ],
  },
];

const EQUIPMENT_CATEGORY = "裝備";
const EQUIPMENT_GROUP_SUBCATEGORIES = {
  armor: ["上衣", "手套", "盾牌", "套服", "帽子", "披風", "鞋子", "褲裙"],
  weapon: ["弓", "火槍", "矛", "弩", "長杖", "指虎", "拳套", "單手斧", "單手棍", "單手劍", "短刀", "短杖", "槍", "雙手斧", "雙手棍", "雙手劍"],
  accessory: ["耳環", "戒指", "眼飾", "腰帶", "墜飾", "勳章", "臉飾"],
  other: ["裝備", "騎寵", "騎寵鞍座"],
};
const EQUIPMENT_JOB_BITS = {
  warrior: 1,
  magician: 2,
  bowman: 4,
  thief: 8,
  pirate: 16,
};

function norm(value) {
  return String(value || "").toLowerCase().trim();
}

function numericItemLevelText(value) {
  return String(value || "").replace(/[^\d]/g, "").slice(0, 3);
}

function itemLevelFilterValue(value) {
  const number = Number(numericItemLevelText(value));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function assetImage(src, alt, fallback, className) {
  if (src) {
    return `<img class="${className} assetImage" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }
  return `<div class="${className}">${escapeHtml(fallback)}</div>`;
}

const MESO_ICON_PATHS = {
  copper: "./assets/meso/copper.png",
  gold: "./assets/meso/gold.png",
  bill: "./assets/meso/bill.png",
  bag: "./assets/meso/bag.png",
};

function mesoTierForAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  if (amount >= 1000) return "bag";
  if (amount >= 100) return "bill";
  if (amount >= 50) return "gold";
  return "copper";
}

function mesoTierForRange(min, max) {
  const maxValue = Number(max);
  const minValue = Number(min);
  return mesoTierForAmount(Number.isFinite(maxValue) ? maxValue : minValue);
}

function mesoIconHtml(tier, className = "mesoInlineIcon") {
  const src = MESO_ICON_PATHS[tier] || MESO_ICON_PATHS.copper;
  return `<img class="${className}" src="${src}" alt="楓幣" loading="lazy" />`;
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

function formatRangeBound(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "";
}

function formatEquipStatRange(range) {
  const min = Number(range?.min);
  const max = Number(range?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  if (min === max) return formatRangeBound(min);
  return `${formatRangeBound(min)} ~ ${formatRangeBound(max)}`;
}

function equipStatContent(item, key, value, formatter) {
  if (key === "price") return mesoValueHtml(value);
  const text = formatter ? formatter(value) : formatNumber(value);
  const range = item.equipStatRanges?.[key];
  if (!range) return escapeHtml(text);
  return `${escapeHtml(text)} <span class="equipStatRange">(${escapeHtml(formatEquipStatRange(range))})</span>`;
}

function formatMeso(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return escapeHtml(value);
  return `${number.toLocaleString()} 楓幣`;
}

function mesoValueHtml(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return escapeHtml(value);
  return `<span class="mesoValue">${mesoIconHtml(mesoTierForAmount(number))}<span class="mesoValueText">${number.toLocaleString()} 楓幣</span></span>`;
}

function formatMesoAmountRange(min, max) {
  const minValue = Number(min);
  const maxValue = Number(max);
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return "未知";
  if (minValue === maxValue) return `${minValue.toLocaleString()} 楓幣`;
  return `${minValue.toLocaleString()} ~ ${maxValue.toLocaleString()} 楓幣`;
}

function formatMesoRange(meso) {
  return formatMesoAmountRange(meso?.totalMin, meso?.totalMax);
}

function formatAttackSpeed(value) {
  const number = Number(value);
  const labels = {
    9: "比較慢",
    8: "慢",
    7: "慢",
    6: "普通",
    5: "快",
    4: "快",
    3: "更快",
    2: "頂速",
  };
  if (!Number.isFinite(number)) return escapeHtml(value);
  return labels[number] ? `${labels[number]}(${number})` : number.toLocaleString();
}

const EQUIP_SLOT_LABELS = {
  Ae: "耳環",
  Af: "臉飾",
  As: "臉部飾品",
  Ay: "眼飾",
  Be: "腰帶",
  Cp: "帽子",
  Fc: "臉型",
  Gl: "手套",
  Gv: "手套",
  Gw: "手套",
  H1: "頭髮",
  H2: "頭髮",
  H3: "頭髮",
  H4: "頭髮",
  H5: "頭髮",
  H6: "頭髮",
  Hb: "頭髮",
  Hc: "頭髮",
  Hd: "皮膚",
  Hf: "頭髮",
  Hr: "髮型",
  Hs: "頭髮",
  Hx: "頭髮",
  Ma: "上衣",
  Me: "勳章",
  Pe: "墜飾",
  Pn: "褲裙",
  Ri: "戒指",
  Sd: "騎寵鞍座",
  Si: "盾牌",
  So: "鞋子",
  Sr: "披風",
  Tm: "騎寵",
  Wp: "武器",
};

const EQUIP_SLOT_TOKENS = Object.keys(EQUIP_SLOT_LABELS).sort((a, b) => b.length - a.length);

function formatEquipSlot(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const labels = [];
  const seen = new Set();
  let index = 0;
  while (index < text.length) {
    const token = EQUIP_SLOT_TOKENS.find(candidate => text.startsWith(candidate, index));
    if (!token) {
      labels.push(text.slice(index));
      break;
    }
    const label = EQUIP_SLOT_LABELS[token] || token;
    if (!seen.has(label)) {
      labels.push(label);
      seen.add(label);
    }
    index += token.length;
  }
  return labels.length ? labels.join(" / ") : text;
}

function formatReqJob(value) {
  const mask = Number(value);
  if (!Number.isFinite(mask) || mask <= 0) return "全職";
  const jobs = [
    [1, "劍士"],
    [2, "法師"],
    [4, "弓箭手"],
    [8, "盜賊"],
    [16, "海盜"],
  ];
  const labels = jobs.filter(([bit]) => (mask & bit) === bit).map(([, label]) => label);
  return labels.length ? labels.join(" / ") : formatNumber(mask);
}

function itemTypeText(item) {
  const parts = [item.category || item.kind || "其他"];
  if (item.subcategory && item.subcategory !== item.category) parts.push(item.subcategory);
  return parts.join(" · ");
}

function hasEquipValue(key, value) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "string") return true;
  const number = Number(value);
  if (!Number.isFinite(number)) return true;
  if (key === "reqJob") return true;
  return number !== 0;
}

function isUnnamedItem(item) {
  return item.unnamed || /^未命名道具\s+\d+$/.test(String(item.name || ""));
}

function itemMatchesId(item, itemId) {
  if (itemId === null || itemId === undefined || itemId === "") return false;
  const target = String(itemId);
  if (String(item.id) === target) return true;
  return (item.mergedIds || []).some(id => String(id) === target);
}

function idMeta(itemOrId) {
  if (!state.showIds) return "";
  if (itemOrId && typeof itemOrId === "object") {
    const ids = (itemOrId.mergedIds || [itemOrId.id]).filter(id => id !== null && id !== undefined);
    if (!ids.length) return "";
    return ` · ID ${escapeHtml(ids[0])}${ids.length > 1 ? ` +${ids.length - 1}` : ""}`;
  }
  return ` · ID ${escapeHtml(itemOrId)}`;
}

function sourceRows(item) {
  return {
    monsterDrops: monsterSourceRows(item),
    questRewards: item.sources?.questRewards || [],
    shops: shopSourceRows(item),
    crafts: craftSourceRows(item),
    boxSources: item.sources?.boxSources || [],
    boxChoices: item.sources?.boxChoices || [],
    gachaSources: item.sources?.gachaSources || [],
  };
}

function questRequirementRows(item) {
  return item.sources?.questRequirements || [];
}

function craftRequirementRows(item) {
  return (item.sources?.craftRequirements || []).filter(visibleCraftRecipe);
}

function sourceCounts(item) {
  const rows = sourceRows(item);
  return {
    monsterDrops: rows.monsterDrops.length,
    questRewards: rows.questRewards.length,
    shops: rows.shops.length,
    crafts: rows.crafts.length,
    boxSources: rows.boxSources.length,
    boxChoices: rows.boxChoices.length,
    gachaSources: rows.gachaSources.length,
  };
}

function sourceSummary(item) {
  const counts = sourceCounts(item);
  const parts = [];
  if (counts.monsterDrops) parts.push(`怪物 ${formatNumber(counts.monsterDrops)}`);
  if (counts.questRewards) parts.push(`任務 ${formatNumber(counts.questRewards)}`);
  if (counts.shops) parts.push(`購買 ${formatNumber(counts.shops)}`);
  if (counts.crafts) parts.push(`合成 ${formatNumber(counts.crafts)}`);
  if (counts.boxSources) parts.push(`箱子 ${formatNumber(counts.boxSources)}`);
  if (counts.boxChoices) parts.push(`可選 ${formatNumber(counts.boxChoices)}`);
  if (counts.gachaSources) parts.push(`轉蛋 ${formatNumber(counts.gachaSources)}`);
  return parts.length ? parts.join(" / ") : "尚無來源";
}

function searchableText(item) {
  const sources = sourceRows(item);
  const monsterText = sources.monsterDrops.flatMap(row => [
    row.monsterId,
    row.monsterName,
    ...(row.continents || []),
    ...(row.maps || []).flatMap(map => [map.id, map.name, map.street]),
    ...(row.questIds || []),
    ...(row.questNames || []),
  ]);
  const questText = sources.questRewards.flatMap(row => [
    row.questId,
    row.questName,
  ]);
  const shopText = sources.shops.flatMap(row => [
    row.merchantId,
    row.merchantName,
    row.sn,
  ]);
  const craftText = sources.crafts.flatMap(row => [
    row.recipeId,
    row.groupLabel,
    row.output?.name,
    row.primaryOutput?.name,
    ...(row.materials || []).flatMap(item => [item.id, item.name, item.category, item.subcategory]),
    ...(row.requirements || []).flatMap(item => [item.id, item.name, item.role]),
    ...(row.outputs || []).flatMap(item => [item.id, item.name]),
    ...(row.npcs || []).flatMap(npc => [npc.id, npc.name, npc.locationText, ...(npc.maps || []).flatMap(map => [map.id, map.name, map.street])]),
  ]);
  const questRequirementText = questRequirementRows(item).flatMap(row => [
    row.questId,
    row.questName,
    row.category,
    row.parent,
    row.stageLabel,
    row.startNpc?.name,
    row.endNpc?.name,
  ]);
  const craftRequirementText = craftRequirementRows(item).flatMap(row => [
    row.recipeId,
    row.groupLabel,
    row.ingredient?.role,
    row.primaryOutput?.id,
    row.primaryOutput?.name,
    ...(row.materials || []).flatMap(item => [item.id, item.name, item.category, item.subcategory]),
    ...(row.requirements || []).flatMap(item => [item.id, item.name, item.role]),
    ...(row.outputs || []).flatMap(item => [item.id, item.name]),
    ...(row.npcs || []).flatMap(npc => [npc.id, npc.name, npc.locationText]),
  ]);
  const boxSourceText = sources.boxSources.flatMap(row => [
    row.boxId,
    row.boxName,
    row.dialogText,
    row.npcName,
    row.choiceLabel,
    row.item?.id,
    row.item?.name,
  ]);
  const boxChoiceText = sources.boxChoices.flatMap(row => [
    row.boxId,
    row.boxName,
    row.dialogText,
    row.npcName,
    row.choiceLabel,
    row.item?.id,
    row.item?.name,
  ]);
  const gachaText = sources.gachaSources.flatMap(row => [
    row.sourceLabel,
    row.poolName,
    row.itemId,
    row.itemName,
  ]);
  return [
    item.id,
    ...(item.mergedIds || []),
    item.name,
    item.desc,
    item.kind,
    item.category,
    item.subcategory,
    ...monsterText,
    ...questText,
    ...shopText,
    ...craftText,
    ...questRequirementText,
    ...craftRequirementText,
    ...boxSourceText,
    ...boxChoiceText,
    ...gachaText,
  ].map(norm).join(" ");
}

function monsterSourceRows(item) {
  const rows = item.sources?.monsterDrops || [];
  return state.showUnnamedMapMonsters ? rows : rows.filter(row => !row.onlyUnnamedMaps && !row.unnamedMonster);
}

function monsterDropSourceLabel(row) {
  if (row.sourceLabel) return row.sourceLabel;
  if (row.source === "quest") return "任務掉落";
  if (row.source === "miniGame") return "小遊戲材料";
  if (row.source === "supplemental") return "補充資料";
  return "圖鑑";
}

function shopSourceRows(item) {
  const rows = item.sources?.shops || [];
  return state.showUnnamedMapMonsters ? rows : rows.filter(row => !row.onlyUnnamedMaps);
}

function npcOnlyUnnamedMaps(npc) {
  if (npc?.onlyUnnamedMaps === false) return false;
  if (npc?.onlyUnnamedMaps === true) return true;
  const maps = npc?.maps || [];
  return maps.length > 0 && maps.every(map => map?.unnamed);
}

function recipeOnlyUnnamedMapNpcs(row) {
  const npcs = row?.npcs || [];
  return npcs.length > 0 && npcs.every(npcOnlyUnnamedMaps);
}

function visibleCraftRecipe(row) {
  if (row?.sourceKind !== "npcDialog") return state.showItemMakeCrafts;
  if (!state.showUnnamedMapMonsters && recipeOnlyUnnamedMapNpcs(row)) return false;
  return true;
}

function craftSourceRows(item) {
  return (item.sources?.crafts || []).filter(visibleCraftRecipe);
}

function hasEquipmentAdvancedFilters() {
  return Boolean(
    state.equipmentGroup ||
    state.equipmentJob ||
    itemLevelFilterValue(state.itemLevelMin) !== null ||
    itemLevelFilterValue(state.itemLevelMax) !== null
  );
}

function itemIsEquipment(item) {
  return item.category === EQUIPMENT_CATEGORY;
}

function itemMatchesEquipmentGroup(item) {
  if (!state.equipmentGroup) return true;
  const rows = EQUIPMENT_GROUP_SUBCATEGORIES[state.equipmentGroup] || [];
  return rows.includes(item.subcategory || "");
}

function itemMatchesEquipmentJob(item) {
  if (!state.equipmentJob) return true;
  const bit = EQUIPMENT_JOB_BITS[state.equipmentJob];
  if (!bit) return true;
  const rawMask = item.equipStats?.reqJob;
  if (rawMask === null || rawMask === undefined || rawMask === "") return false;
  const mask = Number(rawMask);
  if (!Number.isFinite(mask)) return false;
  if (mask <= 0) return true;
  return (mask & bit) === bit;
}

function itemMatchesEquipmentLevel(item) {
  const minLevel = itemLevelFilterValue(state.itemLevelMin);
  const maxLevel = itemLevelFilterValue(state.itemLevelMax);
  if (minLevel === null && maxLevel === null) return true;
  const rawLevel = item.equipStats?.reqLevel;
  if (rawLevel === null || rawLevel === undefined || rawLevel === "") return false;
  const level = Number(rawLevel);
  if (!Number.isFinite(level)) return false;
  if (minLevel !== null && level < minLevel) return false;
  if (maxLevel !== null && level > maxLevel) return false;
  return true;
}

function itemMatchesEquipmentAdvancedFilters(item) {
  if (!hasEquipmentAdvancedFilters()) return true;
  if (!itemIsEquipment(item)) return false;
  return itemMatchesEquipmentGroup(item) && itemMatchesEquipmentJob(item) && itemMatchesEquipmentLevel(item);
}

function filteredItems() {
  const q = norm(state.query);
  return (db.items || []).filter(item => {
    if (!state.showUnnamedItems && isUnnamedItem(item)) return false;
    if (state.hideNoSourceItems && totalSources(item) <= 0) return false;
    if (state.category && item.category !== state.category) return false;
    if (state.subcategory && item.subcategory !== state.subcategory) return false;
    if (!itemMatchesEquipmentAdvancedFilters(item)) return false;
    const searchText = state.nameOnlySearch ? norm(item.name) : searchableText(item);
    if (q && !searchText.includes(q)) return false;
    return true;
  }).sort(compareItems);
}

function itemById(itemId) {
  return (db.items || []).find(item => itemMatchesId(item, itemId));
}

function itemByName(name) {
  const target = norm(name);
  if (!target) return null;
  return (db.items || []).find(item => norm(item.name) === target) || null;
}

function formatQuestRewardJob(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  const groups = [
    ["劍士", [1, 11, 21, 31]],
    ["法師", [2, 12, 22, 32]],
    ["弓箭手", [3, 13, 23, 33]],
    ["盜賊", [4, 14, 24, 34]],
    ["海盜", [5, 15, 25, 35]],
  ];
  return groups
    .filter(([, bits]) => bits.some(bit => n & (2 ** bit)))
    .map(([label]) => label)
    .join(" / ");
}

function itemRequiredLevel(item) {
  const level = Number(item.equipStats?.reqLevel);
  return Number.isFinite(level) && level > 0 ? level : null;
}

function compareItems(a, b) {
  const aLevel = itemRequiredLevel(a);
  const bLevel = itemRequiredLevel(b);
  const nameDiff = String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant");
  if (aLevel === null && bLevel === null) {
    if (nameDiff) return nameDiff;
  } else if (aLevel === null) {
    return -1;
  } else if (bLevel === null) {
    return 1;
  } else if (aLevel !== bLevel) {
    return aLevel - bLevel;
  }
  const orderDiff = Number(a.categoryOrder || 999) - Number(b.categoryOrder || 999);
  if (orderDiff) return orderDiff;
  const categoryDiff = String(a.category || "").localeCompare(String(b.category || ""), "zh-Hant");
  if (categoryDiff) return categoryDiff;
  const subcategoryDiff = String(a.subcategory || "").localeCompare(String(b.subcategory || ""), "zh-Hant");
  if (subcategoryDiff) return subcategoryDiff;
  if (nameDiff) return nameDiff;
  return Number(a.id) - Number(b.id);
}

function populateFilters() {
  const categories = db.filters?.itemCategories || [];
  els.category.innerHTML = `
    <option value="">全部分類</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
  `;
}

function clearEquipmentFilters(save = false) {
  state.equipmentGroup = "";
  state.equipmentJob = "";
  state.itemLevelMin = "";
  state.itemLevelMax = "";
  if (save) {
    writeCookie("ms_item_equipment_group", "");
    writeCookie("ms_item_equipment_job", "");
    writeCookie("ms_item_level_min", "");
    writeCookie("ms_item_level_max", "");
  }
}

function clearSearchFilters() {
  state.preserveSelectedDetail = false;
  state.query = "";
  state.category = "";
  state.subcategory = "";
  state.nameOnlySearch = false;
  state.showUnnamedMapMonsters = false;
  state.showItemMakeCrafts = false;
  state.showUnnamedItems = false;
  state.hideNoSourceItems = true;
  clearEquipmentFilters(true);
  writeCookie("ms_item_category", "");
  writeCookie("ms_item_subcategory", "");
  writeCookie("ms_item_name_only_search", "");
  saveBool("ms_show_unnamed_map_monsters", false);
  saveBool("ms_show_item_make_crafts", false);
  saveBool("ms_show_unnamed_items", false);
  saveBool("ms_hide_no_source_items", true);
  if (els.search) els.search.value = "";
  syncControls();
  setItemUrl(state.selectedId);
  render();
}

function equipmentControlsAvailable() {
  return !state.category || state.category === EQUIPMENT_CATEGORY;
}

function setFilterControlVisible(control, visible) {
  if (!control) return;
  control.hidden = !visible;
  control.disabled = !visible;
}

function syncEquipmentControls() {
  const available = equipmentControlsAvailable();
  if (!available && hasEquipmentAdvancedFilters()) clearEquipmentFilters(true);
  if (els.equipmentGroup) {
    els.equipmentGroup.value = state.equipmentGroup;
    if (els.equipmentGroup.value !== state.equipmentGroup) state.equipmentGroup = "";
    setFilterControlVisible(els.equipmentGroup, available);
  }
  if (els.equipmentJob) {
    els.equipmentJob.value = state.equipmentJob;
    if (els.equipmentJob.value !== state.equipmentJob) state.equipmentJob = "";
    setFilterControlVisible(els.equipmentJob, available);
  }
  els.itemLevelFields.forEach(field => { field.hidden = !available; });
  if (els.itemLevelMin) {
    if (document.activeElement !== els.itemLevelMin) els.itemLevelMin.value = state.itemLevelMin || "";
    els.itemLevelMin.disabled = !available;
  }
  if (els.itemLevelMax) {
    if (document.activeElement !== els.itemLevelMax) els.itemLevelMax.value = state.itemLevelMax || "";
    els.itemLevelMax.disabled = !available;
  }
}

function subcategoriesForCategory(category) {
  const byCategory = db.filters?.itemSubcategoriesByCategory || {};
  const equipmentSubcategories = byCategory[EQUIPMENT_CATEGORY] || [];
  const equipmentContext = category === EQUIPMENT_CATEGORY || (!category && hasEquipmentAdvancedFilters());
  if (equipmentContext) {
    const groupRows = EQUIPMENT_GROUP_SUBCATEGORIES[state.equipmentGroup] || [];
    if (groupRows.length) return equipmentSubcategories.filter(subcategory => groupRows.includes(subcategory));
    return equipmentSubcategories;
  }
  if (category) return byCategory[category] || [];
  const seen = new Set();
  Object.values(byCategory).forEach(rows => {
    (rows || []).forEach(row => {
      if (row) seen.add(row);
    });
  });
  return [...seen].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function updateSubcategoryFilter() {
  syncEquipmentControls();
  const options = subcategoriesForCategory(state.category);
  els.subcategory.innerHTML = `
    <option value="">全部子分類</option>
    ${options.map(subcategory => `<option value="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</option>`).join("")}
  `;
  if (state.subcategory && options.includes(state.subcategory)) {
    els.subcategory.value = state.subcategory;
  } else {
    state.subcategory = "";
    els.subcategory.value = "";
    writeCookie("ms_item_subcategory", "");
  }
  setFilterControlVisible(els.subcategory, options.length > 0);
}

function syncControls() {
  els.search.value = state.query;
  if (els.nameOnlySearch) els.nameOnlySearch.checked = state.nameOnlySearch;
  if (!state.category && hasEquipmentAdvancedFilters()) {
    state.category = EQUIPMENT_CATEGORY;
    writeCookie("ms_item_category", state.category);
  }
  if (state.category && state.category !== EQUIPMENT_CATEGORY) clearEquipmentFilters(true);
  els.category.value = state.category;
  state.category = els.category.value;
  syncEquipmentControls();
  updateSubcategoryFilter();
}

function updateToggles() {
  if (els.nameOnlySearch && els.nameOnlySearchControl) {
    els.nameOnlySearch.checked = state.nameOnlySearch;
    els.nameOnlySearchControl.classList.toggle("active", state.nameOnlySearch);
  }
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
  els.unnamedMapToggle.setAttribute("aria-pressed", String(state.showUnnamedMapMonsters));
  els.unnamedMapToggle.textContent = state.showUnnamedMapMonsters ? "隱藏未定位/未命名NPC與地圖" : "顯示未定位/未命名NPC與地圖";
  els.itemMakeCraftToggle.setAttribute("aria-pressed", String(state.showItemMakeCrafts));
  els.itemMakeCraftToggle.textContent = state.showItemMakeCrafts ? "隱藏強化合成配方" : "顯示強化合成配方";
  els.unnamedToggle.setAttribute("aria-pressed", String(state.showUnnamedItems));
  els.unnamedToggle.textContent = state.showUnnamedItems ? "隱藏未命名道具" : "顯示未命名道具";
  els.hideNoSourceToggle.setAttribute("aria-pressed", String(state.hideNoSourceItems));
  els.hideNoSourceToggle.textContent = state.hideNoSourceItems ? "顯示無來源道具" : "隱藏無來源道具";
}

function updateSettingsPanel() {
  if (!els.settingsToggle || !els.settingsPanel) return;
  els.settingsPanel.hidden = !state.settingsOpen;
  els.settingsToggle.setAttribute("aria-expanded", String(state.settingsOpen));
  els.settingsToggle.classList.toggle("active", state.settingsOpen);
  els.settingsToggle.title = state.settingsOpen ? "隱藏設定" : "顯示設定";
  els.settingsToggle.setAttribute("aria-label", state.settingsOpen ? "隱藏設定" : "顯示設定");
}

function renderList() {
  const rows = filteredItems();
  if (!rows.some(item => itemMatchesId(item, state.selectedId))) {
    const preserved = state.preserveSelectedDetail && itemById(state.selectedId);
    if (!preserved) state.selectedId = rows[0]?.id || null;
  }
  els.count.textContent = `${rows.length.toLocaleString()} 項`;
  const visibleRows = rows.slice(0, 900);
  const limitNote = rows.length > visibleRows.length
    ? `<div class="listLimit">已顯示前 ${visibleRows.length.toLocaleString()} 項</div>`
    : "";
  els.list.innerHTML = visibleRows.map(item => `
    <button class="monsterRow itemIndexRow ${itemMatchesId(item, state.selectedId) ? "active" : ""}" data-id="${item.id}">
      ${assetImage(item.image, item.name, item.name.slice(0, 1) || "?", "itemGlyph")}
      <span class="rowText">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="rowMeta">${escapeHtml(itemTypeText(item))}${idMeta(item)}</span>
        <em>${escapeHtml(sourceSummary(item))}</em>
      </span>
    </button>
  `).join("") + limitNote;
}

function totalSources(item) {
  const counts = sourceCounts(item);
  return counts.monsterDrops + counts.questRewards + counts.shops + counts.crafts + counts.boxSources + counts.boxChoices + counts.gachaSources;
}

function selectedItem() {
  const rows = filteredItems();
  return (state.preserveSelectedDetail && itemById(state.selectedId))
    || rows.find(item => itemMatchesId(item, state.selectedId))
    || rows[0];
}

function renderDetail() {
  const item = selectedItem();
  if (!item) {
    els.detail.innerHTML = `<div class="empty">找不到符合的道具</div>`;
    return;
  }
  const counts = sourceCounts(item);
  els.detail.innerHTML = `
    <section class="monsterHero itemHero">
      ${assetImage(item.image, item.name, item.name.slice(0, 1) || "?", "itemMark")}
      <div class="heroText">
        <h2>${escapeHtml(item.name)}</h2>
        <p>${escapeHtml(itemTypeText(item))}${idMeta(item)}${item.desc ? ` · ${escapeHtml(shorten(item.desc, 110))}` : ""}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${formatNumber(totalSources(item))}</strong><span>${counts.boxChoices ? "來源/內容" : "來源"}</span></div>
        <div class="heroCounter"><strong>${escapeHtml(item.subcategory || item.kind)}</strong><span>細類</span></div>
      </div>
    </section>
    ${renderEquipmentStats(item)}
    ${renderSellPrice(item)}
    ${renderMonsterSources(item)}
    ${renderQuestSources(item)}
    ${renderShopSources(item)}
    ${renderCraftSources(item)}
    ${renderBoxSources(item)}
    ${renderBoxChoiceSources(item)}
    ${renderGachaSources(item)}
    ${renderQuestRequirementSources(item)}
    ${renderCraftRequirementSources(item)}
    ${totalSources(item) ? "" : `<div class="empty">${questRequirementRows(item).length || craftRequirementRows(item).length ? "目前資料集中沒有取得途徑；已列出需求用途" : "目前資料集中沒有取得途徑"}</div>`}
  `;
}

function renderSellPrice(item) {
  if (item.sellPrice === null || item.sellPrice === undefined) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>賣給商店</h3>
        <span>可販售價格</span>
      </div>
      <div class="sourceList">
        <article class="sourceRow priceSourceRow">
          <div>
            <strong>NPC 商店收購</strong>
            <span>${mesoValueHtml(item.sellPrice)}</span>
          </div>
          <small>賣店</small>
        </article>
      </div>
    </section>
  `;
}

function renderEquipmentStats(item) {
  const stats = item.equipStats || {};
  const ranges = item.equipStatRanges || {};
  const rangeSources = item.equipStatRangeSources || [];
  const rangeSourceText = rangeSources.join("、") || "怪物掉落或可使用催化劑合成";
  const rangeNote = Object.keys(ranges).length
    ? `<p class="equipRangeNote">${escapeHtml(rangeSourceText)}的裝備數值可能浮動。</p>`
    : "";
  let totalRows = 0;
  const groups = EQUIP_FIELD_GROUPS.map(group => {
    const rows = group.fields.map(([key, label, formatter]) => {
      const value = stats[key];
      if (!hasEquipValue(key, value)) return "";
      const content = equipStatContent(item, key, value, formatter);
      return `<div class="statCell equipStatCell"><span>${escapeHtml(label)}:</span><strong>${content}</strong></div>`;
    }).filter(Boolean);
    if (!rows.length) return "";
    totalRows += rows.length;
    return `
      <div class="equipStatGroup">
        <strong>${escapeHtml(group.title)}</strong>
        <div class="statsGrid equipStatsGrid">${rows.join("")}</div>
      </div>
    `;
  }).filter(Boolean);
  if (!groups.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>裝備數值</h3>
        <span>${totalRows.toLocaleString()} 欄</span>
      </div>
      <div class="equipStats">${rangeNote}${groups.join("")}</div>
    </section>
  `;
}

function renderMonsterSources(item) {
  const rows = sourceRows(item).monsterDrops;
  return sourceBlock("怪物掉落", rows, row => {
    const meta = [];
    if (row.level) meta.push(`Lv.${row.level}`);
    if (state.showIds) meta.push(`ID ${row.monsterId}`);
    if (row.continents?.length) meta.push(row.continents.join("、"));
    const maps = (row.maps || []).slice(0, 3).map(map => map.name || map.id).filter(Boolean);
    const questNote = row.source === "quest" && row.questNames?.length
      ? `<p>任務線索：${escapeHtml(row.questNames.slice(0, 3).join("、"))}</p>`
      : "";
    return `
      <a class="sourceRow sourceLinkRow monsterSourceRow" href="${monsterUrl(row.monsterId, row.onlyUnnamedMaps)}">
        ${assetImage(row.image, row.monsterName, row.monsterName.slice(0, 1) || "?", "sourceMonsterImage")}
        <div>
          <strong>${escapeHtml(row.monsterName)}</strong>
          <span>${meta.map(escapeHtml).join(" · ") || "怪物"}</span>
          ${maps.length ? `<p>${escapeHtml(maps.join("、"))}${(row.maps || []).length > maps.length ? ` +${(row.maps || []).length - maps.length}` : ""}</p>` : ""}
          ${questNote}
        </div>
        <small>${escapeHtml(monsterDropSourceLabel(row))}</small>
      </a>
    `;
  });
}

function renderQuestSources(item) {
  const rows = sourceRows(item).questRewards;
  return sourceBlock("任務獲取", rows, row => {
    const meta = [`${formatNumber(row.count)} 個`];
    if (row.choice) meta.push("自選獎勵");
    else if (row.random) meta.push("隨機獎勵");
    const jobLabel = formatQuestRewardJob(row.job);
    if (jobLabel) meta.push(`職業 ${jobLabel}`);
    if (row.sourceLabel && row.sourceLabel !== "任務獎勵") meta.push(row.sourceLabel);
    const sourceNpc = row.sourceNpc || row.rewardNpc || null;
    if (sourceNpc?.name) meta.push(sourceNpc.name);
    return `
    <a class="sourceRow sourceLinkRow sourceQuestRow" href="${questUrl(row.questId)}">
      ${questNpcImage(row)}
      <div>
        <strong>${escapeHtml(row.questName)}</strong>
        <span>${questStateLabel(row.state)}${state.showIds ? ` · ID ${escapeHtml(row.questId)}` : ""}</span>
        <p>${escapeHtml(meta.join(" · "))}</p>
      </div>
      <small>任務</small>
    </a>
  `;
  });
}

function shopPriceHtml(row) {
  if (row.price === null || row.price === undefined) return "價格未知";
  const currency = row.currency || "";
  if (!currency || currency === "楓幣" || currency === "meso") return mesoValueHtml(row.price);
  return `${formatNumber(row.price)} ${escapeHtml(currency)}`;
}

function renderShopSources(item) {
  const rows = sourceRows(item).shops;
  return sourceBlock("商人購買", rows, row => {
    const isNpcShop = row.sourceType === "npcShop";
    const questText = requiredQuestText(row);
    const meta = [];
    if (row.locationText) meta.push(row.locationText);
    if (row.sourceLabel) meta.push(row.sourceLabel);
    if (state.showIds && row.shopId) meta.push(`Shop ${row.shopId}`);
    if (state.showIds && row.merchantId && isNpcShop) meta.push(`NPC ${row.merchantId}`);
    if (state.showIds && row.sn) meta.push(`SN ${row.sn}`);
    return `
    <article class="sourceRow ${isNpcShop ? "shopSourceRow" : ""}">
      ${isNpcShop ? assetImage(row.merchantImage || row.npc?.image, row.merchantName, String(row.merchantName || "?").slice(0, 1), "sourceMonsterImage") : ""}
      <div>
        <strong>${escapeHtml(row.merchantName)}</strong>
        <span>${shopPriceHtml(row)}</span>
        <p>${meta.map(escapeHtml).join(" · ") || `${formatNumber(row.count || 1)} 個`}</p>
        ${questText ? `<p>任務需求：${escapeHtml(questText)}</p>` : ""}
      </div>
      <small>${row.sourceType === "cashShop" ? "商城" : "商店"}</small>
    </article>
  `;
  });
}

function recipeMeta(row) {
  const meta = [];
  if ((row.meso === null || row.meso === undefined) && row.sourceKind === "npcDialog") meta.push("費用未標注");
  if (row.reqLevel) meta.push(`角色 Lv.${formatNumber(row.reqLevel)}+`);
  if (row.reqSkillLevel) meta.push(`製作 Lv.${formatNumber(row.reqSkillLevel)}+`);
  if (row.tuc) meta.push(`TUC ${formatNumber(row.tuc)}`);
  if (row.randomReward) meta.push("隨機產物");
  if (state.showIds) meta.push(row.recipeId);
  return meta.join(" · ") || "合成配方";
}

function recipeItemChip(item) {
  const name = String(item?.name || `道具 ${item?.id || ""}`);
  const meta = [];
  if (item?.role) meta.push(item.role);
  if (item?.count) meta.push(`${formatNumber(item.count)} 個`);
  if (item?.chanceWeight !== null && item?.chanceWeight !== undefined) meta.push(`權重 ${formatNumber(item.chanceWeight)}`);
  if (state.showIds && item?.id) meta.push(`ID ${item.id}`);
  return `
    <a class="recipeChip" href="${itemUrl(item.id)}">
      ${assetImage(item?.image, name, name.slice(0, 1) || "?", "recipeIcon")}
      <span><strong>${escapeHtml(name)}</strong><em>${escapeHtml(meta.join(" · ") || item?.subcategory || item?.category || "道具")}</em></span>
    </a>
  `;
}

function recipeMesoChip(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return `
    <span class="recipeChip recipeMesoChip">
      ${mesoIconHtml(mesoTierForAmount(number))}
      <span><strong>楓幣</strong><em>${number.toLocaleString()} 楓幣</em></span>
    </span>
  `;
}

function recipeChipGroup(items, meso = null) {
  const rows = (items || []).filter(Boolean);
  const chips = [
    recipeMesoChip(meso),
    ...rows.map(recipeItemChip),
  ].filter(Boolean);
  if (!chips.length) return "";
  return `<div class="recipeChips">${chips.join("")}</div>`;
}

function craftNpcText(row) {
  const names = (row.npcs || []).map(npc => {
    const location = npc.locationText ? `（${npc.locationText}）` : "";
    return `${npc.name}${location}`;
  });
  if (names.length) return names.join("、");
  if (row.sourceKind === "npcDialog") return "NPC 對話腳本未標注 NPC";
  return "ItemMake 未標注固定 NPC";
}

function craftNpcLabel(row) {
  return row.sourceKind === "npcDialog" ? "NPC" : "候選工作台 NPC";
}

function craftNpcImage(row) {
  const npc = (row.npcs || []).find(candidate => candidate.image) || (row.npcs || [])[0] || null;
  const name = npc?.name || row.groupLabel || "製作";
  return assetImage(npc?.image, name, String(name).slice(0, 1) || "製", "sourceMonsterImage");
}

function requiredQuestText(row) {
  const quests = row.requiredQuests || [];
  if (!quests.length) return "";
  return quests.map(quest => {
    const name = quest.name || `任務 ${quest.id}`;
    const state = quest.stateLabel || (quest.state !== null && quest.state !== undefined ? `狀態 ${quest.state}` : "");
    return `${name}${state ? ` / ${state}` : ""}`;
  }).join("、");
}

function randomOutputText(row) {
  if (!row.randomReward || !(row.outputs || []).length) return "";
  return row.outputs.map(output => {
    const weight = output.chanceWeight !== null && output.chanceWeight !== undefined ? ` 權重 ${formatNumber(output.chanceWeight)}` : "";
    return `${output.name}${weight}`;
  }).join("、");
}

function renderCraftSources(item) {
  const rows = sourceRows(item).crafts;
  const npcRows = rows.filter(row => row.sourceKind === "npcDialog");
  const makerRows = rows.filter(row => row.sourceKind !== "npcDialog");
  const renderRow = row => {
    const requirements = row.requirements || [];
    const questText = requiredQuestText(row);
    const outputText = randomOutputText(row);
    const materialChips = recipeChipGroup(row.materials, row.meso);
    const requirementChips = recipeChipGroup(requirements);
    return `
      <article class="sourceRow craftSourceRow">
        ${craftNpcImage(row)}
        <div>
          <strong>${escapeHtml(row.groupLabel || "合成配方")}</strong>
          <span>${escapeHtml(recipeMeta(row))}</span>
          ${row.menuLabel ? `<p>菜單：${escapeHtml(row.menuLabel)}</p>` : ""}
          <p>${escapeHtml(craftNpcLabel(row))}：${escapeHtml(craftNpcText(row))}</p>
          ${materialChips ? `<p>材料</p>${materialChips}` : ""}
          ${requirementChips ? `<p>附加需求</p>${requirementChips}` : ""}
          ${questText ? `<p>任務需求：${escapeHtml(questText)}</p>` : ""}
          ${outputText ? `<p>可能產物：${escapeHtml(outputText)}</p>` : ""}
          ${row.mesoNote ? `<p class="sourceNote">${escapeHtml(row.mesoNote)}</p>` : ""}
          ${row.npcNote ? `<p class="sourceNote">${escapeHtml(row.npcNote)}</p>` : ""}
        </div>
        <small>${row.output?.chanceWeight !== null && row.output?.chanceWeight !== undefined ? `權重 ${formatNumber(row.output.chanceWeight)}` : row.sourceKind === "npcDialog" ? "NPC" : "強化合成"}</small>
      </article>
    `;
  };
  return [
    sourceBlock("NPC 對話合成配方", npcRows, renderRow),
    sourceBlock("0轉技能「強化合成」特殊配方", makerRows, renderRow),
  ].join("");
}

function renderBoxSources(item) {
  const rows = sourceRows(item).boxSources;
  return sourceBlock("箱子取得", rows, row => {
    const itemName = row.item?.name || item.name || "道具";
    const meta = [];
    if (row.npcName) meta.push(row.npcName);
    if (row.dialogText) meta.push(row.dialogText);
    if (row.choiceLabel && row.choiceLabel !== itemName) meta.push(`選項：${row.choiceLabel}`);
    if (state.showIds) meta.push(`ID ${row.boxId}`);
    return `
      <a class="sourceRow sourceLinkRow" href="${itemUrl(row.boxId)}">
        ${assetImage(row.boxImage, row.boxName, String(row.boxName || "?").slice(0, 1), "sourceMonsterImage")}
        <div>
          <strong>${escapeHtml(row.boxName || "箱子")}</strong>
          <span>${escapeHtml(row.sourceLabel || "開啟後可選擇")}</span>
          <p>${escapeHtml(meta.join(" · "))}</p>
        </div>
        <small>箱子</small>
      </a>
    `;
  });
}

function renderBoxChoiceSources(item) {
  const rows = sourceRows(item).boxChoices;
  return sourceBlock("開啟後可選擇", rows, row => {
    const reward = row.item || {};
    const name = reward.name || row.choiceLabel || `道具 ${reward.id || ""}`;
    const meta = [];
    if (row.choiceLabel && row.choiceLabel !== name) meta.push(`對話顯示：${row.choiceLabel}`);
    if (row.npcName) meta.push(row.npcName);
    if (state.showIds && reward.id) meta.push(`ID ${reward.id}`);
    return `
      <a class="sourceRow sourceLinkRow" href="${itemUrl(reward.id)}">
        ${assetImage(reward.image, name, String(name || "?").slice(0, 1), "sourceMonsterImage")}
        <div>
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(row.sourceLabel || "開啟後可選擇")}${row.order ? ` · 第 ${formatNumber(row.order)} 項` : ""}</span>
          ${row.dialogText ? `<p>${escapeHtml(row.dialogText)}</p>` : ""}
          ${meta.length ? `<p>${escapeHtml(meta.join(" · "))}</p>` : ""}
        </div>
        <small>${formatNumber(reward.count || 1)} 個</small>
      </a>
    `;
  });
}

function renderGachaSources(item) {
  const rows = sourceRows(item).gachaSources;
  return sourceBlock("轉蛋取得", rows, row => {
    const meta = [];
    if (row.poolName) meta.push(row.poolName);
    if (state.showIds && row.itemId) meta.push(`ID ${row.itemId}`);
    return `
      <article class="sourceRow">
        ${assetImage(row.itemImage || item.image, row.itemName || item.name, String(row.itemName || item.name || "?").slice(0, 1), "sourceMonsterImage")}
        <div>
          <strong>${escapeHtml(row.sourceLabel || "轉蛋取得")}</strong>
          <span>${escapeHtml(meta.join(" · ") || "轉蛋")}</span>
        </div>
        <small>轉蛋</small>
      </article>
    `;
  });
}

function renderQuestRequirementSources(item) {
  const rows = questRequirementRows(item);
  return sourceBlock("任務需求", rows, row => `
    <a class="sourceRow sourceLinkRow sourceQuestRow" href="${questUrl(row.questId)}">
      ${questNpcImage(row)}
      <div>
        <strong>${escapeHtml(row.questName)}</strong>
        <span>${escapeHtml(row.category || "任務")}${row.minLevel ? ` · Lv.${escapeHtml(row.minLevel)}+` : ""}${state.showIds ? ` · ID ${escapeHtml(row.questId)}` : ""}</span>
        <p>${escapeHtml(row.stageLabel || "任務條件")}${row.parent ? ` · ${escapeHtml(row.parent)}` : ""}</p>
      </div>
      <small>需要 ${formatNumber(row.count)} 個</small>
    </a>
  `);
}

function renderCraftRequirementSources(item) {
  const rows = craftRequirementRows(item);
  const npcRows = rows.filter(row => row.sourceKind === "npcDialog");
  const makerRows = rows.filter(row => row.sourceKind !== "npcDialog");
  const renderRow = row => {
    const output = row.primaryOutput || row.output || {};
    const ingredient = row.ingredient || {};
    const name = String(output.name || `道具 ${output.id || ""}`);
    const requirementText = [ingredient.role || "材料"];
    if (ingredient.count) requirementText.push(`${formatNumber(ingredient.count)} 個`);
    const materialChips = recipeChipGroup(row.materials, row.meso);
    return `
      <article class="sourceRow monsterSourceRow recipeOutputRow">
        ${assetImage(output.image, name, name.slice(0, 1) || "?", "sourceMonsterImage")}
        <div>
          <a class="inlineSourceLink" href="${itemUrl(output.id)}"><strong>${escapeHtml(name)}</strong></a>
          <span>${escapeHtml(row.groupLabel || "合成配方")}${recipeMeta(row) ? ` · ${escapeHtml(recipeMeta(row))}` : ""}</span>
          ${row.menuLabel ? `<p>菜單：${escapeHtml(row.menuLabel)}</p>` : ""}
          <p>${escapeHtml(craftNpcLabel(row))}：${escapeHtml(craftNpcText(row))}</p>
          ${materialChips ? `<p>完整材料</p>${materialChips}` : ""}
          ${row.mesoNote ? `<p class="sourceNote">${escapeHtml(row.mesoNote)}</p>` : ""}
        </div>
        <small>${escapeHtml(requirementText.join(" · "))}</small>
      </article>
    `;
  };
  return [
    sourceBlock("被用於 NPC 對話合成", npcRows, renderRow),
    sourceBlock("被用於 0轉技能「強化合成」", makerRows, renderRow),
  ].join("");
}

function sourceBlock(title, rows, renderRow) {
  if (!rows.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>${escapeHtml(title)}</h3>
        <span>${rows.length.toLocaleString()} 筆</span>
      </div>
      <div class="sourceList">
        ${rows.map(renderRow).join("")}
      </div>
    </section>
  `;
}

function questStateLabel(state) {
  if (state === "0") return "任務給予";
  if (state === "1") return "完成獎勵";
  return `階段 ${state}`;
}

function shorten(value, size) {
  const text = String(value || "").replace(/\s+/g, " ");
  return text.length > size ? text.slice(0, size - 1) + "..." : text;
}

function render() {
  updateSettingsPanel();
  updateToggles();
  renderList();
  renderDetail();
}

els.search.addEventListener("input", event => {
  state.preserveSelectedDetail = false;
  state.query = event.target.value;
  scheduleRememberSearchTerm(state.query);
  render();
});

els.nameOnlySearch.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.nameOnlySearch = event.target.checked;
  saveBool("ms_item_name_only_search", state.nameOnlySearch);
  render();
});

els.category.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.category = event.target.value;
  if (state.category && state.category !== EQUIPMENT_CATEGORY) clearEquipmentFilters(true);
  writeCookie("ms_item_category", state.category);
  updateSubcategoryFilter();
  writeCookie("ms_item_subcategory", state.subcategory);
  render();
});

els.subcategory.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.subcategory = event.target.value;
  writeCookie("ms_item_subcategory", state.subcategory);
  render();
});

els.equipmentGroup.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.equipmentGroup = event.target.value;
  if (!state.category) {
    state.category = EQUIPMENT_CATEGORY;
    els.category.value = state.category;
    writeCookie("ms_item_category", state.category);
  }
  writeCookie("ms_item_equipment_group", state.equipmentGroup);
  updateSubcategoryFilter();
  writeCookie("ms_item_subcategory", state.subcategory);
  render();
});

els.equipmentJob.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.equipmentJob = event.target.value;
  if (!state.category) {
    state.category = EQUIPMENT_CATEGORY;
    els.category.value = state.category;
    writeCookie("ms_item_category", state.category);
    updateSubcategoryFilter();
  }
  writeCookie("ms_item_equipment_job", state.equipmentJob);
  render();
});

function handleItemLevelInput(key, event) {
  state.preserveSelectedDetail = false;
  state[key] = numericItemLevelText(event.target.value);
  event.target.value = state[key];
  if (!state.category) {
    state.category = EQUIPMENT_CATEGORY;
    els.category.value = state.category;
    writeCookie("ms_item_category", state.category);
    updateSubcategoryFilter();
  }
  writeCookie(key === "itemLevelMin" ? "ms_item_level_min" : "ms_item_level_max", state[key]);
  render();
}

els.itemLevelMin.addEventListener("input", event => handleItemLevelInput("itemLevelMin", event));
els.itemLevelMax.addEventListener("input", event => handleItemLevelInput("itemLevelMax", event));

els.clearFilters.addEventListener("click", clearSearchFilters);

els.unnamedMapToggle.addEventListener("click", () => {
  state.preserveSelectedDetail = false;
  state.showUnnamedMapMonsters = !state.showUnnamedMapMonsters;
  saveBool("ms_show_unnamed_map_monsters", state.showUnnamedMapMonsters);
  setItemUrl(state.selectedId);
  render();
});

els.itemMakeCraftToggle.addEventListener("click", () => {
  state.preserveSelectedDetail = false;
  state.showItemMakeCrafts = !state.showItemMakeCrafts;
  saveBool("ms_show_item_make_crafts", state.showItemMakeCrafts);
  render();
});

els.unnamedToggle.addEventListener("click", () => {
  state.preserveSelectedDetail = false;
  state.showUnnamedItems = !state.showUnnamedItems;
  saveBool("ms_show_unnamed_items", state.showUnnamedItems);
  render();
});

els.hideNoSourceToggle.addEventListener("click", () => {
  state.preserveSelectedDetail = false;
  state.hideNoSourceItems = !state.hideNoSourceItems;
  saveBool("ms_hide_no_source_items", state.hideNoSourceItems);
  render();
});

els.idToggle.addEventListener("click", () => {
  state.showIds = !state.showIds;
  saveBool("ms_show_ids", state.showIds);
  render();
});

els.themeToggle.addEventListener("click", () => {
  setTheme(state.theme === "dark" ? "light" : "dark");
});

els.settingsToggle.addEventListener("click", () => {
  state.settingsOpen = !state.settingsOpen;
  saveBool("ms_settings_open", state.settingsOpen);
  updateSettingsPanel();
});

els.list.addEventListener("click", event => {
  const button = event.target.closest(".itemIndexRow");
  if (!button) return;
  state.preserveSelectedDetail = false;
  state.selectedId = Number(button.dataset.id);
  setItemUrl(state.selectedId);
  render();
});

applyTheme();
renderBuildMeta();
populateFilters();
syncControls();
bindSearchHistory();
render();
