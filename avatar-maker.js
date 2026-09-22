(() => {
  "use strict";

  const DB = window.MS_AVATAR_MAKER_DB || { items: [], categories: [] };
  const API = "https://mxdwzapi.dvg.cn";
  const API_QUERY = "region=TMS&version=" + encodeURIComponent("主站") + "&cache=2592000";
  const STORAGE_KEY = "maplememory-avatar-maker-v1";
  const PAGE_SIZE = 180;
  const BASE_SKIN = { id: 12000, bodyId: 2000, name: "奶油皮膚", slot: "Skin", category: "skin", image: "./assets/items/12000.png" };
  const SLOT_LABELS = Object.fromEntries((DB.categories || []).map(row => [row.key, row.label]));
  Object.assign(SLOT_LABELS, { Skin: "皮膚", Hair: "髮型", Face: "臉型" });

  const el = {
    canvas: document.getElementById("avatarCanvas"),
    stage: document.getElementById("avatarStage"),
    status: document.getElementById("avatarStatus"),
    version: document.getElementById("avatarVersion"),
    categories: document.getElementById("avatarCategories"),
    search: document.getElementById("avatarSearch"),
    resultCount: document.getElementById("avatarResultCount"),
    itemGrid: document.getElementById("avatarItemGrid"),
    loadMore: document.getElementById("avatarLoadMore"),
    equippedList: document.getElementById("equippedList"),
    equippedCount: document.getElementById("equippedCount"),
    action: document.getElementById("avatarAction"),
    expression: document.getElementById("avatarExpression"),
    animate: document.getElementById("avatarAnimate"),
    background: document.getElementById("avatarBackground"),
    flip: document.getElementById("flipAvatar"),
    random: document.getElementById("randomAvatar"),
    reset: document.getElementById("resetAvatar"),
    download: document.getElementById("downloadAvatar"),
  };

  const itemById = new Map((DB.items || []).map(item => [Number(item.id), item]));
  for (const skin of DB.skins || []) itemById.set(Number(skin.id), skin);
  const defaultHair = itemById.get(30000) || (DB.items || []).find(item => item.slot === "Hair");
  const defaultFace = itemById.get(20000) || (DB.items || []).find(item => item.slot === "Face");
  const state = {
    category: "Hair",
    query: "",
    visible: PAGE_SIZE,
    selected: { Skin: BASE_SKIN, Hair: defaultHair, Face: defaultFace },
    action: "stand1",
    expression: "default",
    animate: true,
    flip: false,
    background: "grid",
    frame: 0,
    frameTimer: 0,
    renderToken: 0,
    zmap: [],
    smap: {},
    effectOverrides: {},
    setEffects: {},
    elapsed: 0,
    frameDelay: 180,
    frameCount: 1,
    rendering: false,
    lastTimestamp: 0,
  };
  const dataCache = new Map();
  const imageCache = new Map();
  const effectCache = new Map();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  }

  function slotFolder(item) {
    if (item.slot === "Body" || item.slot === "Head") return "";
    const group = Math.floor(Number(item.id) / 10000);
    if ([2, 5, 8].includes(group)) return "Face/";
    if ([3, 4, 6, 7].includes(group)) return "Hair/";
    const folders = { 100: "Cap/", 101: "Accessory/", 102: "Accessory/", 103: "Accessory/", 104: "Coat/", 105: "Longcoat/", 106: "Pants/", 107: "Shoes/", 108: "Glove/", 109: "Shield/", 110: "Cape/" };
    if (folders[group]) return folders[group];
    if (group >= 121 && group <= 170) return "Weapon/";
    return "";
  }

  function itemPath(item) {
    const id = String(item.id).padStart(8, "0");
    return `Character/${slotFolder(item)}${id}.img`;
  }

  function apiUrl(path) {
    return `${API}/${path}${path.includes("?") ? "&" : "?"}${API_QUERY}`;
  }

  async function fetchJson(path) {
    if (dataCache.has(path)) return dataCache.get(path);
    const promise = fetch(apiUrl(`node/json/${path}?force_parse=true&simple=true`))
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .catch(error => {
        dataCache.delete(path);
        throw error;
      });
    dataCache.set(path, promise);
    return promise;
  }

  function loadImage(outlink) {
    if (imageCache.has(outlink)) return imageCache.get(outlink);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = reject;
      const override = Object.values(state.effectOverrides).map(row => row.images?.[outlink]).find(Boolean);
      image.src = override || apiUrl(`node/image/${outlink}?force_parse=true`);
    }).catch(error => {
      imageCache.delete(outlink);
      throw error;
    });
    imageCache.set(outlink, promise);
    return promise;
  }

  function frameNode(data, action, frame) {
    const actionNode = data?.[action];
    if (!actionNode) return null;
    const keys = Object.keys(actionNode).filter(key => /^\d+$/.test(key)).sort((a, b) => Number(a) - Number(b));
    return keys.length ? actionNode[keys[frame % keys.length]] : actionNode;
  }

  function collectPieceLeaves(value, output, seen, source) {
    if (!value || typeof value !== "object") return;
    if (typeof value._outlink === "string" && value.origin && value.map) {
      const key = `${value._outlink}|${value.z || ""}|${value.origin.x || 0}|${value.origin.y || 0}`;
      if (!seen.has(key)) {
        seen.add(key);
        output.push({ ...value, source });
      }
      return;
    }
    for (const child of Object.values(value)) {
      if (child?._outlink) collectPieceLeaves(child, output, seen, source);
    }
  }

  async function itemEffect(item, setEffect = false) {
    if (item.id < 1000000) return [];
    const setId = state.effectOverrides[item.id]?.setId || state.setEffects[item.id];
    if (setEffect && !setId) return [];
    const key = setEffect ? `set:${setId}` : item.id;
    if (!effectCache.has(key)) {
      const override = state.effectOverrides[item.id]?.[setEffect ? 'setData' : 'data'];
      effectCache.set(key, override || fetchJson(setEffect ? `Effect/SetEff.img/${setId}/effect` : `Effect/ItemEff.img/${item.id}/effect`).catch(() => null));
    }
    const data = await effectCache.get(key);
    if (!data) return [];
    const node = data[state.action] || data.default || data;
    const keys = Object.keys(node).filter(key => /^\d+$/.test(key)).sort((a, b) => a - b);
    if (!keys.length) return [];
    const duration = keys.reduce((sum, key) => sum + Math.abs(node[key].delay || 120), 0);
    let time = state.elapsed % duration;
    let index = 0;
    while (index < keys.length - 1 && time >= Math.abs(node[keys[index]].delay || 120)) {
      time -= Math.abs(node[keys[index]].delay || 120);
      index++;
    }
    const piece = node[keys[index]];
    if (!piece._outlink) return [];
    const pos = node.pos;
    const offset = pos === 1 ? { x: 0, y: 0 } : pos === 0 ? { x: 0, y: -50 } : { x: -10, y: -50 };
    return [{ ...piece, source: item, z: Number(node.z || -1) >= 2 ? 'effectFront' : 'effectBack', map: { [pos === 4 ? 'navel' : 'brow']: offset }, effect: true, effectOrder: setEffect ? 1 : 0 }];
  }

  function pieceNodesFor(item, data, frame) {
    const nodes = [];
    item.info = data.info || {};
    if (item.slot === "Weapon" && !data[state.action]) {
      data = data[30]?.[state.action] ? data[30] : Object.keys(data).filter(key => /^\d+$/.test(key)).sort((a, b) => Number(b) - Number(a)).map(key => data[key]).find(node => node[state.action]) || data;
    }
    if (item.slot === "Face") {
      const expression = data[state.expression] ? state.expression : "default";
      const keys = Object.keys(data[expression] || {}).filter(key => /^\d+$/.test(key));
      const duration = keys.reduce((sum, key) => sum + Math.abs(data[expression][key].delay || 100), 0);
      let time = duration ? state.elapsed % duration : 0;
      let faceFrame = 0;
      while (faceFrame < keys.length - 1 && time >= Math.abs(data[expression][keys[faceFrame]].delay || 100)) {
        time -= Math.abs(data[expression][keys[faceFrame]].delay || 100);
        faceFrame += 1;
      }
      nodes.push(frameNode(data, expression, faceFrame));
    } else if (item.slot === "Head") {
      const headNode = frameNode(data, state.action, frame) || data?.front;
      nodes.push(headNode?.head, headNode?.humanEar);
    } else {
      nodes.push(frameNode(data, state.action, frame) || data?.default);
    }
    const output = [];
    const seen = new Set();
    for (const node of nodes) collectPieceLeaves(node, output, seen, item);
    return output;
  }

  function visiblePieces(pieces) {
    const slots = value => String(value || "").match(/.{1,2}/g) || [];
    const items = [...new Map(pieces.map(piece => [piece.source.id, piece.source])).values()].sort((a, b) => a.id - b.id);
    const locks = new Map();
    for (const layer of [...state.zmap].reverse()) for (const item of items) {
      if (slots(item.info.islot).includes(layer)) for (const slot of slots(item.info.vslot)) locks.set(slot, item.id);
    }
    return pieces.filter(piece => {
      if (piece.effect) return true;
      const item = piece.source;
      const own = slots(item.info.vslot);
      let required = slots(state.smap[piece.z]);
      if (piece.z === "mailArm") required = ["Ma"];
      if (piece.z === "backHead") required = ["Hd"];
      if (["pants", "backPants"].includes(piece.z)) required = ["Pn"];
      if (slots(item.info.islot).includes("Cp") || piece.z === "mailChest") required = own;
      if (item.info.islot === "Hd" && ["accessoryOverHair", "hairShade"].includes(piece.z)) required = ["Hd"];
      const allowed = list => list.every(slot => !locks.has(slot) || locks.get(slot) === item.id);
      return allowed(own) || allowed(required);
    });
  }

  function anchorPieces(pieces) {
    const anchors = new Map([["navel", { x: 0, y: 0 }]]);
    const pending = pieces.slice();
    const aligned = [];
    let guard = pending.length * 4 + 4;
    while (pending.length && guard-- > 0) {
      let progress = false;
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const piece = pending[index];
        const maps = piece.map || {};
        const baseName = Object.keys(maps).find(name => anchors.has(name));
        if (!baseName) continue;
        const base = anchors.get(baseName);
        const local = maps[baseName] || { x: 0, y: 0 };
        const joint = { x: base.x - Number(local.x || 0), y: base.y - Number(local.y || 0) };
        piece.x = joint.x - Number(piece.origin?.x || 0);
        piece.y = joint.y - Number(piece.origin?.y || 0);
        for (const [name, point] of Object.entries(maps)) {
          if (!anchors.has(name)) anchors.set(name, { x: joint.x + Number(point.x || 0), y: joint.y + Number(point.y || 0) });
        }
        aligned.push(piece);
        pending.splice(index, 1);
        progress = true;
      }
      if (!progress) break;
    }
    for (const piece of pending) {
      piece.x = -Number(piece.origin?.x || 0);
      piece.y = -Number(piece.origin?.y || 0);
      aligned.push(piece);
    }
    return aligned;
  }

  function zRank(z) {
    if (z === 'effectFront') return -1;
    if (z === 'effectBack') return state.zmap.length;
    const index = state.zmap.indexOf(String(z || ""));
    return index < 0 ? Math.floor(state.zmap.length / 2) : index;
  }

  async function renderAvatar() {
    const token = ++state.renderToken;
    el.status.textContent = "載入角色圖層...";
    const skin = state.selected.Skin || BASE_SKIN;
    const renderItems = [
      { ...skin, id: skin.bodyId || Number(skin.id) - 10000, slot: "Body", name: skin.name },
      { ...skin, slot: "Head" },
      ...Object.values(state.selected).filter(item => item && item.slot !== "Skin"),
    ];
    const uniqueItems = Array.from(new Map(renderItems.map(item => [`${item.slot}:${item.id}`, item])).values());
    const results = await Promise.all(uniqueItems.map(async item => {
      try {
        const data = await fetchJson(itemPath(item));
        if (item.slot === "Body") {
          state.frameCount = Object.keys(data[state.action] || {}).filter(key => /^\d+$/.test(key)).length || 1;
          state.frameDelay = Math.abs(frameNode(data, state.action, state.frame)?.delay || 100);
        }
        const parts = pieceNodesFor(item, data, state.frame);
        if (state.previewStrict && !parts.length) throw new Error(`Missing layers: ${item.slot} ${item.id}`);
        return [...parts, ...await itemEffect(item), ...await itemEffect(item, true)];
      } catch (_error) {
        if (state.previewStrict) throw _error;
        return [];
      }
    }));
    if (token !== state.renderToken) return;
    const pieces = visiblePieces(anchorPieces(results.flat()));
    const loaded = await Promise.all(pieces.map(async piece => {
      try { return { ...piece, image: await loadImage(piece._outlink) }; }
      catch (_error) { if (state.previewStrict) throw new Error(`Missing image: ${piece._outlink}`); return null; }
    }));
    if (token !== state.renderToken) return;
    const visible = loaded.filter(Boolean).sort((a, b) => zRank(b.z) - zRank(a.z) || (a.effectOrder || 0) - (b.effectOrder || 0));
    const ctx = el.canvas.getContext("2d");
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    ctx.imageSmoothingEnabled = false;
    if (!visible.length) {
      el.status.textContent = "角色圖層載入失敗，請稍後再試。";
      return;
    }
    const bounds = visible.reduce((box, piece) => ({
      left: Math.min(box.left, piece.x),
      top: Math.min(box.top, piece.y),
      right: Math.max(box.right, piece.x + piece.image.width),
      bottom: Math.max(box.bottom, piece.y + piece.image.height),
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const scale = Math.max(1, state.previewNative ? 1 : Math.min(5, Math.floor(Math.min((el.canvas.width - 72) / width, (el.canvas.height - 72) / height))));
    const offsetX = (el.canvas.width - width * scale) / 2 - bounds.left * scale;
    const offsetY = (el.canvas.height - height * scale) / 2 - bounds.top * scale;
    ctx.save();
    if (state.flip) {
      ctx.translate(el.canvas.width, 0);
      ctx.scale(-1, 1);
    }
    for (const piece of visible) ctx.drawImage(piece.image, Math.round(offsetX + piece.x * scale), Math.round(offsetY + piece.y * scale), piece.image.width * scale, piece.image.height * scale);
    ctx.restore();
    el.status.textContent = "";
  }

  function selectedItem(item) {
    return Number(state.selected[item.slot]?.id) === Number(item.id);
  }

  function filteredItems() {
    const query = state.query.trim().toLowerCase();
    const source = state.category === "Skin" ? (DB.skins || []) : (DB.items || []).filter(item => item.slot === state.category);
    if (!query) return source;
    return source.filter(item => String(item.id).includes(query) || String(item.name || "").toLowerCase().includes(query));
  }

  function renderCategories() {
    const rows = [{ key: "Skin", label: "皮膚", count: (DB.skins || []).length }, ...(DB.categories || [])];
    el.categories.innerHTML = rows.map(row => `<button class="avatarCategoryButton${state.category === row.key ? " active" : ""}" type="button" role="tab" aria-selected="${state.category === row.key}" data-category="${escapeHtml(row.key)}">${escapeHtml(row.label)} ${Number(row.count || 0).toLocaleString()}</button>`).join("");
  }

  function renderItems() {
    const rows = filteredItems();
    const shown = rows.slice(0, state.visible);
    el.resultCount.textContent = `${rows.length.toLocaleString()} 項`;
    el.itemGrid.innerHTML = shown.length ? shown.map(item => `<button class="avatarItemCard${selectedItem(item) ? " selected" : ""}" type="button" data-item-id="${item.id}" title="${escapeHtml(item.name)} (${item.id})"><img src="${escapeHtml(item.image)}" alt="" loading="lazy" /><strong>${escapeHtml(item.name)}</strong><small>${item.id}</small></button>`).join("") : '<div class="avatarEmpty">沒有符合條件的外觀。</div>';
    el.loadMore.hidden = shown.length >= rows.length;
  }

  function renderEquipped() {
    const rows = Object.values(state.selected).filter(Boolean);
    el.equippedCount.textContent = `${rows.length} 件`;
    el.equippedList.innerHTML = rows.map(item => `<div class="avatarEquippedItem"><img src="${escapeHtml(item.image)}" alt="" /><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(SLOT_LABELS[item.slot] || item.slot)} · ${item.id}</small></span>${["Skin", "Hair", "Face"].includes(item.slot) ? '<span aria-hidden="true"></span>' : `<button class="avatarIconButton" type="button" data-remove-slot="${escapeHtml(item.slot)}" title="卸下${escapeHtml(item.name)}" aria-label="卸下${escapeHtml(item.name)}">×</button>`}</div>`).join("");
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selected: Object.fromEntries(Object.entries(state.selected).map(([slot, item]) => [slot, item?.id]).filter(([, id]) => id)),
        action: state.action,
        expression: state.expression,
        flip: state.flip,
        background: state.background,
      }));
    } catch (_error) {}
  }

  function restoreState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      for (const [slot, id] of Object.entries(saved.selected || {})) {
        const item = itemById.get(Number(id));
        if (item && item.slot === slot) state.selected[slot] = item;
      }
      if (["stand1", "walk1", "alert", "jump"].includes(saved.action)) state.action = saved.action;
      if (["default", "smile", "angry", "cry", "blink"].includes(saved.expression)) state.expression = saved.expression;
      state.flip = Boolean(saved.flip);
      if (["grid", "transparent", "green", "blue"].includes(saved.background)) state.background = saved.background;
    } catch (_error) {}
  }

  function equip(item) {
    if (!item) return;
    if (item.slot === "Overall") {
      delete state.selected.Coat;
      delete state.selected.Pants;
    } else if (item.slot === "Coat" || item.slot === "Pants") {
      delete state.selected.Overall;
    }
    state.selected[item.slot] = item;
    state.frame = 0;
    saveState();
    renderItems();
    renderEquipped();
    renderAvatar();
  }

  function resetAvatar() {
    state.selected = { Skin: BASE_SKIN, Hair: defaultHair, Face: defaultFace };
    state.action = "stand1";
    state.expression = "default";
    state.flip = false;
    state.frame = 0;
    el.action.value = state.action;
    el.expression.value = state.expression;
    saveState();
    renderItems();
    renderEquipped();
    renderAvatar();
  }

  function randomAvatar() {
    const choices = ["Hair", "Face", "Cap", "Overall", "Coat", "Pants", "Shoes", "Glove", "Cape", "Weapon"];
    const next = { Skin: state.selected.Skin || BASE_SKIN };
    for (const slot of choices) {
      if (!["Hair", "Face"].includes(slot) && Math.random() < 0.35) continue;
      if (next.Overall && ["Coat", "Pants"].includes(slot)) continue;
      const rows = (DB.items || []).filter(item => item.slot === slot);
      if (rows.length) next[slot] = rows[Math.floor(Math.random() * rows.length)];
    }
    state.selected = next;
    state.frame = 0;
    saveState();
    renderItems();
    renderEquipped();
    renderAvatar();
  }

  function downloadAvatar() {
    const link = document.createElement("a");
    link.download = `maplememory-avatar-${Date.now()}.png`;
    link.href = el.canvas.toDataURL("image/png");
    link.click();
  }

  function bindEvents() {
    el.categories.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      state.category = button.dataset.category;
      state.visible = PAGE_SIZE;
      renderCategories();
      renderItems();
    });
    el.search.addEventListener("input", () => {
      state.query = el.search.value;
      state.visible = PAGE_SIZE;
      renderItems();
    });
    el.itemGrid.addEventListener("click", event => {
      const button = event.target.closest("[data-item-id]");
      if (button) equip(itemById.get(Number(button.dataset.itemId)));
    });
    el.loadMore.addEventListener("click", () => { state.visible += PAGE_SIZE; renderItems(); });
    el.equippedList.addEventListener("click", event => {
      const button = event.target.closest("[data-remove-slot]");
      if (!button) return;
      delete state.selected[button.dataset.removeSlot];
      saveState();
      renderItems();
      renderEquipped();
      renderAvatar();
    });
    el.action.addEventListener("change", () => { state.action = el.action.value; state.frame = 0; saveState(); renderAvatar(); });
    el.expression.addEventListener("change", () => { state.expression = el.expression.value; saveState(); renderAvatar(); });
    el.animate.addEventListener("change", () => { state.animate = el.animate.value === "on"; state.frame = 0; renderAvatar(); });
    el.background.addEventListener("change", () => { state.background = el.background.value; el.stage.dataset.background = state.background; saveState(); });
    el.flip.addEventListener("click", () => { state.flip = !state.flip; saveState(); renderAvatar(); });
    el.random.addEventListener("click", randomAvatar);
    el.reset.addEventListener("click", resetAvatar);
    el.download.addEventListener("click", downloadAvatar);
  }

  function animationLoop(timestamp) {
    if (state.animate && !state.rendering && timestamp - state.lastTimestamp >= Math.min(state.frameDelay, 50)) {
      const delta = state.lastTimestamp ? Math.min(timestamp - state.lastTimestamp, 250) : 0;
      state.lastTimestamp = timestamp;
      state.elapsed += delta;
      state.frameTimer += delta;
      if (state.frameTimer >= state.frameDelay) {
        state.frameTimer -= state.frameDelay;
        state.frame = (state.frame + 1) % state.frameCount;
      }
      state.rendering = true;
      renderAvatar().finally(() => { state.rendering = false; });
    }
    if (!state.animate) state.lastTimestamp = timestamp;
    requestAnimationFrame(animationLoop);
  }

  async function init() {
    restoreState();
    el.action.value = state.action;
    el.expression.value = state.expression;
    el.background.value = state.background;
    el.stage.dataset.background = state.background;
    el.version.textContent = DB.gameVersion ? `遊戲版本 ${DB.gameVersion}` : "";
    bindEvents();
    renderCategories();
    renderItems();
    renderEquipped();
    try {
      const response = await fetch('./assets/avatar-effects/manifest.json');
      if (response.ok) state.effectOverrides = await response.json();
    } catch (_error) {}
    try {
      state.zmap = await fetch(apiUrl("mapping/zmap")).then(response => response.json());
      state.smap = await fetch(apiUrl("mapping/smap")).then(response => response.json());
      state.setEffects = await fetch(apiUrl("mapping/seteffect")).then(response => response.json());
    } catch (_error) {
      state.zmap = [];
    }
    await renderAvatar();
    requestAnimationFrame(animationLoop);
  }

  const ready = init();
  window.MS_AVATAR_RENDERER = {
    ready,
    async renderPreview({ hairId, faceId }) {
      await ready;
      state.animate = false;
      state.previewStrict = true;
      state.previewNative = true;
      state.action = 'stand1';
      state.expression = 'default';
      state.frame = 0;
      state.elapsed = 0;
      state.flip = false;
      state.selected = {
        Skin: BASE_SKIN,
        Hair: { id: Number(hairId), slot: 'Hair' },
        Face: { id: Number(faceId), slot: 'Face' },
      };
      await renderAvatar();
      return el.canvas.toDataURL('image/png');
    },
  };
})();
