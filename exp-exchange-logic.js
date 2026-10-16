(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MapleExpExchange = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";
  function integer(value, label, maximum = 1000000000, minimum = 0) {
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < minimum || Number(value) > maximum) {
      throw new Error(`${label}需為 ${minimum.toLocaleString("zh-TW")}～${maximum.toLocaleString("zh-TW")} 的整數。`);
    }
    return Number(value);
  }
  function safe(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("計算數值過大，請減少數量。");
    return value;
  }
  function table(data) {
    if (!Array.isArray(data.levels) || data.levels.length !== data.levelCap || data.levelCap < 2) throw new Error("升級經驗表不完整。");
    return data.levels.map((row, index) => {
      if (row.level !== index + 1) throw new Error("升級經驗表順序有誤。");
      return integer(row.expToNextLevel, "升級經驗", Number.MAX_SAFE_INTEGER, 1);
    });
  }
  function initialState(level, percent, levels) {
    level = integer(level, "初始等級", levels.length, 1);
    if (!/^(?:\d+)(?:\.\d{1,6})?$/.test(String(percent)) || Number(percent) >= 100) {
      throw new Error("初始經驗需介於 0%（含）與 100%（不含），最多六位小數。");
    }
    if (level === levels.length && Number(percent) !== 0) throw new Error("等級上限的初始經驗請填 0%。");
    const parts = String(percent).split(".");
    const numerator = BigInt(parts[0]) * 1000000n + BigInt((parts[1] || "").padEnd(6, "0"));
    // Integer EXP cannot represent every displayed percentage; always round down.
    const exp = level === levels.length ? 0 : Number(BigInt(levels[level - 1]) * numerator / 100000000n);
    return { level, exp, capped: level === levels.length, discarded: 0 };
  }
  function advance(state, gained, levels) {
    gained = integer(gained, "經驗", Number.MAX_SAFE_INTEGER);
    let level = state.level, exp = safe(state.exp + gained);
    while (level < levels.length && exp >= levels[level - 1]) {
      exp -= levels[level - 1];
      level++;
    }
    const capped = level === levels.length;
    return { level, exp: capped ? 0 : exp, capped, discarded: safe(state.discarded + (capped ? exp : 0)) };
  }
  function remainingToLevel(state, targetLevel, levels) {
    targetLevel = integer(targetLevel, "目標等級", levels.length, 1);
    let required = 0;
    for (let level = state.level; level < targetLevel; level++) {
      required = safe(required + levels[level - 1]);
    }
    return Math.max(0, required - state.exp);
  }
  function exchangePlan(state, targetLevel, levels, exchange) {
    const required = remainingToLevel(state, targetLevel, levels);
    const batch = integer(exchange.batch, "每組需求", 1000000000, 1);
    const rate = integer(exchange.exp, "每組 EXP", 10000000);
    if (!required) return { groups: 0, quantity: 0, batch, blocked: "" };
    if (exchange.minLevel && state.level < exchange.minLevel) {
      return { groups: null, quantity: null, batch, blocked: `需先達到 Lv.${exchange.minLevel}` };
    }
    if (exchange.maxLevel && state.level > exchange.maxLevel) {
      return { groups: null, quantity: null, batch, blocked: `已超過任務上限 Lv.${exchange.maxLevel}` };
    }
    if (!rate) return { groups: null, quantity: null, batch, blocked: "此交換不提供經驗值" };
    const groups = Math.ceil(required / rate);
    if (exchange.maxLevel && exchange.maxLevel < levels.length) {
      const eligible = Math.ceil(remainingToLevel(state, exchange.maxLevel + 1, levels) / rate);
      if (groups > eligible) {
        return { groups: null, quantity: null, batch, blocked: `受 Lv.${exchange.maxLevel} 任務上限限制，無法僅靠此任務達標` };
      }
    }
    return { groups, quantity: safe(groups * batch), batch, blocked: "" };
  }
  function calculate(data, input) {
    const levels = table(data);
    const start = initialState(input.level, input.percent, levels);
    const targetLevel = integer(input.targetLevel ?? Math.min(start.level + 1, levels.length), "目標等級", levels.length, 1);
    const rate = integer(data.charlie.exp, "中士每次 EXP", 10000000);
    const quantities = input.quantities || {};
    let charlieExp = 0, charlieCompletions = 0;
    const rows = data.charlie.materials.map(material => {
      const quantity = integer(quantities[material.id] ?? 0, `${material.name}數量`);
      const batch = integer(material.batch, "每次需求", 1000000000, 1);
      const completions = Math.floor(quantity / batch);
      const exp = safe(completions * rate);
      charlieExp = safe(charlieExp + exp);
      charlieCompletions = safe(charlieCompletions + completions);
      return { id: material.id, quantity, completions, used: completions * batch, remainder: quantity % batch, exp };
    });
    const afterCharlie = advance(start, charlieExp, levels);
    const shoes = data.shoes;
    const shoeQuantity = integer(input.shoes, "玻璃鞋數量");
    const shoeBatch = integer(shoes.batch, "玻璃鞋每次需求", 1000000000, 1);
    const shoeRate = integer(shoes.exp, "玻璃鞋 EXP", 10000000);
    let blocked = "";
    if (shoeQuantity >= shoeBatch) {
      if (afterCharlie.level < shoes.minLevel) blocked = `中士交換後仍未達 Lv.${shoes.minLevel}，玻璃鞋不計入。`;
      else if (shoes.maxLevel && afterCharlie.level > shoes.maxLevel) blocked = `已超過玻璃鞋任務上限 Lv.${shoes.maxLevel}，玻璃鞋不計入。`;
    }
    let completions = blocked ? 0 : Math.floor(shoeQuantity / shoeBatch);
    // If a future client adds a maximum level, only turn-ins started at that
    // level or below are eligible, including the final turn-in that crosses it.
    if (completions && shoes.maxLevel && shoes.maxLevel < levels.length && shoeRate > 0) {
      let untilIneligible = -afterCharlie.exp;
      for (let level = afterCharlie.level; level <= shoes.maxLevel; level++) untilIneligible += levels[level - 1];
      const allowed = Math.ceil(untilIneligible / shoeRate);
      if (completions > allowed) blocked = `部分玻璃鞋因超過任務上限 Lv.${shoes.maxLevel} 未計入。`;
      completions = Math.min(completions, allowed);
    }
    const shoeExp = safe(completions * shoeRate);
    const final = advance(afterCharlie, shoeExp, levels);
    const totalExp = safe(charlieExp + shoeExp);
    const batches = [...new Set(data.charlie.materials.map(material => material.batch))];
    if (batches.length !== 1) throw new Error("交換材料的每組需求不一致，請確認資料。");
    const targetPlans = Object.fromEntries([["start", start], ["final", final]].map(([key, state]) => [key, {
      charlie: exchangePlan(state, targetLevel, levels, { batch: batches[0], exp: rate }),
      shoes: exchangePlan(state, targetLevel, levels, shoes),
    }]));
    return { start, afterCharlie, final, rows, charlieExp, charlieCompletions, totalExp,
      targetPlans,
      target: { level: targetLevel, startRemainingExp: remainingToLevel(start, targetLevel, levels),
        finalRemainingExp: remainingToLevel(final, targetLevel, levels) },
      appliedExp: totalExp - final.discarded, gainedLevels: final.level - start.level,
      finalPercent: final.capped ? null : final.exp / levels[final.level - 1] * 100,
      nextLevelExp: final.capped ? null : levels[final.level - 1],
      shoes: { quantity: shoeQuantity, completions, used: completions * shoeBatch,
        remainder: shoeQuantity - completions * shoeBatch, exp: shoeExp, blocked } };
  }
  return Object.freeze({ integer, initialState, advance, remainingToLevel, exchangePlan, calculate });
});
