import json
import io
import urllib.error
from unittest.mock import patch

import pytest
import server


class _FakeResponse:
    def __init__(self, payload: dict):
        self._raw = json.dumps(payload).encode("utf-8")

    def read(self):
        return self._raw

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


@pytest.fixture()
def client():
    server.app.config["TESTING"] = True
    with server.app.test_client() as c:
        yield c


def test_pages_and_health(client):
    assert client.get("/").status_code == 200
    assert client.get("/roleplay").status_code == 200
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.get_json() == {"status": "ok"}


def test_bot_info(client):
    res = client.get("/api/bot-info")
    assert res.status_code == 200
    data = res.get_json()
    assert "N Waths" in data
    assert "P Waths" in data
    assert "Arena Master" in data
    assert "has_key" in data["N Waths"]


def test_arena_master_validation_and_missing_key(client, monkeypatch):
    res = client.post("/api/arena-master/brief", json={"n_character": "Kira"})
    assert res.status_code == 400

    monkeypatch.setattr(server, "GROQ_API_KEY", "")
    res = client.post(
        "/api/arena-master/brief",
        json={"n_character": "Kira", "p_character": "L"},
    )
    assert res.status_code == 503
    assert "GROQ_API_KEY" in res.get_json()["error"]


def test_arena_master_success_and_json_parse(client, monkeypatch):
    monkeypatch.setattr(server, "GROQ_API_KEY", "test-groq-key")
    fake_payload = {
        "choices": [
            {
                "message": {
                    "content": '```json\n{"scenario_summary":"Cafe","n_role_context":"Act N","p_role_context":"Act P","first_speaker":"P Waths"}\n```'
                }
            }
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
    }
    with patch("urllib.request.urlopen", return_value=_FakeResponse(fake_payload)):
        res = client.post(
            "/api/arena-master/brief",
            json={"n_character": "Kira", "p_character": "L", "scenario": "Cafe"},
        )
    assert res.status_code == 200
    body = res.get_json()
    assert body["briefing"]["first_speaker"] == "P Waths"
    assert body["tokens"]["total"] == 30


def test_bot_turn_validation_and_clamping(client, monkeypatch):
    assert client.post("/api/bot-turn", json={"bot": "N Waths"}).status_code == 400
    assert client.post("/api/bot-turn", json={"bot": "Unknown", "topic": "AI"}).status_code == 400

    monkeypatch.setattr(server, "NVIDIA_API_KEY", "test-nv-key")
    captured_payload = {}

    def _mock_urlopen(req, timeout=90):
        captured_payload.update(json.loads(req.data.decode("utf-8")))
        return _FakeResponse(
            {
                "choices": [
                    {
                        "message": {
                            "content": "",
                            "reasoning_content": 'Drafting: "Hello there, worthy rival!"',
                        }
                    }
                ],
                "usage": {"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12},
            }
        )

    with patch("urllib.request.urlopen", side_effect=_mock_urlopen):
        res = client.post(
            "/api/bot-turn",
            json={
                "bot": "N Waths",
                "topic": "AI",
                "config": {"temperature": 9.9, "max_tokens": 5000, "max_chars": 60},
            },
        )
    assert res.status_code == 200
    assert captured_payload["temperature"] == 1.5
    assert captured_payload["max_tokens"] == 1000
    assert res.get_json()["text"] == "Hello there, worthy rival!"


def test_bot_turn_truncation_and_http_error(client, monkeypatch):
    monkeypatch.setattr(server, "OPENROUTER_API_KEY", "test-or-key")
    long_text = "x" * 120

    with patch(
        "urllib.request.urlopen",
        return_value=_FakeResponse({"choices": [{"message": {"content": long_text}}], "usage": {}}),
    ):
        res = client.post(
            "/api/bot-turn",
            json={"bot": "P Waths", "topic": "AI", "config": {"max_chars": 50}},
        )
    assert res.status_code == 200
    assert len(res.get_json()["text"]) == 50
    assert res.get_json()["text"].endswith("...")

    http_err = urllib.error.HTTPError(
        url="https://openrouter.ai/api/v1/chat/completions",
        code=429,
        msg="Too Many Requests",
        hdrs=None,
        fp=io.BytesIO(b"rate limit"),
    )
    with patch("urllib.request.urlopen", side_effect=http_err):
        err_res = client.post("/api/bot-turn", json={"bot": "P Waths", "topic": "AI"})
    assert err_res.status_code == 502
    assert "429" in err_res.get_json()["error"]
