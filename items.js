const db = window.MS_ITEM_DB || window.MS_DROP_DB;
const state = {
  query: "",
  category: "",
  source: "",
  showUnnamedMapMonsters: initialShowUnnamedMapMonsters(),
  showUnnamedItems: false,
  showIds: false,
  selectedId: initialItemId(),
};

const els = {
  search: document.getElementById("itemSearch"),
  category: document.getElementById("categoryFilter"),
  source: document.getElementById("sourceFilter"),
  unnamedMapToggle: document.getElementById("unnamedMapToggle"),
  unnamedToggle: document.getElementById("unnamedToggle"),
  idToggle: document.getElementById("idToggle"),
  list: document.getElementById("itemList"),
  detail: document.getElementById("itemDetail"),
  count: document.getElementById("resultCount"),
};

function initialItemId() {
  const value = new URLSearchParams(window.location.search).get("item");
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

function initialShowUnnamedMapMonsters() {
  return new URLSearchParams(window.location.search).get("showUnnamedMaps") === "1";
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
      ["islot", "裝備欄位"],
      ["vslot", "外觀欄位"],
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

function formatReqJob(value) {
  const mask = Number(value);
  if (!Number.isFinite(mask) || mask === 0) return "全職";
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
  const rawCounts = rawSourceCounts(item);
  if (type === "monster") return monsterSourceRows(item).length > 0;
  if (type === "quest") return rawCounts.questRewards > 0;
  if (type === "shop") return rawCounts.shops > 0;
  if (type === "none") return !rawCounts.monsterDrops && !rawCounts.questRewards && !rawCounts.shops;
  return true;
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
  return [
    item.id,
    item.name,
    item.desc,
    item.kind,
    item.category,
    ...monsterText,
    ...questText,
    ...shopText,
  ].map(norm).join(" ");
}

function monsterSourceRows(item) {
  const rows = item.sources?.monsterDrops || [];
  return state.showUnnamedMapMonsters ? rows : rows.filter(row => !row.onlyUnnamedMaps);
}

function filteredItems() {
  const q = norm(state.query);
  return (db.items || []).filter(item => {
    if (!state.showUnnamedItems && isUnnamedItem(item)) return false;
    if (state.category && item.category !== state.category) return false;
    if (state.source === "none") {
      if (!hasSource(item, "none")) return false;
    } else {
      if (state.source && !hasSource(item, state.source)) return false;
      if (!hasVisibleSource(item)) return false;
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

function updateToggles() {
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
  els.unnamedMapToggle.setAttribute("aria-pressed", String(state.showUnnamedMapMonsters));
  els.unnamedMapToggle.textContent = state.showUnnamedMapMonsters ? "隱藏未命名地圖怪物" : "顯示未命名地圖怪物";
  els.unnamedToggle.setAttribute("aria-pressed", String(state.showUnnamedItems));
  els.unnamedToggle.textContent = state.showUnnamedItems ? "隱藏未命名道具" : "顯示未命名道具";
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
        <span class="rowMeta">${escapeHtml(item.category || item.kind)}${idMeta(item.id)}</span>
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
        <p>${escapeHtml(item.category || item.kind)}${idMeta(item.id)}${item.desc ? ` · ${escapeHtml(shorten(item.desc, 110))}` : ""}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${formatNumber(totalSources(item))}</strong><span>來源</span></div>
        <div class="heroCounter"><strong>${escapeHtml(item.kind)}</strong><span>種類</span></div>
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
    ${totalSources(item) ? "" : `<div class="empty">目前資料集中沒有取得途徑</div>`}
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
    <article class="sourceRow">
      <div>
        <strong>${escapeHtml(row.questName)}</strong>
        <span>${questStateLabel(row.state)}${state.showIds ? ` · ID ${escapeHtml(row.questId)}` : ""}</span>
        <p>${formatNumber(row.count)} 個${row.random ? " · 隨機獎勵" : ""}</p>
      </div>
      <small>任務</small>
    </article>
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
  render();
});

els.source.addEventListener("change", event => {
  state.source = event.target.value;
  render();
});

els.unnamedMapToggle.addEventListener("click", () => {
  state.showUnnamedMapMonsters = !state.showUnnamedMapMonsters;
  render();
});

els.unnamedToggle.addEventListener("click", () => {
  state.showUnnamedItems = !state.showUnnamedItems;
  render();
});

els.idToggle.addEventListener("click", () => {
  state.showIds = !state.showIds;
  render();
});

els.list.addEventListener("click", event => {
  const button = event.target.closest(".itemIndexRow");
  if (!button) return;
  state.selectedId = Number(button.dataset.id);
  setItemUrl(state.selectedId);
  render();
});

populateFilters();
render();
