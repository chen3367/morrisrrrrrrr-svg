(() => {
  "use strict";
  const db = window.MS_THIRD_JOB_DB;
  const byId = id => document.getElementById(id);
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const normalize = value => String(value).normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  const searchIndex = new Map(db.questions.map(q => [q.id, normalize([q.question, ...q.options.map(o => o.text), q.evidence].join(" "))]));
  const parameters = new URLSearchParams(location.search);
  let currentView = parameters.get("view") === "flow" ? "flow" : "questions";
  let currentJob = db.classes.find(c => c.id === parameters.get("job"))?.id || db.classes[0].id;

  function entityHtml(entity) {
    const inner = `${entity.image ? `<img src="${escape(entity.image)}" alt="" loading="lazy" width="36" height="40">` : ""}<span>${escape(entity.name)}</span>`;
    return entity.href ? `<a class="thirdJobEntity" href="${escape(entity.href)}">${inner}</a>` : `<span class="thirdJobEntity">${inner}</span>`;
  }

  function dialogueHtml(rows) {
    return rows.map(row => `<div class="thirdJobDialogue"><small>${escape(row.key)}</small><p>${escape(row.text)}</p></div>`).join("");
  }

  function syncUrl() {
    const query = new URLSearchParams();
    if (currentView === "flow") {
      query.set("view", "flow");
      query.set("job", currentJob);
    } else {
      if (byId("questionSearch").value.trim()) query.set("q", byId("questionSearch").value.trim());
      if (byId("questionCategory").value) query.set("category", byId("questionCategory").value);
    }
    history.replaceState(null, "", `${location.pathname}${query.size ? `?${query}` : ""}`);
  }

  function renderQuestions() {
    const terms = byId("questionSearch").value.trim().split(/\s+/).map(normalize).filter(Boolean);
    const category = byId("questionCategory").value;
    const rows = db.questions.filter(q => (!category || q.category === category) && terms.every(term => searchIndex.get(q.id).includes(term)));
    byId("questionCount").textContent = `${rows.length} / ${db.questions.length} 題`;
    byId("noQuestions").hidden = rows.length > 0;
    byId("questionResults").innerHTML = rows.map(q => {
      const label = q.status === "inferred" ? "參考答案" : "答案";
      return `<article class="thirdJobQuestion" data-question-id="${q.id}" data-status="${escape(q.status)}">
        <header><span>${escape(q.category)}</span><span>Q${q.id}</span></header>
        <h3>${escape(q.question)}</h3>
        <div class="thirdJobAnswer"><span>${label}</span><strong>${escape(q.answer)}</strong></div>
        ${q.warning ? `<p class="thirdJobWarning">${escape(q.warning)}</p>` : ""}
        <details><summary>選項與答案依據</summary>
          <ol class="thirdJobOptions">${q.options.map((option, index) => `<li data-answer="${option.id === q.answerId}">${index + 1}. ${escape(option.text)}${option.id === q.answerId ? `<span class="thirdJobAnswerTag">${label}</span>` : ""}</li>`).join("")}</ol>
          <p class="thirdJobEvidence">${escape(q.evidence)}</p>
          <div class="thirdJobEntities">${q.entities.map(entityHtml).join("")}</div>
          <details><summary>題目原始字串 · ${escape(q.key)}</summary><pre>${escape(q.raw)}</pre></details>
        </details>
      </article>`;
    }).join("");
    syncUrl();
  }

  function renderFlow() {
    const job = db.classes.find(c => c.id === currentJob);
    for (const button of byId("flowClasses").querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.job === currentJob));
    byId("thirdJobSteps").innerHTML = job.steps.map(step => `<li class="thirdJobStep">
      <h3>${escape(step.title)}</h3>
      <div class="thirdJobStepPeople">${entityHtml(step.npc)}<a href="${escape(step.location.href)}">${escape(step.location.name)}</a></div>
      <p>${escape(step.summary)}</p>
      ${step.gate ? `<div class="thirdJobGate">${entityHtml(step.gate.npc)}<a class="thirdJobGateMap" href="${escape(step.gate.location.href)}">${escape(step.gate.location.name)}</a><small>座標 (${escape(step.gate.x)}, ${escape(step.gate.y)})</small></div>` : ""}
      ${step.items.length ? `<div class="thirdJobEntities">${step.items.map(entityHtml).join("")}</div>` : ""}
      <details><summary>NPC 對話 · ${step.dialogues.length} 段</summary>${dialogueHtml(step.dialogues)}</details>
    </li>`).join("");
    syncUrl();
  }

  function setView(view) {
    currentView = view;
    for (const button of document.querySelectorAll("[data-view]")) button.setAttribute("aria-pressed", String(button.dataset.view === view));
    byId("questionsView").hidden = view !== "questions";
    byId("flowView").hidden = view !== "flow";
    if (view === "flow") renderFlow(); else renderQuestions();
  }

  byId("thirdJobVersion").textContent = `冒險家 · 遊戲版本 ${db.metadata.gameVersion}`;
  byId("thirdJobBasis").textContent = db.metadata.answerBasis;
  byId("thirdJobSources").innerHTML = db.metadata.sources.map(source => `<li>${escape(source)}</li>`).join("");
  byId("thirdJobArchive").innerHTML = db.archive.map(group => `<details><summary>${escape(group.label)} · ${group.rows.length} 段</summary>${dialogueHtml(group.rows)}</details>`).join("");
  byId("flowClasses").innerHTML = db.classes.map(c => `<button type="button" data-job="${escape(c.id)}" aria-pressed="${c.id === currentJob}" aria-controls="thirdJobSteps">${escape(c.name)}</button>`).join("");
  byId("questionCategory").insertAdjacentHTML("beforeend", [...new Set(db.questions.map(q => q.category))].map(category => `<option>${escape(category)}</option>`).join(""));
  byId("questionSearch").value = parameters.get("q") || "";
  if ([...byId("questionCategory").options].some(o => o.value === parameters.get("category"))) byId("questionCategory").value = parameters.get("category");
  byId("questionSearch").addEventListener("input", renderQuestions);
  byId("questionSearch").addEventListener("search", renderQuestions);
  byId("questionCategory").addEventListener("change", renderQuestions);
  byId("flowClasses").querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    currentJob = button.dataset.job;
    renderFlow();
  }));
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  const themeButton = byId("themeToggle");
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
  setView(currentView);
})();
