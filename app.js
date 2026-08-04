const db = window.MS_DROP_DB;
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

const DEFAULT_HIDDEN_CONTINENTS = new Set(["楓葉世界", "日本"]);
const EVENT_CONTINENTS = new Set(["楓葉世界"]);

function initialSelectedContinents() {
  const raw = cookieValue("ms_monster_continents");
  if (raw) return raw.split("|").map(value => value.trim()).filter(Boolean);
  const legacy = cookieValue("ms_monster_continent");
  return legacy ? [legacy] : [];
}

const state = {
  query: "",
  continents: initialSelectedContinents(),
  nameOnlySearch: cookieBool("ms_monster_name_only_search"),
  showUnknownContinents: cookieBool("ms_show_unknown_continents"),
  showUnnamedMapMonsters: initialShowUnnamedMapMonsters(),
  showUnnamedItems: cookieBool("ms_show_unnamed_items"),
  showIds: cookieBool("ms_show_ids"),
  theme: initialTheme(),
  settingsOpen: cookieBool("ms_settings_open"),
  selectedId: initialMonsterId(),
  accuracyOpen: cookieBool("ms_accuracy_open"),
  attackType: cookieValue("ms_accuracy_attack_type", "physical") === "magical" ? "magical" : "physical",
  characterLevel: positiveNumber(cookieValue("ms_accuracy_level", "50"), 50),
  mainStat: nonNegativeNumber(cookieValue("ms_accuracy_main", "100"), 100),
  luk: nonNegativeNumber(cookieValue("ms_accuracy_luk", "4"), 4),
};

const els = {
  search: document.getElementById("search"),
  continent: document.getElementById("continentFilter"),
  continentButton: document.getElementById("continentMenuButton"),
  continentOptions: document.getElementById("continentOptions"),
  continentClear: document.getElementById("continentClear"),
  nameOnlySearch: document.getElementById("nameOnlySearch"),
  nameOnlySearchControl: document.getElementById("nameOnlySearchControl"),
  unknownToggle: document.getElementById("unknownToggle"),
  unnamedMapToggle: document.getElementById("unnamedMapToggle"),
  unnamedToggle: document.getElementById("unnamedToggle"),
  idToggle: document.getElementById("idToggle"),
  themeToggle: document.getElementById("themeToggle"),
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  meta: document.getElementById("buildMeta"),
  list: document.getElementById("monsterList"),
  detail: document.getElementById("detail"),
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
  els.themeToggle.setAttribute("aria-pressed", String(isDark));
  els.themeToggle.textContent = isDark ? "白底模式" : "黑底模式";
  els.themeToggle.title = isDark ? "切換為白底" : "切換為黑底";
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

function initialMonsterId() {
  return new URLSearchParams(window.location.search).get("monster");
}

function initialShowUnnamedMapMonsters() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("showUnnamedMaps") === "1") return true;
  return cookieBool("ms_show_unnamed_map_monsters");
}

function setMonsterUrl(monsterId) {
  if (!monsterId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("monster", monsterId);
  if (state.showUnnamedMapMonsters) {
    url.searchParams.set("showUnnamedMaps", "1");
  } else {
    url.searchParams.delete("showUnnamedMaps");
  }
  window.history.replaceState(null, "", url);
}

function itemUrl(item) {
  const url = new URL("./items.html", window.location.href);
  url.searchParams.set("item", item.id);
  if (state.showUnnamedMapMonsters) url.searchParams.set("showUnnamedMaps", "1");
  return `${url.pathname.split("/").pop()}${url.search}`;
}

function questUrl(questId) {
  return `./quests.html?quest=${encodeURIComponent(questId)}`;
}

function questNpcImage(row, className = "sourceMonsterImage") {
  const npc = row.startNpc || row.endNpc || null;
  return assetImage(npc?.image, npc?.name || row.questName || "任務", "任", className);
}

function itemTypeText(item) {
  const parts = [item.category || item.kind || "其他"];
  if (item.subcategory && item.subcategory !== item.category) parts.push(item.subcategory);
  return parts.join(" · ");
}

const STAT_FIELDS = [
  ["level", "等級"],
  ["maxHP", "HP"],
  ["maxMP", "MP"],
  ["exp", "經驗值"],
  ["PADamage", "物攻"],
  ["PDDamage", "物防"],
  ["MADamage", "魔攻"],
  ["MDDamage", "魔防"],
  ["acc", "命中"],
  ["eva", "迴避"],
  ["speed", "移速"],
  ["pushed", "擊退"],
  ["bodyAttack", "碰撞", yesNo],
  ["firstAttack", "主動", yesNo],
  ["boss", "BOSS", yesNo],
  ["rareItemDropLevel", "稀有掉落"],
];

const ELEMENT_FIELDS = [
  ["fire", "火"],
  ["ice", "冰"],
  ["lightning", "雷"],
  ["poison", "毒"],
  ["holy", "聖"],
];

const ELEMENT_STATE_LABELS = {
  normal: "一般",
  resist: "抗性",
  weak: "弱點",
  immune: "免疫",
};

function norm(value) {
  return String(value || "").toLowerCase().trim();
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function filteredMonsters() {
  const q = norm(state.query);
  return db.monsters.filter(monster => {
    const visibleContinentOk = state.showUnknownContinents || hasKnownContinent(monster);
    const unnamedMapOk = state.showUnnamedMapMonsters || !onlyUnnamedMapMonster(monster);
    const continentOk = matchesSelectedContinents(monster);
    const drops = visibleDrops(monster);
    const queryOk = !q || (state.nameOnlySearch
      ? norm(monster.name).includes(q)
      :
      norm(monster.id).includes(q) ||
      norm(monster.name).includes(q) ||
      norm(elementalText(monster)).includes(q) ||
      norm(mesoSearchText(monster)).includes(q) ||
      monster.continents.some(continent => norm(continent).includes(q)) ||
      monster.maps.some(map => norm(map.id).includes(q) || norm(map.name).includes(q) || norm(map.street).includes(q)) ||
      (monster.questRequirements || []).some(row => norm(row.questId).includes(q) || norm(row.questName).includes(q) || norm(row.category).includes(q) || norm(row.parent).includes(q)) ||
      drops.some(item => norm(item.id).includes(q) || norm(item.name).includes(q)));
    return visibleContinentOk && unnamedMapOk && continentOk && queryOk;
  }).sort(compareMonsters);
}

function hasKnownContinent(monster) {
  return Boolean(monster.continents?.length);
}

function onlyUnnamedMapMonster(monster) {
  return Boolean(monster.onlyUnnamedMaps);
}

function hasDefaultHiddenContinent(monster) {
  const continents = (monster.continents || []).filter(Boolean);
  return continents.some(continent => DEFAULT_HIDDEN_CONTINENTS.has(continent));
}

function matchesSelectedContinents(monster) {
  const selected = state.continents || [];
  if (!selected.length) return !hasDefaultHiddenContinent(monster);
  return (monster.continents || []).some(continent => selected.includes(continent));
}

function isUnnamedItem(item) {
  return /^未命名道具\s+\d+$/.test(String(item.name || ""));
}

function visibleDrops(monster) {
  const drops = monster.drops || [];
  return state.showUnnamedItems ? drops : drops.filter(item => !isUnnamedItem(item));
}

function mesoSearchText(monster) {
  const meso = monster.mesoDrop;
  if (!meso) return "";
  return [
    "楓幣",
    "金幣",
    meso.min,
    meso.max,
    meso.totalMin,
    meso.totalMax,
    meso.piles,
    meso.sourceLabel,
  ].filter(value => value !== null && value !== undefined && value !== "").join(" ");
}

function hiddenUnnamedCount(monster) {
  return (monster.drops || []).filter(isUnnamedItem).length;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function assetImage(src, alt, fallback, className) {
  if (src) {
    return `<img class="${className} assetImage" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }
  return `<div class="${className}">${escapeHtml(fallback || "?")}</div>`;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : escapeHtml(value);
}

function formatKnownNumber(value) {
  if (value === null || value === undefined || value === "") return "未知";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : escapeHtml(value);
}

function formatDecimal(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "未知";
  const fixed = Math.abs(number) >= 100 ? number.toFixed(0) : number.toFixed(digits);
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "未知";
  return `${formatDecimal(number, 2)}%`;
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

function yesNo(value) {
  return Number(value) ? "是" : "否";
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function monsterLevel(monster) {
  const fromRoot = Number(monster?.level);
  if (Number.isFinite(fromRoot)) return fromRoot;
  const fromStats = Number(monster?.stats?.level);
  return Number.isFinite(fromStats) ? fromStats : null;
}

function monsterAvoid(monster) {
  const value = Number(monster?.stats?.eva);
  return Number.isFinite(value) ? value : null;
}

function compareMonsters(a, b) {
  const levelDiff = levelRank(a) - levelRank(b);
  if (levelDiff) return levelDiff;
  const nameDiff = String(a.name).localeCompare(String(b.name), "zh-Hant");
  if (nameDiff) return nameDiff;
  return Number(a.id) - Number(b.id);
}

function levelRank(monster) {
  const level = monsterLevel(monster);
  return Number.isFinite(level) ? level : 9999;
}

function continentText(monster) {
  if (!monster.continents.length) return "未知大陸";
  if (monster.continents.length <= 2) return monster.continents.join("、");
  return `${monster.continents.slice(0, 2).join("、")} +${monster.continents.length - 2}`;
}

function populateFilters() {
  const continents = [...(db.filters?.continents || [])].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const validContinents = new Set(continents);
  state.continents = (state.continents || []).filter(continent => validContinents.has(continent));
  els.continentOptions.innerHTML = `
    <button id="continentClear" class="multiSelectClear" type="button">清除選取</button>
    ${continents.map(continent => `
      <label class="multiSelectOption">
        <input type="checkbox" value="${escapeHtml(continent)}" />
        <span>${escapeHtml(continent)}${EVENT_CONTINENTS.has(continent) ? "（活動）" : ""}</span>
      </label>
    `).join("")}
  `;
  els.continentClear = document.getElementById("continentClear");
  syncContinentInputs();
}

function syncControls() {
  els.search.value = state.query;
  if (els.nameOnlySearch) els.nameOnlySearch.checked = state.nameOnlySearch;
  syncContinentInputs();
}

function updateNameOnlySearchControl() {
  if (!els.nameOnlySearch || !els.nameOnlySearchControl) return;
  els.nameOnlySearch.checked = state.nameOnlySearch;
  els.nameOnlySearchControl.classList.toggle("active", state.nameOnlySearch);
}

function selectedContinentValues() {
  return [...els.continentOptions.querySelectorAll('input[type="checkbox"]:checked')]
    .map(input => input.value)
    .filter(Boolean);
}

function saveSelectedContinents() {
  writeCookie("ms_monster_continents", (state.continents || []).join("|"));
  writeCookie("ms_monster_continent", "");
}

function syncContinentInputs() {
  if (!els.continentOptions) return;
  const selected = new Set(state.continents || []);
  els.continentOptions.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = selected.has(input.value);
  });
  updateContinentSummary();
}

function updateContinentSummary() {
  if (!els.continentButton) return;
  const selected = state.continents || [];
  if (!selected.length) {
    els.continentButton.textContent = "全部一般大陸";
  } else if (selected.length === 1) {
    els.continentButton.textContent = selected[0];
  } else {
    els.continentButton.textContent = `已選 ${selected.length} 個大陸`;
  }
}

function setContinentMenu(open) {
  if (!els.continentButton || !els.continentOptions) return;
  els.continentButton.setAttribute("aria-expanded", String(open));
  els.continentOptions.hidden = !open;
}

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function updateIdToggle() {
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
}

function updateUnknownToggle() {
  els.unknownToggle.setAttribute("aria-pressed", String(state.showUnknownContinents));
  els.unknownToggle.textContent = state.showUnknownContinents ? "隱藏未知大陸" : "顯示未知大陸";
}

function updateUnnamedMapToggle() {
  els.unnamedMapToggle.setAttribute("aria-pressed", String(state.showUnnamedMapMonsters));
  els.unnamedMapToggle.textContent = state.showUnnamedMapMonsters ? "隱藏未命名地圖怪物" : "顯示未命名地圖怪物";
}

function updateUnnamedToggle() {
  els.unnamedToggle.setAttribute("aria-pressed", String(state.showUnnamedItems));
  els.unnamedToggle.textContent = state.showUnnamedItems ? "隱藏未命名道具" : "顯示未命名道具";
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
  const rows = filteredMonsters();
  if (!rows.some(m => m.id === state.selectedId)) {
    state.selectedId = rows[0]?.id || null;
  }
  els.count.textContent = `${rows.length.toLocaleString()} 隻`;
  els.list.innerHTML = rows.slice(0, 500).map(monster => `
    <button class="monsterRow ${monster.id === state.selectedId ? "active" : ""}" data-id="${monster.id}">
      ${assetImage(monster.image, monster.name, monster.name.slice(0, 1), "rowMonsterImage")}
      <span class="rowText">
        <strong>${escapeHtml(monster.name)}</strong>
        <span class="rowMeta">${monster.level ? `Lv.${monster.level}` : "Lv.?"}${idMeta(monster.id)}</span>
        <em>${escapeHtml(continentText(monster))}</em>
      </span>
      <small>${visibleDrops(monster).length.toLocaleString()} 項</small>
    </button>
  `).join("");
}

function renderDetail() {
  const rows = filteredMonsters();
  const monster = rows.find(m => m.id === state.selectedId) || rows[0];
  if (!monster) {
    els.detail.innerHTML = `<div class="empty">找不到符合的怪物</div>`;
    return;
  }
  const drops = visibleDrops(monster);
  const hasMesoDrop = Boolean(monster.mesoDrop);
  const dropCount = drops.length + (hasMesoDrop ? 1 : 0);
  const hiddenUnnamed = state.showUnnamedItems ? 0 : hiddenUnnamedCount(monster);
  els.detail.innerHTML = `
    <section class="monsterHero">
      ${assetImage(monster.image, monster.name, monster.name.slice(0, 1), "monsterMark")}
      <div class="heroText">
        <h2>${escapeHtml(monster.name)}</h2>
        <p>${heroMeta(monster)}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${dropCount.toLocaleString()}</strong><span>掉落</span></div>
        <div class="heroCounter"><strong>${monster.maps.length.toLocaleString()}</strong><span>地圖</span></div>
      </div>
    </section>
    ${renderStats(monster)}
    ${renderElements(monster)}
    ${renderAccuracyCalculator(monster)}
    ${renderMaps(monster)}
    ${renderQuestRequirements(monster)}
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>掉落</h3>
        <span>${drops.length.toLocaleString()} 項道具${hasMesoDrop ? ` · 楓幣 ${formatMesoRange(monster.mesoDrop)}` : ""}${hiddenUnnamed ? `，隱藏 ${hiddenUnnamed.toLocaleString()} 項未命名` : ""}</span>
      </div>
      <div class="dropGroups">
        ${renderMesoDrop(monster)}
        ${renderDropGroups(drops)}
      </div>
    </section>
  `;
  bindAccuracyControls(monster);
}

function renderAccuracyCalculator(monster) {
  const result = calculateAccuracy(monster);
  const preview = result.available
    ? `目前 ${formatPercent(result.ratio)} · 100% 所需 ${formatDecimal(result.acc100, 2)}`
    : "缺少怪物等級或迴避資料";
  return `
    <section class="sectionBlock">
      <details class="accuracyPanel" ${state.accuracyOpen ? "open" : ""}>
        <summary>
          <span>
            <strong>命中率計算機</strong>
            <em>依目前選取怪物計算</em>
          </span>
          <small id="accuracySummary">${escapeHtml(preview)}</small>
        </summary>
        ${result.available ? `
          <div class="accuracyBody">
            <div class="accuracyForm">
              <label class="fieldControl">
                <span>角色等級</span>
                <input id="accuracyLevel" type="number" min="1" max="250" step="1" value="${escapeHtml(state.characterLevel)}" />
              </label>
              <div class="fieldControl">
                <span>攻擊類型</span>
                <div class="segmentedControl" role="group" aria-label="攻擊類型">
                  <button id="accuracyPhysical" type="button" class="${state.attackType === "physical" ? "active" : ""}" aria-pressed="${state.attackType === "physical"}">物理攻擊</button>
                  <button id="accuracyMagical" type="button" class="${state.attackType === "magical" ? "active" : ""}" aria-pressed="${state.attackType === "magical"}">魔法攻擊</button>
                </div>
              </div>
              <label class="fieldControl">
                <span id="accuracyMainLabel">${state.attackType === "magical" ? "智力 INT" : "面板命中 ACC"}</span>
                <input id="accuracyMain" type="number" min="0" max="9999" step="1" value="${escapeHtml(state.mainStat)}" />
              </label>
              <label class="fieldControl ${state.attackType === "magical" ? "" : "isHidden"}" id="accuracyLukField">
                <span>幸運 LUK</span>
                <input id="accuracyLuk" type="number" min="0" max="9999" step="1" value="${escapeHtml(state.luk)}" />
              </label>
            </div>
            <div class="statsGrid accuracyResults">
              <div class="statCell ${resultClass(result)}" id="accuracyHitRateCell"><span>命中率</span><strong id="accuracyHitRate">${formatPercent(result.ratio)}</strong></div>
              <div class="statCell"><span id="accuracyCurrentLabel">${state.attackType === "magical" ? "魔法命中判定" : "目前命中"}</span><strong id="accuracyCurrent">${formatDecimal(result.current, 2)}</strong></div>
              <div class="statCell"><span>100% 所需</span><strong id="accuracyFull">${formatDecimal(result.acc100, 2)}</strong></div>
              <div class="statCell"><span>1% 所需</span><strong id="accuracyMin">${formatDecimal(result.acc1, 2)}</strong></div>
              <div class="statCell"><span>還差</span><strong id="accuracyGap">${formatDecimal(result.gap, 2)}</strong></div>
              <div class="statCell"><span>等級差</span><strong id="accuracyDiff">${formatNumber(result.diff)}</strong></div>
            </div>
            <div class="formulaCards">
              ${renderAccuracyFormulaCard()}
            </div>
          </div>
        ` : `<div class="empty">這隻怪物缺少等級或迴避資料，無法計算命中率。</div>`}
      </details>
    </section>
  `;
}

function renderAccuracyFormulaCard() {
  if (state.attackType === "magical") {
    return `
      <article class="formulaCard">
        <strong>魔法命中率計算公式</strong>
        <p>法師技能攻擊怪物時不使用物理命中公式，而是採用特殊魔法命中判定。</p>
        <code>魔法命中 = floor(智力 ÷ 10) + floor(幸運 ÷ 10)</code>
        <code>100% 所需 = floor((怪物迴避 + 1) × (1 + 0.04 × 等級差))</code>
        <code>1% 所需 = round(0.41 × 100% 所需)</code>
        <p>上述魔法命中輸入值都會無條件向下取整。</p>
      </article>
    `;
  }
  return `
    <article class="formulaCard">
      <strong>物理命中率計算公式</strong>
      <p>使用角色面板命中、怪物迴避，以及等級差計算。等級差低於 0 時視為 0。</p>
      <code>100% 所需 = (55.2 + 2.15 × 等級差) × 怪物迴避 ÷ 15</code>
      <p>不含裝備提供的命中值。</p>
      <code>初心者 / 劍士 / 法師 = floor(敏捷 × 0.8 + 幸運 × 0.5)</code>
      <code>盜賊 / 弓箭手 / 海盜 = floor(敏捷 × 0.6 + 幸運 × 0.3)</code>
      <p>上述基礎命中值會無條件向下取整。</p>
    </article>
  `;
}

function calculateAccuracy(monster) {
  const monLevel = monsterLevel(monster);
  const monAvoid = monsterAvoid(monster);
  if (!Number.isFinite(monLevel) || !Number.isFinite(monAvoid)) {
    return { available: false, ratio: null, acc100: null };
  }
  const charLevel = positiveNumber(state.characterLevel, 1);
  const mainStat = nonNegativeNumber(state.mainStat, 0);
  const luk = nonNegativeNumber(state.luk, 0);
  const diff = Math.max(0, monLevel - charLevel);
  let current = mainStat;
  let acc100 = 0;
  let acc1 = 0;
  let ratio = 100;

  if (monAvoid > 0 && state.attackType === "magical") {
    current = Math.floor(mainStat / 10) + Math.floor(luk / 10);
    acc100 = Math.floor((monAvoid + 1.0) * (1.0 + (0.04 * diff)));
    acc1 = Math.round(0.41 * acc100);
    const denominator = acc100 - acc1 + 1;
    const accPart = denominator <= 0 ? 1 : Math.min(1, (current - acc1 + 1) / denominator);
    ratio = ((-0.7011618132 * Math.pow(accPart, 2)) + (1.702139835 * accPart)) * 100;
  } else if (monAvoid > 0) {
    acc100 = (55.2 + 2.15 * diff) * (monAvoid / 15.0);
    acc1 = acc100 * 0.5 + 1;
    ratio = 100 * ((current - (acc100 * 0.5)) / (acc100 * 0.5));
  }

  ratio = Math.max(0, Math.min(100, ratio));
  return {
    available: true,
    monLevel,
    monAvoid,
    charLevel,
    diff,
    current,
    acc100,
    acc1,
    ratio,
    gap: Math.max(0, acc100 - current),
  };
}

function resultClass(result) {
  if (!result.available) return "";
  if (result.ratio >= 100) return "resultGood";
  if (result.ratio >= 70) return "resultWarn";
  return "resultBad";
}

function bindAccuracyControls(monster) {
  const details = document.querySelector(".accuracyPanel");
  details?.addEventListener("toggle", event => {
    state.accuracyOpen = event.currentTarget.open;
    saveBool("ms_accuracy_open", state.accuracyOpen);
  });

  const levelInput = document.getElementById("accuracyLevel");
  const mainInput = document.getElementById("accuracyMain");
  const lukInput = document.getElementById("accuracyLuk");
  const physicalButton = document.getElementById("accuracyPhysical");
  const magicalButton = document.getElementById("accuracyMagical");

  levelInput?.addEventListener("input", event => {
    state.characterLevel = positiveNumber(event.target.value, state.characterLevel);
    writeCookie("ms_accuracy_level", state.characterLevel);
    updateAccuracyPanel(monster);
  });
  mainInput?.addEventListener("input", event => {
    state.mainStat = nonNegativeNumber(event.target.value, state.mainStat);
    writeCookie("ms_accuracy_main", state.mainStat);
    updateAccuracyPanel(monster);
  });
  lukInput?.addEventListener("input", event => {
    state.luk = nonNegativeNumber(event.target.value, state.luk);
    writeCookie("ms_accuracy_luk", state.luk);
    updateAccuracyPanel(monster);
  });
  physicalButton?.addEventListener("click", () => {
    if (state.attackType === "physical") return;
    state.attackType = "physical";
    writeCookie("ms_accuracy_attack_type", state.attackType);
    renderDetail();
  });
  magicalButton?.addEventListener("click", () => {
    if (state.attackType === "magical") return;
    state.attackType = "magical";
    writeCookie("ms_accuracy_attack_type", state.attackType);
    renderDetail();
  });
}

function updateAccuracyPanel(monster) {
  const result = calculateAccuracy(monster);
  if (!result.available) return;
  const hitClass = resultClass(result);
  const hitCell = document.getElementById("accuracyHitRateCell");
  if (hitCell) hitCell.className = `statCell ${hitClass}`;
  setText("accuracySummary", `目前 ${formatPercent(result.ratio)} · 100% 所需 ${formatDecimal(result.acc100, 2)}`);
  setText("accuracyHitRate", formatPercent(result.ratio));
  setText("accuracyCurrent", formatDecimal(result.current, 2));
  setText("accuracyFull", formatDecimal(result.acc100, 2));
  setText("accuracyMin", formatDecimal(result.acc1, 2));
  setText("accuracyGap", formatDecimal(result.gap, 2));
  setText("accuracyDiff", formatNumber(result.diff));
  setText("accuracyCurrentLabel", state.attackType === "magical" ? "魔法命中判定" : "目前命中");
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function elementalText(monster) {
  const values = monster.elemental?.values || {};
  const parts = ELEMENT_FIELDS.map(([key, label]) => `${label}${ELEMENT_STATE_LABELS[values[key] || "normal"]}`);
  if (hasOwn(monster.stats, "undead")) {
    parts.push(Number(monster.stats.undead) ? "不死是 可被群體治癒攻擊" : "不死否");
  }
  if (monster.elemental?.summary) parts.push(monster.elemental.summary);
  return parts.join(" ");
}

function heroMeta(monster) {
  const parts = [];
  if (state.showIds) parts.push(`ID ${monster.id}`);
  if (monster.level) parts.push(`Lv.${monster.level}`);
  if (hasOwn(monster.stats, "maxHP")) parts.push(`HP ${formatNumber(monster.stats.maxHP)}`);
  if (hasOwn(monster.stats, "exp")) parts.push(`經驗值 ${formatNumber(monster.stats.exp)}`);
  return parts.map(escapeHtml).join(" · ");
}

function renderStats(monster) {
  const rows = STAT_FIELDS.map(([key, label, formatter]) => {
    const raw = key === "level" ? monster.level : monster.stats[key];
    if (key !== "level" && !hasOwn(monster.stats, key)) return "";
    if (raw === null || raw === undefined || raw === "") return "";
    const value = formatter ? formatter(raw) : formatNumber(raw);
    return `<div class="statCell"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
  }).filter(Boolean);
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>怪物數值</h3>
        <span>${rows.length.toLocaleString()} 欄</span>
      </div>
      <div class="statsGrid">${rows.join("") || `<div class="empty">沒有數值資料</div>`}</div>
    </section>
  `;
}

function renderElements(monster) {
  const elemental = monster.elemental || {};
  const values = elemental.values || {};
  const isUndead = Number(monster.stats?.undead) ? true : false;
  const hasUndead = hasOwn(monster.stats, "undead");
  const notable = ELEMENT_FIELDS.filter(([key]) => (values[key] || "normal") !== "normal").length + (isUndead ? 1 : 0);
  const sourceText = elemental.source === "description" ? "圖鑑描述" : "怪物資料";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>屬性抗性</h3>
        <span>${notable ? `${notable} 項特殊屬性` : "一般"}</span>
      </div>
      <div class="elementGrid">
        ${ELEMENT_FIELDS.map(([key, label]) => elementCell(label, values[key] || "normal")).join("")}
        ${hasUndead ? undeadCell(isUndead) : ""}
      </div>
      ${elemental.source !== "none" ? `<p class="elementSource">來源：${escapeHtml(sourceText)}</p>` : ""}
    </section>
  `;
}

function elementCell(label, state) {
  const safeState = ELEMENT_STATE_LABELS[state] ? state : "normal";
  return `
    <div class="elementCell ${safeState}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(ELEMENT_STATE_LABELS[safeState])}</strong>
    </div>
  `;
}

function undeadCell(isUndead) {
  return `
    <div class="elementCell ${isUndead ? "undead weak" : ""}">
      <span>不死</span>
      <strong>${isUndead ? "是" : "否"}</strong>
      ${isUndead ? `<em>可被群體治癒攻擊</em>` : ""}
    </div>
  `;
}

function renderMaps(monster) {
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>出現地圖</h3>
        <span>${monster.maps.length.toLocaleString()} 張</span>
      </div>
      <div class="mapGrid">
        ${monster.maps.map(mapCard).join("") || `<div class="empty">沒有地圖資料</div>`}
      </div>
    </section>
  `;
}

function mapCard(map) {
  const meta = [];
  if (map.regionName) meta.push(map.regionName);
  if (map.areaName && map.areaName !== map.regionName) meta.push(map.areaName);
  if (map.street && !meta.includes(map.street)) meta.push(map.street);
  if (!meta.length) meta.push("未知區域");
  if (state.showIds) meta.push(map.id);
  if (state.showIds && map.regionKey) meta.push(map.regionKey);
  return `
    <article class="mapCard ${map.markImage ? "withMapMark" : ""}">
      ${map.markImage ? `<img class="mapMarkImage" src="${escapeHtml(map.markImage)}" alt="${escapeHtml(map.markKey || map.regionName || map.street || "地圖圖示")}" loading="lazy">` : ""}
      <div>
        <strong>${escapeHtml(map.name)}</strong>
        <span>${meta.map(escapeHtml).join(" · ")}</span>
        ${map.desc || map.areaDesc ? `<p>${escapeHtml(shorten(map.desc || map.areaDesc, 88))}</p>` : ""}
      </div>
    </article>
  `;
}

function renderQuestRequirements(monster) {
  const rows = monster.questRequirements || [];
  if (!rows.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>任務狩獵需求</h3>
        <span>${rows.length.toLocaleString()} 筆</span>
      </div>
      <div class="sourceList">
        ${rows.map(row => `
          <a class="sourceRow sourceLinkRow sourceQuestRow" href="${questUrl(row.questId)}">
            ${questNpcImage(row)}
            <div>
              <strong>${escapeHtml(row.questName)}</strong>
              <span>${escapeHtml(row.category || "任務")}${row.minLevel ? ` · Lv.${escapeHtml(row.minLevel)}+` : ""}${state.showIds ? ` · ID ${escapeHtml(row.questId)}` : ""}</span>
              <p>${escapeHtml(row.stageLabel || "任務條件")}${row.parent ? ` · ${escapeHtml(row.parent)}` : ""}</p>
            </div>
            <small>狩獵 ${formatNumber(row.count)} 隻</small>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMesoDrop(monster) {
  const meso = monster.mesoDrop;
  if (!meso) return "";
  const piles = Number(meso.piles || 0);
  const source = meso.sourceLabel || "推估";
  const totalRange = formatMesoRange(meso);
  const perPileRange = formatMesoAmountRange(meso.min, meso.max);
  const meta = piles > 1
    ? `${piles.toLocaleString()} 包 · 每包 ${perPileRange}`
    : (piles === 1 ? "單包掉落" : "不掉落楓幣");
  return `
    <section class="dropGroup mesoDropGroup">
      <div class="dropGroupTitle">
        <strong>楓幣</strong>
        <span>${escapeHtml(source)}</span>
      </div>
      <div class="mesoDropCard">
        <div class="mesoIcon">楓</div>
        <div class="mesoText">
          <strong>${escapeHtml(totalRange)}</strong>
          <span>${escapeHtml(meta)}</span>
        </div>
      </div>
    </section>
  `;
}

function groupedDrops(drops) {
  const groups = new Map();
  drops.forEach((item, index) => {
    const name = item.category || item.kind || "其他道具";
    if (!groups.has(name)) {
      groups.set(name, {
        name,
        order: Number(item.categoryOrder ?? 999),
        first: index,
        items: [],
      });
    }
    const group = groups.get(name);
    group.order = Math.min(group.order, Number(item.categoryOrder ?? 999));
    group.items.push(item);
  });
  return [...groups.values()].sort((a, b) => {
    const orderDiff = a.order - b.order;
    if (orderDiff) return orderDiff;
    return a.first - b.first || a.name.localeCompare(b.name, "zh-Hant");
  });
}

function renderDropGroups(drops) {
  if (!drops.length) return `<div class="empty">這隻怪物沒有 reward 掉落資料</div>`;
  return groupedDrops(drops).map(group => `
    <section class="dropGroup">
      <div class="dropGroupTitle">
        <strong>${escapeHtml(group.name)}</strong>
        <span>${group.items.length.toLocaleString()} 項</span>
      </div>
      <div class="dropsGrid">
        ${group.items.map(itemCard).join("")}
      </div>
    </section>
  `).join("");
}

function itemCard(item) {
  const metaParts = [];
  if (state.showIds) metaParts.push(`ID ${item.id}`);
  metaParts.push(item.source === "quest" ? "任務掉落" : itemTypeText(item));
  if (item.source === "quest" && item.questNames?.length) metaParts.push(`任務：${item.questNames.slice(0, 2).join("、")}`);
  const meta = metaParts.map(escapeHtml).join(" · ");
  return `
    <a class="itemCard itemLinkCard" href="${itemUrl(item)}">
      ${assetImage(item.image, item.name, item.name.slice(0, 1), "itemIcon")}
      <div class="itemText">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${meta}</span>
        ${item.desc ? `<p>${escapeHtml(shorten(item.desc, 92))}</p>` : ""}
      </div>
    </a>
  `;
}

function assetImage(src, alt, fallback, className) {
  if (src) {
    return `<img class="${className} assetImage" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }
  return `<div class="${className}">${escapeHtml(fallback)}</div>`;
}

function shorten(value, size) {
  const text = String(value || "").replace(/\s+/g, " ");
  return text.length > size ? text.slice(0, size - 1) + "…" : text;
}

function render() {
  updateSettingsPanel();
  updateNameOnlySearchControl();
  updateUnknownToggle();
  updateUnnamedMapToggle();
  updateUnnamedToggle();
  updateIdToggle();
  renderList();
  renderDetail();
}

els.search.addEventListener("input", event => {
  state.query = event.target.value;
  render();
});

els.nameOnlySearch.addEventListener("change", event => {
  state.nameOnlySearch = event.target.checked;
  saveBool("ms_monster_name_only_search", state.nameOnlySearch);
  render();
});

els.continentButton.addEventListener("click", () => {
  setContinentMenu(els.continentButton.getAttribute("aria-expanded") !== "true");
});

els.continentOptions.addEventListener("change", event => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  state.continents = selectedContinentValues();
  saveSelectedContinents();
  updateContinentSummary();
  render();
});

els.continentOptions.addEventListener("click", event => {
  if (!event.target.closest("#continentClear")) return;
  state.continents = [];
  saveSelectedContinents();
  syncContinentInputs();
  render();
});

document.addEventListener("click", event => {
  if (!els.continent.contains(event.target)) setContinentMenu(false);
});

els.unknownToggle.addEventListener("click", () => {
  state.showUnknownContinents = !state.showUnknownContinents;
  saveBool("ms_show_unknown_continents", state.showUnknownContinents);
  render();
});

els.unnamedMapToggle.addEventListener("click", () => {
  state.showUnnamedMapMonsters = !state.showUnnamedMapMonsters;
  saveBool("ms_show_unnamed_map_monsters", state.showUnnamedMapMonsters);
  setMonsterUrl(state.selectedId);
  render();
});

els.unnamedToggle.addEventListener("click", () => {
  state.showUnnamedItems = !state.showUnnamedItems;
  saveBool("ms_show_unnamed_items", state.showUnnamedItems);
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
  const button = event.target.closest(".monsterRow");
  if (!button) return;
  state.selectedId = button.dataset.id;
  setMonsterUrl(state.selectedId);
  render();
});

applyTheme();
renderBuildMeta();
populateFilters();
syncControls();
render();
