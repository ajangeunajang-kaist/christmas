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
    return r.json()["result"]   # task_id


# ---------------------------------------------------------
# 3. Meshy 폴링 (공용 함수)
# ---------------------------------------------------------
def poll_meshy(task_type: str, task_id: str):

    # Retexture는 v1 API, text-to-3D는 v2 API
    if task_type == "retexture":
        url = f"{MESHY_BASE}/openapi/v1/retexture/{task_id}"
    else:
        url = f"{MESHY_BASE}/openapi/v2/{task_type}/{task_id}"

    status = "IN_PROGRESS"
    result_json = None

    while status not in ("SUCCEEDED", "COMPLETED"):
        time.sleep(4)

        headers = {"Authorization": f"Bearer {MESHY_KEY}"}
        r = requests.get(url, headers=headers)
        r.raise_for_status()
        j = r.json()

        status = j["status"]
        print(f"[Meshy {task_type}] {status}")

        if status in ("SUCCEEDED", "COMPLETED"):
            result_json = j
            break

        if status in ("FAILED", "ERROR"):
            raise RuntimeError(
                f"❌ Meshy {task_type} failed:\n" + json.dumps(j, indent=2)
            )

    return result_json




# ---------------------------------------------------------
# 4. GLB 다운로드 함수
# ---------------------------------------------------------
def download_glb(result_json, object_name, output_dir="./outputs", suffix=""):
    os.makedirs(output_dir, exist_ok=True)

    model_urls = result_json.get("model_urls")
    glb_url = model_urls.get("glb")

    safe = object_name.lower().replace(" ", "_")
    existing = [
        x for x in os.listdir(output_dir)
        if x.startswith(safe) and x.endswith(".glb")
    ]
    idx = len(existing) + 1

    save_path = os.path.join(output_dir, f"{safe}_{idx}{suffix}.glb")

    print(f"[Download GLB] {glb_url} → {save_path}")
    r = requests.get(glb_url)
    r.raise_for_status()

    with open(save_path, "wb") as f:
        f.write(r.content)

    return save_path


# ---------------------------------------------------------
# 5. Retexture API 호출
# ---------------------------------------------------------
def create_retexture_task(model_url: str, same_prompt: str):
    url = f"{MESHY_BASE}/openapi/v1/retexture"
    headers = {
        "Authorization": f"Bearer {MESHY_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model_url": model_url,
        "text_style_prompt": same_prompt,
        "enable_original_uv": True,
        "enable_pbr": False
    }

    r = requests.post(url, headers=headers, json=payload)
    r.raise_for_status()

    return r.json()["result"]   # task_id


# ---------------------------------------------------------
# 전체 파이프라인: Text → 3D → Retexture
# ---------------------------------------------------------
def run_pipeline(text_input: str, image_url: str | None = None):
    print("\n=== STEP 1: ChatGPT object + lowpoly prompt ===")
    info = generate_keyword_and_lowpoly_prompt(text_input, image_url)
    print(info)

    obj = info["object"]
    prompt = f"{obj}. {info['lowpoly_prompt']}"
    print("\n[Text-to-3D Prompt]")
    print(prompt)

    print("\n=== STEP 2: Meshy text-to-3D 생성 요청 ===")
    task_id = create_text_to_3d_task(prompt)
    print("Task ID:", task_id)

    print("\n=== STEP 2b: Meshy text-to-3d 폴링 ===")
    result_json = poll_meshy("text-to-3d", task_id)

    model_url = result_json["model_urls"]["glb"]

    print("\n=== STEP 4: Retexture 작업 생성 ===")
    re_id = create_retexture_task(model_url, prompt)
    print("Retexture Task ID:", re_id)

    print("\n=== STEP 4b: Retexture 폴링 ===")
    retexture_json = poll_meshy("retexture", re_id)

    print("\n=== STEP 5: 재텍스처링 GLB 다운로드 ===")
    retexture_glb = download_glb(retexture_json, obj, suffix="_retexture")
    print("🎉 Retextured GLB:", retexture_glb)
    
    return retexture_glb

# ---------------------------------------------------------
# 실행 예시
# ---------------------------------------------------------
if __name__ == "__main__":
    run_pipeline(
        "올해를 돌아보면 가장 기억에 남는 순간은 뜻밖에도 카피바라를 만났던 날이다. 바쁜 일정 사이에 잠깐 들른 동물 카페에서, 조용히 앉아 있던 카피바라가 나를 보며 천천히 다가왔던 그 순간이 이상할 만큼 마음을 따뜻하게 했다. 그날 느꼋던 평온함은 꽤 오래 지속되어, 쉼의 중요성을 다시 깨닫게 해준 작은 선물처럼 남아 있다. 지금도 그때 찍어둔 사진을 보면 한 해 동안 정신없이 달려온 나에게 잠시 웃음이 돌곤 한다.",
    )
