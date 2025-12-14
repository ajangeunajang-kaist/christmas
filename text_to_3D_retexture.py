"""
pipeline_chatgpt_to_meshy_retexture.py
GPT → Meshy v2 text-to-3d → GLB 다운로드 → Retexture → 최종 GLB 다운로드
"""

from dotenv import load_dotenv
load_dotenv()

import os
import time
import json
import requests
from openai import OpenAI

# ------------------- API KEY -------------------
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
MESHY_KEY = os.getenv("MESHY_API_KEY")

if not OPENAI_KEY or not MESHY_KEY:
    raise SystemExit("환경변수 OPENAI_API_KEY, MESHY_API_KEY 를 설정하세요.")

client = OpenAI(api_key=OPENAI_KEY)
MESHY_BASE = "https://api.meshy.ai"


# ---------------------------------------------------------
# 1. ChatGPT → object + lowpoly prompt
# ---------------------------------------------------------
def generate_keyword_and_lowpoly_prompt(text: str, image_url: str | None = None) -> dict:
    system = (
        "You extract a single object from user inputs (text/image) and produce a lowpoly 3D prompt. "
        "Respond strictly in JSON with keys: object, lowpoly_prompt. "
        "No markdown, no code fences."
    )

    user_text = (
        "I will give you a text and optionally an image URL.\n"
        "From BOTH of them, infer ONE most meaningful object and write a lowpoly 3D prompt.\n\n"
        f"TEXT:\n{text}\n\n"
        f"IMAGE_URL:\n{image_url if image_url else 'None'}\n\n"
        "Respond ONLY in raw JSON with: object, lowpoly_prompt.\n"
        "Lowpoly prompt must include: fewer than 100 quadrilaterals, origami-ready, paper toy, cardboard cutout, simple flat colors accurate to the real object's typical color palette."

        "It must eliminate all fine geometric details (such as toppings, fur strands, thin limbs, ridges, bumps, decorations, or surface noise)." 
        "Preserve only the large essential shapes of the object." 
        "The silhouette must be chunky, blocky, and extremely simplified. "
        "Use clean flat color regions representing the object's typical palette, with no gradients, no spots, and no micro details."
        
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_text},
        ],
        temperature=0.1,
        max_tokens=500,
    )

    return json.loads(resp.choices[0].message.content)


# ---------------------------------------------------------
# 2. Meshy text-to-3D 생성 요청
# ---------------------------------------------------------
def create_text_to_3d_task(prompt: str):
    url = f"{MESHY_BASE}/openapi/v2/text-to-3d"
    headers = {"Authorization": f"Bearer {MESHY_KEY}"}

    payload = {
        "ai_model": "meshy-5",
        "prompt": prompt,
        "mode": "preview",
        "topology": "quad",
        "target_polycount": 100,
    }

    r = requests.post(url, headers=headers, json=payload)
    r.raise_for_status()
    """Compatibility wrapper — re-export run_pipeline from scripts package."""

    from scripts.text_to_3D_retexture import run_pipeline
# ---------------------------------------------------------
