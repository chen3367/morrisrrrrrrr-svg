const db = window.MS_ITEM_DB || window.MS_DROP_DB;
const state = {
  query: "",
  category: "",
  source: "",
  showUnnamedItems: false,
  showIds: false,
  selectedId: null,
};

const els = {
  search: document.getElementById("itemSearch"),
  category: document.getElementById("categoryFilter"),
  source: document.getElementById("sourceFilter"),
  unnamedToggle: document.getElementById("unnamedToggle"),
  idToggle: document.getElementById("idToggle"),
  list: document.getElementById("itemList"),
  detail: document.getElementById("itemDetail"),
  count: document.getElementById("resultCount"),
};

function norm(value) {
  return String(value || "").toLowerCase().trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : escapeHtml(value);
}

function isUnnamedItem(item) {
  return item.unnamed || /^未命名道具\s+\d+$/.test(String(item.name || ""));
}

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function sourceCounts(item) {
  return item.sourceCounts || { monsterDrops: 0, questRewards: 0, shops: 0 };
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
  const counts = sourceCounts(item);
  if (type === "monster") return counts.monsterDrops > 0;
  if (type === "quest") return counts.questRewards > 0;
  if (type === "shop") return counts.shops > 0;
  if (type === "none") return !counts.monsterDrops && !counts.questRewards && !counts.shops;
  return true;
}

function searchableText(item) {
  const sources = item.sources || {};
  const monsterText = (sources.monsterDrops || []).flatMap(row => [
    row.monsterId,
    row.monsterName,
    ...(row.continents || []),
    ...(row.maps || []).flatMap(map => [map.id, map.name, map.street]),
    ...(row.questIds || []),
    ...(row.questNames || []),
  ]);
  const questText = (sources.questRewards || []).flatMap(row => [
    row.questId,
    row.questName,
  ]);
  const shopText = (sources.shops || []).flatMap(row => [
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

function filteredItems() {
  const q = norm(state.query);
  return (db.items || []).filter(item => {
    if (!state.showUnnamedItems && isUnnamedItem(item)) return false;
    if (state.category && item.category !== state.category) return false;
    if (state.source && !hasSource(item, state.source)) return false;
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
      <span class="itemGlyph">${escapeHtml(item.name.slice(0, 1) || "?")}</span>
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
      <div class="itemMark">${escapeHtml(item.name.slice(0, 1) || "?")}</div>
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
    ${renderMonsterSources(item)}
    ${renderQuestSources(item)}
    ${renderShopSources(item)}
    ${totalSources(item) ? "" : `<div class="empty">目前資料集中沒有取得途徑</div>`}
  `;
}

function renderMonsterSources(item) {
  const rows = item.sources?.monsterDrops || [];
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
      <article class="sourceRow">
        <div>
          <strong>${escapeHtml(row.monsterName)}</strong>
          <span>${meta.map(escapeHtml).join(" · ") || "怪物"}</span>
          ${maps.length ? `<p>${escapeHtml(maps.join("、"))}${(row.maps || []).length > maps.length ? ` +${(row.maps || []).length - maps.length}` : ""}</p>` : ""}
          ${questNote}
        </div>
        <small>${row.source === "quest" ? "任務掉落" : "圖鑑"}</small>
      </article>
    `;
  });
}

function renderQuestSources(item) {
  const rows = item.sources?.questRewards || [];
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
  const rows = item.sources?.shops || [];
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
  render();
});

populateFilters();
render();
