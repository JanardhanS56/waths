import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const store = new Map();
const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    addEventListener: () => {}
  },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v))
  }
};
sandbox.window = sandbox;

const code = fs.readFileSync("static/arena-common.js", "utf8");
vm.runInNewContext(code, sandbox);

const { escapeHtml, evaluateMatchEnd, saveWinStat, getStoredStats } = sandbox.window.WathsArena;

assert.equal(escapeHtml(`<script>"'&`), "&lt;script&gt;&quot;&#039;&amp;");

const norm = (v) => JSON.parse(JSON.stringify(v));

assert.deepEqual(
  norm(evaluateMatchEnd({ maxRounds: 5, nMsgsCount: 3, pMsgsCount: 2, nScoreTotal: 30, pScoreTotal: 20 })),
  { ended: false }
);

assert.deepEqual(
  norm(evaluateMatchEnd({ maxRounds: 5, nMsgsCount: 4, pMsgsCount: 4, nScoreTotal: 40, pScoreTotal: 20 })),
  { ended: true, type: "concede", concedingBot: "P Waths", winningBot: "N Waths" }
);

assert.deepEqual(
  norm(evaluateMatchEnd({ maxRounds: 5, nMsgsCount: 5, pMsgsCount: 5, nScoreTotal: 35, pScoreTotal: 35 })),
  { ended: true, type: "normal" }
);

saveWinStat("test_stats", "N Waths");
saveWinStat("test_stats", "Tie");
assert.deepEqual(norm(getStoredStats("test_stats")), { nWins: 1, pWins: 0, ties: 1, totalMatches: 2 });

console.log("arena-common.js tests passed");
