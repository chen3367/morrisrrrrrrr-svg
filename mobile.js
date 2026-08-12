(() => {
  const root = document.documentElement;
  const media = window.matchMedia("(max-width: 860px)");
  const PANE_KEY = "ms-mobile-pane";
  let lastContentPane = "list";

  function isMobile() {
    return media.matches;
  }

  function settingsPanel() {
    return document.getElementById("settingsPanel");
  }

  function settingsButton() {
    return document.getElementById("settingsToggle");
  }

  function navButton() {
    return document.getElementById("navDrawerToggle");
  }

  function hasDetailPane() {
    return !!document.querySelector(
      "#detail, #itemDetail, #questDetail, #mapDetail, #worldMapDetail, #skillDetail, #simulatorDetail, #damageDetail, #gachaDetail, #levelDetail, .patchNotesDetail"
    );
  }

  function currentPane() {
    return root.dataset.mobilePane || "list";
  }

  function storePane(pane) {
    try {
      sessionStorage.setItem(PANE_KEY, pane);
    } catch (_error) {}
  }

  function readStoredPane() {
    try {
      const value = sessionStorage.getItem(PANE_KEY);
      return value === "detail" || value === "filters" || value === "list" ? value : "";
    } catch (_error) {
      return "";
    }
  }

  function toggleSettings(open) {
    const panel = settingsPanel();
    const button = settingsButton();
    if (!panel) return;
    if (!isMobile() && panel.classList.contains("utilitySettingsPanel")) return;
    const isOpen = !panel.hidden;
    if (open === isOpen) return;
    if (button) {
      button.click();
    } else {
      panel.hidden = !open;
    }
  }

  function setPane(pane, options = {}) {
    if (!isMobile()) return;
    const nextPane = pane === "detail" && hasDetailPane() ? "detail" : pane === "filters" ? "filters" : "list";
    if (nextPane === "list" || nextPane === "detail") lastContentPane = nextPane;
    root.dataset.mobilePane = nextPane;
    storePane(nextPane);
    if (options.settings !== "keep") toggleSettings(nextPane === "filters");
    updateDock();
    if (nextPane === "detail" && options.scrollTop !== false) {
      requestAnimationFrame(() => {
        const paneEl = document.querySelector(
          "#detail, #itemDetail, #questDetail, #mapDetail, #worldMapDetail, #skillDetail, #simulatorDetail, #damageDetail, #gachaDetail, #levelDetail, .patchNotesDetail"
        );
        paneEl?.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  function dockButton(action, label) {
    return `<button type="button" data-mobile-action="${action}">${label}</button>`;
  }

  function ensureDock() {
    if (document.querySelector(".mobileDock")) return;
    const dock = document.createElement("nav");
    dock.className = "mobileDock";
    dock.setAttribute("aria-label", "手機版檢視切換");
    dock.innerHTML = [
      dockButton("list", "清單"),
      dockButton("detail", "內容"),
      dockButton("filters", "設定"),
    ].join("");
    document.body.appendChild(dock);
  }

  function updateDock() {
    const dock = document.querySelector(".mobileDock");
    if (!dock) return;
    const pane = currentPane();
    dock.querySelectorAll("button").forEach(button => {
      const action = button.dataset.mobileAction;
      button.classList.toggle("active", action === pane);
      if (action === "detail") button.disabled = !hasDetailPane();
      if (action === "filters") button.disabled = !settingsPanel();
      button.setAttribute("aria-pressed", String(action === pane));
    });
  }

  function closeWorldLabels(except = null) {
    document.querySelectorAll(".worldMapNode.labelOpen").forEach(node => {
      if (node !== except) node.classList.remove("labelOpen");
    });
  }

  const hoverNavMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  const navAnimations = new WeakMap();
  const navCloseTimers = new WeakMap();

  function animateNav(group, direction) {
    const links = group.querySelector(".navMenuLinks");
    if (!links || reducedMotionMedia.matches || typeof links.animate !== "function") return;
    navAnimations.get(group)?.cancel();
    const opening = direction === "open";
    const animation = links.animate(
      opening
        ? [
            { opacity: 0, transform: "translateY(-6px) scale(0.98)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ]
        : [
            { opacity: 1, transform: "translateY(0) scale(1)" },
            { opacity: 0, transform: "translateY(-6px) scale(0.98)" },
          ],
      { duration: opening ? 130 : 105, easing: opening ? "cubic-bezier(.2,.8,.2,1)" : "ease-in" }
    );
    navAnimations.set(group, animation);
    return animation;
  }

  function openNavGroup(group) {
    if (!group) return;
    const timer = navCloseTimers.get(group);
    if (timer) window.clearTimeout(timer);
    document.querySelectorAll(".navMenuGroup[open]").forEach(openGroup => {
      if (openGroup !== group) closeNavGroup(openGroup, { animate: false });
    });
    group.removeAttribute("data-nav-closing");
    if (!group.open) {
      group.open = true;
      animateNav(group, "open");
    }
  }

  function closeNavGroup(group, options = {}) {
    if (!group || !group.open) return;
    const animate = options.animate !== false;
    if (!animate || reducedMotionMedia.matches) {
      navAnimations.get(group)?.cancel();
      group.removeAttribute("data-nav-closing");
      group.open = false;
      return;
    }
    group.setAttribute("data-nav-closing", "true");
    const animation = animateNav(group, "close");
    if (!animation) {
      group.removeAttribute("data-nav-closing");
      group.open = false;
      return;
    }
    animation.finished
      .catch(() => {})
      .then(() => {
        if (group.matches(":hover") || group.contains(document.activeElement)) {
          group.removeAttribute("data-nav-closing");
          return;
        }
        group.removeAttribute("data-nav-closing");
        group.open = false;
      });
  }

  function scheduleCloseNavGroup(group) {
    const timer = navCloseTimers.get(group);
    if (timer) window.clearTimeout(timer);
    navCloseTimers.set(
      group,
      window.setTimeout(() => {
        if (!group.matches(":hover") && !group.contains(document.activeElement)) closeNavGroup(group);
      }, 120)
    );
  }

  function closeAllNavGroups(except = null, options = {}) {
    document.querySelectorAll(".navMenuGroup[open]").forEach(group => {
      if (group !== except) closeNavGroup(group, options);
    });
  }

  function ensureNavBackdrop() {
    let backdrop = document.querySelector(".navDrawerBackdrop");
    if (backdrop) return backdrop;
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "navDrawerBackdrop";
    backdrop.setAttribute("aria-label", "關閉選單");
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function setNavDrawer(open) {
    const button = navButton();
    if (!isMobile()) open = false;
    root.dataset.navDrawerOpen = open ? "true" : "false";
    if (!open) closeAllNavGroups(null, { animate: false });
    if (button) {
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "關閉選單" : "開啟選單");
      button.title = open ? "關閉選單" : "開啟選單";
      button.textContent = open ? "×" : "☰";
    }
  }

  function initializeNavMenus() {
    document.querySelectorAll(".navMenuGroup").forEach(group => {
      group.open = false;
      group.addEventListener("mouseenter", () => {
        if (hoverNavMedia.matches) openNavGroup(group);
      });
      group.addEventListener("mouseleave", () => {
        if (hoverNavMedia.matches) scheduleCloseNavGroup(group);
      });
      group.addEventListener("focusin", () => {
        if (hoverNavMedia.matches) openNavGroup(group);
      });
      group.addEventListener("focusout", () => {
        requestAnimationFrame(() => {
          if (hoverNavMedia.matches && !group.contains(document.activeElement) && !group.matches(":hover")) scheduleCloseNavGroup(group);
        });
      });
    });
  }

  function initializeMobileState() {
    if (!isMobile()) {
      delete root.dataset.mobilePane;
      setNavDrawer(false);
      toggleSettings(false);
      closeWorldLabels();
      return;
    }
    ensureDock();
    ensureNavBackdrop();
    setNavDrawer(false);
    const stored = readStoredPane();
    const initial = stored === "filters" ? lastContentPane : stored || "list";
    setPane(initial, { settings: "keep", scrollTop: false });
    toggleSettings(currentPane() === "filters");
    updateDock();
  }

  document.addEventListener("click", event => {
    const navToggle = event.target.closest("#navDrawerToggle");
    if (navToggle) {
      event.preventDefault();
      setNavDrawer(root.dataset.navDrawerOpen !== "true");
      return;
    }

    if (event.target.closest(".navDrawerBackdrop")) {
      event.preventDefault();
      setNavDrawer(false);
      return;
    }

    const navLink = event.target.closest(".topNav a");
    if (navLink && isMobile()) {
      setNavDrawer(false);
      return;
    }

    const summary = event.target.closest(".navMenuGroup > summary");
    if (summary) {
      event.preventDefault();
      const group = summary.parentElement;
      if (group.open) closeNavGroup(group);
      else openNavGroup(group);
      return;
    }
    if (!event.target.closest(".navMenuGroup")) closeAllNavGroups(null, { animate: false });

    if (!isMobile()) return;

    const dockAction = event.target.closest("[data-mobile-action]");
    if (dockAction) {
      const action = dockAction.dataset.mobileAction;
      if (dockAction.disabled) return;
      if (action === "filters" && currentPane() === "filters") {
        setPane(lastContentPane, { scrollTop: false });
      } else {
        setPane(action, { scrollTop: action === "detail" });
      }
      return;
    }

    const settings = event.target.closest("#settingsToggle");
    if (settings) {
      requestAnimationFrame(() => {
        setPane(settingsPanel()?.hidden ? lastContentPane : "filters", { settings: "keep", scrollTop: false });
      });
      return;
    }

    const row = event.target.closest(
      ".monsterRow, .levelExpRow, .patchVersionRow"
    );
    if (row && (row.classList.contains("patchVersionRow") || row.classList.contains("levelExpRow") || !event.target.closest("a[href], button:not(.monsterRow)"))) {
      requestAnimationFrame(() => setPane("detail", { scrollTop: true }));
      return;
    }

    const worldNode = event.target.closest(".worldMapNode");
    if (worldNode) {
      if (!worldNode.classList.contains("labelOpen")) {
        event.preventDefault();
        closeWorldLabels(worldNode);
        worldNode.classList.add("labelOpen");
      }
      return;
    }

    if (!event.target.closest(".worldMapNode")) closeWorldLabels();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    setNavDrawer(false);
    closeAllNavGroups(null, { animate: false });
  });

  const observer = new MutationObserver(() => {
    if (isMobile()) updateDock();
  });

  let mobileEnhancementsStarted = false;

  function startMobileEnhancements() {
    if (mobileEnhancementsStarted) return;
    mobileEnhancementsStarted = true;
    initializeNavMenus();
    initializeMobileState();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  media.addEventListener?.("change", initializeMobileState);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startMobileEnhancements);
  } else {
    startMobileEnhancements();
  }
})();
