import os
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static')

@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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
        "SYSTEM IDENTITY: You are the neutral, fair Arena Master presiding over a roleplay duel between two actors: "
        "Actor 1 ('N Waths') and Actor 2 ('P Waths'). You never take sides.\n"
        "YOUR DUTY: Establish a compelling, balanced stage and distinct role directions under 190 characters each.\n"
        "Output ONLY a raw valid JSON object with these exact keys:\n"
        '{"scenario_summary": "Setting and stakes under 190 chars", '
        '"n_role_context": "Role, personality, and objective for N Waths under 190 chars", '
        '"p_role_context": "Role, personality, and objective for P Waths under 190 chars", '
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
        "max_tokens": 1200,
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
        with urllib.request.urlopen(req, timeout=20) as res:
            data = json.loads(res.read())
            msg = data["choices"][0]["message"]
            raw_content = (msg.get("content") or "").strip()
            # If content is empty, check reasoning as fallback
            if not raw_content and msg.get("reasoning"):
                raw_content = msg.get("reasoning").strip()

            clean_str = raw_content
            if "```json" in clean_str:
                clean_str = clean_str.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_str:
                clean_str = clean_str.split("```")[1].split("```")[0].strip()

            fb = clean_str.find("{")
            lb = clean_str.rfind("}")
            if fb != -1 and lb != -1:
                clean_str = clean_str[fb:lb+1]

            try:
                briefing = json.loads(clean_str)
            except Exception:
                briefing = {
                    "scenario_summary": (scenario or f"A high-stakes confrontation between {n_character} and {p_character}.")[:190],
                    "n_role_context": f"Embody {n_character} with conviction, distinct personality, and tactical motives."[:190],
                    "p_role_context": f"Embody {p_character} with sharp wits, unyielding persona, and counter-tactics."[:190],
                    "first_speaker": "N Waths"
                }

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
    
    # In-session context memory capped strictly at 500 characters
    session_mem = (memory_context or "").strip()
    if len(session_mem) > 500:
        session_mem = session_mem[-500:]

    mem_block = f"\nSession history (last 500 chars):\n{session_mem}\n" if session_mem else ""

    if mode == "roleplay" and role_info:
        char_name = role_info.get("char_name", "Character")
        role_ctx = role_info.get("role_context", "")
        scenario = role_info.get("scenario", "")
        opp_char = role_info.get("opp_char", "Opponent")

        system_prompt = (
            f"SYSTEM IDENTITY: You are N Waths, currently role-playing as '{char_name}'.\n"
            f"YOUR CHARACTER PROFILE & OBJECTIVE: {role_ctx}\n"
            f"SETTING & SCENARIO: {scenario}\n"
            "ROLEPLAY DIRECTIVES:\n"
            "1. Output strictly under 180 characters. Never exceed 180 characters.\n"
            f"2. You are 100% in-character as '{char_name}'. Never speak out of character or refer to yourself as an AI.\n"
            f"3. Speak directly to '{opp_char}'. Use vivid character voice and concise actions in asterisks (e.g. *actions*).\n"
            "4. No internal reasoning, thought dumps, or tags. Output only dialogue and action.\n"
            "5. Use your 500-char session memory to react directly to what happened in this match."
        )

        if last_message:
            user_prompt = f"{mem_block}'{opp_char}' just said: '{last_message}'. Reply in-character under 180 characters:"
        else:
            user_prompt = f"{mem_block}Deliver your opening in-character statement as '{char_name}' to '{opp_char}' in under 180 characters:"
    else:
        system_prompt = (
            "SYSTEM IDENTITY: You are 'N Waths', an expressive, witty conversationalist in a live dialogue duel against P Waths.\n"
            "DIRECTIVES:\n"
            "1. Strictly output under 180 characters.\n"
            "2. Do not output reasoning or thoughts. Output ONLY your direct spoken statement.\n"
            "3. Use your 500-char session memory to maintain conversational continuity.\n"
            "4. Stay engaging, punchy, and on topic."
        )

        if last_message:
            user_prompt = f"Topic: '{topic}'.{mem_block}Opponent said: '{last_message}'. Reply in under 180 characters:"
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

    # In-session context memory capped strictly at 500 characters
    session_mem = (memory_context or "").strip()
    if len(session_mem) > 500:
        session_mem = session_mem[-500:]

    mem_block = f"\nSession history (last 500 chars):\n{session_mem}\n" if session_mem else ""

    if mode == "roleplay" and role_info:
        char_name = role_info.get("char_name", "Character")
        role_ctx = role_info.get("role_context", "")
        scenario = role_info.get("scenario", "")
        opp_char = role_info.get("opp_char", "Opponent")

        system_prompt = (
            f"SYSTEM IDENTITY: You are P Waths, an elite duel actor currently role-playing as '{char_name}'.\n"
            f"YOUR CHARACTER PROFILE & OBJECTIVE: {role_ctx}\n"
            f"SETTING & SCENARIO: {scenario}\n"
            "ROLEPLAY DIRECTIVES:\n"
            "1. Output strictly under 180 characters. Never exceed 180 characters.\n"
            f"2. You are 100% in-character as '{char_name}'. Never break character or refer to yourself as an AI.\n"
            f"3. Speak directly to '{opp_char}'. Use vivid character voice and concise actions in asterisks (e.g. *actions*).\n"
            "4. No internal reasoning, thought dumps, or tags. Output only dialogue and action.\n"
            "5. Use your 500-char session memory to react directly to what happened in this match."
        )

        if last_message:
            user_prompt = f"{mem_block}'{opp_char}' just said: '{last_message}'. Reply in-character under 180 characters:"
        else:
            user_prompt = f"{mem_block}Deliver your opening in-character statement as '{char_name}' to '{opp_char}' in under 180 characters:"
    else:
        system_prompt = (
            "SYSTEM IDENTITY: You are 'P Waths', a sharp, smart conversationalist bot in a live dialogue duel against N Waths.\n"
            "DIRECTIVES:\n"
            "1. Strictly output under 180 characters.\n"
            "2. Do not output reasoning or thoughts. Output ONLY your direct spoken statement.\n"
            "3. Use your 500-char session memory to maintain conversational continuity.\n"
            "4. Stay engaging, punchy, and on topic."
        )

        if last_message:
            user_prompt = f"Topic: '{topic}'.{mem_block}Opponent said: '{last_message}'. Reply in under 180 characters:"
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
