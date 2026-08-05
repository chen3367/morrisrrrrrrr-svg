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
  showIds: cookieBool("ms_show_ids"),
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
  nameOnlySearch: document.getElementById("nameOnlySearch"),
  nameOnlySearchControl: document.getElementById("nameOnlySearchControl"),
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
  return `./items.html?item=${encodeURIComponent(itemId)}&showNoSource=1`;
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

function shorten(value, size) {
  const text = String(value || "").replace(/\s+/g, " ");
  return text.length > size ? text.slice(0, size - 1) + "…" : text;
}

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function npcForQuest(quest) {
  return quest.startNpc || quest.endNpc || null;
}

function questNpcThumb(quest, className) {
  const npc = npcForQuest(quest);
  return assetImage(npc?.image, npc?.name || quest.name, "任", className);
}

function npcLocationText(npc) {
  if (!npc) return "";
  if (npc.locationText) return npc.locationText;
  const maps = npc.maps || [];
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
    <div class="statCell">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(npc.name)}${idMeta(npc.id)}</strong>
      <em>${escapeHtml(npcMeta(npc, "所在地未知"))}</em>
    </div>
  `;
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
  const reqItems = reqs.flatMap(row => row.items || []);
  const reqMobs = reqs.flatMap(row => row.monsters || []);
  const reqQuests = reqs.flatMap(row => row.quests || []);
  const reqNpcs = reqs.map(row => row.npc).filter(Boolean);
  const rewardItems = acts.flatMap(row => row.items || []);
  const dependentQuests = quest.dependentQuests || [];
  const refs = quest.refs || {};
  const allNpcs = [quest.startNpc, quest.endNpc, ...reqNpcs, ...(refs.npcs || [])].filter(Boolean);
  const linkedQuestNpcs = [quest.nextQuest, ...dependentQuests, ...reqQuests]
    .flatMap(row => [row?.startNpc, row?.endNpc])
    .filter(Boolean);
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
    quest.nextQuest?.name,
    quest.nextQuest?.id,
    ...dependentQuests.flatMap(row => [row.id, row.name, row.category, row.parent]),
    ...(quest.texts || []).map(row => row.text),
    ...reqItems.flatMap(item => [item.id, item.name, item.category]),
    ...rewardItems.flatMap(item => [item.id, item.name, item.category]),
    ...reqMobs.flatMap(monster => [monster.id, monster.name]),
    ...reqQuests.flatMap(row => [row.id, row.name]),
    ...(refs.items || []).flatMap(item => [item.id, item.name]),
    ...(refs.monsters || []).flatMap(monster => [monster.id, monster.name]),
    ...(refs.maps || []).flatMap(map => [map.id, map.name, map.street]),
  ].map(norm).join(" ");
}

function filteredQuests() {
  const q = norm(state.query);
  return (db.quests || []).filter(quest => {
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

function compareQuests(a, b) {
  const categoryDiff = Number(a.categoryOrder || 9999) - Number(b.categoryOrder || 9999);
  if (categoryDiff) return categoryDiff;
  const orderDiff = Number(a.order || 999999) - Number(b.order || 999999);
  if (orderDiff) return orderDiff;
  const levelDiff = Number(a.minLevel || 9999) - Number(b.minLevel || 9999);
  if (levelDiff) return levelDiff;
  const nameDiff = String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant");
  if (nameDiff) return nameDiff;
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

function updateToggles() {
  if (els.nameOnlySearch && els.nameOnlySearchControl) {
    els.nameOnlySearch.checked = state.nameOnlySearch;
    els.nameOnlySearchControl.classList.toggle("active", state.nameOnlySearch);
  }
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
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
  if (!rows.some(quest => String(quest.id) === String(state.selectedId))) {
    const preserved = state.preserveSelectedDetail && questById(state.selectedId);
    if (!preserved) state.selectedId = rows[0]?.id || null;
  }
  els.count.textContent = `${rows.length.toLocaleString()} 個`;
  const visibleRows = rows.slice(0, 900);
  const limitNote = rows.length > visibleRows.length
    ? `<div class="listLimit">已顯示前 ${visibleRows.length.toLocaleString()} 個</div>`
    : "";
  els.list.innerHTML = visibleRows.map(quest => {
    const npc = npcForQuest(quest);
    const npcLine = npc ? `${npc.name}${npc.locationText ? ` · ${shorten(npc.locationText, 36)}` : ""}` : (quest.parent || "任務");
    return `
      <button class="monsterRow questIndexRow ${String(quest.id) === String(state.selectedId) ? "active" : ""}" data-id="${quest.id}">
        ${questNpcThumb(quest, "questGlyph")}
        <span class="rowText">
          <strong>${escapeHtml(quest.name)}</strong>
          <span class="rowMeta">${escapeHtml(quest.category)} · ${escapeHtml(levelText(quest))}${idMeta(quest.id)}</span>
          <em>${escapeHtml(npcLine)}</em>
        </span>
        <small>${questRewardCount(quest)}</small>
      </button>
    `;
  }).join("") + limitNote;
}

function questRewardCount(quest) {
  const complete = quest.completeRewards || {};
  return (complete.items || []).filter(item => item.action === "give").length;
}

function selectedQuest() {
  const rows = filteredQuests();
  return (state.preserveSelectedDetail && questById(state.selectedId))
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
    ${renderContinuationQuests(quest)}
    ${renderRequirements("接取條件", quest.startRequirements)}
    ${renderRequirements("完成條件", quest.completeRequirements)}
    ${renderRewards("接取時給予", quest.startRewards)}
    ${renderRewards("完成獎勵", quest.completeRewards, quest.nextQuest)}
    ${renderRefs(quest)}
  `;
}

function totalRequirementCount(quest) {
  return countRequirementGroup(quest.startRequirements) + countRequirementGroup(quest.completeRequirements);
}

function countRequirementGroup(group = {}) {
  return (group.items || []).length + (group.monsters || []).length + (group.quests || []).length;
}

function totalRewardCount(quest) {
  const acts = [quest.startRewards, quest.completeRewards].filter(Boolean);
  return acts.reduce((sum, act) => {
    return sum + (act.exp ? 1 : 0) + (act.money ? 1 : 0) + (act.pop ? 1 : 0) + (act.nextQuest ? 1 : 0) + (act.items || []).filter(item => item.action === "give").length;
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
        ${npcStatCell("接取 NPC", quest.startNpc)}
        ${npcStatCell("完成 NPC", quest.endNpc)}
      </div>
    </section>
  `;
}

function renderRequirements(title, group = {}) {
  const parts = [];
  if (group.minLevel || group.maxLevel || group.npc || group.jobs?.length) {
    parts.push(`
      <div class="requirementGroup">
        <strong>基本條件</strong>
        <div class="statsGrid compactStats">
          ${group.npc ? npcStatCell("NPC", group.npc) : ""}
          ${(group.minLevel || group.maxLevel) ? `<div class="statCell"><span>等級</span><strong>${escapeHtml(levelText({ minLevel: group.minLevel, maxLevel: group.maxLevel }))}</strong></div>` : ""}
          ${group.jobs?.length ? `<div class="statCell"><span>職業</span><strong>${escapeHtml(formatJobs(group.jobs))}</strong></div>` : ""}
        </div>
      </div>
    `);
  }
  if (group.quests?.length) {
    parts.push(`<div class="requirementGroup"><strong>前置任務</strong><div class="linkGrid">${group.quests.map(questLink).join("")}</div></div>`);
  }
  if (group.items?.length) {
    parts.push(`<div class="requirementGroup"><strong>需求道具</strong><div class="linkGrid">${group.items.map(itemLink).join("")}</div></div>`);
  }
  if (group.monsters?.length) {
    parts.push(`<div class="requirementGroup"><strong>需求怪物</strong><div class="linkGrid">${group.monsters.map(monsterLink).join("")}</div></div>`);
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

function renderRewards(title, act = {}, nextQuest = null) {
  const rewards = (act.items || []).filter(item => item.action === "give");
  const removes = (act.items || []).filter(item => item.action === "remove");
  const stats = [];
  if (act.exp) stats.push(["經驗值", formatNumber(act.exp)]);
  if (act.money) stats.push(["楓幣", formatNumber(act.money)]);
  if (act.pop) stats.push(["人氣", `${Number(act.pop) > 0 ? "+" : ""}${formatNumber(act.pop)}`]);
  const parts = [];
  if (stats.length) {
    parts.push(`<div class="requirementGroup"><strong>數值獎勵</strong><div class="statsGrid compactStats">${stats.map(([label, value]) => `<div class="statCell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div></div>`);
  }
  if (rewards.length) {
    parts.push(`<div class="requirementGroup"><strong>獲得道具</strong><div class="linkGrid">${rewards.map(itemLink).join("")}</div></div>`);
  }
  if (removes.length) {
    parts.push(`<div class="requirementGroup"><strong>扣除道具</strong><div class="linkGrid">${removes.map(itemLink).join("")}</div></div>`);
  }
  if (nextQuest) {
    parts.push(`<div class="requirementGroup"><strong>後續任務</strong><div class="linkGrid">${questLink(nextQuest)}</div></div>`);
  }
  if (!parts.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>${escapeHtml(title)}</h3>
        <span>${(stats.length + rewards.length + removes.length + (nextQuest ? 1 : 0)).toLocaleString()} 項</span>
      </div>
      <div class="questGroups">${parts.join("")}</div>
    </section>
  `;
}

function renderContinuationQuests(quest) {
  const rows = quest.dependentQuests || [];
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
  const parts = [];
  if (refs.npcs?.length) parts.push(`<div class="requirementGroup"><strong>相關 NPC</strong><div class="linkGrid">${refs.npcs.map(npcChip).join("")}</div></div>`);
  if (refs.items?.length) parts.push(`<div class="requirementGroup"><strong>文字提及道具</strong><div class="linkGrid">${refs.items.map(itemLink).join("")}</div></div>`);
  if (refs.monsters?.length) parts.push(`<div class="requirementGroup"><strong>文字提及怪物</strong><div class="linkGrid">${refs.monsters.map(monsterLink).join("")}</div></div>`);
  if (refs.maps?.length) parts.push(`<div class="requirementGroup"><strong>文字提及地圖</strong><div class="linkGrid">${refs.maps.map(mapChip).join("")}</div></div>`);
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
  if (item.random) meta.push("隨機");
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
