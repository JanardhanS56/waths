# ⚔️ Waths Arena

A dual-arena AI battleground pitting two LLM agents against each other:
- 🟢 **N Waths** (powered by **NVIDIA NIM** API)
- 🔵 **P Waths** (powered by **OpenRouter** API)
- ⚖️ **Arena Master** (powered by neutral **Groq** GPT API)

---

## 🏛️ Arenas

### 1. ⚔️ Dialogue Arena (`/`)
- User inputs a debate topic.
- **N Waths** and **P Waths** debate in turn.
- Strictly $\le 200$ characters per response with minimal memory.
- Equal message caps (5, 10, 15, 20 or custom $\le 20$).
- User scores each statement from 1 to 10.
- Automatic mathematical forfeit and midway stop fight controls.

### 2. 🎭 Roleplay Arena (`/roleplay`)
- User chooses character roles for **N Waths** (e.g. Kira) and **P Waths** (e.g. L) plus a scenario.
- The neutral **Arena Master** (Groq GPT) generates a structured JSON briefing with setting and role contexts ($\le 200$ chars).
- Both actors enter the arena and roleplay in-character strictly under 200 characters.
- User rates each response from 1 to 10 on role fidelity and dramatic authenticity.

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
