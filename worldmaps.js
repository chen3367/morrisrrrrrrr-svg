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
  clearFilters: document.getElementById("clearFilters"),
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

function assetImage(src, alt, fallback, className) {
  if (src) {
    return `<img class="${className} assetImage" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }
  return `<div class="${className} itemGlyph">${escapeHtml(fallback || "?")}</div>`;
}

function regionThumb(region, className) {
  if (region.markImage) return assetImage(region.markImage, region.name, "地", className);
  return `<div class="${className} mapGlyph">${escapeHtml((region.name || "地").slice(0, 1))}</div>`;
}

function mapNodeThumb(node, className) {
  if (node.markImage) return assetImage(node.markImage, node.name || node.label, "圖", className);
  const region = selectedRegion();
  if (region?.markImage) return assetImage(region.markImage, node.name || node.label || region.name, "圖", className);
  return `<div class="${className} mapGlyph">${escapeHtml((node.name || node.street || "地").slice(0, 1))}</div>`;
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

function visibleGraph(region) {
  const q = norm(state.query);
  const localNodes = (region.nodes || []).filter(node => {
    if (!state.showWorldSubMaps && node.worldSubMap) return false;
    if (!q) return true;
    return norm(state.nameOnlySearch ? localNodeNameText(node) : localNodeFullText(node)).includes(q);
  });
  const ids = new Set(localNodes.map(node => node.id));
  const edges = (region.edges || []).filter(edge => ids.has(edge.from) && ids.has(edge.to));
  const hiddenSubMapCount = state.showWorldSubMaps ? 0 : (region.nodes || []).filter(node => node.worldSubMap).length;
  return { localNodes, edges, hiddenSubMapCount };
}

function renderRegionList() {
  const rows = regionRows();
  els.list.innerHTML = rows.map(region => `
    <button class="monsterRow worldRegionRow ${region.key === state.selectedRegionKey ? "active" : ""}" data-region-key="${escapeHtml(region.key)}">
        ${regionThumb(region, "rowMonsterImage")}
        <span class="rowText">
          <strong>${escapeHtml(region.name)}</strong>
          <span class="rowMeta">${formatNumber(region.nodeCount)} 張地圖</span>
          ${state.showIds ? `<em>${escapeHtml(region.key)}</em>` : ""}
        </span>
        <small>${formatNumber(region.edgeCount)} 條連線</small>
      </button>
  `).join("") || `<div class="empty">沒有世界地圖連通資料</div>`;
}

function nodeTitle(node) {
  const parts = [node.label || node.name, node.areaName, node.street].filter(Boolean);
  if (node.worldSubMap) parts.push("子地圖");
  if (state.showIds) parts.push(`ID ${node.mapId}`);
  return parts.join(" · ");
}

function nodeAnchor(node) {
  const title = nodeTitle(node);
  return `
    <a class="worldMapNode ${node.worldSubMap ? "worldSubMapNode" : ""}" href="${escapeHtml(node.url)}" style="left:${node.x}%;top:${node.y}%;" data-node-id="${escapeHtml(node.id)}" data-node-x="${node.x}" data-node-y="${node.y}" data-world-sub-map="${node.worldSubMap ? "1" : "0"}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      ${mapNodeThumb(node, "worldNodeIcon")}
      <span class="worldNodeLabel">${escapeHtml(shortLabel(node.name || node.label))}</span>
    </a>
  `;
}

function rectOverlapArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function rectOverflow(rect, bounds) {
  return Math.max(0, bounds.left - rect.left)
    + Math.max(0, rect.right - bounds.right)
    + Math.max(0, bounds.top - rect.top)
    + Math.max(0, rect.bottom - bounds.bottom);
}

function worldLabelCandidates(width, height) {
  const gap = 8;
  const half = 12;
  const verticalShifts = [0, -18, 18, -36, 36, -54, 54, -72, 72];
  const horizontalShifts = [0, -28, 28, -56, 56, -84, 84];
  const rows = [];
  verticalShifts.forEach((shift, index) => {
    rows.push({ name: `e${index}`, dx: half + gap, dy: -height / 2 + shift, order: index * 3 });
    rows.push({ name: `w${index}`, dx: -half - gap - width, dy: -height / 2 + shift, order: index * 3 + 1 });
  });
  horizontalShifts.forEach((shift, index) => {
    rows.push({ name: `n${index}`, dx: -width / 2 + shift, dy: -half - gap - height, order: 30 + index * 3 });
    rows.push({ name: `s${index}`, dx: -width / 2 + shift, dy: half + gap, order: 31 + index * 3 });
  });
  [
    ["ne", half + gap, -half - gap - height],
    ["se", half + gap, half + gap],
    ["nw", -half - gap - width, -half - gap - height],
    ["sw", -half - gap - width, half + gap],
  ].forEach(([name, dx, dy], index) => {
    rows.push({ name, dx, dy, order: 70 + index });
  });
  return rows;
}

function duplicateOffset(index, count) {
  if (count <= 1) return { x: 0, y: 0 };
  const capacities = [8, 14, 20, 26];
  let previousSlots = 0;
  let remaining = index;
  let ring = 0;
  while (ring < capacities.length - 1 && remaining >= capacities[ring]) {
    previousSlots += capacities[ring];
    remaining -= capacities[ring];
    ring += 1;
  }
  const slots = Math.min(capacities[ring], Math.max(1, count - previousSlots));
  const radius = Math.min(112, 28 + ring * 28 + Math.max(0, count - 8) * 0.55);
  const angle = -Math.PI / 2 + (remaining / slots) * Math.PI * 2 + (ring % 2 ? Math.PI / slots : 0);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function edgeRouteKey(fromId, toId) {
  return [String(fromId), String(toId)].sort().join(":");
}

const MANUAL_WORLD_EDGE_ROUTES = {};

function manualEdgeRoute(edge) {
  return MANUAL_WORLD_EDGE_ROUTES[edgeRouteKey(edge.from, edge.to)] || "";
}

function parseRoutePoints(routeText) {
  return String(routeText || "").split(/\s+/).map(pair => {
    const [x, y] = pair.split(",").map(Number);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }).filter(Boolean);
}

function edgePathData(source, target, routeText = "") {
  const points = parseRoutePoints(routeText);
  return [
    `M ${source.x} ${source.y}`,
    ...points.map(point => `L ${point.x} ${point.y}`),
    `L ${target.x} ${target.y}`,
  ].join(" ");
}

function spreadWorldMapNodes() {
  const canvas = els.detail.querySelector(".worldMapCanvas");
  if (!canvas) return new Map();
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return new Map();
  const margin = 16;
  const rows = [...canvas.querySelectorAll(".worldMapNode")].map((node, index) => {
    const baseX = rect.width * Number.parseFloat(node.dataset.nodeX || "0") / 100;
    const baseY = rect.height * Number.parseFloat(node.dataset.nodeY || "0") / 100;
    return {
      index,
      node,
      id: node.dataset.nodeId,
      baseX,
      baseY,
      targetX: baseX,
      targetY: baseY,
      x: baseX,
      y: baseY,
      radius: node.dataset.worldSubMap === "1" ? 18 : 16,
    };
  });
  const exactGroups = new Map();
  rows.forEach(row => {
    const key = `${Number(row.node.dataset.nodeX || 0).toFixed(2)},${Number(row.node.dataset.nodeY || 0).toFixed(2)}`;
    if (!exactGroups.has(key)) exactGroups.set(key, []);
    exactGroups.get(key).push(row);
  });
  exactGroups.forEach(group => {
    group.forEach((row, groupIndex) => {
      row.node.dataset.duplicateWorldNode = group.length > 1 ? "1" : "0";
      row.node.dataset.duplicateIndex = String(groupIndex + 1);
      row.node.dataset.duplicateCount = String(group.length);
      row.node.classList.toggle("worldDuplicateNode", group.length > 1);
    });
    if (group.length < 2) return;
    group.sort((a, b) => Number(b.node.dataset.worldSubMap || 0) - Number(a.node.dataset.worldSubMap || 0) || a.index - b.index);
    group.forEach((row, groupIndex) => {
      const offset = duplicateOffset(groupIndex, group.length);
      row.targetX = row.baseX + offset.x;
      row.targetY = row.baseY + offset.y;
      row.x = row.targetX;
      row.y = row.targetY;
    });
  });
  rows.forEach(row => {
    row.x = Math.min(rect.width - margin, Math.max(margin, row.x));
    row.y = Math.min(rect.height - margin, Math.max(margin, row.y));
  });
  const visualById = new Map();
  rows.forEach(row => {
    const visualX = row.x / rect.width * 100;
    const visualY = row.y / rect.height * 100;
    row.node.style.left = `${visualX}%`;
    row.node.style.top = `${visualY}%`;
    row.node.dataset.visualX = String(visualX);
    row.node.dataset.visualY = String(visualY);
    visualById.set(String(row.id), { x: visualX, y: visualY });
  });
  canvas.querySelectorAll(".worldEdge").forEach(line => {
    const source = visualById.get(String(line.dataset.from));
    const target = visualById.get(String(line.dataset.to));
    if (!source || !target) return;
    const sourceNode = rows.find(row => String(row.id) === String(line.dataset.from))?.node;
    const targetNode = rows.find(row => String(row.id) === String(line.dataset.to))?.node;
    const denseEdge = sourceNode?.dataset.duplicateWorldNode === "1"
      || targetNode?.dataset.duplicateWorldNode === "1"
      || sourceNode?.dataset.worldSubMap === "1"
      || targetNode?.dataset.worldSubMap === "1";
    line.classList.toggle("worldDenseEdge", denseEdge);
    line.setAttribute("d", edgePathData(source, target, line.dataset.route));
  });
  return visualById;
}

function placeWorldMapLabels() {
  const canvas = els.detail.querySelector(".worldMapCanvas");
  if (!canvas) return;
  const canvasRect = canvas.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) return;
  const nodes = [...canvas.querySelectorAll(".worldMapNode")];
  nodes.forEach(node => {
    const label = node.querySelector(".worldNodeLabel");
    label.classList.remove("isCollisionHidden");
    label.style.left = "";
    label.style.top = "";
    if ((state.showWorldSubMaps && node.dataset.worldSubMap === "1") || node.dataset.duplicateWorldNode === "1") {
      label.classList.add("isCollisionHidden");
    }
  });
  resolveWorldNodeChipCollisions(canvas);
}

function resolveWorldNodeChipCollisions(canvas) {
  const canvasRect = canvas.getBoundingClientRect();
  const placed = [];
  const nodes = [...canvas.querySelectorAll(".worldMapNode")]
    .filter(node => !node.querySelector(".worldNodeLabel")?.classList.contains("isCollisionHidden"))
    .sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return ar.top - br.top || ar.left - br.left;
    });
  nodes.forEach(node => {
    const label = node.querySelector(".worldNodeLabel");
    const rect = node.getBoundingClientRect();
    const local = {
      left: rect.left - canvasRect.left,
      right: rect.right - canvasRect.left,
      top: rect.top - canvasRect.top,
      bottom: rect.bottom - canvasRect.top,
    };
    const overflow = rectOverflow(local, { left: 4, top: 4, right: canvasRect.width - 4, bottom: canvasRect.height - 4 });
    const hasCollision = overflow > 0 || placed.some(other => rectOverlapArea(local, other) > 4);
    if (hasCollision && label) {
      label.classList.add("isCollisionHidden");
    } else {
      placed.push(local);
    }
  });
}

function layoutWorldMapGraph() {
  spreadWorldMapNodes();
  placeWorldMapLabels();
}

function edgeLine(edge, nodesById) {
  const source = nodesById.get(edge.from);
  const target = nodesById.get(edge.to);
  if (!source || !target) return "";
  const route = manualEdgeRoute(edge);
  return `<path class="worldEdge ${route ? "worldRoutedEdge" : ""}" data-from="${escapeHtml(edge.from)}" data-to="${escapeHtml(edge.to)}" data-route="${escapeHtml(route)}" d="${edgePathData(source, target, route)}"></path>`;
}

function graphHtml(region, graph) {
  const nodesById = new Map(graph.localNodes.map(node => [node.id, node]));
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
        </div>
        <div class="mapLegend">
          <span><i class="legendDot worldNodeLegend"></i>地圖</span>
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
      ${mapNodeThumb(node, "sourceMonsterImage")}
      <div>
        <strong>${escapeHtml(node.name)}</strong>
        <span>${escapeHtml(meta || node.regionName)}${node.worldSubMap ? " · 子地圖" : ""}${idMeta(node.mapId)}</span>
        <p>${escapeHtml(node.label || node.name)}</p>
      </div>
      <small>查看</small>
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
      ${regionThumb(region, "monsterMark")}
      <div class="heroText">
        <h2>${escapeHtml(region.name)}</h2>
        <p>${formatNumber(graph.localNodes.length)} 張目前顯示 · ${formatNumber(graph.edges.length)} 條連通線${graph.hiddenSubMapCount ? ` · 隱藏 ${formatNumber(graph.hiddenSubMapCount)} 張子地圖` : ""}${idMeta(region.key)}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${formatNumber(graph.localNodes.length)}</strong><span>地圖</span></div>
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

function clearSearchFilters() {
  state.query = "";
  state.nameOnlySearch = false;
  state.showWorldSubMaps = false;
  writeCookie("ms_world_map_name_only_search", "");
  saveBool("ms_world_map_show_sub_maps", false);
  if (els.search) els.search.value = "";
  render();
}

function render() {
  updateToggles();
  updateSettingsPanel();
  renderRegionList();
  renderDetail();
  window.requestAnimationFrame(layoutWorldMapGraph);
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

els.clearFilters.addEventListener("click", clearSearchFilters);

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

window.addEventListener("popstate", () => {
  state.selectedRegionKey = initialRegionKey();
  render();
});

window.addEventListener("resize", () => {
  window.requestAnimationFrame(layoutWorldMapGraph);
});

applyTheme();
renderBuildMeta();
bindSearchHistory();
render();
