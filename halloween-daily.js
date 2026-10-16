(() => {
  "use strict";
  const db = window.MS_HALLOWEEN_DB;
  const config = db?.dailyChecklist;
  const root = document.getElementById("hwDailyChecklist");
  if (!root || !config) return;

  const cookieName = "mm_halloween_2026_daily_v1";
  const quests = new Map(db.quests.map(quest => [quest.id, quest]));
  const boxIds = config.giftShop.prices.map((_, i) => `box-${i + 1}`);
  const giftQuestId = `quest-${config.giftShop.unlockQuestId}`;
  const ids = [...config.quests.map(quest => `quest-${quest.id}`), ...boxIds];
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
    <details class="hwDailyGiftShop"><summary><strong>禮物箱領取／購買</strong><span id="hwDailyBoxCount">0 / ${config.giftShop.dailyLimit}</span></summary><p id="hwDailyGiftRequirement">完成當日${link(config.giftShop.unlockQuestId)}後，才可記錄向${escape(config.giftShop.npcName)}領取或購買的禮物箱。</p><p>${escape(config.giftShop.note)}</p><div class="hwDailyBoxes">${config.giftShop.prices.map((price, i) => `<label class="hwDailyBox"><input type="checkbox" data-daily-id="box-${i + 1}" aria-label="第 ${i + 1} 箱已${price ? "購買" : "領取"}" aria-describedby="hwDailyGiftRequirement" disabled /><span><strong>第 ${i + 1} 箱</strong><small>${price ? `${price.toLocaleString("zh-TW")} 楓幣` : "免費"}</small></span></label>`).join("")}</div></details>
    <p>活動期間：${escape(config.activityPeriod)}</p><p id="hwDailyStorageWarning" role="status" hidden>無法儲存勾選，僅當次頁面有效。</p>`;

  function readCookie() {
    const prefix = `${cookieName}=`;
    const entry = document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(prefix));
    return entry ? entry.slice(prefix.length) : "";
  }

  function normalizeDone(values) {
    const done = new Set(values);
    const lastBox = done.has(giftQuestId) ? boxIds.reduce((last, id, i) => done.has(id) ? i : last, -1) : -1;
    boxIds.forEach((id, i) => { if (i <= lastBox) done.add(id); else done.delete(id); });
    return ids.filter(id => done.has(id));
  }

  function parseCookie(value, day) {
    try {
      if (!value || value.length > 2048) return blank(day);
      const saved = JSON.parse(decodeURIComponent(value));
      if (saved.v !== 1 || saved.day !== day || !Array.isArray(saved.done)) return blank(day);
      return {v: 1, day, done: normalizeDone(saved.done)};
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
    root.querySelectorAll("[data-daily-id]").forEach(input => {
      input.checked = state.done.includes(input.dataset.dailyId);
      input.disabled = boxIds.includes(input.dataset.dailyId) && !state.done.includes(giftQuestId);
    });
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
    const boxIndex = boxIds.indexOf(id);
    if (boxIndex >= 0) {
      // Recheck after cookie sync: another tab or midnight may have relocked gifts.
      if (done.has(giftQuestId)) {
        boxIds.forEach((boxId, i) => {
          if (checked && i <= boxIndex) done.add(boxId);
          else if (!checked && i >= boxIndex) done.delete(boxId);
        });
      }
    } else if (checked) done.add(id);
    else done.delete(id);
    state.done = normalizeDone([...done]);
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
