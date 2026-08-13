const gachaDb = window.MS_GACHA_SIM_DB || {};
const pools = Array.isArray(gachaDb.pools) ? gachaDb.pools : [];
const selectablePools = pools.filter(isSelectablePool);
const COOKIE_DAYS = 180;
const SETTINGS_COOKIE = "ms_gacha_simulator_settings";
const ID_COOKIE = "ms_gacha_show_ids";
const LOG_LIMIT = 80;
const GACHA_COST_UNIT = "楓葉點數";

const state = {
  poolId: "",
  targetId: "",
  targetSearch: "",
  targetGroup: "",
  royalCoupon: "hair",
  royalGender: "male",
  showIds: false,
  exchangeRequired: 0,
  exchangeTiers: {},
  exchangeValues: {},
  autoOpenExchange: true,
  unitPrice: "",
  autoLimit: 50000,
  drawDelayMs: 0,
  drawing: false,
  stopRequested: false,
  simulation: freshSimulation(),
};

const els = {};

function freshSimulation() {
  return {
    draws: 0,
    exchangeDraws: 0,
    hits: 0,
    fragments: 0,
    distribution: {},
    log: [],
  };
}

function readCookie(name) {
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const rows = document.cookie ? document.cookie.split("; ") : [];
    const row = rows.find(value => value.startsWith(prefix));
    return row ? decodeURIComponent(row.slice(prefix.length)) : "";
  } catch (_error) {
    return "";
  }
}

function writeCookie(name, value) {
  try {
    const maxAge = COOKIE_DAYS * 24 * 60 * 60;
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  } catch (_error) {}
}

function loadSettings() {
  state.showIds = readCookie(ID_COOKIE) === "1";
  const raw = readCookie(SETTINGS_COOKIE);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (saved && typeof saved === "object") {
      state.poolId = String(saved.poolId || "");
      state.targetId = String(saved.targetId || "");
      state.targetSearch = String(saved.targetSearch || "");
      state.targetGroup = String(saved.targetGroup || "");
      state.royalCoupon = saved.royalCoupon === "face" ? "face" : "hair";
      state.royalGender = saved.royalGender === "female" ? "female" : "male";
      state.exchangeRequired = positiveInt(saved.exchangeRequired, 0);
      state.exchangeTiers = saved.exchangeTiers && typeof saved.exchangeTiers === "object" ? saved.exchangeTiers : {};
      state.exchangeValues = saved.exchangeValues && typeof saved.exchangeValues === "object" ? saved.exchangeValues : {};
      state.autoOpenExchange = saved.autoOpenExchange !== false;
      state.unitPrice = String(saved.unitPrice || "");
      state.autoLimit = positiveInt(saved.autoLimit, 50000);
      state.drawDelayMs = Math.min(5000, positiveInt(saved.drawDelayMs, 0));
    }
  } catch (_error) {}
}

function saveSettings() {
  writeCookie(SETTINGS_COOKIE, JSON.stringify({
    poolId: state.poolId,
    targetId: state.targetId,
    targetSearch: state.targetSearch,
    targetGroup: state.targetGroup,
    royalCoupon: state.royalCoupon,
    royalGender: state.royalGender,
    exchangeRequired: state.exchangeRequired,
    exchangeTiers: state.exchangeTiers,
    exchangeValues: state.exchangeValues,
    autoOpenExchange: state.autoOpenExchange,
    unitPrice: state.unitPrice,
    autoLimit: state.autoLimit,
    drawDelayMs: state.drawDelayMs,
  }));
  writeCookie(ID_COOKIE, state.showIds ? "1" : "0");
}

function positiveInt(value, fallback = 0) {
  const number = Number(String(value ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
}

function formatInt(value) {
  return Math.round(Number(value) || 0).toLocaleString("zh-TW");
}

function formatFloat(value, digits = 2) {
  if (!Number.isFinite(value)) return "無法計算";
  return value.toLocaleString("zh-TW", { maximumFractionDigits: digits });
}

function formatPct(value) {
  if (!Number.isFinite(value)) return "無法計算";
  return `${value.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;
}

function moneyDigits(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
  return digits || "0";
}

function formatMoneyInput(value) {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return "";
  return moneyDigits(raw).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function moneyValue(value) {
  const text = String(value ?? "").replace(/[^\d]/g, "");
  if (!text) return 0;
  const number = Number(text);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function formatPointCost(value) {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return "";
  return `${formatMoneyInput(raw)} ${GACHA_COST_UNIT}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function prizeIconHtml(prize, className = "gachaPrizeIcon") {
  const image = prize?.image || "";
  const tier = prize?.tier || "";
  if (image) {
    return `<img class="${escapeHtml(className)}" src="${escapeHtml(image)}" alt="" loading="lazy" />`;
  }
  return `<span class="${escapeHtml(className)} gachaPrizeIconFallback">${escapeHtml(tier)}</span>`;
}

function isSelectablePool(pool) {
  if (!pool || pool.selectable === false || pool.kind === "exchangeReward") return false;
  return true;
}

function selectablePoolById(poolId) {
  return selectablePools.find(pool => pool.id === poolId) || null;
}

function currentPool() {
  return selectablePoolById(state.poolId) || selectablePools[0] || pools[0] || null;
}

function isRoyalPool(pool = currentPool()) {
  return pool?.kind === "royalBeauty" || String(pool?.id || "").startsWith("royal-beauty-");
}

function royalCouponLabel() {
  return state.royalCoupon === "face" ? "皇家美容券" : "皇家美髮券";
}

function royalGenderText() {
  return state.royalGender === "female" ? "女" : "男";
}

function royalGroupName() {
  const kind = state.royalCoupon === "face" ? "皇家整形" : "皇家美髮";
  return `${kind}(${royalGenderText()})`;
}

function isRoyalPrize(prize) {
  const group = String(prize?.group || prize?.tier || "");
  return group.includes("皇家美髮") || group.includes("皇家整形") || String(prize?.image || "").includes("/royal_avatars/");
}

function iconClassForPrize(prize, baseClass) {
  return isRoyalPrize(prize) ? `${baseClass} gachaRoyalAvatarIcon` : baseClass;
}

function activePoolGroups(pool = currentPool()) {
  if (!isRoyalPool(pool)) return null;
  const group = royalGroupName();
  return groupNames(pool).includes(group) ? [group] : [];
}

function displayedGroupNames(pool = currentPool()) {
  const active = activePoolGroups(pool);
  return active || groupNames(pool);
}

function displayedPrizes(pool = currentPool()) {
  const groups = activePoolGroups(pool);
  if (!groups) return pool?.prizes || [];
  return (pool?.prizes || []).filter(prize => groups.includes(prize.group));
}

function drawCurrencyLabel(pool = currentPool()) {
  return isRoyalPool(pool) ? royalCouponLabel() : (pool?.currencyLabel || "抽");
}

function prizeProductLabel(pool, prize) {
  if (isRoyalPool(pool)) return royalCouponLabel();
  return prize?.group || pool?.shortName || pool?.name || "轉蛋商品";
}

function applyPoolDefaults({ force = false } = {}) {
  const pool = currentPool();
  if (!pool) return;
  const defaultPrice = positiveInt(pool.defaultUnitPrice, 0);
  if (force || !moneyValue(state.unitPrice)) {
    state.unitPrice = defaultPrice ? String(defaultPrice) : "";
  }
  if (pool.exchange?.enabled) {
    const defaultRequired = positiveInt(pool.exchange.defaultFragmentsRequired, 0);
    if (force || !positiveInt(state.exchangeRequired, 0)) {
      state.exchangeRequired = defaultRequired;
    }
  } else if (force) {
    state.exchangeRequired = 0;
  }
}

function groupNames(pool) {
  return Array.from(new Set((pool?.prizes || []).map(prize => prize.group).filter(Boolean)));
}

function currentTarget() {
  const pool = currentPool();
  return (pool?.prizes || []).find(prize => prize.id === state.targetId) || visibleTargets()[0] || (pool?.prizes || [])[0] || null;
}

function norm(value) {
  return String(value || "").toLowerCase().trim();
}

function visibleTargets() {
  const pool = currentPool();
  if (!pool) return [];
  const query = norm(state.targetSearch);
  const activeGroups = activePoolGroups(pool);
  return pool.prizes.filter(prize => {
    if (activeGroups && !activeGroups.includes(prize.group)) return false;
    if (state.targetGroup && prize.group !== state.targetGroup) return false;
    if (!query) return true;
    const haystack = `${prize.name} ${prize.tier} ${prize.group} ${prize.id}`.toLowerCase();
    return haystack.includes(query);
  });
}

function primaryPrizes(pool, target = currentTarget()) {
  if (!pool) return [];
  const activeGroups = activePoolGroups(pool);
  if (activeGroups) {
    return pool.prizes.filter(prize => activeGroups.includes(prize.group));
  }
  if (pool.exchange?.enabled && pool.directGroup) {
    return pool.prizes.filter(prize => prize.group === pool.directGroup);
  }
  if (pool.directGroup) {
    return pool.prizes.filter(prize => prize.group === pool.directGroup);
  }
  if (target?.group) {
    return pool.prizes.filter(prize => prize.group === target.group);
  }
  const firstGroup = groupNames(pool)[0];
  return firstGroup ? pool.prizes.filter(prize => prize.group === firstGroup) : pool.prizes;
}

function targetPrizes(pool) {
  if (!pool?.exchange?.targetGroup) return [];
  return pool.prizes.filter(prize => prize.group === pool.exchange.targetGroup);
}

function totalChance(prizes) {
  return prizes.reduce((sum, prize) => sum + Number(prize.chance || 0), 0);
}

function prizeProbability(prize, prizes) {
  const total = totalChance(prizes);
  return total > 0 ? Number(prize?.chance || 0) / total : 0;
}

function confidenceDraws(probability, confidence) {
  if (!probability || probability <= 0 || probability >= 1) return probability >= 1 ? 1 : 0;
  return Math.ceil(Math.log(1 - confidence) / Math.log(1 - probability));
}

function isExchangeTarget(pool, target) {
  return !!(pool?.exchange?.enabled && target?.group === pool.exchange.targetGroup && pool.directGroup !== target.group);
}

function exchangeTierValue(tier) {
  const pool = currentPool();
  const official = pool?.exchange?.fragmentByTier || {};
  const saved = state.exchangeValues[tier];
  return positiveInt(saved ?? official[tier], positiveInt(official[tier], 0));
}

function exchangeTierEnabled(tier) {
  if (Object.prototype.hasOwnProperty.call(state.exchangeTiers, tier)) {
    return !!state.exchangeTiers[tier];
  }
  const defaults = currentPool()?.exchange?.defaultEnabledTiers || [];
  return defaults.includes(tier);
}

function exchangeTierLabel(tier) {
  return `分解 ${tier} 賞`;
}

function expectedFragmentsPerDraw(pool) {
  if (pool?.exchange?.enabled && !state.autoOpenExchange) return 0;
  const source = primaryPrizes(pool);
  const total = totalChance(source);
  if (!total) return 0;
  return source.reduce((sum, prize) => {
    if (!exchangeTierEnabled(prize.tier)) return sum;
    return sum + (Number(prize.chance || 0) / total) * exchangeTierValue(prize.tier);
  }, 0);
}

function expectationFor(pool, target) {
  if (!pool || !target) return { mode: "none" };
  if (isExchangeTarget(pool, target)) {
    if (!state.autoOpenExchange) {
      return {
        mode: "exchange",
        chance: 0,
        displayedChance: target.chance,
        poolTotal: totalChance(targetPrizes(pool)),
        expectedDraws: 0,
        fragmentsRequired: positiveInt(state.exchangeRequired, 0),
        fragmentRate: 0,
        sourceDrawsPerBright: 0,
      };
    }
    const brightPool = targetPrizes(pool);
    const brightProbability = prizeProbability(target, brightPool);
    const fragmentsRequired = positiveInt(state.exchangeRequired, 0);
    const fragmentRate = expectedFragmentsPerDraw(pool);
    const sourceDrawsPerBright = fragmentsRequired > 0 && fragmentRate > 0 ? fragmentsRequired / fragmentRate : 0;
    const expectedDraws = brightProbability > 0 && sourceDrawsPerBright > 0 ? sourceDrawsPerBright / brightProbability : 0;
    return {
      mode: "exchange",
      chance: brightProbability,
      displayedChance: target.chance,
      poolTotal: totalChance(brightPool),
      expectedDraws,
      fragmentsRequired,
      fragmentRate,
      sourceDrawsPerBright,
    };
  }
  const direct = primaryPrizes(pool, target);
  const probability = prizeProbability(target, direct);
  return {
    mode: "direct",
    chance: probability,
    displayedChance: target.chance,
    poolTotal: totalChance(direct),
    expectedDraws: probability > 0 ? 1 / probability : 0,
    p50: confidenceDraws(probability, 0.5),
    p90: confidenceDraws(probability, 0.9),
    p95: confidenceDraws(probability, 0.95),
  };
}

function expectedCost(expectedDraws) {
  const price = moneyValue(state.unitPrice);
  return price > 0 && expectedDraws > 0 ? price * expectedDraws : 0;
}

function roll(prizes) {
  const total = totalChance(prizes);
  if (!total || !prizes.length) return null;
  let ticket = Math.random() * total;
  for (const prize of prizes) {
    ticket -= Number(prize.chance || 0);
    if (ticket <= 0) return prize;
  }
  return prizes[prizes.length - 1];
}

function addDistribution(label) {
  state.simulation.distribution[label] = (state.simulation.distribution[label] || 0) + 1;
}

function currentTimeLabel() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function isBigPrize(prize) {
  return ["S", "A", "B"].includes(String(prize?.tier || "").trim().toUpperCase());
}

function addLog(line) {
  state.simulation.log.push({ type: "text", text: line });
  if (state.simulation.log.length > LOG_LIMIT) state.simulation.log.shift();
}

function addPrizeLog(prize, productName) {
  if (!prize) return;
  state.simulation.log.push({
    type: "prize",
    time: currentTimeLabel(),
    product: productName,
    prize: prize.name,
    image: prize.image || "",
    tier: prize.tier || "",
    big: isBigPrize(prize),
    royal: isRoyalPrize(prize),
  });
  if (state.simulation.log.length > LOG_LIMIT) state.simulation.log.shift();
}

function resetSimulation(render = true) {
  state.simulation = freshSimulation();
  if (render) renderAll();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setDrawing(active) {
  state.drawing = active;
  state.stopRequested = false;
  [
    els.drawOne,
    els.drawTen,
    els.drawUntilTarget,
    els.resetSimulation,
  ].forEach(button => {
    if (button) button.disabled = active;
  });
  if (els.stopDraw) els.stopDraw.disabled = !active;
}

function drawOnce(pool, target, options = {}) {
  const exchangeTarget = isExchangeTarget(pool, target);
  const sourcePool = primaryPrizes(pool, target);
  const brightPool = targetPrizes(pool);
  const fragmentsRequired = positiveInt(state.exchangeRequired, 0);

  if (exchangeTarget && (!state.autoOpenExchange || fragmentsRequired <= 0 || !brightPool.length)) {
    const sourcePrize = roll(sourcePool);
    if (!sourcePrize) return { stopped: false, rolled: false };
    state.simulation.draws += 1;
    addDistribution(`${sourcePrize.group} / ${sourcePrize.name}`);
    addPrizeLog(sourcePrize, prizeProductLabel(pool, sourcePrize));
    if (exchangeTierEnabled(sourcePrize.tier)) {
      state.simulation.fragments += exchangeTierValue(sourcePrize.tier);
    }
    return { stopped: false, rolled: true };
  }

  if (exchangeTarget) {
    const sourcePrize = roll(sourcePool);
    if (!sourcePrize) return { stopped: false, rolled: false };
    state.simulation.draws += 1;
    addDistribution(`${sourcePrize.group} / ${sourcePrize.name}`);
    addPrizeLog(sourcePrize, prizeProductLabel(pool, sourcePrize));
    if (exchangeTierEnabled(sourcePrize.tier)) {
      state.simulation.fragments += exchangeTierValue(sourcePrize.tier);
    }
    while (state.simulation.fragments >= fragmentsRequired) {
      state.simulation.fragments -= fragmentsRequired;
      state.simulation.exchangeDraws += 1;
      const brightPrize = roll(brightPool);
      if (!brightPrize) break;
      addDistribution(`${brightPrize.group} / ${brightPrize.name}`);
      addPrizeLog(brightPrize, prizeProductLabel(pool, brightPrize));
      if (brightPrize.id === target.id) {
        state.simulation.hits += 1;
        if (options.untilTarget) return { stopped: true, rolled: true };
      }
    }
    return { stopped: false, rolled: true };
  }

  const prize = roll(sourcePool);
  if (!prize) return { stopped: false, rolled: false };
  state.simulation.draws += 1;
  addDistribution(`${prize.group} / ${prize.name}`);
  addPrizeLog(prize, prizeProductLabel(pool, prize));
  if (prize.id === target.id) {
    state.simulation.hits += 1;
    if (options.untilTarget) return { stopped: true, rolled: true };
  }
  return { stopped: false, rolled: true };
}

async function drawMany(count, untilTarget = false) {
  if (state.drawing) return;
  const pool = currentPool();
  const target = currentTarget();
  if (!pool || !target) return;
  const limit = untilTarget ? Math.max(1, Math.min(100000, positiveInt(state.autoLimit, 50000))) : Math.max(1, count);
  const price = moneyValue(state.unitPrice);
  let stopped = false;
  const delay = Math.max(0, Math.min(5000, positiveInt(state.drawDelayMs, 0)));

  setDrawing(true);
  try {
    for (let index = 0; index < limit; index += 1) {
      if (state.stopRequested) break;
      const result = drawOnce(pool, target, { untilTarget });
      if (!result.rolled) break;
      if (price > 0 && state.simulation.draws > 0) {
        state.simulation.spent = state.simulation.draws * price;
      }
      if (delay > 0) {
        renderAll();
        await sleep(delay);
      }
      if (result.stopped) {
        stopped = true;
        break;
      }
    }
    if (untilTarget && !stopped && !state.stopRequested) {
      addLog(`已達上限 ${formatInt(limit)} 抽，尚未抽中 ${target.name}`);
    }
  } finally {
    setDrawing(false);
    if (price > 0 && state.simulation.draws > 0) {
      state.simulation.spent = state.simulation.draws * price;
    }
    renderAll();
  }
}

function syncControls() {
  const pool = currentPool();
  if (els.poolSelect) els.poolSelect.value = state.poolId;
  if (els.royalPanel) els.royalPanel.hidden = !isRoyalPool(pool);
  if (els.royalCouponSelect) els.royalCouponSelect.value = state.royalCoupon;
  if (els.royalGenderSelect) els.royalGenderSelect.value = state.royalGender;
  if (els.targetSearch) els.targetSearch.value = state.targetSearch;
  if (els.targetGroupFilter) els.targetGroupFilter.value = state.targetGroup;
  if (els.targetSelect) els.targetSelect.value = state.targetId;
  if (els.exchangeFragmentsRequired) els.exchangeFragmentsRequired.value = state.exchangeRequired || "";
  if (els.autoOpenExchange) els.autoOpenExchange.checked = state.autoOpenExchange;
  if (els.unitPrice) els.unitPrice.value = formatMoneyInput(state.unitPrice);
  if (els.unitPriceHint) els.unitPriceHint.textContent = formatPointCost(state.unitPrice);
  if (els.autoLimit) els.autoLimit.value = state.autoLimit;
  if (els.drawDelayMs) els.drawDelayMs.value = state.drawDelayMs || "";
  if (els.stopDraw) els.stopDraw.disabled = !state.drawing;
  if (els.idToggle) {
    els.idToggle.classList.toggle("active", state.showIds);
    els.idToggle.setAttribute("aria-pressed", String(state.showIds));
  }
}

function setTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("ms-theme", next);
  } catch (_error) {}
  writeCookie("ms_theme", next);
  if (els.themeToggle) {
    const dark = next === "dark";
    els.themeToggle.textContent = dark ? "☀" : "☾";
    els.themeToggle.setAttribute("aria-pressed", String(dark));
    els.themeToggle.setAttribute("aria-label", dark ? "切換為白底" : "切換為黑底");
    els.themeToggle.title = dark ? "切換為白底" : "切換為黑底";
  }
}

function initialTheme() {
  const cookieTheme = readCookie("ms_theme");
  if (cookieTheme === "dark" || cookieTheme === "light") return cookieTheme;
  try {
    return localStorage.getItem("ms-theme") === "dark" ? "dark" : "light";
  } catch (_error) {
    return "light";
  }
}

function renderPoolCards() {
  if (!els.poolCards) return;
  els.poolCards.innerHTML = selectablePools.map(pool => {
    const count = displayedPrizes(pool).length;
    const active = pool.id === state.poolId ? " active" : "";
    return `
      <button class="gachaProductCard${active}" type="button" data-pool-id="${escapeHtml(pool.id)}">
        <img src="${escapeHtml(pool.icon || "./assets/items/5220000.png")}" alt="" loading="lazy" />
        <span>
          <strong>${escapeHtml(pool.shortName || pool.name)}</strong>
          <small>${escapeHtml(pool.period || "")}</small>
        </span>
        <em>${formatInt(count)} 項</em>
      </button>
    `;
  }).join("");
}

function renderGroupFilter() {
  const pool = currentPool();
  if (!els.targetGroupFilter || !pool) return;
  if (isRoyalPool(pool)) {
    state.targetGroup = "";
    els.targetGroupFilter.hidden = true;
    els.targetGroupFilter.innerHTML = `<option value="">${escapeHtml(royalGroupName())}</option>`;
    return;
  }
  els.targetGroupFilter.hidden = false;
  const groups = groupNames(pool);
  els.targetGroupFilter.innerHTML = [
    '<option value="">全部獎池</option>',
    ...groups.map(group => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`),
  ].join("");
  if (state.targetGroup && !groups.includes(state.targetGroup)) state.targetGroup = "";
}

function renderTargets() {
  const targets = visibleTargets();
  if (!targets.some(target => target.id === state.targetId)) {
    state.targetId = targets[0]?.id || currentPool()?.prizes?.[0]?.id || "";
  }
  if (els.targetSelect) {
    els.targetSelect.innerHTML = targets.map(target => `<option value="${escapeHtml(target.id)}">${escapeHtml(target.name)}</option>`).join("");
    els.targetSelect.value = state.targetId;
  }
  if (!els.targetList) return;
  els.targetList.innerHTML = targets.length ? targets.map(target => {
    const active = target.id === state.targetId ? " active" : "";
    const royalClass = isRoyalPrize(target) ? " gachaRoyalPrizeRow" : "";
    return `
      <button class="simPickerRow${active}${royalClass}" type="button" data-target-id="${escapeHtml(target.id)}" role="option" aria-selected="${target.id === state.targetId}">
        ${prizeIconHtml(target, iconClassForPrize(target, "simPickerIcon gachaPrizePickerIcon"))}
        <span class="simPickerText">
          <strong>${escapeHtml(target.name)}${state.showIds ? ` · ${escapeHtml(target.id)}` : ""}</strong>
          <span>${escapeHtml(target.group)} · ${formatPct(Number(target.chance || 0))}</span>
        </span>
        <span class="simPickerBadge">${escapeHtml(target.tier)}</span>
      </button>
    `;
  }).join("") : '<div class="simPickerEmpty">找不到符合條件的獎項</div>';
}

function renderExchangePanel() {
  const pool = currentPool();
  const panel = els.exchangePanel;
  if (!panel) return;
  const show = !!pool?.exchange?.enabled;
  panel.hidden = !show;
  if (!show) return;
  const source = primaryPrizes(pool);
  const tiers = Object.keys(pool.exchange.fragmentByTier || {})
    .filter(tier => source.some(prize => prize.tier === tier))
    .sort();
  if (els.exchangeTierSettings) {
    els.exchangeTierSettings.innerHTML = tiers.map(tier => `
      <div class="gachaTierControl">
        <label>
          <input type="checkbox" data-exchange-tier="${escapeHtml(tier)}" ${exchangeTierEnabled(tier) ? "checked" : ""} />
          <span>${escapeHtml(exchangeTierLabel(tier))}</span>
        </label>
        <input type="number" min="0" max="999" step="1" inputmode="numeric" data-exchange-value="${escapeHtml(tier)}" value="${exchangeTierValue(tier)}" aria-label="${escapeHtml(tier)}賞碎片數" />
      </div>
    `).join("");
  }
}

function statCard(label, value, hint = "") {
  return `
    <div class="gachaStatCard">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </div>
  `;
}

function renderLogEntry(entry) {
  if (!entry || entry.type !== "prize") {
    return `<li class="gachaLogEntry">${escapeHtml(entry?.text || "")}</li>`;
  }
  const icon = prizeIconHtml(entry, iconClassForPrize(entry, "gachaLogIcon"));
  if (entry.big) {
    return `
      <li class="gachaLogEntry gachaLogBigPrize">
        ${icon}<span>[${escapeHtml(entry.time)}]恭喜從${escapeHtml(entry.product)}獲得<span class="gachaLogPrize">${escapeHtml(entry.prize)}</span>。</span>
      </li>
    `;
  }
  return `<li class="gachaLogEntry">${icon}<span>[${escapeHtml(entry.time)}]獲得${escapeHtml(entry.prize)}。</span></li>`;
}

function renderExpectation(pool, target, expectation) {
  const unitPrice = moneyValue(state.unitPrice);
  if (!target || expectation.mode === "none") {
    return '<div class="emptyState">選擇一個目標獎項後會顯示期望抽數。</div>';
  }
  const cards = [];
  cards.push(statCard("目標獎項", target.name, `${target.group} · ${target.tier}`));
  if (expectation.mode === "exchange") {
    cards.push(statCard("璀璨彗星單抽命中率", formatPct(expectation.chance * 100), `官方列示 ${formatPct(expectation.displayedChance)}`));
    cards.push(statCard("每抽期望碎片", formatFloat(expectation.fragmentRate, 3), `${pool.exchange.fragmentName}`));
    cards.push(statCard("兌換一次期望抽數", expectation.sourceDrawsPerBright ? formatFloat(expectation.sourceDrawsPerBright, 1) : "請輸入碎片數", pool.exchange.targetGroup));
    cards.push(statCard("抽中目標期望", expectation.expectedDraws ? `${formatFloat(expectation.expectedDraws, 1)} 抽` : "請輸入碎片數", drawCurrencyLabel(pool)));
  } else {
    const hint = Math.abs(expectation.poolTotal - 100) > 0.15
      ? `官方列示 ${formatPct(expectation.displayedChance)}，本池加總 ${formatPct(expectation.poolTotal)}`
      : `官方列示 ${formatPct(expectation.displayedChance)}`;
    cards.push(statCard("命中率", formatPct(expectation.chance * 100), hint));
    cards.push(statCard("期望抽數", expectation.expectedDraws ? `${formatFloat(expectation.expectedDraws, 1)} 抽` : "無法計算", drawCurrencyLabel(pool)));
    cards.push(statCard("50% 抽中", expectation.p50 ? `${formatInt(expectation.p50)} 抽` : "無法計算"));
    cards.push(statCard("90% 抽中", expectation.p90 ? `${formatInt(expectation.p90)} 抽` : "無法計算"));
    cards.push(statCard("95% 抽中", expectation.p95 ? `${formatInt(expectation.p95)} 抽` : "無法計算"));
  }
  if (unitPrice > 0 && expectation.expectedDraws > 0) {
    cards.push(statCard("期望成本", formatPointCost(Math.round(expectedCost(expectation.expectedDraws))), "以單抽楓葉點數估算"));
  }
  return `<div class="gachaStatsGrid">${cards.join("")}</div>`;
}

function renderSimulation(pool, target, expectation) {
  const sim = state.simulation;
  const totalOutcomes = Object.values(sim.distribution).reduce((sum, count) => sum + count, 0);
  const unitPrice = moneyValue(state.unitPrice);
  const rows = Object.entries(sim.distribution)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
    .slice(0, 80)
    .map(([name, count]) => `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${formatInt(count)}</td>
        <td>${totalOutcomes ? formatPct((count / totalOutcomes) * 100) : "0%"}</td>
      </tr>
    `).join("");
  return `
    <section class="gachaPanel">
      <div class="gachaPanelHeader">
        <h2>模擬結果</h2>
        <span>${escapeHtml(target?.name || "")}</span>
      </div>
      <div class="gachaStatsGrid">
        ${statCard("已抽次數", `${formatInt(sim.draws)} 抽`, drawCurrencyLabel(pool))}
        ${statCard("命中次數", `${formatInt(sim.hits)} 次`, sim.hits ? `平均 ${formatFloat(sim.draws / sim.hits, 1)} 抽 / 次` : "尚未命中")}
        ${pool?.exchange?.enabled ? statCard("璀璨彗星", `${formatInt(sim.exchangeDraws)} 抽`, `${pool.exchange.fragmentName}剩餘 ${formatInt(sim.fragments)}`) : ""}
        ${unitPrice > 0 ? statCard("累計成本", formatPointCost(sim.draws * unitPrice), "依單抽楓葉點數計算") : ""}
      </div>
      <div class="gachaSplitGrid">
        <div class="gachaSubPanel">
          <h3>分布列表</h3>
          <div class="gachaTableWrap">
            <table class="gachaTable">
              <thead><tr><th>獎項</th><th>次數</th><th>比例</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="3">尚未開始模擬</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <div class="gachaSubPanel">
          <h3>抽取紀錄</h3>
          <ol id="gachaLog" class="gachaLog" role="log" aria-live="polite">
            ${sim.log.length ? sim.log.map(renderLogEntry).join("") : '<li class="gachaLogEntry">每一次抽取結果會依序顯示在這裡。</li>'}
          </ol>
        </div>
      </div>
    </section>
  `;
}

function renderPrizePool(pool, target) {
  if (!pool) return "";
  const groups = displayedGroupNames(pool);
  const sections = groups.map(group => {
    const rows = pool.prizes
      .filter(prize => prize.group === group)
      .map(prize => `
        <tr class="${target?.id === prize.id ? "active" : ""}">
          <td>${escapeHtml(prize.tier)}</td>
          <td><span class="gachaPrizeNameCell">${prizeIconHtml(prize, iconClassForPrize(prize, "gachaPrizeIcon"))}<span>${escapeHtml(prize.name)}${state.showIds ? ` <small>${escapeHtml(prize.id)}</small>` : ""}</span></span></td>
          <td>${formatPct(Number(prize.chance || 0))}</td>
        </tr>
      `).join("");
    const total = totalChance(pool.prizes.filter(prize => prize.group === group));
    return `
      <details class="gachaPrizeGroup" open>
        <summary>
          <span>${escapeHtml(group)}</span>
          <small>${formatInt(pool.prizes.filter(prize => prize.group === group).length)} 項 · 加總 ${formatPct(total)}</small>
        </summary>
        <div class="gachaTableWrap">
          <table class="gachaTable">
            <thead><tr><th>等級</th><th>獎項</th><th>機率</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>
    `;
  }).join("");
  return `
    <section class="gachaPanel">
      <div class="gachaPanelHeader">
        <h2>獎池機率</h2>
        <a href="${escapeHtml(pool.sourceUrl)}" target="_blank" rel="noopener">官方公告</a>
      </div>
      ${sections}
    </section>
  `;
}

function renderDetail() {
  const pool = currentPool();
  const target = currentTarget();
  const expectation = expectationFor(pool, target);
  if (!els.gachaDetail) return;
  if (!pool) {
    els.gachaDetail.innerHTML = '<div class="emptyState">尚無轉蛋資料。</div>';
    return;
  }
  const sourceText = pool.sourceUrl ? "官方活動公告靜態整理" : "本地資料";
  const prizeCount = displayedPrizes(pool).length;
  const groupCount = displayedGroupNames(pool).length;
  els.gachaDetail.innerHTML = `
    <div class="monsterHero gachaHero">
      <div class="heroIdentity">
        <img class="monsterPortrait" src="${escapeHtml(pool.icon || "./assets/items/5220000.png")}" alt="" loading="lazy" />
        <div>
          <h2>${escapeHtml(pool.name)}</h2>
          <p>${escapeHtml(pool.period || "活動期間未標示")} · ${escapeHtml(sourceText)}</p>
        </div>
      </div>
      <div class="monsterStats">
        <div><strong>${formatInt(prizeCount)}</strong><span>獎項</span></div>
        <div><strong>${formatInt(groupCount)}</strong><span>獎池</span></div>
      </div>
    </div>
    <section class="gachaPanel">
      <div class="gachaPanelHeader">
        <h2>期望值</h2>
        <span>${expectation.mode === "exchange" ? "含彗星碎片兌換" : "單一獎池計算"}</span>
      </div>
      ${renderExpectation(pool, target, expectation)}
      <p class="gachaFormulaNote">期望抽數以官方公告機率換算；若同一表格機率加總不是 100%，模擬會依公告列示權重正規化。</p>
    </section>
    ${renderSimulation(pool, target, expectation)}
    ${renderPrizePool(pool, target)}
  `;
}

function scrollGachaLogToBottom() {
  const scroll = () => {
    const log = document.getElementById("gachaLog");
    if (log) log.scrollTop = log.scrollHeight;
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(scroll);
  else scroll();
}

function renderHeaderMeta() {
  const count = selectablePools.reduce((sum, pool) => sum + pool.prizes.length, 0);
  const officialRows = new Set(selectablePools.flatMap(pool => pool.prizes.map(prize => `${pool.eventAdId}:${prize.id}`))).size;
  if (els.resultCount) els.resultCount.textContent = `${formatInt(selectablePools.length)} 商品 · ${formatInt(count)} 列獎項`;
  if (els.buildMeta) {
    const generatedAt = gachaDb.metadata?.generatedAt ? gachaDb.metadata.generatedAt.replace("T", " ") : "";
    els.buildMeta.textContent = `官方活動資料 · 更新 ${generatedAt}`;
  }
}

function renderAll() {
  renderHeaderMeta();
  renderPoolCards();
  renderGroupFilter();
  renderTargets();
  renderExchangePanel();
  syncControls();
  renderDetail();
  scrollGachaLogToBottom();
  saveSettings();
}

function selectPool(poolId) {
  if (!selectablePoolById(poolId)) poolId = selectablePools[0]?.id || "";
  if (state.poolId === poolId) return;
  state.poolId = poolId;
  state.targetId = "";
  state.targetGroup = "";
  state.targetSearch = "";
  applyPoolDefaults({ force: true });
  resetSimulation(false);
  renderAll();
}

function updatePriceInput(input, hint, setter) {
  const before = input.value;
  const selection = input.selectionStart ?? before.length;
  const digitsBeforeCursor = before.slice(0, selection).replace(/[^\d]/g, "").length;
  const formatted = formatMoneyInput(before);
  input.value = formatted;
  if (digitsBeforeCursor > 0) {
    let seen = 0;
    let nextCursor = formatted.length;
    for (let i = 0; i < formatted.length; i += 1) {
      if (/\d/.test(formatted[i])) seen += 1;
      if (seen >= digitsBeforeCursor) {
        nextCursor = i + 1;
        break;
      }
    }
    input.setSelectionRange(nextCursor, nextCursor);
  }
  setter(formatted);
  if (hint) hint.textContent = formatPointCost(formatted);
}

function bindEvents() {
  els.poolCards?.addEventListener("click", event => {
    const button = event.target.closest("[data-pool-id]");
    if (button) selectPool(button.dataset.poolId);
  });
  els.poolSelect?.addEventListener("change", () => selectPool(els.poolSelect.value));
  els.royalCouponSelect?.addEventListener("change", () => {
    state.royalCoupon = els.royalCouponSelect.value === "face" ? "face" : "hair";
    state.targetGroup = "";
    state.targetId = "";
    resetSimulation(false);
    renderAll();
  });
  els.royalGenderSelect?.addEventListener("change", () => {
    state.royalGender = els.royalGenderSelect.value === "female" ? "female" : "male";
    state.targetGroup = "";
    state.targetId = "";
    resetSimulation(false);
    renderAll();
  });
  els.targetSearch?.addEventListener("input", () => {
    state.targetSearch = els.targetSearch.value;
    renderTargets();
    renderDetail();
    saveSettings();
  });
  els.targetGroupFilter?.addEventListener("change", () => {
    state.targetGroup = els.targetGroupFilter.value;
    state.targetId = "";
    resetSimulation(false);
    renderAll();
  });
  els.targetSelect?.addEventListener("change", () => {
    state.targetId = els.targetSelect.value;
    resetSimulation(false);
    renderAll();
  });
  els.targetList?.addEventListener("click", event => {
    const button = event.target.closest("[data-target-id]");
    if (!button) return;
    state.targetId = button.dataset.targetId;
    resetSimulation(false);
    renderAll();
  });
  els.exchangeFragmentsRequired?.addEventListener("input", () => {
    state.exchangeRequired = positiveInt(els.exchangeFragmentsRequired.value, 0);
    resetSimulation(false);
    renderDetail();
    saveSettings();
  });
  els.autoOpenExchange?.addEventListener("change", () => {
    state.autoOpenExchange = els.autoOpenExchange.checked;
    resetSimulation(false);
    renderDetail();
    saveSettings();
  });
  els.exchangeTierSettings?.addEventListener("input", event => {
    const valueInput = event.target.closest("[data-exchange-value]");
    if (!valueInput) return;
    state.exchangeValues[valueInput.dataset.exchangeValue] = positiveInt(valueInput.value, 0);
    resetSimulation(false);
    renderDetail();
    saveSettings();
  });
  els.exchangeTierSettings?.addEventListener("change", event => {
    const checkbox = event.target.closest("[data-exchange-tier]");
    if (!checkbox) return;
    state.exchangeTiers[checkbox.dataset.exchangeTier] = checkbox.checked;
    resetSimulation(false);
    renderDetail();
    saveSettings();
  });
  els.unitPrice?.addEventListener("input", () => {
    updatePriceInput(els.unitPrice, els.unitPriceHint, value => {
      state.unitPrice = value;
    });
    renderDetail();
    saveSettings();
  });
  els.autoLimit?.addEventListener("input", () => {
    state.autoLimit = Math.max(1, Math.min(100000, positiveInt(els.autoLimit.value, 50000)));
    saveSettings();
  });
  els.drawDelayMs?.addEventListener("input", () => {
    state.drawDelayMs = Math.max(0, Math.min(5000, positiveInt(els.drawDelayMs.value, 0)));
    saveSettings();
  });
  els.drawOne?.addEventListener("click", () => drawMany(1));
  els.drawTen?.addEventListener("click", () => drawMany(10));
  els.drawUntilTarget?.addEventListener("click", () => drawMany(0, true));
  els.stopDraw?.addEventListener("click", () => {
    state.stopRequested = true;
    if (els.stopDraw) els.stopDraw.disabled = true;
  });
  els.resetSimulation?.addEventListener("click", () => resetSimulation(true));
  els.clearFilters?.addEventListener("click", () => {
    state.targetSearch = "";
    state.targetGroup = "";
    state.targetId = "";
    state.unitPrice = "";
    state.autoLimit = 50000;
    state.drawDelayMs = 0;
    state.exchangeRequired = 0;
    state.exchangeTiers = {};
    state.exchangeValues = {};
    state.autoOpenExchange = true;
    applyPoolDefaults({ force: true });
    resetSimulation(false);
    renderAll();
  });
  els.idToggle?.addEventListener("click", () => {
    state.showIds = !state.showIds;
    renderAll();
  });
  els.settingsToggle?.addEventListener("click", () => {
    const isOpen = !els.settingsPanel.hidden;
    els.settingsPanel.hidden = isOpen;
    els.settingsToggle.setAttribute("aria-expanded", String(!isOpen));
  });
  els.themeToggle?.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
}

function cacheElements() {
  [
    "poolSelect",
    "poolCards",
    "royalPanel",
    "royalCouponSelect",
    "royalGenderSelect",
    "targetSearch",
    "targetGroupFilter",
    "targetSelect",
    "targetList",
    "exchangePanel",
    "exchangeFragmentsRequired",
    "autoOpenExchange",
    "exchangeTierSettings",
    "unitPrice",
    "unitPriceHint",
    "autoLimit",
    "drawDelayMs",
    "drawOne",
    "drawTen",
    "drawUntilTarget",
    "stopDraw",
    "resetSimulation",
    "clearFilters",
    "idToggle",
    "settingsToggle",
    "settingsPanel",
    "themeToggle",
    "resultCount",
    "buildMeta",
    "gachaDetail",
  ].forEach(id => {
    els[id] = document.getElementById(id);
  });
}

function init() {
  cacheElements();
  loadSettings();
  if (!selectablePoolById(state.poolId)) state.poolId = selectablePools[0]?.id || "";
  applyPoolDefaults({ force: false });
  if (els.poolSelect) {
    els.poolSelect.innerHTML = selectablePools.map(pool => `<option value="${escapeHtml(pool.id)}">${escapeHtml(pool.name)}</option>`).join("");
  }
  setTheme(initialTheme());
  bindEvents();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
