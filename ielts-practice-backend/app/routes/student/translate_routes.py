"""Server-side proxy for the in-browser translator/dictionary (student app).

Historically the student site called Groq directly from the browser using a
REACT_APP_GROQ_API_KEY baked into the public bundle — i.e. the key was exposed
to anyone. These endpoints move that call server-side so the browser never holds
a Groq key. Uses its own dedicated key (GROQ_TRANSLATE_API_KEY), separate from
the essay-grading keys, so it can be rotated/revoked independently.

Auth-gated with get_current_student to prevent the proxy being used as a free
public translation API.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import json
import groq

from app.routes.student.student_actions import get_current_student
from app.models.models import User
from app.utils.datetime_utils import get_vietnam_time

router = APIRouter()

MODEL = "llama-3.1-8b-instant"


def _client() -> groq.Groq:
    # Lazy init so the app still boots if the key isn't configured; the error
    # only surfaces when the feature is actually used.
    key = os.getenv("GROQ_TRANSLATE_API_KEY")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="Translation service is not configured (GROQ_TRANSLATE_API_KEY missing).",
        )
    return groq.Groq(api_key=key)


class TranslateRequest(BaseModel):
    text: str
    sourceLanguage: str = "English"
    targetLanguage: str = "Vietnamese"


class DictionaryRequest(BaseModel):
    word: str


@router.post("/translate")
async def translate_text(
    body: TranslateRequest,
    current_student: User = Depends(get_current_student),
):
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text to translate cannot be empty")

    prompt = (
        f"Translate the following {body.sourceLanguage} text to {body.targetLanguage}. "
        "Provide only the translation without any additional explanation or formatting. "
        "Consider the context and provide the most appropriate translation:\n\n"
        f'"{text}"'
    )

    try:
        resp = _client().chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional translator specializing in English to "
                        "Vietnamese translation. Provide accurate, contextually appropriate "
                        "translations. For IELTS exam content, maintain the academic tone and "
                        "precision."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=500,
            top_p=1,
            stream=False,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Translation failed: {e}")

    translation = (resp.choices[0].message.content or "").strip()
    # Strip wrapping quotes if the model added them.
    cleaned = translation.strip("\"'")

    return {
        "originalText": text,
        "translatedText": cleaned,
        "sourceLanguage": body.sourceLanguage,
        "targetLanguage": body.targetLanguage,
        "timestamp": get_vietnam_time().isoformat(),
    }


@router.post("/dictionary")
async def dictionary_lookup(
    body: DictionaryRequest,
    current_student: User = Depends(get_current_student),
):
    word = (body.word or "").strip()
    if not word:
        raise HTTPException(status_code=400, detail="Word cannot be empty")

    prompt = (
        f'Provide a detailed dictionary entry for the English word "{word}". '
        "Return ONLY a valid JSON object with this exact structure (no markdown, no code "
        "blocks, just raw JSON):\n"
        "{\n"
        f'  "word": "{word}",\n'
        '  "phonetics": {\n'
        '    "uk": "/phonetic transcription UK/",\n'
        '    "us": "/phonetic transcription US/"\n'
        "  },\n"
        '  "meanings": [\n'
        "    {\n"
        '      "partOfSpeech": "part of speech in Vietnamese (e.g., Danh từ, Động từ, Tính từ)",\n'
        '      "definitions": [\n'
        "        {\n"
        '          "meaning": "Vietnamese translation/definition",\n'
        '          "example": "Example sentence in English if available",\n'
        '          "exampleTrans": "Vietnamese translation of example"\n'
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- Use IPA for phonetics\n"
        "- Translate part of speech to Vietnamese (Danh từ, Động từ, Tính từ, Trạng từ, Giới từ, etc.)\n"
        "- Provide Vietnamese meanings/definitions\n"
        "- Include examples when relevant\n"
        "- Return ONLY the JSON object, no other text"
    )

    try:
        resp = _client().chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional English-Vietnamese dictionary. Return ONLY "
                        "valid JSON with no markdown formatting."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=1000,
            top_p=1,
            stream=False,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Dictionary lookup failed: {e}")

    content = (resp.choices[0].message.content or "").strip()
    # Handle models that wrap JSON in ```json fences despite instructions.
    if "```" in content:
        content = content.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid response format from dictionary service")
