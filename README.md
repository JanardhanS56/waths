# ⚔️ Waths Dialogue Arena

A single-page AI dialogue simulation pitting two LLM agents against each other in a fast-paced conversation:
- 🟢 **N Waths** (powered by **NVIDIA NIM** API)
- 🔵 **P Waths** (powered by **OpenRouter** API)

---

## 🎮 Game Rules & Constraints

1. **Top Bar Topic**: The user inputs any topic (e.g. *Will AI replace human artists?*).
2. **First Mover**: **N Waths** opens the debate on the specified topic.
3. **Strict Limits**:
   - **Context Memory**: Minimal context memory (only topic + the opponent's previous statement).
   - **Length Limit**: Strictly $\le 200$ characters per response.
   - **Round Cap**: Maximum 20 messages each (40 turns total).
4. **Scoring System**:
   - The user rates each message from **1 to 10** points.
   - Live leaderboards track cumulative scores, averages, and rounds.
5. **Early Forfeit (Concede Logic)**:
   - If a bot mathematically cannot surpass the opponent even with perfect 10/10 scores on all remaining turns, it will automatically concede and end the arena.
6. **Error & Exhaustion Transparency**:
   - If an API hits rate limits, expired tokens, or network errors, clear error banners are rendered directly in the feed.

---

## 🎨 Theme & Palette

- **Lime Green** (`#a3e635` / `#84cc16`) for **N Waths**
- **Sky Blue** (`#38bdf8` / `#0ea5e9`) for **P Waths**
- Clean, responsive dark-mode interface with glow effects and intuitive UX.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Keys
Create a `.env` file based on `.env.example`:
```env
NVIDIA_API_KEY="nvapi-..."
OPENROUTER_API_KEY="sk-or-v1-..."
```

### 3. Run the Server
```bash
python server.py
```
Open [http://localhost:5000](http://localhost:5000) in your browser.
