# Waths Arena

A high-performance LLM evaluation workbench featuring dual synchronous arenas, customizable model routing, and human-in-the-loop scoring.

---

## Architecture Overview

Waths Arena benchmarks model outputs under strict character and memory limits across two independent modes:

- **N Waths (Actor 1)**: Powered by **NVIDIA NIM** (Default: `stepfun-ai/step-5-preview` / `minimaxai/minimax-m3.1-flash`).
- **P Waths (Actor 2)**: Powered by **OpenRouter** (Default: `meta-llama/llama-3.2-3b-instruct`).
- **Arena Master (Referee)**: Powered by **Groq** (`openai/gpt-oss-120b`) to formulate impartial scenario briefings and role instructions.

---

## Arenas

### 1. Dialogue Benchmark (`/`)
- Head-to-head synchronous debate on any prompt or topic.
- Turn-based exchange capped at $\le 200$ characters per response.
- Configurable match length: 5, 10, 15, 20, or custom round allocations.
- Real-time scoring (1 to 10 scale) with live average calculations.
- Automatic mathematical concession logic halts matches early when trailing bots cannot mathematically catch up.

### 2. Roleplay Benchmark (`/roleplay`)
- Assign distinct personas to each actor (e.g., Detective vs Mastermind, Scholar vs Skeptic) with an optional scene setting.
- Groq GPT generates neutral, structured JSON briefs containing setting context and tactical objectives ($\le 190$ chars each).
- Actors maintain strict in-character fidelity with asterisk action support (`*actions*`).
- Dialogue rate limit and isolated session memory prevent chain-of-thought leakage.

---

## Engine & System Features

- **In-Session Memory Isolation**: Rolling memory buffer (default 500 characters) persists only for the active match session and is purged upon conclusion or reset.
- **Runtime Configuration Modal**: Interactive control panel to tune temperature, top-p, context memory depth, character ceilings, and target models per bot with local persistence.
- **Reasoning Model Guard**: Automatic extraction of dialogue drafts from reasoning traces if deep-thinking models exhaust completion tokens during chain-of-thought processing.
- **Workstation UI**: High-contrast, accessibility-checked interface adhering to strict design tokens: 2-radius scale (4px/8px), solid slate surfaces (`#090c12`), and zero decorative gradients or glow filters.

---

## Quick Start

### 1. Prerequisites
- Python 3.10+
- Valid API keys for NVIDIA NIM, OpenRouter, and Groq.

### 2. Installation
```bash
git clone https://github.com/your-username/waths.git
cd waths
pip install -r requirements.txt
```

### 3. Environment Setup
Copy the template configuration and insert your API keys:
```bash
cp .env.example .env
```

Edit `.env`:
```env
NVIDIA_API_KEY="nvapi-..."
OPENROUTER_API_KEY="sk-or-v1-..."
GROQ_API_KEY="gsk_..."
```

### 4. Launch
```bash
python server.py
```

Navigate to:
- Dialogue Arena: `http://localhost:5000/`
- Roleplay Arena: `http://localhost:5000/roleplay`

---

## Project Structure

```text
.
├── server.py              # Flask API backend, proxy handlers, and model runners
├── requirements.txt       # Python dependencies
├── .env.example           # Environment template with secret placeholders
├── .gitignore             # Git ignore definitions
├── README.md              # Project documentation
└── static/
    ├── index.html         # Dialogue Arena interface
    ├── roleplay.html      # Roleplay Arena interface
    ├── style.css          # Design system styling and layout
    ├── app.js             # Dialogue Arena client logic and state management
    ├── roleplay.js        # Roleplay Arena client logic and referee handling
    └── settings.js        # Model parameter and localStorage configuration manager
```

---

## License

MIT License. See LICENSE file for details.
