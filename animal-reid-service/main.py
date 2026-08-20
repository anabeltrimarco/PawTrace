from __future__ import annotations

from io import BytesIO
from threading import Lock
import gc
import os

import requests
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image, ImageOps
from transformers import AutoImageProcessor, AutoModel

PET_ID_MODEL_NAME = "AvitoTech/DINO-v2-small-for-animal-identification"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
CENTER_CROP_KEEP_RATIO = float(os.getenv("CENTER_CROP_KEEP_RATIO", "0.90"))
MIN_IMAGE_SIDE_FOR_CROP = int(os.getenv("MIN_IMAGE_SIDE_FOR_CROP", "160"))
REQUEST_TIMEOUT_SECONDS = int(os.getenv("IMAGE_REQUEST_TIMEOUT", "30"))

try:
    torch.set_num_threads(max(1, min(int(os.getenv("TORCH_NUM_THREADS", "1")), 2)))
except Exception:
    pass

app = FastAPI(
    title="PawTrace Animal Re-ID - Production Lite",
    version="1.4.3.20-lite",
    description="PetIdentity especializado con lazy loading y bajo consumo de memoria.",
)

_model_lock = Lock()
_inference_lock = Lock()
_pet_id_processor = None
_pet_id_model = None

class CompareRequest(BaseModel):
    imageA: str
    imageB: str

class EmbedRequest(BaseModel):
    image: str


def clamp01(value: float) -> float:
    return float(max(0.0, min(1.0, float(value))))


def get_pet_identity_model():
    global _pet_id_processor, _pet_id_model
    if _pet_id_processor is not None and _pet_id_model is not None:
        return _pet_id_processor, _pet_id_model

    with _model_lock:
        if _pet_id_processor is not None and _pet_id_model is not None:
            return _pet_id_processor, _pet_id_model

        print("🪪 Cargando PetIdentity Production Lite...", flush=True)
        try:
            processor = AutoImageProcessor.from_pretrained(PET_ID_MODEL_NAME)
            model = AutoModel.from_pretrained(PET_ID_MODEL_NAME)
            model = model.to(DEVICE)
            model.eval()
            _pet_id_processor = processor
            _pet_id_model = model
            print(f"✅ PetIdentity cargado en {DEVICE}", flush=True)
            return _pet_id_processor, _pet_id_model
        except Exception as error:
            _pet_id_processor = None
            _pet_id_model = None
            gc.collect()
            print("❌ Error cargando PetIdentity:", repr(error), flush=True)
            raise


def load_image(image_url: str) -> Image.Image:
    try:
        response = requests.get(
            image_url,
            timeout=REQUEST_TIMEOUT_SECONDS,
            headers={"User-Agent": "PawTrace-Animal-ReID/1.0"},
        )
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        image = ImageOps.exif_transpose(image)
        return image.convert("RGB")
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo cargar la imagen: {str(error)}",
        )


def make_light_identity_crop(image: Image.Image) -> tuple[Image.Image, bool]:
    """
    Recorte central liviano para reducir fondo sin cargar un detector.
    No equivale al crop validado con MegaDetector y debe revalidarse.
    """
    width, height = image.size
    if min(width, height) < MIN_IMAGE_SIDE_FOR_CROP:
        return image, False

    ratio = max(0.70, min(1.0, CENTER_CROP_KEEP_RATIO))
    crop_w = int(width * ratio)
    crop_h = int(height * ratio)
    left = max(0, (width - crop_w) // 2)
    top = max(0, (height - crop_h) // 2)
    right = min(width, left + crop_w)
    bottom = min(height, top + crop_h)

    if right <= left or bottom <= top:
        return image, False
    if right - left == width and bottom - top == height:
        return image, False

    return image.crop((left, top, right, bottom)), True


def get_pet_identity_embedding(image: Image.Image) -> torch.Tensor:
    processor, model = get_pet_identity_model()
    inputs = processor(images=[image.convert("RGB")], return_tensors="pt")
    inputs = {key: value.to(DEVICE) for key, value in inputs.items()}

    with torch.inference_mode():
        outputs = model(**inputs)
        embedding = outputs.last_hidden_state[:, 0, :]
        embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)

    return embedding[0].detach().cpu()


def calibrate_pet_identity_similarity(raw_similarity: float) -> float:
    if raw_similarity <= 0.35:
        return 0.0
    if raw_similarity <= 0.50:
        return (raw_similarity - 0.35) / 0.15 * 0.25
    if raw_similarity <= 0.65:
        return 0.25 + ((raw_similarity - 0.50) / 0.15 * 0.30)
    if raw_similarity <= 0.78:
        return 0.55 + ((raw_similarity - 0.65) / 0.13 * 0.27)
    if raw_similarity <= 0.90:
        return 0.82 + ((raw_similarity - 0.78) / 0.12 * 0.18)
    return 1.0


def get_reliability(crop_a: bool, crop_b: bool) -> float:
    if crop_a and crop_b:
        return 1.0
    if crop_a or crop_b:
        return 0.60
    return 0.35


def pet_identity_verdict(
    raw_similarity: float,
    effective_score: float,
    crop_a: bool,
    crop_b: bool,
) -> str:
    both_crops = crop_a and crop_b
    if both_crops and raw_similarity >= 0.78 and effective_score >= 0.80:
        return "strong_identity_match"
    if both_crops and raw_similarity >= 0.65 and effective_score >= 0.55:
        return "possible_identity_match"
    if both_crops and raw_similarity <= 0.40:
        return "different_identity"
    if not both_crops:
        return "low_reliability_without_dual_crop"
    return "uncertain_identity"


def consensus_verdict(score: float) -> str:
    if score >= 0.80:
        return "strong"
    if score >= 0.68:
        return "probable"
    if score >= 0.55:
        return "possible"
    return "weak"


@app.get("/")
def root():
    return {
        "service": "PawTrace Animal Re-ID",
        "version": "1.4.3.20-lite",
        "status": "running",
        "mode": "production-lite",
        "model": PET_ID_MODEL_NAME,
        "device": DEVICE,
        "modelLoaded": _pet_id_model is not None,
        "pipeline": "download → lightweight center crop → PetIdentity → cosine similarity",
        "endpoints": ["/", "/health", "/compare", "/embed", "/docs"],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "pawtrace-animal-reid",
        "version": "1.4.3.20-lite",
        "mode": "production-lite",
        "device": DEVICE,
        "model": PET_ID_MODEL_NAME,
        "modelLoaded": _pet_id_model is not None,
    }


@app.post("/embed")
def embed(payload: EmbedRequest):
    # Serializamos la inferencia para evitar picos de RAM cuando Railway
    # recibe varias solicitudes al mismo tiempo.
    with _inference_lock:
        original = None
        identity_image = None
        embedding = None

        try:
            original = load_image(payload.image)
            identity_image, cropped = make_light_identity_crop(original)
            embedding = get_pet_identity_embedding(identity_image)
            embedding_list = embedding.float().tolist()

            return {
                "embedding": embedding_list,
                "embeddingSize": len(embedding_list),
                "model": PET_ID_MODEL_NAME,
                "detector": "light-center-crop",
                "device": DEVICE,
                "cropped": cropped,
                "detectionConfidence": None,
                "processingMode": (
                    "production-lite-center-crop"
                    if cropped
                    else "production-lite-original"
                ),
            }
        finally:
            del embedding
            del identity_image
            del original
            gc.collect()

            if torch.cuda.is_available():
                torch.cuda.empty_cache()


@app.post("/compare")
def compare(payload: CompareRequest):
    print("================================", flush=True)
    print("🪪 PETIDENTITY PRODUCTION LITE", flush=True)
    print("A:", payload.imageA, flush=True)
    print("B:", payload.imageB, flush=True)

    # FastAPI puede ejecutar varias solicitudes sync en paralelo.
    # Este lock evita picos de RAM que terminan el contenedor con "Killed".
    with _inference_lock:
        original_a = None
        original_b = None
        image_a = None
        image_b = None
        embedding_a = None
        embedding_b = None

        try:
            original_a = load_image(payload.imageA)
            original_b = load_image(payload.imageB)
            image_a, crop_a = make_light_identity_crop(original_a)
            image_b, crop_b = make_light_identity_crop(original_b)

            embedding_a = get_pet_identity_embedding(image_a)
            embedding_b = get_pet_identity_embedding(image_b)

            raw_similarity = float(torch.dot(embedding_a, embedding_b).item())
            calibrated_score = clamp01(calibrate_pet_identity_similarity(raw_similarity))
            reliability = get_reliability(crop_a, crop_b)
            effective_score = clamp01(calibrated_score * reliability)
            verdict = pet_identity_verdict(raw_similarity, effective_score, crop_a, crop_b)

            consensus_score = effective_score
            consensus_percentage = round(consensus_score * 100)
            c_verdict = consensus_verdict(consensus_score)
            embedding_size = int(embedding_a.shape[0])

            print(
                "🪪 Resultado PetIdentity:",
                {
                    "rawSimilarity": round(raw_similarity, 6),
                    "calibratedScore": round(calibrated_score, 6),
                    "reliability": round(reliability, 6),
                    "effectiveScore": round(effective_score, 6),
                    "verdict": verdict,
                    "cropA": crop_a,
                    "cropB": crop_b,
                    "embeddingSize": embedding_size,
                },
                flush=True,
            )

            return {
                "similarity": round(raw_similarity, 6),
                "percentage": consensus_percentage,
                "model": PET_ID_MODEL_NAME,
                "detector": "light-center-crop",
                "device": DEVICE,
                "embeddingSize": embedding_size,
                "cropA": crop_a,
                "cropB": crop_b,
                "detectionConfidenceA": None,
                "detectionConfidenceB": None,
                "processingMode": "production-lite",
                "megaSimilarity": 0.0,
                "dinoSimilarity": 0.0,
                "megaEmbeddingSize": 0,
                "dinoEmbeddingSize": 0,
                "dinoModel": "disabled-production-lite",
                "megaScore": 0.0,
                "dinoScore": 0.0,
                "visualScore": 0.0,
                "visualPercentage": 0,
                "visualVerdict": "disabled",
                "consensusScore": round(consensus_score, 6),
                "consensusPercentage": consensus_percentage,
                "consensusVerdict": c_verdict,
                "consensusReason": "Production Lite: PetIdentity especializado como único motor",
                "petIdentityEnabled": True,
                "petIdentityModel": PET_ID_MODEL_NAME,
                "petIdentitySimilarity": round(raw_similarity, 6),
                "petIdentityScore": round(calibrated_score, 6),
                "petIdentityPercentage": round(calibrated_score * 100),
                "petIdentityEmbeddingSize": embedding_size,
                "petIdentityCropA": crop_a,
                "petIdentityCropB": crop_b,
                "petIdentityReliability": round(reliability, 6),
                "petIdentityEffectiveScore": round(effective_score, 6),
                "petIdentityEffectivePercentage": round(effective_score * 100),
                "petIdentityVerdict": verdict,
                "primaryEngine": "PetIdentity",
                "primaryEngineScore": round(effective_score, 6),
                "productionLite": True,
                "cropStrategy": "center-90-percent" if crop_a and crop_b else "original-fallback",
            }

        except HTTPException:
            raise
        except Exception as error:
            print("❌ Error PetIdentity Production Lite:", repr(error), flush=True)
            raise HTTPException(
                status_code=500,
                detail=f"Error ejecutando PetIdentity: {str(error)}",
            )
        finally:
            del embedding_a
            del embedding_b
            del image_a
            del image_b
            del original_a
            del original_b
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()