// Waths Dialogue Simulation Game Logic

const STATS_KEY = "waths_arena_stats";

const STATE = {
  topic: "",
  maxRounds: 20, // default 20 messages per bot, configurable up to 20
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

  // Token usage tracking
  nTokens: { prompt: 0, completion: 0, total: 0 },
  pTokens: { prompt: 0, completion: 0, total: 0 },

  // Bot metadata from backend
  botInfo: {
    "N Waths": { model: "stepfun-ai/step-5-preview", provider: "NVIDIA NIM" },
    "P Waths": { model: "meta-llama/llama-3.2-3b-instruct", provider: "OpenRouter" }
  }
};

function saveWinStat(winner) {
  window.WathsArena.saveWinStat(STATS_KEY, winner);
  updateDropdownTelemetry();
}

// DOM Elements
const topicInput = document.getElementById("topicInput");
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
const nDropdown = document.getElementById("nDropdown");
const pDropdown = document.getElementById("pDropdown");
const roundIndicator = document.getElementById("roundIndicator");
const turnStatus = document.getElementById("turnStatus");
const leaderChip = document.getElementById("leaderChip");
const ribbonStatus = document.getElementById("ribbonStatus");
const nextTurnBtn = document.getElementById("nextTurnBtn");
const autoAdvanceToggle = document.getElementById("autoAdvanceToggle");
const quickTopicPills = document.querySelectorAll(".topic-pill");
const limitPills = document.querySelectorAll(".limit-pill");
const customLimitInput = document.getElementById("customLimitInput");

// Telemetry Elements
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

// Initialize Bot Info from Backend
async function fetchBotInfo() {
  try {
    const res = await fetch("/api/bot-info");
    if (res.ok) {
      const data = await res.json();
      if (data["N Waths"]) STATE.botInfo["N Waths"] = data["N Waths"];
      if (data["P Waths"]) STATE.botInfo["P Waths"] = data["P Waths"];
    }
  } catch (e) {}
  updateDropdownTelemetry();
}

// Update telemetry in dropdown menus
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

// Dropdown toggle listeners
window.WathsArena.bindTelemetryDropdowns(nCard, pCard, nDropdown, pDropdown);

// Topic Quick Pills
quickTopicPills.forEach(pill => {
  pill.addEventListener("click", () => {
    quickTopicPills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    topicInput.value = pill.getAttribute("data-topic");
    topicInput.focus();
  });
});

topicInput.addEventListener("input", () => {
  const val = topicInput.value.trim();
  quickTopicPills.forEach(p => {
    p.classList.toggle("active", p.getAttribute("data-topic") === val);
  });
});

// Message Limit Selection Logic (5, 10, 15, 20 or Custom)
window.WathsArena.bindLimitControls({
  limitPills,
  customLimitInput,
  state: STATE,
  onChange: updateScoreboard
});

// Buttons
startBtn.addEventListener("click", startSimulation);
stopBtn.addEventListener("click", stopSimulationMidway);
resetBtn.addEventListener("click", resetSimulation);
nextTurnBtn.addEventListener("click", () => {
  if (!STATE.activeAwaitingScore && !STATE.isFinished) {
    executeNextTurn();
  }
});

topicInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !STATE.isSimulating) {
    startSimulation();
  }
});

function updateScoreboard() {
  window.WathsArena.updateScoreboardUI({
    state: STATE,
    nScoreEl, pScoreEl, nAvgEl, pAvgEl,
    nMsgsEl, pMsgsEl, leaderChip, nCard, pCard,
    nLabel: "N Waths",
    pLabel: "P Waths"
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
  STATE.sessionMemory = ""; // Purge in-session memory on conclude
  updateScoreboard();

  turnStatus.textContent = `${concedingBot} Conceded!`;
  roundIndicator.textContent = "Arena Finished";
  ribbonStatus.textContent = `${concedingBot} stopped: Mathematical defeat.`;
  nextTurnBtn.disabled = true;
  stopBtn.disabled = true;
  startBtn.disabled = false;
  topicInput.disabled = false;

  saveWinStat(winningBot);

  appendSystemBanner(
    `Concession condition reached: ${concedingBot} cannot mathematically overcome score deficit.`,
    "concede"
  );
  appendSystemBanner(
    `Benchmark winner: ${winningBot} (${winningBot === "N Waths" ? STATE.nScoreTotal : STATE.pScoreTotal} to ${concedingBot === "N Waths" ? STATE.nScoreTotal : STATE.pScoreTotal} pts)`,
    "winner"
  );
}

function endSimulationNormal() {
  STATE.isFinished = true;
  STATE.isSimulating = false;
  STATE.currentTurn = null;
  STATE.sessionMemory = ""; // Purge in-session memory on conclude
  updateScoreboard();

  roundIndicator.textContent = `${STATE.maxRounds} / ${STATE.maxRounds} Rounds Completed`;
  nextTurnBtn.disabled = true;
  stopBtn.disabled = true;
  startBtn.disabled = false;
  topicInput.disabled = false;

  let winnerText = "";
  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    winnerText = `Evaluation complete. Winner: N Waths (${STATE.nScoreTotal} to ${STATE.pScoreTotal} pts)`;
    saveWinStat("N Waths");
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    winnerText = `Evaluation complete. Winner: P Waths (${STATE.pScoreTotal} to ${STATE.nScoreTotal} pts)`;
    saveWinStat("P Waths");
  } else {
    winnerText = `Evaluation complete. Parity reached: Draw at ${STATE.nScoreTotal} pts.`;
    saveWinStat("Tie");
  }

  turnStatus.textContent = "Simulation Complete";
  ribbonStatus.textContent = `All ${STATE.maxRounds} rounds finished.`;
  appendSystemBanner(winnerText, "winner");
}

function stopSimulationMidway() {
  if (!STATE.isSimulating || STATE.isFinished) return;

  STATE.isFinished = true;
  STATE.isSimulating = false;
  STATE.currentTurn = null;
  STATE.sessionMemory = ""; // Purge in-session memory on conclude
  updateScoreboard();

  stopBtn.disabled = true;
  nextTurnBtn.disabled = true;
  startBtn.disabled = false;
  topicInput.disabled = false;

  turnStatus.textContent = "Benchmark Halted by Operator";
  roundIndicator.textContent = "Halted";
  ribbonStatus.textContent = "Execution halted by operator.";

  appendSystemBanner("Benchmark halted by operator.", "stopped");

  let decisionText = "";
  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    decisionText = `Interim decision: N Waths leads on points (${STATE.nScoreTotal} to ${STATE.pScoreTotal})`;
    saveWinStat("N Waths");
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    decisionText = `Interim decision: P Waths leads on points (${STATE.pScoreTotal} to ${STATE.nScoreTotal})`;
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

function startSimulation() {
  const topic = topicInput.value.trim();
  if (!topic) {
    alert("Please enter a topic for the debate.");
    topicInput.focus();
    return;
  }

  STATE.topic = topic;
  STATE.nScoreTotal = 0;
  STATE.pScoreTotal = 0;
  STATE.nMsgsCount = 0;
  STATE.pMsgsCount = 0;
  STATE.lastMessage = "";
  STATE.sessionMemory = ""; // Reset memory for fresh match session
  STATE.isSimulating = true;
  STATE.isFinished = false;
  STATE.activeAwaitingScore = false;
  STATE.currentTurn = "N Waths"; // N Waths starts

  // Reset UI
  chatFeed.innerHTML = "";
  const archedDocket = document.getElementById("archedDocket");
  if (archedDocket) archedDocket.style.display = "none";
  topicInput.disabled = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;

  appendSystemBanner(`Arena Started on topic: "${topic}" (${STATE.maxRounds} msgs cap each)`);
  updateScoreboard();
  executeNextTurn();
}

function resetSimulation() {
  STATE.topic = "";
  STATE.nScoreTotal = 0;
  STATE.pScoreTotal = 0;
  STATE.nMsgsCount = 0;
  STATE.pMsgsCount = 0;
  STATE.lastMessage = "";
  STATE.sessionMemory = ""; // Clear memory on reset
  STATE.currentTurn = null;
  STATE.isSimulating = false;
  STATE.isFinished = false;
  STATE.activeAwaitingScore = false;

  topicInput.disabled = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  nextTurnBtn.disabled = true;

  chatFeed.innerHTML = "";
  const archedDocket = document.getElementById("archedDocket");
  if (archedDocket) archedDocket.style.display = "";

  roundIndicator.textContent = "READY";
  turnStatus.textContent = "Enter a topic above and click Start";
  leaderChip.textContent = "Tie (0 - 0)";
  leaderChip.style.color = "var(--text-muted)";
  ribbonStatus.textContent = "Ready";
  updateScoreboard();
}

async function executeNextTurn() {
  if (STATE.isFinished) return;

  // Check forfeit
  if (checkConcedeCondition()) return;

  const bot = STATE.currentTurn;
  const isN = bot === "N Waths";

  // Check individual limit
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
  turnStatus.textContent = `${bot} is composing message...`;
  ribbonStatus.textContent = `${bot} is thinking...`;
  nextTurnBtn.disabled = true;
  updateScoreboard();

  // Create typing placeholder
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
        topic: STATE.topic,
        last_message: STATE.lastMessage,
        memory: STATE.sessionMemory,
        config: botConfig
      })
    });

    const data = await res.json();
    typingRow.remove();

    if (data.error) {
      appendSystemBanner(`⚠️ ${bot} Error: ${data.error}`, "error");
      turnStatus.textContent = `${bot} encountered an error.`;
      ribbonStatus.textContent = `Error occurred: ${data.error}`;
      nextTurnBtn.disabled = false;
      return;
    }

    // Accumulate tokens
    if (data.tokens) {
      const targetTokens = isN ? STATE.nTokens : STATE.pTokens;
      targetTokens.prompt += data.tokens.prompt || 0;
      targetTokens.completion += data.tokens.completion || 0;
      targetTokens.total += data.tokens.total || 0;
      updateDropdownTelemetry();
    }

    const messageText = data.text || "(No response)";
    STATE.lastMessage = messageText;

    // Append to in-session context memory (dynamic limit)
    STATE.sessionMemory += `${bot}: ${messageText}\n`;
    if (STATE.sessionMemory.length > memoryLimit) {
      STATE.sessionMemory = STATE.sessionMemory.slice(-memoryLimit);
    }

    if (isN) {
      STATE.nMsgsCount++;
    } else {
      STATE.pMsgsCount++;
    }

    renderBotMessage(bot, messageText, maxChars);

  } catch (err) {
    typingRow.remove();
    appendSystemBanner(`⚠️ Network Error: ${err.message}`, "error");
    turnStatus.textContent = "Network error communicating with server.";
    ribbonStatus.textContent = "Failed to reach server.";
    nextTurnBtn.disabled = false;
  }
}

function renderBotMessage(bot, text, maxChars = 200) {
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
        ${isN ? '🟢' : '🔵'} ${bot}
      </span>
      <span class="char-badge ${isWarning ? 'warning' : ''}">
        ${charCount}/${maxChars} chars
      </span>
    </div>
    <div class="msg-text">${escapeHtml(text)}</div>
    <div class="rating-area">
      <div class="rating-prompt">
        <span>Score this statement (1 - 10):</span>
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
  turnStatus.textContent = `Please score ${bot}'s response (1-10)`;
  ribbonStatus.textContent = `Waiting for score...`;
  nextTurnBtn.disabled = true;

  // Rating buttons logic
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

  // Replace rating buttons with score badge
  const ratingArea = bubbleEl.querySelector(".rating-area");
  if (ratingArea) {
    ratingArea.innerHTML = `
      <div class="rated-pill">
        ⭐ Scored: ${score} / 10
      </div>
    `;
  }

  updateScoreboard();

  // Check forfeit after scoring
  if (checkConcedeCondition()) {
    return;
  }

  turnStatus.textContent = `Score recorded (+${score}). Next: ${STATE.currentTurn}`;
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
  return window.WathsArena.escapeHtml(str);
}

// Initial telemetry fetch
fetchBotInfo();
