from __future__ import annotations

from io import BytesIO
from threading import Lock

import ctypes
import gc
import os

import requests
import torch

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image, ImageOps
from transformers import (
    AutoImageProcessor,
    AutoModel,
)


PET_ID_MODEL_NAME = (
    "AvitoTech/"
    "DINO-v2-small-for-animal-identification"
)

DEVICE = (
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

CENTER_CROP_KEEP_RATIO = float(
    os.getenv(
        "CENTER_CROP_KEEP_RATIO",
        "0.90",
    )
)

MIN_IMAGE_SIDE_FOR_CROP = int(
    os.getenv(
        "MIN_IMAGE_SIDE_FOR_CROP",
        "160",
    )
)

REQUEST_TIMEOUT_SECONDS = int(
    os.getenv(
        "IMAGE_REQUEST_TIMEOUT",
        "30",
    )
)


# ==========================================
# PYTORCH - MODO BAJA RAM
# ==========================================

try:
    torch.set_num_threads(
        max(
            1,
            min(
                int(
                    os.getenv(
                        "TORCH_NUM_THREADS",
                        "1",
                    )
                ),
                2,
            ),
        )
    )
except Exception:
    pass


try:
    torch.set_num_interop_threads(1)
except Exception:
    pass


# ==========================================
# FASTAPI
# ==========================================

app = FastAPI(
    title=(
        "PawTrace Animal Re-ID - "
        "Production Lite Low RAM"
    ),
    version="1.4.3.22-lite",
    description=(
        "PetIdentity optimizado para "
        "bajo consumo de RAM."
    ),
)


# ==========================================
# ESTADO GLOBAL
# ==========================================

_model_lock = Lock()

# Una sola inferencia por vez.
_inference_lock = Lock()

_pet_id_processor = None
_pet_id_model = None


# ==========================================
# REQUEST MODELS
# ==========================================

class CompareRequest(BaseModel):
    imageA: str
    imageB: str


class EmbedRequest(BaseModel):
    image: str


# ==========================================
# HELPERS DE MEMORIA
# ==========================================

def trim_process_memory():
    """
    Fuerza limpieza de objetos Python,
    cachés de PyTorch y, en Linux,
    devolución de memoria al SO.
    """

    gc.collect()

    if torch.cuda.is_available():
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass

    try:
        libc = ctypes.CDLL(
            "libc.so.6"
        )

        libc.malloc_trim(0)

    except Exception:
        pass


def clamp01(
    value: float,
) -> float:

    return float(
        max(
            0.0,
            min(
                1.0,
                float(value),
            ),
        )
    )


# ==========================================
# CARGAR MODELO PETIDENTITY
# ==========================================

def get_pet_identity_model():
    global _pet_id_processor
    global _pet_id_model

    if (
        _pet_id_processor
        is not None
        and
        _pet_id_model
        is not None
    ):
        return (
            _pet_id_processor,
            _pet_id_model,
        )

    with _model_lock:

        if (
            _pet_id_processor
            is not None
            and
            _pet_id_model
            is not None
        ):
            return (
                _pet_id_processor,
                _pet_id_model,
            )

        print(
            "🪪 Cargando PetIdentity "
            "Production Lite Low RAM...",
            flush=True,
        )

        try:
            processor = (
                AutoImageProcessor
                .from_pretrained(
                    PET_ID_MODEL_NAME
                )
            )

            model = (
                AutoModel
                .from_pretrained(
                    PET_ID_MODEL_NAME
                )
            )

            model = model.to(
                DEVICE
            )

            model.eval()

            _pet_id_processor = (
                processor
            )

            _pet_id_model = (
                model
            )

            print(
                f"✅ PetIdentity cargado "
                f"en {DEVICE}",
                flush=True,
            )

            trim_process_memory()

            return (
                _pet_id_processor,
                _pet_id_model,
            )

        except Exception as error:

            _pet_id_processor = None
            _pet_id_model = None

            trim_process_memory()

            print(
                "❌ Error cargando "
                "PetIdentity:",
                repr(error),
                flush=True,
            )

            raise


# ==========================================
# CARGAR IMAGEN
# ==========================================

def load_image(
    image_url: str,
) -> Image.Image:

    response = None

    try:
        response = requests.get(
            image_url,
            timeout=(
                REQUEST_TIMEOUT_SECONDS
            ),
            headers={
                "User-Agent":
                    "PawTrace-Animal-ReID/1.0",
            },
        )

        response.raise_for_status()

        with Image.open(
            BytesIO(
                response.content
            )
        ) as opened_image:

            image = (
                ImageOps.exif_transpose(
                    opened_image
                )
            )

            image = image.convert(
                "RGB"
            )

            return image.copy()

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=(
                "No se pudo cargar "
                f"la imagen: {str(error)}"
            ),
        )

    finally:
        if response is not None:
            try:
                response.close()
            except Exception:
                pass


# ==========================================
# CROP LIVIANO
# ==========================================

def make_light_identity_crop(
    image: Image.Image,
) -> tuple[Image.Image, bool]:

    width, height = image.size

    if (
        min(
            width,
            height,
        )
        <
        MIN_IMAGE_SIDE_FOR_CROP
    ):
        return image.copy(), False

    ratio = max(
        0.70,
        min(
            1.0,
            CENTER_CROP_KEEP_RATIO,
        ),
    )

    crop_w = int(
        width * ratio
    )

    crop_h = int(
        height * ratio
    )

    left = max(
        0,
        (
            width -
            crop_w
        ) // 2,
    )

    top = max(
        0,
        (
            height -
            crop_h
        ) // 2,
    )

    right = min(
        width,
        left + crop_w,
    )

    bottom = min(
        height,
        top + crop_h,
    )

    if (
        right <= left
        or
        bottom <= top
    ):
        return image.copy(), False

    if (
        right - left == width
        and
        bottom - top == height
    ):
        return image.copy(), False

    cropped = image.crop(
        (
            left,
            top,
            right,
            bottom,
        )
    )

    return cropped.copy(), True


# ==========================================
# EMBEDDING DE UNA SOLA IMAGEN
#
# IMPORTANTE:
# Se procesa UNA sola imagen por forward.
# Después se eliminan todos los tensores
# temporales antes de procesar la siguiente.
# ==========================================

def get_single_pet_identity_embedding(
    image: Image.Image,
) -> torch.Tensor:

    processor, model = (
        get_pet_identity_model()
    )

    inputs = None
    outputs = None
    embedding = None
    result = None

    try:
        inputs = processor(
            images=[
                image.convert("RGB")
            ],
            return_tensors="pt",
        )

        inputs = {
            key:
                value.to(DEVICE)
            for key, value
            in inputs.items()
        }

        with torch.inference_mode():

            outputs = model(
                **inputs
            )

            embedding = (
                outputs
                .last_hidden_state[
                    :,
                    0,
                    :
                ]
            )

            embedding = (
                torch.nn.functional
                .normalize(
                    embedding,
                    p=2,
                    dim=1,
                )
            )

            result = (
                embedding[0]
                .detach()
                .cpu()
                .clone()
            )

        return result

    finally:
        if embedding is not None:
            del embedding

        if outputs is not None:
            del outputs

        if inputs is not None:
            del inputs

        trim_process_memory()
        # ==========================================
# CALIBRACIÓN PETIDENTITY
# ==========================================

def calibrate_pet_identity_similarity(
    raw_similarity: float,
) -> float:

    if raw_similarity <= 0.35:
        return 0.0

    if raw_similarity <= 0.50:
        return (
            (raw_similarity - 0.35)
            / 0.15
            * 0.25
        )

    if raw_similarity <= 0.65:
        return (
            0.25
            +
            (
                (raw_similarity - 0.50)
                / 0.15
                * 0.30
            )
        )

    if raw_similarity <= 0.78:
        return (
            0.55
            +
            (
                (raw_similarity - 0.65)
                / 0.13
                * 0.27
            )
        )

    if raw_similarity <= 0.90:
        return (
            0.82
            +
            (
                (raw_similarity - 0.78)
                / 0.12
                * 0.18
            )
        )

    return 1.0


# ==========================================
# RELIABILITY
# ==========================================

def get_reliability(
    crop_a: bool,
    crop_b: bool,
) -> float:

    if crop_a and crop_b:
        return 1.0

    if crop_a or crop_b:
        return 0.60

    return 0.35


# ==========================================
# VEREDICTO PETIDENTITY
# ==========================================

def pet_identity_verdict(
    raw_similarity: float,
    effective_score: float,
    crop_a: bool,
    crop_b: bool,
) -> str:

    both_crops = (
        crop_a
        and crop_b
    )

    if (
        both_crops
        and raw_similarity >= 0.78
        and effective_score >= 0.80
    ):
        return "strong_identity_match"

    if (
        both_crops
        and raw_similarity >= 0.65
        and effective_score >= 0.55
    ):
        return "possible_identity_match"

    if (
        both_crops
        and raw_similarity <= 0.40
    ):
        return "different_identity"

    if not both_crops:
        return (
            "low_reliability_without_dual_crop"
        )

    return "uncertain_identity"


# ==========================================
# CONSENSUS
# ==========================================

def consensus_verdict(
    score: float,
) -> str:

    if score >= 0.80:
        return "strong"

    if score >= 0.68:
        return "probable"

    if score >= 0.55:
        return "possible"

    return "weak"


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():

    return {
        "service":
            "PawTrace Animal Re-ID",

        "version":
            "1.4.3.22-lite",

        "status":
            "running",

        "mode":
            "production-lite-low-ram",

        "model":
            PET_ID_MODEL_NAME,

        "device":
            DEVICE,

        "modelLoaded":
            _pet_id_model
            is not None,

        "pipeline":
            (
                "download → "
                "lightweight center crop → "
                "sequential PetIdentity inference → "
                "cosine similarity"
            ),

        "endpoints": [
            "/",
            "/health",
            "/compare",
            "/embed",
            "/docs",
        ],
    }


# ==========================================
# HEALTH
# ==========================================

@app.get("/health")
def health():

    return {
        "status":
            "ok",

        "service":
            "pawtrace-animal-reid",

        "version":
            "1.4.3.22-lite",

        "mode":
            "production-lite-low-ram",

        "device":
            DEVICE,

        "model":
            PET_ID_MODEL_NAME,

        "modelLoaded":
            _pet_id_model
            is not None,
    }


# ==========================================
# EMBED
# ==========================================

@app.post("/embed")
def embed(
    payload: EmbedRequest,
):

    original = None
    identity_image = None
    embedding = None

    with _inference_lock:

        try:
            original = load_image(
                payload.image
            )

            (
                identity_image,
                cropped,
            ) = (
                make_light_identity_crop(
                    original
                )
            )

            embedding = (
                get_single_pet_identity_embedding(
                    identity_image
                )
            )

            embedding_list = (
                embedding
                .float()
                .tolist()
            )

            return {
                "embedding":
                    embedding_list,

                "embeddingSize":
                    len(
                        embedding_list
                    ),

                "model":
                    PET_ID_MODEL_NAME,

                "detector":
                    "light-center-crop",

                "device":
                    DEVICE,

                "cropped":
                    cropped,

                "detectionConfidence":
                    None,

                "processingMode":
                    (
                        "production-lite-low-ram-center-crop"
                        if cropped
                        else
                        "production-lite-low-ram-original"
                    ),
            }

        finally:
            if embedding is not None:
                del embedding

            if identity_image is not None:
                try:
                    identity_image.close()
                except Exception:
                    pass

            if original is not None:
                try:
                    original.close()
                except Exception:
                    pass

            trim_process_memory()


# ==========================================
# COMPARE
# ==========================================

@app.post("/compare")
def compare(
    payload: CompareRequest,
):

    print(
        "================================",
        flush=True,
    )

    print(
        "🪪 PETIDENTITY PRODUCTION LITE LOW RAM",
        flush=True,
    )

    print(
        "A:",
        payload.imageA,
        flush=True,
    )

    print(
        "B:",
        payload.imageB,
        flush=True,
    )

    original_a = None
    original_b = None

    image_a = None
    image_b = None

    embedding_a = None
    embedding_b = None

    with _inference_lock:

        try:
            original_a = load_image(
                payload.imageA
            )

            (
                image_a,
                crop_a,
            ) = (
                make_light_identity_crop(
                    original_a
                )
            )

            # ==================================
            # IMAGEN A
            # ==================================

            embedding_a = (
                get_single_pet_identity_embedding(
                    image_a
                )
            )

            # Liberamos A antes de cargar B.
            if image_a is not None:
                try:
                    image_a.close()
                except Exception:
                    pass

                image_a = None

            if original_a is not None:
                try:
                    original_a.close()
                except Exception:
                    pass

                original_a = None

            trim_process_memory()

            # ==================================
            # IMAGEN B
            # ==================================

            original_b = load_image(
                payload.imageB
            )

            (
                image_b,
                crop_b,
            ) = (
                make_light_identity_crop(
                    original_b
                )
            )

            embedding_b = (
                get_single_pet_identity_embedding(
                    image_b
                )
            )

            if image_b is not None:
                try:
                    image_b.close()
                except Exception:
                    pass

                image_b = None

            if original_b is not None:
                try:
                    original_b.close()
                except Exception:
                    pass

                original_b = None

            trim_process_memory()

            # ==================================
            # SIMILITUD
            # ==================================

            raw_similarity = float(
                torch.dot(
                    embedding_a,
                    embedding_b,
                ).item()
            )

            calibrated_score = (
                clamp01(
                    calibrate_pet_identity_similarity(
                        raw_similarity
                    )
                )
            )

            reliability = (
                get_reliability(
                    crop_a,
                    crop_b,
                )
            )

            effective_score = (
                clamp01(
                    calibrated_score
                    *
                    reliability
                )
            )

            verdict = (
                pet_identity_verdict(
                    raw_similarity,
                    effective_score,
                    crop_a,
                    crop_b,
                )
            )

            consensus_score = (
                effective_score
            )

            consensus_percentage = round(
                consensus_score
                *
                100
            )

            c_verdict = (
                consensus_verdict(
                    consensus_score
                )
            )

            embedding_size = int(
                embedding_a.shape[0]
            )

            print(
                "🪪 Resultado PetIdentity:",
                {
                    "rawSimilarity":
                        round(
                            raw_similarity,
                            6,
                        ),

                    "calibratedScore":
                        round(
                            calibrated_score,
                            6,
                        ),

                    "reliability":
                        round(
                            reliability,
                            6,
                        ),

                    "effectiveScore":
                        round(
                            effective_score,
                            6,
                        ),

                    "verdict":
                        verdict,

                    "cropA":
                        crop_a,

                    "cropB":
                        crop_b,

                    "embeddingSize":
                        embedding_size,
                },
                flush=True,
            )

            return {
                "similarity":
                    round(
                        raw_similarity,
                        6,
                    ),

                "percentage":
                    consensus_percentage,

                "model":
                    PET_ID_MODEL_NAME,

                "detector":
                    "light-center-crop",

                "device":
                    DEVICE,

                "embeddingSize":
                    embedding_size,

                "cropA":
                    crop_a,

                "cropB":
                    crop_b,

                "detectionConfidenceA":
                    None,

                "detectionConfidenceB":
                    None,

                "processingMode":
                    "production-lite-low-ram",

                "megaSimilarity":
                    0.0,

                "dinoSimilarity":
                    0.0,

                "megaEmbeddingSize":
                    0,

                "dinoEmbeddingSize":
                    0,

                "dinoModel":
                    "disabled-production-lite",

                "megaScore":
                    0.0,

                "dinoScore":
                    0.0,

                "visualScore":
                    0.0,

                "visualPercentage":
                    0,

                "visualVerdict":
                    "disabled",

                "consensusScore":
                    round(
                        consensus_score,
                        6,
                    ),

                "consensusPercentage":
                    consensus_percentage,

                "consensusVerdict":
                    c_verdict,

                "consensusReason":
                    (
                        "Production Lite Low RAM: "
                        "PetIdentity como único motor"
                    ),

                "petIdentityEnabled":
                    True,

                "petIdentityModel":
                    PET_ID_MODEL_NAME,

                "petIdentitySimilarity":
                    round(
                        raw_similarity,
                        6,
                    ),

                "petIdentityScore":
                    round(
                        calibrated_score,
                        6,
                    ),

                "petIdentityPercentage":
                    round(
                        calibrated_score
                        *
                        100
                    ),

                "petIdentityEmbeddingSize":
                    embedding_size,

                "petIdentityCropA":
                    crop_a,

                "petIdentityCropB":
                    crop_b,

                "petIdentityReliability":
                    round(
                        reliability,
                        6,
                    ),

                "petIdentityEffectiveScore":
                    round(
                        effective_score,
                        6,
                    ),

                "petIdentityEffectivePercentage":
                    round(
                        effective_score
                        *
                        100
                    ),

                "petIdentityVerdict":
                    verdict,

                "primaryEngine":
                    "PetIdentity",

                "primaryEngineScore":
                    round(
                        effective_score,
                        6,
                    ),

                "productionLite":
                    True,

                "lowRamMode":
                    True,

                "cropStrategy":
                    (
                        "center-90-percent"
                        if
                        crop_a
                        and
                        crop_b
                        else
                        "original-fallback"
                    ),
            }

        except HTTPException:
            raise

        except Exception as error:

            print(
                "❌ Error PetIdentity "
                "Production Lite Low RAM:",
                repr(error),
                flush=True,
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Error ejecutando "
                    "PetIdentity: "
                    f"{str(error)}"
                ),
            )

        finally:
            if embedding_a is not None:
                del embedding_a

            if embedding_b is not None:
                del embedding_b

            if image_a is not None:
                try:
                    image_a.close()
                except Exception:
                    pass

            if image_b is not None:
                try:
                    image_b.close()
                except Exception:
                    pass

            if original_a is not None:
                try:
                    original_a.close()
                except Exception:
                    pass

            if original_b is not None:
                try:
                    original_b.close()
                except Exception:
                    pass

            trim_process_memory()