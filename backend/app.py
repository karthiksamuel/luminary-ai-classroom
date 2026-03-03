import os
import json
import hashlib
import requests
from pathlib import Path
from io import BytesIO

from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY  = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
MANIM_API_URL       = os.getenv("MANIM_API_URL", "http://localhost:3001")
RENDER_API_SECRET   = os.getenv("RENDER_API_SECRET", "")

CACHE_DIR = Path(__file__).parent / "cache"
(CACHE_DIR / "audio").mkdir(parents=True, exist_ok=True)
(CACHE_DIR / "video").mkdir(parents=True, exist_ok=True)
(CACHE_DIR / "lessons").mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=GEMINI_API_KEY)
GEMINI_MODEL = "gemini-2.5-flash-lite"


SUMMARY_SYSTEM = """
You write ultra-concise study notes for a lesson history sidebar.
Turn the provided raw text (often an animation prompt) into a helpful summary.

Return ONLY valid JSON (no markdown):
{
    "summary": "<1-2 sentence learner-friendly summary>",
    "keyPoints": ["<optional short bullets>"]
}

Rules:
- summary must be <= 160 characters if possible.
- Avoid quoting the original prompt verbatim.
- Prefer the actual concept over describing that we 'animate' something.
- keyPoints: 0-3 items, each <= 60 characters.
"""


def md5(text):
    return hashlib.md5(text.encode()).hexdigest()

def cache_path(subdir, key, ext):
    return CACHE_DIR / subdir / f"{key}{ext}"


def _gemini_summary(text: str):
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"Summarize this for lesson history: {text}",
            config=types.GenerateContentConfig(
                system_instruction=SUMMARY_SYSTEM,
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )
        raw = response.text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
        summary = str(data.get("summary", "")).strip()
        key_points = data.get("keyPoints", [])
        if not summary:
            return None
        if not isinstance(key_points, list):
            key_points = []
        key_points = [str(x).strip() for x in key_points if str(x).strip()]
        return {"summary": summary, "keyPoints": key_points[:3]}
    except Exception as e:
        print(f"[Gemini summary] {e}")
        return None


@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.get_json(force=True)
    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    key = md5(f"summary::{text}")
    cache_file = cache_path("lessons", f"summary_{key}", ".json")
    if cache_file.exists():
        return jsonify(json.loads(cache_file.read_text()))

    result = _gemini_summary(text)
    if not result:
        # Simple deterministic fallback: strip 'animate' framing.
        cleaned = text.replace("Animate", "").replace("animate", "").strip()
        summary = cleaned
        if len(summary) > 160:
            summary = summary[:157] + "…"
        result = {"summary": summary, "keyPoints": []}

    cache_file.write_text(json.dumps(result))
    return jsonify(result)


# ── Lesson generation ──────────────────────────────────────────────────────

LESSON_SYSTEM = """
You are luminary — a world-class teacher. Generate a structured 5-segment lesson.
Return ONLY a valid JSON object — no markdown, no code fences, no explanation.

Schema:
{
  "subject": "<subject>",
  "topic": "<topic>",
  "segments": [
    {
      "id": 1,
      "spokenText": "2-3 warm, natural teacher sentences for this segment.",
      "boardAction": "write" | "animate" | "clear",
      "boardText": "Short chalk heading ≤10 words. Omit when boardAction is animate.",
      "manimScript": "Vivid 1-2 sentence plain-English description of what to animate visually. Only present when boardAction is animate.",
      "avatarPosition": "left" | "center" | "right" | "board"
    }
  ]
}

Rules:
- Exactly 5 segments.
- At least 2 segments must use boardAction "animate" with a manimScript.
- Segment 1 and 5 must have avatarPosition "center".
- When avatarPosition is "board", boardAction must be "animate" or "write".
- spokenText must be conversational and warm — never bullet points.
- manimScript should describe visual motion: shapes, labels, colors, transitions.
"""


@app.route("/generate-lesson", methods=["POST"])
def generate_lesson():
    data    = request.get_json(force=True)
    subject = str(data.get("subject", "")).strip()
    topic   = str(data.get("topic", "")).strip()
    if not subject or not topic:
        return jsonify({"error": "subject and topic are required"}), 400

    key        = md5(f"{subject}::{topic}")
    cache_file = cache_path("lessons", f"lesson_{key}", ".json")
    if cache_file.exists():
        return jsonify(json.loads(cache_file.read_text()))

    lesson = (
        _gemini_lesson(subject, topic, strict=False)
        or _gemini_lesson(subject, topic, strict=True)
        or _fallback_lesson(subject, topic)
    )
    cache_file.write_text(json.dumps(lesson))
    return jsonify(lesson)


def _gemini_lesson(subject, topic, strict=False):
    system = LESSON_SYSTEM
    if strict:
        system += "\nIMPORTANT: Output ONLY the JSON object. No other text whatsoever."
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"Generate a lesson. subject='{subject}', topic='{topic}'",
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        raw = response.text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        lesson = json.loads(raw)
        assert isinstance(lesson.get("segments"), list) and len(lesson["segments"]) == 5
        return lesson
    except Exception as e:
        print(f"[Gemini lesson] {e}")
        return None


def _fallback_lesson(subject, topic):
    return {
        "subject": subject, "topic": topic,
        "segments": [
            {"id":1,"spokenText":f"Welcome! Today we're exploring {topic} in {subject}. It's one of the most fascinating areas in this field.","boardAction":"write","boardText":topic,"avatarPosition":"center"},
            {"id":2,"spokenText":f"Let's start with the foundational concepts of {topic}.","boardAction":"animate","manimScript":f"Animate the title '{topic}' appearing in large text, then have key concept labels fade in around it.","avatarPosition":"board"},
            {"id":3,"spokenText":"Now let's look at how this works step by step.","boardAction":"write","boardText":"Step-by-step mechanism","avatarPosition":"right"},
            {"id":4,"spokenText":f"Here is a visualization that captures the essence of {topic}. Notice how the components interact.","boardAction":"animate","manimScript":f"Show an animated diagram of {topic} in {subject} with arrows showing relationships between labeled components.","avatarPosition":"board"},
            {"id":5,"spokenText":f"Excellent work today. You now have a solid grasp of {topic}. Remember the key insight: how all the pieces fit together beautifully.","boardAction":"write","boardText":"Lesson complete ✓","avatarPosition":"center"},
        ],
    }


# ── Manim rendering ────────────────────────────────────────────────────────

@app.route("/render-manim", methods=["POST"])
def render_manim():
    data     = request.get_json(force=True)
    context  = str(data.get("script", "")).strip()
    duration = int(data.get("duration", 12))
    if not context:
        return jsonify({"error": "script is required"}), 400

    key        = md5(f"{context}::{duration}")
    cache_file = cache_path("video", key, ".mp4")
    if cache_file.exists():
        return send_file(str(cache_file), mimetype="video/mp4")

    try:
        headers = {"Authorization": f"Bearer {RENDER_API_SECRET}"} if RENDER_API_SECRET else {}
        r = requests.post(f"{MANIM_API_URL}/generate",
                          json={"context": context, "duration": duration},
                          headers=headers, timeout=120)
        r.raise_for_status()
        result = r.json()
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    if not result.get("success") or not result.get("videoUrl"):
        return jsonify({"error": "Render failed", "detail": result}), 500

    video_url = result["videoUrl"]
    if not video_url.startswith("http"):
        video_url = MANIM_API_URL.rstrip("/") + "/" + video_url.lstrip("/")

    try:
        video_bytes = requests.get(video_url, timeout=60).content
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    cache_file.write_bytes(video_bytes)
    return send_file(BytesIO(video_bytes), mimetype="video/mp4")


# ── Voice synthesis ────────────────────────────────────────────────────────

@app.route("/synthesize-voice", methods=["POST"])
def synthesize_voice():
    data = request.get_json(force=True)
    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    key        = md5(text)
    cache_file = cache_path("audio", key, ".mp3")
    if cache_file.exists():
        return send_file(str(cache_file), mimetype="audio/mpeg")

    try:
        resp = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}",
            headers={"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"},
            json={"text": text, "model_id": "eleven_turbo_v2_5",
                  "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.3, "use_speaker_boost": True}},
            timeout=30,
        )
        resp.raise_for_status()
        audio = resp.content
    except Exception as e:
        print(f"[ElevenLabs] {e}")
        return Response(b"", status=200, mimetype="audio/mpeg")

    cache_file.write_bytes(audio)
    return send_file(BytesIO(audio), mimetype="audio/mpeg")


# ── Student response ───────────────────────────────────────────────────────

RESPONSE_SYSTEM = """
You are a warm, expert AI teacher mid-lesson. A student has just spoken to you.
Respond as a real teacher would: thoroughly, clearly, and with genuine enthusiasm.
Return ONLY valid JSON — no markdown, no code fences:

{
  "inputType": "question" | "confusion" | "acknowledgment",
  "spokenText": "Your spoken response. For questions and confusion, give a real explanation — 4-6 sentences minimum. Break the concept down step by step. Use analogies. Make it click. For acknowledgments, give brief warm encouragement (1-2 sentences).",
  "boardUpdate": "A short but meaningful chalk note that captures the core idea you just explained — max 10 words. ALWAYS include this field."
}

Rules:
- inputType "question": The student asked about something. Explain it fully and clearly, as if this is the most important thing they could learn right now. Don't just restate the question — actually teach it.
- inputType "confusion": The student is lost. Simplify. Use a concrete real-world analogy. Re-explain from first principles.
- inputType "acknowledgment": The student understood or agreed. Keep it brief and move on warmly.
- boardUpdate MUST always be present. Make it a genuinely useful summary (e.g. "slope = rate of change", "F = ma → force causes acceleration").
- spokenText must be conversational, never bullet points. Write as you would actually speak.
"""


@app.route("/student-response", methods=["POST"])
def student_response():
    data            = request.get_json(force=True)
    transcript      = str(data.get("transcript", "")).strip()
    subject         = str(data.get("subject", ""))
    topic           = str(data.get("topic", ""))
    current_segment = data.get("currentSegmentId", 0)
    if not transcript:
        return jsonify({"error": "transcript is required"}), 400

    prompt = (
        f"Subject: {subject}\n"
        f"Topic: {topic}\n"
        f"Current lesson segment: {current_segment} of 5\n"
        f"Student said: \"{transcript}\"\n\n"
        f"Respond as the teacher. If the student is asking about something related to {topic}, "
        f"give a thorough explanation. If they ask about something else entirely, briefly address it "
        f"and gently redirect back to {topic}."
    )
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL, contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=RESPONSE_SYSTEM,
                response_mime_type="application/json",
                temperature=0.8,
            ),
        )
        raw = response.text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return jsonify(json.loads(raw))
    except Exception as e:
        print(f"[student-response] {e}")
        return jsonify({
            "inputType": "question",
            "spokenText": f"That's a great question about {topic}. The core idea here is that every concept builds on what came before — let's keep working through it together and I'll make sure it clicks.",
            "boardUpdate": f"Keep going — {topic}",
        })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "luminary"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"luminary backend → http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
