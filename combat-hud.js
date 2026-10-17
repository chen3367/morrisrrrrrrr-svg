/* MapleMemory combat HUD. Load as a classic script after the host controls.
 * Deploy beside combat-hud.css, with assets/hud-icons/ and assets/items/4031456.png.
 * readState is a synchronous, side-effect-free snapshot; no OCR is scheduled here.
 * create() binds combatHudButton/combatHudPopupButton when present.
 * open(): Promise<Window|null>; openPopup(): Window|null (synchronous).
 * Both reuse an open HUD; pending PiP blocks popup creation. Call from user clicks.
 * update() refreshes immediately; destroy() is terminal and closes only this HUD.
 */
(function (host) {
  "use strict";

  const source = host.document.currentScript;
  const scriptUrl = new URL(source && source.src ? source.src : host.document.baseURI);
  const base = new URL(".", scriptUrl);
  const stylesheet = new URL("combat-hud.css", base);
  if (source && source.src) stylesheet.search = scriptUrl.search;
  const asset = (path) => new URL(path, base).href;
  const integer = new Intl.NumberFormat("zh-TW", {maximumFractionDigits: 0});
  const decimal = new Intl.NumberFormat("zh-TW", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
  const count = (value) => isNumber(value) ? integer.format(value) : "--";
  const text = (value) => typeof value === "string" && value.trim() ? value.trim() : "--";

  function duration(ms) {
    if (!isNumber(ms) || ms < 0) return "--";
    const seconds = Math.floor(ms / 1000);
    return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
      .map((part) => String(part).padStart(2, "0")).join(":");
  }

  function eta(minutes) {
    if (!isNumber(minutes) || minutes < 0) return "--";
    if (minutes < 1) return "不到 1 分鐘";
    const rounded = Math.ceil(minutes);
    const hours = Math.floor(rounded / 60);
    return hours ? count(hours) + " 小時 " + (rounded % 60) + " 分" : rounded + " 分鐘";
  }

  function put(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }

  function closeWindow(win) {
    try { if (win && !win.closed) win.close(); } catch (_) { /* Already detached. */ }
  }

  function create(options) {
    if (!options || typeof options.readState !== "function") {
      throw new TypeError("MapleCombatHud.create requires readState().");
    }
    const parent = host.document;
    const openButton = parent.getElementById("combatHudButton");
    let popupButton = parent.getElementById("combatHudPopupButton");
    let status = parent.getElementById("combatHudStatus");
    let ownedStatus = false;
    let ownedPopup = false;
    let destroyed = false;
    let opening = null;
    let generation = 0;
    let session = null;

    function message(value) {
      if (!status) {
        status = parent.createElement("p");
        status.id = "combatHudStatus";
        if (openButton) openButton.insertAdjacentElement("afterend", status);
        else parent.body.append(status);
        ownedStatus = true;
      }
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      put(status, value);
    }

    function offerPopup(value) {
      message(value);
      if (!popupButton) {
        popupButton = parent.createElement("button");
        popupButton.id = "combatHudPopupButton";
        popupButton.type = "button";
        const icon = parent.createElement("img");
        icon.src = asset("assets/hud-icons/app-window.svg");
        icon.alt = "";
        icon.width = 16;
        icon.height = 16;
        popupButton.append(icon, parent.createTextNode(" 開啟一般小視窗"));
        popupButton.title = "開啟一般小視窗（不保證置頂）";
        popupButton.setAttribute("aria-label", popupButton.title);
        status.insertAdjacentElement("afterend", popupButton);
        popupButton.addEventListener("click", popupClick);
        ownedPopup = true;
      }
      popupButton.hidden = false;
      popupButton.removeAttribute("aria-hidden");
    }

    function hasGesture() {
      if (host.navigator.userActivation && !host.navigator.userActivation.isActive) {
        offerPopup("請點擊 HUD 或一般小視窗按鈕開啟視窗。");
        return false;
      }
      return true;
    }

    function detach(current, close) {
      if (!current) return;
      host.clearInterval(current.timer);
      current.win.removeEventListener("pagehide", current.onHide);
      current.listeners.forEach(([node, handler]) => node.removeEventListener("click", handler));
      current.styles.removeEventListener("error", current.onStyleError);
      if (session === current) session = null;
      if (close) closeWindow(current.win);
    }

    function existing() {
      if (!session) return null;
      if (session.win.closed) {
        detach(session, false);
        return null;
      }
      try { session.win.focus(); } catch (_) { /* Focus is browser controlled. */ }
      return session.win;
    }

    function action(current, callback) {
      if (destroyed || session !== current || current.busy || typeof callback !== "function") return;
      current.busy = true;
      put(current.error, "");
      current.error.hidden = true;
      let result;
      // Keep callbacks synchronous until their first await: share pickers need this click.
      try { result = callback(); }
      catch (_) { failAction(current); }
      update();
      Promise.resolve(result).catch(() => failAction(current)).finally(() => {
        if (destroyed || session !== current) return;
        current.busy = false;
        update();
      });
    }

    function failAction(current) {
      if (destroyed || session !== current) return;
      put(current.error, "操作未完成，請回主頁確認分享狀態後重試。");
      current.error.hidden = false;
    }

    function mount(win, mode) {
      const doc = win.document;
      doc.documentElement.lang = "zh-Hant";
      doc.documentElement.classList.add("maple-combat-hud");
      doc.title = "楓憶 MapleMemory | 戰鬥分析 HUD";
      const viewport = doc.createElement("meta");
      viewport.name = "viewport";
      viewport.content = "width=device-width, initial-scale=1";
      const styles = doc.createElement("link");
      styles.rel = "stylesheet";
      styles.href = stylesheet.href;
      const favicon = doc.createElement("link");
      favicon.rel = "icon";
      favicon.href = asset("assets/items/4031456.png");
      const root = doc.createElement("main");
      root.className = "hud";
      root.setAttribute("aria-label", "戰鬥分析 HUD");
      root.innerHTML = [
        '<header class="hud-header">',
        '<div class="hud-brand"><img class="hud-brand-icon" alt="" width="32" height="32">',
        '<h1>楓憶<span>MapleMemory</span></h1></div>',
        '<nav class="hud-controls" aria-label="分析控制">',
        '<button type="button" data-action="toggle"><span class="hud-icon" data-icon="play" aria-hidden="true"></span></button>',
        '<button type="button" data-action="reset" title="重設累計與計時" aria-label="重設累計與計時"><span class="hud-icon" data-icon="rotate-ccw" aria-hidden="true"></span></button>',
        '<button type="button" data-action="disconnect" title="中斷分享" aria-label="中斷分享"><span class="hud-icon" data-icon="unplug" aria-hidden="true"></span></button>',
        '<button type="button" data-action="close" title="關閉 HUD（保留分析）" aria-label="關閉 HUD（保留分析）"><span class="hud-icon" data-icon="x" aria-hidden="true"></span></button>',
        '</nav></header>',
        '<div class="hud-session"><span class="hud-status" role="status" aria-live="polite" data-value="status"></span>',
        '<span class="hud-duration"><span>持續</span><time data-value="elapsed">--</time></span></div>',
        '<section class="hud-level" aria-label="等級與經驗">',
        '<div class="hud-level-line"><span>LV <strong data-value="level">--</strong></span>',
        '<span>EXP <strong data-value="percent">--</strong></span></div>',
        '<div class="hud-progress" aria-hidden="true"><span></span></div></section>',
        '<dl class="hud-rates">',
        '<div class="hud-exp"><dt>EXP / hr</dt><dd data-value="expPerHour">--</dd></div>',
        '<div class="hud-meso"><dt>楓幣 / hr</dt><dd data-value="mesoPerHour">--</dd></div></dl>',
        '<dl class="hud-totals">',
        '<div><dt>累計 EXP</dt><dd data-value="expGained">--</dd></div>',
        '<div><dt>累計楓幣</dt><dd data-value="mesoGained">--</dd></div></dl>',
        '<dl class="hud-context">',
        '<div class="hud-eta"><dt>預計升級</dt><dd data-value="eta">--</dd></div>',
        '<div><dt>職業</dt><dd data-value="job">--</dd></div>',
        '<div class="hud-map"><dt>地圖</dt><dd data-value="map">--</dd></div></dl>',
        '<footer class="hud-footer"><span data-value="mode"></span><span data-value="sample">最近讀值 --</span></footer>',
        '<p class="hud-error" role="alert" hidden></p>',
      ].join("");
      root.querySelector(".hud-brand-icon").src = asset("assets/items/4031456.png");
      doc.body.replaceChildren(root);
      const fields = {};
      root.querySelectorAll("[data-value]").forEach((node) => { fields[node.dataset.value] = node; });
      const buttons = {};
      root.querySelectorAll("[data-action]").forEach((node) => { buttons[node.dataset.action] = node; });
      const current = {
        win, root, fields, buttons, styles, mode, timer: null, busy: false,
        stylesStartedAt: Date.now(), styleWarning: false,
        error: root.querySelector(".hud-error"),
        progress: root.querySelector(".hud-progress > span"), listeners: [],
      };
      current.onHide = () => {
        if (session !== current) return;
        detach(current, false);
        if (!destroyed) message("HUD 已關閉，主頁分析不受影響。");
      };
      current.onStyleError = () => {
        if (session === current && !destroyed) {
          current.styleWarning = true;
          message("HUD 樣式載入失敗，請確認 combat-hud.css 已部署。");
        }
      };
      session = current;
      const callbacks = {
        toggle: () => action(current, options.onToggle),
        reset: () => action(current, options.onReset),
        disconnect: () => action(current, options.onDisconnect),
        close: () => {
          detach(current, true);
          message("HUD 已關閉，主頁分析不受影響。");
        },
      };
      Object.entries(callbacks).forEach(([key, handler]) => {
        buttons[key].addEventListener("click", handler);
        current.listeners.push([buttons[key], handler]);
      });
      win.addEventListener("pagehide", current.onHide);
      styles.addEventListener("error", current.onStyleError);
      doc.head.append(viewport, styles, favicon);
      put(fields.mode, mode === "pip" ? "置頂 HUD" : "一般視窗 · 不保證置頂");
      update();
      // One display-only timer; readState must never trigger capture or OCR.
      current.timer = host.setInterval(update, 1000);
      if (!current.styleWarning) {
        message(mode === "pip" ? "置頂 HUD 已開啟。" : "一般 HUD 小視窗已開啟，不保證置頂。");
      }
      return win;
    }

    function update() {
      const current = session;
      if (destroyed || !current) return;
      if (current.win.closed) {
        detach(current, false);
        message("HUD 已關閉，主頁分析不受影響。");
        return;
      }
      // Initial about:blank documents do not reliably dispatch stylesheet errors.
      if (!current.styles.sheet && !current.styleWarning && Date.now() - current.stylesStartedAt >= 5000) {
        current.styleWarning = true;
        message("HUD 樣式尚未載入，請確認 combat-hud.css 已部署。");
      } else if (current.styles.sheet && current.styleWarning) {
        current.styleWarning = false;
        message(current.mode === "pip" ? "置頂 HUD 已開啟。" : "一般 HUD 小視窗已開啟，不保證置頂。");
      }
      let state;
      try { state = options.readState() || {}; }
      catch (_) {
        state = {};
        put(current.error, "無法讀取分析狀態，請回主頁確認。");
        current.error.hidden = false;
        current.readError = true;
      }
      if (current.readError && state && Object.keys(state).length) {
        current.readError = false;
        put(current.error, "");
        current.error.hidden = true;
      }
      const {fields, buttons, root} = current;
      const age = isNumber(state.lastSampleAt) ? Math.max(0, Date.now() - state.lastSampleAt) : null;
      const stale = age !== null && age > 30000;
      let statusText = "未連接";
      let statusKind = "disconnected";
      if (state.starting) {
        statusText = "正在連接";
        statusKind = "starting";
      } else if (state.connected && state.running) {
        statusText = stale ? "讀值過期" : "分析進行中";
        statusKind = stale ? "stale" : "running";
      } else if (state.connected) {
        statusText = "分析停止";
        statusKind = "stopped";
      }
      put(fields.status, statusText);
      root.dataset.status = statusKind;
      root.ownerDocument.documentElement.dataset.theme = state.theme === "dark" ? "dark" : "light";
      put(fields.elapsed, duration(state.elapsedMs));
      put(fields.level, isNumber(state.level) && state.level > 0 ? count(state.level) : "--");
      const percent = isNumber(state.percent) && state.percent >= 0 && state.percent <= 100 ? state.percent : null;
      put(fields.percent, percent === null ? "--" : decimal.format(percent) + "%");
      current.progress.style.width = (percent === null ? 0 : percent) + "%";
      ["expPerHour", "mesoPerHour", "expGained", "mesoGained"].forEach((key) => put(fields[key], count(state[key])));
      put(fields.eta, eta(state.etaMinutes));
      put(fields.job, text(state.job));
      put(fields.map, text(state.map));
      put(fields.sample, age === null ? "最近讀值 --" : "讀值 " + duration(age) + " 前");
      fields.sample.dataset.stale = String(stale);
      const toggling = Boolean(state.running);
      const toggleLabel = state.starting ? "正在連接，請稍候" :
        toggling ? "停止分析與分享" : "繼續分析（重新選擇分享畫面）";
      buttons.toggle.title = toggleLabel;
      buttons.toggle.setAttribute("aria-label", toggleLabel);
      buttons.toggle.querySelector(".hud-icon").dataset.icon = toggling ? "pause" : "play";
      buttons.toggle.disabled = current.busy || Boolean(state.starting) || typeof options.onToggle !== "function";
      buttons.reset.disabled = current.busy || Boolean(state.starting) || typeof options.onReset !== "function";
      buttons.disconnect.disabled = current.busy || Boolean(state.starting) || !state.connected || typeof options.onDisconnect !== "function";
    }

    function openPopup() {
      if (destroyed || opening) return null;
      const active = existing();
      if (active) return active;
      if (!hasGesture()) return null;
      let win;
      try {
        win = host.open("about:blank", "_blank", "popup=yes,width=400,height=400,resizable=yes,scrollbars=yes");
        if (!win || win.closed) {
          offerPopup("小視窗遭瀏覽器阻擋，請允許彈出視窗後再次點擊一般小視窗按鈕。");
          return null;
        }
        return mount(win, "popup");
      } catch (_) {
        if (session && session.win === win) detach(session, true);
        else closeWindow(win);
        offerPopup("無法開啟 HUD 小視窗，請確認瀏覽器設定後再次點擊。");
        return null;
      }
    }

    function open() {
      if (destroyed) return Promise.resolve(null);
      if (opening) return opening;
      const active = existing();
      if (active) return Promise.resolve(active);
      if (!hasGesture()) return Promise.resolve(null);
      const pip = host.documentPictureInPicture;
      if (!pip || typeof pip.requestWindow !== "function") {
        // No await before window.open: retain the original click activation.
        return Promise.resolve(openPopup());
      }
      const request = ++generation;
      message("正在開啟置頂 HUD...");
      let result;
      try { result = pip.requestWindow({width: 400, height: 400}); }
      catch (error) { result = Promise.reject(error); }
      const task = Promise.resolve(result).then((win) => {
        if (destroyed || request !== generation) {
          closeWindow(win);
          return null;
        }
        if (!win || win.closed) throw new Error("No PiP window");
        try { return mount(win, "pip"); }
        catch (error) {
          if (session && session.win === win) detach(session, true);
          else closeWindow(win);
          throw error;
        }
      }).catch(() => {
        if (!destroyed && request === generation) {
          offerPopup("置頂 HUD 未能開啟。請點擊一般小視窗按鈕改用備援視窗（不保證置頂）。");
        }
        return null;
      }).finally(() => {
        if (opening === task) opening = null;
      });
      opening = task;
      return task;
    }

    function openClick(event) { if (event.isTrusted) void open(); }
    function popupClick(event) { if (event.isTrusted) openPopup(); }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      generation += 1;
      opening = null;
      detach(session, true);
      if (openButton) openButton.removeEventListener("click", openClick);
      if (popupButton) popupButton.removeEventListener("click", popupClick);
      host.removeEventListener("pagehide", destroy);
      if (ownedPopup) popupButton.remove();
      if (ownedStatus) status.remove();
      else if (status) put(status, "HUD 已關閉。");
    }

    if (openButton) openButton.addEventListener("click", openClick);
    if (popupButton) popupButton.addEventListener("click", popupClick);
    host.addEventListener("pagehide", destroy);
    return {open, openPopup, update, destroy};
  }

  host.MapleCombatHud = Object.freeze({create});
})(window);
