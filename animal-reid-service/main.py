# ==========================================
# PAWTRACE - ANIMAL RE-ID SERVICE
#
# Sprint 1.4.3.6.2
#
# Re-ID híbrido:
#
# MegaDetector
#      ↓
# imagen original + crop
#      ↓
# ┌───────────────────────┐
# │ MegaDescriptor        │
# │ DINOv2 Small          │
# └───────────────────────┘
#
# IMPORTANTE:
# - /embed sigue devolviendo MegaDescriptor
#   para mantener compatibilidad con Node.
#
# - /embed-dino devuelve DINOv2.
#
# - /compare calcula ambos por separado.
#
# Todavía NO mezclamos ambos scores.
# Primero medimos cuál funciona mejor.
# ==========================================

from io import BytesIO
from typing import Optional

import numpy as np
import requests
import timm
import torch

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
from torchvision import transforms

from timm.data import (
    resolve_model_data_config,
    create_transform,
)


# ==========================================
# CONFIGURACIÓN
# ==========================================

MEGA_MODEL_NAME = (
    "hf-hub:BVRA/MegaDescriptor-L-384"
)

DINO_MODEL_NAME = (
    "vit_small_patch14_dinov2.lvd142m"
)

MEGADETECTOR_VERSION = (
    "MDV6-yolov10-c"
)

DEVICE = (
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

DETECTION_CONFIDENCE = 0.20

CROP_MARGIN = 0.15


# ==========================================
# PESOS ORIGINAL + CROP
# ==========================================

ORIGINAL_WEIGHT = 0.35
CROP_WEIGHT = 0.65


# ==========================================
# FASTAPI
# ==========================================

app = FastAPI(
    title="PawTrace Animal Re-ID",
    version="1.4.3.6.2",
    description=(
        "Re-identificación animal híbrida "
        "con MegaDescriptor + DINOv2 "
        "y detección mediante MegaDetector."
    ),
)


# ==========================================
# LAZY LOADING DE MODELOS
#
# Railway puede quedarse sin memoria si
# cargamos todos los modelos al iniciar.
# Los modelos se cargan sólo cuando un
# endpoint de IA realmente los necesita.
# ==========================================

mega_model = None
dino_model = None
detector_model = None
dino_transform = None


# ==========================================
# TRANSFORM MEGADESCRIPTOR
#
# Este transform es liviano y puede quedar
# preparado desde el inicio.
# ==========================================

mega_transform = transforms.Compose(
    [
        transforms.Resize((384, 384)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.5, 0.5, 0.5],
            std=[0.5, 0.5, 0.5],
        ),
    ]
)


def get_mega_model():
    global mega_model

    if mega_model is None:
        print("🐾 Cargando MegaDescriptor bajo demanda...")

        mega_model = timm.create_model(
            MEGA_MODEL_NAME,
            pretrained=True,
        )

        mega_model = mega_model.to(DEVICE)
        mega_model.eval()

        print(f"✅ MegaDescriptor cargado en {DEVICE}")

    return mega_model


def get_dino_model():
    global dino_model
    global dino_transform

    if dino_model is None:
        print("🦖 Cargando DINOv2 bajo demanda...")

        dino_model = timm.create_model(
            DINO_MODEL_NAME,
            pretrained=True,
            num_classes=0,
        )

        dino_model = dino_model.to(DEVICE)
        dino_model.eval()

        dino_data_config = resolve_model_data_config(
            dino_model
        )

        dino_transform = create_transform(
            **dino_data_config,
            is_training=False,
        )

        print(
            "✅ DINOv2 cargado y transform configurado:",
            {
                "device": DEVICE,
                "input_size": dino_data_config.get("input_size"),
                "mean": dino_data_config.get("mean"),
                "std": dino_data_config.get("std"),
            },
        )

    return dino_model


def get_detector_model():
    global detector_model

    if detector_model is None:
        print("🔎 Cargando MegaDetector bajo demanda...")

        # Import tardío intencional: PytorchWildlife es pesado
        # y no debe bloquear el arranque de FastAPI.
        from PytorchWildlife.models import (
            detection as pw_detection,
        )

        detector_model = pw_detection.MegaDetectorV6(
            device=DEVICE,
            pretrained=True,
            version=MEGADETECTOR_VERSION,
        )

        print("✅ MegaDetector cargado correctamente.")

    return detector_model


def release_mega_model():
    global mega_model

    if mega_model is not None:
        mega_model = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


def release_dino_model():
    global dino_model
    global dino_transform

    if dino_model is not None:
        dino_model = None
        dino_transform = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


def release_detector_model():
    global detector_model

    if detector_model is not None:
        detector_model = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


# ==========================================
# SCHEMAS
# ==========================================

class CompareRequest(BaseModel):
    imageA: str
    imageB: str


class EmbedRequest(BaseModel):
    image: str


class EmbedResponse(BaseModel):
    embedding: list[float]

    embeddingSize: int

    model: str

    detector: str

    device: str

    cropped: bool

    detectionConfidence: (
        Optional[float]
    )

    processingMode: str


class CompareResponse(BaseModel):

    # ======================================
    # COMPATIBILIDAD CON NODE ACTUAL
    # ======================================

    similarity: float
    percentage: int

    model: str

    detector: str

    device: str

    embeddingSize: int

    cropA: bool
    cropB: bool

    detectionConfidenceA: (
        Optional[float]
    )

    detectionConfidenceB: (
        Optional[float]
    )

    processingMode: str

    # ======================================
    # RESULTADOS HÍBRIDOS NUEVOS
    # ======================================

    megaSimilarity: float

    dinoSimilarity: float

    megaEmbeddingSize: int

    dinoEmbeddingSize: int

    dinoModel: str


# ==========================================
# DESCARGAR IMAGEN
# ==========================================

def load_image(
    image_url: str,
) -> Image.Image:

    try:
        response = requests.get(
            image_url,
            timeout=30,
        )

        response.raise_for_status()

        image = Image.open(
            BytesIO(
                response.content
            )
        )

        return image.convert(
            "RGB"
        )

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=(
                "No se pudo cargar "
                "la imagen: "
                f"{str(error)}"
            ),
        )


# ==========================================
# NORMALIZAR VECTOR
# ==========================================

def normalize_embedding(
    embedding: np.ndarray,
) -> np.ndarray:

    embedding = np.asarray(
        embedding,
        dtype=np.float32,
    )

    norm = np.linalg.norm(
        embedding
    )

    if norm > 0:
        embedding = (
            embedding /
            norm
        )

    return embedding


# ==========================================
# DETECTAR ANIMAL
# ==========================================

def detect_animal(
    image: Image.Image,
):

    try:
        image_np = np.array(
            image
        )

        model = get_detector_model()

        results = (
            model
            .single_image_detection(
                image_np
            )
        )

        if not isinstance(
            results,
            dict,
        ):
            print(
                "⚠️ MegaDetector devolvió "
                "formato inesperado:",
                type(results),
            )

            return None

        detections = results.get(
            "detections"
        )

        if detections is None:
            print(
                "⚠️ MegaDetector no devolvió "
                "detections."
            )

            return None

        xyxy = getattr(
            detections,
            "xyxy",
            None,
        )

        confidences = getattr(
            detections,
            "confidence",
            None,
        )

        class_ids = getattr(
            detections,
            "class_id",
            None,
        )

        if (
            xyxy is None
            or len(xyxy) == 0
        ):
            print(
                "⚠️ MegaDetector "
                "no encontró animal."
            )

            return None

        print(
            "🔎 MegaDetector detectó "
            f"{len(xyxy)} objeto(s)."
        )

        best_index = None
        best_confidence = -1.0

        # ==================================
        # PRIMERA PASADA
        #
        # Preferimos clase animal.
        # ==================================

        for index in range(
            len(xyxy)
        ):

            confidence = (
                float(
                    confidences[index]
                )
                if confidences
                is not None
                else 1.0
            )

            class_id = (
                int(
                    class_ids[index]
                )
                if class_ids
                is not None
                else None
            )

            print(
                "   detección:",
                {
                    "index":
                        index,

                    "class_id":
                        class_id,

                    "confidence":
                        round(
                            confidence,
                            4,
                        ),
                }
            )

            if (
                confidence <
                DETECTION_CONFIDENCE
            ):
                continue

            # MegaDetector utilizado por
            # PawTrace: clase 0 = animal.

            if (
                class_id is not None
                and class_id != 0
            ):
                continue

            if (
                confidence >
                best_confidence
            ):
                best_index = index
                best_confidence = (
                    confidence
                )

        # ==================================
        # FALLBACK
        # ==================================

        if best_index is None:

            for index in range(
                len(xyxy)
            ):

                confidence = (
                    float(
                        confidences[index]
                    )
                    if confidences
                    is not None
                    else 1.0
                )

                if (
                    confidence <
                    DETECTION_CONFIDENCE
                ):
                    continue

                if (
                    confidence >
                    best_confidence
                ):
                    best_index = index

                    best_confidence = (
                        confidence
                    )

        if best_index is None:

            print(
                "⚠️ No hubo "
                "detección válida."
            )

            return None

        bbox = xyxy[
            best_index
        ]

        return {
            "bbox": [
                float(
                    bbox[0]
                ),

                float(
                    bbox[1]
                ),

                float(
                    bbox[2]
                ),

                float(
                    bbox[3]
                ),
            ],

            "confidence":
                best_confidence,
        }

    except Exception as error:

        print(
            "❌ Error MegaDetector:",
            repr(error),
        )

        return None


# ==========================================
# RECORTAR ANIMAL
# ==========================================

def crop_from_detection(
    image: Image.Image,
    detection: dict,
):

    if not detection:
        return image

    bbox = detection.get(
        "bbox"
    )

    if (
        not bbox
        or len(bbox) != 4
    ):
        return image

    x1, y1, x2, y2 = bbox

    width, height = (
        image.size
    )

    box_width = (
        x2 - x1
    )

    box_height = (
        y2 - y1
    )

    if (
        box_width <= 0
        or box_height <= 0
    ):
        return image

    margin_x = (
        box_width *
        CROP_MARGIN
    )

    margin_y = (
        box_height *
        CROP_MARGIN
    )

    left = max(
        0,
        int(
            x1 -
            margin_x
        ),
    )

    top = max(
        0,
        int(
            y1 -
            margin_y
        ),
    )

    right = min(
        width,
        int(
            x2 +
            margin_x
        ),
    )

    bottom = min(
        height,
        int(
            y2 +
            margin_y
        ),
    )

    if (
        right <= left
        or bottom <= top
    ):
        return image

    cropped = image.crop(
        (
            left,
            top,
            right,
            bottom,
        )
    )

    print(
        "✅ Animal recortado:",
        {
            "confidence":
                round(
                    detection[
                        "confidence"
                    ],
                    4,
                ),

            "bbox": [
                left,
                top,
                right,
                bottom,
            ],

            "originalSize":
                image.size,

            "cropSize":
                cropped.size,
        }
    )

    return cropped


# ==========================================
# PREPARAR REPRESENTACIONES
#
# Una sola detección por imagen.
# MegaDescriptor y DINOv2 utilizan
# las mismas representaciones.
# ==========================================

def prepare_image(
    image: Image.Image,
):

    detection = (
        detect_animal(
            image
        )
    )

    if detection is None:

        return {
            "original":
                image,

            "crop":
                None,

            "cropped":
                False,

            "confidence":
                None,

            "processingMode":
                "robust-original-only",
        }

    cropped_image = (
        crop_from_detection(
            image,
            detection,
        )
    )

    return {
        "original":
            image,

        "crop":
            cropped_image,

        "cropped":
            True,

        "confidence":
            detection[
                "confidence"
            ],

        "processingMode":
            "robust-original-plus-crop",
    }


# ==========================================
# EMBEDDING MEGADESCRIPTOR
# ==========================================

def get_mega_embedding(
    image: Image.Image,
) -> np.ndarray:

    tensor = (
        mega_transform(
            image
        )
        .unsqueeze(0)
        .to(DEVICE)
    )

    model = get_mega_model()

    with torch.no_grad():

        embedding = (
            model(
                tensor
            )
        )

    if isinstance(
        embedding,
        (tuple, list),
    ):
        embedding = (
            embedding[0]
        )

    embedding = (
        embedding
        .squeeze(0)
        .detach()
        .cpu()
        .numpy()
    )

    return normalize_embedding(
        embedding
    )


# ==========================================
# EMBEDDING DINOV2
# ==========================================

def get_dino_embedding(
    image: Image.Image,
) -> np.ndarray:

    model = get_dino_model()

    tensor = (
        dino_transform(
            image
        )
        .unsqueeze(0)
        .to(DEVICE)
    )

    with torch.no_grad():

        embedding = (
            model(
                tensor
            )
        )

    if isinstance(
        embedding,
        (tuple, list),
    ):
        embedding = (
            embedding[0]
        )

    embedding = (
        embedding
        .squeeze(0)
        .detach()
        .cpu()
        .numpy()
    )

    return normalize_embedding(
        embedding
    )


# ==========================================
# COMBINAR ORIGINAL + CROP
# ==========================================

def combine_original_crop(
    original_embedding,
    crop_embedding,
):

    if crop_embedding is None:

        return normalize_embedding(
            original_embedding
        )

    combined = (
        ORIGINAL_WEIGHT *
        original_embedding
        +
        CROP_WEIGHT *
        crop_embedding
    )

    return normalize_embedding(
        combined
    )


# ==========================================
# EMBEDDING ROBUSTO MEGA
# ==========================================

def get_robust_mega_embedding(
    prepared: dict,
):

    original_embedding = (
        get_mega_embedding(
            prepared[
                "original"
            ]
        )
    )

    crop_embedding = None

    if (
        prepared[
            "crop"
        ]
        is not None
    ):
        crop_embedding = (
            get_mega_embedding(
                prepared[
                    "crop"
                ]
            )
        )

    embedding = (
        combine_original_crop(
            original_embedding,
            crop_embedding,
        )
    )

    return embedding


# ==========================================
# EMBEDDING ROBUSTO DINO
# ==========================================

def get_robust_dino_embedding(
    prepared: dict,
):

    original_embedding = (
        get_dino_embedding(
            prepared[
                "original"
            ]
        )
    )

    crop_embedding = None

    if (
        prepared[
            "crop"
        ]
        is not None
    ):
        crop_embedding = (
            get_dino_embedding(
                prepared[
                    "crop"
                ]
            )
        )

    embedding = (
        combine_original_crop(
            original_embedding,
            crop_embedding,
        )
    )

    return embedding


# ==========================================
# COSINE SIMILARITY
# ==========================================

def cosine_similarity(
    embedding_a: np.ndarray,
    embedding_b: np.ndarray,
) -> float:

    a = normalize_embedding(
        embedding_a
    )

    b = normalize_embedding(
        embedding_b
    )

    return float(
        np.dot(
            a,
            b,
        )
    )


# ==========================================
# SCORE LEGACY MEGADESCRIPTOR
#
# Se mantiene porque Node todavía
# espera percentage en /compare.
# ==========================================

def similarity_to_percentage(
    similarity: float,
) -> int:

    minimum = 0.20
    maximum = 0.90

    if (
        similarity <=
        minimum
    ):
        return 0

    if (
        similarity >=
        maximum
    ):
        return 100

    normalized = (
        similarity -
        minimum
    ) / (
        maximum -
        minimum
    )

    percentage = round(
        normalized *
        100
    )

    return max(
        0,
        min(
            100,
            percentage,
        ),
    )


# ==========================================
# HEALTH
# ==========================================

@app.get(
    "/health"
)
def health():

    return {
        "status":
            "ok",

        "service":
            "pawtrace-animal-reid",

        "version":
            "1.4.3.6.2",

        "models": {
            "megaDescriptor":
                MEGA_MODEL_NAME,

            "dinoV2":
                DINO_MODEL_NAME,

            "detector":
                MEGADETECTOR_VERSION,
        },

        "device":
            DEVICE,

        "loaded": {
            "megaDescriptor": mega_model is not None,
            "dinoV2": dino_model is not None,
            "detector": detector_model is not None,
        },

        "pipeline": (
            "MegaDetector → "
            "original/crop → "
            "MegaDescriptor + DINOv2"
        ),
    }


# ==========================================
# EMBED MEGADESCRIPTOR
#
# IMPORTANTE:
#
# Se mantiene compatible con Node actual.
# ==========================================

@app.post(
    "/embed",
    response_model=EmbedResponse,
)
def embed(
    payload: EmbedRequest,
):

    print(
        "================================"
    )

    print(
        "🐾 GENERANDO EMBEDDING "
        "MEGADESCRIPTOR"
    )

    print(
        "Imagen:",
        payload.image
    )

    original = (
        load_image(
            payload.image
        )
    )

    prepared = (
        prepare_image(
            original
        )
    )

    # La detección ya terminó. Liberamos MegaDetector
    # antes de cargar MegaDescriptor para bajar el pico de RAM.
    release_detector_model()

    embedding = (
        get_robust_mega_embedding(
            prepared
        )
    )

    embedding_list = (
        embedding
        .astype(float)
        .tolist()
    )

    confidence = (
        prepared[
            "confidence"
        ]
    )

    print(
        "✅ MegaDescriptor embedding:",
        {
            "size":
                len(
                    embedding_list
                ),

            "cropped":
                prepared[
                    "cropped"
                ],

            "mode":
                prepared[
                    "processingMode"
                ],
        }
    )

    return EmbedResponse(
        embedding=
            embedding_list,

        embeddingSize=
            len(
                embedding_list
            ),

        model=
            MEGA_MODEL_NAME,

        detector=
            MEGADETECTOR_VERSION,

        device=
            DEVICE,

        cropped=
            prepared[
                "cropped"
            ],

        detectionConfidence=(
            round(
                confidence,
                6,
            )
            if confidence
            is not None
            else None
        ),

        processingMode=
            prepared[
                "processingMode"
            ],
    )


# ==========================================
# EMBED DINOV2
#
# Nuevo Sprint 1.4.3.6.2
# ==========================================

@app.post(
    "/embed-dino",
    response_model=EmbedResponse,
)
def embed_dino(
    payload: EmbedRequest,
):

    print(
        "================================"
    )

    print(
        "🦖 GENERANDO EMBEDDING DINOV2"
    )

    print(
        "Imagen:",
        payload.image
    )

    original = (
        load_image(
            payload.image
        )
    )

    prepared = (
        prepare_image(
            original
        )
    )

    # La detección ya terminó. Liberamos MegaDetector
    # antes de cargar DINOv2 para bajar el pico de RAM.
    release_detector_model()

    embedding = (
        get_robust_dino_embedding(
            prepared
        )
    )

    embedding_list = (
        embedding
        .astype(float)
        .tolist()
    )

    confidence = (
        prepared[
            "confidence"
        ]
    )

    print(
        "✅ DINOv2 embedding:",
        {
            "size":
                len(
                    embedding_list
                ),

            "cropped":
                prepared[
                    "cropped"
                ],

            "mode":
                prepared[
                    "processingMode"
                ],
        }
    )

    return EmbedResponse(
        embedding=
            embedding_list,

        embeddingSize=
            len(
                embedding_list
            ),

        model=
            DINO_MODEL_NAME,

        detector=
            MEGADETECTOR_VERSION,

        device=
            DEVICE,

        cropped=
            prepared[
                "cropped"
            ],

        detectionConfidence=(
            round(
                confidence,
                6,
            )
            if confidence
            is not None
            else None
        ),

        processingMode=
            prepared[
                "processingMode"
            ],
    )


# ==========================================
# COMPARE HÍBRIDO
#
# MegaDescriptor + DINOv2
#
# IMPORTANTE:
# todavía NO mezclamos los scores.
# ==========================================

@app.post(
    "/compare",
    response_model=CompareResponse,
)
def compare(
    payload: CompareRequest,
):

    print(
        "================================"
    )

    print(
        "🐾 NUEVA COMPARACIÓN HÍBRIDA"
    )

    print(
        "A:",
        payload.imageA
    )

    print(
        "B:",
        payload.imageB
    )


    # ======================================
    # DESCARGAR
    # ======================================

    original_a = (
        load_image(
            payload.imageA
        )
    )

    original_b = (
        load_image(
            payload.imageB
        )
    )


    # ======================================
    # DETECCIÓN
    # ======================================

    prepared_a = (
        prepare_image(
            original_a
        )
    )

    prepared_b = (
        prepare_image(
            original_b
        )
    )

    # Ya no necesitamos el detector. Evitamos mantenerlo
    # en RAM mientras calculamos los embeddings.
    release_detector_model()


    # ======================================
    # MEGADESCRIPTOR
    # ======================================

    mega_a = (
        get_robust_mega_embedding(
            prepared_a
        )
    )

    mega_b = (
        get_robust_mega_embedding(
            prepared_b
        )
    )

    mega_similarity = (
        cosine_similarity(
            mega_a,
            mega_b,
        )
    )

    # MegaDescriptor ya produjo los vectores.
    # Lo liberamos antes de cargar DINOv2.
    release_mega_model()


    # ======================================
    # DINOV2
    # ======================================

    dino_a = (
        get_robust_dino_embedding(
            prepared_a
        )
    )

    dino_b = (
        get_robust_dino_embedding(
            prepared_b
        )
    )

    dino_similarity = (
        cosine_similarity(
            dino_a,
            dino_b,
        )
    )


    # ======================================
    # SCORE LEGACY
    #
    # Lo seguimos calculando únicamente
    # para no romper compatibilidad Node.
    # ======================================

    mega_percentage = (
        similarity_to_percentage(
            mega_similarity
        )
    )


    # ======================================
    # LOG HÍBRIDO
    # ======================================

    print(
        "🧪 RE-ID HÍBRIDO:"
    )

    print(
        "   MegaDescriptor:",
        f"{mega_similarity:.6f}"
    )

    print(
        "   DINOv2:",
        f"{dino_similarity:.6f}"
    )

    print(
        "   Mega score legacy:",
        f"{mega_percentage}%"
    )

    print(
        "   Mega crop A:",
        prepared_a[
            "cropped"
        ]
    )

    print(
        "   Mega crop B:",
        prepared_b[
            "cropped"
        ]
    )


    # ======================================
    # RESPONSE
    # ======================================

    confidence_a = (
        prepared_a[
            "confidence"
        ]
    )

    confidence_b = (
        prepared_b[
            "confidence"
        ]
    )

    return CompareResponse(

        # ==================================
        # COMPATIBILIDAD
        # ==================================

        similarity=
            round(
                mega_similarity,
                6,
            ),

        percentage=
            mega_percentage,

        model=
            MEGA_MODEL_NAME,

        detector=
            MEGADETECTOR_VERSION,

        device=
            DEVICE,

        embeddingSize=
            int(
                mega_a.shape[0]
            ),

        cropA=
            prepared_a[
                "cropped"
            ],

        cropB=
            prepared_b[
                "cropped"
            ],

        detectionConfidenceA=(
            round(
                confidence_a,
                6,
            )
            if confidence_a
            is not None
            else None
        ),

        detectionConfidenceB=(
            round(
                confidence_b,
                6,
            )
            if confidence_b
            is not None
            else None
        ),

        processingMode=
            "hybrid-mega-dinov2",

        # ==================================
        # NUEVO HÍBRIDO
        # ==================================

        megaSimilarity=
            round(
                mega_similarity,
                6,
            ),

        dinoSimilarity=
            round(
                dino_similarity,
                6,
            ),

        megaEmbeddingSize=
            int(
                mega_a.shape[0]
            ),

        dinoEmbeddingSize=
            int(
                dino_a.shape[0]
            ),

        dinoModel=
            DINO_MODEL_NAME,
    )


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():

    return {
        "service":
            "PawTrace Animal Re-ID",

        "version":
            "Sprint 1.4.3.6.2",

        "status":
            "running",

        "pipeline": (
            "MegaDetector "
            "→ original + crop "
            "→ MegaDescriptor + DINOv2"
        ),

        "models": {
            "megaDescriptor":
                MEGA_MODEL_NAME,

            "dinoV2":
                DINO_MODEL_NAME,

            "detector":
                MEGADETECTOR_VERSION,
        },

        "endpoints": [
            "/health",
            "/embed",
            "/embed-dino",
            "/compare",
            "/docs",
        ],
    }