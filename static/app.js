// Waths Dialogue Simulation Game Logic

const STATE = {
  topic: "",
  round: 0,
  maxRounds: 20, // max 20 messages per bot
  nScoreTotal: 0,
  pScoreTotal: 0,
  nMsgsCount: 0,
  pMsgsCount: 0,
  currentTurn: null, // "N Waths" or "P Waths"
  lastMessage: "",
  activeAwaitingScore: false,
  isSimulating: false,
  isFinished: false,
};

// DOM Elements
const topicInput = document.getElementById("topicInput");
const startBtn = document.getElementById("startBtn");
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
const roundIndicator = document.getElementById("roundIndicator");
const turnStatus = document.getElementById("turnStatus");
const leaderChip = document.getElementById("leaderChip");
const ribbonStatus = document.getElementById("ribbonStatus");
const nextTurnBtn = document.getElementById("nextTurnBtn");
const autoAdvanceToggle = document.getElementById("autoAdvanceToggle");
const quickTopicPills = document.querySelectorAll(".topic-pill");

// Event Listeners
quickTopicPills.forEach(pill => {
  pill.addEventListener("click", () => {
    topicInput.value = pill.getAttribute("data-topic");
    topicInput.focus();
  });
});

startBtn.addEventListener("click", startSimulation);
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
  nScoreEl.textContent = STATE.nScoreTotal;
  pScoreEl.textContent = STATE.pScoreTotal;

  const nAvg = STATE.nMsgsCount > 0 ? (STATE.nScoreTotal / STATE.nMsgsCount).toFixed(1) : "0.0";
  const pAvg = STATE.pMsgsCount > 0 ? (STATE.pScoreTotal / STATE.pMsgsCount).toFixed(1) : "0.0";

  nAvgEl.textContent = `Avg: ${nAvg}`;
  pAvgEl.textContent = `Avg: ${pAvg}`;

  nMsgsEl.textContent = `${STATE.nMsgsCount} / ${STATE.maxRounds} msgs`;
  pMsgsEl.textContent = `${STATE.pMsgsCount} / ${STATE.maxRounds} msgs`;

  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    leaderChip.textContent = `N Waths leads (+${STATE.nScoreTotal - STATE.pScoreTotal})`;
    leaderChip.style.color = "var(--lime-primary)";
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    leaderChip.textContent = `P Waths leads (+${STATE.pScoreTotal - STATE.nScoreTotal})`;
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

  // If N cannot possibly beat P anymore
  if (nMaxPossible < STATE.pScoreTotal && STATE.nMsgsCount > 0) {
    endSimulationWithConcede("N Waths", "P Waths");
    return true;
  }

  // If P cannot possibly beat N anymore
  if (pMaxPossible < STATE.nScoreTotal && STATE.pMsgsCount > 0) {
    endSimulationWithConcede("P Waths", "N Waths");
    return true;
  }

  // Both completed max 20 messages
  if (STATE.nMsgsCount >= STATE.maxRounds && STATE.pMsgsCount >= STATE.maxRounds) {
    endSimulationNormal();
    return true;
  }

  return false;
}

function endSimulationWithConcede(concedingBot, winningBot) {
  STATE.isFinished = true;
  STATE.currentTurn = null;
  updateScoreboard();

  turnStatus.textContent = `${concedingBot} Conceded!`;
  roundIndicator.textContent = "Arena Finished";
  ribbonStatus.textContent = `${concedingBot} stopped: Mathematical defeat.`;
  nextTurnBtn.disabled = true;

  appendSystemBanner(
    `🏳️ ${concedingBot} has conceded! Even with maximum 10/10 scores on remaining messages, it cannot catch up. ${winningBot} wins the Arena!`,
    "concede"
  );
  appendSystemBanner(
    `🏆 Winner: ${winningBot} (Final Score: ${winningBot === "N Waths" ? STATE.nScoreTotal : STATE.pScoreTotal} vs ${concedingBot === "N Waths" ? STATE.nScoreTotal : STATE.pScoreTotal})`,
    "winner"
  );
}

function endSimulationNormal() {
  STATE.isFinished = true;
  STATE.currentTurn = null;
  updateScoreboard();

  roundIndicator.textContent = "20 / 20 Rounds Completed";
  nextTurnBtn.disabled = true;

  let winnerText = "";
  if (STATE.nScoreTotal > STATE.pScoreTotal) {
    winnerText = `🏆 Winner: N Waths (NVIDIA) with ${STATE.nScoreTotal} points!`;
  } else if (STATE.pScoreTotal > STATE.nScoreTotal) {
    winnerText = `🏆 Winner: P Waths (OpenRouter) with ${STATE.pScoreTotal} points!`;
  } else {
    winnerText = `🤝 It's a Tie! Both bots scored ${STATE.nScoreTotal} points.`;
  }

  turnStatus.textContent = "Simulation Complete";
  ribbonStatus.textContent = "All 20 rounds finished.";
  appendSystemBanner(winnerText, "winner");
}

function appendSystemBanner(text, type = "normal") {
  const pill = document.createElement("div");
  pill.className = `system-pill ${type}`;
  pill.textContent = text;
  chatFeed.appendChild(pill);
  chatViewport.scrollTop = chatViewport.scrollHeight;
}

function startSimulation() {
  const topic = topicInput.value.trim();
  if (!topic) {
    alert("Please enter a topic for the debate.");
    topicInput.focus();
    return;
  }

  STATE.topic = topic;
  STATE.round = 1;
  STATE.nScoreTotal = 0;
  STATE.pScoreTotal = 0;
  STATE.nMsgsCount = 0;
  STATE.pMsgsCount = 0;
  STATE.lastMessage = "";
  STATE.isSimulating = true;
  STATE.isFinished = false;
  STATE.activeAwaitingScore = false;
  STATE.currentTurn = "N Waths"; // N Waths starts

  // Reset UI
  chatFeed.innerHTML = "";
  topicInput.disabled = true;
  startBtn.disabled = true;

  appendSystemBanner(`Arena Started on topic: "${topic}"`);
  updateScoreboard();
  executeNextTurn();
}

function resetSimulation() {
  STATE.topic = "";
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

  topicInput.disabled = false;
  startBtn.disabled = false;
  nextTurnBtn.disabled = true;

  chatFeed.innerHTML = `
    <div class="welcome-banner">
      <div class="banner-icon">⚔️</div>
      <h2>Dialogue Simulation Rules</h2>
      <p>
        <strong>N Waths</strong> speaks first on the chosen topic. Each bot is restricted to <strong>≤ 200 characters</strong> and minimal context memory.
      </p>
      <p>
        Rate each response from <strong>1 to 10</strong>. The bot with highest cumulative score across 20 messages wins. A bot will automatically forfeit if it can no longer mathematically win!
      </p>
    </div>
  `;

  roundIndicator.textContent = "Ready to Start";
  turnStatus.textContent = "Enter a topic above and click Start Arena";
  leaderChip.textContent = "Tie (0 - 0)";
  leaderChip.style.color = "var(--text-muted)";
  ribbonStatus.textContent = "Awaiting topic to begin simulation...";
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

  // Update status banner
  roundIndicator.textContent = `Turn ${(STATE.nMsgsCount + STATE.pMsgsCount) + 1} of 40`;
  turnStatus.textContent = `${bot} is composing message...`;
  ribbonStatus.textContent = `Calling ${isN ? "NVIDIA NIM" : "OpenRouter"} API...`;
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

  try {
    const res = await fetch("/api/bot-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonPayload(bot, STATE.topic, STATE.lastMessage)
    });

    const data = await res.json();
    typingRow.remove();

    if (data.error) {
      appendSystemBanner(`⚠️ ${bot} Error: ${data.error}`, "error");
      turnStatus.textContent = `${bot} encountered an error.`;
      ribbonStatus.textContent = `Error occurred. Check API limits or credentials.`;
      // Allow user to retry next turn
      nextTurnBtn.disabled = false;
      return;
    }

    const messageText = data.text || "(No response)";
    STATE.lastMessage = messageText;

    if (isN) {
      STATE.nMsgsCount++;
    } else {
      STATE.pMsgsCount++;
    }

    renderBotMessage(bot, messageText);

  } catch (err) {
    typingRow.remove();
    appendSystemBanner(`⚠️ Network Error: ${err.message}`, "error");
    turnStatus.textContent = "Network error communicating with server.";
    ribbonStatus.textContent = "Failed to reach server.";
    nextTurnBtn.disabled = false;
  }
}

function jsonPayload(bot, topic, lastMessage) {
  return JSON.stringify({
    bot: bot,
    topic: topic,
    last_message: lastMessage,
    // Very little context memory: only last message is passed
    memory: lastMessage
  });
}

function renderBotMessage(bot, text) {
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
        ${isN ? '🟢' : '🔵'} ${bot}
      </span>
      <span class="char-badge ${isWarning ? 'warning' : ''}">
        ${charCount}/200 chars
      </span>
    </div>
    <div class="msg-text">${escapeHtml(text)}</div>
    <div class="rating-area" id="ratingArea">
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

  // Replace rating buttons with persistent score badge
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
    // Small delay for natural conversational rhythm
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
