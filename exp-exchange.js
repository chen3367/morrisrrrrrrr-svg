(function () {
  "use strict";
  const data = window.MS_EXP_EXCHANGE_DB;
  const logic = window.MapleExpExchange;
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const n = value => Number(value).toLocaleString("zh-TW");
  const entity = row => `<a class="expEntityLink" href="${escape(row.href)}"><img src="${escape(row.image)}" width="32" height="36" alt="" /><span>${escape(row.name)}</span></a>`;
  const locations = npc => npc.maps.map(map => `<a href="${escape(map.href)}">${escape(map.name)}</a>`).join("、");
  const dialogue = rows => rows.map(row => `<div class="expDialogue"><small>${escape(row.key)}${row.fragment ? " · 伺服器拼接用片段" : ""}</small><p>${escape(row.text)}</p><details><summary>原始字串</summary><pre>${escape(row.raw)}</pre></details></div>`).join("");
  const shoes = data.shoes, charlie = data.charlie;
  const params = new URLSearchParams(location.search);
  const linkedMaterial = charlie.materials.find(row => String(row.id) === params.get("material"));
  const linkedReward = linkedMaterial?.rewardReference?.rewards.find(row => String(row.id) === params.get("reward"));
  function rewardDetails(material) {
    const pool = material.rewardReference;
    if (!pool) return '<details class="expRewardDetails"><summary>隨機獎勵 · 暫無資料</summary><p class="expMinor">獎勵內容待確認。</p></details>';
    const rows = pool.rewards.map(row => {
      const tag = row.href ? "a" : "span";
      const selected = material === linkedMaterial && row === linkedReward;
      return `<li${selected ? ' class="expLinkedReward"' : ""}><${tag}${row.href ? ` href="${escape(row.href)}"` : ""} class="expRewardItem">${row.image ? `<img src="${escape(row.image)}" width="32" height="32" alt="" loading="lazy" />` : '<span class="expMissingImage" aria-label="尚無本地圖示">?</span>'}<span>${escape(row.name)}${row.localStatus !== "完整" ? `<small>${escape(row.localStatus)}</small>` : ""}</span></${tag}><strong>×${n(row.count)}</strong></li>`;
    }).join("");
    const issues = pool.issues.length ? `<p class="expWarning">另有 ${pool.issues.length} 項獎勵尚待確認，暫不列出。</p>` : "";
    return `<details class="expRewardDetails"><summary>隨機獎勵 <span>${pool.rewards.length} 項${pool.issues.length ? ` · ${pool.issues.length} 項待確認` : ""}</span></summary><p class="expMinor">每 ${material.batch} 個材料，隨機獲得一項獎勵。</p><ul class="expRewardList">${rows}</ul>${issues}</details>`;
  }
  const themeButton = $("themeToggle");
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

  $("expVersion").textContent = `查理中士交換 · 艾溫的玻璃鞋 · 遊戲 ${data.gameVersion}`;
  $("expLevel").max = data.levelCap;
  $("expTargetLevel").max = data.levelCap;
  $("expTargetLevel").value = Math.min(30, data.levelCap);
  $("expCharlieExp").textContent = n(charlie.exp);
  for (const [id, image, label, batch, exp] of [
    ["expPlanCharlieIdentity", charlie.npc.image, "查理中士經驗物", charlie.materials[0].batch, charlie.exp],
    ["expPlanShoesIdentity", shoes.item.image, "玻璃鞋", shoes.batch, shoes.exp],
  ]) {
    $(id).innerHTML = `<div class="expPlanIdentity"><img src="${escape(image)}" width="32" height="36" alt="" /><span>${escape(label)}<small>${n(batch)} 個／組 · ${n(exp)} EXP</small></span></div>`;
  }
  $("expShoeIdentity").innerHTML = `<img src="${escape(shoes.item.image)}" alt="" width="48" height="48" /><div><h3 id="expShoeTitle"><a href="./quests.html?quest=${shoes.questId}">${escape(shoes.name)}</a></h3><p>${shoes.batch} 個 / ${n(shoes.exp)} EXP · Lv.${shoes.minLevel}${shoes.maxLevel ? `～${shoes.maxLevel}` : " 以上"} · 可重複</p></div>`;
  $("expCharlieIdentity").innerHTML = `<img src="${escape(charlie.npc.image)}" alt="" width="48" height="58" /><div><h3 id="expCharlieTitle">${escape(charlie.npc.name)}交換</h3><p>${locations(charlie.npc)} · ${charlie.materials.length} 種材料</p></div>`;
  $("expMaterials").innerHTML = charlie.materials.map(row => `<div class="expMaterialRow" data-material="${row.id}"><div class="expMaterialName"><img src="${escape(row.image)}" width="36" height="36" alt="" /><div><a href="${escape(row.href)}">${escape(row.name)}</a><small>${row.id} · 每 ${row.batch} 個</small></div></div><div class="expMaterialQuantity"><label for="expQty${row.id}">${escape(row.name)}數量</label><input id="expQty${row.id}" name="qty${row.id}" type="number" min="0" max="1000000000" step="1" value="0" required inputmode="numeric" /></div><output class="expMaterialResult" id="expRow${row.id}" for="expQty${row.id}"><span>0 次</span><small>剩餘 0 個</small></output>${rewardDetails(row)}</div>`).join("");

  $("expCharlieScript").innerHTML = `<div class="expIdentity"><img src="${escape(charlie.npc.image)}" width="48" height="58" alt="${escape(charlie.npc.name)}" /><div><h4>${escape(charlie.npc.name)}（查理中士）</h4><p>${locations(charlie.npc)}</p></div></div><p>每 ${charlie.materials[0].batch} 個同種材料可交換一次，請預留背包空位。</p><p class="expMinor">部分對話的道具名稱與數量會依交換內容顯示。</p>${dialogue(charlie.dialogues)}`;
  const rewards = shoes.rewards.map(row => entity({ ...row, name: `${row.name} ×${row.count}` })).join("");
  $("expShoeScript").innerHTML = `<div class="expIdentity"><img src="${escape(shoes.npc.image)}" width="48" height="58" alt="${escape(shoes.npc.name)}" /><div><h4>${escape(shoes.npc.name)}（愛溫）</h4><p>${locations(shoes.npc)} · <a href="./quests.html?quest=${shoes.questId}">任務 ${shoes.questId}</a></p></div></div><ol><li>達到 Lv.${shoes.minLevel}，找艾溫接取任務。</li><li>從火肥肥取得玻璃鞋，交回 ${shoes.batch} 個。</li><li>完成獲得 ${n(shoes.exp)} EXP，並隨機獲得冰塊或妖精之翼。</li><li>可重複完成，請預留背包空位。</li></ol><div class="expEntityLinks">${entity(shoes.item)}${shoes.monster.href ? entity(shoes.monster) : ""}${rewards}</div>${shoes.texts.map(row => `<div class="expDialogue"><small>任務紀錄 ${escape(row.key)}</small><p>${escape(row.text)}</p></div>`).join("")}${dialogue(shoes.dialogues)}`;

  function update() {
    const inputs = [...$("expForm").querySelectorAll('input[type="number"]')];
    for (const input of inputs) input.setAttribute("aria-invalid", String(!input.validity.valid));
    try {
      const result = logic.calculate(data, { level: $("expLevel").value, percent: $("expPercent").value,
        targetLevel: $("expTargetLevel").value,
        shoes: $("expShoes").value,
        quantities: Object.fromEntries(charlie.materials.map(row => [row.id, $("expQty" + row.id).value])) });
      $("expError").hidden = true;
      $("expFinalLevel").textContent = `Lv.${result.final.level}`;
      $("expFinalPercent").textContent = result.final.capped ? "已封頂" : `${(Math.floor(result.finalPercent * 10000) / 10000).toFixed(4)}%`;
      $("expTotal").textContent = `${n(result.totalExp)} EXP`;
      $("expLevelGain").textContent = `+${n(result.gainedLevels)}`;
      $("expProgress").textContent = result.final.capped ? "已達計算上限" : `${n(result.final.exp)} / ${n(result.nextLevelExp)}`;
      $("expTargetStartLabel").textContent = `目前距離 Lv.${result.target.level}`;
      $("expTargetFinalLabel").textContent = `結算後距離 Lv.${result.target.level}`;
      for (const [id, remaining] of [["expTargetStart", result.target.startRemainingExp], ["expTargetFinal", result.target.finalRemainingExp]]) {
        $(id).textContent = remaining === 0 ? "0 EXP（已達目標）" : `${n(remaining)} EXP`;
      }
      $("expPlanTitle").textContent = `達到 Lv.${result.target.level} 所需組數`;
      for (const [phase, suffix] of [["start", "Start"], ["final", "Final"]]) {
        for (const [kind, label] of [["charlie", "Charlie"], ["shoes", "Shoes"]]) {
          const plan = result.targetPlans[phase][kind];
          $("expPlan" + label + suffix).innerHTML = plan.blocked
            ? `<span class="expWarning">${escape(plan.blocked)}</span>`
            : `<strong>${n(plan.groups)} 組</strong><small>${plan.groups ? `${n(plan.quantity)} 個` : "已達目標"}</small>`;
        }
      }
      $("expCapNote").hidden = !result.final.capped;
      $("expCapNote").textContent = `有效計入 ${n(result.appliedExp)} EXP；超出上限 ${n(result.final.discarded)} EXP 不計入。`;
      $("expShoeTotal").textContent = `${n(result.shoes.exp)} EXP`;
      $("expShoeCount").textContent = `完成 ${n(result.shoes.completions)} 次 · 剩餘 ${n(result.shoes.remainder)} 個`;
      $("expShoeWarning").hidden = !result.shoes.blocked;
      $("expShoeWarning").textContent = result.shoes.blocked;
      $("expCharlieTotal").textContent = `${n(result.charlieCompletions)} 次 · ${n(result.charlieExp)} EXP`;
      for (const row of result.rows) $("expRow" + row.id).innerHTML = `<span>${n(row.completions)} 次</span><small>剩餘 ${n(row.remainder)} 個</small>`;
    } catch (error) {
      $("expError").textContent = error.message;
      $("expError").hidden = false;
      for (const id of ["expFinalLevel", "expFinalPercent", "expTotal", "expLevelGain", "expProgress", "expTargetStart", "expTargetFinal", "expShoeTotal", "expShoeCount", "expCharlieTotal", "expPlanCharlieStart", "expPlanCharlieFinal", "expPlanShoesStart", "expPlanShoesFinal"]) $(id).textContent = "待修正輸入";
      $("expPlanTitle").textContent = "達標所需組數";
      $("expTargetStartLabel").textContent = "目前距離目標";
      $("expTargetFinalLabel").textContent = "結算後距離目標";
      $("expCapNote").hidden = true;
      $("expShoeWarning").hidden = true;
      for (const row of charlie.materials) $("expRow" + row.id).textContent = "待計算";
    }
  }
  $("expForm").addEventListener("submit", event => event.preventDefault());
  $("expForm").addEventListener("input", event => { if (event.target.id !== "expSearch") update(); });
  $("expForm").addEventListener("change", update);
  function filterMaterials() {
    const query = $("expSearch").value.trim().toLocaleLowerCase();
    let count = 0;
    for (const row of charlie.materials) {
      const rewardText = (row.rewardReference?.rewards || []).map(reward => `${reward.name} ${reward.id}`).join(" ");
      const visible = `${row.name} ${row.id} ${rewardText}`.toLocaleLowerCase().includes(query);
      document.querySelector(`[data-material="${row.id}"]`).hidden = !visible;
      if (visible) count++;
    }
    $("expSearchEmpty").hidden = count > 0;
  }
  $("expSearch").addEventListener("input", filterMaterials);
  update();
  if (linkedMaterial) {
    $("expSearch").value = String(linkedMaterial.id);
    filterMaterials();
    const details = document.querySelector(`[data-material="${linkedMaterial.id}"] .expRewardDetails`);
    details.open = true;
    requestAnimationFrame(() => {
      $("expCharlie").scrollIntoView({ block: "start" });
      details.querySelector("summary").focus({ preventScroll: true });
    });
  }
})();
