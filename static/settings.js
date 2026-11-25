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
    // Update card memory gauges and rings
    const nMemG = document.getElementById("nMemGaugeVal");
    const pMemG = document.getElementById("pMemGaugeVal");
    if (nMemG) nMemG.textContent = currentSettings.n.memory_limit;
    if (pMemG) pMemG.textContent = currentSettings.p.memory_limit;
    updateGaugeRing("nMemGauge", (currentSettings.n.memory_limit / 2000) * 100);
    updateGaugeRing("pMemGauge", (currentSettings.p.memory_limit / 2000) * 100);
  }

  function updateGaugeRing(svgId, percentage) {
    const el = document.getElementById(svgId);
    if (el) {
      const pct = Math.max(5, Math.min(100, Math.round(percentage)));
      el.setAttribute("stroke-dasharray", `${pct}, 100`);
    }
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
    const nTokensVal = document.getElementById("nTokensVal");

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

    if (nTempRange) {
      nTempRange.value = settings.n.temperature;
      if (nTempVal) nTempVal.textContent = Number(settings.n.temperature).toFixed(2);
      updateGaugeRing("nTempGaugeSvg", (settings.n.temperature / 1.5) * 100);
    }
    if (nMemRange) {
      nMemRange.value = settings.n.memory_limit;
      if (nMemVal) nMemVal.textContent = settings.n.memory_limit;
      updateGaugeRing("nMemGaugeSvg", (settings.n.memory_limit / 2000) * 100);
    }
    if (nLimitRange) {
      nLimitRange.value = settings.n.max_chars;
      if (nLimitVal) nLimitVal.textContent = `${settings.n.max_chars}c`;
      updateGaugeRing("nLimitGaugeSvg", (settings.n.max_chars / 1000) * 100);
    }
    if (nTopPRange) {
      nTopPRange.value = settings.n.top_p;
      if (nTopPVal) nTopPVal.textContent = Number(settings.n.top_p).toFixed(2);
    }
    if (nMaxTokensInput) {
      nMaxTokensInput.value = settings.n.max_tokens;
      if (nTokensVal) nTokensVal.textContent = settings.n.max_tokens;
    }

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
    const pTokensVal = document.getElementById("pTokensVal");

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

    if (pTempRange) {
      pTempRange.value = settings.p.temperature;
      if (pTempVal) pTempVal.textContent = Number(settings.p.temperature).toFixed(2);
      updateGaugeRing("pTempGaugeSvg", (settings.p.temperature / 1.5) * 100);
    }
    if (pMemRange) {
      pMemRange.value = settings.p.memory_limit;
      if (pMemVal) pMemVal.textContent = settings.p.memory_limit;
      updateGaugeRing("pMemGaugeSvg", (settings.p.memory_limit / 2000) * 100);
    }
    if (pLimitRange) {
      pLimitRange.value = settings.p.max_chars;
      if (pLimitVal) pLimitVal.textContent = `${settings.p.max_chars}c`;
      updateGaugeRing("pLimitGaugeSvg", (settings.p.max_chars / 1000) * 100);
    }
    if (pTopPRange) {
      pTopPRange.value = settings.p.top_p;
      if (pTopPVal) pTopPVal.textContent = Number(settings.p.top_p).toFixed(2);
    }
    if (pMaxTokensInput) {
      pMaxTokensInput.value = settings.p.max_tokens;
      if (pTokensVal) pTokensVal.textContent = settings.p.max_tokens;
    }
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

    const quickN = document.getElementById("openNSettingsQuick");
    const quickP = document.getElementById("openPSettingsQuick");
    if (quickN) quickN.addEventListener("click", openModal);
    if (quickP) quickP.addEventListener("click", openModal);

    if (settingsBtn) settingsBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
          closeModal();
        }
      });
    }

    // Dynamic slider updates with circular gauge animation
    const bindRange = (rangeId, valId, gaugeId, maxVal, suffix = "") => {
      const range = document.getElementById(rangeId);
      const val = document.getElementById(valId);
      if (range) {
        range.addEventListener("input", () => {
          if (val) val.textContent = `${range.value}${suffix}`;
          if (gaugeId) {
            const pct = (parseFloat(range.value) / maxVal) * 100;
            updateGaugeRing(gaugeId, pct);
          }
        });
      }
    };

    bindRange("nTempRange", "nTempVal", "nTempGaugeSvg", 1.5);
    bindRange("nMemRange", "nMemVal", "nMemGaugeSvg", 2000);
    bindRange("nLimitRange", "nLimitVal", "nLimitGaugeSvg", 1000, "c");

    bindRange("pTempRange", "pTempVal", "pTempGaugeSvg", 1.5);
    bindRange("pMemRange", "pMemVal", "pMemGaugeSvg", 2000);
    bindRange("pLimitRange", "pLimitVal", "pLimitGaugeSvg", 1000, "c");

    // Steppers setup
    const setupStepper = (decId, incId, inputId, valId, step, min, max, isFloat = false) => {
      const dec = document.getElementById(decId);
      const inc = document.getElementById(incId);
      const inp = document.getElementById(inputId);
      const val = document.getElementById(valId);
      if (!inp) return;

      const update = (newVal) => {
        const clamped = Math.max(min, Math.min(max, newVal));
        inp.value = isFloat ? clamped.toFixed(2) : Math.round(clamped);
        if (val) val.textContent = inp.value;
      };

      if (dec) dec.addEventListener("click", () => update(parseFloat(inp.value) - step));
      if (inc) inc.addEventListener("click", () => update(parseFloat(inp.value) + step));
    };

    setupStepper("nTopPDec", "nTopPInc", "nTopPRange", "nTopPVal", 0.05, 0.1, 1.0, true);
    setupStepper("pTopPDec", "pTopPInc", "pTopPRange", "pTopPVal", 0.05, 0.1, 1.0, true);
    setupStepper("nTokensDec", "nTokensInc", "nMaxTokensInput", "nTokensVal", 50, 50, 1000, false);
    setupStepper("pTokensDec", "pTokensInc", "pMaxTokensInput", "pTokensVal", 50, 50, 1000, false);

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
        window.dispatchEvent(new CustomEvent("waths-settings-updated", { detail: newSettings }));
      });
    }

    updateNavBadges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettingsModal);
  } else {
    initSettingsModal();
  }

  window.WathsSettings = {
    getSettings: () => ({ ...currentSettings }),
    getBotConfig: getBotConfig,
    openModal: openModal,
    closeModal: closeModal
  };
})();
