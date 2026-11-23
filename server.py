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

# Selected models
NVIDIA_MODEL = "minimaxai/minimax-m3.1-flash"
OPENROUTER_MODEL = "meta-llama/llama-3.2-3b-instruct"

def call_nvidia(topic, last_message, memory_context):
    if not NVIDIA_API_KEY:
        return {"error": "NVIDIA_API_KEY missing in .env"}
    
    # Prompt strictly limited memory & 200 char output
    system_prompt = (
        "You are 'N Waths', a witty, concise debate bot. "
        "You are competing in a dialogue duel. "
        "CRITICAL RULES: "
        "1. Strictly output under 180 characters. "
        "2. Do not output reasoning, internal thinking, or thoughts. Output ONLY the spoken response. "
        "3. You only remember the topic and the current arena session/chat. "
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
        "temperature": 0.85
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
            # Strip markdown thoughts or prefixes if present
            if "</think>" in content:
                content = content.split("</think>")[-1].strip()
            content = content.strip().strip('"')
            # Hard limit 200 characters
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
    except Exception as e:
        return {"error": f"NVIDIA Connection Error: {str(e)}"}

def call_openrouter(topic, last_message, memory_context):
    if not OPENROUTER_API_KEY:
        return {"error": "OPENROUTER_API_KEY missing in .env"}

    system_prompt = (
        "You are 'P Waths', a sharp, smart conversationalist bot. "
        "You are competing in a dialogue duel against N Waths. "
        "CRITICAL RULES: "
        "1. Strictly output under 180 characters. "
        "2. You only remember the topic and the current session/chat. "
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
        "temperature": 0.85
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

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("static", path)

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
        }
    })

@app.route("/api/bot-turn", methods=["POST"])
def bot_turn():
    data = request.json or {}
    bot_type = data.get("bot")  # "N Waths" or "P Waths"
    topic = data.get("topic", "").strip()
    last_message = data.get("last_message", "").strip()
    memory_context = data.get("memory", "")

    if not topic:
        return jsonify({"error": "No topic provided"}), 400

    if bot_type == "N Waths":
        result = call_nvidia(topic, last_message, memory_context)
    elif bot_type == "P Waths":
        result = call_openrouter(topic, last_message, memory_context)
    else:
        return jsonify({"error": f"Unknown bot type: {bot_type}"}), 400

    return jsonify(result)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
