(() => {
  "use strict";
  const solver = window.MapleGoddessSolver;
  const db = window.MS_GODDESS_DB;
  const el = id => document.getElementById(`goddess${id}`);
  const storageKey = "ms-goddess-five-player-v1";
  let history = [];
  let guess = "500";
  let restored = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (saved && saved.version === 1 && Array.isArray(saved.history) && solver.validGuess(saved.guess)) {
      let checked = [];
      for (const row of saved.history) checked = solver.append(checked, row.guess, row.feedback);
      history = checked;
      guess = saved.guess;
      if (history.at(-1)?.feedback === 3) guess = history.at(-1).guess;
      restored = history.length > 0;
    }
  } catch (_) {}
  function persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ version: 1, history, guess })); } catch (_) {}
  }
  function render() {
    const remaining = solver.candidates(history);
    const solved = history.at(-1)?.feedback === 3;
    const exhausted = history.length >= 7 && !solved;
    const recommendation = solver.currentGuess(history);
    ["Left", "Center", "Right"].forEach((id, i) => el(id).textContent = guess[i]);
    el("Guess").querySelectorAll("button").forEach(button => {
      const selected = button.dataset.guess === guess;
      const recommended = !solved && !exhausted && button.dataset.guess === recommendation;
      button.setAttribute("aria-pressed", String(selected));
      button.dataset.recommended = String(recommended);
      button.disabled = solved || exhausted;
      button.querySelector(".goddessGuessState").textContent = selected && recommended ? "目前 · 建議" : selected ? "目前" : recommended ? "建議" : "";
    });
    el("Undo").disabled = history.length === 0;
    document.querySelectorAll("[data-feedback]").forEach(button => button.disabled = solved || exhausted);
    el("Attempt").textContent = solved ? "封印已解除" : exhausted ? "本輪已結束" : `第 ${history.length + 1} 次試站`;
    el("Remaining").textContent = `剩餘 ${remaining.length} 種可能`;
    el("HistoryCount").textContent = `${history.length} / 7`;
    el("CandidateCount").textContent = remaining.length;
    el("Candidates").replaceChildren(...remaining.map(value => Object.assign(document.createElement("span"), { textContent: value })));
    el("Status").textContent = solved ? "全部正確，可向易克領取碎片。" : exhausted ? "七次已用完；遊戲更換答案後，請開始新一輪。" :
      guess !== recommendation ? `手動站位；建議 ${recommendation}。` : remaining.length === 1 ? "只剩這個站位，仍需向易克確認成功。" : `建議站位 ${guess}`;
    el("Empty").hidden = history.length > 0;
    el("History").replaceChildren(...history.map((row, index) => {
      const li = document.createElement("li");
      const turn = document.createElement("span");
      turn.textContent = `第 ${index + 1} 次`;
      const position = document.createElement("strong");
      position.textContent = `左 ${row.guess[0]} · 中 ${row.guess[1]} · 右 ${row.guess[2]}`;
      const feedback = document.createElement("em");
      feedback.textContent = row.feedback === 3 ? "全部正確" : `${row.feedback} 個正確`;
      li.append(turn, position, feedback);
      return li;
    }));
    persist();
  }
  for (const value of solver.combinations) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "goddessGuessButton";
    button.dataset.guess = value;
    button.setAttribute("aria-label", `左 ${value[0]} 人，中 ${value[1]} 人，右 ${value[2]} 人`);
    button.setAttribute("aria-describedby", `goddessGuessState${value}`);
    const position = document.createElement("span");
    position.className = "goddessGuessValue";
    position.textContent = `${value[0]} / ${value[1]} / ${value[2]}`;
    const state = document.createElement("span");
    state.className = "goddessGuessState";
    state.id = `goddessGuessState${value}`;
    button.append(position, state);
    button.addEventListener("click", () => { guess = value; clearMessage(); render(); });
    el("Guess").append(button);
  }
  function clearMessage() {
    el("Error").textContent = "";
    el("CopyStatus").textContent = "";
    el("CopyFallback").hidden = true;
  }
  document.querySelectorAll("[data-feedback]").forEach(button => button.addEventListener("click", () => {
    clearMessage();
    try {
      history = solver.append(history, guess, Number(button.dataset.feedback));
      if (history.at(-1).feedback !== 3 && history.length < 7) guess = solver.currentGuess(history);
      render();
    } catch (error) { el("Error").textContent = error.message; }
  }));
  el("Undo").addEventListener("click", () => {
    const previous = history.pop();
    if (!previous) return;
    guess = previous.guess;
    clearMessage();
    render();
  });
  el("Reset").addEventListener("click", () => {
    el("ResetDialog").returnValue = "";
    el("ResetDialog").showModal();
  });
  el("ResetDialog").addEventListener("close", () => {
    if (el("ResetDialog").returnValue !== "reset") return;
    history = [];
    guess = "500";
    clearMessage();
    render();
  });
  el("Copy").addEventListener("click", async () => {
    const text = `左 ${guess[0]} 人 / 中 ${guess[1]} 人 / 右 ${guess[2]} 人（${guess}）`;
    try {
      await navigator.clipboard.writeText(text);
      el("CopyStatus").textContent = "已複製站位";
    } catch (_) {
      el("CopyFallback").hidden = false;
      el("CopyText").value = text;
      el("CopyText").focus();
      el("CopyText").select();
      el("CopyStatus").textContent = "無法自動複製，站位文字已選取。";
    }
  });
  db.music.forEach(row => el("Weekday").add(new Option(row.label, String(row.day))));
  const today = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Taipei" }).format(new Date());
  el("Weekday").value = String(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(today));
  function renderMusic() {
    const item = db.music.find(row => row.day === Number(el("Weekday").value)).item;
    el("MusicItem").href = item.href;
    el("MusicImage").src = item.image;
    el("MusicName").textContent = item.name;
  }
  el("Weekday").addEventListener("change", renderMusic);
  el("Version").textContent = `6 人隊伍 · Lv.51～70 · 遊戲版本 ${db.gameVersion}`;
  const themeButton = document.getElementById("themeToggle");
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.setAttribute("aria-label", dark ? "切換為亮色" : "切換為深色");
    themeButton.title = themeButton.getAttribute("aria-label");
  }
  themeButton.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    applyTheme(dark);
    try {
      localStorage.setItem("ms-theme", dark ? "dark" : "light");
      document.cookie = `ms_theme=${dark ? "dark" : "light"}; Max-Age=15552000; Path=/; SameSite=Lax`;
    } catch (_) {}
  });
  applyTheme(document.documentElement.dataset.theme === "dark");
  render();
  renderMusic();
  if (restored) el("CopyStatus").textContent = "已還原本分頁紀錄。若遊戲答案已改變，請重新開始。";
})();
