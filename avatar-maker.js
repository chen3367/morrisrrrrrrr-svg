(() => {
  "use strict";

  const DB = window.MS_AVATAR_MAKER_DB || { items: [], categories: [] };
  const API = "https://mxdwzapi.dvg.cn";
  const API_QUERY = "region=TMS&version=" + encodeURIComponent("主站") + "&cache=2592000";
  const LOCAL_APPEARANCES = new Set([34060]);
  const STORAGE_KEY = "maplememory-avatar-maker-v1";
  const PAGE_SIZE = 180;
  const ACTION_LABELS = {
    stand1: '站立（單手）', stand2: '站立（雙手）', walk1: '走路（單手）', walk2: '走路（雙手）',
    alert: '警戒', jump: '跳躍', sit: '坐下', prone: '趴下', proneStab: '趴下攻擊', ladder: '爬梯子', rope: '爬繩子',
    swingO1: '單手揮擊 1', swingO2: '單手揮擊 2', swingO3: '單手揮擊 3', swingOF: '單手揮擊（終結）',
    swingT1: '雙手揮擊 1', swingT2: '雙手揮擊 2', swingT3: '雙手揮擊 3', swingTF: '雙手揮擊（終結）',
    swingP1: '槍矛揮擊 1', swingP2: '槍矛揮擊 2', swingPF: '槍矛揮擊（終結）',
    stabO1: '單手刺擊／拳套投擲 1', stabO2: '單手刺擊／拳套投擲 2', stabOF: '單手刺擊（終結）',
    stabT1: '雙手刺擊 1', stabT2: '雙手刺擊 2', stabTF: '雙手刺擊（終結）',
    shoot1: '弓射擊', shoot2: '弩射擊', shootF: '射擊（終結）', shootB1: '弓射擊 2', shootB2: '弩射擊 2',
    swingD1: '短刀攻擊 1', swingD2: '短刀攻擊 2', stabD1: '短刀刺擊',
    swingC1: '組合揮擊 1', swingC2: '組合揮擊 2',
    swingK1: '指虎攻擊 1', swingK2: '指虎攻擊 2',
    punch: '揮拳', punch2: '揮拳 2', kick: '踢擊', handgun: '火槍射擊', heal: '施法', fly: '飛行',
  };
  const EXPRESSION_LABELS = { default: '一般', blink: '眨眼', hit: '受傷', smile: '微笑', troubled: '困擾', cry: '哭泣', angry: '生氣', bewildered: '困惑', stunned: '暈眩', vomit: '嘔吐', oops: '驚訝', cheers: '歡呼', chu: '親吻', wink: '眨單眼', pain: '疼痛', glitter: '閃亮', despair: '絕望', love: '愛心', shine: '發光', blaze: '怒火', bowing: '鞠躬', dam: '冒汗', hot: '炎熱', hum: '哼唱', qBlue: '藍色表情' };
  const PET_LABELS = { stand0: '站立', stand1: '站立 2', move: '走路', jump: '跳躍', fly: '飛行', hang: '懸掛', sit: '坐下', rest0: '休息', sleep: '睡覺', eat: '吃東西', food: '食物', hungry: '飢餓', angry: '生氣', cry: '哭泣', love: '愛心', chat: '說話', what: '疑惑', roll: '翻滾', dung: '便便', slang: '抱怨' };
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
    petPanel: document.getElementById("avatarPetPreview"),
    petAction: document.getElementById("avatarPetAction"),
    petCanvas: document.getElementById("avatarPetCanvas"),
    petStatus: document.getElementById("avatarPetStatus"),
    chairSelection: document.getElementById("avatarChairSelection"),
    chairName: document.getElementById("avatarChairName"),
    removeChair: document.getElementById("removeAvatarChair"),
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
    petAction: 'stand0',
    petId: null,
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
  const chairCache = new Map();
  const chairFailures = new Set();

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
    if (item.slot === 'Pet') return `Item/Pet/${item.id}.img`;
    if (item.slot === 'Effect') return `Item/Cash/0501.img/${String(item.id).padStart(8, '0')}`;
    if (['NameRing', 'ChatRing'].includes(item.slot)) return `Character/Ring/${String(item.id).padStart(8, '0')}.img`;
    const id = String(item.id).padStart(8, "0");
    return `Character/${slotFolder(item)}${id}.img`;
  }

  function apiUrl(path) {
    return `${API}/${path}${path.includes("?") ? "&" : "?"}${API_QUERY}`;
  }

  async function fetchJson(path) {
    if (dataCache.has(path)) return dataCache.get(path);
    const appearance = path.match(/^Character\/Hair\/(\d+)\.img$/);
    const local = appearance && LOCAL_APPEARANCES.has(Number(appearance[1]));
    const url = local ? `./assets/avatar-local/${appearance[1]}.json` : apiUrl(`node/json/${path}?force_parse=true&simple=true`);
    const promise = fetch(url)
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
      image.src = override || (/^\.\/assets\/avatar-(local|chairs)\//.test(outlink) ? outlink : apiUrl(`node/image/${outlink}?force_parse=true`));
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
    return keys.length ? actionNode[String(frame % (Number(keys.at(-1)) + 1))] || null : actionNode;
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
    const action = state.poseAction || state.action;
    frame = state.poseFrame ?? frame;
    if (item.slot === "Weapon" && !data[action]) {
      data = data[30]?.[action] ? data[30] : Object.keys(data).filter(key => /^\d+$/.test(key)).sort((a, b) => Number(b) - Number(a)).map(key => data[key]).find(node => node[action]) || data;
    }
    if (item.slot === "Face") {
      if (state.hideFace) return [];
      const requested = state.poseExpression || state.expression;
      const expression = data[requested] ? requested : "default";
      const keys = Object.keys(data[expression] || {}).filter(key => /^\d+$/.test(key));
      const duration = keys.reduce((sum, key) => sum + Math.abs(data[expression][key].delay || 100), 0);
      let time = duration ? state.elapsed % duration : 0;
      let faceFrame = 0;
      while (faceFrame < keys.length - 1 && time >= Math.abs(data[expression][keys[faceFrame]].delay || 100)) {
        time -= Math.abs(data[expression][keys[faceFrame]].delay || 100);
        faceFrame += 1;
      }
      nodes.push(frameNode(data, expression, state.poseExpressionFrame ?? faceFrame));
    } else if (item.slot === "Head") {
      const headNode = frameNode(data, action, frame) || (state.hideFace ? data?.back : data?.front);
      nodes.push(headNode?.head, headNode?.humanEar);
    } else {
      nodes.push(frameNode(data, action, frame) || data?.default);
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
    // MXDC's character action setup supplies this anchor outside the WZ piece maps.
    if (['alert', 'heal'].includes(state.poseAction)) {
      const handMoves = [{ x: -8, y: -2 }, { x: -10, y: 0 }, { x: -12, y: 3 }];
      anchors.set('handMove', handMoves[state.poseFrame] || handMoves[0]);
    }
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

  function chairTracks(data) {
    return Object.entries(data).filter(([key]) => /^effect\d*$/.test(key)).map(([, node]) => node);
  }

  function mountPieces(frame) {
    return Object.values(frame || {}).filter(piece => piece?._outlink);
  }

  async function loadChair(item) {
    const entry = DB.chairs?.[item.id];
    if (!entry) throw new Error('此椅子尚無可用的預覽動畫。');
    if (entry.unavailable) throw new Error(entry.unavailable);
    if (!chairCache.has(item.id)) {
      chairCache.set(item.id, fetch(`${entry.url}?v=${entry.revision}`).then(async response => {
        if (!response.ok) throw new Error('椅子動畫載入失敗，請重新選取。');
        const data = await response.json();
        const frames = chairTracks(data).flatMap(node => Object.values(node).filter(frame => frame?._outlink));
        frames.push(...Object.values(data.mount?.sit || {}).flatMap(mountPieces));
        if (!frames.length) throw new Error('此椅子尚無可用的預覽動畫。');
        await Promise.all(frames.map(frame => loadImage(frame._outlink)));
        return data;
      }).catch(error => { chairFailures.add(item.id); throw error; }));
    }
    return chairCache.get(item.id);
  }

  function chairPiece(frame, track, info, item, mountAnchor = null) {
    let x = -Number(frame.origin?.x || 0), y = -Number(frame.origin?.y || 0);
    const move = info.bodyRelMove;
    // Chair effects use the ground origin, not the character's navel anchor.
    if (move && !info.sitAction && Number(track.pos || 0) < 2) {
      x += move.x; y += move.y - (track.pos === 1 ? 50 : 0);
    } else if (!move && track.pos === 1 && !info.tamingMob) y -= 50;
    if (mountAnchor && track.pos === 1) { x += mountAnchor.x; y += mountAnchor.y; }
    const depth = Number(track.z || -1);
    return { ...frame, x, y, source: item, chair: true,
      sceneLayer: info.effectBehindAll || depth < 0 ? -100 + depth : 100 + depth };
  }

  async function renderAvatar() {
    const token = ++state.renderToken;
    const failures = [];
    const skin = state.selected.Skin || BASE_SKIN;
    const body = { ...skin, id: skin.bodyId || Number(skin.id) - 10000, slot: 'Body' };
    const chairItem = state.selected.Chair;
    let chair = null, chairError = '', bodyOrigin = {x:0,y:0};
    if (chairItem) {
      try { chair = await loadChair(chairItem); }
      catch (error) { chairError = error.message || '椅子動畫載入失敗，請重新選取。'; }
    }
    if (token !== state.renderToken) return;
    const chairInfo = chair?.info || {};
    const mountFrame = timedFrame(chair?.mount?.sit, state.elapsed, 100);
    const mountNavel = mountPieces(mountFrame).find(piece => piece.map?.navel)?.map.navel || {x:0,y:0};
    const mountAnchor = chair?.mount?.sit?.[0]?.[0]?.width === 4 ? mountNavel : null;
    const forcedAction = mountFrame?.forceCharacterAction || chairInfo.sitAction || 'sit';
    const action = chair ? (forcedAction === 'stand' ? 'stand1' : forcedAction) : state.action;
    const emotions = ['default','blink','hit','smile','troubled','cry','angry','bewildered','stunned','vomit','oops','cheers','chu','wink','pain','glitter','despair','love','shine','blaze'];
    state.poseExpression = mountFrame?.forceCharacterFace || (chairInfo.sitEmotion != null ? (emotions[chairInfo.sitEmotion] || chairInfo.sitEmotion) : null);
    state.poseExpressionFrame = mountFrame?.forceCharacterFaceFrameIndex;
    el.chairSelection.hidden = !chairItem;
    el.chairName.textContent = chairItem?.name || '';
    el.action.disabled = Boolean(chair);
    el.expression.disabled = Boolean(state.poseExpression);
    el.expression.value = state.poseExpression || state.expression;
    if (chair && [...el.action.options].some(option => option.value === action)) el.action.value = action;
    else el.action.value = state.action;
    try {
      const data = await fetchJson(itemPath(body));
      if (token !== state.renderToken) return;
      state.poseAction = action;
      state.poseFrame = mountFrame ? Number(mountFrame.forceCharacterActionFrameIndex || 0) : state.frame;
      let pose = frameNode(data, state.poseAction, state.poseFrame);
      // Composite attacks sequence existing poses, not independent image layers.
      for (let depth = 0; pose?.action && depth < 16; depth++) {
        state.poseAction = pose.action;
        state.poseFrame = Number(pose.frame || 0);
        pose = frameNode(data, state.poseAction, state.poseFrame);
      }
      state.hideFace = pose?.face === 0;
      bodyOrigin = pose?.body?.map?.navel || bodyOrigin;
      state.frameCount = Object.keys(data[action] || {}).filter(key => /^\d+$/.test(key)).length || 1;
      state.frameDelay = Math.abs(frameNode(data, action, state.frame)?.delay || 100);
    } catch (error) { if (state.previewStrict) throw error; }
    const renderItems = [
      { ...skin, id: skin.bodyId || Number(skin.id) - 10000, slot: "Body", name: skin.name },
      { ...skin, slot: "Head" },
      ...Object.values(state.selected).filter(item => item && !['Skin', 'Pet', 'Chair'].includes(item.slot)),
    ].filter(item => !(chairInfo.invisibleWeapon && ['Weapon', 'Shield'].includes(item.slot))
      && !(chairInfo.invisibleCape && item.slot === 'Cape')
      && !(chairInfo.removeEffect && item.slot === 'Effect'));
    const uniqueItems = Array.from(new Map(renderItems.map(item => [`${item.slot}:${item.id}`, item])).values());
    const results = await Promise.all(uniqueItems.map(async item => {
      try {
        const data = await fetchJson(itemPath(item));
        item.info = data.info || {};
        if (item.slot === 'Effect') {
          const node = data.effect?.[state.action] || data.effect?.default || data.effect;
          const piece = timedFrame(node, state.elapsed);
          if (!piece?._outlink) throw new Error('Missing effect frames');
          return [{ ...piece, source: item, effect: true, z: Number(node.z ?? -1) >= 2 ? 'effectFront' : 'effectBack', map: { [node.pos === 4 ? 'navel' : 'brow']: node.pos === 1 ? {x:0,y:0} : {x:-10,y:-50} } }];
        }
        if (['NameRing', 'ChatRing'].includes(item.slot)) {
          const sample = data.info?.sample;
          if (!sample?._outlink) throw new Error('Missing ring preview');
          const image = await loadImage(sample._outlink);
          return [{ ...sample, origin: {x: image.width / 2, y: item.slot === 'NameRing' ? -38 : image.height + 72}, source:item, effect:true, z:'effectFront', map:{navel:{x:0,y:0}} }];
        }
        const parts = pieceNodesFor(item, data, state.frame);
        // Some equipment intentionally omits individual frames (e.g. a hidden claw).
        const actionData = data[state.poseAction] || Object.values(data).find(node => node?.[state.poseAction])?.[state.poseAction];
        const hiddenFrame = !['Body','Head','Face'].includes(item.slot) && actionData && !Object.hasOwn(actionData, String(state.poseFrame));
        if (!parts.length && !(item.slot === 'Face' && state.hideFace) && !hiddenFrame) throw new Error(`Missing layers: ${item.slot} ${item.id}`);
        return chairInfo.removeEffect ? parts : [...parts, ...await itemEffect(item), ...await itemEffect(item, true)];
      } catch (_error) {
        if (state.previewStrict) throw _error;
        failures.push(item.name || String(item.id));
        return [];
      }
    }));
    if (token !== state.renderToken) return;
    const pieces = visiblePieces(anchorPieces(results.flat()));
    const loaded = await Promise.all(pieces.map(async piece => {
      try { return { ...piece, image: await loadImage(piece._outlink) }; }
      catch (_error) { if (state.previewStrict) throw new Error(`Missing image: ${piece._outlink}`); failures.push(piece.source.name || String(piece.source.id)); return null; }
    }));
    if (token !== state.renderToken) return;
    const visible = loaded.filter(piece => piece && !(chairInfo.removeBody && ['Body','Head'].includes(piece.source.slot)));
    const chairBounds = [];
    if (chair) {
      const move = mountFrame ? mountNavel : (chairInfo.bodyRelMove || chairInfo.floatingBodyRelMove || {x:0,y:0});
      const shift = mountFrame ? {x:0,y:0} : bodyOrigin;
      const flip = Boolean(mountFrame?.forceCharacterFlip);
      for (const piece of visible) {
        piece.x += Number(shift.x) + Number(move.x);
        piece.y += Number(shift.y) + Number(move.y);
        if (flip) { piece.x = -piece.x - piece.image.width + 2 * Number(move.x); piece.flip = true; }
      }
      const mountPiece = piece => ({...piece, x:-Number(piece.origin?.x || 0), y:-Number(piece.origin?.y || 0),
        source:chairItem, sceneLayer: piece.z === 'tamingMobFront' || Number(piece.z) > 0 ? 50 : -50});
      for (const frame of Object.values(chair.mount?.sit || {})) {
        for (const piece of mountPieces(frame)) chairBounds.push({...mountPiece(piece), image:{width:piece.width,height:piece.height}});
      }
      for (const piece of mountPieces(mountFrame)) visible.push({...mountPiece(piece),image:await loadImage(piece._outlink)});
      for (const track of chairTracks(chair)) {
        for (const frame of Object.values(track).filter(frame => frame?._outlink)) {
          const piece = chairPiece(frame, track, chairInfo, chairItem, mountAnchor);
          chairBounds.push({...piece, image: {width: frame.width, height: frame.height}});
        }
        const frame = timedFrame(track, state.elapsed, Number(track.delay || 100));
        if (frame?._outlink) visible.push({...chairPiece(frame, track, chairInfo, chairItem, mountAnchor), image: await loadImage(frame._outlink)});
      }
    }
    if (token !== state.renderToken) return;
    visible.sort((a, b) => (a.sceneLayer || 0) - (b.sceneLayer || 0) || zRank(b.z) - zRank(a.z) || (a.effectOrder || 0) - (b.effectOrder || 0));
    const ctx = el.canvas.getContext("2d");
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    ctx.imageSmoothingEnabled = false;
    if (!visible.length) {
      el.status.textContent = "角色圖層載入失敗，請稍後再試。";
      return;
    }
    const bounds = [...visible, ...chairBounds].reduce((box, piece) => ({
      left: Math.min(box.left, piece.x),
      top: Math.min(box.top, piece.y),
      right: Math.max(box.right, piece.x + piece.image.width),
      bottom: Math.max(box.bottom, piece.y + piece.image.height),
    }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const fit = Math.min((el.canvas.width - 72) / width, (el.canvas.height - 72) / height);
    const scale = state.previewNative ? 1 : (fit < 1 ? fit : Math.min(5, Math.floor(fit)));
    const offsetX = (el.canvas.width - width * scale) / 2 - bounds.left * scale;
    const offsetY = (el.canvas.height - height * scale) / 2 - bounds.top * scale;
    ctx.save();
    if (state.flip) {
      ctx.translate(el.canvas.width, 0);
      ctx.scale(-1, 1);
    }
    for (const piece of visible) {
      ctx.save();
      const x = Math.round(offsetX + piece.x * scale), y = Math.round(offsetY + piece.y * scale);
      if (piece.flip) { ctx.translate(x + piece.image.width * scale, y); ctx.scale(-1, 1); }
      ctx.drawImage(piece.image, piece.flip ? 0 : x, piece.flip ? 0 : y, piece.image.width * scale, piece.image.height * scale);
      ctx.restore();
    }
    ctx.restore();
    el.download.disabled = false;
    el.status.textContent = chairError || (failures.length ? `此動作缺少圖層或載入失敗：${[...new Set(failures)].join('、')}` : "");
    await renderPet();
  }

  function timedFrame(node, elapsed, fallbackDelay = 120) {
    if (!node) return null;
    if (node._outlink) return node;
    const keys = Object.keys(node).filter(key => /^\d+$/.test(key)).sort((a,b) => a-b);
    const duration = keys.reduce((sum,key) => sum + Math.max(1, Math.abs(node[key].delay || fallbackDelay)), 0);
    let time = duration ? elapsed % duration : 0;
    for (const key of keys) {
      const delay = Math.max(1, Math.abs(node[key].delay || fallbackDelay));
      if (time < delay) return node[key];
      time -= delay;
    }
    return null;
  }

  function updateOptions(select, keys, labels, value) {
    const signature = keys.join('|');
    if (select.dataset.options !== signature) {
      select.innerHTML = keys.map(key => `<option value="${escapeHtml(key)}">${escapeHtml(labels[key] || key)}</option>`).join('');
      select.dataset.options = signature;
    }
    select.value = keys.includes(value) ? value : keys[0];
    return select.value;
  }

  let controlsToken = 0;
  async function updatePoseControls() {
    const token = ++controlsToken;
    const skin = state.selected.Skin || BASE_SKIN;
    const face = state.selected.Face;
    try {
      const body = await fetchJson(itemPath({id:skin.bodyId || skin.id - 10000, slot:'Body'}));
      const faceData = face ? await fetchJson(itemPath(face)) : {};
      const weapon = state.selected.Weapon;
      const weaponData = weapon ? await fetchJson(itemPath(weapon)) : null;
      if (token !== controlsToken) return;
      const actions = Object.keys(ACTION_LABELS).filter(key => {
        if (!body[key]) return false;
        if (!weaponData || !/^(swing|stab|shoot|handgun|proneStab)/.test(key)) return true;
        return Object.keys(body[key]).filter(frame => /^\d+$/.test(frame)).every(frame => {
          let action = key, pose = frameNode(body, action, Number(frame));
          for (let depth=0; pose?.action && depth<16; depth++) { action=pose.action; pose=frameNode(body,action,Number(pose.frame || 0)); }
          return weaponData[action] || Object.values(weaponData).some(branch=>branch?.[action]);
        });
      });
      state.action = updateOptions(el.action, actions, ACTION_LABELS, state.action);
      state.expression = updateOptions(el.expression, Object.keys(faceData).filter(key => key !== 'info' && typeof faceData[key] === 'object'), EXPRESSION_LABELS, state.expression);
    } catch (_error) { el.status.textContent = '動作選單載入失敗，請重新選取外觀。'; }
  }

  let petRenderToken = 0;
  async function renderPet() {
    const token = ++petRenderToken;
    const pet = state.selected.Pet;
    el.petPanel.hidden = !pet;
    if (!pet) { state.petId = null; return; }
    try {
      const data = await fetchJson(itemPath(pet));
      if (state.selected.Pet !== pet || token !== petRenderToken) return;
      const keys = Object.keys(data).filter(key => {
        const frame = timedFrame(data[key], 0);
        return frame?._outlink;
      });
      if (state.petId !== pet.id) { state.petAction = keys.includes('stand0') ? 'stand0' : keys[0]; state.petId = pet.id; }
      state.petAction = updateOptions(el.petAction, keys, PET_LABELS, state.petAction);
      if (!keys.length) throw new Error('Missing pet states');
      const node = data[state.petAction];
      const frames = Object.keys(node).filter(key => /^\d+$/.test(key)).map(key => node[key]);
      const loaded = await Promise.all(frames.map(async frame => ({frame, image:await loadImage(frame._outlink)})));
      if (state.selected.Pet !== pet || token !== petRenderToken) return;
      const frame = timedFrame(node, state.elapsed);
      const image = await loadImage(frame._outlink);
      const bounds = loaded.reduce((b, {frame:f,image:i}) => ({left:Math.min(b.left,-(f.origin?.x || 0)),top:Math.min(b.top,-(f.origin?.y || 0)),right:Math.max(b.right,i.width-(f.origin?.x || 0)),bottom:Math.max(b.bottom,i.height-(f.origin?.y || 0))}), {left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});
      const canvas = el.petCanvas, ctx = canvas.getContext('2d');
      const scale = Math.min(4,(canvas.width-32)/(bounds.right-bounds.left),(canvas.height-24)/(bounds.bottom-bounds.top));
      ctx.clearRect(0,0,canvas.width,canvas.height); ctx.imageSmoothingEnabled = false;
      const x = (canvas.width-(bounds.right-bounds.left)*scale)/2 - bounds.left*scale;
      const y = (canvas.height-(bounds.bottom-bounds.top)*scale)/2 - bounds.top*scale;
      ctx.drawImage(image,Math.round(x-(frame.origin?.x || 0)*scale),Math.round(y-(frame.origin?.y || 0)*scale),image.width*scale,image.height*scale);
      el.petStatus.textContent = pet.name;
    } catch (_error) {
      if (token !== petRenderToken) return;
      el.petCanvas.getContext('2d').clearRect(0,0,el.petCanvas.width,el.petCanvas.height);
      el.petStatus.textContent = `${pet.name}：動畫素材載入失敗，請稍後再試。`;
    }
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
      if (Object.hasOwn(ACTION_LABELS, saved.action)) state.action = saved.action;
      if (typeof saved.expression === 'string') state.expression = saved.expression;
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
    if (item.slot === 'Chair') {
      if (chairFailures.delete(item.id)) chairCache.delete(item.id);
      state.elapsed = 0; state.frameTimer = 0;
      el.status.textContent = '載入椅子…';
      el.download.disabled = true;
    }
    saveState();
    renderItems();
    renderEquipped();
    updatePoseControls().then(renderAvatar);
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
    updatePoseControls().then(renderAvatar);
  }

  function randomAvatar() {
    const choices = ["Hair", "Face", "Cap", "Overall", "Coat", "Pants", "Shoes", "Glove", "Cape", "Weapon"];
    const skins = DB.skins?.length ? DB.skins : [BASE_SKIN];
    const next = { Skin: skins[Math.floor(Math.random() * skins.length)] };
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
    updatePoseControls().then(renderAvatar);
  }

  function downloadAvatar() {
    const link = document.createElement("a");
    link.download = `maplememory-avatar-${Date.now()}.png`;
    link.href = el.canvas.toDataURL("image/png");
    link.click();
  }

  function bindEvents() {
    el.removeChair.addEventListener('click', () => {
      delete state.selected.Chair;
      state.frame = 0;
      saveState(); renderItems(); renderEquipped(); renderAvatar();
    });
    el.petAction.addEventListener('change', () => { state.petAction = el.petAction.value; state.elapsed = 0; renderPet(); });
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
    await updatePoseControls();
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
