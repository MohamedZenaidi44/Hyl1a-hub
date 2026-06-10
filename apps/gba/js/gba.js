/**
 * gba.js
 * Handles the GBA emulator page (host/parent side).
 *
 * Responsibilities:
 *  - Inject Save 💾 / Load 📂 buttons + slot selector into the emulator toolbar
 *  - Talk to the gba_player.html iframe via postMessage
 *  - Upload / download save states through SaveManager
 *  - Show toast confirmations
 *
 * Expects on window:
 *   window.SaveManager  (SaveManager.js must be loaded first)
 *   An iframe with id="gba-emu-iframe" pointing to gba_player.html
 */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  Constants                                                           */
  /* ------------------------------------------------------------------ */
  const PLATFORM      = "gba";
  const IFRAME_ID     = "gba-emu-iframe";
  const SAVE_TIMEOUT  = 5000; // ms to wait for state from iframe

  /* ------------------------------------------------------------------ */
  /*  State                                                               */
  /* ------------------------------------------------------------------ */
  let currentSlot    = 1;          // active save slot (1 | 2 | 3)
  let gameName       = "Unknown";  // resolved from iframe URL or dataset
  let pendingSaveResolve = null;   // resolves when iframe returns state
  let pendingSaveTimer   = null;

  /* ------------------------------------------------------------------ */
  /*  Init – wait for DOM                                                 */
  /* ------------------------------------------------------------------ */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    resolveGameName();
    injectSaveUI();
    listenToIframe();
  }

  /* ------------------------------------------------------------------ */
  /*  Resolve game name from the iframe src hash or data attribute        */
  /* ------------------------------------------------------------------ */
  function resolveGameName() {
    const iframe = document.getElementById(IFRAME_ID);
    if (!iframe) return;

    // Prefer data-game-name attribute set by the host page
    if (iframe.dataset.gameName) {
      gameName = iframe.dataset.gameName;
      return;
    }

    // Fall back: parse hash from src
    try {
      const src    = iframe.src || "";
      const hash   = src.split("#")[1] || "";
      const params = new URLSearchParams(hash);
      const name   = params.get("name");
      if (name) gameName = name;
    } catch (_) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /*  Build and inject the Save/Load UI                                   */
  /* ------------------------------------------------------------------ */
  function injectSaveUI() {
    // Find or create a toolbar container
    let toolbar = document.querySelector(".emu-toolbar");
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className = "emu-toolbar";
      applyToolbarStyles(toolbar);

      // Insert right after the iframe, or at end of body
      const iframe = document.getElementById(IFRAME_ID);
      if (iframe && iframe.parentNode) {
        iframe.parentNode.insertBefore(toolbar, iframe.nextSibling);
      } else {
        document.body.appendChild(toolbar);
      }
    }

    // ---- Slot selector ----
    const slotLabel = el("span", { className: "emu-slot-label" }, "Slot :");
    applyStyles(slotLabel, {
      color: "#ccc", fontSize: "13px", fontFamily: "monospace",
    });

    const slotSelect = el("select", { id: "emu-slot-select" });
    applyStyles(slotSelect, {
      background: "#1e1e2e", color: "#e0e0e0", border: "1px solid #444",
      borderRadius: "6px", padding: "4px 8px", cursor: "pointer",
      fontFamily: "monospace", fontSize: "13px",
    });
    [1, 2, 3].forEach(n => {
      const opt = el("option", { value: n }, `Slot ${n}`);
      slotSelect.appendChild(opt);
    });
    slotSelect.value = currentSlot;
    slotSelect.addEventListener("change", () => {
      currentSlot = parseInt(slotSelect.value, 10);
    });

    // Populate slot labels from Firestore metadata
    loadSlotLabels(slotSelect);

    // ---- Save button ----
    const saveBtn = el("button", { id: "emu-save-btn", title: "Save state to cloud" }, "💾 Save");
    applyBtnStyles(saveBtn, "#7c3aed");
    saveBtn.addEventListener("click", handleSave);

    // ---- Load button ----
    const loadBtn = el("button", { id: "emu-load-btn", title: "Load state from cloud" }, "📂 Load");
    applyBtnStyles(loadBtn, "#0e7490");
    loadBtn.addEventListener("click", handleLoad);

    // ---- Assemble ----
    toolbar.appendChild(slotLabel);
    toolbar.appendChild(slotSelect);
    toolbar.appendChild(saveBtn);
    toolbar.appendChild(loadBtn);
  }

  /* ------------------------------------------------------------------ */
  /*  Save flow                                                           */
  /* ------------------------------------------------------------------ */
  async function handleSave() {
    const btn = document.getElementById("emu-save-btn");
    setLoading(btn, true);

    try {
      // 1. Ask the iframe to trigger a save and send back the state
      const stateArray = await requestStateFromIframe();

      // 2. Convert Array → Uint8Array → Blob
      const uint8 = new Uint8Array(stateArray);
      const blob  = new Blob([uint8], { type: "application/octet-stream" });

      // 3. Upload via SaveManager
      const label = `Slot ${currentSlot} – ${new Date().toLocaleString()}`;
      await window.SaveManager.saveState(PLATFORM, gameName, blob, currentSlot, label);

      // 4. Refresh slot labels
      loadSlotLabels(document.getElementById("emu-slot-select"));

      showToast(`💾 Slot ${currentSlot} sauvegardé !`, "success");
    } catch (err) {
      console.error("[gba.js] Save failed:", err);
      showToast(`❌ Échec de la sauvegarde : ${err.message}`, "error");
    } finally {
      setLoading(btn, false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Load flow                                                           */
  /* ------------------------------------------------------------------ */
  async function handleLoad() {
    const btn = document.getElementById("emu-load-btn");
    setLoading(btn, true);

    try {
      // 1. Download from Firebase Storage
      const uint8 = await window.SaveManager.loadState(PLATFORM, gameName, currentSlot);

      // 2. Send to iframe
      sendToIframe({
        type:  "LOAD_SAVE_STATE",
        state: Array.from(uint8),  // structured-clone-safe
      });

      showToast(`📂 Slot ${currentSlot} chargé !`, "success");
    } catch (err) {
      console.error("[gba.js] Load failed:", err);
      showToast(`❌ Échec du chargement : ${err.message}`, "error");
    } finally {
      setLoading(btn, false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  iframe communication                                                */
  /* ------------------------------------------------------------------ */

  /** Ask the iframe to call EJS_emulator.saveState() and return state. */
  function requestStateFromIframe() {
    return new Promise((resolve, reject) => {
      // In case a previous request timed out and a new one starts
      if (pendingSaveResolve) {
        clearTimeout(pendingSaveTimer);
        pendingSaveResolve = null;
      }

      pendingSaveResolve = resolve;

      pendingSaveTimer = setTimeout(() => {
        pendingSaveResolve = null;
        reject(new Error("Timeout : l'iframe n'a pas répondu dans les délais."));
      }, SAVE_TIMEOUT);

      // Ask iframe to trigger save
      sendToIframe({ type: "TRIGGER_SAVE" });
    });
  }

  /** Listen for messages coming back from the iframe. */
  function listenToIframe() {
    window.addEventListener("message", function (event) {
      const data = event.data;
      if (!data) return;

      if (data.type === "SAVE_STATE_RESPONSE") {
        if (pendingSaveResolve && data.state) {
          clearTimeout(pendingSaveTimer);
          const cb = pendingSaveResolve;
          pendingSaveResolve = null;
          cb(data.state);
        }
      }
    });
  }

  /** Post a message to the GBA iframe. */
  function sendToIframe(msg) {
    const iframe = document.getElementById(IFRAME_ID);
    if (!iframe || !iframe.contentWindow) {
      console.warn("[gba.js] iframe not found or not ready.");
      return;
    }
    iframe.contentWindow.postMessage(msg, "*");
  }

  /* ------------------------------------------------------------------ */
  /*  Slot label enrichment                                               */
  /* ------------------------------------------------------------------ */
  async function loadSlotLabels(select) {
    if (!select || !window.SaveManager) return;

    try {
      const meta = await window.SaveManager.getSlotsMeta(PLATFORM, gameName);
      Array.from(select.options).forEach(opt => {
        const n    = parseInt(opt.value, 10);
        const slot = meta[`slot_${n}`];
        if (slot?.date) {
          const d = new Date(slot.date);
          opt.text = `Slot ${n} — ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        } else {
          opt.text = `Slot ${n} — vide`;
        }
      });
    } catch (err) {
      console.warn("[gba.js] Could not load slot metadata:", err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Toast                                                               */
  /* ------------------------------------------------------------------ */
  function showToast(message, type = "success") {
    const existing = document.getElementById("emu-toast");
    if (existing) existing.remove();

    const toast = el("div", { id: "emu-toast" }, message);
    applyStyles(toast, {
      position:     "fixed",
      bottom:       "24px",
      left:         "50%",
      transform:    "translateX(-50%)",
      background:   type === "error" ? "#7f1d1d" : "#14532d",
      color:        "#fff",
      padding:      "10px 22px",
      borderRadius: "8px",
      fontFamily:   "monospace",
      fontSize:     "14px",
      zIndex:       "9999",
      boxShadow:    "0 4px 16px rgba(0,0,0,0.5)",
      pointerEvents:"none",
      transition:   "opacity 0.4s ease",
      opacity:      "1",
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  /* ------------------------------------------------------------------ */
  /*  DOM helpers                                                         */
  /* ------------------------------------------------------------------ */
  function el(tag, props, text) {
    const node = document.createElement(tag);
    if (props) Object.assign(node, props);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function applyStyles(node, styles) {
    Object.assign(node.style, styles);
  }

  function applyToolbarStyles(node) {
    applyStyles(node, {
      display:        "flex",
      alignItems:     "center",
      gap:            "10px",
      padding:        "8px 16px",
      background:     "#111827",
      borderTop:      "1px solid #2d2d3d",
      flexWrap:       "wrap",
    });
  }

  function applyBtnStyles(btn, bgColor) {
    applyStyles(btn, {
      background:   bgColor,
      color:        "#fff",
      border:       "none",
      borderRadius: "6px",
      padding:      "6px 14px",
      cursor:       "pointer",
      fontFamily:   "monospace",
      fontSize:     "13px",
      fontWeight:   "600",
      transition:   "opacity 0.2s",
    });
    btn.addEventListener("mouseenter", () => (btn.style.opacity = "0.85"));
    btn.addEventListener("mouseleave", () => (btn.style.opacity = "1"));
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.style.opacity = loading ? "0.5" : "1";
    btn.style.cursor  = loading ? "wait" : "pointer";
  }

})();
