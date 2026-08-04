const db = window.MS_WORLD_MAP_DB;
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
  renderSearchHistoryOptions();
  els.search.addEventListener("keydown", event => {
    if (event.key === "Enter") rememberSearchTerm(els.search.value);
  });
  els.search.addEventListener("blur", () => rememberSearchTerm(els.search.value));
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

const DEFAULT_WORLD_REGIONS = ["WorldMap000", "WorldMap010", "WorldMap012"];

function initialRegionKey() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("region")) return params.get("region");
  const stored = cookieValue("ms_world_map_region");
  if (stored) return stored;
  const regionKeys = new Set((db.worldMaps?.regions || []).map(region => region.key));
  return DEFAULT_WORLD_REGIONS.find(key => regionKeys.has(key)) || db.worldMaps?.regions?.[0]?.key || "";
}

const state = {
  query: "",
  selectedRegionKey: initialRegionKey(),
  nameOnlySearch: cookieBool("ms_world_map_name_only_search"),
  showWorldSubMaps: cookieBool("ms_world_map_show_sub_maps", false),
  showIds: cookieBool("ms_show_ids"),
  theme: initialTheme(),
  settingsOpen: cookieBool("ms_settings_open"),
};

const els = {
  search: document.getElementById("worldMapSearch"),
  nameOnlySearch: document.getElementById("nameOnlySearch"),
  nameOnlySearchControl: document.getElementById("nameOnlySearchControl"),
  worldSubMapToggle: document.getElementById("worldSubMapToggle"),
  idToggle: document.getElementById("idToggle"),
  themeToggle: document.getElementById("themeToggle"),
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  meta: document.getElementById("buildMeta"),
  list: document.getElementById("worldRegionList"),
  detail: document.getElementById("worldMapDetail"),
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

function shortLabel(value, size = 8) {
  const text = String(value || "").replace(/\s+/g, "");
  return text.length > size ? `${text.slice(0, size)}…` : text;
}

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function renderBuildMeta() {
  const meta = db.metadata || {};
  const parts = [];
  if (meta.gameVersion) parts.push(`遊戲版本 ${meta.gameVersion}`);
  if (meta.generatedAtText) parts.push(`更新 ${meta.generatedAtText}`);
  els.meta.textContent = parts.join(" · ");
}

function applyTheme() {
  const isDark = state.theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
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
  } catch (_error) {}
}

function regionRows() {
  return db.worldMaps?.regions || [];
}

function selectedRegion() {
  const rows = regionRows();
  return rows.find(region => region.key === state.selectedRegionKey) || rows[0] || null;
}

function setRegionUrl(regionKey) {
  const url = new URL(window.location.href);
  url.searchParams.set("region", regionKey);
  window.history.replaceState(null, "", url);
}

function selectRegion(regionKey) {
  state.selectedRegionKey = regionKey;
  writeCookie("ms_world_map_region", regionKey);
  setRegionUrl(regionKey);
  render();
}

function localNodeNameText(node) {
  return [node.name, node.label, node.street, node.areaName].join(" ");
}

function localNodeFullText(node) {
  return [
    node.mapId,
    node.name,
    node.label,
    node.street,
    node.regionName,
    node.mapRegionName,
    node.areaName,
    node.areaDesc,
  ].join(" ");
}

function proxyNameText(node) {
  return [node.name, node.label, node.targetRegionName].join(" ");
}

function proxyFullText(node) {
  return [node.name, node.label, node.targetRegionName, node.targetRegionKey, node.title].join(" ");
}

function visibleGraph(region) {
  const q = norm(state.query);
  const localNodes = (region.nodes || []).filter(node => {
    if (!state.showWorldSubMaps && node.worldSubMap) return false;
    if (!q) return true;
    return norm(state.nameOnlySearch ? localNodeNameText(node) : localNodeFullText(node)).includes(q);
  });
  const proxyNodes = (region.proxyNodes || []).filter(node => {
    if (!q) return true;
    return norm(state.nameOnlySearch ? proxyNameText(node) : proxyFullText(node)).includes(q);
  });
  const ids = new Set([...localNodes, ...proxyNodes].map(node => node.id));
  const edges = (region.edges || []).filter(edge => ids.has(edge.from) && ids.has(edge.to));
  const hiddenSubMapCount = state.showWorldSubMaps ? 0 : (region.nodes || []).filter(node => node.worldSubMap).length;
  return { localNodes, proxyNodes, edges, hiddenSubMapCount };
}

function renderRegionList() {
  const rows = regionRows();
  els.list.innerHTML = rows.map(region => `
    <button class="monsterRow worldRegionRow ${region.key === state.selectedRegionKey ? "active" : ""}" data-region-key="${escapeHtml(region.key)}">
      <div class="rowMonsterImage mapGlyph">${escapeHtml((region.name || "地").slice(0, 1))}</div>
      <span class="rowText">
        <strong>${escapeHtml(region.name)}</strong>
        <span class="rowMeta">${formatNumber(region.nodeCount)} 張地圖${region.crossRegionCount ? ` · 跨區 ${formatNumber(region.crossRegionCount)}` : ""}</span>
        <em>${escapeHtml(region.key)}</em>
      </span>
      <small>${formatNumber(region.edgeCount)}</small>
    </button>
  `).join("") || `<div class="empty">沒有世界地圖連通資料</div>`;
}

function nodeTitle(node) {
  const parts = [node.label || node.name, node.areaName, node.street].filter(Boolean);
  if (node.worldSubMap) parts.push("子地圖");
  if (state.showIds) parts.push(`ID ${node.mapId}`);
  return parts.join(" · ");
}

function proxyTitle(node) {
  const parts = [node.label, `${formatNumber(node.connectionCount)} 條跨地區連通`];
  if (state.showIds) parts.push(node.targetRegionKey);
  return parts.join(" · ");
}

function nodeAnchor(node) {
  const title = nodeTitle(node);
  return `
    <a class="worldMapNode" href="${escapeHtml(node.url)}" style="left:${node.x}%;top:${node.y}%;" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <span class="worldNodeDot"></span>
      <span class="worldNodeLabel">${escapeHtml(shortLabel(node.name || node.label))}</span>
    </a>
  `;
}

function proxyAnchor(node) {
  const title = proxyTitle(node);
  return `
    <a class="worldMapNode worldMapProxyNode" href="${escapeHtml(node.url)}" data-region-link="${escapeHtml(node.targetRegionKey)}" style="left:${node.x}%;top:${node.y}%;" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <span class="worldNodeDot"></span>
      <span class="worldNodeLabel">${escapeHtml(shortLabel(node.targetRegionName, 7))}</span>
    </a>
  `;
}

function edgeLine(edge, nodesById) {
  const source = nodesById.get(edge.from);
  const target = nodesById.get(edge.to);
  if (!source || !target) return "";
  return `<line class="${edge.cross ? "worldEdge crossWorldEdge" : "worldEdge"}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}"></line>`;
}

function graphHtml(region, graph) {
  const nodesById = new Map([...graph.localNodes, ...graph.proxyNodes].map(node => [node.id, node]));
  const imageStyle = region.image ? `background-image:url('${escapeHtml(region.image)}');` : "";
  const ratioStyle = region.imageWidth && region.imageHeight ? `aspect-ratio:${Number(region.imageWidth)} / ${Number(region.imageHeight)};` : "";
  return `
    <section class="sectionBlock worldMapGraphBlock">
      <div class="sectionTitle">
        <h3>連通圖</h3>
        <span>${formatNumber(graph.localNodes.length)} 張地圖 · ${formatNumber(graph.edges.length)} 條連線</span>
      </div>
      <div class="worldMapCanvasShell">
        <div class="worldMapCanvas ${region.image ? "withWorldMapImage" : ""}" style="${ratioStyle}${imageStyle}" aria-label="${escapeHtml(region.name)}">
          <svg class="worldMapEdgeLayer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            ${graph.edges.map(edge => edgeLine(edge, nodesById)).join("")}
          </svg>
          ${graph.localNodes.map(nodeAnchor).join("")}
          ${graph.proxyNodes.map(proxyAnchor).join("")}
        </div>
        <div class="mapLegend">
          <span><i class="legendDot worldNodeLegend"></i>地圖</span>
          <span><i class="legendDot worldProxyLegend"></i>跨地區</span>
          <span><i class="worldLineLegend"></i>雙向連通</span>
        </div>
      </div>
    </section>
  `;
}

function mapRow(node) {
  const meta = [node.areaName, node.street].filter(Boolean).join(" · ");
  return `
    <a class="sourceRow sourceLinkRow monsterSourceRow" href="${escapeHtml(node.url)}">
      <div class="sourceMonsterImage mapGlyph">圖</div>
      <div>
        <strong>${escapeHtml(node.name)}</strong>
        <span>${escapeHtml(meta || node.regionName)}${node.worldSubMap ? " · 子地圖" : ""}${idMeta(node.mapId)}</span>
        <p>${escapeHtml(node.label || node.name)}</p>
      </div>
      <small>查看</small>
    </a>
  `;
}

function proxyRow(node) {
  return `
    <a class="sourceRow sourceLinkRow monsterSourceRow" href="${escapeHtml(node.url)}" data-region-link="${escapeHtml(node.targetRegionKey)}">
      <div class="sourceMonsterImage portalMiniIcon">區</div>
      <div>
        <strong>${escapeHtml(node.label)}</strong>
        <span>${formatNumber(node.connectionCount)} 條跨地區連通${state.showIds ? ` · ${escapeHtml(node.targetRegionKey)}` : ""}</span>
        <p>${escapeHtml(node.title || "")}</p>
      </div>
      <small>前往</small>
    </a>
  `;
}

function renderDetail() {
  const region = selectedRegion();
  if (!region) {
    els.count.textContent = "0 張";
    els.detail.innerHTML = `<div class="empty">沒有世界地圖資料</div>`;
    return;
  }
  const graph = visibleGraph(region);
  els.count.textContent = `${graph.localNodes.length.toLocaleString()} 張`;
  els.detail.innerHTML = `
    <section class="monsterHero mapHero worldMapHero">
      <div class="monsterMark mapGlyph">${escapeHtml((region.name || "地").slice(0, 1))}</div>
      <div class="heroText">
        <h2>${escapeHtml(region.name)}</h2>
        <p>${formatNumber(graph.localNodes.length)} 張目前顯示 · ${formatNumber(graph.edges.length)} 條連通線${graph.hiddenSubMapCount ? ` · 隱藏 ${formatNumber(graph.hiddenSubMapCount)} 張子地圖` : ""}${idMeta(region.key)}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${formatNumber(graph.localNodes.length)}</strong><span>地圖</span></div>
        <div class="heroCounter"><strong>${formatNumber(region.crossRegionCount || 0)}</strong><span>跨區點</span></div>
      </div>
    </section>
    ${graphHtml(region, graph)}
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>地圖節點</h3>
        <span>${formatNumber(graph.localNodes.length)} 張</span>
      </div>
      <div class="sourceList">
        ${graph.localNodes.map(mapRow).join("") || `<div class="empty">沒有符合搜尋的地圖</div>`}
      </div>
    </section>
    ${graph.proxyNodes.length ? `
      <section class="sectionBlock">
        <div class="sectionTitle">
          <h3>跨地區連結</h3>
          <span>${formatNumber(graph.proxyNodes.length)} 個</span>
        </div>
        <div class="sourceList">
          ${graph.proxyNodes.map(proxyRow).join("")}
        </div>
      </section>
    ` : ""}
  `;
}

function updateToggles() {
  els.worldSubMapToggle.setAttribute("aria-pressed", String(state.showWorldSubMaps));
  els.worldSubMapToggle.textContent = state.showWorldSubMaps ? "隱藏子地圖" : "顯示子地圖";
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
  els.nameOnlySearch.checked = state.nameOnlySearch;
  els.nameOnlySearchControl.classList.toggle("active", state.nameOnlySearch);
}

function updateSettingsPanel() {
  els.settingsPanel.hidden = !state.settingsOpen;
  els.settingsToggle.setAttribute("aria-expanded", String(state.settingsOpen));
  els.settingsToggle.classList.toggle("active", state.settingsOpen);
  els.settingsToggle.title = state.settingsOpen ? "隱藏設定" : "顯示設定";
  els.settingsToggle.setAttribute("aria-label", state.settingsOpen ? "隱藏設定" : "顯示設定");
}

function render() {
  updateToggles();
  updateSettingsPanel();
  renderRegionList();
  renderDetail();
}

els.search.addEventListener("input", event => {
  state.query = event.target.value;
  scheduleRememberSearchTerm(state.query);
  render();
});

els.nameOnlySearch.addEventListener("change", event => {
  state.nameOnlySearch = event.target.checked;
  saveBool("ms_world_map_name_only_search", state.nameOnlySearch);
  render();
});

els.worldSubMapToggle.addEventListener("click", () => {
  state.showWorldSubMaps = !state.showWorldSubMaps;
  saveBool("ms_world_map_show_sub_maps", state.showWorldSubMaps);
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
  const button = event.target.closest(".worldRegionRow");
  if (!button) return;
  selectRegion(button.dataset.regionKey);
});

els.detail.addEventListener("click", event => {
  const link = event.target.closest("[data-region-link]");
  if (!link) return;
  const regionKey = link.getAttribute("data-region-link");
  if (!regionKey) return;
  event.preventDefault();
  selectRegion(regionKey);
});

window.addEventListener("popstate", () => {
  state.selectedRegionKey = initialRegionKey();
  render();
});

applyTheme();
renderBuildMeta();
bindSearchHistory();
render();
