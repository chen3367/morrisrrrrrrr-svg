const db = window.MS_SKILL_DB;
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
  jobGroup: cookieValue("ms_skill_job_group"),
  advancement: cookieValue("ms_skill_advancement"),
  jobId: cookieValue("ms_skill_job_id"),
  nameOnlySearch: cookieBool("ms_skill_name_only_search"),
  showIds: cookieBool("ms_show_ids"),
  favoriteIds: parseCookieSet("ms_favorite_skills"),
  theme: initialTheme(),
  settingsOpen: cookieBool("ms_settings_open"),
  selectedId: initialSkillId(),
  preserveSelectedDetail: Boolean(initialSkillId()),
};

const els = {
  search: document.getElementById("skillSearch"),
  group: document.getElementById("skillGroupFilter"),
  advancement: document.getElementById("advancementFilter"),
  job: document.getElementById("skillJobFilter"),
  clearFilters: document.getElementById("clearFilters"),
  nameOnlySearch: document.getElementById("nameOnlySearch"),
  nameOnlySearchControl: document.getElementById("nameOnlySearchControl"),
  idToggle: document.getElementById("idToggle"),
  themeToggle: document.getElementById("themeToggle"),
  settingsToggle: document.getElementById("settingsToggle"),
  settingsPanel: document.getElementById("settingsPanel"),
  meta: document.getElementById("buildMeta"),
  list: document.getElementById("skillList"),
  detail: document.getElementById("skillDetail"),
  count: document.getElementById("resultCount"),
};

function initialTheme() {
  const cookieTheme = cookieValue("ms_theme");
  if (cookieTheme === "dark" || cookieTheme === "light") return cookieTheme;
  try {
    return localStorage.getItem("ms-theme") === "dark" ? "dark" : "light";
  } catch (_error) {
    return "light";
  }
}

function initialSkillId() {
  return new URLSearchParams(window.location.search).get("skill");
}

function setSkillUrl(skillId) {
  if (!skillId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("skill", skillId);
  window.history.replaceState(null, "", url);
}

function renderBuildMeta() {
  if (!els.meta) return;
  const meta = db.metadata || {};
  const parts = [];
  if (meta.gameVersion) parts.push(`遊戲版本 ${meta.gameVersion}`);
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
  } catch (_error) {
    // 使用者若停用本機儲存，仍可在本次瀏覽切換。
  }
}

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
  return `<div class="${className}">${escapeHtml(fallback || "?")}</div>`;
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : escapeHtml(value);
}

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
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
  writeCookieSet("ms_favorite_skills", state.favoriteIds);
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

function skillUrl(skillId) {
  return `./skills.html?skill=${encodeURIComponent(skillId)}`;
}

function statLabel(skill, field) {
  return skill?.valueLabels?.[field] || db.statLabels?.[field] || field;
}

function levelText(skill) {
  const max = Number(skill.maxLevel);
  return Number.isFinite(max) ? `最高 ${max}` : "未知";
}

function searchableText(skill) {
  const levelText = (skill.levels || []).map(level => [
    level.level,
    level.description,
    Object.entries(level.values || {}).map(([key, value]) => `${key} ${statLabel(skill, key)} ${value}`).join(" "),
  ].join(" ")).join(" ");
  return [
    skill.id,
    skill.name,
    skill.jobId,
    skill.jobName,
    skill.jobGroup,
    skill.advancement,
    skill.description,
    skill.formula,
    ...(Object.values(skill.valueLabels || {})),
    levelText,
  ].map(norm).join(" ");
}

function filteredSkills() {
  const q = norm(state.query);
  return (db.skills || []).filter(skill => {
    if (state.jobGroup && skill.jobGroup !== state.jobGroup) return false;
    if (state.advancement && skill.advancement !== state.advancement) return false;
    if (state.jobId && String(skill.jobId) !== String(state.jobId)) return false;
    const searchText = state.nameOnlySearch ? norm(skill.name) : searchableText(skill);
    if (q && !searchText.includes(q)) return false;
    return true;
  }).sort(compareSkills);
}

function skillById(skillId) {
  return (db.skills || []).find(skill => String(skill.id) === String(skillId));
}

function compareSkills(a, b) {
  const groupDiff = Number(a.jobGroupOrder || 9999) - Number(b.jobGroupOrder || 9999);
  if (groupDiff) return groupDiff;
  const advancementDiff = Number(a.advancementOrder || 9999) - Number(b.advancementOrder || 9999);
  if (advancementDiff) return advancementDiff;
  const jobDiff = Number(a.jobId || 999999) - Number(b.jobId || 999999);
  if (jobDiff) return jobDiff;
  const idDiff = Number(a.id || 999999999) - Number(b.id || 999999999);
  if (idDiff) return idDiff;
  return String(a.name || "").localeCompare(String(b.name || ""), "zh-Hant");
}

function jobsForCurrentFilters() {
  return (db.filters?.skillJobs || []).filter(job => {
    if (state.jobGroup && job.jobGroup !== state.jobGroup) return false;
    if (state.advancement && job.advancement !== state.advancement) return false;
    return true;
  });
}

function populateFilters() {
  const groups = db.filters?.skillJobGroups || [];
  els.group.innerHTML = `
    <option value="">全部職業系</option>
    ${groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}
  `;

  const advancements = db.filters?.skillAdvancements || [];
  els.advancement.innerHTML = `
    <option value="">全部轉職</option>
    ${advancements.map(label => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`).join("")}
  `;
  populateJobFilter();
}

function populateJobFilter() {
  const jobs = jobsForCurrentFilters();
  els.job.innerHTML = `
    <option value="">全部技能書</option>
    ${jobs.map(job => `<option value="${escapeHtml(job.id)}">${escapeHtml(job.name)} · ${escapeHtml(job.jobGroup)} · ${escapeHtml(job.advancement)}</option>`).join("")}
  `;
  if (state.jobId && !jobs.some(job => String(job.id) === String(state.jobId))) {
    state.jobId = "";
  }
}

function syncControls() {
  els.search.value = state.query;
  if (els.nameOnlySearch) els.nameOnlySearch.checked = state.nameOnlySearch;
  els.group.value = state.jobGroup;
  state.jobGroup = els.group.value;
  els.advancement.value = state.advancement;
  state.advancement = els.advancement.value;
  populateJobFilter();
  els.job.value = state.jobId;
  state.jobId = els.job.value;
}

function clearSearchFilters() {
  state.preserveSelectedDetail = false;
  state.query = "";
  state.jobGroup = "";
  state.advancement = "";
  state.jobId = "";
  state.nameOnlySearch = false;
  writeCookie("ms_skill_job_group", "");
  writeCookie("ms_skill_advancement", "");
  writeCookie("ms_skill_job_id", "");
  writeCookie("ms_skill_name_only_search", "");
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
  const rows = filteredSkills();
  const pinned = favoritePinnedRows(rows, db.skills || [], skill => skill.id, compareSkills, 1000);
  if (!pinned.rows.some(skill => String(skill.id) === String(state.selectedId))) {
    const preserved = state.preserveSelectedDetail && skillById(state.selectedId);
    if (!preserved) state.selectedId = pinned.rows[0]?.id || null;
  }
  els.count.textContent = `${pinned.total.toLocaleString()} 個`;
  const visibleRows = pinned.rows;
  const limitNote = pinned.total > visibleRows.length
    ? `<div class="listLimit">已顯示前 ${visibleRows.length.toLocaleString()} 個</div>`
    : "";
  els.list.innerHTML = visibleRows.map(skill => `
    <div class="favoriteRowShell">
      ${favoriteButton(skill.id, skill.name)}
      <button class="monsterRow skillIndexRow ${String(skill.id) === String(state.selectedId) ? "active" : ""}" data-id="${skill.id}">
        ${assetImage(skill.image, skill.name, "技", "skillGlyph")}
        <span class="rowText">
          <strong>${escapeHtml(skill.name)}</strong>
          <span class="rowMeta">${escapeHtml(skill.jobGroup)} · ${escapeHtml(skill.advancement)}${idMeta(skill.id)}</span>
          <em>${escapeHtml(skill.jobName)}</em>
        </span>
        <small>${escapeHtml(levelText(skill))}</small>
      </button>
    </div>
  `).join("") + limitNote;
}

function selectedSkill() {
  const rows = filteredSkills();
  return (state.preserveSelectedDetail && skillById(state.selectedId))
    || (state.favoriteIds.has(String(state.selectedId)) && skillById(state.selectedId))
    || rows.find(skill => String(skill.id) === String(state.selectedId))
    || rows[0];
}

function renderDetail() {
  const skill = selectedSkill();
  if (!skill) {
    els.detail.innerHTML = `<div class="empty">找不到符合的技能</div>`;
    return;
  }
  const fields = levelFields(skill);
  els.detail.innerHTML = `
    <section class="monsterHero skillHero">
      ${assetImage(skill.image, skill.name, "技", "skillMark")}
      <div class="heroText">
        <h2>${escapeHtml(skill.name)}</h2>
        <p>${escapeHtml(skill.jobGroup)} · ${escapeHtml(skill.advancement)} · ${escapeHtml(skill.jobName)}${idMeta(skill.id)}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${escapeHtml(levelText(skill).replace("最高 ", ""))}</strong><span>最高等級</span></div>
      </div>
    </section>
    ${renderSkillMeta(skill)}
    ${renderSkillText(skill)}
    ${renderLevelTable(skill, fields)}
  `;
}

function renderSkillMeta(skill) {
  const rows = [
    ["職業系", skill.jobGroup],
    ["轉職階段", skill.advancement],
    ["技能書", skill.jobName],
    ["最高等級", levelText(skill)],
  ];
  if (state.showIds) {
    rows.push(["技能 ID", skill.id]);
    rows.push(["職業 ID", skill.jobId]);
  }
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>技能資訊</h3>
        <span>${rows.length.toLocaleString()} 欄</span>
      </div>
      <div class="statsGrid compactStats">
        ${rows.map(([label, value]) => `<div class="statCell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
    </section>
  `;
}

function renderSkillText(skill) {
  const rows = [];
  if (skill.description) rows.push(["技能描述", skill.description]);
  const fields = levelFields(skill);
  const labels = fields.map(field => statLabel(skill, field)).filter(Boolean);
  if (labels.length) rows.push(["數值欄位", [...new Set(labels)].join("、")]);
  if (!rows.length) return "";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>描述</h3>
        <span>${rows.length.toLocaleString()} 段</span>
      </div>
      <div class="textLines">
        ${rows.map(([label, text]) => `
          <article class="textLine">
            <strong>${escapeHtml(label)}</strong>
            <p>${escapeHtml(text)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function levelFields(skill) {
  const fields = new Set(skill.valueFields || []);
  (skill.levels || []).forEach(level => {
    Object.keys(level.values || {}).forEach(field => fields.add(field));
  });
  return [...fields];
}

function renderLevelTable(skill, fields) {
  const levels = skill.levels || [];
  if (!levels.length) {
    return `<div class="empty">目前資料集中沒有此技能的逐級數值描述</div>`;
  }
  const fieldHeads = fields.map(field => `<th>${escapeHtml(statLabel(skill, field))}</th>`).join("");
  const rows = levels.map(level => `
    <tr>
      <td class="skillLevelCell">${escapeHtml(level.level)}</td>
      ${fields.map(field => `<td class="skillValueCell">${level.values && Object.prototype.hasOwnProperty.call(level.values, field) ? escapeHtml(level.values[field]) : ""}</td>`).join("")}
      <td class="skillDescCell">${escapeHtml(level.description || "")}</td>
    </tr>
  `).join("");
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>每級效果</h3>
        <span>${levels.length.toLocaleString()} 級</span>
      </div>
      <div class="skillTableWrap">
        <table class="skillTable">
          <thead>
            <tr>
              <th>Lv</th>
              ${fieldHeads}
              <th>展開效果</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
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
  saveBool("ms_skill_name_only_search", state.nameOnlySearch);
  render();
});

els.group.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.jobGroup = event.target.value;
  writeCookie("ms_skill_job_group", state.jobGroup);
  populateJobFilter();
  syncControls();
  render();
});

els.advancement.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.advancement = event.target.value;
  writeCookie("ms_skill_advancement", state.advancement);
  populateJobFilter();
  syncControls();
  render();
});

els.job.addEventListener("change", event => {
  state.preserveSelectedDetail = false;
  state.jobId = event.target.value;
  writeCookie("ms_skill_job_id", state.jobId);
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
  const favorite = event.target.closest("[data-favorite-id]");
  if (favorite) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(favorite.dataset.favoriteId);
    return;
  }
  const button = event.target.closest(".skillIndexRow");
  if (!button) return;
  state.preserveSelectedDetail = false;
  state.selectedId = button.dataset.id;
  setSkillUrl(state.selectedId);
  render();
});

applyTheme();
renderBuildMeta();
populateFilters();
syncControls();
bindSearchHistory();
render();
