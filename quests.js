const db = window.MS_QUEST_DB;
const state = {
  query: "",
  category: "",
  level: "",
  showIds: false,
  selectedId: initialQuestId(),
};

const els = {
  search: document.getElementById("questSearch"),
  category: document.getElementById("questCategoryFilter"),
  level: document.getElementById("questLevelFilter"),
  idToggle: document.getElementById("idToggle"),
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

function idMeta(id) {
  return state.showIds ? ` · ID ${escapeHtml(id)}` : "";
}

function levelText(quest) {
  if (quest.minLevel && quest.maxLevel) return `Lv.${quest.minLevel}-${quest.maxLevel}`;
  if (quest.minLevel) return `Lv.${quest.minLevel}+`;
  if (quest.maxLevel) return `Lv.${quest.maxLevel} 以下`;
  return "無等級限制";
}

function levelMatches(quest) {
  const level = Number(quest.minLevel || 0);
  if (!state.level) return true;
  if (state.level === "none") return !level;
  if (state.level === "1-10") return level >= 1 && level <= 10;
  if (state.level === "11-30") return level >= 11 && level <= 30;
  if (state.level === "31-70") return level >= 31 && level <= 70;
  if (state.level === "71+") return level >= 71;
  return true;
}

function searchableText(quest) {
  const reqs = [quest.startRequirements, quest.completeRequirements].filter(Boolean);
  const acts = [quest.startRewards, quest.completeRewards].filter(Boolean);
  const reqItems = reqs.flatMap(row => row.items || []);
  const reqMobs = reqs.flatMap(row => row.monsters || []);
  const reqQuests = reqs.flatMap(row => row.quests || []);
  const rewardItems = acts.flatMap(row => row.items || []);
  const refs = quest.refs || {};
  return [
    quest.id,
    quest.name,
    quest.category,
    quest.parent,
    quest.startNpc?.name,
    quest.endNpc?.name,
    quest.nextQuest?.name,
    ...(quest.texts || []).map(row => row.text),
    ...reqItems.flatMap(item => [item.id, item.name, item.category]),
    ...rewardItems.flatMap(item => [item.id, item.name, item.category]),
    ...reqMobs.flatMap(monster => [monster.id, monster.name]),
    ...reqQuests.flatMap(row => [row.id, row.name]),
    ...(refs.npcs || []).flatMap(npc => [npc.id, npc.name]),
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
    if (q && !searchableText(quest).includes(q)) return false;
    return true;
  }).sort(compareQuests);
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

function updateToggles() {
  els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  els.idToggle.textContent = state.showIds ? "隱藏ID" : "顯示ID";
}

function renderList() {
  const rows = filteredQuests();
  if (!rows.some(quest => String(quest.id) === String(state.selectedId))) {
    state.selectedId = rows[0]?.id || null;
  }
  els.count.textContent = `${rows.length.toLocaleString()} 個`;
  const visibleRows = rows.slice(0, 900);
  const limitNote = rows.length > visibleRows.length
    ? `<div class="listLimit">已顯示前 ${visibleRows.length.toLocaleString()} 個</div>`
    : "";
  els.list.innerHTML = visibleRows.map(quest => `
    <button class="monsterRow questIndexRow ${String(quest.id) === String(state.selectedId) ? "active" : ""}" data-id="${quest.id}">
      <div class="questGlyph">任</div>
      <span class="rowText">
        <strong>${escapeHtml(quest.name)}</strong>
        <span class="rowMeta">${escapeHtml(quest.category)} · ${escapeHtml(levelText(quest))}${idMeta(quest.id)}</span>
        <em>${escapeHtml(quest.parent || quest.startNpc?.name || "任務")}</em>
      </span>
      <small>${questRewardCount(quest)}</small>
    </button>
  `).join("") + limitNote;
}

function questRewardCount(quest) {
  const complete = quest.completeRewards || {};
  return (complete.items || []).filter(item => item.action === "give").length;
}

function selectedQuest() {
  const rows = filteredQuests();
  return rows.find(quest => String(quest.id) === String(state.selectedId)) || rows[0];
}

function renderDetail() {
  const quest = selectedQuest();
  if (!quest) {
    els.detail.innerHTML = `<div class="empty">找不到符合的任務</div>`;
    return;
  }
  els.detail.innerHTML = `
    <section class="monsterHero questHero">
      <div class="questMark">任</div>
      <div class="heroText">
        <h2>${escapeHtml(quest.name)}</h2>
        <p>${escapeHtml(quest.category)} · ${escapeHtml(levelText(quest))}${idMeta(quest.id)}${quest.parent ? ` · ${escapeHtml(quest.parent)}` : ""}</p>
      </div>
      <div class="heroCounters">
        <div class="heroCounter"><strong>${formatNumber(totalRequirementCount(quest))}</strong><span>需求</span></div>
        <div class="heroCounter"><strong>${formatNumber(totalRewardCount(quest))}</strong><span>獎勵</span></div>
      </div>
    </section>
    ${renderQuestTexts(quest)}
    ${renderQuestMeta(quest)}
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
    ["接取 NPC", quest.startNpc?.name || "自動/未知"],
    ["完成 NPC", quest.endNpc?.name || "自動/未知"],
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
          ${group.npc ? `<div class="statCell"><span>NPC</span><strong>${escapeHtml(group.npc.name)}${idMeta(group.npc.id)}</strong></div>` : ""}
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
  const meta = [];
  if (quest.stateLabel) meta.push(quest.stateLabel);
  if (state.showIds) meta.push(`ID ${quest.id}`);
  return `
    <a class="miniLink" href="${questUrl(quest.id)}">
      <div class="miniIcon">任</div>
      <span><strong>${escapeHtml(quest.name)}</strong><em>${escapeHtml(meta.join(" · ") || "任務")}</em></span>
    </a>
  `;
}

function npcChip(npc) {
  return `
    <div class="miniLink staticMini">
      <div class="miniIcon">人</div>
      <span><strong>${escapeHtml(npc.name)}</strong><em>${state.showIds ? `ID ${escapeHtml(npc.id)}` : "NPC"}</em></span>
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

els.level.addEventListener("change", event => {
  state.level = event.target.value;
  render();
});

els.idToggle.addEventListener("click", () => {
  state.showIds = !state.showIds;
  render();
});

els.list.addEventListener("click", event => {
  const button = event.target.closest(".questIndexRow");
  if (!button) return;
  state.selectedId = button.dataset.id;
  setQuestUrl(state.selectedId);
  render();
});

renderBuildMeta();
populateFilters();
render();
