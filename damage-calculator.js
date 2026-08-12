const db = window.MS_DAMAGE_CALC_DB || {};
const COOKIE_DAYS = 180;
const STAT_KEYS = ["str", "dex", "int", "luk"];
const STAT_LABELS = { str: "力量", dex: "敏捷", int: "智力", luk: "幸運" };
const EQUIP_STAT_KEYS = { str: "incSTR", dex: "incDEX", int: "incINT", luk: "incLUK" };
const MIN_CHARACTER_LEVEL = 1;
const MAX_CHARACTER_LEVEL = 200;
const DEFAULT_CHARACTER_LEVEL = 120;
const MIN_BASE_STAT = 4;
const LEVEL_ONE_BASE_STAT_POINTS = 25;
const ZERO_ADVANCEMENT_SP = 6;
const ADVANCEMENT_ORDER = ["零轉", "一轉", "二轉", "三轉", "四轉"];
const ADVANCEMENT_TAB_LABELS = { "零轉": "0", "一轉": "Ⅰ", "二轉": "Ⅱ", "三轉": "Ⅲ", "四轉": "Ⅳ" };
const JOB_REQUIREMENTS = {
  warrior: { level: 10, stats: { str: 35 } },
  magician: { level: 8, stats: { int: 20 } },
  bowman: { level: 10, stats: { dex: 25 } },
  thief: { level: 10, stats: { dex: 25 } },
  pirate_str: { level: 10, stats: { dex: 25 } },
  pirate_dex: { level: 10, stats: { dex: 25 } },
};
const BASE_ATTACK_BY_JOB = {
  warrior: { str: 450, dex: 90, int: 4, luk: 4 },
  magician: { str: 4, dex: 4, int: 513, luk: 90 },
  bowman: { str: 90, dex: 450, int: 4, luk: 4 },
  thief: { str: 4, dex: 120, int: 4, luk: 450 },
  pirate_str: { str: 450, dex: 100, int: 4, luk: 4 },
  pirate_dex: { str: 90, dex: 450, int: 4, luk: 4 },
};
const WEAPON_FORMULAS = {
  "單手劍": { max: 4.0, min: 4.0, main: "str", secondary: ["dex"], mastery: ["劍"], source: "單手劍" },
  "雙手劍": { max: 4.6, min: 4.6, main: "str", secondary: ["dex"], mastery: ["劍"], source: "雙手劍" },
  "單手斧": { max: 4.4, min: 3.2, main: "str", secondary: ["dex"], mastery: ["斧"], source: "單手斧" },
  "雙手斧": { max: 4.8, min: 3.4, main: "str", secondary: ["dex"], mastery: ["斧"], source: "雙手斧" },
  "單手棍": { max: 4.4, min: 3.2, main: "str", secondary: ["dex"], mastery: ["棍"], source: "單手棍" },
  "雙手棍": { max: 4.8, min: 3.4, main: "str", secondary: ["dex"], mastery: ["棍"], source: "雙手棍" },
  "槍": { max: 5.0, min: 3.0, main: "str", secondary: ["dex"], mastery: ["槍"], source: "槍" },
  "矛": { max: 5.0, min: 3.0, main: "str", secondary: ["dex"], mastery: ["矛"], source: "矛" },
  "弓": { max: 3.4, min: 3.4, main: "dex", secondary: ["str"], mastery: ["弓"], source: "弓" },
  "弩": { max: 3.6, min: 3.6, main: "dex", secondary: ["str"], mastery: ["弩"], source: "弩" },
  "短刀": { max: 3.6, min: 3.6, main: "luk", secondary: ["str", "dex"], mastery: ["短刀", "刀"], source: "短刀" },
  "拳套": { max: 3.6, min: 3.6, main: "luk", secondary: ["str", "dex"], mastery: ["拳套", "暗器"], source: "拳套" },
  "指虎": { max: 4.8, min: 4.8, main: "str", secondary: ["dex"], mastery: ["指虎"], source: "指虎" },
  "火槍": { max: 3.6, min: 3.6, main: "dex", secondary: ["str"], mastery: ["火槍", "槍法"], source: "火槍" },
  "短杖": { max: 3.6, min: 3.6, main: "int", secondary: ["luk"], mastery: ["魔法"], source: "短杖" },
  "長杖": { max: 3.6, min: 3.6, main: "int", secondary: ["luk"], mastery: ["魔法"], source: "長杖" },
};
const SPECIAL_HIT_COUNTS = [
  [/雙飛斬/, 2],
  [/三飛閃/, 3],
  [/無雙劍舞/, 2],
  [/閃．連殺/, 6],
  [/海盜加農炮/, 4],
];
const state = {
  jobId: "",
  weaponType: "",
  characterLevel: DEFAULT_CHARACTER_LEVEL,
  spiritBlessingLevel: 0,
  showIds: readToggle("ms_show_ids", false),
  skillTab: readCookie("ms_damage_skill_tab") || "零轉",
  skillLevels: {},
  activeSkillBuffs: {},
  activePartySkillBuffs: {},
  partySkillBuffLevels: {},
  selectedNormalBuffs: { pad: "", mad: "" },
  selectedItemBuffs: new Set(),
};

const DAMAGE_COOKIE_NAMES = {
  baseStats: "ms_damage_base_stats",
  equipStats: "ms_damage_equip_stats",
  attackFields: "ms_damage_attack_fields",
  skillLevels: "ms_damage_skill_levels",
  partyBuffs: "ms_damage_party_buffs",
  partyBuffLevels: "ms_damage_party_buff_levels",
  normalBuffs: "ms_damage_normal_buffs",
  itemBuffs: "ms_damage_item_buffs",
};

const el = {
  buildMeta: document.querySelector("#buildMeta"),
  resultCount: document.querySelector("#resultCount"),
  clearFilters: document.querySelector("#clearFilters"),
  idToggle: document.querySelector("#idToggle"),
  settingsToggle: document.querySelector("#settingsToggle"),
  settingsPanel: document.querySelector("#settingsPanel"),
  themeToggle: document.querySelector("#themeToggle"),
  characterLevel: document.querySelector("#characterLevel"),
  jobSelect: document.querySelector("#jobSelect"),
  weaponSelect: document.querySelector("#weaponSelect"),
  baseStats: document.querySelector("#baseStats"),
  baseStatBudget: document.querySelector("#baseStatBudget"),
  equipStats: document.querySelector("#equipStats"),
  weaponAttack: document.querySelector("#weaponAttack"),
  equipAttack: document.querySelector("#equipAttack"),
  weaponMagic: document.querySelector("#weaponMagic"),
  equipMagic: document.querySelector("#equipMagic"),
  spiritBlessingLevel: document.querySelector("#spiritBlessingLevel"),
  spiritBlessingHint: document.querySelector("#spiritBlessingHint"),
  manualAttackBuff: document.querySelector("#manualAttackBuff"),
  manualMagicBuff: document.querySelector("#manualMagicBuff"),
  skillTabs: document.querySelector("#skillTabs"),
  skillReset: document.querySelector("#skillReset"),
  skillBudgetSummary: document.querySelector("#skillBudgetSummary"),
  skillLevelList: document.querySelector("#skillLevelList"),
  specialBuffList: document.querySelector("#specialBuffList"),
  normalBuffHint: document.querySelector("#normalBuffHint"),
  normalBuffPicker: document.querySelector("#normalBuffPicker"),
  normalBuffConfig: document.querySelector("#normalBuffConfig"),
  damageDetail: document.querySelector("#damageDetail"),
};

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
  const expires = new Date(Date.now() + COOKIE_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function readToggle(name, fallback) {
  const value = readCookie(name);
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function readJsonCookie(name, fallback) {
  const value = readCookie(name);
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeJsonCookie(name, value) {
  writeCookie(name, JSON.stringify(value));
}

function compactNumberObject(source, allowedKeys = null, keepZero = false) {
  const allowed = allowedKeys ? new Set(allowedKeys.map(String)) : null;
  const result = {};
  for (const [key, rawValue] of Object.entries(source || {})) {
    if (allowed && !allowed.has(String(key))) continue;
    const value = Math.floor(Number(rawValue));
    if (Number.isFinite(value) && (value > 0 || (keepZero && value === 0))) result[String(key)] = value;
  }
  return result;
}

function readNumberObjectCookie(name, allowedKeys = null, keepZero = false) {
  return compactNumberObject(readJsonCookie(name, {}), allowedKeys, keepZero);
}

function writeNumberObjectCookie(name, source, allowedKeys = null, keepZero = false) {
  writeJsonCookie(name, compactNumberObject(source, allowedKeys, keepZero));
}

function readStringArrayCookie(name) {
  const value = readJsonCookie(name, []);
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function writeStringArrayCookie(name, values) {
  writeJsonCookie(name, [...new Set(values || [])].map(String).filter(Boolean));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}

function formatNumber(value) {
  const number = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 0;
  return number.toLocaleString("en-US");
}

function clampNumber(value, min, max, fallback = min) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function numberInputValue(id, fallback = 0) {
  const input = typeof id === "string" ? document.querySelector(`#${id}`) : id;
  const value = Number(input?.value || 0);
  return Number.isFinite(value) ? value : fallback;
}

function readBooleanMapCookie(name, allowedKeys = null) {
  const allowed = allowedKeys ? new Set(allowedKeys.map(String)) : null;
  const raw = readJsonCookie(name, {});
  const result = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [key, value] of Object.entries(raw)) {
    if ((!allowed || allowed.has(String(key))) && value === true) result[String(key)] = true;
  }
  return result;
}

function writeBooleanMapCookie(name, source, allowedKeys = null) {
  const allowed = allowedKeys ? new Set(allowedKeys.map(String)) : null;
  const result = {};
  for (const [key, value] of Object.entries(source || {})) {
    if ((!allowed || allowed.has(String(key))) && value === true) result[String(key)] = true;
  }
  writeJsonCookie(name, result);
}

function allowedPartyBuffIds() {
  return (db.partySkillBuffs || []).map(buff => String(buff.id));
}

function allowedItemBuffIds() {
  return new Set((db.itemBuffs || []).map(buff => String(buff.id)));
}

function isSpecialPartyBuff(buff) {
  const values = partyBuffValues(buff);
  return Boolean(values.statPercent || values.padPercent || values.madPercent || ["maple_warrior", "hero_echo"].includes(String(buff?.id)));
}

function normalBuffKind() {
  return currentJob()?.kind === "magic" ? "mad" : "pad";
}

function normalBuffLabel(kind = normalBuffKind()) {
  return kind === "mad" ? "魔法攻擊力" : "攻擊力";
}

function selectedNormalBuffId(kind = normalBuffKind()) {
  return String(state.selectedNormalBuffs?.[kind] || "");
}

function setSelectedNormalBuff(kind, buffId) {
  state.selectedNormalBuffs = {
    pad: String(state.selectedNormalBuffs?.pad || ""),
    mad: String(state.selectedNormalBuffs?.mad || ""),
  };
  state.selectedNormalBuffs[kind] = String(buffId || "");
}

function normalBuffCandidates(kind = normalBuffKind()) {
  const rows = [{ id: "", type: "none", name: "無", image: "", effects: {}, source: "不套用" }];
  for (const buff of db.partySkillBuffs || []) {
    const values = partyBuffValues(buff);
    const maxValues = (buff.levels || []).at(-1)?.effects || {};
    if (isSpecialPartyBuff(buff)) continue;
    if (!Number(values?.[kind] || maxValues?.[kind] || 0)) continue;
    rows.push({
      id: `skill:${buff.id}`,
      type: "skill",
      rawId: String(buff.id),
      name: buff.name,
      image: buff.image,
      source: buff.source || "隊伍技能 BUFF",
      effects: { [kind]: Number(values[kind] || 0) },
      maxLevel: Number(buff.maxLevel || 0),
      level: partyBuffLevel(buff),
    });
  }
  for (const buff of db.itemBuffs || []) {
    if (!Number(buff.effects?.[kind] || 0)) continue;
    rows.push({
      id: `item:${buff.id}`,
      type: "item",
      rawId: String(buff.id),
      name: buff.name,
      image: buff.image,
      source: "道具 BUFF",
      effects: { [kind]: Number(buff.effects[kind] || 0) },
    });
  }
  rows.push({
    id: `custom:${kind}`,
    type: "custom",
    name: "自訂",
    image: "",
    source: "手動輸入",
    effects: { [kind]: kind === "mad" ? numberInputValue(el.manualMagicBuff) : numberInputValue(el.manualAttackBuff) },
  });
  return rows;
}

function selectedNormalBuff(kind = normalBuffKind()) {
  const candidates = normalBuffCandidates(kind);
  return candidates.find(buff => buff.id === selectedNormalBuffId(kind)) || candidates[0];
}

function normalBuffEffectText(buff, kind = normalBuffKind()) {
  const value = Number(buff?.effects?.[kind] || 0);
  if (!buff?.id) return `未套用${normalBuffLabel(kind)} BUFF`;
  return `${normalBuffLabel(kind)} +${formatNumber(value)}`;
}

function persistNormalBuffs() {
  writeJsonCookie(DAMAGE_COOKIE_NAMES.normalBuffs, {
    pad: String(state.selectedNormalBuffs?.pad || ""),
    mad: String(state.selectedNormalBuffs?.mad || ""),
  });
}

function damageInputIds() {
  return [
    "weaponAttack",
    "equipAttack",
    "weaponMagic",
    "equipMagic",
    "manualAttackBuff",
    "manualMagicBuff",
  ];
}

function persistBaseStats() {
  const values = {};
  for (const stat of STAT_KEYS) values[stat] = numberInputValue(`base${stat.toUpperCase()}`, baseStatMinimum(stat));
  writeNumberObjectCookie(DAMAGE_COOKIE_NAMES.baseStats, values, STAT_KEYS, true);
}

function persistEquipStats() {
  const values = {};
  for (const stat of STAT_KEYS) values[stat] = numberInputValue(`equip${stat.toUpperCase()}`, 0);
  writeNumberObjectCookie(DAMAGE_COOKIE_NAMES.equipStats, values, STAT_KEYS, true);
}

function persistAttackFields() {
  const values = {};
  for (const id of damageInputIds()) values[id] = numberInputValue(id, 0);
  writeNumberObjectCookie(DAMAGE_COOKIE_NAMES.attackFields, values, damageInputIds(), true);
}

function persistSkillLevels() {
  writeNumberObjectCookie(DAMAGE_COOKIE_NAMES.skillLevels, state.skillLevels);
}

function persistPartyBuffState() {
  const allowed = allowedPartyBuffIds();
  writeBooleanMapCookie(DAMAGE_COOKIE_NAMES.partyBuffs, state.activePartySkillBuffs, allowed);
  writeNumberObjectCookie(DAMAGE_COOKIE_NAMES.partyBuffLevels, state.partySkillBuffLevels, allowed, true);
}

function persistSelectedItemBuffs() {
  const allowed = allowedItemBuffIds();
  writeStringArrayCookie(DAMAGE_COOKIE_NAMES.itemBuffs, [...state.selectedItemBuffs].filter(id => allowed.has(String(id))));
}

function persistDamageInputs() {
  writeCookie("ms_damage_job", state.jobId);
  writeCookie("ms_damage_weapon", state.weaponType);
  writeCookie("ms_damage_level", String(state.characterLevel));
  writeCookie("ms_damage_spirit_blessing_level", String(state.spiritBlessingLevel));
  persistBaseStats();
  persistEquipStats();
  persistAttackFields();
  persistSkillLevels();
  persistPartyBuffState();
  persistNormalBuffs();
}

function clearDamageInputCookies() {
  for (const name of Object.values(DAMAGE_COOKIE_NAMES)) deleteCookie(name);
}

function restoreDamageInputs() {
  const baseStats = readNumberObjectCookie(DAMAGE_COOKIE_NAMES.baseStats, STAT_KEYS, true);
  for (const stat of STAT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(baseStats, stat)) continue;
    const input = document.querySelector(`#base${stat.toUpperCase()}`);
    if (!input) continue;
    input.value = String(baseStats[stat]);
    input.dataset.userEdited = "1";
  }

  const equipStats = readNumberObjectCookie(DAMAGE_COOKIE_NAMES.equipStats, STAT_KEYS, true);
  for (const stat of STAT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(equipStats, stat)) continue;
    const input = document.querySelector(`#equip${stat.toUpperCase()}`);
    if (input) input.value = String(equipStats[stat]);
  }

  const attackFields = readNumberObjectCookie(DAMAGE_COOKIE_NAMES.attackFields, damageInputIds(), true);
  for (const id of damageInputIds()) {
    if (!Object.prototype.hasOwnProperty.call(attackFields, id)) continue;
    const input = document.querySelector(`#${id}`);
    if (input) input.value = String(attackFields[id]);
  }

  state.skillLevels = readNumberObjectCookie(DAMAGE_COOKIE_NAMES.skillLevels);
  state.activePartySkillBuffs = readBooleanMapCookie(DAMAGE_COOKIE_NAMES.partyBuffs, allowedPartyBuffIds());
  state.partySkillBuffLevels = readNumberObjectCookie(DAMAGE_COOKIE_NAMES.partyBuffLevels, allowedPartyBuffIds(), true);
  const rememberedNormalBuffs = readJsonCookie(DAMAGE_COOKIE_NAMES.normalBuffs, {});
  state.selectedNormalBuffs = {
    pad: String(rememberedNormalBuffs?.pad || ""),
    mad: String(rememberedNormalBuffs?.mad || ""),
  };
}

function skillById(skillId) {
  return (db.skills || []).find(skill => Number(skill.id) === Number(skillId));
}

function spiritBlessingSkill() {
  return db.spiritBlessing || null;
}

function spiritBlessingMaxLevel() {
  return Number(spiritBlessingSkill()?.maxLevel || 20);
}

function spiritBlessingLevel() {
  return clampNumber(state.spiritBlessingLevel, 0, spiritBlessingMaxLevel(), 0);
}

function setSpiritBlessingLevel(value, persist = false) {
  state.spiritBlessingLevel = clampNumber(value, 0, spiritBlessingMaxLevel(), 0);
  if (el.spiritBlessingLevel) {
    el.spiritBlessingLevel.max = String(spiritBlessingMaxLevel());
    el.spiritBlessingLevel.value = String(state.spiritBlessingLevel);
  }
  if (persist) writeCookie("ms_damage_spirit_blessing_level", String(state.spiritBlessingLevel));
}

function spiritBlessingValues() {
  const skill = spiritBlessingSkill();
  const level = spiritBlessingLevel();
  const row = (skill?.levels || []).find(item => Number(item.level) === Number(level)) || null;
  const values = row?.values || {};
  return {
    pad: Number(values.x || values.pad || 0),
    mad: Number(values.y || values.mad || 0),
  };
}

function currentJob() {
  return (db.jobs || []).find(job => job.id === state.jobId) || (db.jobs || [])[0];
}

function jobSkills() {
  const job = currentJob();
  const ids = new Set([0, ...(job?.jobIds || []).map(Number)]);
  return (db.skills || []).filter(skill => ids.has(Number(skill.jobId)));
}

function characterLevel() {
  return clampNumber(state.characterLevel, jobMinLevel(), MAX_CHARACTER_LEVEL, DEFAULT_CHARACTER_LEVEL);
}

function setCharacterLevel(value, persist = false) {
  const minLevel = jobMinLevel();
  state.characterLevel = clampNumber(value, minLevel, MAX_CHARACTER_LEVEL, Math.max(DEFAULT_CHARACTER_LEVEL, minLevel));
  if (el.characterLevel) {
    el.characterLevel.min = String(minLevel);
    el.characterLevel.value = String(state.characterLevel);
  }
  if (persist) writeCookie("ms_damage_level", String(state.characterLevel));
}

function currentJobRequirement() {
  return JOB_REQUIREMENTS[currentJob()?.defaultStats || "warrior"] || JOB_REQUIREMENTS.warrior;
}

function jobMinLevel() {
  return currentJobRequirement().level || MIN_CHARACTER_LEVEL;
}

function baseStatMinimum(stat) {
  return Math.max(MIN_BASE_STAT, Number(currentJobRequirement().stats?.[stat] || MIN_BASE_STAT));
}

function firstJobStartLevel() {
  return jobMinLevel();
}

function advancementStartLevel(advancement) {
  if (advancement === "零轉") return MIN_CHARACTER_LEVEL;
  if (advancement === "一轉") return firstJobStartLevel();
  if (advancement === "二轉") return 30;
  if (advancement === "三轉") return 70;
  if (advancement === "四轉") return 120;
  return MIN_CHARACTER_LEVEL;
}

function advancementEndLevel(advancement) {
  if (advancement === "零轉") return firstJobStartLevel();
  if (advancement === "一轉") return 30;
  if (advancement === "二轉") return 70;
  if (advancement === "三轉") return 120;
  return MAX_CHARACTER_LEVEL;
}

function skillBudget(advancement) {
  const level = characterLevel();
  if (advancement === "零轉") return Math.max(0, Math.min(ZERO_ADVANCEMENT_SP, level - 1));
  const start = advancementStartLevel(advancement);
  if (level < start) return 0;
  if (advancement === "四轉") return Math.max(0, (level - start + 1) * 3);
  const cappedLevel = Math.min(level, advancementEndLevel(advancement));
  return 1 + Math.max(0, cappedLevel - start) * 3;
}

function skillAdvancement(skill) {
  if (Number(skill?.jobId) === 0) return "零轉";
  return skill?.advancement || "";
}

function advancementIndex(advancement) {
  return ADVANCEMENT_ORDER.indexOf(advancement);
}

function skillBudgetUsed(advancement, excludingSkillId = null) {
  return jobSkills()
    .filter(skill => skillAdvancement(skill) === advancement && String(skill.id) !== String(excludingSkillId))
    .reduce((sum, skill) => sum + skillLevel(skill.id), 0);
}

function skillUsedThrough(stageIndex, excludingSkillId = null) {
  return jobSkills()
    .filter(skill => {
      const index = advancementIndex(skillAdvancement(skill));
      return index >= 0 && index <= stageIndex && String(skill.id) !== String(excludingSkillId);
    })
    .reduce((sum, skill) => sum + skillLevel(skill.id), 0);
}

function skillTotalUsed(excludingSkillId = null) {
  return jobSkills()
    .filter(skill => String(skill.id) !== String(excludingSkillId))
    .reduce((sum, skill) => sum + skillLevel(skill.id), 0);
}

function skillBudgetThrough(stageIndex) {
  return ADVANCEMENT_ORDER
    .slice(0, Math.max(0, stageIndex) + 1)
    .reduce((sum, advancement) => sum + skillBudget(advancement), 0);
}

function totalSkillBudget() {
  return ADVANCEMENT_ORDER.reduce((sum, advancement) => sum + skillBudget(advancement), 0);
}

function previousAdvancementsComplete(stageIndex) {
  if (stageIndex <= 0) return true;
  return skillUsedThrough(stageIndex - 1) >= skillBudgetThrough(stageIndex - 1);
}

function skillGateReason(skill) {
  const advancement = skillAdvancement(skill);
  const stageIndex = advancementIndex(advancement);
  if (stageIndex < 0) return "";
  if (stageIndex > 0 && characterLevel() < advancementStartLevel(advancement)) return "等級不足";
  if (!previousAdvancementsComplete(stageIndex)) {
    const previous = ADVANCEMENT_ORDER[stageIndex - 1] || "";
    return `需先用盡${previous}點數`;
  }
  return "";
}

function skillAssignableMax(skill) {
  const skillMax = Number(skill?.maxLevel || 0);
  const current = skillLevel(skill?.id);
  if (skillMax <= 0) return 0;
  if (skillGateReason(skill)) return Math.min(skillMax, current);
  const remaining = Math.max(0, totalSkillBudget() - skillTotalUsed());
  return Math.max(0, Math.min(skillMax, current + remaining));
}

function baseStatLimit() {
  return LEVEL_ONE_BASE_STAT_POINTS + Math.max(0, characterLevel() - 1) * 5;
}

function baseStatInput(stat) {
  return document.querySelector(`#base${stat.toUpperCase()}`);
}

function baseStatValue(stat) {
  const minimum = baseStatMinimum(stat);
  return clampNumber(baseStatInput(stat)?.value, minimum, 9999, minimum);
}

function baseStatSum() {
  return STAT_KEYS.reduce((sum, stat) => sum + baseStatValue(stat), 0);
}

function levelRow(skill, level) {
  return (skill.levels || []).find(row => Number(row.level) === Number(level)) || null;
}

function parseLevelText(text) {
  const values = {};
  const source = String(text || "");
  const mastery = source.match(/熟練度\s*[+提升]*\s*(\d+)\s*%/);
  if (mastery) values.M = Number(mastery[1]);
  const attack = source.match(/物理攻擊力\s*(?:上升|增加|[+＋])\s*(\d+)/) || source.match(/(?:^|[^魔法])攻擊力\s*(?:上升|增加|[+＋])\s*(\d+)/);
  if (attack) values.pad = Number(attack[1]);
  const magic = source.match(/(?:魔法攻擊力|魔力)\s*(?:上升|增加|[+＋])\s*(\d+)/);
  if (magic) values.mad = Number(magic[1]);
  const damage = source.match(/(?:殺傷力|傷害|攻擊力|最大攻擊力)\s*(?:提升|增加|[+＋])?\s*(\d+)\s*%/);
  if (damage) values.damage = values.damage || Number(damage[1]);
  return values;
}

function skillValues(skill, level) {
  const row = levelRow(skill, level);
  return { ...(row?.values || {}), ...parseLevelText(row?.description || "") };
}

function skillLevel(skillId) {
  return Math.max(0, Number(state.skillLevels[String(skillId)] || 0));
}

function clampBaseStats(changedStat = null) {
  const limit = baseStatLimit();
  for (const stat of STAT_KEYS) {
    const input = baseStatInput(stat);
    if (!input) continue;
    input.min = String(baseStatMinimum(stat));
    input.value = String(baseStatValue(stat));
  }
  if (changedStat && STAT_KEYS.includes(changedStat)) {
    const changedInput = baseStatInput(changedStat);
    const otherSum = STAT_KEYS
      .filter(stat => stat !== changedStat)
      .reduce((sum, stat) => sum + baseStatValue(stat), 0);
    const maxForChanged = Math.max(baseStatMinimum(changedStat), limit - otherSum);
    changedInput.max = String(maxForChanged);
    changedInput.value = String(Math.min(baseStatValue(changedStat), maxForChanged));
  }
  let sum = baseStatSum();
  if (sum > limit) {
    const orderedStats = [...STAT_KEYS].sort((a, b) => baseStatValue(b) - baseStatValue(a));
    for (const stat of orderedStats) {
      const input = baseStatInput(stat);
      if (!input) continue;
      const value = baseStatValue(stat);
      const removable = Math.max(0, value - baseStatMinimum(stat));
      const reduceBy = Math.min(removable, sum - limit);
      if (reduceBy > 0) {
        input.value = String(value - reduceBy);
        sum -= reduceBy;
      }
      if (sum <= limit) break;
    }
  }
  for (const stat of STAT_KEYS) {
    const input = baseStatInput(stat);
    if (!input) continue;
    const otherSum = STAT_KEYS
      .filter(key => key !== stat)
      .reduce((sumValue, key) => sumValue + baseStatValue(key), 0);
    input.max = String(Math.max(baseStatMinimum(stat), limit - otherSum));
  }
  updateBaseStatBudget();
}

function updateBaseStatBudget() {
  if (!el.baseStatBudget) return;
  const used = baseStatSum();
  const limit = baseStatLimit();
  const remaining = Math.max(0, limit - used);
  el.baseStatBudget.textContent = `基本數值 ${formatNumber(used)} / ${formatNumber(limit)}，剩餘 ${formatNumber(remaining)} 點`;
}

function updateSpiritBlessingHint() {
  if (!el.spiritBlessingHint) return;
  const skill = spiritBlessingSkill();
  if (!skill) {
    el.spiritBlessingHint.textContent = "未收錄精靈的祝福資料";
    return;
  }
  const level = spiritBlessingLevel();
  const values = spiritBlessingValues();
  const idText = state.showIds ? ` · ID ${skill.id}` : "";
  el.spiritBlessingHint.textContent = `每 10 級 +1，最高 ${spiritBlessingMaxLevel()} 級；目前攻擊力 +${formatNumber(values.pad)}、魔法攻擊力 +${formatNumber(values.mad)}${idText}`;
}

function clampSkillLevelsToBudgets(changedSkillId = null) {
  const skills = jobSkills();
  const skillMap = new Map(skills.map(skill => [String(skill.id), skill]));
  for (const key of Object.keys(state.skillLevels)) {
    const skill = skillMap.get(String(key));
    if (!skill) {
      delete state.skillLevels[key];
      continue;
    }
    state.skillLevels[key] = clampNumber(state.skillLevels[key], 0, Number(skill.maxLevel || 0), 0);
  }
  function reducePoints(candidates, amount) {
    const preferred = changedSkillId
      ? candidates.find(skill => String(skill.id) === String(changedSkillId))
      : null;
    const ordered = [
      ...(preferred ? [preferred] : []),
      ...candidates
        .filter(skill => !preferred || String(skill.id) !== String(preferred.id))
        .sort((a, b) => advancementIndex(skillAdvancement(b)) - advancementIndex(skillAdvancement(a)) || Number(b.id) - Number(a.id)),
    ];
    let remaining = amount;
    for (const skill of ordered) {
      const key = String(skill.id);
      const current = skillLevel(key);
      const reduceBy = Math.min(current, remaining);
      if (reduceBy > 0) {
        state.skillLevels[key] = current - reduceBy;
        remaining -= reduceBy;
      }
      if (remaining <= 0) break;
    }
  }

  let overBudget = skillTotalUsed() - totalSkillBudget();
  if (overBudget > 0) reducePoints(skills, overBudget);

  for (let index = 1; index < ADVANCEMENT_ORDER.length; index += 1) {
    if (previousAdvancementsComplete(index)) continue;
    const lockedSkills = skills.filter(skill => advancementIndex(skillAdvancement(skill)) >= index);
    reducePoints(lockedSkills, skillTotalUsed());
  }
}

function renderSkillBudgetSummary() {
  if (!el.skillBudgetSummary) return;
  const availableAdvancements = availableSkillAdvancements();
  el.skillBudgetSummary.innerHTML = availableAdvancements.map(advancement => {
    const used = skillBudgetUsed(advancement);
    const budget = skillBudget(advancement);
    const emptyClass = budget ? "" : " isEmpty";
    return `<span class="damageBudgetPill${emptyClass}">${escapeHtml(advancement)} ${formatNumber(used)} / ${formatNumber(budget)}</span>`;
  }).join("");
}

function availableSkillAdvancements() {
  return ADVANCEMENT_ORDER.filter(advancement => jobSkills().some(skill => skillAdvancement(skill) === advancement));
}

function ensureSkillTab() {
  const available = availableSkillAdvancements();
  if (!available.includes(state.skillTab)) state.skillTab = available[0] || "零轉";
  return state.skillTab;
}

function renderSkillTabs() {
  if (!el.skillTabs) return;
  const activeTab = ensureSkillTab();
  el.skillTabs.innerHTML = availableSkillAdvancements().map(advancement => {
    const activeClass = advancement === activeTab ? " active" : "";
    return `<button class="skillTabButton${activeClass}" type="button" role="tab" aria-selected="${advancement === activeTab}" data-skill-tab="${escapeHtml(advancement)}" title="${escapeHtml(advancement)}">${escapeHtml(ADVANCEMENT_TAB_LABELS[advancement] || advancement)}</button>`;
  }).join("");
}

function selectedSkillValues(skill) {
  return skillValues(skill, skillLevel(skill.id));
}

function partyBuffById(buffId) {
  return (db.partySkillBuffs || []).find(buff => String(buff.id) === String(buffId));
}

function partyBuffLevel(buff) {
  const key = String(buff.id);
  const fallback = Number(buff.maxLevel || 0);
  const stored = Object.prototype.hasOwnProperty.call(state.partySkillBuffLevels, key)
    ? Number(state.partySkillBuffLevels[key])
    : fallback;
  return Math.max(0, Math.min(fallback, Number.isFinite(stored) ? stored : fallback));
}

function partyBuffValues(buff) {
  const level = partyBuffLevel(buff);
  const row = (buff.levels || []).find(item => Number(item.level) === Number(level)) || null;
  return row?.effects || {};
}

function improveBuffTotals(totals, effects, source) {
  for (const key of ["pad", "mad", "padPercent", "madPercent", "statPercent"]) {
    const value = Number(effects?.[key] || 0);
    if (value > Number(totals[key] || 0)) {
      totals[key] = value;
      totals.sources[key] = source;
    }
  }
}

function ownSkillBuffCandidates() {
  const partySkillIds = new Set((db.partySkillBuffs || []).flatMap(buff => buff.skillIds || []).map(Number));
  return jobSkills().filter(skill => {
    if (partySkillIds.has(Number(skill.id))) return false;
    const level = skillLevel(skill.id);
    if (!level) return false;
    const values = selectedSkillValues(skill);
    return values.pad || values.mad || ((skill.name || "").includes("楓葉祝福") && values.x);
  });
}

function isWeaponMatch(skill, weaponType) {
  const formula = WEAPON_FORMULAS[weaponType];
  if (!formula) return false;
  const haystack = `${skill.name || ""} ${skill.description || ""} ${skill.formula || ""}`;
  return formula.mastery.some(token => haystack.includes(token));
}

function getStatTotals() {
  const baseTotals = { str: 0, dex: 0, int: 0, luk: 0 };
  const addedTotals = { str: 0, dex: 0, int: 0, luk: 0 };
  const totals = { str: 0, dex: 0, int: 0, luk: 0 };
  for (const stat of STAT_KEYS) {
    baseTotals[stat] = numberInputValue(`base${stat.toUpperCase()}`);
    addedTotals[stat] = numberInputValue(`equip${stat.toUpperCase()}`);
    totals[stat] = baseTotals[stat] + addedTotals[stat];
  }
  const buff = getBuffTotals();
  const mapleWarrior = buff.statPercent || 0;
  if (mapleWarrior > 0) {
    for (const stat of STAT_KEYS) totals[stat] += Math.floor(baseTotals[stat] * mapleWarrior / 100);
  }
  return { totals, baseTotals, addedTotals, buff };
}

function getBuffTotals() {
  const totals = {
    pad: 0,
    mad: 0,
    padPercent: 0,
    madPercent: 0,
    statPercent: 0,
    sources: {},
  };
  const selectedNormal = selectedNormalBuff(normalBuffKind());
  if (selectedNormal?.id) improveBuffTotals(totals, selectedNormal.effects, selectedNormal.name);
  for (const buff of db.partySkillBuffs || []) {
    if (!isSpecialPartyBuff(buff)) continue;
    if (!state.activePartySkillBuffs[String(buff.id)]) continue;
    improveBuffTotals(totals, partyBuffValues(buff), buff.name);
  }
  return totals;
}

function percentBuffAmount(baseValue, buff, percentKey) {
  const percent = Number(buff?.[percentKey] || 0);
  return Math.floor(Math.max(0, Number(baseValue) || 0) * percent / 100);
}

function getPassiveSkillAttackBonus(weaponType) {
  let pad = 0;
  let mad = 0;
  const sources = [];
  for (const skill of jobSkills()) {
    const level = skillLevel(skill.id);
    if (!level) continue;
    const values = selectedSkillValues(skill);
    if (!isWeaponMatch(skill, weaponType)) continue;
    if (values.pad && /精通|熟練/.test(`${skill.name} ${skill.description}`)) {
      pad += Number(values.pad);
      sources.push(`${skill.name} +${values.pad}`);
    }
    if (values.mad && /精通|熟練/.test(`${skill.name} ${skill.description}`)) {
      mad += Number(values.mad);
      sources.push(`${skill.name} +${values.mad}`);
    }
  }
  return { pad, mad, sources };
}

function getMastery(weaponType) {
  let mastery = 0.1;
  let source = "基礎 10%";
  let additive = 0;
  for (const skill of jobSkills()) {
    const level = skillLevel(skill.id);
    if (!level) continue;
    const values = selectedSkillValues(skill);
    if (!values.M) continue;
    if ((skill.name || "").includes("暗之靈魂")) {
      additive = Math.max(additive, Number(values.M) / 100);
      continue;
    }
    if (!isWeaponMatch(skill, weaponType)) continue;
    const value = Number(values.M) / 100;
    if (value > mastery) {
      mastery = value;
      source = `${skill.name} ${values.M}%`;
    }
  }
  if (additive) {
    mastery = Math.min(0.95, mastery + additive);
    source += ` + 暗之靈魂 ${Math.round(additive * 100)}%`;
  }
  return { mastery, source };
}

function getAttackRange() {
  const job = currentJob();
  const weaponType = state.weaponType || job?.weapons?.[0] || "";
  const formula = WEAPON_FORMULAS[weaponType] || WEAPON_FORMULAS["單手劍"];
  const { totals, baseTotals, addedTotals, buff } = getStatTotals();
  const passive = getPassiveSkillAttackBonus(weaponType);
  const spirit = spiritBlessingValues();
  const attackBase = numberInputValue(el.weaponAttack) + numberInputValue(el.equipAttack) + passive.pad + spirit.pad;
  const magicAttackBase = numberInputValue(el.weaponMagic) + numberInputValue(el.equipMagic) + passive.mad + spirit.mad;
  const echoAttackBase = attackBase;
  const echoMagicBase = baseTotals.int + addedTotals.int + magicAttackBase;
  const attack = attackBase + Number(buff.pad || 0) + percentBuffAmount(echoAttackBase, buff, "padPercent");
  const magicAttack = Math.floor(totals.int + magicAttackBase + Number(buff.mad || 0) + percentBuffAmount(echoMagicBase, buff, "madPercent"));
  const secondary = (formula.secondary || []).reduce((sum, key) => sum + totals[key], 0);
  const { mastery, source } = getMastery(weaponType);
  const max = Math.floor((totals[formula.main] * formula.max + secondary) * attack / 100);
  const min = Math.floor((totals[formula.main] * formula.min * 0.9 * mastery + secondary) * attack / 100);
  return {
    job,
    weaponType,
    formula,
    stats: totals,
    attack,
    magicAttack,
    mastery,
    masterySource: source,
    min: Math.max(0, min),
    max: Math.max(0, max),
    passive,
    spirit,
    buff,
  };
}

function isDamageSkill(skill) {
  if (isCriticalPassiveSkill(skill)) return false;
  if (isSpecialFormulaSkill(skill)) return true;
  if (isHealDamageSkill(skill)) return true;
  return (skill.levels || []).some(row => {
    const values = { ...(row.values || {}), ...parseLevelText(row.description || "") };
    return values.damage || values.mad || values.pad || values.z || values.fixdamage;
  });
}

function isHealDamageSkill(skill) {
  return Number(skill?.id) === 2301002 || (skill?.name || "") === "群體治癒";
}

function isSpecialFormulaSkill(skill) {
  const name = skill?.name || "";
  return /雙飛斬|三飛閃|飛毒殺|忍影瞬殺|影網術|楓幣攻擊|楓幣炸彈|龍咆哮|強弓|火焰噴射|毒霧|致命毒霧|炎靈地獄|寒冰地獄|召喚鳳凰|召喚銀隼|章魚砲台|砲台章魚王|海鷗突襲隊|穿透之箭|光速神弩|閃電連擊|連鎖閃電|元氣彈|閃[．.・]?連殺/.test(name);
}

function isCriticalPassiveSkill(skill) {
  const name = skill?.name || "";
  if (/強力投擲|霸王箭|致命箭|致命暗襲/.test(name)) return true;
  const text = `${name} ${skill?.description || ""} ${skill?.formula || ""}`;
  return /(爆擊|暴擊|臨界|致命一擊|出現比率)/.test(text) && !/消耗\s*(?:HP|MP|HP、MP|MP、HP)/.test(text);
}

function hitCount(skill, values) {
  for (const [pattern, count] of SPECIAL_HIT_COUNTS) {
    if (pattern.test(skill.name || "")) return count;
  }
  if (values.bulletCount) return Number(values.bulletCount);
  if ((skill.name || "").includes("龍魂之箭")) return 1;
  if ((skill.name || "").includes("魔力爪")) return 2;
  if ((skill.name || "").includes("二連箭")) return 2;
  return 1;
}

function physicalSkillDamage(skill, values, range) {
  const percent = Number(values.damage || values.z || 100);
  const hits = hitCount(skill, values);
  return {
    min: Math.floor(range.min * percent / 100),
    max: Math.floor(range.max * percent / 100),
    hits,
    percent,
    note: "",
  };
}

function throwingSkillDamage(skill, values, range) {
  const percent = Number(values.damage || values.z || 100);
  const hits = hitCount(skill, values);
  const luk = range.stats.luk;
  const max = Math.floor((luk * 5.0) * range.attack / 100 * percent / 100);
  const min = Math.floor((luk * 2.5) * range.attack / 100 * percent / 100);
  return {
    min,
    max,
    hits,
    percent,
    note: "投擲特殊公式：每段 floor(幸運 × 2.5~5.0 × 攻擊力 ÷ 100 × 技能% ÷ 100)",
  };
}

function magicSkillDamage(skill, values, range) {
  const basic = Number(values.mad || 0);
  const mastery = Number(values.M || 60) / 100;
  const magic = range.magicAttack;
  const intValue = range.stats.int;
  const max = Math.floor(((magic * magic / 1000 + magic) / 30 + intValue / 200) * basic);
  const min = Math.floor(((magic * magic / 1000 + magic * mastery * 0.9) / 30 + intValue / 200) * basic);
  return { min, max, hits: hitCount(skill, values), percent: basic, note: "魔法基本攻擊力" };
}

function formulaOnlySkillDamage(note) {
  return { min: 0, max: 0, hits: 1, percent: 0, note, formulaOnly: true };
}

function healSkillDamage(skill, values, range) {
  const healPercent = Number(values.hp || 0) / 100;
  const targetCount = 2;
  const targetMultiplier = 1.5 + 5 / targetCount;
  const magic = range.magicAttack;
  const intValue = range.stats.int;
  const luk = range.stats.luk;
  const min = Math.floor((intValue * 0.3 + luk) * magic / 1000 * targetMultiplier * healPercent);
  const max = Math.floor((intValue * 1.2 + luk) * magic / 1000 * targetMultiplier * healPercent);
  return {
    min: Math.max(0, min),
    max: Math.max(0, max),
    hits: 1,
    percent: Math.round(healPercent * 100),
    note: "群體治癒特殊公式：對不死怪，預設2目標乘數4.0；實際乘數 = 1.5 + 5 ÷ 目標數",
  };
}

function venomSkillDamage(skill, values, range) {
  const basicAttack = Number(values.mad || values.damage || 0);
  const { str, dex, luk } = range.stats;
  const min = Math.floor(((8.0 * (str + luk) + dex * 2) / 100) * basicAttack);
  const max = Math.floor(((18.5 * (str + luk) + dex * 2) / 100) * basicAttack);
  return {
    min,
    max,
    hits: 1,
    percent: basicAttack,
    note: "飛毒殺每秒毒傷：基本攻擊取技能等級的攻擊力",
  };
}

function ninjaAmbushSkillDamage(skill, values, range) {
  const percent = Number(values.damage || 100);
  const { str, luk } = range.stats;
  const damage = Math.floor(2 * (str + luk) * percent / 100);
  return {
    min: damage,
    max: damage,
    hits: 1,
    percent,
    note: "忍影瞬殺每秒傷害：floor(2 × (力量 + 幸運) × 技能%)",
  };
}

function dragonRoarSkillDamage(skill, values, range) {
  const percent = Number(values.damage || 100);
  const { str, dex } = range.stats;
  const max = Math.floor(((str * 4.0 + dex) * range.attack / 100) * percent / 100);
  const min = Math.floor(((str * 4.0 * range.mastery * 0.9 + dex) * range.attack / 100) * percent / 100);
  return {
    min,
    max,
    hits: hitCount(skill, values),
    percent,
    note: "龍咆哮特殊公式：力量係數固定4.0，不使用武器係數",
  };
}

function powerKnockbackSkillDamage(skill, values, range) {
  const percent = Number(values.damage || 100);
  const { str, dex } = range.stats;
  const max = Math.floor(((dex * 3.4 + str) * range.attack / 150) * percent / 100);
  const min = Math.floor(((dex * 3.4 * 0.1 * 0.9 + str) * range.attack / 150) * percent / 100);
  return {
    min,
    max,
    hits: hitCount(skill, values),
    percent,
    note: "強弓特殊公式：熟練度固定10%，並以150作為攻擊除數",
  };
}

function summonPhysicalSkillDamage(skill, values, range) {
  const attackRate = Number(values.pad || values.damage || 0);
  if (!attackRate) return null;
  const { str, dex } = range.stats;
  return {
    min: Math.floor((dex * 2.5 * 0.7 + str) * attackRate / 100),
    max: Math.floor((dex * 2.5 + str) * attackRate / 100),
    hits: 1,
    percent: attackRate,
    note: "召喚物特殊公式：使用敏捷、力量與召喚攻擊力，且不套用怪物防禦",
  };
}

function shadowMesoSkillDamage(skill, values) {
  const minCost = Number(values.y || values.moneyCon || 0);
  const maxCost = Number(values.z || values.moneyCon || minCost);
  const prop = Number(values.prop || 0);
  const min = Math.floor(minCost * 10);
  const max = Math.floor(maxCost * 10 * (prop ? 1.5 : 1));
  return {
    min,
    max,
    hits: 1,
    percent: prop,
    note: prop ? `楓幣攻擊特殊公式：傷害約為楓幣×10，${prop}%機率提升50%` : "楓幣攻擊特殊公式：傷害約為楓幣×10",
  };
}

function fixedDamageSkillDamage(skill, values) {
  const damage = Number(values.fixdamage || 0);
  if (!damage) return null;
  return {
    min: damage,
    max: damage,
    hits: hitCount(skill, values),
    percent: damage,
    note: "固定傷害",
  };
}

function targetScalingMultiplier(name, targets) {
  if (/穿透之箭/.test(name)) return 10 * (1 - Math.pow(0.9, targets));
  if (/光速神弩/.test(name)) return 5 * (Math.pow(1.2, targets) - 1);
  if (/閃電連擊|連鎖閃電/.test(name)) return (10 / 3) * (1 - Math.pow(0.7, targets));
  if (/元氣彈/.test(name)) return 3 * (1 - Math.pow(2 / 3, targets));
  return targets;
}

function targetScalingSkillDamage(skill, values, range) {
  const name = skill.name || "";
  const base = range.job.kind === "magic"
    ? magicSkillDamage(skill, values, range)
    : physicalSkillDamage(skill, values, range);
  const targets = Math.max(1, Number(values.mobCount || 1));
  const multiplier = targetScalingMultiplier(name, targets);
  const noteMap = {
    piercing: "穿透之箭：第n目標乘0.9^(n-1)",
    snipe: "光速神弩：第n目標乘1.2^(n-1)",
    chain: "閃電連擊：第n目標乘0.7^(n-1)",
    orb: "元氣彈：第n目標乘(2/3)^(n-1)",
  };
  const note = /穿透之箭/.test(name) ? noteMap.piercing
    : /光速神弩/.test(name) ? noteMap.snipe
    : /閃電連擊|連鎖閃電/.test(name) ? noteMap.chain
    : noteMap.orb;
  return {
    ...base,
    totalMin: Math.floor(base.min * multiplier),
    totalMax: Math.floor(base.max * multiplier),
    hitLabel: `${targets} 目標合計`,
    note,
  };
}

function flashFistSkillDamage(skill, values, range) {
  const base = physicalSkillDamage(skill, values, range);
  return {
    ...base,
    hits: 6,
    totalMin: Math.floor(base.min * 10),
    totalMax: Math.floor(base.max * 10),
    hitLabel: "6段加權合計",
    note: "閃．連殺：後2段加重，總量約等於10段基準傷害",
  };
}

function specialSkillDamage(skill, values, range) {
  const name = skill.name || "";
  const fixed = fixedDamageSkillDamage(skill, values);
  if (fixed) return fixed;
  if (/雙飛斬|三飛閃/.test(name)) return throwingSkillDamage(skill, values, range);
  if (/群體治癒/.test(name) || isHealDamageSkill(skill)) return healSkillDamage(skill, values, range);
  if (/飛毒殺/.test(name)) return venomSkillDamage(skill, values, range);
  if (/忍影瞬殺/.test(name)) return ninjaAmbushSkillDamage(skill, values, range);
  if (/影網術/.test(name)) return formulaOnlySkillDamage("影網術特殊公式：每3秒傷害 = 怪物HP ÷ (50 - 技能等級)");
  if (/楓幣攻擊/.test(name)) return shadowMesoSkillDamage(skill, values);
  if (/楓幣炸彈/.test(name)) return formulaOnlySkillDamage("楓幣炸彈特殊公式：傷害依地上楓幣堆疊金額、堆疊數量與熟練度計算");
  if (/龍咆哮/.test(name)) return dragonRoarSkillDamage(skill, values, range);
  if (/強弓/.test(name)) return powerKnockbackSkillDamage(skill, values, range);
  if (/火焰噴射/.test(name)) return formulaOnlySkillDamage("火焰噴射特殊公式：每秒傷害 = 攻擊力 × (5% + 瞬冰火加成%)");
  if (/毒霧|致命毒霧|炎靈地獄|寒冰地獄/.test(name)) return formulaOnlySkillDamage("持續傷害特殊公式：每秒傷害 = 怪物HP ÷ (70 - 技能等級)");
  if (/召喚鳳凰|召喚銀隼|章魚砲台|砲台章魚王|海鷗突襲隊/.test(name)) return summonPhysicalSkillDamage(skill, values, range);
  if (/穿透之箭|光速神弩|閃電連擊|連鎖閃電|元氣彈/.test(name)) return targetScalingSkillDamage(skill, values, range);
  if (/閃[．.・]?連殺/.test(name)) return flashFistSkillDamage(skill, values, range);
  return null;
}

function skillDamage(skill, range) {
  const level = skillLevel(skill.id);
  if (!level) return null;
  const values = selectedSkillValues(skill);
  const special = specialSkillDamage(skill, values, range);
  if (special) return special;
  if (!values.damage && !values.z && !values.mad && !values.pad && !values.fixdamage) return null;
  const job = currentJob();
  return job.kind === "magic" || values.mad
    ? magicSkillDamage(skill, values, range)
    : physicalSkillDamage(skill, values, range);
}

function prerequisiteWarnings(skill) {
  const warnings = [];
  for (const req of skill.prerequisites || []) {
    const level = skillLevel(req.skillId);
    if (level < Number(req.level || 0)) {
      warnings.push(`${req.skillName} 需要 ${req.level} 級`);
    }
  }
  return warnings;
}

function initFields() {
  for (const stat of STAT_KEYS) {
    const base = document.createElement("label");
    base.className = "damageField";
    base.innerHTML = `<span>${STAT_LABELS[stat]}</span><input id="base${stat.toUpperCase()}" type="number" min="${MIN_BASE_STAT}" step="1" inputmode="numeric" autocomplete="off" />`;
    el.baseStats.append(base);
    const equip = document.createElement("label");
    equip.className = "damageField";
    equip.innerHTML = `<span>${STAT_LABELS[stat]}</span><input id="equip${stat.toUpperCase()}" type="number" step="1" inputmode="numeric" value="0" autocomplete="off" />`;
    el.equipStats.append(equip);
  }
}

function initJobs() {
  el.jobSelect.innerHTML = (db.jobs || []).map(job => `<option value="${escapeHtml(job.id)}">${escapeHtml(job.name)}</option>`).join("");
  state.jobId = (db.jobs || [])[0]?.id || "";
  const remembered = readCookie("ms_damage_job");
  if ((db.jobs || []).some(job => job.id === remembered)) state.jobId = remembered;
  state.weaponType = readCookie("ms_damage_weapon") || state.weaponType;
  el.jobSelect.value = state.jobId;
  setCharacterLevel(readCookie("ms_damage_level") || DEFAULT_CHARACTER_LEVEL, false);
}

function applyJobDefaults() {
  const job = currentJob();
  const defaults = BASE_ATTACK_BY_JOB[job?.defaultStats || "warrior"] || BASE_ATTACK_BY_JOB.warrior;
  for (const stat of STAT_KEYS) {
    const input = document.querySelector(`#base${stat.toUpperCase()}`);
    if (input && !input.dataset.userEdited) input.value = defaults[stat];
  }
  clampBaseStats();
  renderWeaponOptions();
}

function renderWeaponOptions() {
  const job = currentJob();
  const options = job?.weapons || Object.keys(WEAPON_FORMULAS);
  const previous = state.weaponType;
  state.weaponType = options.includes(previous) ? previous : options[0];
  el.weaponSelect.innerHTML = options.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("");
  el.weaponSelect.value = state.weaponType;
  writeCookie("ms_damage_weapon", state.weaponType);
}

function renderSkills() {
  clampSkillLevelsToBudgets();
  renderSkillBudgetSummary();
  renderSkillTabs();
  const activeTab = ensureSkillTab();
  const rows = jobSkills().filter(skill => skillAdvancement(skill) === activeTab);
  el.skillLevelList.innerHTML = rows.map(skill => {
    const level = skillLevel(skill.id);
    const warnings = level ? prerequisiteWarnings(skill) : [];
    const maxAllowed = skillAssignableMax(skill);
    const gateReason = skillGateReason(skill);
    const isLocked = (Boolean(gateReason) || maxAllowed <= 0) && level <= 0;
    const lockText = gateReason ? ` · ${gateReason}` : "";
    const idText = state.showIds ? ` · ID ${skill.id}` : "";
    return `<div class="skillLevelRow${isLocked ? " isLocked" : ""}">
      <img src="${escapeHtml(skill.image || "")}" alt="" loading="lazy" />
      <span>
        <strong>${escapeHtml(skill.name)}</strong>
        <small>${escapeHtml(skill.jobName || "")} · ${escapeHtml(skillAdvancement(skill))} · ${level}/${skill.maxLevel || 0}${lockText}${idText}</small>
      </span>
      <span class="skillLevelControl">
        <input data-skill-level="${escapeHtml(skill.id)}" type="number" min="0" max="${maxAllowed}" step="1" value="${level}" inputmode="numeric" autocomplete="off" ${isLocked ? "disabled" : ""} />
        <button class="skillMaxButton" type="button" data-skill-max="${escapeHtml(skill.id)}" ${maxAllowed <= level ? "disabled" : ""}>MAX</button>
      </span>
      ${warnings.length ? `<em class="damageWarning">${escapeHtml(warnings.join("、"))}</em>` : ""}
    </div>`;
  }).join("") || `<p class="emptyState">此階段沒有技能</p>`;
}

function renderSpecialBuffs() {
  const partyRows = (db.partySkillBuffs || []).filter(isSpecialPartyBuff).map(buff => {
    const isChecked = Boolean(state.activePartySkillBuffs[String(buff.id)]);
    const checked = isChecked ? "checked" : "";
    const level = partyBuffLevel(buff);
    const effects = partyBuffValues(buff);
    const idText = state.showIds ? ` · ID ${buff.skillIds?.join("/") || buff.id}` : "";
    return `<div class="specialBuffRow${isChecked ? " isActive" : ""}" data-special-skill-buff-row="${escapeHtml(buff.id)}">
      <input id="specialBuff${escapeHtml(buff.id)}" data-party-skill-buff="${escapeHtml(buff.id)}" type="checkbox" ${checked} />
      <span class="specialBuffCheck" aria-hidden="true"></span>
      <img src="${escapeHtml(buff.image || "")}" alt="" loading="lazy" />
      <label class="specialBuffInfo" for="specialBuff${escapeHtml(buff.id)}"><strong>${escapeHtml(buff.name)}</strong><small>${escapeHtml(formatBuffEffects(effects))}${idText}</small></label>
      <input class="specialBuffLevel" data-party-skill-buff-level="${escapeHtml(buff.id)}" type="number" min="0" max="${escapeHtml(buff.maxLevel || 0)}" step="1" value="${escapeHtml(level)}" inputmode="numeric" autocomplete="off" aria-label="${escapeHtml(buff.name)} 等級" />
    </div>`;
  });
  el.specialBuffList.innerHTML = partyRows.join("") || `<p class="emptyState">目前沒有可啟用的特殊 BUFF</p>`;
}

function formatBuffEffects(effects) {
  const parts = [];
  if (effects?.pad) parts.push(`攻擊力 +${effects.pad}`);
  if (effects?.mad) parts.push(`魔法攻擊力 +${effects.mad}`);
  if (effects?.padPercent) parts.push(`攻擊力 +${effects.padPercent}%`);
  if (effects?.madPercent) parts.push(`魔法攻擊力 +${effects.madPercent}%`);
  if (effects?.statPercent) parts.push(`全屬性 +${effects.statPercent}%`);
  return parts.join(" · ") || "BUFF";
}

function renderNormalBuffPicker() {
  const kind = normalBuffKind();
  const candidates = normalBuffCandidates(kind);
  if (!candidates.some(buff => buff.id === selectedNormalBuffId(kind))) {
    setSelectedNormalBuff(kind, "");
  }
  const selected = selectedNormalBuff(kind);
  const label = normalBuffLabel(kind);
  el.normalBuffHint.textContent = selected?.id
    ? `目前套用：${selected.name}，${normalBuffEffectText(selected, kind)}`
    : `目前未套用${label} BUFF`;
  el.normalBuffPicker.innerHTML = candidates.map(buff => {
    const active = selected.id === buff.id;
    const title = buff.id ? `${buff.name} · ${normalBuffEffectText(buff, kind)}` : `不套用${label} BUFF`;
    const idText = state.showIds && buff.rawId ? ` · ID ${buff.rawId}` : "";
    const image = buff.image
      ? `<img src="${escapeHtml(buff.image)}" alt="" loading="lazy" />`
      : `<span>${escapeHtml(buff.type === "custom" ? "+" : "無")}</span>`;
    return `<button class="buffIconButton${active ? " isActive" : ""}${buff.type === "custom" ? " isCustom" : ""}" type="button" role="radio" aria-checked="${active}" data-normal-buff="${escapeHtml(buff.id)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(`${buff.name}${idText} ${normalBuffEffectText(buff, kind)}`)}">${image}</button>`;
  }).join("");

  if (selected.type === "skill") {
    const buff = partyBuffById(selected.rawId);
    el.normalBuffConfig.innerHTML = `<label class="damageField">
      <span>${escapeHtml(selected.name)}等級</span>
      <input data-party-skill-buff-level="${escapeHtml(selected.rawId)}" type="number" min="0" max="${escapeHtml(buff?.maxLevel || 0)}" step="1" value="${escapeHtml(partyBuffLevel(buff))}" inputmode="numeric" autocomplete="off" aria-label="${escapeHtml(selected.name)} 等級" />
    </label>`;
    return;
  }
  if (selected.type === "custom") {
    const inputId = kind === "mad" ? "manualMagicBuff" : "manualAttackBuff";
    const value = numberInputValue(el[inputId]);
    el.normalBuffConfig.innerHTML = `<label class="damageField">
      <span>自訂${escapeHtml(label)}</span>
      <input data-custom-buff-kind="${escapeHtml(kind)}" type="number" min="0" step="1" value="${escapeHtml(value)}" inputmode="numeric" autocomplete="off" />
    </label>`;
    return;
  }
  el.normalBuffConfig.innerHTML = "";
}

function renderDetail() {
  const job = currentJob();
  const range = getAttackRange();
  const damageSkills = jobSkills().filter(isDamageSkill);
  const activeDamageRows = damageSkills.map(skill => ({ skill, result: skillDamage(skill, range) })).filter(row => row.result);
  const formula = WEAPON_FORMULAS[state.weaponType] || {};
  const attackCards = job?.kind === "magic"
    ? `<div class="damageResultCard"><strong>${formatNumber(range.magicAttack)}</strong><span>魔法攻擊力</span></div>`
    : `<div class="damageResultCard"><strong>${formatNumber(range.min)}</strong><span>最小攻擊力</span></div><div class="damageResultCard"><strong>${formatNumber(range.max)}</strong><span>最大攻擊力</span></div>`;
  if (el.resultCount) {
    el.resultCount.textContent = `${formatNumber((db.skills || []).length)} 技能 · ${formatNumber((db.partySkillBuffs || []).length + (db.itemBuffs || []).length)} BUFF`;
  }
  el.damageDetail.innerHTML = `<article class="damagePanel">
    <header class="damageHero">
      <img class="damageHeroIcon" src="${escapeHtml(job?.image || "./assets/skills/1121000.png")}" alt="" />
      <div>
        <h2>${escapeHtml(job?.name || "戰鬥力計算機")}</h2>
        <p>Lv.${characterLevel()} · ${escapeHtml(state.weaponType)} · 熟練度 ${Math.round(range.mastery * 100)}% · ${escapeHtml(range.masterySource)}</p>
      </div>
      <div class="damageResultCards">${attackCards}</div>
    </header>
    <div class="damageContent">
      <section class="damagePanel">
        <div class="damagePanelHeader"><h3>表攻公式</h3><small>${escapeHtml(formula.source || state.weaponType)}</small></div>
        <div class="damagePanelBody formulaGrid">
          <div class="formulaCard"><strong>最大攻擊力</strong><p>floor((主屬性 × ${formula.max || "-"} + 副屬性) × 攻擊力 ÷ 100)</p></div>
          <div class="formulaCard"><strong>最小攻擊力</strong><p>floor((主屬性 × ${formula.min || "-"} × 0.9 × 熟練度 + 副屬性) × 攻擊力 ÷ 100)</p></div>
          <div class="formulaCard"><strong>魔法攻擊力</strong><p>floor(智力 + 裝備魔法攻擊力 + BUFF 魔法攻擊力)</p></div>
        </div>
      </section>
      <section class="damagePanel">
        <div class="damagePanelHeader"><h3>技能傷害</h3><small>${formatNumber(activeDamageRows.length)} 個技能已設定點數</small></div>
        <div class="damagePanelBody damageSkillGrid">
          ${activeDamageRows.map(row => renderSkillDamageCard(row.skill, row.result)).join("") || `<p class="emptyState">設定技能點數後會顯示技能傷害</p>`}
        </div>
      </section>
    </div>
  </article>`;
}

function renderSkillDamageCard(skill, result) {
  const idText = state.showIds ? ` · ID ${skill.id}` : "";
  const totalMin = result.totalMin ?? result.min * result.hits;
  const totalMax = result.totalMax ?? result.max * result.hits;
  const hitLabel = result.hitLabel || `${result.hits} 段合計`;
  const numbers = result.formulaOnly
    ? `<span class="damagePill damagePillWide">${escapeHtml(result.note)}</span>`
    : `<span class="damagePill">單段 ${formatNumber(result.min)} ~ ${formatNumber(result.max)}</span>
        <span class="damagePill">${escapeHtml(hitLabel)} ${formatNumber(totalMin)} ~ ${formatNumber(totalMax)}</span>
        <span class="damagePill">${escapeHtml(result.note || `${result.percent}%`)}</span>`;
  return `<div class="damageSkillCard">
    <img src="${escapeHtml(skill.image || "")}" alt="" loading="lazy" />
    <div>
      <strong>${escapeHtml(skill.name)}</strong>
      <p>Lv.${skillLevel(skill.id)}${idText}</p>
      <div class="damageSkillNumbers">
        ${numbers}
      </div>
    </div>
  </div>`;
}

function renderAll() {
  updateBaseStatBudget();
  updateSpiritBlessingHint();
  renderSkills();
  renderSpecialBuffs();
  renderNormalBuffPicker();
  renderDetail();
}

function clearAll() {
  const job = currentJob();
  clearDamageInputCookies();
  setCharacterLevel(DEFAULT_CHARACTER_LEVEL, true);
  state.skillLevels = {};
  state.activeSkillBuffs = {};
  state.activePartySkillBuffs = {};
  state.partySkillBuffLevels = {};
  state.selectedNormalBuffs = { pad: "", mad: "" };
  state.selectedItemBuffs.clear();
  setSpiritBlessingLevel(0, true);
  el.weaponAttack.value = job?.kind === "magic" ? 30 : 80;
  el.weaponMagic.value = job?.kind === "magic" ? 90 : 0;
  el.equipAttack.value = "0";
  el.equipMagic.value = "0";
  el.manualAttackBuff.value = "0";
  el.manualMagicBuff.value = "0";
  for (const stat of STAT_KEYS) {
    const base = document.querySelector(`#base${stat.toUpperCase()}`);
    const equip = document.querySelector(`#equip${stat.toUpperCase()}`);
    if (base) base.dataset.userEdited = "";
    if (equip) equip.value = "0";
  }
  applyJobDefaults();
  clampSkillLevelsToBudgets();
  persistDamageInputs();
  renderAll();
}

function resetSkillPoints() {
  state.skillLevels = {};
  state.activeSkillBuffs = {};
  clampSkillLevelsToBudgets();
  persistSkillLevels();
  renderAll();
}

function setupTheme() {
  function updateThemeButton() {
    const isDark = document.documentElement.dataset.theme === "dark";
    el.themeToggle.textContent = isDark ? "☀" : "☾";
    el.themeToggle.setAttribute("aria-label", isDark ? "切換為白底" : "切換為黑底");
    el.themeToggle.setAttribute("title", isDark ? "切換為白底" : "切換為黑底");
    el.themeToggle.setAttribute("aria-pressed", String(isDark));
  }
  el.themeToggle?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ms-theme", next); } catch (_error) {}
    writeCookie("ms_theme", next);
    updateThemeButton();
  });
  updateThemeButton();
}

function setupEvents() {
  el.settingsToggle?.addEventListener("click", () => {
    const next = el.settingsPanel.hidden;
    el.settingsPanel.hidden = !next;
    el.settingsToggle.setAttribute("aria-expanded", String(next));
  });
  el.clearFilters?.addEventListener("click", clearAll);
  el.skillReset?.addEventListener("click", resetSkillPoints);
  el.idToggle?.addEventListener("click", () => {
    state.showIds = !state.showIds;
    writeCookie("ms_show_ids", String(state.showIds));
    el.idToggle.setAttribute("aria-pressed", String(state.showIds));
    renderAll();
  });
  el.jobSelect.addEventListener("change", () => {
    state.jobId = el.jobSelect.value;
    writeCookie("ms_damage_job", state.jobId);
    state.skillLevels = {};
    state.activeSkillBuffs = {};
    state.skillTab = "零轉";
    writeCookie("ms_damage_skill_tab", state.skillTab);
    setCharacterLevel(state.characterLevel, true);
    applyJobDefaults();
    clampSkillLevelsToBudgets();
    persistBaseStats();
    persistSkillLevels();
    persistAttackFields();
    renderAll();
  });
  el.weaponSelect.addEventListener("change", () => {
    state.weaponType = el.weaponSelect.value;
    writeCookie("ms_damage_weapon", state.weaponType);
    renderAll();
  });
  document.addEventListener("input", event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === "characterLevel") {
      setCharacterLevel(target.value, true);
      clampBaseStats();
      clampSkillLevelsToBudgets();
      persistBaseStats();
      persistSkillLevels();
      renderAll();
      return;
    }
    if (target.id === "spiritBlessingLevel") {
      setSpiritBlessingLevel(target.value, true);
      renderAll();
      return;
    }
    if (target.id.startsWith("base")) {
      target.dataset.userEdited = "1";
      const stat = STAT_KEYS.find(key => target.id === `base${key.toUpperCase()}`);
      clampBaseStats(stat);
      persistBaseStats();
    }
    if (STAT_KEYS.some(key => target.id === `equip${key.toUpperCase()}`)) {
      persistEquipStats();
    }
    if (damageInputIds().includes(target.id)) {
      persistAttackFields();
    }
    const customBuffKind = target.dataset.customBuffKind;
    if (customBuffKind) {
      const hiddenInput = customBuffKind === "mad" ? el.manualMagicBuff : el.manualAttackBuff;
      if (hiddenInput) hiddenInput.value = String(Math.max(0, Math.floor(Number(target.value || 0))));
      persistAttackFields();
      const selected = selectedNormalBuff(customBuffKind);
      el.normalBuffHint.textContent = selected?.id
        ? `目前套用：${selected.name}，${normalBuffEffectText(selected, customBuffKind)}`
        : `目前未套用${normalBuffLabel(customBuffKind)} BUFF`;
      renderDetail();
      return;
    }
    const skillId = target.dataset.skillLevel;
    if (skillId) {
      const skill = skillById(skillId);
      const max = skillAssignableMax(skill);
      const value = Math.max(0, Math.min(max, Number(target.value || 0)));
      state.skillLevels[String(skillId)] = value;
      clampSkillLevelsToBudgets(skillId);
      persistSkillLevels();
    }
    const partyBuffId = target.dataset.partySkillBuffLevel;
    if (partyBuffId) {
      const buff = partyBuffById(partyBuffId);
      const max = Number(buff?.maxLevel || 0);
      state.partySkillBuffLevels[String(partyBuffId)] = Math.max(0, Math.min(max, Number(target.value || 0)));
      persistPartyBuffState();
      const selected = selectedNormalBuff(normalBuffKind());
      if (selected?.type === "skill" && String(selected.rawId) === String(partyBuffId)) {
        el.normalBuffHint.textContent = `目前套用：${selected.name}，${normalBuffEffectText(selected, normalBuffKind())}`;
      }
      renderDetail();
      return;
    }
    renderAll();
  });
  document.addEventListener("change", event => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const skillBuff = target.dataset.skillBuff;
    if (skillBuff) {
      state.activeSkillBuffs[String(skillBuff)] = target.checked;
      renderAll();
    }
    const partySkillBuff = target.dataset.partySkillBuff;
    if (partySkillBuff) {
      state.activePartySkillBuffs[String(partySkillBuff)] = target.checked;
      persistPartyBuffState();
      renderAll();
    }
  });
  document.addEventListener("click", event => {
    const tabButton = event.target.closest("[data-skill-tab]");
    if (tabButton) {
      state.skillTab = tabButton.dataset.skillTab || "零轉";
      writeCookie("ms_damage_skill_tab", state.skillTab);
      renderAll();
      return;
    }
    const maxButton = event.target.closest("[data-skill-max]");
    if (maxButton) {
      const skillId = maxButton.dataset.skillMax;
      const skill = skillById(skillId);
      if (skill) {
        state.skillLevels[String(skillId)] = skillAssignableMax(skill);
        clampSkillLevelsToBudgets(skillId);
        persistSkillLevels();
        renderAll();
      }
      return;
    }
    const normalBuffButton = event.target.closest("[data-normal-buff]");
    if (normalBuffButton) {
      setSelectedNormalBuff(normalBuffKind(), normalBuffButton.dataset.normalBuff || "");
      persistNormalBuffs();
      renderAll();
      return;
    }
    const partyBuffRow = event.target.closest("[data-special-skill-buff-row]");
    if (partyBuffRow && !event.target.closest("input, button, a, label")) {
      const partySkillBuff = partyBuffRow.dataset.specialSkillBuffRow;
      state.activePartySkillBuffs[String(partySkillBuff)] = !state.activePartySkillBuffs[String(partySkillBuff)];
      persistPartyBuffState();
      renderAll();
    }
  });
}

function init() {
  el.buildMeta.textContent = `遊戲版本 ${db.metadata?.gameVersion || "未知"} · 更新 ${db.metadata?.generatedAt || ""}`;
  el.idToggle?.setAttribute("aria-pressed", String(state.showIds));
  initFields();
  initJobs();
  setSpiritBlessingLevel(readCookie("ms_damage_spirit_blessing_level") || 0, false);
  restoreDamageInputs();
  applyJobDefaults();
  clampSkillLevelsToBudgets();
  setupTheme();
  setupEvents();
  renderAll();
}

init();
