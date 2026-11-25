import os
import re
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
NVIDIA_MODEL = os.getenv('NVIDIA_MODEL', 'stepfun-ai/step-5-preview')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'meta-llama/llama-3.2-3b-instruct')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b')

def call_arena_master(n_character, p_character, scenario):
    """Arena Master powered by Groq (GPT-OSS) to generate neutral roleplay briefing JSON."""
    if not GROQ_API_KEY:
        return {"error": "GROQ_API_KEY missing in .env", "status_code": 503}

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
        return {"error": f"Groq Arena Master Error {e.code}: {error_body}", "status_code": 502}
    except Exception as e:
        return {"error": f"Groq Connection Error: {str(e)}", "status_code": 502}


def _clamp_num(value, default, cast_fn, min_val, max_val):
    try:
        parsed = cast_fn(value)
    except (ValueError, TypeError):
        return default
    return max(min_val, min(max_val, parsed))


def _parse_bot_config(config, default_model, default_max_tokens):
    config = config or {}
    return {
        "model": (config.get("model") or default_model).strip() or default_model,
        "temperature": _clamp_num(config.get("temperature", 0.7), 0.7, float, 0.0, 1.5),
        "max_chars": _clamp_num(config.get("max_chars", 200), 200, int, 50, 1000),
        "memory_limit": _clamp_num(config.get("memory_limit", 500), 500, int, 100, 2000),
        "top_p": _clamp_num(config.get("top_p", 0.9), 0.9, float, 0.1, 1.0),
        "max_tokens": _clamp_num(config.get("max_tokens", default_max_tokens), default_max_tokens, int, 50, 1000),
    }


def _build_actor_prompts(bot_name, topic, last_message, memory_context, mode, role_info, cfg):
    session_mem = (memory_context or "").strip()
    if len(session_mem) > cfg["memory_limit"]:
        session_mem = session_mem[-cfg["memory_limit"]:]

    mem_block = f"\nSession history (last {cfg['memory_limit']} chars):\n{session_mem}\n" if session_mem else ""
    char_limit_prompt = max(40, cfg["max_chars"] - 20)

    if mode == "roleplay" and role_info:
        char_name = role_info.get("char_name", "Character")
        role_ctx = role_info.get("role_context", "")
        scenario = role_info.get("scenario", "")
        opp_char = role_info.get("opp_char", "Opponent")

        system_prompt = (
            f"SYSTEM IDENTITY: You are {bot_name}, currently role-playing as '{char_name}'.\n"
            f"YOUR CHARACTER PROFILE & OBJECTIVE: {role_ctx}\n"
            f"SETTING & SCENARIO: {scenario}\n"
            "ROLEPLAY DIRECTIVES:\n"
            "1. Answer immediately with dialogue only. Do not spend reasoning tokens or output internal thoughts.\n"
            f"2. Output strictly under {char_limit_prompt} characters. Never exceed {char_limit_prompt} characters.\n"
            f"3. You are 100% in-character as '{char_name}'. Never speak out of character or refer to yourself as an AI.\n"
            f"4. Speak directly to '{opp_char}'. Use vivid character voice and concise actions in asterisks (e.g. *actions*).\n"
            "5. Output ONLY spoken dialogue and action. No meta commentary or reasoning reflections.\n"
            f"6. Use your {cfg['memory_limit']}-char session memory to react directly to what happened in this match."
        )
        if last_message:
            user_prompt = f"{mem_block}'{opp_char}' just said: '{last_message}'. Reply in-character under {char_limit_prompt} characters:"
        else:
            user_prompt = f"{mem_block}Deliver your opening in-character statement as '{char_name}' to '{opp_char}' in under {char_limit_prompt} characters:"
        return system_prompt, user_prompt

    opp_name = "P Waths" if bot_name == "N Waths" else "N Waths"
    system_prompt = (
        f"SYSTEM IDENTITY: You are '{bot_name}', an expressive, witty conversationalist in a live dialogue duel against {opp_name}.\n"
        "DIRECTIVES:\n"
        "1. Answer immediately with dialogue only. Do not spend reasoning tokens.\n"
        f"2. Strictly output under {char_limit_prompt} characters.\n"
        "3. Do not output reasoning or thoughts. Output ONLY your direct spoken statement.\n"
        f"4. Use your {cfg['memory_limit']}-char session memory to maintain conversational continuity.\n"
        "5. Stay engaging, punchy, and on topic."
    )
    if last_message:
        user_prompt = f"Topic: '{topic}'.{mem_block}Opponent said: '{last_message}'. Reply in under {char_limit_prompt} characters:"
    else:
        user_prompt = f"Topic: '{topic}'. Give your opening statement in under {char_limit_prompt} characters:"
    return system_prompt, user_prompt


def _call_openai_compat(
    *,
    bot_name,
    provider_name,
    endpoint,
    api_key,
    key_env_name,
    default_model,
    default_max_tokens,
    extra_headers=None,
    topic,
    last_message,
    memory_context,
    mode="dialogue",
    role_info=None,
    config=None,
):
    if not api_key:
        return {"error": f"{key_env_name} missing in .env", "status_code": 503}

    cfg = _parse_bot_config(config, default_model, default_max_tokens)
    system_prompt, user_prompt = _build_actor_prompts(
        bot_name, topic, last_message, memory_context, mode, role_info, cfg
    )

    payload = {
        "model": cfg["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": cfg["max_tokens"],
        "temperature": cfg["temperature"],
        "top_p": cfg["top_p"],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)

    req = urllib.request.Request(
        endpoint,
        headers=headers,
        data=json.dumps(payload).encode("utf-8"),
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            data = json.loads(res.read())
            choice = data["choices"][0]["message"]
            content = choice.get("content") or ""
            if "</think>" in content:
                content = content.split("</think>")[-1].strip()
            content = content.strip().strip('"')
            if not content and choice.get("reasoning_content"):
                quotes = re.findall(r'"([^"\n]{10,250})"', choice.get("reasoning_content"))
                if quotes:
                    content = quotes[-1].strip()
            if len(content) > cfg["max_chars"]:
                content = content[: cfg["max_chars"] - 3] + "..."
            usage = data.get("usage", {})
            return {
                "text": content,
                "raw_length": len(content),
                "model": cfg["model"],
                "provider": provider_name,
                "tokens": {
                    "prompt": usage.get("prompt_tokens", 0),
                    "completion": usage.get("completion_tokens", 0),
                    "total": usage.get("total_tokens", 0),
                },
            }
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        return {"error": f"{provider_name} API Error {e.code}: {error_body}", "status_code": 502}
    except Exception as e:
        return {"error": f"{provider_name} Connection Error: {str(e)}", "status_code": 502}


def call_nvidia(topic, last_message, memory_context, mode="dialogue", role_info=None, config=None):
    return _call_openai_compat(
        bot_name="N Waths",
        provider_name="NVIDIA NIM",
        endpoint="https://integrate.api.nvidia.com/v1/chat/completions",
        api_key=NVIDIA_API_KEY,
        key_env_name="NVIDIA_API_KEY",
        default_model=NVIDIA_MODEL,
        default_max_tokens=450,
        topic=topic,
        last_message=last_message,
        memory_context=memory_context,
        mode=mode,
        role_info=role_info,
        config=config,
    )


def call_openrouter(topic, last_message, memory_context, mode="dialogue", role_info=None, config=None):
    return _call_openai_compat(
        bot_name="P Waths",
        provider_name="OpenRouter",
        endpoint="https://openrouter.ai/api/v1/chat/completions",
        api_key=OPENROUTER_API_KEY,
        key_env_name="OPENROUTER_API_KEY",
        default_model=OPENROUTER_MODEL,
        default_max_tokens=200,
        extra_headers={
            "HTTP-Referer": "http://127.0.0.1:5000",
            "X-Title": "Waths Arena",
        },
        topic=topic,
        last_message=last_message,
        memory_context=memory_context,
        mode=mode,
        role_info=role_info,
        config=config,
    )

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

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/arena-master/brief", methods=["POST"])
def arena_master_brief():
    data = request.json or {}
    n_character = data.get("n_character", "").strip()
    p_character = data.get("p_character", "").strip()
    scenario = data.get("scenario", "").strip()

    if not n_character or not p_character:
        return jsonify({"error": "Both character names are required"}), 400

    result = call_arena_master(n_character, p_character, scenario)
    status_code = result.pop("status_code", 200)
    return jsonify(result), status_code


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

    config = data.get("config", {})

    if bot_type == "N Waths":
        result = call_nvidia(topic, last_message, memory_context, mode=mode, role_info=role_info, config=config)
    elif bot_type == "P Waths":
        result = call_openrouter(topic, last_message, memory_context, mode=mode, role_info=role_info, config=config)
    else:
        return jsonify({"error": f"Unknown bot type: {bot_type}"}), 400

    status_code = result.pop("status_code", 200)
    return jsonify(result), status_code

@app.route("/<path:path>")
def static_files(path):
    html_path = os.path.join("static", f"{path}.html")
    if os.path.isfile(html_path):
        return send_from_directory("static", f"{path}.html")
    return send_from_directory("static", path)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
