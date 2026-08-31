const db = window.MS_QUEST_DB;
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
  category: cookieValue("ms_quest_category"),
  levelMin: cookieValue("ms_quest_level_min"),
  levelMax: cookieValue("ms_quest_level_max"),
  nameOnlySearch: cookieBool("ms_quest_name_only_search"),
  showUnnamedIndex: cookieBool("ms_quest_show_unnamed_index"),
  showQuestRewardItemDetails: cookieBool("ms_monster_drop_item_details", true),
  showIds: cookieBool("ms_show_ids"),
  favoriteIds: parseCookieSet("ms_favorite_quests"),
  theme: initialTheme(),
  settingsOpen: cookieBool("ms_settings_open"),
  selectedId: initialQuestId(),
  preserveSelectedDetail: Boolean(initialQuestId()),
};

const els = {
  search: document.getElementById("questSearch"),
  category: document.getElementById("questCategoryFilter"),
  levelMin: document.getElementById("questLevelMin"),
  levelMax: document.getElementById("questLevelMax"),
  clearFilters: document.getElementById("clearFilters"),
  nameOnlySearch: document.getElementById("nameOnlySearch"),
  nameOnlySearchControl: document.getElementById("nameOnlySearchControl"),
  unnamedIndexToggle: document.getElementById("unnamedIndexToggle"),
  idToggle: document.getElementById("idToggle"),
  themeToggle: document.getElementById("themeToggle"),
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  meta: document.getElementById("buildMeta"),
  list: document.getElementById("questList"),
  detail: document.getElementById("questDetail"),
  count: document.getElementById("resultCount"),
};

function renderBuildMeta() {
  if (!els.meta) return;
  const meta = db.metadata || {};
  const parts = [];
  if (meta.gameVersion) parts.push(`遊戲版本 ${meta.gameVersion}`);
  els.meta.textContent = parts.join(" · ");
}

function favoriteButton(id, name) {
  const key = String(id);
  const active = state.favoriteIds.has(key);
  const action = active ? "移除最愛" : "加入最愛";
  return `<button class="favoriteButton${active ? " active" : ""}" type="button" data-favorite-id="${escapeHtml(key)}" aria-label="${escapeHtml(`${action}：${name || key}`)}" aria-pressed="${active ? "true" : "false"}" title="${action}">★</button>`;
}

function toggleFavorite(id) {
  const key = String(id);
  if (state.favoriteIds.has(key)) {
    state.favoriteIds.delete(key);
  } else {
    state.favoriteIds.add(key);
  }
  writeCookieSet("ms_favorite_quests", state.favoriteIds);
  renderList();
}

function favoritePinnedRows(filteredRows, allRows, keyFn, compareFn, limit) {
  const favorites = [...(allRows || [])]
    .filter(row => state.favoriteIds.has(String(keyFn(row))))
    .sort(compareFn);
  const favoriteKeys = new Set(favorites.map(row => String(keyFn(row))));
  const normalRows = filteredRows.filter(row => !favoriteKeys.has(String(keyFn(row))));
  const visibleRows = [...favorites, ...normalRows.slice(0, Math.max(0, limit - favorites.length))];
  return { rows: visibleRows, total: favorites.length + normalRows.length };
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

function initialQuestId() {
  return new URLSearchParams(window.location.search).get("quest");
}

function setQuestUrl(questId) {
  if (!questId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("quest", questId);
  window.history.replaceState(null, "", url);
}

function questUrl(questId) {
  return `./quests.html?quest=${encodeURIComponent(questId)}`;
}

function itemUrl(itemId) {
  return `./items.html?item=${encodeURIComponent(itemId)}`;
}

function monsterUrl(monsterId) {
  return `./index.html?monster=${encodeURIComponent(monsterId)}&showUnnamedMaps=1`;
}

function norm(value) {
  return String(value || "").toLowerCase().trim();
}

function numericQuestLevelText(value) {
  return String(value || "").replace(/[^\d]/g, "").slice(0, 3);
}

function questLevelFilterValue(value) {
  const number = Number(numericQuestLevelText(value));
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

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : escapeHtml(value);
}

function formatSigned(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return escapeHtml(value);
  return `${number > 0 ? "+" : ""}${number.toLocaleString()}`;
}

const EQUIP_RANGE_LABELS = {
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
};
const EQUIP_RANGE_PRIORITY = ["incPAD", "incMAD", "incSTR", "incDEX", "incINT", "incLUK", "incACC", "incEVA", "incPDD", "incMDD", "incMHP", "incMMP", "incSpeed", "incJump", "incCraft"];

function itemTypeText(item) {
  const parts = [item.category || item.kind || "其他"];
  if (item.subcategory && item.subcategory !== item.category) parts.push(item.subcategory);
  return parts.join(" · ");
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

function formatEquipRequirementLevel(stats) {
  if (!Object.hasOwn(stats, "reqLevel")) return "未知";
  const level = Number(stats.reqLevel);
  if (!Number.isFinite(level)) return String(stats.reqLevel);
  return level > 0 ? `Lv.${level.toLocaleString()}` : "無限制";
}

function formatEquipRequirementAttributes(stats) {
  const fields = [
    ["reqSTR", "力量"],
    ["reqDEX", "敏捷"],
    ["reqINT", "智力"],
    ["reqLUK", "幸運"],
    ["reqPOP", "人氣"],
  ];
  const parts = fields.map(([key, label]) => {
    const value = stats[key];
    const number = Number(value);
    if (Number.isFinite(number)) return number > 0 ? `${label} ${number.toLocaleString()}` : "";
    return value ? `${label} ${value}` : "";
  }).filter(Boolean);
  return parts.length ? parts.join(" / ") : "";
}

function formatEquipUpgradeSlots(stats) {
  if (!Object.hasOwn(stats, "tuc")) return "未知";
  const tuc = Number(stats.tuc);
  return Number.isFinite(tuc) ? tuc.toLocaleString() : String(stats.tuc);
}

function equipRequirementRowsHtml(item) {
  const stats = item?.equipStats;
  if (!stats || typeof stats !== "object") return "";
  const requirements = formatEquipRequirementAttributes(stats);
  const rows = [
    ["裝備需求", requirements],
  ].filter(([, value]) => value);
  return `<div class="equipRequirementLines">
    <p class="equipRequirementPrimary"><strong>${escapeHtml(formatEquipRequirementLevel(stats))} · ${escapeHtml(formatReqJob(stats.reqJob))}</strong></p>
    ${rows.map(([label, value]) => `
    <p><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></p>
  `).join("")}</div>`;
}

function equipUpgradeRowsHtml(item) {
  const stats = item?.equipStats;
  if (!stats || typeof stats !== "object") return "";
  return `<div class="equipRangeLines equipUpgradeLines"><p>可強化次數: ${escapeHtml(formatEquipUpgradeSlots(stats))}</p></div>`;
}

function formatRangeBound(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "";
}

function formatEquipRangeValue(range) {
  const min = Number(range?.min);
  const max = Number(range?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "";
  if (min === max) return formatRangeBound(min);
  return `${formatRangeBound(min)} ~ ${formatRangeBound(max)}`;
}

function equipRangeLine(key, range) {
  const base = Number(range?.base);
  const baseText = Number.isFinite(base) ? formatSigned(base) : "";
  const rangeText = formatEquipRangeValue(range);
  if (!baseText && !rangeText) return "";
  return `${EQUIP_RANGE_LABELS[key] || key}: ${baseText}${rangeText ? ` (${rangeText})` : ""}`;
}

function equipRangeRows(item) {
  const ranges = item?.equipStatRanges || {};
  return EQUIP_RANGE_PRIORITY
    .filter(key => ranges[key])
    .map(key => equipRangeLine(key, ranges[key]))
    .filter(Boolean);
}

function equipRangeRowsHtml(item) {
  const rows = equipRangeRows(item);
  if (!rows.length) return "";
  return `<div class="equipRangeLines">${rows.map(row => `<p>${escapeHtml(row)}</p>`).join("")}</div>`;
}

function shorten(value, size) {
  const text = String(value || "").replace(/\s+/g, " ");
  return text.length > size ? text.slice(0, size - 1) + "…" : text;
}

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function npcForQuest(quest) {
  return [quest.startNpc, quest.endNpc].find(npc => showIndexRecord(npc, "npc")) || null;
}

function questNpcThumb(quest, className) {
  const npc = npcForQuest(quest);
  return assetImage(npc?.image, npc?.name || quest.name, "任", className);
}

function npcLocationText(npc) {
  if (!npc) return "";
  if (state.showUnnamedIndex && npc.locationText) return npc.locationText;
  const maps = state.showUnnamedIndex ? (npc.maps || []) : visibleIndexRows(npc.maps || [], "map");
  return maps.map(map => map.label || map.name || map.id).filter(Boolean).join("、");
}

function npcMeta(npc, fallback = "NPC") {
  const parts = [];
  const location = npcLocationText(npc);
  if (location) parts.push(location);
  if (state.showIds && npc?.id) parts.push(`ID ${npc.id}`);
  return parts.join(" · ") || fallback;
}

function npcStatCell(label, npc) {
  if (!npc) {
    return `<div class="statCell"><span>${escapeHtml(label)}</span><strong>自動/未知</strong></div>`;
  }
  return `
    <div class="statCell npcStatCell">
      <span>${escapeHtml(label)}</span>
      <div class="npcStatBody">
        ${assetImage(npc.image, npc.name, "人", "npcStatIcon")}
        <div class="npcStatText">
          <strong>${escapeHtml(npc.name)}${idMeta(npc.id)}</strong>
          <em>${escapeHtml(npcMeta(npc, "所在地未知"))}</em>
        </div>
      </div>
    </div>
  `;
}

function isUnnamedIndexRecord(record, type = "") {
  if (!record) return false;
  if (record.unnamed) return true;
  const id = record.id ?? "";
  const name = String(record.name || record.label || "");
  if (type === "item") return !name || name === `未命名道具 ${id}` || /^未命名道具\s+\d+$/.test(name);
  if (type === "monster") return !name || name === `怪物 ${id}` || /^怪物\s+\d+$/.test(name) || /^未命名怪物\s+\d+$/.test(name);
  if (type === "npc") return !name || name === `NPC ${id}` || /^未命名NPC\s+\d+$/.test(name);
  if (type === "map") return !name || name === `未命名地圖 ${id}` || /^未命名地圖\s+\d+$/.test(name);
  if (type === "quest") return !name || name === `任務 ${id}` || /^任務\s+\d+$/.test(name) || /^未命名任務\s+\d+$/.test(name);
  return /^未命名/.test(name) || /^怪物\s+\d+$/.test(name) || /^NPC\s+\d+$/.test(name);
}

function npcOnlyUnnamedMaps(npc) {
  const maps = npc?.maps || [];
  return maps.length > 0 && maps.every(map => isUnnamedIndexRecord(map, "map"));
}

function mainQuestNpcBlocked(npc) {
  return Boolean(npc) && (isUnnamedIndexRecord(npc, "npc") || npcOnlyUnnamedMaps(npc));
}

function showIndexRecord(record, type = "") {
  return state.showUnnamedIndex || !isUnnamedIndexRecord(record, type);
}

function visibleIndexRows(rows = [], type = "") {
  return rows.filter(row => showIndexRecord(row, type));
}

function hasUnnamedTextRefs(quest) {
  const refs = quest.textRefs || quest.refs || {};
  return (refs.items || []).some(item => isUnnamedIndexRecord(item, "item"))
    || (refs.monsters || []).some(monster => isUnnamedIndexRecord(monster, "monster"))
    || (refs.npcs || []).some(npc => isUnnamedIndexRecord(npc, "npc"))
    || (refs.maps || []).some(map => isUnnamedIndexRecord(map, "map"));
}

function questHiddenByUnnamedIndex(quest) {
  if (state.showUnnamedIndex) return false;
  if (mainQuestNpcBlocked(quest.startNpc) || mainQuestNpcBlocked(quest.endNpc)) return true;
  const requirements = [quest.startRequirements, quest.completeRequirements].filter(Boolean);
  if (requirements.some(group => mainQuestNpcBlocked(group.npc))) return true;
  if (requirements.some(group => (group.quests || []).some(row => isUnnamedIndexRecord(row, "quest")))) return true;
  if (requirements.some(group => (group.items || []).some(row => isUnnamedIndexRecord(row, "item")))) return true;
  if (requirements.some(group => (group.monsters || []).some(row => isUnnamedIndexRecord(row, "monster")))) return true;
  if (hasUnnamedTextRefs(quest)) return true;
  return false;
}

function levelText(quest) {
  if (quest.minLevel && quest.maxLevel) return `Lv.${quest.minLevel}-${quest.maxLevel}`;
  if (quest.minLevel) return `Lv.${quest.minLevel}+`;
  if (quest.maxLevel) return `Lv.${quest.maxLevel} 以下`;
  return "無等級限制";
}

function levelMatches(quest) {
  const level = Number(quest.minLevel || 0);
  const minLevel = questLevelFilterValue(state.levelMin);
  const maxLevel = questLevelFilterValue(state.levelMax);
  if (minLevel !== null && level < minLevel) return false;
  if (maxLevel !== null && level > maxLevel) return false;
  return true;
}

function searchableText(quest) {
  const reqs = [quest.startRequirements, quest.completeRequirements].filter(Boolean);
  const acts = [quest.startRewards, quest.completeRewards].filter(Boolean);
  const reqItems = visibleIndexRows(reqs.flatMap(row => row.items || []), "item");
  const reqMobs = visibleIndexRows(reqs.flatMap(row => row.monsters || []), "monster");
  const reqQuests = visibleIndexRows(reqs.flatMap(row => row.quests || []), "quest");
  const reqNpcs = visibleIndexRows(reqs.map(row => row.npc).filter(Boolean), "npc");
  const rewardItems = visibleIndexRows(acts.flatMap(row => row.items || []), "item");
  const dependentQuests = visibleIndexRows(quest.dependentQuests || [], "quest");
  const refs = quest.refs || {};
  const allNpcs = visibleIndexRows([quest.startNpc, quest.endNpc, ...reqNpcs, ...(refs.npcs || [])].filter(Boolean), "npc");
  const linkedQuestNpcs = [quest.nextQuest, ...dependentQuests, ...reqQuests]
    .flatMap(row => [row?.startNpc, row?.endNpc])
    .filter(Boolean)
    .filter(row => showIndexRecord(row, "npc"));
  return [
    quest.id,
    quest.name,
    quest.category,
    quest.parent,
    ...[...allNpcs, ...linkedQuestNpcs].flatMap(npc => [
      npc.id,
      npc.name,
      npc.locationText,
      ...(npc.maps || []).flatMap(map => [map.id, map.name, map.street, map.label]),
    ]),
    showIndexRecord(quest.nextQuest, "quest") ? quest.nextQuest?.name : "",
    showIndexRecord(quest.nextQuest, "quest") ? quest.nextQuest?.id : "",
    ...dependentQuests.flatMap(row => [row.id, row.name, row.category, row.parent]),
    ...(quest.texts || []).map(row => row.text),
    ...reqItems.flatMap(item => [item.id, item.name, item.category]),
    ...rewardItems.flatMap(item => [item.id, item.name, item.category]),
    ...reqMobs.flatMap(monster => [monster.id, monster.name]),
    ...reqQuests.flatMap(row => [row.id, row.name]),
    ...visibleIndexRows(refs.items || [], "item").flatMap(item => [item.id, item.name]),
    ...visibleIndexRows(refs.monsters || [], "monster").flatMap(monster => [monster.id, monster.name]),
    ...visibleIndexRows(refs.maps || [], "map").flatMap(map => [map.id, map.name, map.street]),
  ].map(norm).join(" ");
}

function filteredQuests() {
  const q = norm(state.query);
  return (db.quests || []).filter(quest => {
    if (questHiddenByUnnamedIndex(quest)) return false;
    if (state.category && quest.category !== state.category) return false;
    if (!levelMatches(quest)) return false;
    const searchText = state.nameOnlySearch ? norm(quest.name) : searchableText(quest);
    if (q && !searchText.includes(q)) return false;
    return true;
  }).sort(compareQuests);
}

function questById(questId) {
  return (db.quests || []).find(quest => String(quest.id) === String(questId));
}

function questMinLevel(quest) {
  const level = Number(quest.minLevel);
  return Number.isFinite(level) && level > 0 ? level : null;
}

function compareQuests(a, b) {
  const categoryOrderDiff = Number(a.categoryOrder || 9999) - Number(b.categoryOrder || 9999);
  if (categoryOrderDiff) return categoryOrderDiff;
  const categoryDiff = String(a.category || "").localeCompare(String(b.category || ""), "zh-Hant");
  if (categoryDiff) return categoryDiff;
  const aLevel = questMinLevel(a);
  const bLevel = questMinLevel(b);
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
  if (nameDiff) return nameDiff;
  const orderDiff = Number(a.order || 999999) - Number(b.order || 999999);
  if (orderDiff) return orderDiff;
  return Number(a.id) - Number(b.id);
}

function populateFilters() {
  const categories = db.filters?.questCategories || [];
  els.category.innerHTML = `
    <option value="">全部分類</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
  `;
}

function syncControls() {
  els.search.value = state.query;
  if (els.nameOnlySearch) els.nameOnlySearch.checked = state.nameOnlySearch;
  els.category.value = state.category;
  state.category = els.category.value;
  if (els.levelMin) els.levelMin.value = state.levelMin || "";
  if (els.levelMax) els.levelMax.value = state.levelMax || "";
}

function clearSearchFilters() {
  state.preserveSelectedDetail = false;
  state.query = "";
  state.category = "";
  state.levelMin = "";
  state.levelMax = "";
  state.nameOnlySearch = false;
  state.showUnnamedIndex = false;
  writeCookie("ms_quest_category", "");
  writeCookie("ms_quest_level_min", "");
  writeCookie("ms_quest_level_max", "");
  writeCookie("ms_quest_name_only_search", "");
  saveBool("ms_quest_show_unnamed_index", false);
  if (els.search) els.search.value = "";
  syncControls();
  render();
}

function updateToggles() {
  if (els.nameOnlySearch && els.nameOnlySearchControl) {
    els.nameOnlySearch.checked = state.nameOnlySearch;
    els.nameOnlySearchControl.classList.toggle("active", state.nameOnlySearch);
  }
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
  if (els.unnamedIndexToggle) {
    els.unnamedIndexToggle.setAttribute("aria-pressed", String(state.showUnnamedIndex));
    els.unnamedIndexToggle.textContent = state.showUnnamedIndex ? "隱藏未命名索引" : "顯示未命名索引";
  }
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
  const rows = filteredQuests();
  const pinned = favoritePinnedRows(rows, db.quests || [], quest => quest.id, compareQuests, 900);
  if (!pinned.rows.some(quest => String(quest.id) === String(state.selectedId))) {
    const preserved = state.preserveSelectedDetail && questById(state.selectedId);
    if (!preserved) state.selectedId = pinned.rows[0]?.id || null;
  }
  els.count.textContent = `${pinned.total.toLocaleString()} 個`;
  const visibleRows = pinned.rows;
  const limitNote = pinned.total > visibleRows.length
    ? `<div class="listLimit">已顯示前 ${visibleRows.length.toLocaleString()} 個</div>`
    : "";
  els.list.innerHTML = visibleRows.map(quest => {
    const npc = npcForQuest(quest);
    const npcLine = npc ? `${npc.name}${npc.locationText ? ` · ${shorten(npc.locationText, 36)}` : ""}` : (quest.parent || "任務");
    return `
      <div class="favoriteRowShell">
        ${favoriteButton(quest.id, quest.name)}
        <button class="monsterRow questIndexRow ${String(quest.id) === String(state.selectedId) ? "active" : ""}" data-id="${quest.id}">
          ${questNpcThumb(quest, "questGlyph")}
          <span class="rowText">
            <strong>${escapeHtml(quest.name)}</strong>
            <span class="rowMeta">${escapeHtml(quest.category)} · ${escapeHtml(levelText(quest))}${idMeta(quest.id)}</span>
            <em>${escapeHtml(npcLine)}</em>
          </span>
        </button>
      </div>
    `;
  }).join("") + limitNote;
}

function questRewardCount(quest) {
  const complete = quest.completeRewards || {};
  return visibleIndexRows(complete.items || [], "item").filter(item => item.action === "give").length;
}

function selectedQuest() {
  const rows = filteredQuests();
  const preserved = state.preserveSelectedDetail ? questById(state.selectedId) : null;
  return (preserved && !questHiddenByUnnamedIndex(preserved) && preserved)
    || (state.favoriteIds.has(String(state.selectedId)) && questById(state.selectedId))
    || rows.find(quest => String(quest.id) === String(state.selectedId))
    || rows[0];
}

function renderDetail() {
  const quest = selectedQuest();
  if (!quest) {
    els.detail.innerHTML = `<div class="empty">找不到符合的任務</div>`;
    return;
  }
  els.detail.innerHTML = `
    <section class="monsterHero questHero">
      ${questNpcThumb(quest, "questMark")}
      <div class="heroText">
        <h2>${escapeHtml(quest.name)}</h2>
        <p>${escapeHtml(quest.category)} · ${escapeHtml(levelText(quest))}${idMeta(quest.id)}${quest.parent ? ` · ${escapeHtml(quest.parent)}` : ""}${npcForQuest(quest) ? ` · ${escapeHtml(npcForQuest(quest).name)}` : ""}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${formatNumber(totalRequirementCount(quest))}</strong><span>需求</span></div>
        <div class="heroCounter"><strong>${formatNumber(totalRewardCount(quest))}</strong><span>獎勵</span></div>
      </div>
    </section>
    ${renderQuestTexts(quest)}
    ${renderQuestMeta(quest)}
    ${renderRequirements("接取條件", quest.startRequirements)}
    ${renderRequirements("完成條件", quest.completeRequirements)}
    ${renderRewards("接取時給予", quest.startRewards)}
    ${renderRewards("完成獎勵", quest.completeRewards, quest.nextQuest)}
    ${renderRefs(quest)}
    ${renderContinuationQuests(quest)}
  `;
}

function totalRequirementCount(quest) {
  return countRequirementGroup(quest.startRequirements) + countRequirementGroup(quest.completeRequirements);
}

function countRequirementGroup(group = {}) {
  return visibleIndexRows(group.items || [], "item").length
    + visibleIndexRows(group.monsters || [], "monster").length
    + visibleIndexRows(group.quests || [], "quest").length;
}

function totalRewardCount(quest) {
  const acts = [quest.startRewards, quest.completeRewards].filter(Boolean);
  return acts.reduce((sum, act) => {
    return sum + (act.exp ? 1 : 0) + (act.money ? 1 : 0) + (act.pop ? 1 : 0) + (act.nextQuest ? 1 : 0) + visibleIndexRows(act.items || [], "item").filter(item => item.action === "give").length;
  }, 0);
}

function renderQuestTexts(quest) {
  const rows = quest.texts || [];
  if (!rows.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>任務摘要</h3>
        <span>${rows.length.toLocaleString()} 段</span>
      </div>
      <div class="textLines">
        ${rows.map(row => `
          <article class="textLine">
            <strong>${escapeHtml(row.label)}</strong>
            <p>${escapeHtml(row.text)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderQuestMeta(quest) {
  const startNpc = showIndexRecord(quest.startNpc, "npc") ? quest.startNpc : null;
  const endNpc = showIndexRecord(quest.endNpc, "npc") ? quest.endNpc : null;
  const rows = [
    ["分類", quest.category],
    ["任務線", quest.parent || "無"],
    ["等級", levelText(quest)],
  ];
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>任務資訊</h3>
        <span>${rows.length.toLocaleString()} 欄</span>
      </div>
      <div class="statsGrid">
        ${rows.map(([label, value]) => `<div class="statCell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
        ${npcStatCell("接取 NPC", startNpc)}
        ${npcStatCell("完成 NPC", endNpc)}
      </div>
    </section>
  `;
}

function renderRequirements(title, group = {}) {
  const parts = [];
  const npc = showIndexRecord(group.npc, "npc") ? group.npc : null;
  const items = visibleIndexRows(group.items || [], "item");
  const monsters = visibleIndexRows(group.monsters || [], "monster");
  if (group.minLevel || group.maxLevel || npc || group.jobs?.length) {
    parts.push(`
      <div class="requirementGroup">
        <strong>基本條件</strong>
        <div class="statsGrid compactStats">
          ${npc ? npcStatCell("NPC", npc) : ""}
          ${(group.minLevel || group.maxLevel) ? `<div class="statCell"><span>等級</span><strong>${escapeHtml(levelText({ minLevel: group.minLevel, maxLevel: group.maxLevel }))}</strong></div>` : ""}
          ${group.jobs?.length ? `<div class="statCell"><span>職業</span><strong>${escapeHtml(formatJobs(group.jobs))}</strong></div>` : ""}
        </div>
      </div>
    `);
  }
  const quests = visibleIndexRows(group.quests || [], "quest");
  if (quests.length) {
    parts.push(`<div class="requirementGroup"><strong>前置任務</strong><div class="linkGrid">${quests.map(questLink).join("")}</div></div>`);
  }
  if (items.length) {
    parts.push(`<div class="requirementGroup"><strong>需求道具</strong><div class="linkGrid">${items.map(itemLink).join("")}</div></div>`);
  }
  if (monsters.length) {
    parts.push(`<div class="requirementGroup"><strong>需求怪物</strong><div class="linkGrid">${monsters.map(monsterLink).join("")}</div></div>`);
  }
  if (!parts.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>${escapeHtml(title)}</h3>
        <span>${countRequirementGroup(group).toLocaleString()} 項</span>
      </div>
      <div class="questGroups">${parts.join("")}</div>
    </section>
  `;
}

function formatJobs(jobs) {
  if (!jobs?.length) return "不限";
  const labels = new Set();
  jobs.forEach(job => {
    const n = Number(job);
    if (n === 0) labels.add("初心者");
    else if (n >= 100 && n < 200) labels.add("劍士");
    else if (n >= 200 && n < 300) labels.add("法師");
    else if (n >= 300 && n < 400) labels.add("弓手");
    else if (n >= 400 && n < 500) labels.add("盜賊");
    else if (n >= 500 && n < 600) labels.add("海盜");
    else if (n >= 1000 && n < 2000) labels.add("皇家騎士團");
    else if (n >= 2000) labels.add("英雄");
    else labels.add(String(n));
  });
  return [...labels].join(" / ");
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

function renderRewards(title, act = {}, nextQuest = null) {
  const visibleItems = visibleIndexRows(act.items || [], "item");
  const rewards = visibleItems.filter(item => item.action === "give");
  const removes = visibleItems.filter(item => item.action === "remove");
  const visibleNextQuest = nextQuest && showIndexRecord(nextQuest, "quest") ? nextQuest : null;
  const stats = [];
  if (act.exp) stats.push(["經驗值", formatNumber(act.exp)]);
  if (act.money) stats.push(["楓幣", formatNumber(act.money)]);
  if (act.pop) stats.push(["人氣", `${Number(act.pop) > 0 ? "+" : ""}${formatNumber(act.pop)}`]);
  const parts = [];
  if (stats.length) {
    parts.push(`<div class="requirementGroup"><strong>數值獎勵</strong><div class="statsGrid compactStats">${stats.map(([label, value]) => `<div class="statCell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div></div>`);
  }
  if (rewards.length) {
    parts.push(`<div class="requirementGroup"><strong>獲得道具</strong><div class="dropsGrid questRewardGrid">${rewards.map(item => questRewardItemCard(item, "獲得")).join("")}</div></div>`);
  }
  if (removes.length) {
    parts.push(`<div class="requirementGroup"><strong>扣除道具</strong><div class="dropsGrid questRewardGrid">${removes.map(item => questRewardItemCard(item, "扣除")).join("")}</div></div>`);
  }
  if (visibleNextQuest) {
    parts.push(`<div class="requirementGroup"><strong>後續任務</strong><div class="linkGrid">${questLink(visibleNextQuest)}</div></div>`);
  }
  if (!parts.length) return "";
  const showToggle = rewards.length || removes.length;
  const toggle = showToggle
    ? `<button class="inlineToggleButton questRewardDetailsToggle" type="button" aria-pressed="${state.showQuestRewardItemDetails ? "true" : "false"}">${state.showQuestRewardItemDetails ? "隱藏道具詳細資訊" : "顯示道具詳細資訊"}</button>`
    : "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle dropSectionTitle">
        <h3>${escapeHtml(title)}</h3>
        <div class="sectionTitleActions">
          ${toggle}
          <span>${(stats.length + rewards.length + removes.length + (visibleNextQuest ? 1 : 0)).toLocaleString()} 項</span>
        </div>
      </div>
      <div class="questGroups">${parts.join("")}</div>
    </section>
  `;
}

function questRewardItemCard(item, actionLabel = "獎勵") {
  const metaParts = [];
  metaParts.push(`${actionLabel} ${formatNumber(item.count || 1)} 個`);
  if (item.choice) metaParts.push("自選");
  else if (item.random) metaParts.push("隨機");
  const jobLabel = formatQuestRewardJob(item.job);
  if (jobLabel) metaParts.push(`職業 ${jobLabel}`);
  metaParts.push(itemTypeText(item));
  if (state.showIds) metaParts.push(`ID ${item.id}`);
  const meta = metaParts.map(escapeHtml).join(" · ");
  const requirementRows = equipRequirementRowsHtml(item);
  const rangeRows = equipRangeRowsHtml(item);
  const upgradeRows = equipUpgradeRowsHtml(item);
  const equipmentDetails = `${requirementRows}${rangeRows}${upgradeRows}`;
  const fallbackDescription = item.desc ? `<p>${escapeHtml(shorten(item.desc, 92))}</p>` : "";
  const detailHtml = state.showQuestRewardItemDetails
    ? `<span>${meta}</span>${equipmentDetails || fallbackDescription}`
    : "";
  return `
    <a class="itemCard itemLinkCard ${state.showQuestRewardItemDetails ? "" : "compactDropItemCard"}" href="${itemUrl(item.id)}">
      ${assetImage(item.image, item.name, String(item.name || "?").slice(0, 1), "itemIcon")}
      <div class="itemText">
        <strong>${escapeHtml(item.name)}</strong>
        ${detailHtml}
      </div>
    </a>
  `;
}

function renderContinuationQuests(quest) {
  const rows = visibleIndexRows(quest.dependentQuests || [], "quest");
  if (!rows.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>接續任務</h3>
        <span>${rows.length.toLocaleString()} 個</span>
      </div>
      <div class="questGroups">
        <div class="requirementGroup">
          <strong>以該任務為前置任務</strong>
          <div class="linkGrid">${rows.map(questLink).join("")}</div>
        </div>
      </div>
    </section>
  `;
}

function renderRefs(quest) {
  const refs = quest.refs || {};
  const npcs = visibleIndexRows(refs.npcs || [], "npc");
  const items = visibleIndexRows(refs.items || [], "item");
  const monsters = visibleIndexRows(refs.monsters || [], "monster");
  const maps = visibleIndexRows(refs.maps || [], "map");
  const parts = [];
  if (npcs.length) parts.push(`<div class="requirementGroup"><strong>相關 NPC</strong><div class="linkGrid">${npcs.map(npcChip).join("")}</div></div>`);
  if (items.length) parts.push(`<div class="requirementGroup"><strong>文字提及道具</strong><div class="linkGrid">${items.map(itemLink).join("")}</div></div>`);
  if (monsters.length) parts.push(`<div class="requirementGroup"><strong>文字提及怪物</strong><div class="linkGrid">${monsters.map(monsterLink).join("")}</div></div>`);
  if (maps.length) parts.push(`<div class="requirementGroup"><strong>文字提及地圖</strong><div class="linkGrid">${maps.map(mapChip).join("")}</div></div>`);
  if (!parts.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>相關索引</h3>
        <span>${parts.length.toLocaleString()} 類</span>
      </div>
      <div class="questGroups">${parts.join("")}</div>
    </section>
  `;
}

function itemLink(item) {
  const meta = [`${formatNumber(item.count || 1)} 個`];
  if (state.showIds) meta.push(`ID ${item.id}`);
  if (item.choice) meta.push("自選");
  else if (item.random) meta.push("隨機");
  const jobLabel = formatQuestRewardJob(item.job);
  if (jobLabel) meta.push(`職業 ${jobLabel}`);
  return `
    <a class="miniLink" href="${itemUrl(item.id)}">
      ${assetImage(item.image, item.name, item.name.slice(0, 1) || "?", "miniIcon")}
      <span><strong>${escapeHtml(item.name)}</strong><em>${escapeHtml(meta.join(" · "))}</em></span>
    </a>
  `;
}

function monsterLink(monster) {
  const meta = [];
  if (monster.count) meta.push(`${formatNumber(monster.count)} 隻`);
  if (state.showIds) meta.push(`ID ${monster.id}`);
  return `
    <a class="miniLink" href="${monsterUrl(monster.id)}">
      ${assetImage(monster.image, monster.name, monster.name.slice(0, 1) || "?", "miniIcon")}
      <span><strong>${escapeHtml(monster.name)}</strong><em>${escapeHtml(meta.join(" · ") || "怪物")}</em></span>
    </a>
  `;
}

function questLink(quest) {
  const npc = npcForQuest(quest);
  const meta = [];
  if (quest.requirementStage) meta.push(quest.requirementStage);
  if (quest.requiredStateLabel) meta.push(`需${quest.requiredStateLabel}`);
  if (!quest.requiredStateLabel && quest.stateLabel) meta.push(quest.stateLabel);
  if (npc?.name) meta.push(npc.name);
  if (state.showIds) meta.push(`ID ${quest.id}`);
  return `
    <a class="miniLink" href="${questUrl(quest.id)}">
      ${assetImage(npc?.image, npc?.name || quest.name, "任", "miniIcon")}
      <span><strong>${escapeHtml(quest.name)}</strong><em>${escapeHtml(meta.join(" · ") || "任務")}</em></span>
    </a>
  `;
}

function npcChip(npc) {
  return `
    <div class="miniLink staticMini">
      ${assetImage(npc.image, npc.name, "人", "miniIcon")}
      <span><strong>${escapeHtml(npc.name)}</strong><em>${escapeHtml(npcMeta(npc, "NPC"))}</em></span>
    </div>
  `;
}

function mapChip(map) {
  const meta = [map.street || "地圖"];
  if (state.showIds) meta.push(map.id);
  return `
    <div class="miniLink staticMini">
      <div class="miniIcon">圖</div>
      <span><strong>${escapeHtml(map.name)}</strong><em>${escapeHtml(meta.join(" · "))}</em></span>
    </div>
  `;
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
  saveBool("ms_quest_name_only_search", state.nameOnlySearch);
  render();
});

els.category.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.category = event.target.value;
  writeCookie("ms_quest_category", state.category);
  render();
});

function handleQuestLevelInput(key, event) {
  state.preserveSelectedDetail = false;
  state[key] = numericQuestLevelText(event.target.value);
  event.target.value = state[key];
  writeCookie(key === "levelMin" ? "ms_quest_level_min" : "ms_quest_level_max", state[key]);
  render();
}

els.levelMin.addEventListener("input", event => handleQuestLevelInput("levelMin", event));
els.levelMax.addEventListener("input", event => handleQuestLevelInput("levelMax", event));

els.clearFilters.addEventListener("click", clearSearchFilters);

els.unnamedIndexToggle.addEventListener("click", () => {
  state.showUnnamedIndex = !state.showUnnamedIndex;
  saveBool("ms_quest_show_unnamed_index", state.showUnnamedIndex);
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

els.detail.addEventListener("click", event => {
  const button = event.target.closest(".questRewardDetailsToggle");
  if (!button) return;
  state.showQuestRewardItemDetails = !state.showQuestRewardItemDetails;
  saveBool("ms_monster_drop_item_details", state.showQuestRewardItemDetails);
  renderDetail();
});

els.list.addEventListener("click", event => {
  const favorite = event.target.closest("[data-favorite-id]");
  if (favorite) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(favorite.dataset.favoriteId);
    return;
  }
  const button = event.target.closest(".questIndexRow");
  if (!button) return;
  state.preserveSelectedDetail = false;
  state.selectedId = button.dataset.id;
  setQuestUrl(state.selectedId);
  render();
});

applyTheme();
renderBuildMeta();
populateFilters();
syncControls();
bindSearchHistory();
render();
