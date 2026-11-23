import os
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static')

NVIDIA_API_KEY = os.getenv('NVIDIA_API_KEY', '').strip('"\'')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '').strip('"\'')
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '').strip('"\'')

# Selected models
NVIDIA_MODEL = "minimaxai/minimax-m3.1-flash"
OPENROUTER_MODEL = "meta-llama/llama-3.2-3b-instruct"
GROQ_MODEL = "openai/gpt-oss-120b"

def call_arena_master(n_character, p_character, scenario):
    """Arena Master powered by Groq (GPT-OSS) to generate neutral roleplay briefing JSON."""
    if not GROQ_API_KEY:
        return {"error": "GROQ_API_KEY missing in .env"}

    system_prompt = (
        "You are the neutral, fair Arena Master presiding over a roleplay duel between two actors: "
        "Actor 1 ('N Waths') and Actor 2 ('P Waths'). "
        "Your duty is strictly neutral and balanced. "
        "Create brief, punchy contexts (under 190 characters each) for both roles and the setting. "
        "Output ONLY a valid JSON object matching this schema: "
        '{"scenario_summary": "string under 190 chars", '
        '"n_role_context": "string under 190 chars defining N Waths character and motivation", '
        '"p_role_context": "string under 190 chars defining P Waths character and motivation", '
        '"first_speaker": "N Waths"}'
    )

    user_prompt = (
        f"Actor 1 (N Waths) plays: {n_character}\n"
        f"Actor 2 (P Waths) plays: {p_character}\n"
        f"Scenario / Setting: {scenario or 'A tense, climactic confrontation where both characters test each other.'}"
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are the neutral, fair Arena Master. Output only valid JSON. Do not include markdown or explanations outside the JSON."},
            {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
        ],
        "max_tokens": 400,
        "temperature": 0.6
    }

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        data=json.dumps(payload).encode("utf-8")
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read())
            raw_content = data["choices"][0]["message"]["content"].strip()
            # Parse JSON cleanly
            clean_str = raw_content
            if "```json" in clean_str:
                clean_str = clean_str.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_str:
                clean_str = clean_str.split("```")[1].split("```")[0].strip()
            fb = clean_str.find("{")
            lb = clean_str.rfind("}")
            if fb != -1 and lb != -1:
                clean_str = clean_str[fb:lb+1]
            briefing = json.loads(clean_str)
            usage = data.get("usage", {})
            return {
                "briefing": briefing,
                "model": GROQ_MODEL,
                "provider": "Groq",
                "tokens": {
                    "prompt": usage.get("prompt_tokens", 0),
                    "completion": usage.get("completion_tokens", 0),
                    "total": usage.get("total_tokens", 0)
                }
            }
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        return {"error": f"Groq Arena Master Error {e.code}: {error_body}"}
    except Exception as e:
        return {"error": f"Groq Connection Error: {str(e)}"}

def call_nvidia(topic, last_message, memory_context, mode="dialogue", role_info=None):
    if not NVIDIA_API_KEY:
        return {"error": "NVIDIA_API_KEY missing in .env"}
    
    if mode == "roleplay" and role_info:
        char_name = role_info.get("char_name", "Character")
        role_ctx = role_info.get("role_context", "")
        scenario = role_info.get("scenario", "")
        opp_char = role_info.get("opp_char", "Opponent")

        system_prompt = (
            f"You are strictly role-playing as '{char_name}'. "
            f"Your character context: {role_ctx}. Setting: {scenario}. "
            "CRITICAL RULES: "
            "1. Strictly output under 180 characters. "
            "2. Stay 100% in-character. Do not break character. "
            "3. Output only spoken dialogue or actions (e.g. *actions*). No internal reasoning or thought dumps. "
            "4. You only remember your role and the opponent's latest line."
        )

        if last_message:
            user_prompt = f"'{opp_char}' just said: '{last_message}'. Reply in-character under 180 characters:"
        else:
            user_prompt = f"Deliver your opening in-character statement as '{char_name}' to '{opp_char}' in under 180 characters:"
    else:
        system_prompt = (
            "You are 'N Waths', a witty, concise debate bot. "
            "You are competing in a dialogue duel. "
            "CRITICAL RULES: "
            "1. Strictly output under 180 characters. "
            "2. Do not output reasoning, internal thinking, or thoughts. Output ONLY the spoken response. "
            "3. You only remember the topic and the latest statement. "
            "4. Stay engaging and directly on topic."
        )

        if last_message:
            user_prompt = f"Topic: '{topic}'. Opponent said: '{last_message}'. Reply in under 180 characters:"
        else:
            user_prompt = f"Topic: '{topic}'. Give your opening statement in under 180 characters:"

    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 250,
        "temperature": 0.8
    }

    req = urllib.request.Request(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Content-Type": "application/json"
        },
        data=json.dumps(payload).encode("utf-8")
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read())
            choice = data["choices"][0]["message"]
            content = choice.get("content") or choice.get("reasoning_content") or ""
            if "</think>" in content:
                content = content.split("</think>")[-1].strip()
            content = content.strip().strip('"')
            if len(content) > 200:
                content = content[:197] + "..."
            usage = data.get("usage", {})
            return {
                "text": content,
                "raw_length": len(content),
                "model": NVIDIA_MODEL,
                "provider": "NVIDIA NIM",
                "tokens": {
                    "prompt": usage.get("prompt_tokens", 0),
                    "completion": usage.get("completion_tokens", 0),
                    "total": usage.get("total_tokens", 0)
                }
            }
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        return {"error": f"NVIDIA API Error {e.code}: {error_body}"}
    except Exception as e:
        return {"error": f"NVIDIA Connection Error: {str(e)}"}

def call_openrouter(topic, last_message, memory_context, mode="dialogue", role_info=None):
    if not OPENROUTER_API_KEY:
        return {"error": "OPENROUTER_API_KEY missing in .env"}

    if mode == "roleplay" and role_info:
        char_name = role_info.get("char_name", "Character")
        role_ctx = role_info.get("role_context", "")
        scenario = role_info.get("scenario", "")
        opp_char = role_info.get("opp_char", "Opponent")

        system_prompt = (
            f"You are strictly role-playing as '{char_name}'. "
            f"Your character context: {role_ctx}. Setting: {scenario}. "
            "CRITICAL RULES: "
            "1. Strictly output under 180 characters. "
            "2. Stay 100% in-character. Do not break character. "
            "3. Output only spoken dialogue or actions. No meta commentary. "
            "4. You only remember your role and the opponent's latest line."
        )

        if last_message:
            user_prompt = f"'{opp_char}' just said: '{last_message}'. Reply in-character under 180 characters:"
        else:
            user_prompt = f"Deliver your opening in-character thought as '{char_name}' to '{opp_char}' in under 180 characters:"
    else:
        system_prompt = (
            "You are 'P Waths', a sharp, smart conversationalist bot. "
            "You are competing in a dialogue duel against N Waths. "
            "CRITICAL RULES: "
            "1. Strictly output under 180 characters. "
            "2. You only remember the topic and the latest statement. "
            "3. Output only your direct dialogue. "
            "4. Be punchy, conversational, and directly address the opponent."
        )

        if last_message:
            user_prompt = f"Topic: '{topic}'. Opponent said: '{last_message}'. Reply in under 180 characters:"
        else:
            user_prompt = f"Topic: '{topic}'. Give your opening thought in under 180 characters:"

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 120,
        "temperature": 0.8
    }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "Waths Arena"
        },
        data=json.dumps(payload).encode("utf-8")
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read())
            choice = data["choices"][0]["message"]
            content = choice.get("content") or ""
            content = content.strip().strip('"')
            if len(content) > 200:
                content = content[:197] + "..."
            usage = data.get("usage", {})
            return {
                "text": content,
                "raw_length": len(content),
                "model": OPENROUTER_MODEL,
                "provider": "OpenRouter",
                "tokens": {
                    "prompt": usage.get("prompt_tokens", 0),
                    "completion": usage.get("completion_tokens", 0),
                    "total": usage.get("total_tokens", 0)
                }
            }
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        return {"error": f"OpenRouter API Error {e.code}: {error_body}"}
    except Exception as e:
        return {"error": f"OpenRouter Connection Error: {str(e)}"}

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/roleplay", strict_slashes=False)
@app.route("/roleplay.html")
def roleplay_page():
    return send_from_directory("static", "roleplay.html")

@app.route("/api/bot-info", methods=["GET"])
def bot_info():
    return jsonify({
        "N Waths": {
            "name": "N Waths",
            "model": NVIDIA_MODEL,
            "provider": "NVIDIA NIM",
            "has_key": bool(NVIDIA_API_KEY)
        },
        "P Waths": {
            "name": "P Waths",
            "model": OPENROUTER_MODEL,
            "provider": "OpenRouter",
            "has_key": bool(OPENROUTER_API_KEY)
        },
        "Arena Master": {
            "name": "Arena Master",
            "model": GROQ_MODEL,
            "provider": "Groq",
            "has_key": bool(GROQ_API_KEY)
        }
    })

@app.route("/api/arena-master/brief", methods=["POST"])
def arena_master_brief():
    data = request.json or {}
    n_character = data.get("n_character", "").strip()
    p_character = data.get("p_character", "").strip()
    scenario = data.get("scenario", "").strip()

    if not n_character or not p_character:
        return jsonify({"error": "Both character names are required"}), 400

    result = call_arena_master(n_character, p_character, scenario)
    return jsonify(result)

@app.route("/api/bot-turn", methods=["POST"])
def bot_turn():
    data = request.json or {}
    bot_type = data.get("bot")  # "N Waths" or "P Waths"
    topic = data.get("topic", "").strip()
    last_message = data.get("last_message", "").strip()
    memory_context = data.get("memory", "")
    mode = data.get("mode", "dialogue")
    role_info = data.get("role_info", None)

    if mode == "dialogue" and not topic:
        return jsonify({"error": "No topic provided"}), 400

    if bot_type == "N Waths":
        result = call_nvidia(topic, last_message, memory_context, mode=mode, role_info=role_info)
    elif bot_type == "P Waths":
        result = call_openrouter(topic, last_message, memory_context, mode=mode, role_info=role_info)
    else:
        return jsonify({"error": f"Unknown bot type: {bot_type}"}), 400

    return jsonify(result)

@app.route("/<path:path>")
def static_files(path):
    html_path = os.path.join("static", f"{path}.html")
    if os.path.isfile(html_path):
        return send_from_directory("static", f"{path}.html")
    return send_from_directory("static", path)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
