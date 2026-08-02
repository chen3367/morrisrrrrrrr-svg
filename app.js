const db = window.MS_DROP_DB;
const state = {
  query: "",
  continent: "",
  showIds: false,
  selectedId: null,
};

const els = {
  search: document.getElementById("search"),
  continent: document.getElementById("continentFilter"),
  idToggle: document.getElementById("idToggle"),
  list: document.getElementById("monsterList"),
  detail: document.getElementById("detail"),
  count: document.getElementById("resultCount"),
};

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
  ["undead", "不死", yesNo],
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

function filteredMonsters() {
  const q = norm(state.query);
  return db.monsters.filter(monster => {
    const continentOk = !state.continent || monster.continents.includes(state.continent);
    const queryOk = !q ||
      norm(monster.id).includes(q) ||
      norm(monster.name).includes(q) ||
      norm(elementalText(monster)).includes(q) ||
      monster.continents.some(continent => norm(continent).includes(q)) ||
      monster.maps.some(map => norm(map.id).includes(q) || norm(map.name).includes(q) || norm(map.street).includes(q)) ||
      monster.drops.some(item => norm(item.id).includes(q) || norm(item.name).includes(q));
    return continentOk && queryOk;
  }).sort(compareMonsters);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : escapeHtml(value);
}

function yesNo(value) {
  return Number(value) ? "是" : "否";
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function compareMonsters(a, b) {
  const levelDiff = levelRank(a) - levelRank(b);
  if (levelDiff) return levelDiff;
  const nameDiff = String(a.name).localeCompare(String(b.name), "zh-Hant");
  if (nameDiff) return nameDiff;
  return Number(a.id) - Number(b.id);
}

function levelRank(monster) {
  const level = Number(monster.level);
  return Number.isFinite(level) ? level : 9999;
}

function continentText(monster) {
  if (!monster.continents.length) return "未知大陸";
  if (monster.continents.length <= 2) return monster.continents.join("、");
  return `${monster.continents.slice(0, 2).join("、")} +${monster.continents.length - 2}`;
}

function populateFilters() {
  const continents = [...(db.filters?.continents || [])].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  els.continent.innerHTML = `
    <option value="">全部大陸</option>
    ${continents.map(continent => `<option value="${escapeHtml(continent)}">${escapeHtml(continent)}</option>`).join("")}
  `;
}

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function updateIdToggle() {
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
}

function renderList() {
  const rows = filteredMonsters();
  if (!rows.some(m => m.id === state.selectedId) && rows[0]) state.selectedId = rows[0].id;
  els.count.textContent = `${rows.length.toLocaleString()} 隻`;
  els.list.innerHTML = rows.slice(0, 500).map(monster => `
    <button class="monsterRow ${monster.id === state.selectedId ? "active" : ""}" data-id="${monster.id}">
      ${assetImage(monster.image, monster.name, monster.name.slice(0, 1), "rowMonsterImage")}
      <span class="rowText">
        <strong>${escapeHtml(monster.name)}</strong>
        <span class="rowMeta">${monster.level ? `Lv.${monster.level}` : "Lv.?"}${idMeta(monster.id)}</span>
        <em>${escapeHtml(continentText(monster))}</em>
      </span>
      <small>${monster.drops.length.toLocaleString()} 項</small>
    </button>
  `).join("");
}

function renderDetail() {
  const monster = db.monsters.find(m => m.id === state.selectedId) || filteredMonsters()[0];
  if (!monster) {
    els.detail.innerHTML = `<div class="empty">找不到符合的怪物</div>`;
    return;
  }
  const drops = monster.drops;
  els.detail.innerHTML = `
    <section class="monsterHero">
      ${assetImage(monster.image, monster.name, monster.name.slice(0, 1), "monsterMark")}
      <div class="heroText">
        <h2>${escapeHtml(monster.name)}</h2>
        <p>${heroMeta(monster)}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${drops.length.toLocaleString()}</strong><span>掉落物</span></div>
        <div class="heroCounter"><strong>${monster.maps.length.toLocaleString()}</strong><span>地圖</span></div>
      </div>
    </section>
    ${renderStats(monster)}
    ${renderElements(monster)}
    ${renderMaps(monster)}
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>掉落道具</h3>
        <span>${drops.length.toLocaleString()} 項</span>
      </div>
      <div class="dropGroups">
        ${renderDropGroups(drops)}
      </div>
    </section>
  `;
}

function elementalText(monster) {
  const values = monster.elemental?.values || {};
  const parts = ELEMENT_FIELDS.map(([key, label]) => `${label}${ELEMENT_STATE_LABELS[values[key] || "normal"]}`);
  if (monster.elemental?.summary) parts.push(monster.elemental.summary);
  return parts.join(" ");
}

function heroMeta(monster) {
  const parts = [];
  if (state.showIds) parts.push(`ID ${monster.id}`);
  if (monster.level) parts.push(`Lv.${monster.level}`);
  if (hasOwn(monster.stats, "maxHP")) parts.push(`HP ${formatNumber(monster.stats.maxHP)}`);
  if (hasOwn(monster.stats, "maxMP")) parts.push(`MP ${formatNumber(monster.stats.maxMP)}`);
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
  const notable = ELEMENT_FIELDS.filter(([key]) => (values[key] || "normal") !== "normal").length;
  const sourceText = elemental.source === "description" ? "圖鑑描述" : "怪物資料";
  return `
    <section class="sectionBlock">
      <div class="sectionTitle">
        <h3>屬性抗性</h3>
        <span>${notable ? `${notable} 項特殊屬性` : "一般"}</span>
      </div>
      <div class="elementGrid">
        ${ELEMENT_FIELDS.map(([key, label]) => elementCell(label, values[key] || "normal")).join("")}
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
  const meta = [map.street || "未知區域"];
  if (state.showIds) meta.push(map.id);
  return `
    <article class="mapCard">
      <strong>${escapeHtml(map.name)}</strong>
      <span>${meta.map(escapeHtml).join(" · ")}</span>
      ${map.desc ? `<p>${escapeHtml(shorten(map.desc, 88))}</p>` : ""}
    </article>
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
  const meta = state.showIds ? `ID ${escapeHtml(item.id)} · ${escapeHtml(item.kind)}` : escapeHtml(item.kind);
  const fallback = state.showIds ? String(item.id).slice(0, 3) : String(item.name || item.kind).slice(0, 1);
  return `
    <article class="itemCard">
      ${assetImage(item.image, item.name, fallback, "itemIcon")}
      <div class="itemText">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${meta}</span>
        ${item.desc ? `<p>${escapeHtml(shorten(item.desc, 92))}</p>` : ""}
      </div>
    </article>
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
  updateIdToggle();
  renderList();
  renderDetail();
}

els.search.addEventListener("input", event => {
  state.query = event.target.value;
  render();
});

els.continent.addEventListener("change", event => {
  state.continent = event.target.value;
  render();
});

els.idToggle.addEventListener("click", () => {
  state.showIds = !state.showIds;
  render();
});

els.list.addEventListener("click", event => {
  const button = event.target.closest(".monsterRow");
  if (!button) return;
  state.selectedId = button.dataset.id;
  render();
});

populateFilters();
render();
