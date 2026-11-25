// Waths Roleplay Arena Game Logic

const STATS_KEY = "waths_roleplay_stats";

const STATE = {
  nChar: "Kira (Light Yagami)",
  pChar: "L (L Lawliet)",
  scenario: "",
  briefing: null,
  maxRounds: 20, // default 20 messages per actor
  nScoreTotal: 0,
  pScoreTotal: 0,
  nMsgsCount: 0,
  pMsgsCount: 0,
  currentTurn: null, // "N Waths" or "P Waths"
  lastMessage: "",
  sessionMemory: "", // In-session context memory (cleared after match)
  activeAwaitingScore: false,
  isSimulating: false,
  isFinished: false,

  // Token tracking
  nTokens: { prompt: 0, completion: 0, total: 0 },
  pTokens: { prompt: 0, completion: 0, total: 0 },
  masterTokens: { prompt: 0, completion: 0, total: 0 },

  // Bot metadata
  botInfo: {
    "N Waths": { model: "stepfun-ai/step-5-preview", provider: "NVIDIA NIM" },
    "P Waths": { model: "meta-llama/llama-3.2-3b-instruct", provider: "OpenRouter" },
    "Arena Master": { model: "openai/gpt-oss-120b", provider: "Groq" }
  }
};

function saveWinStat(winner) {
  window.WathsArena.saveWinStat(STATS_KEY, winner);
  updateDropdownTelemetry();
}

function setText(target, val) {
  window.WathsArena.setText(target, val);
}

// DOM Elements
const nCharInput = document.getElementById("nCharInput");
const pCharInput = document.getElementById("pCharInput");
const scenarioInput = document.getElementById("scenarioInput");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const chatFeed = document.getElementById("chatFeed");
const chatViewport = document.getElementById("chatViewport");
const nScoreEl = document.getElementById("nScore");
const pScoreEl = document.getElementById("pScore");
const nAvgEl = document.getElementById("nAvg");
const pAvgEl = document.getElementById("pAvg");
const nMsgsEl = document.getElementById("nMsgs");
const pMsgsEl = document.getElementById("pMsgs");
const nCard = document.getElementById("nCard");
const pCard = document.getElementById("pCard");
const nCardName = document.getElementById("nCardName");
const pCardName = document.getElementById("pCardName");
const nCharSubtext = document.getElementById("nCharSubtext");
const pCharSubtext = document.getElementById("pCharSubtext");
const nDropdown = document.getElementById("nDropdown");
const pDropdown = document.getElementById("pDropdown");
const roundIndicator = document.getElementById("roundIndicator");
const turnStatus = document.getElementById("turnStatus");
const leaderChip = document.getElementById("leaderChip");
const ribbonStatus = document.getElementById("ribbonStatus");
const nextTurnBtn = document.getElementById("nextTurnBtn");
const exportBtn = document.getElementById("exportBtn");
const autoAdvanceToggle = document.getElementById("autoAdvanceToggle");
const presetPills = document.querySelectorAll(".preset-pill");
const limitPills = document.querySelectorAll(".limit-pill");
const customLimitInput = document.getElementById("customLimitInput");

// Master Briefing Elements
const masterBriefingCard = document.getElementById("masterBriefingCard");
const briefScenario = document.getElementById("briefScenario");
const briefNRole = document.getElementById("briefNRole");
const briefPRole = document.getElementById("briefPRole");
const toggleBriefingBtn = document.getElementById("toggleBriefingBtn");
const masterContent = document.getElementById("masterContent");

// Telemetry Dropdown Elements
const nProviderVal = document.getElementById("nProviderVal");
const nModelVal = document.getElementById("nModelVal");
const nWinsVal = document.getElementById("nWinsVal");
const nPromptTokVal = document.getElementById("nPromptTokVal");
const nCompTokVal = document.getElementById("nCompTokVal");
const nTotalTokVal = document.getElementById("nTotalTokVal");

const pProviderVal = document.getElementById("pProviderVal");
const pModelVal = document.getElementById("pModelVal");
const pWinsVal = document.getElementById("pWinsVal");
const pPromptTokVal = document.getElementById("pPromptTokVal");
const pCompTokVal = document.getElementById("pCompTokVal");
const pTotalTokVal = document.getElementById("pTotalTokVal");

// Initialize Bot Info
async function fetchBotInfo() {
  try {
    const res = await fetch("/api/bot-info");
    if (res.ok) {
      const data = await res.json();
      if (data["N Waths"]) STATE.botInfo["N Waths"] = data["N Waths"];
      if (data["P Waths"]) STATE.botInfo["P Waths"] = data["P Waths"];
      if (data["Arena Master"]) STATE.botInfo["Arena Master"] = data["Arena Master"];
      window.WathsArena.checkApiKeyReadiness(STATE.botInfo, turnStatus);
    }
  } catch (e) {}
  updateDropdownTelemetry();
}

function updateDropdownTelemetry() {
  window.WathsArena.updateTelemetry({
    storageKey: STATS_KEY,
    botInfo: STATE.botInfo,
    nTokens: STATE.nTokens,
    pTokens: STATE.pTokens
  });
}

window.addEventListener("waths-settings-updated", () => {
  updateDropdownTelemetry();
});

// Dropdown interactions
window.WathsArena.bindTelemetryDropdowns(nCard, pCard, nDropdown, pDropdown);

// Briefing drawer toggle button
if (toggleBriefingBtn) {
  toggleBriefingBtn.addEventListener("click", () => {
    const pill = document.getElementById("masterSwitchPill");
    if (masterContent && masterContent.classList.contains("open")) {
      masterContent.classList.remove("open");
      if (pill) pill.classList.remove("active");
    } else if (masterContent) {
      masterContent.classList.add("open");
      if (pill) pill.classList.add("active");
    }
  });
}

const nRoleBtn = document.getElementById("nRoleContextBtn");
const pRoleBtn = document.getElementById("pRoleContextBtn");
const openDrawer = (e) => {
  e.stopPropagation();
  if (masterContent) masterContent.classList.add("open");
  const pill = document.getElementById("masterSwitchPill");
  if (pill) pill.classList.add("active");
};
if (nRoleBtn) nRoleBtn.addEventListener("click", openDrawer);
if (pRoleBtn) pRoleBtn.addEventListener("click", openDrawer);

function syncCharacterBadges() {
  const nVal = (nCharInput ? nCharInput.value.trim() : "") || "N";
  const pVal = (pCharInput ? pCharInput.value.trim() : "") || "P";
  setText("nCapsuleInitial", nVal.charAt(0).toUpperCase());
  setText("pCapsuleInitial", pVal.charAt(0).toUpperCase());
  setText(nCharSubtext, nCharInput && nCharInput.value.trim() ? nCharInput.value.trim() : "N Actor");
  setText(pCharSubtext, pCharInput && pCharInput.value.trim() ? pCharInput.value.trim() : "P Actor");
}
if (nCharInput) nCharInput.addEventListener("input", syncCharacterBadges);
if (pCharInput) pCharInput.addEventListener("input", syncCharacterBadges);

const clearScenarioBtn = document.getElementById("clearScenarioBtn");
if (clearScenarioBtn && scenarioInput) {
  scenarioInput.addEventListener("input", () => {
    clearScenarioBtn.style.display = scenarioInput.value ? "inline-block" : "none";
  });
  clearScenarioBtn.addEventListener("click", () => {
    scenarioInput.value = "";
    clearScenarioBtn.style.display = "none";
  });
}

// Preset Pills
presetPills.forEach(pill => {
  pill.addEventListener("click", () => {
    presetPills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    nCharInput.value = pill.getAttribute("data-n");
    pCharInput.value = pill.getAttribute("data-p");
    scenarioInput.value = pill.getAttribute("data-scenario");
    if (clearScenarioBtn) clearScenarioBtn.style.display = "inline-block";
    syncCharacterBadges();
  });
});

// Message Limit Pills
window.WathsArena.bindLimitControls({
  limitPills,
  customLimitInput,
  state: STATE,
  onChange: updateScoreboard
});

// Controls
startBtn.addEventListener("click", summonMasterAndStart);
stopBtn.addEventListener("click", stopSimulationMidway);
resetBtn.addEventListener("click", resetSimulation);
nextTurnBtn.addEventListener("click", () => {
  if (!STATE.activeAwaitingScore && !STATE.isFinished) {
    executeNextTurn();
  }
});
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    window.WathsArena.exportTranscript(chatFeed, "waths-roleplay", `Roleplay Benchmark: ${STATE.nChar} vs ${STATE.pChar}`);
  });
}
window.WathsArena.bindScoringShortcuts(() => STATE.activeAwaitingScore, chatFeed);

function updateScoreboard() {
  window.WathsArena.updateScoreboardUI({
    state: STATE,
    nScoreEl, pScoreEl, nAvgEl, pAvgEl,
    nMsgsEl, pMsgsEl, leaderChip, nCard, pCard,
    nLabel: STATE.nChar,
    pLabel: STATE.pChar
  });
}

function checkConcedeCondition() {
  const res = window.WathsArena.evaluateMatchEnd(STATE);
  if (!res.ended) return false;
  if (res.type === "concede") {
    endSimulationWithConcede(res.concedingBot, res.winningBot);
  } else {
    endSimulationNormal();
  }
  return true;
}

function endSimulationWithConcede(concedingBot, winningBot) {
  STATE.isFinished = true;
  STATE.isSimulating = false;
  STATE.currentTurn = null;
  STATE.sessionMemory = ""; // Purge in-session memory upon match end
  updateScoreboard();

  const cChar = concedingBot === "N Waths" ? STATE.nChar : STATE.pChar;
  const wChar = winningBot === "N Waths" ? STATE.nChar : STATE.pChar;

  setText(turnStatus, `${cChar} Conceded!`);
  setText(roundIndicator, "Arena Finished");
  setText(ribbonStatus, `${cChar} conceded: Cannot overtake opponent score.`);
  if (nextTurnBtn) nextTurnBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = true;
  if (startBtn) startBtn.disabled = false;
  if (nCharInput) nCharInput.disabled = false;
  if (pCharInput) pCharInput.disabled = false;
  if (scenarioInput) scenarioInput.disabled = false;

  saveWinStat(winningBot);

  appendSystemBanner(
    `Concession condition reached: ${cChar} (${concedingBot}) cannot mathematically overcome score deficit.`,
    "concede"
  );
  appendSystemBanner(
    `Benchmark winner: ${wChar} (${winningBot}) (${winningBot === "N Waths" ? STATE.nScoreTotal : STATE.pScoreTotal} to ${concedingBot === "N Waths" ? STATE.nScoreTotal : STATE.pScoreTotal} pts)`,
    "winner"
  );
}

function endSimulationNormal() {
  STATE.isFinished = true;
  STATE.isSimulating = false;
  STATE.currentTurn = null;
  STATE.sessionMemory = ""; // Purge in-session memory upon match end
  updateScoreboard();

  setText(roundIndicator, `${STATE.maxRounds} / ${STATE.maxRounds} Rounds Completed`);
  if (nextTurnBtn) nextTurnBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = true;
  if (startBtn) startBtn.disabled = false;
  if (nCharInput) nCharInput.disabled = false;
  if (pCharInput) pCharInput.disabled = false;
  if (scenarioInput) scenarioInput.disabled = false;

  let winnerText = "";
  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    winnerText = `Evaluation complete. Winner: ${STATE.nChar} (N Waths) (${STATE.nScoreTotal} to ${STATE.pScoreTotal} pts)`;
    saveWinStat("N Waths");
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    winnerText = `Evaluation complete. Winner: ${STATE.pChar} (P Waths) (${STATE.pScoreTotal} to ${STATE.nScoreTotal} pts)`;
    saveWinStat("P Waths");
  } else {
    winnerText = `Evaluation complete. Parity reached: Draw at ${STATE.nScoreTotal} pts.`;
    saveWinStat("Tie");
  }

  setText(turnStatus, "Roleplay Duel Concluded");
  setText(ribbonStatus, `All ${STATE.maxRounds} rounds completed.`);
  appendSystemBanner(winnerText, "winner");
}

function stopSimulationMidway() {
  if (!STATE.isSimulating || STATE.isFinished) return;

  STATE.isFinished = true;
  STATE.isSimulating = false;
  STATE.currentTurn = null;
  STATE.sessionMemory = ""; // Purge in-session memory upon match end
  updateScoreboard();

  if (stopBtn) stopBtn.disabled = true;
  if (nextTurnBtn) nextTurnBtn.disabled = true;
  if (exportBtn) exportBtn.disabled = true;
  if (startBtn) startBtn.disabled = false;
  if (nCharInput) nCharInput.disabled = false;
  if (pCharInput) pCharInput.disabled = false;
  if (scenarioInput) scenarioInput.disabled = false;

  setText(turnStatus, "Benchmark Halted by Operator");
  setText(roundIndicator, "Halted");
  setText(ribbonStatus, "Execution halted by operator.");

  appendSystemBanner("Benchmark halted by operator.", "stopped");

  let decisionText = "";
  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    decisionText = `Interim decision: ${STATE.nChar} (N Waths) leads on points (${STATE.nScoreTotal} to ${STATE.pScoreTotal})`;
    saveWinStat("N Waths");
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    decisionText = `Interim decision: ${STATE.pChar} (P Waths) leads on points (${STATE.pScoreTotal} to ${STATE.nScoreTotal})`;
    saveWinStat("P Waths");
  } else {
    decisionText = `Interim decision: Draw at stoppage (${STATE.nScoreTotal} to ${STATE.pScoreTotal})`;
    saveWinStat("Tie");
  }
  appendSystemBanner(decisionText, "winner");
}

function appendSystemBanner(text, type = "normal") {
  window.WathsArena.appendSystemBanner(chatFeed, chatViewport, text, type);
}

async function summonMasterAndStart() {
  const nChar = nCharInput.value.trim();
  const pChar = pCharInput.value.trim();
  const scenario = scenarioInput.value.trim();

  if (!nChar || !pChar) {
    alert("Please enter character names for both actors.");
    return;
  }

  STATE.nChar = nChar;
  STATE.pChar = pChar;
  STATE.scenario = scenario;
  STATE.nScoreTotal = 0;
  STATE.pScoreTotal = 0;
  STATE.nMsgsCount = 0;
  STATE.pMsgsCount = 0;
  STATE.lastMessage = "";
  STATE.sessionMemory = "";
  STATE.isSimulating = true;
  STATE.isFinished = false;
  STATE.activeAwaitingScore = false;
  STATE.currentTurn = "N Waths";

  // Update card subtexts with character personas
  syncCharacterBadges();

  // Disable controls during initialization
  if (nCharInput) nCharInput.disabled = true;
  if (pCharInput) pCharInput.disabled = true;
  if (scenarioInput) scenarioInput.disabled = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
  if (chatFeed) chatFeed.innerHTML = "";
  const archedDocket = document.getElementById("archedDocket");
  if (archedDocket) archedDocket.style.display = "none";

  setText(turnStatus, "Arena Master (Groq GPT) is formulating neutral briefing...");
  setText(ribbonStatus, "Generating roleplay directives...");
  setText(roundIndicator, "Master Briefing Phase");

  // Request Arena Master Briefing from Backend (Groq GPT)
  try {
    const res = await fetch("/api/arena-master/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        n_character: nChar,
        p_character: pChar,
        scenario: scenario
      })
    });

    const data = await res.json();
    if (data.error) {
      appendSystemBanner(`⚠️ Arena Master Error: ${data.error}`, "error");
      setText(turnStatus, "Arena Master failed to generate briefing.");
      STATE.isSimulating = false;
      STATE.currentTurn = null;
      if (stopBtn) stopBtn.disabled = true;
      if (startBtn) startBtn.disabled = false;
      if (nCharInput) nCharInput.disabled = false;
      if (pCharInput) pCharInput.disabled = false;
      if (scenarioInput) scenarioInput.disabled = false;
      return;
    }

    STATE.briefing = data.briefing;
    if (data.tokens) {
      STATE.masterTokens.prompt += data.tokens.prompt || 0;
      STATE.masterTokens.completion += data.tokens.completion || 0;
      STATE.masterTokens.total += data.tokens.total || 0;
    }
    if (STATE.briefing?.first_speaker === "P Waths") {
      STATE.currentTurn = "P Waths";
    }

    // Display compact briefing strip (collapsed drawer by default to maximize chat space)
    if (masterBriefingCard) masterBriefingCard.style.display = "flex";
    if (masterContent) masterContent.classList.remove("open");
    const switchPill = document.getElementById("masterSwitchPill");
    if (switchPill) switchPill.classList.remove("active");
    setText(briefScenario, STATE.briefing?.scenario_summary || scenario || "Confrontation setting");
    setText(briefNRole, STATE.briefing?.n_role_context || `${nChar} persona`);
    setText(briefPRole, STATE.briefing?.p_role_context || `${pChar} persona`);

    appendSystemBanner(`⚖️ Arena Master set scene: "${STATE.briefing?.scenario_summary || 'Duel active'}"`);
    updateScoreboard();

    // Start with first turn
    executeNextTurn();

  } catch (err) {
    appendSystemBanner(`⚠️ Network error calling Arena Master: ${err.message}`, "error");
    setText(turnStatus, "Error reaching server.");
    STATE.isSimulating = false;
    STATE.currentTurn = null;
    if (stopBtn) stopBtn.disabled = true;
    if (startBtn) startBtn.disabled = false;
    if (nCharInput) nCharInput.disabled = false;
    if (pCharInput) pCharInput.disabled = false;
    if (scenarioInput) scenarioInput.disabled = false;
  }
}

function resetSimulation() {
  STATE.nScoreTotal = 0;
  STATE.pScoreTotal = 0;
  STATE.nMsgsCount = 0;
  STATE.pMsgsCount = 0;
  STATE.lastMessage = "";
  STATE.sessionMemory = ""; // Purge memory on reset
  STATE.currentTurn = null;
  STATE.isSimulating = false;
  STATE.isFinished = false;
  STATE.activeAwaitingScore = false;

  if (nCharInput) nCharInput.disabled = false;
  if (pCharInput) pCharInput.disabled = false;
  if (scenarioInput) scenarioInput.disabled = false;
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  if (nextTurnBtn) nextTurnBtn.disabled = true;
  if (exportBtn) exportBtn.disabled = true;
  if (masterBriefingCard) masterBriefingCard.style.display = "none";

  if (chatFeed) {
    chatFeed.innerHTML = "";
  }
  const archedDocket = document.getElementById("archedDocket");
  if (archedDocket) archedDocket.style.display = "";

  setText(roundIndicator, "READY");
  setText(turnStatus, "Configure characters and click Start");
  setText(leaderChip, "Tie (0 - 0)");
  if (leaderChip) leaderChip.style.color = "var(--text-muted)";
  setText(ribbonStatus, "Ready");
  updateScoreboard();
}

async function executeNextTurn() {
  if (STATE.isFinished) return;
  if (checkConcedeCondition()) return;

  const bot = STATE.currentTurn;
  const isN = bot === "N Waths";
  const activeChar = isN ? STATE.nChar : STATE.pChar;
  const oppChar = isN ? STATE.pChar : STATE.nChar;
  const roleContext = isN ? STATE.briefing?.n_role_context : STATE.briefing?.p_role_context;

  if (isN && STATE.nMsgsCount >= STATE.maxRounds) {
    STATE.currentTurn = "P Waths";
    executeNextTurn();
    return;
  }
  if (!isN && STATE.pMsgsCount >= STATE.maxRounds) {
    STATE.currentTurn = "N Waths";
    executeNextTurn();
    return;
  }

  const totalTurnsMax = STATE.maxRounds * 2;
  const currentTurnNum = (STATE.nMsgsCount + STATE.pMsgsCount) + 1;

  setText(roundIndicator, `Turn ${currentTurnNum} of ${totalTurnsMax}`);
  setText(turnStatus, `${activeChar} (${bot}) is acting...`);
  setText(ribbonStatus, `${activeChar} is composing in-character response...`);
  if (nextTurnBtn) nextTurnBtn.disabled = true;
  updateScoreboard();

  // Typing indicator
  const typingRow = document.createElement("div");
  typingRow.className = `msg-row ${isN ? "n-row" : "p-row"}`;
  typingRow.id = "typingRow";
  typingRow.innerHTML = `
    <div class="msg-bubble ${isN ? "n-bubble" : "p-bubble"} typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  chatFeed.appendChild(typingRow);
  chatViewport.scrollTop = chatViewport.scrollHeight;

  const botConfig = window.WathsSettings ? window.WathsSettings.getBotConfig(bot) : {};
  const memoryLimit = botConfig.memory_limit || 500;
  const maxChars = botConfig.max_chars || 200;

  try {
    const res = await fetch("/api/bot-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bot: bot,
        mode: "roleplay",
        last_message: STATE.lastMessage,
        memory: STATE.sessionMemory,
        role_info: {
          char_name: activeChar,
          role_context: roleContext,
          scenario: STATE.briefing?.scenario_summary,
          opp_char: oppChar
        },
        config: botConfig
      })
    });

    const data = await res.json();
    typingRow.remove();

    if (data.error) {
      appendSystemBanner(`⚠️ ${activeChar} Error: ${data.error}`, "error");
      setText(turnStatus, `${activeChar} encountered an error.`);
      setText(ribbonStatus, `Error: ${data.error}`);
      if (nextTurnBtn) nextTurnBtn.disabled = false;
      return;
    }

    if (data.tokens) {
      const targetTokens = isN ? STATE.nTokens : STATE.pTokens;
      targetTokens.prompt += data.tokens.prompt || 0;
      targetTokens.completion += data.tokens.completion || 0;
      targetTokens.total += data.tokens.total || 0;
      updateDropdownTelemetry();
    }

    const messageText = data.text || "(In-character silence)";
    STATE.lastMessage = messageText;

    // Append to in-session context memory (dynamic limit)
    STATE.sessionMemory += `${activeChar}: ${messageText}\n`;
    if (STATE.sessionMemory.length > memoryLimit) {
      STATE.sessionMemory = STATE.sessionMemory.slice(-memoryLimit);
    }

    if (isN) {
      STATE.nMsgsCount++;
    } else {
      STATE.pMsgsCount++;
    }

    renderRoleplayMessage(bot, activeChar, messageText, maxChars);

  } catch (err) {
    typingRow.remove();
    appendSystemBanner(`⚠️ Network Error: ${err.message}`, "error");
    setText(turnStatus, "Network error communicating with server.");
    setText(ribbonStatus, "Failed to reach server.");
    if (nextTurnBtn) nextTurnBtn.disabled = false;
  }
}

function renderRoleplayMessage(bot, charName, text, maxChars = 200) {
  const isN = bot === "N Waths";
  const row = document.createElement("div");
  row.className = `msg-row ${isN ? "n-row" : "p-row"}`;

  const charCount = text.length;
  const isWarning = charCount >= (maxChars - 5);

  const bubble = document.createElement("div");
  bubble.className = `msg-bubble ${isN ? "n-bubble" : "p-bubble"}`;

  bubble.innerHTML = `
    <div class="msg-header">
      <span class="msg-author">
        ${isN ? '🟢' : '🔵'} ${charName} <span class="actor-tag">(${bot})</span>
      </span>
      <span class="char-badge ${isWarning ? 'warning' : ''}">
        ${charCount}/${maxChars} chars
      </span>
    </div>
    <div class="msg-text">${escapeHtml(text)}</div>
    <div class="rating-area">
      <div class="rating-prompt">
        <span>Rate role authenticity & depth (1 - 10):</span>
      </div>
      <div class="score-buttons">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="score-btn" data-score="${n}">${n}</button>`).join('')}
      </div>
    </div>
  `;

  row.appendChild(bubble);
  chatFeed.appendChild(row);
  chatViewport.scrollTop = chatViewport.scrollHeight;
  if (exportBtn) exportBtn.disabled = false;

  STATE.activeAwaitingScore = true;
  setText(turnStatus, `Score ${charName}'s roleplay fidelity (1-10)`);
  setText(ribbonStatus, `Waiting for judge score...`);
  if (nextTurnBtn) nextTurnBtn.disabled = true;

  const scoreBtns = bubble.querySelectorAll(".score-btn");
  scoreBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (!STATE.activeAwaitingScore) return;
      const score = parseInt(btn.getAttribute("data-score"), 10);
      recordScore(bot, score, bubble);
    });
  });
}

function recordScore(bot, score, bubbleEl) {
  STATE.activeAwaitingScore = false;

  if (bot === "N Waths") {
    STATE.nScoreTotal += score;
    STATE.currentTurn = "P Waths";
  } else {
    STATE.pScoreTotal += score;
    STATE.currentTurn = "N Waths";
  }

  const ratingArea = bubbleEl.querySelector(".rating-area");
  if (ratingArea) {
    ratingArea.innerHTML = `
      <div class="rated-pill">
        ⭐ Fidelity Score: ${score} / 10
      </div>
    `;
  }

  updateScoreboard();

  if (checkConcedeCondition()) {
    return;
  }

  const nextChar = STATE.currentTurn === "N Waths" ? STATE.nChar : STATE.pChar;
  setText(turnStatus, `Score recorded (+${score}). Next: ${nextChar}`);
  setText(ribbonStatus, `Ready for next turn.`);

  if (autoAdvanceToggle && autoAdvanceToggle.checked) {
    setTimeout(() => {
      executeNextTurn();
    }, 700);
  } else if (nextTurnBtn) {
    nextTurnBtn.disabled = false;
  }
}

function escapeHtml(str) {
  return window.WathsArena.escapeHtml(str);
}

fetchBotInfo();
