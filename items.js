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

const state = {
  query: "",
  category: cookieValue("ms_item_category"),
  subcategory: cookieValue("ms_item_subcategory"),
  source: cookieValue("ms_item_source"),
  showUnnamedMapMonsters: initialShowUnnamedMapMonsters(),
  showNoSourceItems: initialShowNoSourceItems(),
  showUnnamedItems: cookieBool("ms_show_unnamed_items"),
  showIds: cookieBool("ms_show_ids"),
  theme: initialTheme(),
  settingsOpen: cookieBool("ms_settings_open"),
  selectedId: initialItemId(),
};

const els = {
  search: document.getElementById("itemSearch"),
  category: document.getElementById("categoryFilter"),
  subcategory: document.getElementById("subcategoryFilter"),
  source: document.getElementById("sourceFilter"),
  unnamedMapToggle: document.getElementById("unnamedMapToggle"),
  noSourceToggle: document.getElementById("noSourceToggle"),
  unnamedToggle: document.getElementById("unnamedToggle"),
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

function initialItemId() {
  const value = new URLSearchParams(window.location.search).get("item");
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

function initialShowUnnamedMapMonsters() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("showUnnamedMaps") === "1") return true;
  return cookieBool("ms_show_unnamed_map_monsters");
}

function initialShowNoSourceItems() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("showNoSource") === "1") return true;
  return cookieBool("ms_show_no_source_items");
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
  if (state.showNoSourceItems) {
    url.searchParams.set("showNoSource", "1");
  } else {
    url.searchParams.delete("showNoSource");
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

function questNpcImage(row, className = "sourceMonsterImage") {
  const npc = row.startNpc || row.endNpc || null;
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
      ["incPAD", "物攻", formatSigned],
      ["incMAD", "魔攻", formatSigned],
      ["incPDD", "物防", formatSigned],
      ["incMDD", "魔防", formatSigned],
      ["incACC", "命中", formatSigned],
      ["incEVA", "迴避", formatSigned],
      ["incSpeed", "移速", formatSigned],
      ["incJump", "跳躍", formatSigned],
      ["incCraft", "熟練", formatSigned],
      ["knockback", "擊退"],
      ["attackSpeed", "攻速"],
    ],
  },
  {
    title: "其他數值",
    fields: [
      ["tuc", "可升級次數"],
      ["price", "商店價格", formatMeso],
      ["islot", "裝備欄位", formatEquipSlot],
      ["vslot", "外觀欄位", formatEquipSlot],
    ],
  },
];

function norm(value) {
  return String(value || "").toLowerCase().trim();
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

function formatMeso(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return escapeHtml(value);
  return `${number.toLocaleString()} 楓幣`;
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
    [4, "弓手"],
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

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function rawSourceCounts(item) {
  const raw = item.sourceCounts || { monsterDrops: 0, questRewards: 0, shops: 0 };
  return {
    monsterDrops: raw.monsterDrops || 0,
    questRewards: raw.questRewards || 0,
    shops: raw.shops || 0,
  };
}

function sourceRows(item) {
  const source = state.source;
  return {
    monsterDrops: source && source !== "monster" ? [] : monsterSourceRows(item),
    questRewards: source && source !== "quest" ? [] : (item.sources?.questRewards || []),
    shops: source && source !== "shop" ? [] : (item.sources?.shops || []),
  };
}

function questRequirementRows(item) {
  return item.sources?.questRequirements || [];
}

function sourceCounts(item) {
  const rows = sourceRows(item);
  return {
    monsterDrops: rows.monsterDrops.length,
    questRewards: rows.questRewards.length,
    shops: rows.shops.length,
  };
}

function sourceSummary(item) {
  const counts = sourceCounts(item);
  const parts = [];
  if (counts.monsterDrops) parts.push(`怪物 ${formatNumber(counts.monsterDrops)}`);
  if (counts.questRewards) parts.push(`任務 ${formatNumber(counts.questRewards)}`);
  if (counts.shops) parts.push(`購買 ${formatNumber(counts.shops)}`);
  return parts.length ? parts.join(" / ") : "尚無來源";
}

function hasSource(item, type) {
  if (type === "monster") return monsterSourceRows(item).length > 0;
  const rawCounts = rawSourceCounts(item);
  if (type === "quest") return rawCounts.questRewards > 0;
  if (type === "shop") return rawCounts.shops > 0;
  if (type === "none") return isRawNoSource(item);
  return true;
}

function isRawNoSource(item) {
  const counts = rawSourceCounts(item);
  return !counts.monsterDrops && !counts.questRewards && !counts.shops;
}

function hasVisibleSource(item) {
  const counts = sourceCounts(item);
  return Boolean(counts.monsterDrops || counts.questRewards || counts.shops);
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
  const questRequirementText = questRequirementRows(item).flatMap(row => [
    row.questId,
    row.questName,
    row.category,
    row.parent,
    row.stageLabel,
    row.startNpc?.name,
    row.endNpc?.name,
  ]);
  return [
    item.id,
    item.name,
    item.desc,
    item.kind,
    item.category,
    item.subcategory,
    ...monsterText,
    ...questText,
    ...shopText,
    ...questRequirementText,
  ].map(norm).join(" ");
}

function monsterSourceRows(item) {
  const rows = item.sources?.monsterDrops || [];
  return state.showUnnamedMapMonsters ? rows : rows.filter(row => !row.onlyUnnamedMaps && !row.unnamedMonster);
}

function filteredItems() {
  const q = norm(state.query);
  return (db.items || []).filter(item => {
    if (!state.showUnnamedItems && isUnnamedItem(item)) return false;
    if (state.category && item.category !== state.category) return false;
    if (state.subcategory && item.subcategory !== state.subcategory) return false;
    const rawNoSource = isRawNoSource(item);
    if (state.source === "none") {
      if (!state.showNoSourceItems || !rawNoSource) return false;
    } else {
      if (rawNoSource) {
        if (!state.showNoSourceItems || state.source) return false;
      } else {
        if (state.source && !hasSource(item, state.source)) return false;
        if (!hasVisibleSource(item)) return false;
      }
    }
    if (q && !searchableText(item).includes(q)) return false;
    return true;
  }).sort(compareItems);
}

function compareItems(a, b) {
  const orderDiff = Number(a.categoryOrder || 999) - Number(b.categoryOrder || 999);
  if (orderDiff) return orderDiff;
  const categoryDiff = String(a.category || "").localeCompare(String(b.category || ""), "zh-Hant");
  if (categoryDiff) return categoryDiff;
  const subcategoryDiff = String(a.subcategory || "").localeCompare(String(b.subcategory || ""), "zh-Hant");
  if (subcategoryDiff) return subcategoryDiff;
  const nameDiff = String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant");
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

function subcategoriesForCategory(category) {
  const byCategory = db.filters?.itemSubcategoriesByCategory || {};
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
  els.subcategory.disabled = options.length === 0;
}

function syncControls() {
  els.search.value = state.query;
  els.category.value = state.category;
  state.category = els.category.value;
  updateSubcategoryFilter();
  els.source.value = state.source;
  state.source = els.source.value;
}

function updateToggles() {
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
  els.unnamedMapToggle.setAttribute("aria-pressed", String(state.showUnnamedMapMonsters));
  els.unnamedMapToggle.textContent = state.showUnnamedMapMonsters ? "隱藏未命名怪物/地圖" : "顯示未命名怪物/地圖";
  els.noSourceToggle.setAttribute("aria-pressed", String(state.showNoSourceItems));
  els.noSourceToggle.textContent = state.showNoSourceItems ? "隱藏無來源道具" : "顯示無來源道具";
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
  const rows = filteredItems();
  if (!rows.some(item => String(item.id) === String(state.selectedId))) {
    state.selectedId = rows[0]?.id || null;
  }
  els.count.textContent = `${rows.length.toLocaleString()} 項`;
  const visibleRows = rows.slice(0, 900);
  const limitNote = rows.length > visibleRows.length
    ? `<div class="listLimit">已顯示前 ${visibleRows.length.toLocaleString()} 項</div>`
    : "";
  els.list.innerHTML = visibleRows.map(item => `
    <button class="monsterRow itemIndexRow ${String(item.id) === String(state.selectedId) ? "active" : ""}" data-id="${item.id}">
      ${assetImage(item.image, item.name, item.name.slice(0, 1) || "?", "itemGlyph")}
      <span class="rowText">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="rowMeta">${escapeHtml(itemTypeText(item))}${idMeta(item.id)}</span>
        <em>${escapeHtml(sourceSummary(item))}</em>
      </span>
      <small>${formatNumber(totalSources(item))}</small>
    </button>
  `).join("") + limitNote;
}

function totalSources(item) {
  const counts = sourceCounts(item);
  return counts.monsterDrops + counts.questRewards + counts.shops;
}

function selectedItem() {
  const rows = filteredItems();
  return rows.find(item => String(item.id) === String(state.selectedId)) || rows[0];
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
        <p>${escapeHtml(itemTypeText(item))}${idMeta(item.id)}${item.desc ? ` · ${escapeHtml(shorten(item.desc, 110))}` : ""}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${formatNumber(totalSources(item))}</strong><span>來源</span></div>
        <div class="heroCounter"><strong>${escapeHtml(item.subcategory || item.kind)}</strong><span>細類</span></div>
      </div>
    </section>
    <section class="sectionBlock">
      <div class="sourceStats">
        <div class="statCell"><span>怪物掉落</span><strong>${formatNumber(counts.monsterDrops)}</strong></div>
        <div class="statCell"><span>任務獲取</span><strong>${formatNumber(counts.questRewards)}</strong></div>
        <div class="statCell"><span>商人購買</span><strong>${formatNumber(counts.shops)}</strong></div>
      </div>
    </section>
    ${renderEquipmentStats(item)}
    ${renderMonsterSources(item)}
    ${renderQuestSources(item)}
    ${renderShopSources(item)}
    ${renderQuestRequirementSources(item)}
    ${totalSources(item) ? "" : `<div class="empty">${questRequirementRows(item).length ? "目前資料集中沒有取得途徑；已列出任務需求" : "目前資料集中沒有取得途徑"}</div>`}
  `;
}

function renderEquipmentStats(item) {
  const stats = item.equipStats || {};
  let totalRows = 0;
  const groups = EQUIP_FIELD_GROUPS.map(group => {
    const rows = group.fields.map(([key, label, formatter]) => {
      const value = stats[key];
      if (!hasEquipValue(key, value)) return "";
      const text = formatter ? formatter(value) : formatNumber(value);
      return `<div class="statCell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(text)}</strong></div>`;
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
      <div class="equipStats">${groups.join("")}</div>
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
        <small>${row.source === "quest" ? "任務掉落" : "圖鑑"}</small>
      </a>
    `;
  });
}

function renderQuestSources(item) {
  const rows = sourceRows(item).questRewards;
  return sourceBlock("任務獲取", rows, row => `
    <a class="sourceRow sourceLinkRow sourceQuestRow" href="${questUrl(row.questId)}">
      ${questNpcImage(row)}
      <div>
        <strong>${escapeHtml(row.questName)}</strong>
        <span>${questStateLabel(row.state)}${state.showIds ? ` · ID ${escapeHtml(row.questId)}` : ""}</span>
        <p>${formatNumber(row.count)} 個${row.random ? " · 隨機獎勵" : ""}</p>
      </div>
      <small>任務</small>
    </a>
  `);
}

function renderShopSources(item) {
  const rows = sourceRows(item).shops;
  return sourceBlock("商人購買", rows, row => `
    <article class="sourceRow">
      <div>
        <strong>${escapeHtml(row.merchantName)}</strong>
        <span>${row.price === null || row.price === undefined ? "價格未知" : `${formatNumber(row.price)} ${escapeHtml(row.currency || "")}`}${state.showIds && row.sn ? ` · SN ${escapeHtml(row.sn)}` : ""}</span>
        <p>${formatNumber(row.count || 1)} 個</p>
      </div>
      <small>${row.sourceType === "cashShop" ? "商城" : "商店"}</small>
    </article>
  `);
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
  state.query = event.target.value;
  render();
});

els.category.addEventListener("change", event => {
  state.category = event.target.value;
  writeCookie("ms_item_category", state.category);
  updateSubcategoryFilter();
  writeCookie("ms_item_subcategory", state.subcategory);
  render();
});

els.subcategory.addEventListener("change", event => {
  state.subcategory = event.target.value;
  writeCookie("ms_item_subcategory", state.subcategory);
  render();
});

els.source.addEventListener("change", event => {
  state.source = event.target.value;
  writeCookie("ms_item_source", state.source);
  render();
});

els.unnamedMapToggle.addEventListener("click", () => {
  state.showUnnamedMapMonsters = !state.showUnnamedMapMonsters;
  saveBool("ms_show_unnamed_map_monsters", state.showUnnamedMapMonsters);
  setItemUrl(state.selectedId);
  render();
});

els.noSourceToggle.addEventListener("click", () => {
  state.showNoSourceItems = !state.showNoSourceItems;
  saveBool("ms_show_no_source_items", state.showNoSourceItems);
  setItemUrl(state.selectedId);
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
  const button = event.target.closest(".itemIndexRow");
  if (!button) return;
  state.selectedId = Number(button.dataset.id);
  setItemUrl(state.selectedId);
  render();
});

applyTheme();
renderBuildMeta();
populateFilters();
syncControls();
render();
