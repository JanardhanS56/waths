// Waths Roleplay Arena Game Logic

const STATE = {
  nChar: "Kira (Light Yagami)",
  pChar: "L (L Lawliet)",
  scenario: "",
  briefing: null,
  round: 0,
  maxRounds: 20, // default 20 messages per actor
  nScoreTotal: 0,
  pScoreTotal: 0,
  nMsgsCount: 0,
  pMsgsCount: 0,
  currentTurn: null, // "N Waths" or "P Waths"
  lastMessage: "",
  activeAwaitingScore: false,
  isSimulating: false,
  isFinished: false,

  // Token tracking
  nTokens: { prompt: 0, completion: 0, total: 0 },
  pTokens: { prompt: 0, completion: 0, total: 0 },
  masterTokens: { prompt: 0, completion: 0, total: 0 },

  // Bot metadata
  botInfo: {
    "N Waths": { model: "minimaxai/minimax-m3.1-flash", provider: "NVIDIA NIM" },
    "P Waths": { model: "meta-llama/llama-3.2-3b-instruct", provider: "OpenRouter" },
    "Arena Master": { model: "openai/gpt-oss-120b", provider: "Groq" }
  }
};

// LocalStorage Roleplay Win Stats
function getStoredStats() {
  try {
    const raw = localStorage.getItem("waths_roleplay_stats");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { nWins: 0, pWins: 0, ties: 0, totalMatches: 0 };
}

function saveWinStat(winner) {
  const stats = getStoredStats();
  stats.totalMatches++;
  if (winner === "N Waths") stats.nWins++;
  else if (winner === "P Waths") stats.pWins++;
  else stats.ties++;

  try {
    localStorage.setItem("waths_roleplay_stats", JSON.stringify(stats));
  } catch (e) {}
  updateDropdownTelemetry();
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
    }
  } catch (e) {}
  updateDropdownTelemetry();
}

function updateDropdownTelemetry() {
  const stats = getStoredStats();
  const total = stats.totalMatches || 0;
  const nRate = total > 0 ? Math.round((stats.nWins / total) * 100) : 0;
  const pRate = total > 0 ? Math.round((stats.pWins / total) * 100) : 0;

  nProviderVal.textContent = STATE.botInfo["N Waths"].provider;
  nModelVal.textContent = STATE.botInfo["N Waths"].model;
  nWinsVal.textContent = `${stats.nWins} wins (${nRate}%)`;
  nPromptTokVal.textContent = STATE.nTokens.prompt.toLocaleString();
  nCompTokVal.textContent = STATE.nTokens.completion.toLocaleString();
  nTotalTokVal.textContent = STATE.nTokens.total.toLocaleString();

  pProviderVal.textContent = STATE.botInfo["P Waths"].provider;
  pModelVal.textContent = STATE.botInfo["P Waths"].model;
  pWinsVal.textContent = `${stats.pWins} wins (${pRate}%)`;
  pPromptTokVal.textContent = STATE.pTokens.prompt.toLocaleString();
  pCompTokVal.textContent = STATE.pTokens.completion.toLocaleString();
  pTotalTokVal.textContent = STATE.pTokens.total.toLocaleString();
}

// Dropdown interactions
nCard.addEventListener("click", (e) => {
  e.stopPropagation();
  nDropdown.classList.toggle("show");
  pDropdown.classList.remove("show");
});

pCard.addEventListener("click", (e) => {
  e.stopPropagation();
  pDropdown.classList.toggle("show");
  nDropdown.classList.remove("show");
});

document.addEventListener("click", () => {
  nDropdown.classList.remove("show");
  pDropdown.classList.remove("show");
});
nDropdown.addEventListener("click", (e) => e.stopPropagation());
pDropdown.addEventListener("click", (e) => e.stopPropagation());

// Briefing toggle button
toggleBriefingBtn.addEventListener("click", () => {
  if (masterContent.style.display === "none") {
    masterContent.style.display = "flex";
    toggleBriefingBtn.textContent = "Hide Briefing ▴";
  } else {
    masterContent.style.display = "none";
    toggleBriefingBtn.textContent = "Show Briefing ▾";
  }
});

// Preset Pills
presetPills.forEach(pill => {
  pill.addEventListener("click", () => {
    nCharInput.value = pill.getAttribute("data-n");
    pCharInput.value = pill.getAttribute("data-p");
    scenarioInput.value = pill.getAttribute("data-scenario");
  });
});

// Message Limit Pills
limitPills.forEach(pill => {
  pill.addEventListener("click", () => {
    if (STATE.isSimulating) return;
    limitPills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    customLimitInput.value = "";
    STATE.maxRounds = parseInt(pill.getAttribute("data-limit"), 10);
    updateScoreboard();
  });
});

customLimitInput.addEventListener("input", () => {
  if (STATE.isSimulating) return;
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
  STATE.maxRounds = val;
  updateScoreboard();
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

function updateScoreboard() {
  nScoreEl.textContent = STATE.nScoreTotal;
  pScoreEl.textContent = STATE.pScoreTotal;

  const nAvg = STATE.nMsgsCount > 0 ? (STATE.nScoreTotal / STATE.nMsgsCount).toFixed(1) : "0.0";
  const pAvg = STATE.pMsgsCount > 0 ? (STATE.pScoreTotal / STATE.pMsgsCount).toFixed(1) : "0.0";

  nAvgEl.textContent = `Avg: ${nAvg}`;
  pAvgEl.textContent = `Avg: ${pAvg}`;

  nMsgsEl.textContent = `${STATE.nMsgsCount} / ${STATE.maxRounds} msgs`;
  pMsgsEl.textContent = `${STATE.pMsgsCount} / ${STATE.maxRounds} msgs`;

  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    leaderChip.textContent = `${STATE.nChar} leads (+${STATE.nScoreTotal - STATE.pScoreTotal})`;
    leaderChip.style.color = "var(--lime-primary)";
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    leaderChip.textContent = `${STATE.pChar} leads (+${STATE.pScoreTotal - STATE.nScoreTotal})`;
    leaderChip.style.color = "var(--sky-primary)";
  } else {
    leaderChip.textContent = `Tie (${STATE.nScoreTotal} - ${STATE.pScoreTotal})`;
    leaderChip.style.color = "var(--text-muted)";
  }

  // Active turn glow
  if (STATE.currentTurn === "N Waths") {
    nCard.classList.add("active-turn");
    pCard.classList.remove("active-turn");
  } else if (STATE.currentTurn === "P Waths") {
    pCard.classList.add("active-turn");
    nCard.classList.remove("active-turn");
  } else {
    nCard.classList.remove("active-turn");
    pCard.classList.remove("active-turn");
  }
}

function checkConcedeCondition() {
  const nRemaining = STATE.maxRounds - STATE.nMsgsCount;
  const pRemaining = STATE.maxRounds - STATE.pMsgsCount;

  const nMaxPossible = STATE.nScoreTotal + (nRemaining * 10);
  const pMaxPossible = STATE.pScoreTotal + (pRemaining * 10);

  if (nMaxPossible < STATE.pScoreTotal && STATE.nMsgsCount > 0) {
    endSimulationWithConcede("N Waths", "P Waths");
    return true;
  }

  if (pMaxPossible < STATE.nScoreTotal && STATE.pMsgsCount > 0) {
    endSimulationWithConcede("P Waths", "N Waths");
    return true;
  }

  if (STATE.nMsgsCount >= STATE.maxRounds && STATE.pMsgsCount >= STATE.maxRounds) {
    endSimulationNormal();
    return true;
  }

  return false;
}

function endSimulationWithConcede(concedingBot, winningBot) {
  STATE.isFinished = true;
  STATE.isSimulating = false;
  STATE.currentTurn = null;
  updateScoreboard();

  const cChar = concedingBot === "N Waths" ? STATE.nChar : STATE.pChar;
  const wChar = winningBot === "N Waths" ? STATE.nChar : STATE.pChar;

  turnStatus.textContent = `${cChar} Conceded!`;
  roundIndicator.textContent = "Arena Finished";
  ribbonStatus.textContent = `${cChar} conceded: Cannot overtake opponent score.`;
  nextTurnBtn.disabled = true;
  stopBtn.disabled = true;
  startBtn.disabled = false;
  nCharInput.disabled = false;
  pCharInput.disabled = false;
  scenarioInput.disabled = false;

  saveWinStat(winningBot);

  appendSystemBanner(
    `🏳️ ${cChar} (${concedingBot}) has conceded! Mathematical victory for ${wChar} (${winningBot})!`,
    "concede"
  );
  appendSystemBanner(
    `🏆 Winner: ${wChar} (${winningBot}) — Final Score: ${winningBot === "N Waths" ? STATE.nScoreTotal : STATE.pScoreTotal} vs ${concedingBot === "N Waths" ? STATE.nScoreTotal : STATE.pScoreTotal}`,
    "winner"
  );
}

function endSimulationNormal() {
  STATE.isFinished = true;
  STATE.isSimulating = false;
  STATE.currentTurn = null;
  updateScoreboard();

  roundIndicator.textContent = `${STATE.maxRounds} / ${STATE.maxRounds} Rounds Completed`;
  nextTurnBtn.disabled = true;
  stopBtn.disabled = true;
  startBtn.disabled = false;
  nCharInput.disabled = false;
  pCharInput.disabled = false;
  scenarioInput.disabled = false;

  let winnerText = "";
  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    winnerText = `🏆 Winner: ${STATE.nChar} (N Waths) with ${STATE.nScoreTotal} points!`;
    saveWinStat("N Waths");
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    winnerText = `🏆 Winner: ${STATE.pChar} (P Waths) with ${STATE.pScoreTotal} points!`;
    saveWinStat("P Waths");
  } else {
    winnerText = `🤝 It's a Tie! Both actors scored ${STATE.nScoreTotal} points.`;
    saveWinStat("Tie");
  }

  turnStatus.textContent = "Roleplay Duel Concluded";
  ribbonStatus.textContent = `All ${STATE.maxRounds} rounds completed.`;
  appendSystemBanner(winnerText, "winner");
}

function stopSimulationMidway() {
  if (!STATE.isSimulating || STATE.isFinished) return;

  STATE.isFinished = true;
  STATE.isSimulating = false;
  STATE.currentTurn = null;
  updateScoreboard();

  stopBtn.disabled = true;
  nextTurnBtn.disabled = true;
  startBtn.disabled = false;
  nCharInput.disabled = false;
  pCharInput.disabled = false;
  scenarioInput.disabled = false;

  turnStatus.textContent = "Arena Stopped Mid-Way by User";
  roundIndicator.textContent = "Roleplay Halted";
  ribbonStatus.textContent = "Match stopped by user judge.";

  appendSystemBanner("🛑 Roleplay duel stopped mid-way by the user!", "stopped");

  let decisionText = "";
  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    decisionText = `🏆 Match Decision: ${STATE.nChar} (N Waths) wins on points (${STATE.nScoreTotal} to ${STATE.pScoreTotal})`;
    saveWinStat("N Waths");
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    decisionText = `🏆 Match Decision: ${STATE.pChar} (P Waths) wins on points (${STATE.pScoreTotal} to ${STATE.nScoreTotal})`;
    saveWinStat("P Waths");
  } else {
    decisionText = `🤝 Match Decision: Draw at stoppage (${STATE.nScoreTotal} to ${STATE.pScoreTotal})`;
    saveWinStat("Tie");
  }
  appendSystemBanner(decisionText, "winner");
}

function appendSystemBanner(text, type = "normal") {
  const pill = document.createElement("div");
  pill.className = `system-pill ${type}`;
  pill.textContent = text;
  chatFeed.appendChild(pill);
  chatViewport.scrollTop = chatViewport.scrollHeight;
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
  STATE.round = 1;
  STATE.nScoreTotal = 0;
  STATE.pScoreTotal = 0;
  STATE.nMsgsCount = 0;
  STATE.pMsgsCount = 0;
  STATE.lastMessage = "";
  STATE.isSimulating = true;
  STATE.isFinished = false;
  STATE.activeAwaitingScore = false;
  STATE.currentTurn = "N Waths";

  // Update card subtexts with character personas
  nCharSubtext.textContent = `Role: ${nChar}`;
  pCharSubtext.textContent = `Role: ${pChar}`;

  // Disable controls during initialization
  nCharInput.disabled = true;
  pCharInput.disabled = true;
  scenarioInput.disabled = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  chatFeed.innerHTML = "";

  turnStatus.textContent = "Arena Master (Groq GPT) is formulating neutral briefing...";
  ribbonStatus.textContent = "Generating roleplay directives...";
  roundIndicator.textContent = "Master Briefing Phase";

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
      turnStatus.textContent = "Arena Master failed to generate briefing.";
      startBtn.disabled = false;
      nCharInput.disabled = false;
      pCharInput.disabled = false;
      scenarioInput.disabled = false;
      return;
    }

    STATE.briefing = data.briefing;

    // Display briefing card
    masterBriefingCard.style.display = "block";
    masterContent.style.display = "flex";
    briefScenario.textContent = STATE.briefing.scenario_summary || scenario || "Confrontation setting";
    briefNRole.textContent = STATE.briefing.n_role_context || `${nChar} persona`;
    briefPRole.textContent = STATE.briefing.p_role_context || `${pChar} persona`;

    appendSystemBanner(`⚖️ Arena Master has established context: "${STATE.briefing.scenario_summary}"`);
    updateScoreboard();

    // Start with first turn
    executeNextTurn();

  } catch (err) {
    appendSystemBanner(`⚠️ Network error calling Arena Master: ${err.message}`, "error");
    turnStatus.textContent = "Error reaching server.";
    startBtn.disabled = false;
    nCharInput.disabled = false;
    pCharInput.disabled = false;
    scenarioInput.disabled = false;
  }
}

function resetSimulation() {
  STATE.round = 0;
  STATE.nScoreTotal = 0;
  STATE.pScoreTotal = 0;
  STATE.nMsgsCount = 0;
  STATE.pMsgsCount = 0;
  STATE.lastMessage = "";
  STATE.currentTurn = null;
  STATE.isSimulating = false;
  STATE.isFinished = false;
  STATE.activeAwaitingScore = false;

  nCharInput.disabled = false;
  pCharInput.disabled = false;
  scenarioInput.disabled = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  nextTurnBtn.disabled = true;
  masterBriefingCard.style.display = "none";

  chatFeed.innerHTML = `
    <div class="welcome-banner">
      <div class="banner-icon">🎭</div>
      <h2>Roleplay Arena Rules</h2>
      <p>
        Assign any character to <strong>N Waths</strong> and <strong>P Waths</strong>. The neutral <strong>Arena Master</strong> briefs both actors with balanced, strictly 200-character contexts.
      </p>
      <p>
        Each message is limited to <strong>≤ 200 characters</strong>. Rate each response from <strong>1 to 10</strong> based on character depth, dialogue authenticity, and dramatic tension!
      </p>
    </div>
  `;

  roundIndicator.textContent = "Ready to Roleplay";
  turnStatus.textContent = "Configure characters and click Summon Master";
  leaderChip.textContent = "Tie (0 - 0)";
  leaderChip.style.color = "var(--text-muted)";
  ribbonStatus.textContent = "Configure characters to begin roleplay duel...";
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

  roundIndicator.textContent = `Turn ${currentTurnNum} of ${totalTurnsMax}`;
  turnStatus.textContent = `${activeChar} (${bot}) is acting...`;
  ribbonStatus.textContent = `${activeChar} is composing in-character response...`;
  nextTurnBtn.disabled = true;
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

  try {
    const res = await fetch("/api/bot-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bot: bot,
        mode: "roleplay",
        last_message: STATE.lastMessage,
        memory: STATE.lastMessage,
        role_info: {
          char_name: activeChar,
          role_context: roleContext,
          scenario: STATE.briefing?.scenario_summary,
          opp_char: oppChar
        }
      })
    });

    const data = await res.json();
    typingRow.remove();

    if (data.error) {
      appendSystemBanner(`⚠️ ${activeChar} Error: ${data.error}`, "error");
      turnStatus.textContent = `${activeChar} encountered an error.`;
      ribbonStatus.textContent = `Error: ${data.error}`;
      nextTurnBtn.disabled = false;
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

    if (isN) {
      STATE.nMsgsCount++;
    } else {
      STATE.pMsgsCount++;
    }

    renderRoleplayMessage(bot, activeChar, messageText);

  } catch (err) {
    typingRow.remove();
    appendSystemBanner(`⚠️ Network Error: ${err.message}`, "error");
    turnStatus.textContent = "Network error communicating with server.";
    ribbonStatus.textContent = "Failed to reach server.";
    nextTurnBtn.disabled = false;
  }
}

function renderRoleplayMessage(bot, charName, text) {
  const isN = bot === "N Waths";
  const row = document.createElement("div");
  row.className = `msg-row ${isN ? "n-row" : "p-row"}`;

  const charCount = text.length;
  const isWarning = charCount >= 195;

  const bubble = document.createElement("div");
  bubble.className = `msg-bubble ${isN ? "n-bubble" : "p-bubble"}`;

  bubble.innerHTML = `
    <div class="msg-header">
      <span class="msg-author">
        ${isN ? '🟢' : '🔵'} ${charName} <span class="actor-tag">(${bot})</span>
      </span>
      <span class="char-badge ${isWarning ? 'warning' : ''}">
        ${charCount}/200 chars
      </span>
    </div>
    <div class="msg-text">${escapeHtml(text)}</div>
    <div class="rating-area" id="ratingArea">
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

  STATE.activeAwaitingScore = true;
  turnStatus.textContent = `Score ${charName}'s roleplay fidelity (1-10)`;
  ribbonStatus.textContent = `Waiting for judge score...`;
  nextTurnBtn.disabled = true;

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
  turnStatus.textContent = `Score recorded (+${score}). Next: ${nextChar}`;
  ribbonStatus.textContent = `Ready for next turn.`;

  if (autoAdvanceToggle.checked) {
    setTimeout(() => {
      executeNextTurn();
    }, 700);
  } else {
    nextTurnBtn.disabled = false;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

fetchBotInfo();
