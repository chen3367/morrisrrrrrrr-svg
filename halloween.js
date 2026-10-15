(() => {
  "use strict";
  const db = window.MS_HALLOWEEN_DB;
  const $ = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const questById = new Map(db.quests.map((q) => [q.id, q]));
  const initialQuest = "506364";
  let selected = initialQuest;
  let visible = db.quests;
  const number = (value) => Number(value).toLocaleString("zh-TW");
  const stateLabel = (state) => ({0: "未接取", 1: "進行中", 2: "已完成"}[state] || `狀態 ${state}`);
  const image = (row) => row.image ? `<img src="${escape(row.image)}" alt="" width="42" height="48" loading="lazy" />` : '<span class="hwNoImage">本地圖示缺漏</span>';
  const mapLink = (map) => `<a href="${escape(map.href)}">${escape(map.street ? `${map.street} / ${map.name}` : map.name)} <small>${map.id}</small></a>`;

  function entity(row, role = "") {
    const name = row.href ? `<a href="${escape(row.href)}">${escape(row.name)}</a>` : escape(row.name);
    const drops = row.dropMonsters?.length ? `<div class="hwItemDrops"><span>掉落：</span>${row.dropMonsters.map(mob => `<a href="${escape(mob.href)}">${image(mob)}<span>${escape(mob.name)}</span></a>`).join("")}</div>` : "";
    let maps = "";
    if (row.kind === "p") {
      maps = row.maps.length ? `<div class="hwMapLinks">${mapLink(row.maps[0])}</div>` : '<small>未提供固定地圖座標</small>';
      if (row.maps.length > 1) maps += `<details><summary>其他場景地圖 ${row.maps.length - 1}</summary><div class="hwMapLinks">${row.maps.slice(1).map(mapLink).join("")}</div></details>`;
    }
    return `<div class="hwEntity ${row.kind === "p" ? "hwNpc" : ""}">${image(row)}<div>${role ? `<small>${escape(role)}</small>` : ""}<strong>${name}${row.count != null ? ` × ${number(row.count)}` : ""}</strong>${row.quantityLabel ? `<small>${escape(row.quantityLabel)}</small>` : ""}${maps}${drops}${row.choice ? "<small>選擇獎勵</small>" : ""}${row.weight ? "<small>隨機獎勵，機率未確認</small>" : ""}</div></div>`;
  }

  function questLink(q, label) {
    return questById.has(q.id) ? `<a href="#quest-${q.id}" data-quest="${q.id}">${escape(label || q.name)}</a>` : `<a href="#flag-${q.id}" data-flag="${q.id}">${escape(label || q.name)}</a>`;
  }

  function dialogueRows(rows, source = "") {
    return `<ol class="hwDialogue">${rows.map((row) => `<li><small>${escape(source || `${row.stage} · ${row.branch}`)} · ${escape(row.key)}</small><p>${escape(row.text)}</p></li>`).join("")}</ol>`;
  }

  function renderList() {
    const terms = $("hwSearch").value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const chapter = $("hwChapter").value;
    visible = db.quests.filter((q) => (!chapter || q.chapter === chapter) && terms.every((t) => JSON.stringify(q).toLocaleLowerCase().includes(t)));
    $("hwResultCount").textContent = `${visible.length} / ${db.quests.length} 筆任務`;
    $("hwQuestList").innerHTML = visible.length ? visible.map((q) => `<a href="#quest-${q.id}" data-quest="${q.id}" class="hwQuestLink" ${selected === q.id ? 'aria-current="page"' : ""}><strong>${escape(q.name)}</strong><small>${q.id} · Lv.${q.level}${q.daily ? " · 每日任務" : Object.keys(q.repeat).length ? " · 可重複" : ""}</small></a>`).join("") : '<p class="hwEmpty">沒有符合的任務</p>';
  }

  function rewards(q) {
    const r = q.rewards;
    const stats = [r.exp != null ? `經驗值 ${number(r.exp)}` : "", r.money != null ? `楓幣 ${number(r.money)}` : "", r.pop != null ? `名聲 ${number(r.pop)}` : ""].filter(Boolean);
    return `<section class="hwSection"><h4>完成獎勵</h4>${r.note ? `<p class="hwMuted">${escape(r.note)}</p>` : ""}${stats.length ? `<div class="hwRewardStats">${stats.map((v) => `<span>${v}</span>`).join("")}</div>` : ""}${r.give.length ? `<div class="hwEntities">${r.give.map((e) => entity(e)).join("")}</div>` : ""}${!stats.length && !r.give.length ? '<p class="hwMuted">客戶端未列出完整獎勵，不代表完成後沒有獎勵。</p>' : ""}${r.remove.length ? `<details class="hwRemoved"><summary>完成時回收的道具</summary><div class="hwEntities">${r.remove.map((e) => entity(e)).join("")}</div></details>` : ""}</section>`;
  }

  function locationPreview(preview) {
    if (!preview) return "";
    const rect = preview.imageRectPercent;
    const offsets = [[0, -26], [-16, -28], [-16, 28]];
    const markers = preview.points.map((point, index) => {
      const [dx, dy] = offsets[index];
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return `<a class="hwMapPoint" href="${escape(preview.map.href)}" style="left:${point.leftPercent}%;top:${point.topPercent}%" data-number="${point.number}" aria-label="${point.number} ${escape(point.label)}木材堆，座標 ${point.x}, ${point.y}"><span class="hwMapLeader" style="width:${Math.hypot(dx, dy)}px;transform:rotate(${angle}deg)"></span><span class="hwMapDot"></span><span class="hwMapNumber" style="left:${dx}px;top:${dy}px">${point.number}</span></a>`;
    }).join("");
    return `<section class="hwSection hwLocationPreview"><h4>三個木材堆</h4><a href="${escape(preview.map.href)}">${escape(preview.map.name)}</a><div class="hwMapFrame"><div class="hwMapCanvas" style="aspect-ratio:${preview.canvas.width}/${preview.canvas.height}"><img src="${escape(preview.image)}" width="${preview.imageSize.width}" height="${preview.imageSize.height}" alt="${escape(preview.map.name)}小地圖" style="left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%" />${markers}</div></div><ol class="hwMapCoordinates">${preview.points.map(point => `<li><span class="hwCoordinateNumber">${point.number}</span><div><strong>${escape(point.label)}木材堆</strong><span>X ${point.x} · Y ${point.y}</span></div></li>`).join("")}</ol></section>`;
  }

  function renderQuest(id) {
    const q = questById.get(id);
    if (!q) return;
    selected = id;
    const startReq = q.requirements.filter((r) => r.stage === "接取");
    const finishReq = q.requirements.filter((r) => r.stage === "完成");
    const position = db.quests.indexOf(q);
    const prev = db.quests[position - 1], next = db.quests[position + 1];
    $("hwDetail").innerHTML = `<article id="quest-${q.id}" data-id="${q.id}">
      <header class="hwQuestHead"><div><p>第 ${q.chapter} 章 · ${q.id} · Lv.${q.level}${q.maxLevel ? `～${q.maxLevel}` : " 以上"}</p><h3>${escape(q.name)}</h3></div>${q.inIndex ? `<a href="./quests.html?quest=${q.id}">任務索引</a>` : ""}</header>
      <p class="hwSchedule">客戶端排程：${escape(q.start || "未提供")} ～ ${escape(q.end || "未提供")}（未核實實際開放）</p>
      ${q.daily ? '<p class="hwAlert hwDaily">每日任務</p>' : ""}
      <section class="hwSection"><h4>NPC 與地點</h4><div class="hwEntities">${q.startNpc ? entity(q.startNpc, q.endNpc?.id === q.startNpc.id ? "接取與回報" : q.startRole) : '<p class="hwMuted">未提供接取 NPC</p>'}${q.endNpc && q.endNpc.id !== q.startNpc?.id ? entity(q.endNpc, "回報") : ""}</div></section>
      ${startReq.length ? `<section class="hwSection"><h4>接取前置條件</h4><div class="hwPrereqs">${startReq.map((r) => `<div>${questLink(r)} <span>· ${stateLabel(r.state)}</span></div>`).join("")}</div></section>` : ""}
      <section class="hwSection"><h4>任務流程</h4><ol class="hwSteps">${q.steps.map((step) => `<li>${escape(step)}</li>`).join("")}</ol>${finishReq.length ? `<h4>完成本段前需先完成</h4><div class="hwPrereqs">${finishReq.map((r) => `<div>${questLink(r)} <span>· ${stateLabel(r.state)}</span></div>`).join("")}</div>` : ""}</section>
      ${locationPreview(q.locationPreview)}
      ${q.materials.length ? `<section class="hwSection"><h4>需求道具</h4><div class="hwEntities">${q.materials.map((e) => entity(e)).join("")}</div></section>` : ""}
      ${q.monsters.length ? `<section class="hwSection"><h4>需求狩獵</h4><div class="hwEntities">${q.monsters.map((e) => entity(e)).join("")}</div></section>` : ""}
      ${q.extraEntities.length ? `<section class="hwSection"><h4>相關怪物與道具</h4><div class="hwEntities">${q.extraEntities.map((e) => entity(e, e.role)).join("")}</div></section>` : ""}
      ${q.startRewards.give.length ? `<section class="hwSection"><h4>接取時領取</h4><div class="hwEntities">${q.startRewards.give.map((e) => entity(e)).join("")}</div></section>` : ""}
      ${rewards(q)}
      ${q.next.length ? `<section class="hwSection"><h4>相關後續</h4><div class="hwPrereqs">${q.next.map((r) => `<div>${questLink(r)} <span>· 對方${r.stage}條件要求本段${stateLabel(r.state)}</span></div>`).join("")}</div></section>` : ""}
      <details class="hwQuestDialogues"><summary>完整 NPC 對話與事件台詞 · ${q.dialogues.length + q.scene.length} 段</summary>${q.dialogues.length ? dialogueRows(q.dialogues) : ""}${q.scene.length ? '<h4>事件台詞</h4><p class="hwMuted">依本段劇情對應；台詞順序不代表已還原全部伺服器分支。</p>' + dialogueRows(q.scene, "2026_halloweenevent") : ""}</details>
      <details class="hwJournal"><summary>完整任務日誌</summary><ol class="hwDialogue">${q.journal.map((row) => `<li><small>${escape({0: "接取前", 1: "進行中", 2: "完成後", parent: "任務群"}[row.key] || row.key)}</small><p>${escape(row.text)}</p></li>`).join("")}</ol></details>
      <nav class="hwPager" aria-label="相鄰流程">${prev ? questLink(prev, `上一段：${prev.name}`) : "<span></span>"}${next ? questLink(next, `下一段：${next.name}`) : ""}</nav>
    </article>`;
    renderList();
  }

  function navigate(id, push = true) {
    if (!questById.has(id)) return;
    if (push && location.hash !== `#quest-${id}`) history.pushState(null, "", `#quest-${id}`);
    $("hwSearch").value = "";
    if ($("hwChapter").value && $("hwChapter").value !== questById.get(id).chapter) $("hwChapter").value = "";
    renderQuest(id);
  }

  function openFlag(id) {
    $("hwAudit").open = true;
    const row = $(`flag-${id}`);
    if (row) { row.open = true; row.scrollIntoView({block: "center"}); }
  }

  function renderAudit() {
    const a = db.audit;
    $("hwAuditContent").innerHTML = `<p>掃描 ${a.questTableCount} 筆本地任務。收錄 ${a.playableCount} 筆具名流程與 ${a.internalCount} 筆內部旗標／台詞控制任務。每日清單另核對活動公告。</p>
      <p>本地並未提供完整伺服器事件程式。一般任務未列冷卻時，不自行補寫等待時間。</p>
      <p>第一章的「漫漫長夜的守護者」與「永恆的營火」已確認為每日任務。「雪山之歌」另有額外劇情進度要求，觸發條件待確認。</p>
      <p>缺少完整對話：${a.missingDialogues.length ? a.missingDialogues.join("、") : "無（每筆均有任務 Say 或事件台詞）"}。缺少獨立圖示：${escape(a.missingIcons.join("、") || "無")}。</p>
      <p>活動公告期間為 ${escape(db.dailyChecklist.activityPeriod)}。各任務卡保留客戶端排程，尚未逐一核實實際開放。公告未明列每日重置鐘點；勾選清單以台灣時間午夜換日。</p>
      <details><summary>收錄的任務 ID 與依據</summary><ul class="hwAuditRows">${db.quests.map((q) => `<li><strong>${questLink(q, `${q.id} ${q.name}`)}</strong>${escape(q.reason.join("；"))}</li>`).join("")}</ul></details>
      <details id="hwControls"><summary>內部旗標及台詞顯示用任務 · ${db.controls.length}</summary><p>Lv.9999 或標為顯示用途的項目不作為玩家接取任務；保留供追查進度。</p>${db.controls.map((q) => `<details id="flag-${q.id}"><summary>${q.id} ${escape(q.name)}</summary><p>${escape(q.npc)} · ${escape(q.reasons.join("；"))}</p>${q.usedBy.length ? `<p>關聯任務：${q.usedBy.map((id) => questLink({id}, id)).join("、")}</p>` : ""}<pre class="hwRaw">${escape(JSON.stringify({Check: q.checks, QuestInfo: q.info}, null, 2))}</pre></details>`).join("")}</details>
      <details><summary>未收錄的鄰近任務與弱關鍵字命中</summary><ul class="hwAuditRows">${[...a.nearbyExclusions, ...a.weakKeywordExclusions].map((q) => `<li><strong>${q.id} ${escape(q.name)}</strong>${escape(q.reason)}</li>`).join("")}</ul></details>
      <p>${escape(a.legacyNote)}</p><p class="hwHash">來源摘要 SHA-256：${escape(a.sourceSha256)}</p>`;
  }

  function renderArchives() {
    $("hwScripts").innerHTML = db.scripts.map((script, i) => `<details class="hwScriptArchive" data-script="${i}"><summary>${escape(script.title)} · ${script.rows.length} 段</summary><div class="hwScriptBody"><p class="hwMuted">${i === 1 ? "舊版幽靈宅邸內容，不能視為本期開放任務、獎勵或規則。" : "完整保留本期事件文字，包含商店、一般問候與未能唯一歸屬某任務的台詞；不把片段中的商品期限解讀為活動日期。"}</p><label for="hwScriptSearch${i}">搜尋台詞或編號</label><input id="hwScriptSearch${i}" type="search" data-script-search="${i}" autocomplete="off" /><p class="hwScriptCount" id="hwScriptCount${i}" role="status"></p><div class="hwScriptRows" id="hwScriptRows${i}"></div></div></details>`).join("");
    document.querySelectorAll(".hwScriptArchive").forEach((node) => node.addEventListener("toggle", () => {
      if (node.open && !node.dataset.loaded) { fillScript(Number(node.dataset.script), ""); node.dataset.loaded = "true"; }
    }));
  }

  function fillScript(index, term) {
    const script = db.scripts[index];
    const q = term.trim().toLocaleLowerCase();
    const matches = script.rows.filter((row) => !q || `${row.number} ${row.key} ${row.text}`.toLocaleLowerCase().includes(q));
    $(`hwScriptRows${index}`).innerHTML = matches.length ? dialogueRows(matches, script.root) : '<p class="hwEmpty">沒有符合的台詞</p>';
    $(`hwScriptCount${index}`).textContent = `${matches.length} / ${script.rows.length} 段`;
  }

  $("hwVersion").textContent = `遊戲資料 ${db.gameVersion} · ${db.quests.length} 段任務`;
  $("hwChapters").innerHTML = db.chapters.map((c) => `<a href="#quest-${db.quests.find((q) => q.chapter === c.id && q.id !== "506363").id}" data-chapter="${c.id}"><strong>${escape(c.title)}</strong><small>Lv.${c.level} 以上 · ${db.quests.filter((q) => q.chapter === c.id).length} 段</small><small>本地排程 ${escape(c.start)} 起</small></a>`).join("");
  $("hwSearch").addEventListener("input", renderList);
  $("hwChapter").addEventListener("change", renderList);
  document.addEventListener("input", (event) => {
    const index = event.target.dataset.scriptSearch;
    if (index !== undefined) fillScript(Number(index), event.target.value);
  });
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[data-quest], a[data-chapter], a[data-flag]");
    if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (anchor.dataset.flag) {
      history.pushState(null, "", `#flag-${anchor.dataset.flag}`);
      $("hwControls").open = true;
      openFlag(anchor.dataset.flag);
    } else {
      const id = anchor.dataset.quest || db.quests.find((q) => q.chapter === anchor.dataset.chapter && q.id !== "506363").id;
      if (anchor.dataset.chapter) $("hwChapter").value = anchor.dataset.chapter;
      navigate(id);
      $("hwDetail").scrollIntoView({block: "start"});
    }
  });
  function fromLocation() {
    const quest = location.hash.match(/^#quest-(\d+)$/)?.[1] || new URLSearchParams(location.search).get("quest");
    const flag = location.hash.match(/^#flag-(\d+)$/)?.[1];
    if (questById.has(quest)) navigate(quest, false);
    else if (flag) { $("hwControls").open = true; openFlag(flag); }
    else navigate(initialQuest, false);
  }
  const themeButton = $("themeToggle");
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    themeButton?.setAttribute("aria-pressed", String(dark));
    themeButton?.setAttribute("aria-label", dark ? "切換為亮色" : "切換為深色");
    if (themeButton) themeButton.title = themeButton.getAttribute("aria-label");
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
  renderAudit();
  renderArchives();
  renderQuest(selected);
  fromLocation();
  window.addEventListener("popstate", fromLocation);
  window.addEventListener("hashchange", fromLocation);
})();
