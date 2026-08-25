const db = window.MS_DROP_DB || {};
const STORAGE_KEY = "ms-boss-timer-state-v1";
const COOKIE_STATE_KEY = "ms_boss_timer_state_v1";
const FAVORITE_COOKIE_KEY = "ms_favorite_boss_timers";
const COOKIE_CHUNK_PREFIX = `${COOKIE_STATE_KEY}_chunk_`;
const COOKIE_CHUNK_COUNT_KEY = `${COOKIE_STATE_KEY}_chunks`;
const COOKIE_CHUNK_SIZE = 3200;
const COOKIE_MAX_CHUNKS = 24;
const SETTINGS_KEY = "ms-boss-timer-settings-v1";
const CHANNEL_COUNT = 60;
const LOG_LIMIT = 60;

const DEFAULT_BOSSES = [
  {
    key: "2220000",
    id: "2220000",
    name: "紅寶王",
    type: "fixed",
    minMinutes: 45,
    maxMinutes: 45,
    mapLabel: "維多利亞 / 海岸草叢Ⅲ",
    mapUrl: "./maps.html?map=104000400",
    note: "固定重生時間",
  },
  {
    key: "3220000",
    id: "3220000",
    name: "樹妖王",
    type: "fixed",
    minMinutes: 45,
    maxMinutes: 45,
    mapLabel: "維多利亞 / 東方岩石山Ⅴ",
    mapUrl: "./maps.html?map=101030404",
    note: "固定重生時間",
  },
  {
    key: "5220000",
    id: "5220000",
    name: "巨居蟹",
    type: "fixed",
    minMinutes: 45,
    maxMinutes: 45,
    mapLabel: "黃金海岸 / 海龜沙灘",
    mapUrl: "./maps.html?map=110040000",
    note: "固定重生時間",
  },
  {
    key: "5220002:100040105",
    id: "5220002",
    name: "殭屍猴王",
    type: "fixed",
    minMinutes: 45,
    maxMinutes: 45,
    mapLabel: "隱密之地 / 巫婆森林Ⅰ",
    mapUrl: "./maps.html?map=100040105",
    note: "固定重生時間",
  },
  {
    key: "5220002:100040106",
    id: "5220002",
    name: "殭屍猴王",
    type: "fixed",
    minMinutes: 45,
    maxMinutes: 45,
    mapLabel: "隱密之地 / 巫婆森林Ⅱ",
    mapUrl: "./maps.html?map=100040106",
    note: "固定重生時間",
  },
  {
    key: "6130101",
    id: "6130101",
    name: "蘑菇王",
    type: "random",
    minMinutes: 45,
    maxMinutes: 60,
    mapLabel: "隱藏地圖 / 菇菇王出沒地",
    mapUrl: "./maps.html?map=100000005",
    note: "浮動重生窗口",
  },
  {
    key: "6300005",
    id: "6300005",
    name: "殭屍蘑菇王",
    type: "random",
    minMinutes: 45,
    maxMinutes: 60,
    mapLabel: "地城 / 蘑菇王之墓",
    mapUrl: "./maps.html?map=105070002",
    note: "浮動重生窗口",
  },
  {
    key: "6220000:107000300",
    id: "6220000",
    name: "沼澤巨鱷",
    type: "fixed",
    minMinutes: 45,
    maxMinutes: 45,
    mapLabel: "戰火之地 / 鱷魚潭Ⅰ",
    mapUrl: "./maps.html?map=107000300",
    note: "固定重生時間",
  },
  {
    key: "6220000:107000400",
    id: "6220000",
    name: "沼澤巨鱷",
    type: "fixed",
    minMinutes: 45,
    maxMinutes: 45,
    mapLabel: "戰火之地 / 鱷魚潭Ⅱ",
    mapUrl: "./maps.html?map=107000400",
    note: "固定重生時間",
  },
  {
    key: "8130100",
    id: "8130100",
    name: "巴洛古",
    type: "random",
    minMinutes: 240,
    maxMinutes: 360,
    mapLabel: "迷霧森林 / 被詛咒的寺院",
    mapUrl: "./maps.html?map=105090900",
    note: "浮動重生窗口",
  },
];

const state = {
  selectedBossId: DEFAULT_BOSSES[0].key,
  selectedChannel: 1,
  timers: {},
  logs: [],
  settings: {},
  favoriteIds: new Set(),
};

const bossListEl = document.getElementById("bossTimerBossList");
const logEl = document.getElementById("bossTimerLog");
const detailEl = document.getElementById("simulatorDetail");
const buildMetaEl = document.getElementById("buildMeta");
const themeToggleEl = document.getElementById("themeToggle");
let tickHandle = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {}
}

function readCookieRaw(name) {
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const rows = document.cookie ? document.cookie.split("; ") : [];
    for (const row of rows) {
      if (row.startsWith(prefix)) return row.slice(prefix.length);
    }
  } catch (_error) {}
  return "";
}

function writeCookieRaw(name, rawValue) {
  try {
    document.cookie = `${encodeURIComponent(name)}=${rawValue}; max-age=31536000; path=/; SameSite=Lax`;
  } catch (_error) {}
}

function parseCookieSet(name) {
  const raw = readCookieRaw(name);
  if (!raw) return new Set();
  try {
    return new Set(decodeURIComponent(raw).split("|").map(value => value.trim()).filter(Boolean));
  } catch (_error) {
    return new Set(raw.split("|").map(value => value.trim()).filter(Boolean));
  }
}

function writeCookieSet(name, values) {
  writeCookieRaw(name, encodeURIComponent([...values].join("|")));
}

function clearCookie(name) {
  try {
    document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/; SameSite=Lax`;
  } catch (_error) {}
}

function readChunkedCookie(name) {
  const count = Math.trunc(toNumber(readCookieRaw(COOKIE_CHUNK_COUNT_KEY), 0));
  if (count > 0 && count <= COOKIE_MAX_CHUNKS) {
    const chunks = [];
    for (let index = 0; index < count; index += 1) {
      const chunk = readCookieRaw(`${COOKIE_CHUNK_PREFIX}${index}`);
      if (!chunk) return "";
      chunks.push(chunk);
    }
    try {
      return decodeURIComponent(chunks.join(""));
    } catch (_error) {
      return "";
    }
  }
  const raw = readCookieRaw(name);
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch (_error) {
    return "";
  }
}

function writeChunkedCookie(name, value) {
  const encoded = encodeURIComponent(value);
  clearCookie(name);
  for (let index = 0; index < COOKIE_MAX_CHUNKS; index += 1) {
    clearCookie(`${COOKIE_CHUNK_PREFIX}${index}`);
  }
  if (encoded.length <= COOKIE_CHUNK_SIZE) {
    writeCookieRaw(name, encoded);
    clearCookie(COOKIE_CHUNK_COUNT_KEY);
    return;
  }
  const chunks = [];
  for (let index = 0; index < encoded.length; index += COOKIE_CHUNK_SIZE) {
    chunks.push(encoded.slice(index, index + COOKIE_CHUNK_SIZE));
  }
  if (chunks.length > COOKIE_MAX_CHUNKS) return;
  writeCookieRaw(COOKIE_CHUNK_COUNT_KEY, String(chunks.length));
  chunks.forEach((chunk, index) => writeCookieRaw(`${COOKIE_CHUNK_PREFIX}${index}`, chunk));
}

function loadCookieJson(fallback = null) {
  try {
    const raw = readChunkedCookie(COOKIE_STATE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function saveCookieJson(value) {
  try {
    writeChunkedCookie(COOKIE_STATE_KEY, JSON.stringify(value));
  } catch (_error) {}
}

function bossKey(bossOrId) {
  if (bossOrId && typeof bossOrId === "object") return String(bossOrId.key || bossOrId.id);
  return String(bossOrId ?? "");
}

function resolveBossKey(value) {
  const key = String(value ?? "");
  const exact = DEFAULT_BOSSES.find(boss => bossKey(boss) === key);
  if (exact) return bossKey(exact);
  const byMonsterId = DEFAULT_BOSSES.find(boss => String(boss.id) === key);
  return byMonsterId ? bossKey(byMonsterId) : bossKey(DEFAULT_BOSSES[0]);
}

function migrateLegacyTimerKeys() {
  const legacyZombieKey = "5220002";
  const firstZombieSpawnKey = "5220002:100040105";
  if (state.timers[legacyZombieKey] && !state.timers[firstZombieSpawnKey]) {
    state.timers[firstZombieSpawnKey] = state.timers[legacyZombieKey];
  }
  if (state.settings[legacyZombieKey] && !state.settings[firstZombieSpawnKey]) {
    state.settings[firstZombieSpawnKey] = state.settings[legacyZombieKey];
  }
}

function normalizeLoadedState(payload) {
  if (!payload || typeof payload !== "object") return;
  state.selectedBossId = resolveBossKey(payload.selectedBossId || state.selectedBossId);
  state.selectedChannel = clamp(Math.trunc(toNumber(payload.selectedChannel, 1)), 1, CHANNEL_COUNT);
  if (payload.timers && typeof payload.timers === "object") {
    state.timers = payload.timers;
  }
  if (Array.isArray(payload.logs)) {
    state.logs = payload.logs.slice(0, LOG_LIMIT);
  }
}

function persistState() {
  const payload = {
    selectedBossId: state.selectedBossId,
    selectedChannel: state.selectedChannel,
    timers: state.timers,
    logs: state.logs.slice(0, LOG_LIMIT),
  };
  saveJson(STORAGE_KEY, payload);
  saveCookieJson(payload);
}

function loadSettings() {
  const saved = loadJson(SETTINGS_KEY, {});
  state.settings = saved && typeof saved === "object" ? saved : {};
  migrateLegacyTimerKeys();
}

function persistSettings() {
  saveJson(SETTINGS_KEY, state.settings);
}

function baseBossById(id) {
  const key = String(id ?? "");
  return DEFAULT_BOSSES.find(boss => bossKey(boss) === key)
    || DEFAULT_BOSSES.find(boss => String(boss.id) === key)
    || DEFAULT_BOSSES[0];
}

function monsterById(id) {
  return (db.monsters || []).find(monster => String(monster.id) === String(id)) || null;
}

function bossImage(boss) {
  const monster = monsterById(boss.id);
  return monster?.image || `./assets/monster_frames/${boss.id}.png`;
}

function bossLevelText(boss) {
  const monster = monsterById(boss.id);
  return monster?.level ? `Lv.${monster.level}` : "";
}

function bossMonsterUrl(boss) {
  return `./index.html?monster=${encodeURIComponent(boss.id)}`;
}

function bossLogName(boss) {
  const place = String(boss.mapLabel || "").split(" / ").pop();
  return place ? `${boss.name}（${place}）` : boss.name;
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
  writeCookieSet(FAVORITE_COOKIE_KEY, state.favoriteIds);
  renderBossList();
}

function favoritePinnedBosses() {
  const favorites = DEFAULT_BOSSES.filter(row => state.favoriteIds.has(String(row.key)));
  const favoriteKeys = new Set(favorites.map(row => String(row.key)));
  return [...favorites, ...DEFAULT_BOSSES.filter(row => !favoriteKeys.has(String(row.key)))];
}

function bossConfig(id = state.selectedBossId) {
  return { ...baseBossById(id) };
}

function allChannelsForBoss(bossId = state.selectedBossId) {
  if (!state.timers[bossId] || typeof state.timers[bossId] !== "object") {
    state.timers[bossId] = {};
  }
  return state.timers[bossId];
}

function channelRecord(bossId, channel) {
  const records = allChannelsForBoss(bossId);
  const record = records[String(channel)];
  if (!record || typeof record !== "object" || !Number.isFinite(Number(record.lastKillAt))) return null;
  return { lastKillAt: Number(record.lastKillAt) };
}

function formatClock(totalMs, options = {}) {
  const sign = totalMs < 0 ? "-" : "";
  const ms = Math.max(0, Math.abs(totalMs));
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0 || options.forceHours) {
    return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${sign}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDateTime(ts) {
  try {
    return new Intl.DateTimeFormat("zh-Hant", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(ts));
  } catch (_error) {
    return "";
  }
}

function timerState(boss, channel, now = Date.now()) {
  const record = channelRecord(bossKey(boss), channel);
  if (!record) {
    return {
      key: "unknown",
      label: "未確認",
      shortLabel: "未確認",
      detail: "沒有可靠擊殺紀錄",
      sort: 40,
    };
  }
  const elapsed = now - record.lastKillAt;
  const earliestMs = boss.minMinutes * 60 * 1000;
  const latestMs = boss.maxMinutes * 60 * 1000;
  const killedText = `擊殺 ${formatDateTime(record.lastKillAt)}`;
  if (boss.type === "fixed") {
    if (elapsed < earliestMs) {
      return {
        key: "waiting",
        label: "等待重生",
        shortLabel: formatClock(earliestMs - elapsed),
        detail: killedText,
        remainingMs: earliestMs - elapsed,
        sort: 20,
      };
    }
    return {
      key: "ready",
      label: "已重生",
      shortLabel: "已重生",
      detail: `${killedText}，計時已到`,
      overdueMs: elapsed - earliestMs,
      sort: 5,
    };
  }
  if (elapsed < earliestMs) {
    return {
      key: "waiting",
      label: "等待重生",
      shortLabel: formatClock(earliestMs - elapsed, { forceHours: boss.maxMinutes >= 120 }),
      detail: `${killedText}，尚未進入重生窗口`,
      remainingMs: earliestMs - elapsed,
      sort: 20,
    };
  }
  if (elapsed < latestMs) {
    return {
      key: "soon",
      label: "即將重生",
      shortLabel: `最晚 ${formatClock(latestMs - elapsed, { forceHours: boss.maxMinutes >= 120 })}`,
      detail: `${killedText}，已進入 ${boss.minMinutes}-${boss.maxMinutes} 分鐘窗口`,
      remainingMs: latestMs - elapsed,
      sort: 3,
    };
  }
  return {
    key: "overdue",
    label: "即將重生",
    shortLabel: "超過上限",
    detail: `${killedText}，已超過最晚時間，需要確認`,
    overdueMs: elapsed - latestMs,
    sort: 2,
  };
}

function stateTextForLog(boss, channel) {
  const result = timerState(boss, channel);
  return `${result.label}${result.shortLabel && result.shortLabel !== result.label ? ` ${result.shortLabel}` : ""}`;
}

function addLog(message) {
  state.logs.unshift({
    at: Date.now(),
    bossId: state.selectedBossId,
    channel: state.selectedChannel,
    message,
  });
  state.logs = state.logs.slice(0, LOG_LIMIT);
}

function recordKill(channel = state.selectedChannel) {
  const boss = bossConfig();
  allChannelsForBoss(bossKey(boss))[String(channel)] = { lastKillAt: Date.now() };
  state.selectedChannel = channel;
  addLog(`${bossLogName(boss)} CH${channel} 開始計時`);
  persistState();
  render();
}

function clearChannel(channel = state.selectedChannel) {
  const boss = bossConfig();
  delete allChannelsForBoss(bossKey(boss))[String(channel)];
  state.selectedChannel = channel;
  addLog(`${bossLogName(boss)} CH${channel} 重設為未確認`);
  persistState();
  render();
}

function resetBossTimers() {
  const boss = bossConfig();
  state.timers[bossKey(boss)] = {};
  addLog(`${bossLogName(boss)} 全部重設為未確認`);
  persistState();
  render();
}

function selectBoss(id) {
  state.selectedBossId = resolveBossKey(id);
  state.selectedChannel = 1;
  persistState();
  render();
}

function startChannelTimer(channel) {
  recordKill(channel);
}

function resetChannelTimer(channel) {
  clearChannel(channel);
}

function statusCounts(boss, now = Date.now()) {
  const counts = { unknown: 0, waiting: 0, ready: 0, soon: 0, overdue: 0 };
  for (let channel = 1; channel <= CHANNEL_COUNT; channel += 1) {
    const result = timerState(boss, channel, now);
    counts[result.key] = (counts[result.key] || 0) + 1;
  }
  return counts;
}

function nextUsefulChannels(boss, now = Date.now()) {
  const rows = [];
  for (let channel = 1; channel <= CHANNEL_COUNT; channel += 1) {
    const result = timerState(boss, channel, now);
    if (result.key === "unknown") continue;
    rows.push({ channel, result });
  }
  return rows
    .sort((a, b) => {
      if (a.result.sort !== b.result.sort) return a.result.sort - b.result.sort;
      return (a.result.remainingMs ?? 0) - (b.result.remainingMs ?? 0);
    })
    .slice(0, 6);
}

function renderBossList() {
  bossListEl.innerHTML = favoritePinnedBosses().map(base => {
    const key = bossKey(base);
    const boss = bossConfig(key);
    const now = Date.now();
    const counts = statusCounts(boss, now);
    const active = key === state.selectedBossId ? " active" : "";
    const urgent = counts.ready + counts.soon + counts.overdue;
    const timeLabel = boss.type === "fixed" ? `${boss.minMinutes} 分` : `${boss.minMinutes}-${boss.maxMinutes} 分`;
    const best = nextUsefulChannels(boss, now)[0];
    const bestText = best ? `CH${best.channel} ${best.result.shortLabel}` : "尚無計時";
    return `
      <div class="bossTimerFavoriteShell">
        ${favoriteButton(key, bossLogName(boss))}
        <button class="bossTimerBossCard${active}" type="button" data-boss-id="${escapeHtml(key)}" role="option" aria-selected="${key === state.selectedBossId}">
          <img class="simPickerIcon" src="${escapeHtml(bossImage(boss))}" alt="" loading="lazy" />
          <span class="bossTimerBossText">
            <strong>${escapeHtml(boss.name)}</strong>
            <span>${escapeHtml(timeLabel)} · ${escapeHtml(boss.mapLabel)}</span>
            <small data-boss-summary>${escapeHtml(bestText)}</small>
          </span>
          <span class="simPickerBadge" data-boss-badge>${urgent > 0 ? `${urgent} 可看` : "巡迴"}</span>
        </button>
      </div>
    `;
  }).join("");
  bossListEl.querySelectorAll("[data-favorite-id]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(button.dataset.favoriteId);
    });
  });
  bossListEl.querySelectorAll("[data-boss-id]").forEach(button => {
    button.addEventListener("click", () => selectBoss(button.dataset.bossId));
  });
}

function updateBossListTimers(now = Date.now()) {
  bossListEl.querySelectorAll("[data-boss-id]").forEach(button => {
    const key = button.dataset.bossId;
    const boss = bossConfig(key);
    const counts = statusCounts(boss, now);
    const urgent = counts.ready + counts.soon + counts.overdue;
    const best = nextUsefulChannels(boss, now)[0];
    const summary = button.querySelector("[data-boss-summary]");
    const badge = button.querySelector("[data-boss-badge]");
    if (summary) summary.textContent = best ? `CH${best.channel} ${best.result.shortLabel}` : "尚無計時";
    if (badge) badge.textContent = urgent > 0 ? `${urgent} 可看` : "巡迴";
  });
}

function renderLog() {
  if (!state.logs.length) {
    logEl.innerHTML = '<div class="simPickerEmpty">尚無紀錄</div>';
    return;
  }
  logEl.innerHTML = state.logs.slice(0, 12).map(row => {
    const boss = baseBossById(row.bossId);
    return `
      <div class="bossTimerLogRow">
        <img src="${escapeHtml(bossImage(boss))}" alt="" loading="lazy" />
        <span>
          <strong>${escapeHtml(row.message)}</strong>
          <small>${escapeHtml(formatDateTime(row.at))}</small>
        </span>
      </div>
    `;
  }).join("");
}

function renderChannelGrid(boss) {
  const cells = [];
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const channel = row * 6 + col + 1;
      const result = timerState(boss, channel);
      const active = channel === state.selectedChannel ? " active" : "";
      cells.push(`
        <button class="bossTimerChannel bossTimerState-${escapeHtml(result.key)}${active}" type="button" data-channel="${channel}" aria-pressed="${channel === state.selectedChannel}" title="點擊開始或重新計時，右鍵重設單格">
          <strong>CH${channel}</strong>
          <span>${escapeHtml(result.shortLabel)}</span>
          <small>${escapeHtml(result.detail)}</small>
        </button>
      `);
    }
  }
  return cells.join("");
}

function updateChannelButton(button, boss, channel, now = Date.now()) {
  const result = timerState(boss, channel, now);
  const active = channel === state.selectedChannel ? " active" : "";
  button.className = `bossTimerChannel bossTimerState-${result.key}${active}`;
  button.setAttribute("aria-pressed", String(channel === state.selectedChannel));
  button.setAttribute("aria-label", `CH${channel} ${result.label} ${result.shortLabel}`);
  const title = result.detail ? `CH${channel} ${result.label}：${result.detail}` : `CH${channel} ${result.label}`;
  button.setAttribute("title", title);
  const channelLabel = button.querySelector("strong");
  const statusLabel = button.querySelector("span");
  const detailLabel = button.querySelector("small");
  if (channelLabel) channelLabel.textContent = `CH${channel}`;
  if (statusLabel) statusLabel.textContent = result.shortLabel;
  if (detailLabel) detailLabel.textContent = result.detail;
}

function renderDetail() {
  const boss = bossConfig();
  const now = Date.now();
  const counts = statusCounts(boss, now);
  const timeLabel = boss.type === "fixed" ? `${boss.minMinutes} 分鐘` : `${boss.minMinutes}-${boss.maxMinutes} 分鐘`;
  const selectableCount = boss.type === "fixed" ? counts.ready : counts.soon + counts.overdue;
  detailEl.innerHTML = `
    <article class="bossTimerDetailCard">
      <header class="bossTimerHero">
        <div class="bossTimerHeroIdentity">
          <img src="${escapeHtml(bossImage(boss))}" alt="" loading="lazy" />
          <div>
            <p class="patchEyebrow">Boss 計時器</p>
            <h2>${escapeHtml(boss.name)}</h2>
            <p>${escapeHtml([bossLevelText(boss), boss.mapLabel].filter(Boolean).join(" · "))}</p>
            <a class="bossTimerMapLink" href="${escapeHtml(bossMonsterUrl(boss))}">查看 Boss 資訊</a>
          </div>
        </div>
        <div class="bossTimerHeroStats">
          <div><strong data-boss-stat="respawnTime">${escapeHtml(timeLabel)}</strong><span>重生時間</span></div>
          <div><strong data-boss-stat="selectableCount">${selectableCount}</strong><span data-boss-stat-label="selectableCount">${boss.type === "fixed" ? "已重生" : "即將重生"}</span></div>
          <div><strong data-boss-stat="waitingCount">${counts.waiting}</strong><span>等待重生</span></div>
        </div>
      </header>

      <section class="bossTimerGridPanel">
        <div class="sectionHeading">
          <h3>頻道計時</h3>
          <button id="bossResetAll" class="toggleButton clearFiltersButton" type="button">全部重設未確認</button>
        </div>
        <p class="bossTimerQuickHint">點擊頻道格子即可開始或重新倒數；右鍵可將單一頻道重設為未確認。</p>
        <div class="bossTimerLegend">
          <span class="bossTimerLegendUnknown">未確認</span>
          <span class="bossTimerLegendWaiting">等待重生</span>
          ${boss.type === "fixed" ? '<span class="bossTimerLegendReady">已重生</span>' : '<span class="bossTimerLegendSoon">即將重生</span>'}
        </div>
        <div class="bossTimerChannelGrid" role="list" aria-label="${escapeHtml(boss.name)} 60 頻道計時器">${renderChannelGrid(boss)}</div>
      </section>
    </article>
  `;
  detailEl.querySelectorAll("[data-channel]").forEach(button => {
    button.addEventListener("click", () => {
      const channel = clamp(Math.trunc(toNumber(button.dataset.channel, 1)), 1, CHANNEL_COUNT);
      startChannelTimer(channel);
    });
    button.addEventListener("contextmenu", event => {
      event.preventDefault();
      const channel = clamp(Math.trunc(toNumber(button.dataset.channel, 1)), 1, CHANNEL_COUNT);
      resetChannelTimer(channel);
    });
  });
  document.getElementById("bossResetAll")?.addEventListener("click", () => resetBossTimers());
}

function updateDetailTimers(now = Date.now()) {
  const boss = bossConfig();
  const counts = statusCounts(boss, now);
  const selectableCount = boss.type === "fixed" ? counts.ready : counts.soon + counts.overdue;
  const selectableLabel = boss.type === "fixed" ? "已重生" : "即將重生";
  const selectableEl = detailEl.querySelector('[data-boss-stat="selectableCount"]');
  const selectableLabelEl = detailEl.querySelector('[data-boss-stat-label="selectableCount"]');
  const waitingEl = detailEl.querySelector('[data-boss-stat="waitingCount"]');
  if (selectableEl) selectableEl.textContent = String(selectableCount);
  if (selectableLabelEl) selectableLabelEl.textContent = selectableLabel;
  if (waitingEl) waitingEl.textContent = String(counts.waiting);
  detailEl.querySelectorAll("[data-channel]").forEach(button => {
    const channel = clamp(Math.trunc(toNumber(button.dataset.channel, 1)), 1, CHANNEL_COUNT);
    updateChannelButton(button, boss, channel, now);
  });
}

function renderBuildMeta() {
  if (!buildMetaEl) return;
  const metadata = db.metadata || {};
  const parts = [];
  if (metadata.gameVersion) parts.push(`遊戲版本 ${metadata.gameVersion}`);
  if (metadata.generatedAtText) parts.push(`更新 ${metadata.generatedAtText}`);
  buildMetaEl.textContent = parts.join(" · ");
}

function updateThemeButton() {
  if (!themeToggleEl) return;
  const isDark = document.documentElement.dataset.theme === "dark";
  const label = isDark ? "切換為白底" : "切換為黑底";
  themeToggleEl.textContent = isDark ? "☀" : "☾";
  themeToggleEl.setAttribute("aria-label", label);
  themeToggleEl.setAttribute("title", label);
  themeToggleEl.setAttribute("aria-pressed", String(isDark));
}

function setupTheme() {
  updateThemeButton();
  themeToggleEl?.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    writeCookieRaw("ms_theme", nextTheme);
    try {
      localStorage.setItem("ms-theme", nextTheme);
    } catch (_error) {}
    updateThemeButton();
  });
}

function render() {
  renderBuildMeta();
  renderBossList();
  renderLog();
  renderDetail();
}

function startTicker() {
  if (tickHandle) window.clearInterval(tickHandle);
  tickHandle = window.setInterval(() => {
    const now = Date.now();
    updateBossListTimers(now);
    updateDetailTimers(now);
  }, 1000);
}

state.favoriteIds = parseCookieSet(FAVORITE_COOKIE_KEY);
normalizeLoadedState(loadCookieJson(loadJson(STORAGE_KEY, {})));
loadSettings();
setupTheme();
render();
startTicker();
