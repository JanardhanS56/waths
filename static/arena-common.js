// Waths Arena: Shared UI, Telemetry, Scoring, and Concession Helpers

(function () {
  function setText(target, val) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    if (el) el.textContent = (val !== undefined && val !== null) ? val : "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStoredStats(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { nWins: 0, pWins: 0, ties: 0, totalMatches: 0 };
  }

  function saveWinStat(storageKey, winner) {
    const stats = getStoredStats(storageKey);
    stats.totalMatches++;
    if (winner === "N Waths") stats.nWins++;
    else if (winner === "P Waths") stats.pWins++;
    else stats.ties++;

    try {
      localStorage.setItem(storageKey, JSON.stringify(stats));
    } catch (e) {}
    return stats;
  }

  function updateTelemetry({ storageKey, botInfo, nTokens, pTokens }) {
    const stats = getStoredStats(storageKey);
    const total = stats.totalMatches || 0;
    const nRate = total > 0 ? Math.round((stats.nWins / total) * 100) : 0;
    const pRate = total > 0 ? Math.round((stats.pWins / total) * 100) : 0;

    const nModel = window.WathsSettings
      ? window.WathsSettings.getBotConfig("N Waths").model
      : (botInfo["N Waths"]?.model || "stepfun-ai/step-5-preview");
    const pModel = window.WathsSettings
      ? window.WathsSettings.getBotConfig("P Waths").model
      : (botInfo["P Waths"]?.model || "meta-llama/llama-3.2-3b-instruct");

    setText("nProviderVal", botInfo["N Waths"]?.provider || "NVIDIA NIM");
    setText("nModelVal", nModel);
    setText("nWinsVal", `${stats.nWins} wins (${nRate}%)`);
    setText("nPromptTokVal", nTokens.prompt.toLocaleString());
    setText("nCompTokVal", nTokens.completion.toLocaleString());
    setText("nTotalTokVal", nTokens.total.toLocaleString());

    setText("pProviderVal", botInfo["P Waths"]?.provider || "OpenRouter");
    setText("pModelVal", pModel);
    setText("pWinsVal", `${stats.pWins} wins (${pRate}%)`);
    setText("pPromptTokVal", pTokens.prompt.toLocaleString());
    setText("pCompTokVal", pTokens.completion.toLocaleString());
    setText("pTotalTokVal", pTokens.total.toLocaleString());
  }

  function bindTelemetryDropdowns(nCard, pCard, nDropdown, pDropdown) {
    if (nCard && nDropdown) {
      nCard.addEventListener("click", (e) => {
        e.stopPropagation();
        nDropdown.classList.toggle("show");
        if (pDropdown) pDropdown.classList.remove("show");
      });
      nDropdown.addEventListener("click", (e) => e.stopPropagation());
    }
    if (pCard && pDropdown) {
      pCard.addEventListener("click", (e) => {
        e.stopPropagation();
        pDropdown.classList.toggle("show");
        if (nDropdown) nDropdown.classList.remove("show");
      });
      pDropdown.addEventListener("click", (e) => e.stopPropagation());
    }
    document.addEventListener("click", () => {
      if (nDropdown) nDropdown.classList.remove("show");
      if (pDropdown) pDropdown.classList.remove("show");
    });
  }

  function bindLimitControls({ limitPills, customLimitInput, state, onChange }) {
    limitPills.forEach(pill => {
      pill.addEventListener("click", () => {
        if (state.isSimulating) return;
        limitPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        if (customLimitInput) customLimitInput.value = "";
        state.maxRounds = parseInt(pill.getAttribute("data-limit"), 10);
        if (onChange) onChange();
      });
    });

    if (customLimitInput) {
      customLimitInput.addEventListener("input", () => {
        if (state.isSimulating) return;
        let val = parseInt(customLimitInput.value, 10);
        if (isNaN(val)) return;
        if (val > 20) {
          val = 20;
          customLimitInput.value = "20";
        }
        if (val < 1) {
          val = 1;
          customLimitInput.value = "1";
        }
        limitPills.forEach(p => p.classList.remove("active"));
        state.maxRounds = val;
        if (onChange) onChange();
      });
    }
  }

  function appendSystemBanner(chatFeed, chatViewport, text, type = "normal") {
    const pill = document.createElement("div");
    pill.className = `system-pill ${type}`;
    pill.textContent = text;
    chatFeed.appendChild(pill);
    chatViewport.scrollTop = chatViewport.scrollHeight;
  }

  function updateScoreboardUI({
    state, nScoreEl, pScoreEl, nAvgEl, pAvgEl,
    nMsgsEl, pMsgsEl, leaderChip, nCard, pCard, nLabel, pLabel
  }) {
    setText(nScoreEl, state.nScoreTotal);
    setText(pScoreEl, state.pScoreTotal);

    const nAvg = state.nMsgsCount > 0 ? (state.nScoreTotal / state.nMsgsCount).toFixed(1) : "0.0";
    const pAvg = state.pMsgsCount > 0 ? (state.pScoreTotal / state.pMsgsCount).toFixed(1) : "0.0";

    setText(nAvgEl, nAvg);
    setText(pAvgEl, pAvg);

    setText(nMsgsEl, `${state.nMsgsCount} / ${state.maxRounds} msgs`);
    setText(pMsgsEl, `${state.pMsgsCount} / ${state.maxRounds} msgs`);

    if (state.nScoreTotal > state.pScoreTotal) {
      setText(leaderChip, `${nLabel} leads (+${state.nScoreTotal - state.pScoreTotal})`);
      if (leaderChip) leaderChip.style.color = "var(--gold-primary)";
    } else if (state.pScoreTotal > state.nScoreTotal) {
      setText(leaderChip, `${pLabel} leads (+${state.pScoreTotal - state.nScoreTotal})`);
      if (leaderChip) leaderChip.style.color = "var(--color-p)";
    } else {
      setText(leaderChip, `Tie (${state.nScoreTotal} - ${state.pScoreTotal})`);
      if (leaderChip) leaderChip.style.color = "var(--text-3)";
    }

    const maxPossible = Math.max(1, (state.maxRounds || 20) * 10);
    const setRing = (id, pct) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute("stroke-dasharray", `${Math.max(5, Math.min(100, Math.round(pct)))}, 100`);
    };
    setRing("nScoreGauge", (state.nScoreTotal / maxPossible) * 100);
    setRing("pScoreGauge", (state.pScoreTotal / maxPossible) * 100);
    setRing("nAvgGauge", (parseFloat(nAvg) / 10) * 100);
    setRing("pAvgGauge", (parseFloat(pAvg) / 10) * 100);

    if (nCard && pCard) {
      nCard.classList.toggle("active-turn", state.currentTurn === "N Waths");
      pCard.classList.toggle("active-turn", state.currentTurn === "P Waths");
    }
  }

  function evaluateMatchEnd(state) {
    const nRemaining = state.maxRounds - state.nMsgsCount;
    const pRemaining = state.maxRounds - state.pMsgsCount;

    const nMaxPossible = state.nScoreTotal + (nRemaining * 10);
    const pMaxPossible = state.pScoreTotal + (pRemaining * 10);

    if (nMaxPossible < state.pScoreTotal && state.nMsgsCount > 0) {
      return { ended: true, type: "concede", concedingBot: "N Waths", winningBot: "P Waths" };
    }
    if (pMaxPossible < state.nScoreTotal && state.pMsgsCount > 0) {
      return { ended: true, type: "concede", concedingBot: "P Waths", winningBot: "N Waths" };
    }
    if (state.nMsgsCount >= state.maxRounds && state.pMsgsCount >= state.maxRounds) {
      return { ended: true, type: "normal" };
    }
    return { ended: false };
  }

  window.WathsArena = {
    setText,
    escapeHtml,
    getStoredStats,
    saveWinStat,
    updateTelemetry,
    bindTelemetryDropdowns,
    bindLimitControls,
    appendSystemBanner,
    updateScoreboardUI,
    evaluateMatchEnd
  };
})();
