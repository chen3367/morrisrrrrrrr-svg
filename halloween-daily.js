(() => {
  "use strict";
  const db = window.MS_HALLOWEEN_DB;
  const config = db?.dailyChecklist;
  const root = document.getElementById("hwDailyChecklist");
  if (!root || !config) return;

  const cookieName = "mm_halloween_2026_daily_v1";
  const quests = new Map(db.quests.map(quest => [quest.id, quest]));
  const ids = [...config.quests.map(quest => `quest-${quest.id}`), ...config.giftShop.prices.map((_, i) => `box-${i + 1}`)];
  const allowed = new Set(ids);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char]));
  const link = id => `<a href="#quest-${id}" data-quest="${id}">${escape(quests.get(id).name)}</a>`;
  const dateFormat = new Intl.DateTimeFormat("en-CA", {timeZone: config.timeZone, year: "numeric", month: "2-digit", day: "2-digit"});
  function today(now = Date.now()) {
    const parts = Object.fromEntries(dateFormat.formatToParts(now).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  const blank = day => ({v: 1, day, done: []});
  let state = blank(today());
  let persistent = true;
  let resetTimer;

  root.innerHTML = `<header class="hwDailyHeading"><h2 id="hwDailyTitle">每日清單</h2><div><time id="hwDailyDate"></time><span>清單每日 00:00 重置（台灣）</span></div></header>
    <div class="hwDailyTasks">${config.quests.map(quest => `<div class="hwDailyTask"><label class="hwDailyCheckTarget"><input type="checkbox" data-daily-id="quest-${quest.id}" aria-label="${escape(quests.get(quest.id).name)}已完成" /></label><div><a href="#quest-${quest.id}" data-quest="${quest.id}"><strong>${escape(quests.get(quest.id).name)}</strong></a><p>完成${link(quest.prerequisiteId)}後解鎖 · 每日 ${quest.dailyLimit} 次</p><p>${escape(quest.objective)}</p><p>獎勵：${escape(quest.reward)}</p></div></div>`).join("")}</div>
    <p>${escape(config.experienceNote)}</p><p>${escape(config.monsterRangeNote)}</p>
    <details class="hwDailyGiftShop"><summary><strong>禮物箱領取／購買</strong><span id="hwDailyBoxCount">0 / ${config.giftShop.dailyLimit}</span></summary><p>首次完成${link(config.giftShop.unlockQuestId)}後，向${escape(config.giftShop.npcName)}領取或購買。</p><p>${escape(config.giftShop.note)}</p><div class="hwDailyBoxes">${config.giftShop.prices.map((price, i) => `<label class="hwDailyBox"><input type="checkbox" data-daily-id="box-${i + 1}" aria-label="第 ${i + 1} 箱已${price ? "購買" : "領取"}" /><span><strong>第 ${i + 1} 箱</strong><small>${price ? `${price.toLocaleString("zh-TW")} 楓幣` : "免費"}</small></span></label>`).join("")}</div></details>
    <p>活動期間：${escape(config.activityPeriod)}</p><p id="hwDailyStorageWarning" role="status" hidden>無法儲存勾選，僅當次頁面有效。</p>`;

  function readCookie() {
    const prefix = `${cookieName}=`;
    const entry = document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(prefix));
    return entry ? entry.slice(prefix.length) : "";
  }

  function parseCookie(value, day) {
    try {
      if (!value || value.length > 2048) return blank(day);
      const saved = JSON.parse(decodeURIComponent(value));
      if (saved.v !== 1 || saved.day !== day || !Array.isArray(saved.done)) return blank(day);
      return {v: 1, day, done: ids.filter(id => saved.done.includes(id))};
    } catch (_) {
      return blank(day);
    }
  }

  function save() {
    if (!persistent) return;
    try {
      const value = encodeURIComponent(JSON.stringify(state));
      document.cookie = `${cookieName}=${value}; Max-Age=172800; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      // Browsers may reject cookies silently, so verify the write as well.
      if (readCookie() !== value) persistent = false;
    } catch (_) {
      persistent = false;
    }
  }

  function reconcile() {
    const day = today();
    if (state.day !== day) state = blank(day);
    if (persistent) {
      try { state = parseCookie(readCookie(), day); }
      catch (_) { persistent = false; }
    }
  }

  function paint() {
    root.querySelectorAll("[data-daily-id]").forEach(input => { input.checked = state.done.includes(input.dataset.dailyId); });
    const date = document.getElementById("hwDailyDate");
    date.dateTime = state.day;
    date.textContent = state.day.replaceAll("-", "/");
    document.getElementById("hwDailyBoxCount").textContent = `${state.done.filter(id => id.startsWith("box-")).length} / ${config.giftShop.dailyLimit}`;
    document.getElementById("hwDailyStorageWarning").hidden = persistent;
  }

  function scheduleReset() {
    clearTimeout(resetTimer);
    // Modern Asia/Taipei has UTC+8 with no daylight saving time.
    const midnight = Date.parse(`${today()}T00:00:00+08:00`) + 86400000;
    resetTimer = setTimeout(refresh, Math.max(50, midnight - Date.now() + 25));
  }

  function refresh() {
    reconcile();
    save();
    paint();
    scheduleReset();
  }

  root.addEventListener("change", event => {
    const input = event.target;
    const id = input.dataset.dailyId;
    if (!allowed.has(id)) return;
    const checked = input.checked;
    // Read the latest cookie before editing to preserve changes from other tabs.
    reconcile();
    const done = new Set(state.done);
    if (checked) done.add(id);
    else done.delete(id);
    state.done = ids.filter(value => done.has(value));
    save();
    paint();
    scheduleReset();
  });
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  window.addEventListener("pagehide", () => clearTimeout(resetTimer));
  refresh();
})();
