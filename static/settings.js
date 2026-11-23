// Waths Arena: Bot Model & Hyperparameter Settings Manager

(function () {
  const STORAGE_KEY = "waths_bot_settings";

  const DEFAULT_SETTINGS = {
    n: {
      model: "stepfun-ai/step-5-preview",
      temperature: 0.7,
      memory_limit: 500,
      max_chars: 200,
      top_p: 0.9,
      max_tokens: 450
    },
    p: {
      model: "meta-llama/llama-3.2-3b-instruct",
      temperature: 0.7,
      memory_limit: 500,
      max_chars: 200,
      top_p: 0.9,
      max_tokens: 200
    }
  };

  let currentSettings = loadStoredSettings();

  function loadStoredSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          n: { ...DEFAULT_SETTINGS.n, ...(parsed.n || {}) },
          p: { ...DEFAULT_SETTINGS.p, ...(parsed.p || {}) }
        };
      }
    } catch (e) {
      console.warn("Failed to parse stored waths settings", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  function saveStoredSettings(settings) {
    currentSettings = settings;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("Failed to persist waths settings", e);
    }
    updateNavBadges();
  }

  function getBotConfig(botName) {
    if (botName === "N Waths") {
      return { ...currentSettings.n };
    } else if (botName === "P Waths") {
      return { ...currentSettings.p };
    }
    return { ...DEFAULT_SETTINGS.n };
  }

  function updateNavBadges() {
    const memEl = document.getElementById("navMemVal");
    const limitEl = document.getElementById("navLimitVal");
    if (memEl) memEl.textContent = `${currentSettings.n.memory_limit}c`;
    if (limitEl) limitEl.textContent = `≤ ${currentSettings.n.max_chars}c`;
  }

  function syncFormWithSettings(settings) {
    // N Waths
    const nModelSel = document.getElementById("nModelSelect");
    const nCustomInput = document.getElementById("nCustomModelInput");
    const nTempRange = document.getElementById("nTempRange");
    const nTempVal = document.getElementById("nTempVal");
    const nMemRange = document.getElementById("nMemRange");
    const nMemVal = document.getElementById("nMemVal");
    const nLimitRange = document.getElementById("nLimitRange");
    const nLimitVal = document.getElementById("nLimitVal");
    const nTopPRange = document.getElementById("nTopPRange");
    const nTopPVal = document.getElementById("nTopPVal");
    const nMaxTokensInput = document.getElementById("nMaxTokensInput");

    if (nModelSel && nCustomInput) {
      const options = Array.from(nModelSel.options).map(o => o.value);
      if (options.includes(settings.n.model)) {
        nModelSel.value = settings.n.model;
        nCustomInput.style.display = "none";
        nCustomInput.value = "";
      } else {
        nModelSel.value = "custom";
        nCustomInput.style.display = "block";
        nCustomInput.value = settings.n.model;
      }
    }

    if (nTempRange) nTempRange.value = settings.n.temperature;
    if (nTempVal) nTempVal.textContent = Number(settings.n.temperature).toFixed(2);
    if (nMemRange) nMemRange.value = settings.n.memory_limit;
    if (nMemVal) nMemVal.textContent = `${settings.n.memory_limit} chars`;
    if (nLimitRange) nLimitRange.value = settings.n.max_chars;
    if (nLimitVal) nLimitVal.textContent = `${settings.n.max_chars} chars`;
    if (nTopPRange) nTopPRange.value = settings.n.top_p;
    if (nTopPVal) nTopPVal.textContent = Number(settings.n.top_p).toFixed(2);
    if (nMaxTokensInput) nMaxTokensInput.value = settings.n.max_tokens;

    // P Waths
    const pModelSel = document.getElementById("pModelSelect");
    const pCustomInput = document.getElementById("pCustomModelInput");
    const pTempRange = document.getElementById("pTempRange");
    const pTempVal = document.getElementById("pTempVal");
    const pMemRange = document.getElementById("pMemRange");
    const pMemVal = document.getElementById("pMemVal");
    const pLimitRange = document.getElementById("pLimitRange");
    const pLimitVal = document.getElementById("pLimitVal");
    const pTopPRange = document.getElementById("pTopPRange");
    const pTopPVal = document.getElementById("pTopPVal");
    const pMaxTokensInput = document.getElementById("pMaxTokensInput");

    if (pModelSel && pCustomInput) {
      const options = Array.from(pModelSel.options).map(o => o.value);
      if (options.includes(settings.p.model)) {
        pModelSel.value = settings.p.model;
        pCustomInput.style.display = "none";
        pCustomInput.value = "";
      } else {
        pModelSel.value = "custom";
        pCustomInput.style.display = "block";
        pCustomInput.value = settings.p.model;
      }
    }

    if (pTempRange) pTempRange.value = settings.p.temperature;
    if (pTempVal) pTempVal.textContent = Number(settings.p.temperature).toFixed(2);
    if (pMemRange) pMemRange.value = settings.p.memory_limit;
    if (pMemVal) pMemVal.textContent = `${settings.p.memory_limit} chars`;
    if (pLimitRange) pLimitRange.value = settings.p.max_chars;
    if (pLimitVal) pLimitVal.textContent = `${settings.p.max_chars} chars`;
    if (pTopPRange) pTopPRange.value = settings.p.top_p;
    if (pTopPVal) pTopPVal.textContent = Number(settings.p.top_p).toFixed(2);
    if (pMaxTokensInput) pMaxTokensInput.value = settings.p.max_tokens;
  }

  function readSettingsFromForm() {
    const nModelSel = document.getElementById("nModelSelect");
    const nCustomInput = document.getElementById("nCustomModelInput");
    const nTempRange = document.getElementById("nTempRange");
    const nMemRange = document.getElementById("nMemRange");
    const nLimitRange = document.getElementById("nLimitRange");
    const nTopPRange = document.getElementById("nTopPRange");
    const nMaxTokensInput = document.getElementById("nMaxTokensInput");

    const pModelSel = document.getElementById("pModelSelect");
    const pCustomInput = document.getElementById("pCustomModelInput");
    const pTempRange = document.getElementById("pTempRange");
    const pMemRange = document.getElementById("pMemRange");
    const pLimitRange = document.getElementById("pLimitRange");
    const pTopPRange = document.getElementById("pTopPRange");
    const pMaxTokensInput = document.getElementById("pMaxTokensInput");

    let nModel = nModelSel ? nModelSel.value : DEFAULT_SETTINGS.n.model;
    if (nModel === "custom" && nCustomInput && nCustomInput.value.trim()) {
      nModel = nCustomInput.value.trim();
    }

    let pModel = pModelSel ? pModelSel.value : DEFAULT_SETTINGS.p.model;
    if (pModel === "custom" && pCustomInput && pCustomInput.value.trim()) {
      pModel = pCustomInput.value.trim();
    }

    return {
      n: {
        model: nModel || DEFAULT_SETTINGS.n.model,
        temperature: nTempRange ? parseFloat(nTempRange.value) : DEFAULT_SETTINGS.n.temperature,
        memory_limit: nMemRange ? parseInt(nMemRange.value, 10) : DEFAULT_SETTINGS.n.memory_limit,
        max_chars: nLimitRange ? parseInt(nLimitRange.value, 10) : DEFAULT_SETTINGS.n.max_chars,
        top_p: nTopPRange ? parseFloat(nTopPRange.value) : DEFAULT_SETTINGS.n.top_p,
        max_tokens: nMaxTokensInput ? parseInt(nMaxTokensInput.value, 10) : DEFAULT_SETTINGS.n.max_tokens
      },
      p: {
        model: pModel || DEFAULT_SETTINGS.p.model,
        temperature: pTempRange ? parseFloat(pTempRange.value) : DEFAULT_SETTINGS.p.temperature,
        memory_limit: pMemRange ? parseInt(pMemRange.value, 10) : DEFAULT_SETTINGS.p.memory_limit,
        max_chars: pLimitRange ? parseInt(pLimitRange.value, 10) : DEFAULT_SETTINGS.p.max_chars,
        top_p: pTopPRange ? parseFloat(pTopPRange.value) : DEFAULT_SETTINGS.p.top_p,
        max_tokens: pMaxTokensInput ? parseInt(pMaxTokensInput.value, 10) : DEFAULT_SETTINGS.p.max_tokens
      }
    };
  }

  function openModal() {
    const modal = document.getElementById("settingsModal");
    if (modal) {
      syncFormWithSettings(currentSettings);
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal() {
    const modal = document.getElementById("settingsModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }
  }

  function initSettingsModal() {
    const settingsBtn = document.getElementById("settingsBtn");
    const closeBtn = document.getElementById("closeSettingsBtn");
    const cancelBtn = document.getElementById("cancelSettingsBtn");
    const saveBtn = document.getElementById("saveSettingsBtn");
    const resetBtn = document.getElementById("resetSettingsBtn");
    const modal = document.getElementById("settingsModal");

    if (settingsBtn) settingsBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Dynamic label updates on range slider input
    const bindRange = (rangeId, valId, suffix = "") => {
      const range = document.getElementById(rangeId);
      const val = document.getElementById(valId);
      if (range && val) {
        range.addEventListener("input", () => {
          val.textContent = `${range.value}${suffix}`;
        });
      }
    };

    bindRange("nTempRange", "nTempVal");
    bindRange("nMemRange", "nMemVal", " chars");
    bindRange("nLimitRange", "nLimitVal", " chars");
    bindRange("nTopPRange", "nTopPVal");

    bindRange("pTempRange", "pTempVal");
    bindRange("pMemRange", "pMemVal", " chars");
    bindRange("pLimitRange", "pLimitVal", " chars");
    bindRange("pTopPRange", "pTopPVal");

    // Custom model input toggles
    const nModelSel = document.getElementById("nModelSelect");
    const nCustomInput = document.getElementById("nCustomModelInput");
    if (nModelSel && nCustomInput) {
      nModelSel.addEventListener("change", () => {
        nCustomInput.style.display = nModelSel.value === "custom" ? "block" : "none";
        if (nModelSel.value === "custom") nCustomInput.focus();
      });
    }

    const pModelSel = document.getElementById("pModelSelect");
    const pCustomInput = document.getElementById("pCustomModelInput");
    if (pModelSel && pCustomInput) {
      pModelSel.addEventListener("change", () => {
        pCustomInput.style.display = pModelSel.value === "custom" ? "block" : "none";
        if (pModelSel.value === "custom") pCustomInput.focus();
      });
    }

    // Reset Defaults
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        syncFormWithSettings(DEFAULT_SETTINGS);
      });
    }

    // Save & Apply
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const newSettings = readSettingsFromForm();
        saveStoredSettings(newSettings);
        closeModal();

        // Dispatch a custom event so active arenas can react
        window.dispatchEvent(new CustomEvent("waths-settings-updated", { detail: newSettings }));
      });
    }

    updateNavBadges();
  }

  // Auto-init when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettingsModal);
  } else {
    initSettingsModal();
  }

  // Global API
  window.WathsSettings = {
    getSettings: () => ({ ...currentSettings }),
    getBotConfig: getBotConfig,
    openModal: openModal,
    closeModal: closeModal
  };
})();
