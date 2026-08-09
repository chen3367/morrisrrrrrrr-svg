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

  function hasDetailPane() {
    return !!document.querySelector(
      "#detail, #itemDetail, #questDetail, #mapDetail, #worldMapDetail, #skillDetail, #simulatorDetail, #damageDetail, #levelDetail, .patchNotesDetail"
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
          "#detail, #itemDetail, #questDetail, #mapDetail, #worldMapDetail, #skillDetail, #simulatorDetail, #damageDetail, #levelDetail, .patchNotesDetail"
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

  function initializeMobileState() {
    if (!isMobile()) {
      delete root.dataset.mobilePane;
      toggleSettings(false);
      closeWorldLabels();
      return;
    }
    ensureDock();
    const stored = readStoredPane();
    const initial = stored === "filters" ? lastContentPane : stored || "list";
    setPane(initial, { settings: "keep", scrollTop: false });
    toggleSettings(currentPane() === "filters");
    updateDock();
  }

  document.addEventListener("click", event => {
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

  document.addEventListener("toggle", event => {
    if (!isMobile()) return;
    if (event.target.matches(".navMenuGroup") && event.target.open) {
      document.querySelectorAll(".navMenuGroup[open]").forEach(group => {
        if (group !== event.target && !group.classList.contains("active")) group.open = false;
      });
    }
  }, true);

  const observer = new MutationObserver(() => {
    if (isMobile()) updateDock();
  });

  document.addEventListener("DOMContentLoaded", () => {
    initializeMobileState();
    observer.observe(document.body, { childList: true, subtree: true });
  });

  media.addEventListener?.("change", initializeMobileState);
  if (document.readyState !== "loading") initializeMobileState();
})();
