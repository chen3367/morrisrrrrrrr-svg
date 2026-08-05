const db = window.MS_MAP_DB;
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

function initialTheme() {
  const cookieTheme = cookieValue("ms_theme");
  if (cookieTheme === "dark" || cookieTheme === "light") return cookieTheme;
  try {
    return localStorage.getItem("ms-theme") === "dark" ? "dark" : "light";
  } catch (_error) {
    return "light";
  }
}

function initialMapId() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("map")) return params.get("map");
  const hashMatch = String(window.location.hash || "").match(/map=(\d+)/);
  return hashMatch ? hashMatch[1] : null;
}

function initialShowUnnamedMaps() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("showUnnamedMaps") === "1") return true;
  return cookieBool("ms_show_unnamed_maps");
}

function initialShowSpecialMaps() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("showSpecialMaps") === "1") return true;
  return cookieBool("ms_show_special_maps");
}

const DEFAULT_MAP_REGIONS = ["楓之島", "維多利亞島", "奇幻村", "鯨魚號"];

function initialSelectedMapRegions() {
  const raw = cookieValue("ms_map_regions");
  if (raw) return raw.split("|").map(value => value.trim()).filter(Boolean);
  const legacy = cookieValue("ms_map_region");
  if (legacy) return [legacy];
  return [...DEFAULT_MAP_REGIONS];
}

const state = {
  query: "",
  regions: initialSelectedMapRegions(),
  nameOnlySearch: cookieBool("ms_map_name_only_search"),
  showUnnamedMaps: initialShowUnnamedMaps(),
  showSpecialMaps: initialShowSpecialMaps(),
  showNpcs: cookieBool("ms_map_show_npcs", true),
  showUnnamedNpcs: cookieBool("ms_map_show_unnamed_npcs", false),
  showCrossPortals: cookieBool("ms_map_show_cross_portals", cookieBool("ms_map_show_portals", true)),
  showSameMapPortals: cookieBool("ms_map_show_same_map_portals", cookieBool("ms_map_show_portals", true)),
  hiddenSpawnKeys: parseCookieSet("ms_map_hidden_spawns"),
  showIds: cookieBool("ms_show_ids"),
  theme: initialTheme(),
  settingsOpen: cookieBool("ms_settings_open"),
  selectedId: initialMapId(),
  preserveSelectedDetail: Boolean(initialMapId()),
};

const els = {
  search: document.getElementById("mapSearch"),
  nameOnlySearch: document.getElementById("nameOnlySearch"),
  nameOnlySearchControl: document.getElementById("nameOnlySearchControl"),
  region: document.getElementById("mapRegionFilter"),
  regionButton: document.getElementById("mapRegionMenuButton"),
  regionOptions: document.getElementById("mapRegionOptions"),
  regionClear: document.getElementById("mapRegionClear"),
  unnamedMapToggle: document.getElementById("unnamedMapToggle"),
  specialMapToggle: document.getElementById("specialMapToggle"),
  idToggle: document.getElementById("idToggle"),
  themeToggle: document.getElementById("themeToggle"),
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  meta: document.getElementById("buildMeta"),
  list: document.getElementById("mapList"),
  detail: document.getElementById("mapDetail"),
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

function shorten(value, size) {
  const text = String(value || "").replace(/\s+/g, " ");
  return text.length > size ? text.slice(0, size - 1) + "…" : text;
}

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function assetImage(src, alt, fallback, className) {
  if (src) {
    return `<img class="${className} assetImage" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }
  return `<div class="${className}">${escapeHtml(fallback || "?")}</div>`;
}

function mapThumb(map, className) {
  if (map.markImage) return assetImage(map.markImage, map.regionName || map.name, "圖", className);
  return `<div class="${className} mapGlyph">${escapeHtml((map.name || map.street || "地").slice(0, 1))}</div>`;
}

function renderBuildMeta() {
  if (!els.meta) return;
  const meta = db.metadata || {};
  const parts = [];
  if (meta.gameVersion) parts.push(`遊戲版本 ${meta.gameVersion}`);
  if (meta.generatedAtText) parts.push(`更新 ${meta.generatedAtText}`);
  els.meta.textContent = parts.join(" · ");
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
  } catch (_error) {}
}

function populateFilters() {
  const regions = [...(db.filters?.mapRegions || [])].filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const validRegions = new Set(regions);
  state.regions = (state.regions || []).filter(region => validRegions.has(region));
  els.regionOptions.innerHTML = `
    <button id="mapRegionClear" class="multiSelectClear" type="button">清除選取</button>
    ${regions.map(region => `
      <label class="multiSelectOption">
        <input type="checkbox" value="${escapeHtml(region)}" />
        <span>${escapeHtml(region)}</span>
      </label>
    `).join("")}
  `;
  els.regionClear = document.getElementById("mapRegionClear");
  syncMapRegionInputs();
}

function syncControls() {
  els.search.value = state.query;
  if (els.nameOnlySearch) els.nameOnlySearch.checked = state.nameOnlySearch;
  syncMapRegionInputs();
}

function selectedMapRegionValues() {
  return [...els.regionOptions.querySelectorAll('input[type="checkbox"]:checked')]
    .map(input => input.value)
    .filter(Boolean);
}

function saveSelectedMapRegions() {
  writeCookie("ms_map_regions", (state.regions || []).join("|"));
  writeCookie("ms_map_region", "");
}

function syncMapRegionInputs() {
  if (!els.regionOptions) return;
  const selected = new Set(state.regions || []);
  els.regionOptions.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = selected.has(input.value);
  });
  updateMapRegionSummary();
}

function updateMapRegionSummary() {
  if (!els.regionButton) return;
  const selected = state.regions || [];
  if (!selected.length) {
    els.regionButton.textContent = "全部地區";
  } else if (selected.length <= 4) {
    els.regionButton.textContent = selected.join("、");
  } else {
    els.regionButton.textContent = `${selected.slice(0, 3).join("、")} +${selected.length - 3}`;
  }
}

function setMapRegionMenu(open) {
  if (!els.regionButton || !els.regionOptions) return;
  els.regionButton.setAttribute("aria-expanded", String(open));
  els.regionOptions.hidden = !open;
}

function updateToggles() {
  if (els.nameOnlySearch && els.nameOnlySearchControl) {
    els.nameOnlySearch.checked = state.nameOnlySearch;
    els.nameOnlySearchControl.classList.toggle("active", state.nameOnlySearch);
  }
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
  els.unnamedMapToggle.setAttribute("aria-pressed", String(state.showUnnamedMaps));
  els.unnamedMapToggle.textContent = state.showUnnamedMaps ? "隱藏未命名地圖" : "顯示未命名地圖";
  els.specialMapToggle.setAttribute("aria-pressed", String(state.showSpecialMaps));
  els.specialMapToggle.textContent = state.showSpecialMaps ? "隱藏特殊地圖" : "顯示特殊地圖";
}

function updateSettingsPanel() {
  if (!els.settingsToggle || !els.settingsPanel) return;
  els.settingsPanel.hidden = !state.settingsOpen;
  els.settingsToggle.setAttribute("aria-expanded", String(state.settingsOpen));
  els.settingsToggle.classList.toggle("active", state.settingsOpen);
  els.settingsToggle.title = state.settingsOpen ? "隱藏設定" : "顯示設定";
  els.settingsToggle.setAttribute("aria-label", state.settingsOpen ? "隱藏設定" : "顯示設定");
}

function mapSearchText(map) {
  return [
    map.id,
    map.name,
    map.street,
    map.label,
    map.regionName,
    map.areaName,
    map.specialMapReason,
    ...(map.monsterSpawns || []).map(spawn => `${spawn.monsterId} ${spawn.name}`),
    ...(map.npcSpawns || []).map(npc => `${npc.npcId} ${npc.name}`),
    ...visiblePortals(map).map(portal => `${portal.name || ""} ${portal.targetMapId || ""} ${portal.targetMapName || ""} ${portal.targetPortal || ""}`),
  ].join(" ");
}

function mapNameSearchText(map) {
  return [map.name, map.street, map.label].join(" ");
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function hasSpawnCoordinates(spawn) {
  return isFiniteNumber(spawn?.x) && isFiniteNumber(spawn?.y);
}

function isSameMapDifferentPointPortal(portal) {
  if (!portal?.sameMap) return false;
  const target = portal.sameMapTarget || {};
  if (!isFiniteNumber(portal.x) || !isFiniteNumber(portal.y) || !isFiniteNumber(target.x) || !isFiniteNumber(target.y)) return false;
  return Number(portal.x) !== Number(target.x) || Number(portal.y) !== Number(target.y);
}

function isUsefulPortal(portal) {
  if (portal?.targetMapId && !portal.sameMap) return true;
  return isSameMapDifferentPointPortal(portal);
}

function visiblePortals(map) {
  return (map.portals || []).filter(portal => {
    if (!isUsefulPortal(portal)) return false;
    if (!state.showSpecialMaps && portal.targetSpecialMap) return false;
    return true;
  });
}

function displayPortals(map) {
  return visiblePortals(map).filter(portal => portal.sameMap ? state.showSameMapPortals : state.showCrossPortals);
}

function spawnVisibilityKey(map, monsterId) {
  return `${map?.id || "map"}:${monsterId}`;
}

function isSpawnMonsterHidden(map, monsterId) {
  return state.hiddenSpawnKeys.has(spawnVisibilityKey(map, monsterId));
}

function saveHiddenSpawnKeys() {
  writeCookieSet("ms_map_hidden_spawns", state.hiddenSpawnKeys);
}

function displaySpawns(map) {
  return (map.monsterSpawns || []).filter(spawn => !isSpawnMonsterHidden(map, spawn.monsterId));
}

function displayCoordinateSpawns(map) {
  return displaySpawns(map).filter(hasSpawnCoordinates);
}

function displayNpcs(map) {
  if (!state.showNpcs) return [];
  return (map.npcSpawns || []).filter(npc => state.showUnnamedNpcs || !npc.unnamed);
}

function unnamedNpcCount(map) {
  return (map.npcSpawns || []).filter(npc => npc.unnamed).length;
}

function mapSpawnMonsterIds(map) {
  return groupedSpawns(map).map(spawn => String(spawn.monsterId));
}

function hiddenSpawnMonsterCount(map) {
  return mapSpawnMonsterIds(map).filter(monsterId => isSpawnMonsterHidden(map, monsterId)).length;
}

function toggleAllMapSpawns(map) {
  const ids = mapSpawnMonsterIds(map);
  if (!ids.length) return;
  if (hiddenSpawnMonsterCount(map) > 0) {
    ids.forEach(monsterId => state.hiddenSpawnKeys.delete(spawnVisibilityKey(map, monsterId)));
  } else {
    ids.forEach(monsterId => state.hiddenSpawnKeys.add(spawnVisibilityKey(map, monsterId)));
  }
  saveHiddenSpawnKeys();
}

function toggleSpawnMonster(map, monsterId) {
  const key = spawnVisibilityKey(map, monsterId);
  if (state.hiddenSpawnKeys.has(key)) {
    state.hiddenSpawnKeys.delete(key);
  } else {
    state.hiddenSpawnKeys.add(key);
  }
  saveHiddenSpawnKeys();
}

function isUnnamedMap(map) {
  if (map?.unnamed) return true;
  const name = String(map?.name || map?.label || "");
  return !name || /^未命名地圖\s+\d+$/.test(name);
}

function isSpecialMap(map) {
  return Boolean(map?.specialMap);
}

function matchesSelectedMapRegions(map) {
  const selected = state.regions || [];
  if (!selected.length) return true;
  return selected.includes(map.regionName);
}

function filteredMaps() {
  const q = norm(state.query);
  return (db.maps || []).filter(map => {
    const regionOk = matchesSelectedMapRegions(map);
    const unnamedOk = state.showUnnamedMaps || !isUnnamedMap(map);
    const specialOk = state.showSpecialMaps || !isSpecialMap(map);
    const queryOk = !q || norm(state.nameOnlySearch ? mapNameSearchText(map) : mapSearchText(map)).includes(q);
    return regionOk && unnamedOk && specialOk && queryOk;
  });
}

function mapById(mapId) {
  return (db.maps || []).find(map => String(map.id) === String(mapId));
}

function selectedMap() {
  const rows = filteredMaps();
  return (state.preserveSelectedDetail && mapById(state.selectedId))
    || rows.find(map => String(map.id) === String(state.selectedId))
    || rows[0];
}

function setMapUrl(mapId) {
  const url = new URL(window.location.href);
  if (mapId) {
    url.searchParams.set("map", mapId);
  } else {
    url.searchParams.delete("map");
  }
  if (state.showUnnamedMaps) {
    url.searchParams.set("showUnnamedMaps", "1");
  } else {
    url.searchParams.delete("showUnnamedMaps");
  }
  if (state.showSpecialMaps) {
    url.searchParams.set("showSpecialMaps", "1");
  } else {
    url.searchParams.delete("showSpecialMaps");
  }
  window.history.replaceState(null, "", url);
}

function selectMap(mapId, preserve = true) {
  state.selectedId = String(mapId);
  state.preserveSelectedDetail = preserve;
  setMapUrl(state.selectedId);
  render();
}

function mapDetailMeta(map) {
  const parts = [];
  [map.regionName, map.areaName, map.street].forEach(value => {
    const text = String(value || "").trim();
    if (text && !parts.includes(text)) parts.push(text);
  });
  if (map.specialMap) parts.push(map.specialMapReason || "特殊地圖");
  return parts.join(" · ");
}

function renderList() {
  const rows = filteredMaps();
  if (!rows.some(map => String(map.id) === String(state.selectedId))) {
    const preserved = state.preserveSelectedDetail && mapById(state.selectedId);
    if (!preserved) state.selectedId = rows[0]?.id || null;
  }
  els.count.textContent = `${rows.length.toLocaleString()} 張`;
  const visibleRows = rows.slice(0, 1000);
  const limitNote = rows.length > visibleRows.length
    ? `<div class="listLimit">已顯示前 ${visibleRows.length.toLocaleString()} 張</div>`
    : "";
  let lastRegion = "";
  els.list.innerHTML = visibleRows.map(map => {
    const regionHead = map.regionName !== lastRegion ? `<div class="mapRegionDivider">${escapeHtml(map.regionName || "未知地區")}</div>` : "";
    lastRegion = map.regionName;
    const meta = [map.regionName, map.street, map.specialMap ? "特殊地圖" : ""].filter(Boolean).join(" · ");
    const spawnCount = displayCoordinateSpawns(map).length;
    const npcCount = displayNpcs(map).length;
    const portalCount = displayPortals(map).length;
    return `
      ${regionHead}
      <button class="monsterRow mapIndexRow ${String(map.id) === String(state.selectedId) ? "active" : ""}" data-id="${map.id}">
        ${mapThumb(map, "rowMonsterImage")}
        <span class="rowText">
          <strong>${escapeHtml(map.name)}</strong>
          <span class="rowMeta">${escapeHtml(meta || "未知地區")}${idMeta(map.id)}</span>
          <em>${escapeHtml(spawnCount)} 個重生點 · ${escapeHtml(npcCount)} 個 NPC · ${escapeHtml(portalCount)} 個傳送點</em>
        </span>
        <small>${formatNumber(spawnCount)}</small>
      </button>
    `;
  }).join("") + limitNote;
}

function renderDetail() {
  const map = selectedMap();
  if (!map) {
    els.detail.innerHTML = `<div class="empty">找不到符合的地圖</div>`;
    return;
  }
  els.detail.innerHTML = `
    <section class="monsterHero mapHero">
      ${mapThumb(map, "monsterMark")}
      <div class="heroText">
        <h2>${escapeHtml(map.label || map.name)}</h2>
        <p>${escapeHtml(mapDetailMeta(map) || "未知地區")}${idMeta(map.id)}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${formatNumber(displayCoordinateSpawns(map).length)}</strong><span>重生點</span></div>
        <div class="heroCounter"><strong>${formatNumber(displayNpcs(map).length)}</strong><span>NPC</span></div>
        <div class="heroCounter"><strong>${formatNumber(displayPortals(map).length)}</strong><span>傳送點</span></div>
      </div>
    </section>
    ${renderMapCanvas(map)}
    ${renderSpawnList(map)}
    ${renderPortalList(map)}
  `;
}

function mapMetrics(map) {
  const mini = map.miniMap || {};
  if (mini.width > 0 && mini.height > 0) {
    return {
      x0: -Number(mini.centerX || 0),
      y0: -Number(mini.centerY || 0),
      x1: Number(mini.width) - Number(mini.centerX || 0),
      y1: Number(mini.height) - Number(mini.centerY || 0),
      width: Number(mini.width),
      height: Number(mini.height),
      source: "miniMap",
    };
  }
  const points = [...(map.monsterSpawns || []), ...displayNpcs(map), ...visiblePortals(map)].filter(point => Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)));
  const xs = points.map(point => Number(point.x));
  const ys = points.map(point => Number(point.y));
  const minX = xs.length ? Math.min(...xs) - 220 : -500;
  const maxX = xs.length ? Math.max(...xs) + 220 : 500;
  const minY = ys.length ? Math.min(...ys) - 160 : -300;
  const maxY = ys.length ? Math.max(...ys) + 160 : 300;
  return {
    x0: minX,
    y0: minY,
    x1: maxX,
    y1: maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    source: "bounds",
  };
}

function pointPercent(metrics, point) {
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const left = Math.max(0, Math.min(100, ((x - metrics.x0) / Math.max(1, metrics.width)) * 100));
  const top = Math.max(0, Math.min(100, ((y - metrics.y0) / Math.max(1, metrics.height)) * 100));
  return { left, top };
}

function pointStyle(metrics, point) {
  const pos = pointPercent(metrics, point);
  if (!pos) return "display:none";
  const { left, top } = pos;
  return `left:${left.toFixed(3)}%;top:${top.toFixed(3)}%;`;
}

function safeDomId(value) {
  return String(value || "x").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function portalArrowHtml(metrics, portal, markerId) {
  if (!isSameMapDifferentPointPortal(portal)) return "";
  const start = pointPercent(metrics, portal);
  const target = pointPercent(metrics, portal.sameMapTarget || {});
  if (!start || !target) return "";
  const title = portalTitle(portal);
  return `<line class="portalArrowLine" x1="${start.left.toFixed(3)}" y1="${start.top.toFixed(3)}" x2="${target.left.toFixed(3)}" y2="${target.top.toFixed(3)}" marker-end="url(#${markerId})"><title>${escapeHtml(title)}</title></line>`;
}

function portalArrowsHtml(metrics, portals, mapId) {
  const markerId = `portalArrowHead-${safeDomId(mapId)}`;
  const arrows = portals.map(portal => portalArrowHtml(metrics, portal, markerId)).join("");
  if (!arrows) return "";
  return `
    <svg class="portalArrowLayer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="${markerId}" class="portalArrowHead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L7,3.5 L0,7 Z"></path>
        </marker>
      </defs>
      ${arrows}
    </svg>
  `;
}

function renderMapCanvas(map) {
  const metrics = mapMetrics(map);
  const imageStyle = map.miniMapImage ? `background-image:url('${escapeHtml(map.miniMapImage)}');` : "";
  const style = `aspect-ratio:${Math.max(320, Math.round(metrics.width))} / ${Math.max(180, Math.round(metrics.height))};${imageStyle}`;
  const spawns = displayCoordinateSpawns(map);
  const npcs = displayNpcs(map);
  const portals = displayPortals(map);
  const metricText = map.miniMapImage ? "" : (metrics.source === "miniMap" ? `${metrics.width} × ${metrics.height}` : "座標範圍");
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>小地圖</h3>
        ${metricText ? `<span>${escapeHtml(metricText)}</span>` : ""}
      </div>
      <div class="mapCanvasShell">
        <div class="mapCanvas ${map.miniMapImage ? "withMiniMapImage" : ""}" style="${style}" aria-label="${escapeHtml(map.name)}">
          <div class="mapAxisLabel mapAxisLabelX">${formatNumber(Math.round(metrics.x0))} → ${formatNumber(Math.round(metrics.x1))}</div>
          <div class="mapAxisLabel mapAxisLabelY">${formatNumber(Math.round(metrics.y0))} → ${formatNumber(Math.round(metrics.y1))}</div>
          ${portalArrowsHtml(metrics, portals, map.id)}
          ${spawns.map(spawn => markerHtml(metrics, spawn, "spawn")).join("")}
          ${npcs.map(npc => markerHtml(metrics, npc, "npc")).join("")}
          ${portals.map(portal => markerHtml(metrics, portal, "portal", map.id)).join("")}
        </div>
        <div class="mapLegend">
          <span><i class="legendDot spawnDot"></i>怪物重生點</span>
          <span><i class="legendDot npcDot"></i>NPC</span>
          <span><i class="legendDot portalDot"></i>跨地圖傳送</span>
          <span><i class="legendDot sameMapDot"></i>同地圖傳送</span>
        </div>
        ${mapLayerControlsHtml(map)}
      </div>
    </section>
  `;
}

function mapLayerControlsHtml(map) {
  const hiddenMonsterCount = hiddenSpawnMonsterCount(map);
  const unnamedCount = unnamedNpcCount(map);
  const monsterButtonText = hiddenMonsterCount > 0 ? "顯示全部怪物" : "隱藏怪物";
  const monsterPressed = hiddenMonsterCount === 0;
  const unnamedNpcButtonText = state.showUnnamedNpcs
    ? "隱藏未命名NPC"
    : "顯示未命名NPC";
  const unnamedNpcButton = unnamedCount
    ? `<button class="mapLayerToggle" type="button" data-layer-toggle="unnamedNpcs" aria-pressed="${String(state.showUnnamedNpcs)}">${escapeHtml(unnamedNpcButtonText)}</button>`
    : "";
  return `
    <div class="mapLayerControls" aria-label="小地圖顯示選項">
      <button class="mapLayerToggle" type="button" data-layer-toggle="monsters" aria-pressed="${String(monsterPressed)}">${escapeHtml(monsterButtonText)}</button>
      <button class="mapLayerToggle" type="button" data-layer-toggle="npcs" aria-pressed="${String(state.showNpcs)}">${state.showNpcs ? "隱藏NPC" : "顯示NPC"}</button>
      ${unnamedNpcButton}
      <button class="mapLayerToggle" type="button" data-layer-toggle="crossPortals" aria-pressed="${String(state.showCrossPortals)}">${state.showCrossPortals ? "隱藏跨地圖傳送" : "顯示跨地圖傳送"}</button>
      <button class="mapLayerToggle" type="button" data-layer-toggle="sameMapPortals" aria-pressed="${String(state.showSameMapPortals)}">${state.showSameMapPortals ? "隱藏同地圖傳送" : "顯示同地圖傳送"}</button>
    </div>
  `;
}

function markerHtml(metrics, point, kind, currentMapId) {
  const style = pointStyle(metrics, point);
  if (kind === "spawn") {
    const title = `${point.name || point.monsterId} (${formatNumber(point.x)}, ${formatNumber(point.y)})${point.level ? ` · Lv.${point.level}` : ""}${state.showIds ? ` · ID ${point.monsterId}` : ""}`;
    const image = point.image
      ? `<img class="spawnMarkerImage" src="${escapeHtml(point.image)}" alt="${escapeHtml(point.name || point.monsterId)}" loading="lazy">`
      : `<span class="spawnMarkerFallback"></span>`;
    return `<a class="mapMarker spawnMarker" style="${style}" href="./index.html?monster=${encodeURIComponent(point.monsterId)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${image}</a>`;
  }
  if (kind === "npc") {
    const title = `${point.name || point.npcId} (${formatNumber(point.x)}, ${formatNumber(point.y)})${state.showIds ? ` · ID ${point.npcId}` : ""}`;
    const image = point.image
      ? `<img class="npcMarkerImage" src="${escapeHtml(point.image)}" alt="${escapeHtml(point.name || point.npcId)}" loading="lazy">`
      : `<span class="npcMarkerFallback">人</span>`;
    return `<div class="mapMarker npcMarker" style="${style}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${image}<span class="npcMarkerLabel">${escapeHtml(point.name || point.npcId)}</span></div>`;
  }
  const title = portalTitle(point);
  const sameMap = Boolean(point.sameMap);
  if (point.targetMapId && !sameMap) {
    return `<a class="mapMarker portalMarker" style="${style}" href="./maps.html?map=${encodeURIComponent(point.targetMapId)}" data-target-id="${escapeHtml(point.targetMapId)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></a>`;
  }
  return `<button class="mapMarker portalMarker sameMapPortal" style="${style}" type="button" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></button>`;
}

function portalTitle(portal) {
  const here = `${formatNumber(portal.x)}, ${formatNumber(portal.y)}`;
  if (portal.sameMap) {
    const target = portal.sameMapTarget || {};
    const targetText = Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.y))
      ? `同地圖座標 (${formatNumber(target.x)}, ${formatNumber(target.y)})`
      : "同地圖目標";
    const ids = state.showIds ? portalInternalIdText(portal) : "";
    return `同地圖傳送 (${here}) → ${targetText}${ids ? ` · ${ids}` : ""}`;
  }
  if (portal.targetMapId) {
    const ids = state.showIds ? portalInternalIdText(portal) : "";
    return `前往 ${portal.targetMapName || portal.targetMapId} (${here})${ids ? ` · ${ids}` : ""}`;
  }
  const ids = state.showIds ? portalInternalIdText(portal) : "";
  return `傳送點 (${here})${ids ? ` · ${ids}` : ""}`;
}

function portalInternalIdText(portal) {
  const parts = [];
  if (portal.name) parts.push(`入口 ${portal.name}`);
  if (portal.targetPortal) parts.push(`目標 ${portal.targetPortal}`);
  if (portal.pt !== undefined) parts.push(`類型 ${portal.pt}`);
  if (portal.targetMapId) parts.push(`地圖ID ${portal.targetMapId}`);
  return parts.join(" · ");
}

function portalMetaText(portal) {
  const parts = [];
  [portal.targetRegionName, portal.targetAreaName, portal.targetMapStreet].forEach(value => {
    const text = String(value || "").trim();
    if (text && !parts.includes(text)) parts.push(text);
  });
  return parts.join(" · ");
}

function groupedSpawns(map) {
  const groups = new window.Map();
  (map.monsterSpawns || []).forEach(spawn => {
    const key = String(spawn.monsterId);
    if (!groups.has(key)) {
      groups.set(key, { ...spawn, count: 0, listedOnlyCount: 0, sourceLabels: [] });
    }
    const group = groups.get(key);
    if (hasSpawnCoordinates(spawn)) {
      group.count += 1;
    } else {
      group.listedOnlyCount += 1;
      const label = spawn.sourceLabel || "未提供座標";
      if (!group.sourceLabels.includes(label)) group.sourceLabels.push(label);
    }
  });
  return [...groups.values()].sort((a, b) => {
    const levelDiff = Number(a.level || 9999) - Number(b.level || 9999);
    if (levelDiff) return levelDiff;
    return String(a.name).localeCompare(String(b.name), "zh-Hant");
  });
}

function visibilityIcon(hidden) {
  if (hidden) {
    return `<svg class="visibilityIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  }
  return `<svg class="visibilityIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a18.7 18.7 0 0 1 5-5.8"></path><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.5 3.4"></path><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"></path><path d="M3 3l18 18"></path></svg>`;
}

function renderSpawnList(map) {
  const rows = groupedSpawns(map);
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>怪物重生</h3>
        <span>${rows.length.toLocaleString()} 種</span>
      </div>
      <div class="sourceList">
        ${rows.map(spawn => {
          const hidden = isSpawnMonsterHidden(map, spawn.monsterId);
          const label = hidden ? "顯示" : "隱藏";
          const href = `./index.html?monster=${encodeURIComponent(spawn.monsterId)}`;
          const countText = spawn.count > 0 ? `${formatNumber(spawn.count)} 點` : (spawn.listedOnlyCount ? "圖鑑標註" : "0 點");
          return `
          <article class="sourceRow monsterSourceRow spawnControlRow ${hidden ? "isMuted" : ""}">
            <button class="layerIconButton spawnVisibilityToggle" type="button" data-map-id="${escapeHtml(map.id)}" data-monster-id="${escapeHtml(spawn.monsterId)}" aria-pressed="${String(!hidden)}" aria-label="${escapeHtml(label)} ${escapeHtml(spawn.name)}" title="${escapeHtml(label)} ${escapeHtml(spawn.name)}">${visibilityIcon(hidden)}</button>
            <a class="spawnImageLink" href="${href}">
              ${assetImage(spawn.image, spawn.name, spawn.name.slice(0, 1), "sourceMonsterImage")}
            </a>
            <a class="spawnTextLink inlineSourceLink" href="${href}">
              <strong>${escapeHtml(spawn.name)}</strong>
              <span>${spawn.level ? `Lv.${escapeHtml(spawn.level)}` : "等級未知"}${idMeta(spawn.monsterId)}</span>
              <p>${escapeHtml(spawnCoordinateText(map, spawn.monsterId))}</p>
            </a>
            <small>${escapeHtml(countText)}</small>
          </article>
        `}).join("") || `<div class="empty">沒有怪物重生資料</div>`}
      </div>
    </section>
  `;
}

function spawnCoordinateText(map, monsterId) {
  const rows = (map.monsterSpawns || [])
    .filter(spawn => String(spawn.monsterId) === String(monsterId))
  const coordinates = rows
    .filter(hasSpawnCoordinates)
    .slice(0, 8)
    .map(spawn => `(${formatNumber(spawn.x)}, ${formatNumber(spawn.y)})`);
  if (coordinates.length) return coordinates.join("、");
  if (rows.some(spawn => spawn.source === "monsterBook" && spawn.coordinateMissing)) {
    return "怪物圖鑑標註此地圖，但資料庫未提供重生座標";
  }
  return "座標未標註";
}

function renderPortalList(map) {
  if (!state.showCrossPortals && !state.showSameMapPortals) return "";
  const rows = displayPortals(map);
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>傳送點</h3>
        <span>${rows.length.toLocaleString()} 個</span>
      </div>
      <div class="sourceList">
        ${rows.map(portal => portalRow(portal)).join("") || `<div class="empty">沒有傳送點資料</div>`}
      </div>
    </section>
  `;
}

function portalRow(portal) {
  const title = portalTitle(portal);
  const heading = portal.sameMap ? "同地圖傳送" : (portal.targetMapName || "傳送點");
  const meta = portalMetaText(portal);
  const coordinate = portal.sameMap && portal.sameMapTarget
    ? `座標 (${formatNumber(portal.x)}, ${formatNumber(portal.y)}) → (${formatNumber(portal.sameMapTarget.x)}, ${formatNumber(portal.sameMapTarget.y)})`
    : `座標 (${formatNumber(portal.x)}, ${formatNumber(portal.y)})`;
  const idLine = state.showIds ? portalInternalIdText(portal) : "";
  const icon = portal.targetMarkImage
    ? assetImage(portal.targetMarkImage, portal.targetRegionName || heading, "圖", "sourceMonsterImage")
    : `<div class="sourceMonsterImage portalMiniIcon">${portal.sameMap ? "同" : "傳"}</div>`;
  const body = `
    ${icon}
    <div>
      <strong>${escapeHtml(heading)}</strong>
      <span>${escapeHtml(meta || title)}</span>
      <p>${escapeHtml(coordinate)}${idLine ? ` · ${escapeHtml(idLine)}` : ""}</p>
    </div>
    <small>${portal.targetMapId && !portal.sameMap ? "前往" : "提示"}</small>
  `;
  if (portal.targetMapId && !portal.sameMap) {
    return `<a class="sourceRow sourceLinkRow monsterSourceRow" href="./maps.html?map=${encodeURIComponent(portal.targetMapId)}" data-target-id="${escapeHtml(portal.targetMapId)}">${body}</a>`;
  }
  return `<article class="sourceRow monsterSourceRow">${body}</article>`;
}

function render() {
  updateToggles();
  updateSettingsPanel();
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
  saveBool("ms_map_name_only_search", state.nameOnlySearch);
  render();
});

els.regionButton.addEventListener("click", () => {
  setMapRegionMenu(els.regionButton.getAttribute("aria-expanded") !== "true");
});

els.regionOptions.addEventListener("change", event => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  state.preserveSelectedDetail = false;
  state.regions = selectedMapRegionValues();
  saveSelectedMapRegions();
  updateMapRegionSummary();
  render();
});

els.regionOptions.addEventListener("click", event => {
  if (!event.target.closest("#mapRegionClear")) return;
  state.preserveSelectedDetail = false;
  state.regions = [];
  saveSelectedMapRegions();
  syncMapRegionInputs();
  render();
});

document.addEventListener("click", event => {
  if (!els.region.contains(event.target)) setMapRegionMenu(false);
});

els.unnamedMapToggle.addEventListener("click", () => {
  state.preserveSelectedDetail = false;
  state.showUnnamedMaps = !state.showUnnamedMaps;
  saveBool("ms_show_unnamed_maps", state.showUnnamedMaps);
  setMapUrl(state.selectedId);
  render();
});

els.specialMapToggle.addEventListener("click", () => {
  state.preserveSelectedDetail = false;
  state.showSpecialMaps = !state.showSpecialMaps;
  saveBool("ms_show_special_maps", state.showSpecialMaps);
  setMapUrl(state.selectedId);
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
  const button = event.target.closest(".mapIndexRow");
  if (!button) return;
  selectMap(button.dataset.id, false);
});

els.detail.addEventListener("click", event => {
  const layerButton = event.target.closest("[data-layer-toggle]");
  if (layerButton) {
    event.preventDefault();
    const map = selectedMap();
    const layer = layerButton.getAttribute("data-layer-toggle");
    if (layer === "monsters") {
      toggleAllMapSpawns(map);
    } else if (layer === "npcs") {
      state.showNpcs = !state.showNpcs;
      saveBool("ms_map_show_npcs", state.showNpcs);
    } else if (layer === "unnamedNpcs") {
      state.showUnnamedNpcs = !state.showUnnamedNpcs;
      saveBool("ms_map_show_unnamed_npcs", state.showUnnamedNpcs);
    } else if (layer === "crossPortals") {
      state.showCrossPortals = !state.showCrossPortals;
      saveBool("ms_map_show_cross_portals", state.showCrossPortals);
    } else if (layer === "sameMapPortals") {
      state.showSameMapPortals = !state.showSameMapPortals;
      saveBool("ms_map_show_same_map_portals", state.showSameMapPortals);
    }
    render();
    return;
  }

  const spawnButton = event.target.closest(".spawnVisibilityToggle");
  if (spawnButton) {
    event.preventDefault();
    const map = selectedMap();
    const monsterId = spawnButton.getAttribute("data-monster-id");
    if (map && monsterId) {
      toggleSpawnMonster(map, monsterId);
      render();
    }
    return;
  }

  const target = event.target.closest("[data-target-id]");
  if (!target) return;
  const mapId = target.getAttribute("data-target-id");
  if (!mapId) return;
  event.preventDefault();
  selectMap(mapId);
});

window.addEventListener("popstate", () => {
  state.selectedId = initialMapId();
  state.preserveSelectedDetail = Boolean(state.selectedId);
  render();
});

applyTheme();
renderBuildMeta();
populateFilters();
syncControls();
bindSearchHistory();
render();
