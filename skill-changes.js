(() => {
  "use strict";
  const data = window.MS_SKILL_CHANGES;
  if (!data) return;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
  const stageNames = ["全部轉職", "一轉", "二轉", "三轉", "四轉"];
  const state = {career: data.careers[0].id};
  const categoryNames = Object.fromEntries(data.categories.map(row => [row.id, row.name]));
  const themeButton = $("themeToggle");
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    if (!themeButton) return;
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.setAttribute("aria-label", dark ? "切換為亮色" : "切換為深色");
    themeButton.title = themeButton.getAttribute("aria-label");
  }
  themeButton?.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    applyTheme(dark);
    try {
      localStorage.setItem("ms-theme", dark ? "dark" : "light");
      document.cookie = `ms_theme=${dark ? "dark" : "light"}; Max-Age=15552000; Path=/; SameSite=Lax`;
    } catch (_) {}
  });
  applyTheme(document.documentElement.dataset.theme === "dark");
  const numeric = row => row.levelChanges.length || row.settingChanges.length;
  const format = (value, unit) => value === null ? "未記載" : `${esc(value)}${esc(unit)}`;
  const delta = row => `<span class="scBefore">${format(row.before, row.unit)}</span><span class="scArrow" aria-label="改為">→</span><span class="scAfter">${format(row.after, row.unit)}</span>`;

  function table(rows, includeLevel = true) {
    return `<table class="scTable"><thead><tr>${includeLevel ? '<th class="scLevel">等級</th>' : ""}<th class="scField">效果／參數</th><th>1.15.2 → 2.0.0</th></tr></thead><tbody>${rows.map(row => `<tr>${includeLevel ? `<td>${esc(row.level)}</td>` : ""}<td>${esc(row.label)}${row.uncertain ? '<small class="scEvidence">（實際效果待驗證）</small>' : ""}</td><td>${delta(row)}</td></tr>`).join("")}</tbody></table>`;
  }

  function officialInfo(row) {
    const entry = row.official;
    if (!entry) return "";
    const comparisons = entry.comparisons.length ? `<table class="scTable"><thead><tr><th class="scField">效果</th><th>調整前</th><th>調整後</th></tr></thead><tbody>${entry.comparisons.map(change => `<tr><td>${esc(change.label)}</td><td class="scBefore">${change.before === null ? "公告未列出" : esc(change.before)}</td><td class="scAfter">${esc(change.after)}</td></tr>`).join("")}</tbody></table>` : "";
    const points = entry.points.length ? `<ul>${entry.points.map(text => `<li>${esc(text)}</li>`).join("")}</ul>` : "";
    return `<section class="scOfficial" aria-label="官方調整"><h4>官方調整</h4><p class="scEvidence">${esc(entry.scope)}</p>${comparisons}${points}</section>`;
  }

  function sharedChange(row) {
    return `<div class="scSharedChange" data-shared-change="${esc(row.id)}"><img class="scSkillIcon" src="${esc(row.image)}" width="40" height="40" alt="" loading="lazy"><div><h5>${esc(row.title)}<span class="scCategory scCategory-${esc(row.category)}">${esc(categoryNames[row.category])}</span></h5><small>官方調整 · ${esc(row.scope || "職業共通")}</small><p>${esc(row.text)}</p></div></div>`;
  }

  function skill(row) {
    const levels = row.levelChanges.map(v => v.level);
    const levelSummary = levels.length ? ` · Lv.${levels[0]}${levels.length > 1 ? `～${levels.at(-1)}，${levels.length} 個等級` : ""}` : "";
    const numericRows = row.levelChanges.flatMap(v => v.changes.map(c => ({...c, level: v.level})));
    const text = row.textChanges.map(change => {
      if (change.kind === "H") {
        return `<details class="scLevelText"><summary>各級效果描述 · ${change.levels.length} 個等級</summary><p class="scEvidence">「遊戲原文」為原版逐級文字；「描述與數值推算」以該版描述填入同版數值，僅供對照，不代表已驗證效果。未提供的數值不補猜。</p><table class="scTable"><thead><tr><th class="scLevel">等級</th><th>1.15.2</th><th>2.0.0</th></tr></thead><tbody>${change.levels.map(level => `<tr><td>${level.level}</td>${["before", "after"].map((side, i) => `<td data-version="${i ? "2.0.0" : "1.15.2"}"><small>${esc(level[side].source)}</small>${esc(level[side].text)}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
      }
      return `<h4>${esc(change.label)}</h4><div class="scTextCompare"><div><h5>1.15.2 · 遊戲原文</h5><p>${esc(change.before) || "未記載"}</p></div><div><h5>2.0.0 · 遊戲原文</h5><p>${esc(change.after) || "未記載"}</p></div></div>`;
    }).join("");
    return `<details class="scSkill" id="skill-${row.id}" data-id="${row.id}" data-category="${esc(row.category)}"><summary><img class="scSkillIcon" src="${esc(row.image)}" width="40" height="40" alt="" loading="lazy" /><div><strong>${esc(row.name)}</strong><small>${esc(row.jobName)} · ${stageNames[row.advancement]}${levelSummary}</small><span class="scReason">${esc(row.reason)}</span></div><span class="scCategory scCategory-${esc(row.category)}">${esc(categoryNames[row.category])}</span></summary><div class="scBody">${officialInfo(row)}${row.note ? `<p class="scNote">${esc(row.note)}</p>` : ""}${numericRows.length ? `<h4>逐級數值變動</h4><p class="scEvidence">同一欄位的兩版技能資料直接比較，保留每個有異動的技能等級。${row.boundsEvidence.length ? "判定框寬高由本地兩角座標相減，不代表已驗證的實際命中範圍。" : ""}</p>${table(numericRows)}` : ""}${row.settingChanges.length ? `<h4>技能設定變動</h4>${table(row.settingChanges, false)}` : ""}${!numeric(row) && row.numericCompared && row.textChanges.length ? '<p class="scEvidence">逐級數值未變動；以下為描述差異。</p>' : ""}${text}<p><a href="${esc(row.href)}">${esc(row.name)} · 技能索引</a></p></div></details>`;
  }

  function render() {
    const career = data.careers.find(row => row.id === state.career);
    $("scResultsTitle").textContent = `${career.name} · 技能變動`;
    $("scCareerPath").textContent = career.stages.map(stage => stage.name).join(" → ");
    $("scCount").textContent = `${career.skillIds.length} 個技能`;
    $("scSkills").innerHTML = career.stages.map(stage => {
      const rows = data.skills.filter(row => row.jobId === stage.id && career.skillIds.includes(row.id));
      const shared = (data.sharedChanges || []).filter(row => row.jobId === stage.id && (!row.careerIds || row.careerIds.includes(career.id)));
      return `<section class="scStage" data-job="${stage.id}" aria-labelledby="sc-stage-${stage.id}"><h4 id="sc-stage-${stage.id}">${stageNames[stage.advancement]} · ${esc(stage.name)}<span>${rows.length} 項${shared.length ? ` · 共通 ${shared.length} 項` : ""}</span></h4>${shared.map(sharedChange).join("")}${rows.length ? rows.map(skill).join("") : shared.length ? "" : '<p class="scNoChanges">此階段未見異動。</p>'}</section>`;
    }).join("");
    for (const button of $("scCareers").querySelectorAll("[data-career]")) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.career) === state.career));
    }
  }

  const shownJobs = new Set(data.careers.flatMap(career => career.jobIds));
  $("scSystems").innerHTML = (data.systemChanges || []).map(row => `<li><strong>${esc(row.title)}</strong>：${esc(row.text)}</li>`).join("");
  const shownSkillIds = new Set(data.careers.flatMap(career => career.skillIds));
  const shownSkills = data.skills.filter(row => shownSkillIds.has(row.id));
  $("scSummary").innerHTML = data.categories.map(row => `<span data-summary-category="${row.id}">${esc(row.name)}<strong>${shownSkills.filter(skill => skill.category === row.id).length}</strong></span>`).join("") + `<span class="scEvidence">共 ${shownSkills.length} 個技能</span>`;
  $("scCareers").innerHTML = data.careers.map(career => {
    const changes = data.categories.filter(category => career.counts[category.id]);
    const hint = changes.length ? changes.map(category => `${category.name} ${career.counts[category.id]}`).join("、") : "未見異動";
    return `<button class="scCareer" type="button" data-career="${career.id}" aria-pressed="false" aria-label="${esc(career.name)}，${esc(hint)}"><img src="${esc(career.image)}" alt="" width="128" height="104"><strong>${esc(career.name)}</strong><span class="scCareerCounts">${changes.length ? changes.map(category => `<span class="scCategory-${esc(category.id)}">${esc(category.name)} ${career.counts[category.id]}</span>`).join("") : '<span>未見異動</span>'}</span></button>`;
  }).join("");
  const coverageRows = data.groups.map(group => `<tr><th>${esc(group.name)}</th>${[1,2,3].map(stage => {
    const rows = data.coverage.filter(r => r.group === group.id && r.advancement === stage && r.numericCompared);
    const count = rows.filter(r => r.changed || r.officialChanged).length;
    return `<td>${count ? `修改 ${count}` : "未見差異"}<small>比對 ${rows.length} 技能</small></td>`;
  }).join("")}</tr>`).join("");
  const compared = data.coverage.filter(row => shownJobs.has(row.jobId) && row.numericCompared).length;
  $("scCoverage").innerHTML = `<p>前版：1.15.2，保存於 ${esc(data.baselineCapturedAt.replace("T", " "))}。新版：2.0.0，下載於 ${esc(data.currentDownloadedOn)}。</p><p>冒險家五大職業群一至三轉，共比對 ${compared} 個技能的逐級數值與文字，並補入官方「${esc(data.officialSource.title)}」公告（${esc(data.officialSource.checkedOn)} 核對）。各職業路線共用的技能，在總數中只計算一次；系統與職業共通規則另列，不計入技能數。</p><table class="scTable"><thead><tr><th>職業群</th><th>一轉</th><th>二轉</th><th>三轉</th></tr></thead><tbody>${coverageRows}</tbody></table><p>影武者分支缺少可核對的逐級資料，不列入本頁。公告未提及的程式邏輯、動畫判定與伺服器端效果，不以本地數值推定。</p>`;
  $("scCareers").addEventListener("click", event => {
    const button = event.target.closest("[data-career]");
    if (!button) return;
    state.career = Number(button.dataset.career);
    const url = new URL(location.href);
    url.searchParams.set("job", String(state.career));
    url.hash = "";
    history.replaceState(null, "", url);
    render();
    $("scResults").scrollIntoView({block: "start"});
  });
  function restoreSelection() {
    const match = location.hash.match(/^#skill-(\d+)$/);
    const requested = Number(new URL(location.href).searchParams.get("job"));
    const choices = data.careers.filter(career => !match || career.skillIds.includes(Number(match[1])));
    state.career = (choices.find(career => career.id === requested) || choices[0] || data.careers[0]).id;
    if (match && requested !== state.career) {
      const url = new URL(location.href);
      url.searchParams.set("job", String(state.career));
      history.replaceState(null, "", url);
    }
    render();
    const target = match && document.getElementById(`skill-${match[1]}`);
    if (target) {
      target.open = true;
      target.scrollIntoView({block: "start"});
    }
  }
  restoreSelection();
  window.addEventListener("hashchange", restoreSelection);
  window.addEventListener("popstate", restoreSelection);
})();
