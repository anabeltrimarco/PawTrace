# ==========================================
# PAWTRACE - ANIMAL RE-ID SERVICE
#
# Sprint 1.4.3.19
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
# Visual Verification Engine:
# - ORB
# - SSIM
# - Histograma HSV
# - Textura LBP
#
# No reemplaza MegaDescriptor/DINOv2.
# Actúa como verificación visual adicional.
# ==========================================

from io import BytesIO
from typing import Optional

import numpy as np
import requests
import timm
import torch

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image, ImageOps

from visual_verification import compare_visual_features
from torchvision import transforms
from transformers import (
    AutoImageProcessor,
    AutoModel,
)

from timm.data import (
    resolve_model_data_config,
    create_transform,
)

from PytorchWildlife.models import (
    detection as pw_detection,
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

# Modelo especializado en identificación individual
# de perros y gatos.
#
# Fuente:
# AvitoTech/DINO-v2-small-for-animal-identification
#
# 22.1M parámetros, 384 dimensiones.
# Entrenado específicamente para distinguir
# individuos, no sólo especie/raza.
PET_ID_MODEL_NAME = (
    "AvitoTech/DINO-v2-small-for-animal-identification"
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
    title="PowTrace Animal Re-ID",
    version="1.4.3.19",
    description=(
        "Re-identificación animal híbrida "
        "con Pet Identity ReID + MegaDescriptor + DINOv2, "
        "detección mediante MegaDetector "
        "y Visual Verification Engine."
    ),
)


# ==========================================
# CARGAR MEGADESCRIPTOR
# ==========================================

print(
    "🐾 Cargando MegaDescriptor..."
)

mega_model = timm.create_model(
    MEGA_MODEL_NAME,
    pretrained=True,
)

mega_model = mega_model.to(
    DEVICE
)

mega_model.eval()

print(
    f"✅ MegaDescriptor cargado en {DEVICE}"
)


# ==========================================
# CARGAR DINOV2
# ==========================================

print(
    "🦖 Cargando DINOv2..."
)

dino_model = timm.create_model(
    DINO_MODEL_NAME,
    pretrained=True,
    num_classes=0,
)

dino_model = dino_model.to(
    DEVICE
)

dino_model.eval()

print(
    f"✅ DINOv2 cargado en {DEVICE}"
)


# ==========================================
# CARGAR PET IDENTITY MODEL
#
# Fine-grained Pet ReID
# Sprint 1.4.3.18
# ==========================================

print(
    "🪪 Cargando Pet Identity ReID..."
)

pet_id_processor = (
    AutoImageProcessor.from_pretrained(
        PET_ID_MODEL_NAME
    )
)

pet_id_model = (
    AutoModel.from_pretrained(
        PET_ID_MODEL_NAME
    )
)

pet_id_model = pet_id_model.to(
    DEVICE
)

pet_id_model.eval()

print(
    f"✅ Pet Identity ReID cargado en {DEVICE}"
)


# ==========================================
# CARGAR MEGADETECTOR
# ==========================================

print(
    "🔎 Cargando MegaDetector..."
)

detector_model = (
    pw_detection.MegaDetectorV6(
        device=DEVICE,
        pretrained=True,
        version=MEGADETECTOR_VERSION,
    )
)

print(
    "✅ MegaDetector cargado correctamente."
)


# ==========================================
# TRANSFORM MEGADESCRIPTOR
# ==========================================

mega_transform = (
    transforms.Compose(
        [
            transforms.Resize(
                (384, 384)
            ),

            transforms.ToTensor(),

            transforms.Normalize(
                mean=[
                    0.5,
                    0.5,
                    0.5,
                ],
                std=[
                    0.5,
                    0.5,
                    0.5,
                ],
            ),
        ]
    )
)


# ==========================================
# TRANSFORM DINOV2
#
# Usamos configuración propia de timm.
# No inventamos resize/mean/std.
# ==========================================

dino_data_config = (
    resolve_model_data_config(
        dino_model
    )
)

dino_transform = (
    create_transform(
        **dino_data_config,
        is_training=False,
    )
)

print(
    "✅ Transform DINOv2 configurado:",
    {
        "input_size":
            dino_data_config.get(
                "input_size"
            ),

        "mean":
            dino_data_config.get(
                "mean"
            ),

        "std":
            dino_data_config.get(
                "std"
            ),
    }
)


# ==========================================
# SCHEMAS
# ==========================================

class CompareRequest(BaseModel):
    imageA: str
    imageB: str


class VisualVerifyRequest(BaseModel):
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

    # ======================================
    # VISUAL CONSENSUS ENGINE
    # Sprint 1.4.3.10
    # ======================================

    megaScore: float
    dinoScore: float

    visualScore: float
    visualPercentage: int
    visualVerdict: str

    consensusScore: float
    consensusPercentage: int
    consensusVerdict: str
    consensusReason: str

    # ======================================
    # MULTI-VIEW RE-ID ENGINE
    # Sprint 1.4.3.11
    # ======================================

    multiViewEnabled: bool
    viewsA: int
    viewsB: int

    megaBestSimilarity: float
    megaSecondSimilarity: float

    dinoBestSimilarity: float
    dinoSecondSimilarity: float

    # ======================================
    # LOCAL PATCH MATCHING ENGINE
    # Sprint 1.4.3.12
    # ======================================

    patchEnabled: bool
    patchScore: float
    patchPercentage: int

    patchRawSimilarity: float
    patchBestSimilarity: float
    patchSecondSimilarity: float
    patchThirdSimilarity: float

    patchCountA: int
    patchCountB: int
    patchMatchedPairs: int

    # ======================================
    # POSE-AGNOSTIC PATCH MATCHING
    # Sprint 1.4.3.13
    # ======================================

    poseAgnosticPatchEnabled: bool
    poseAgnosticPatchScore: float
    poseAgnosticPatchPercentage: int

    poseAgnosticRawSimilarity: float
    poseAgnosticBestSimilarity: float
    poseAgnosticSecondSimilarity: float
    poseAgnosticThirdSimilarity: float
    poseAgnosticFourthSimilarity: float

    poseAgnosticPatchCountA: int
    poseAgnosticPatchCountB: int
    poseAgnosticMatchedPairs: int

    # ======================================
    # DINOV2 LOCAL FEATURE MATCHING
    # Sprint 1.4.3.14
    # ======================================

    localDinoEnabled: bool
    localDinoScore: float
    localDinoPercentage: int

    localDinoRawSimilarity: float
    localDinoBestSimilarity: float
    localDinoMeanTopSimilarity: float

    localDinoMutualMatches: int
    localDinoTokenCountA: int
    localDinoTokenCountB: int
    localDinoCoverageA: float
    localDinoCoverageB: float

    # ======================================
    # SPATIALLY CONSISTENT LOCAL MATCHING
    # Sprint 1.4.3.15
    # ======================================

    spatialLocalEnabled: bool
    spatialLocalScore: float
    spatialLocalPercentage: int

    spatialLocalAppearanceScore: float
    spatialLocalGeometryScore: float
    spatialLocalConsistency: float

    spatialLocalMutualMatches: int
    spatialLocalInlierMatches: int

    spatialLocalMeanDisplacement: float
    spatialLocalDisplacementStd: float

    spatialLocalCoverageA: float
    spatialLocalCoverageB: float

    # ======================================
    # DISTINCTIVE LOCAL MATCHING
    # Sprint 1.4.3.16
    # ======================================

    distinctiveLocalEnabled: bool
    distinctiveLocalScore: float
    distinctiveLocalPercentage: int

    distinctiveLocalMeanSimilarity: float
    distinctiveLocalMeanMargin: float
    distinctiveLocalMedianMargin: float
    distinctiveLocalBestMargin: float

    distinctiveLocalMutualMatches: int
    distinctiveLocalQualifiedMatches: int
    distinctiveLocalDistinctiveRatio: float

    distinctiveLocalCoverageA: float
    distinctiveLocalCoverageB: float

    # ======================================
    # IDENTITY REGIONS / PART-AWARE RE-ID
    # Sprint 1.4.3.17
    # ======================================

    identityRegionsEnabled: bool
    identityRegionsScore: float
    identityRegionsPercentage: int

    identityRegionsDinoScore: float
    identityRegionsColorScore: float
    identityRegionsTextureScore: float

    identityRegionsMeanScore: float
    identityRegionsMedianScore: float
    identityRegionsBestScore: float

    identityRegionsStrongMatches: int
    identityRegionsCompared: int

    identityRegionsBestRegion: str
    identityRegionsWorstRegion: str

    # ======================================
    # FINE-GRAINED PET RE-ID
    # Sprint 1.4.3.18
    # ======================================

    petIdentityEnabled: bool
    petIdentityModel: str

    petIdentitySimilarity: float
    petIdentityScore: float
    petIdentityPercentage: int

    petIdentityEmbeddingSize: int

    petIdentityCropA: bool
    petIdentityCropB: bool

    # ======================================
    # PET IDENTITY PRIMARY CONSENSUS
    # Sprint 1.4.3.19
    # ======================================

    petIdentityReliability: float
    petIdentityEffectiveScore: float
    petIdentityEffectivePercentage: int
    petIdentityVerdict: str

    primaryEngine: str
    primaryEngineScore: float


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

        results = (
            detector_model
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
    margin: float | None = None,
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

    effective_margin = (
        CROP_MARGIN
        if margin is None
        else float(
            max(
                0.0,
                margin,
            )
        )
    )

    margin_x = (
        box_width *
        effective_margin
    )

    margin_y = (
        box_height *
        effective_margin
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

            "detection":
                None,
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

        "detection":
            detection,
    }


# ==========================================
# MULTI-VIEW RE-ID ENGINE
#
# Sprint 1.4.3.11
#
# Generamos hasta 4 vistas por imagen:
#
# 1. original
# 2. crop normal
# 3. crop amplio
# 4. flip horizontal de la mejor vista
#
# Objetivo:
# tolerar mejor:
# - cambios de pose
# - orientación izquierda/derecha
# - escala
# - encuadre
#
# IMPORTANTE:
# /embed y /embed-dino siguen iguales
# para mantener compatibilidad con Node.
# Multi-View se usa en /compare.
# ==========================================

MULTIVIEW_WIDE_MARGIN = 0.35

MULTIVIEW_TOP1_WEIGHT = 0.70
MULTIVIEW_TOP2_WEIGHT = 0.30


def build_multiview_images(
    prepared: dict,
) -> list[tuple[str, Image.Image]]:

    views = [
        (
            "original",
            prepared[
                "original"
            ],
        )
    ]

    crop = prepared.get(
        "crop"
    )

    detection = prepared.get(
        "detection"
    )

    if crop is not None:

        views.append(
            (
                "crop",
                crop,
            )
        )

    wide_crop = None

    if detection is not None:

        wide_crop = (
            crop_from_detection(
                prepared[
                    "original"
                ],
                detection,
                margin=
                    MULTIVIEW_WIDE_MARGIN,
            )
        )

        if wide_crop is not None:

            views.append(
                (
                    "wide_crop",
                    wide_crop,
                )
            )

    # ======================================
    # FLIP
    #
    # Preferimos hacer flip del crop normal
    # porque contiene menos fondo.
    # Si no hay crop, usamos original.
    # ======================================

    flip_source = (
        crop
        if crop is not None
        else prepared[
            "original"
        ]
    )

    flipped = (
        ImageOps.mirror(
            flip_source
        )
    )

    views.append(
        (
            "flip",
            flipped,
        )
    )

    # Máximo 4 representaciones.
    return views[:4]


def get_multiview_embeddings(
    views: list[tuple[str, Image.Image]],
    extractor,
) -> list[dict]:

    results = []

    for name, image in views:

        embedding = extractor(
            image
        )

        results.append(
            {
                "name":
                    name,

                "embedding":
                    embedding,
            }
        )

    return results


def compare_multiview_embeddings(
    embeddings_a: list[dict],
    embeddings_b: list[dict],
) -> dict:

    comparisons = []

    for item_a in embeddings_a:

        for item_b in embeddings_b:

            similarity = (
                cosine_similarity(
                    item_a[
                        "embedding"
                    ],
                    item_b[
                        "embedding"
                    ],
                )
            )

            comparisons.append(
                {
                    "viewA":
                        item_a[
                            "name"
                        ],

                    "viewB":
                        item_b[
                            "name"
                        ],

                    "similarity":
                        float(
                            similarity
                        ),
                }
            )

    if not comparisons:

        return {
            "robustSimilarity":
                0.0,

            "bestSimilarity":
                0.0,

            "secondSimilarity":
                0.0,

            "bestPair":
                None,

            "secondPair":
                None,

            "pairCount":
                0,
        }

    comparisons.sort(
        key=lambda item:
            item[
                "similarity"
            ],
        reverse=True,
    )

    best = comparisons[0]

    second = (
        comparisons[1]
        if len(comparisons) > 1
        else comparisons[0]
    )

    # ======================================
    # AGREGACIÓN ROBUSTA
    #
    # No usamos sólo el máximo porque una
    # coincidencia aislada podría producir
    # un falso positivo.
    #
    # top1 70% + top2 30%
    # ======================================

    robust_similarity = (
        best[
            "similarity"
        ]
        *
        MULTIVIEW_TOP1_WEIGHT
        +
        second[
            "similarity"
        ]
        *
        MULTIVIEW_TOP2_WEIGHT
    )

    return {
        "robustSimilarity":
            float(
                robust_similarity
            ),

        "bestSimilarity":
            float(
                best[
                    "similarity"
                ]
            ),

        "secondSimilarity":
            float(
                second[
                    "similarity"
                ]
            ),

        "bestPair":
            (
                f'{best["viewA"]}'
                f' ↔ '
                f'{best["viewB"]}'
            ),

        "secondPair":
            (
                f'{second["viewA"]}'
                f' ↔ '
                f'{second["viewB"]}'
            ),

        "pairCount":
            len(
                comparisons
            ),
    }


def calculate_multiview_model_similarity(
    prepared_a: dict,
    prepared_b: dict,
    extractor,
) -> dict:

    views_a = (
        build_multiview_images(
            prepared_a
        )
    )

    views_b = (
        build_multiview_images(
            prepared_b
        )
    )

    embeddings_a = (
        get_multiview_embeddings(
            views_a,
            extractor,
        )
    )

    embeddings_b = (
        get_multiview_embeddings(
            views_b,
            extractor,
        )
    )

    result = (
        compare_multiview_embeddings(
            embeddings_a,
            embeddings_b,
        )
    )

    result[
        "viewsA"
    ] = len(
        views_a
    )

    result[
        "viewsB"
    ] = len(
        views_b
    )

    return result


# ==========================================
# LOCAL PATCH MATCHING ENGINE
#
# Sprint 1.4.3.12
#
# Objetivo:
# comparar patrones locales del animal
# cuando la pose global cambia demasiado.
#
# Pipeline:
#
# animal crop/original
#      ↓
# 2 columnas x 3 filas
#      ↓
# 6 patches locales
#      ↓
# DINOv2 por patch
#      ↓
# comparación todos contra todos
#      ↓
# greedy matching único
#      ↓
# top 3 coincidencias
#
# IMPORTANTE:
# - No confirma identidad por sí solo.
# - Usa DINOv2 porque MegaDescriptor
#   fue demasiado sensible en los casos
#   difíciles de pose.
# ==========================================

PATCH_ROWS = 3
PATCH_COLS = 2

PATCH_OVERLAP = 0.12

PATCH_TOP1_WEIGHT = 0.50
PATCH_TOP2_WEIGHT = 0.30
PATCH_TOP3_WEIGHT = 0.20


def get_patch_source(
    prepared: dict,
) -> Image.Image:

    crop = prepared.get(
        "crop"
    )

    if crop is not None:
        return crop

    return prepared[
        "original"
    ]


def build_local_patches(
    prepared: dict,
) -> list[tuple[str, Image.Image]]:

    image = get_patch_source(
        prepared
    )

    width, height = image.size

    patches = []

    cell_w = (
        width /
        PATCH_COLS
    )

    cell_h = (
        height /
        PATCH_ROWS
    )

    overlap_x = (
        cell_w *
        PATCH_OVERLAP
    )

    overlap_y = (
        cell_h *
        PATCH_OVERLAP
    )

    for row in range(
        PATCH_ROWS
    ):

        for col in range(
            PATCH_COLS
        ):

            x1 = max(
                0,
                int(
                    col *
                    cell_w -
                    overlap_x
                ),
            )

            y1 = max(
                0,
                int(
                    row *
                    cell_h -
                    overlap_y
                ),
            )

            x2 = min(
                width,
                int(
                    (col + 1) *
                    cell_w +
                    overlap_x
                ),
            )

            y2 = min(
                height,
                int(
                    (row + 1) *
                    cell_h +
                    overlap_y
                ),
            )

            if (
                x2 <= x1
                or y2 <= y1
            ):
                continue

            patch = image.crop(
                (
                    x1,
                    y1,
                    x2,
                    y2,
                )
            )

            patches.append(
                (
                    f"r{row + 1}c{col + 1}",
                    patch,
                )
            )

    return patches


def get_patch_embeddings(
    patches: list[
        tuple[
            str,
            Image.Image,
        ]
    ],
) -> list[dict]:

    results = []

    for name, patch in patches:

        embedding = (
            get_dino_embedding(
                patch
            )
        )

        results.append(
            {
                "name":
                    name,

                "embedding":
                    embedding,
            }
        )

    return results


def greedy_unique_patch_matches(
    embeddings_a: list[dict],
    embeddings_b: list[dict],
) -> list[dict]:

    candidates = []

    for item_a in embeddings_a:

        for item_b in embeddings_b:

            similarity = (
                cosine_similarity(
                    item_a[
                        "embedding"
                    ],
                    item_b[
                        "embedding"
                    ],
                )
            )

            candidates.append(
                {
                    "patchA":
                        item_a[
                            "name"
                        ],

                    "patchB":
                        item_b[
                            "name"
                        ],

                    "similarity":
                        float(
                            similarity
                        ),
                }
            )

    candidates.sort(
        key=lambda item:
            item[
                "similarity"
            ],
        reverse=True,
    )

    used_a = set()
    used_b = set()

    selected = []

    for candidate in candidates:

        patch_a = candidate[
            "patchA"
        ]

        patch_b = candidate[
            "patchB"
        ]

        if (
            patch_a in used_a
            or patch_b in used_b
        ):
            continue

        selected.append(
            candidate
        )

        used_a.add(
            patch_a
        )

        used_b.add(
            patch_b
        )

        if len(
            selected
        ) >= 3:
            break

    return selected


def patch_similarity_to_score(
    similarity: float,
) -> float:

    # ======================================
    # Calibración conservadora.
    #
    # Los patches locales pueden parecerse
    # mucho entre animales distintos.
    # Por eso exigimos una similitud local
    # relativamente alta.
    # ======================================

    return similarity_to_unit(
        similarity,
        minimum=0.50,
        maximum=0.85,
    )


def calculate_patch_matching(
    prepared_a: dict,
    prepared_b: dict,
) -> dict:

    patches_a = (
        build_local_patches(
            prepared_a
        )
    )

    patches_b = (
        build_local_patches(
            prepared_b
        )
    )

    embeddings_a = (
        get_patch_embeddings(
            patches_a
        )
    )

    embeddings_b = (
        get_patch_embeddings(
            patches_b
        )
    )

    matches = (
        greedy_unique_patch_matches(
            embeddings_a,
            embeddings_b,
        )
    )

    similarities = [
        item[
            "similarity"
        ]
        for item in matches
    ]

    if not similarities:

        return {
            "enabled":
                True,

            "rawSimilarity":
                0.0,

            "score":
                0.0,

            "bestSimilarity":
                0.0,

            "secondSimilarity":
                0.0,

            "thirdSimilarity":
                0.0,

            "patchCountA":
                len(
                    patches_a
                ),

            "patchCountB":
                len(
                    patches_b
                ),

            "matchedPairs":
                0,
        }

    best = similarities[0]

    second = (
        similarities[1]
        if len(similarities) > 1
        else best
    )

    third = (
        similarities[2]
        if len(similarities) > 2
        else second
    )

    raw_similarity = (
        best *
        PATCH_TOP1_WEIGHT
        +
        second *
        PATCH_TOP2_WEIGHT
        +
        third *
        PATCH_TOP3_WEIGHT
    )

    score = (
        patch_similarity_to_score(
            raw_similarity
        )
    )

    print(
        "🧩 PATCH MATCHING:",
        {
            "best":
                round(
                    best,
                    6,
                ),

            "second":
                round(
                    second,
                    6,
                ),

            "third":
                round(
                    third,
                    6,
                ),

            "raw":
                round(
                    raw_similarity,
                    6,
                ),

            "score":
                round(
                    score,
                    6,
                ),

            "pairs": [
                (
                    item[
                        "patchA"
                    ],
                    item[
                        "patchB"
                    ],
                    round(
                        item[
                            "similarity"
                        ],
                        4,
                    ),
                )
                for item in matches
            ],
        }
    )

    return {
        "enabled":
            True,

        "rawSimilarity":
            float(
                raw_similarity
            ),

        "score":
            float(
                score
            ),

        "bestSimilarity":
            float(
                best
            ),

        "secondSimilarity":
            float(
                second
            ),

        "thirdSimilarity":
            float(
                third
            ),

        "patchCountA":
            len(
                patches_a
            ),

        "patchCountB":
            len(
                patches_b
            ),

        "matchedPairs":
            len(
                matches
            ),
    }


# ==========================================
# POSE-AGNOSTIC PATCH MATCHING ENGINE
#
# Sprint 1.4.3.13
#
# Diferencia respecto del Patch Engine v1:
#
# - No depende de una grilla fija 2x3.
# - Genera ventanas superpuestas.
# - Usa patches más chicos y multi-escala.
# - Cualquier patch A puede coincidir con
#   cualquier patch B.
# - El matching es único: un patch no puede
#   "explicar" varias zonas a la vez.
#
# Objetivo:
# tolerar mejor:
# - sentado vs parado
# - izquierda vs derecha
# - cambio de encuadre
# - torso parcialmente visible
# - cambios grandes de pose
#
# IMPORTANTE:
# Se usa como evidencia adicional.
# Nunca confirma identidad por sí solo.
# ==========================================

POSE_PATCH_SMALL_RATIO = 0.55
POSE_PATCH_LARGE_RATIO = 0.72

POSE_PATCH_TOP1_WEIGHT = 0.40
POSE_PATCH_TOP2_WEIGHT = 0.30
POSE_PATCH_TOP3_WEIGHT = 0.20
POSE_PATCH_TOP4_WEIGHT = 0.10

POSE_PATCH_MAX_MATCHES = 4


def _safe_crop(
    image: Image.Image,
    left: int,
    top: int,
    right: int,
    bottom: int,
) -> Image.Image | None:

    width, height = image.size

    left = max(
        0,
        min(
            width - 1,
            int(left),
        ),
    )

    top = max(
        0,
        min(
            height - 1,
            int(top),
        ),
    )

    right = max(
        left + 1,
        min(
            width,
            int(right),
        ),
    )

    bottom = max(
        top + 1,
        min(
            height,
            int(bottom),
        ),
    )

    if (
        right <= left
        or bottom <= top
    ):
        return None

    return image.crop(
        (
            left,
            top,
            right,
            bottom,
        )
    )


def _window_from_center(
    image: Image.Image,
    center_x: float,
    center_y: float,
    width_ratio: float,
    height_ratio: float,
) -> Image.Image | None:

    width, height = image.size

    patch_w = (
        width *
        width_ratio
    )

    patch_h = (
        height *
        height_ratio
    )

    cx = (
        width *
        center_x
    )

    cy = (
        height *
        center_y
    )

    left = (
        cx -
        patch_w / 2
    )

    top = (
        cy -
        patch_h / 2
    )

    right = (
        cx +
        patch_w / 2
    )

    bottom = (
        cy +
        patch_h / 2
    )

    return _safe_crop(
        image,
        left,
        top,
        right,
        bottom,
    )


def build_pose_agnostic_patches(
    prepared: dict,
) -> list[tuple[str, Image.Image]]:

    source = get_patch_source(
        prepared
    )

    patches = []

    # ======================================
    # 9 ventanas pequeñas superpuestas
    #
    # centros:
    # izquierda / centro / derecha
    # arriba / medio / abajo
    # ======================================

    positions = [
        0.25,
        0.50,
        0.75,
    ]

    for row_index, center_y in enumerate(
        positions,
        start=1,
    ):

        for col_index, center_x in enumerate(
            positions,
            start=1,
        ):

            patch = (
                _window_from_center(
                    source,
                    center_x,
                    center_y,
                    POSE_PATCH_SMALL_RATIO,
                    POSE_PATCH_SMALL_RATIO,
                )
            )

            if patch is None:
                continue

            patches.append(
                (
                    f"small_r{row_index}c{col_index}",
                    patch,
                )
            )

    # ======================================
    # 3 ventanas grandes
    #
    # Ayudan cuando una mancha importante
    # ocupa gran parte del torso.
    # ======================================

    large_centers = [
        (
            "large_top",
            0.50,
            0.30,
        ),
        (
            "large_center",
            0.50,
            0.50,
        ),
        (
            "large_bottom",
            0.50,
            0.70,
        ),
    ]

    for name, center_x, center_y in large_centers:

        patch = (
            _window_from_center(
                source,
                center_x,
                center_y,
                POSE_PATCH_LARGE_RATIO,
                POSE_PATCH_LARGE_RATIO,
            )
        )

        if patch is None:
            continue

        patches.append(
            (
                name,
                patch,
            )
        )

    # Máximo 12 patches por imagen.
    return patches[:12]


def get_pose_agnostic_patch_embeddings(
    patches: list[
        tuple[
            str,
            Image.Image,
        ]
    ],
) -> list[dict]:

    results = []

    for name, patch in patches:

        embedding = (
            get_dino_embedding(
                patch
            )
        )

        results.append(
            {
                "name":
                    name,

                "embedding":
                    embedding,
            }
        )

    return results


def select_pose_agnostic_matches(
    embeddings_a: list[dict],
    embeddings_b: list[dict],
) -> list[dict]:

    candidates = []

    for item_a in embeddings_a:

        for item_b in embeddings_b:

            similarity = (
                cosine_similarity(
                    item_a[
                        "embedding"
                    ],
                    item_b[
                        "embedding"
                    ],
                )
            )

            candidates.append(
                {
                    "patchA":
                        item_a[
                            "name"
                        ],

                    "patchB":
                        item_b[
                            "name"
                        ],

                    "similarity":
                        float(
                            similarity
                        ),
                }
            )

    candidates.sort(
        key=lambda item:
            item[
                "similarity"
            ],
        reverse=True,
    )

    used_a = set()
    used_b = set()

    selected = []

    for candidate in candidates:

        patch_a = candidate[
            "patchA"
        ]

        patch_b = candidate[
            "patchB"
        ]

        if (
            patch_a in used_a
            or patch_b in used_b
        ):
            continue

        selected.append(
            candidate
        )

        used_a.add(
            patch_a
        )

        used_b.add(
            patch_b
        )

        if len(
            selected
        ) >= POSE_PATCH_MAX_MATCHES:
            break

    return selected


def pose_patch_similarity_to_score(
    similarity: float,
) -> float:

    # ======================================
    # Calibración conservadora inicial.
    #
    # Bajamos levemente el mínimo respecto
    # del Patch Engine v1 porque ahora:
    #
    # - hay matching único
    # - usamos 4 coincidencias
    # - las ventanas son más pequeñas
    #
    # Aun así, evitamos que similitudes
    # locales moderadas sumen demasiado.
    # ======================================

    return similarity_to_unit(
        similarity,
        minimum=0.46,
        maximum=0.78,
    )


def calculate_pose_agnostic_patch_matching(
    prepared_a: dict,
    prepared_b: dict,
) -> dict:

    patches_a = (
        build_pose_agnostic_patches(
            prepared_a
        )
    )

    patches_b = (
        build_pose_agnostic_patches(
            prepared_b
        )
    )

    embeddings_a = (
        get_pose_agnostic_patch_embeddings(
            patches_a
        )
    )

    embeddings_b = (
        get_pose_agnostic_patch_embeddings(
            patches_b
        )
    )

    matches = (
        select_pose_agnostic_matches(
            embeddings_a,
            embeddings_b,
        )
    )

    similarities = [
        item[
            "similarity"
        ]
        for item in matches
    ]

    if not similarities:

        return {
            "enabled":
                True,

            "rawSimilarity":
                0.0,

            "score":
                0.0,

            "bestSimilarity":
                0.0,

            "secondSimilarity":
                0.0,

            "thirdSimilarity":
                0.0,

            "fourthSimilarity":
                0.0,

            "patchCountA":
                len(
                    patches_a
                ),

            "patchCountB":
                len(
                    patches_b
                ),

            "matchedPairs":
                0,
        }

    best = similarities[0]

    second = (
        similarities[1]
        if len(similarities) > 1
        else best
    )

    third = (
        similarities[2]
        if len(similarities) > 2
        else second
    )

    fourth = (
        similarities[3]
        if len(similarities) > 3
        else third
    )

    raw_similarity = (
        best *
        POSE_PATCH_TOP1_WEIGHT
        +
        second *
        POSE_PATCH_TOP2_WEIGHT
        +
        third *
        POSE_PATCH_TOP3_WEIGHT
        +
        fourth *
        POSE_PATCH_TOP4_WEIGHT
    )

    score = (
        pose_patch_similarity_to_score(
            raw_similarity
        )
    )

    print(
        "🧭 POSE-AGNOSTIC PATCH:",
        {
            "best":
                round(
                    best,
                    6,
                ),

            "second":
                round(
                    second,
                    6,
                ),

            "third":
                round(
                    third,
                    6,
                ),

            "fourth":
                round(
                    fourth,
                    6,
                ),

            "raw":
                round(
                    raw_similarity,
                    6,
                ),

            "score":
                round(
                    score,
                    6,
                ),

            "patchCountA":
                len(
                    patches_a
                ),

            "patchCountB":
                len(
                    patches_b
                ),

            "pairs": [
                (
                    item[
                        "patchA"
                    ],
                    item[
                        "patchB"
                    ],
                    round(
                        item[
                            "similarity"
                        ],
                        4,
                    ),
                )
                for item in matches
            ],
        }
    )

    return {
        "enabled":
            True,

        "rawSimilarity":
            float(
                raw_similarity
            ),

        "score":
            float(
                score
            ),

        "bestSimilarity":
            float(
                best
            ),

        "secondSimilarity":
            float(
                second
            ),

        "thirdSimilarity":
            float(
                third
            ),

        "fourthSimilarity":
            float(
                fourth
            ),

        "patchCountA":
            len(
                patches_a
            ),

        "patchCountB":
            len(
                patches_b
            ),

        "matchedPairs":
            len(
                matches
            ),
    }


# ==========================================
# DINOV2 LOCAL FEATURE MATCHING ENGINE
#
# Sprint 1.4.3.14
#
# En lugar de crear recortes arbitrarios,
# utilizamos los patch tokens internos de
# DINOv2.
#
# Cada token representa una región local
# aprendida por el modelo.
#
# Matching:
# 1. extraer patch tokens
# 2. normalizar L2
# 3. matriz coseno token A x token B
# 4. Mutual Nearest Neighbors
# 5. tomar las mejores coincidencias mutuas
#
# Ventajas:
# - tolera mejor cambios de pose
# - no exige misma posición espacial
# - aprovecha patrones locales del pelaje
# - evita reutilizar un token muchas veces
#
# IMPORTANTE:
# Local DINO es evidencia adicional.
# No confirma identidad por sí solo.
# ==========================================

LOCAL_DINO_TOP_MATCHES = 24

LOCAL_DINO_MIN_RAW = 0.48
LOCAL_DINO_MAX_RAW = 0.78

LOCAL_DINO_MIN_MUTUAL_MATCHES = 6


def _extract_tensor_from_dino_features(
    features,
) -> torch.Tensor:

    # timm puede devolver:
    # - Tensor [B, N, C]
    # - dict con x_norm_patchtokens
    # - dict con x_prenorm
    # - tuple/list

    if isinstance(
        features,
        dict,
    ):

        preferred_keys = [
            "x_norm_patchtokens",
            "x_patchtokens",
            "x_prenorm",
            "x",
        ]

        for key in preferred_keys:

            value = features.get(
                key
            )

            if torch.is_tensor(
                value
            ):
                return value

        for value in features.values():

            if torch.is_tensor(
                value
            ):
                return value

        raise RuntimeError(
            "DINOv2 forward_features no devolvió tensor utilizable."
        )

    if isinstance(
        features,
        (tuple, list),
    ):

        for value in features:

            if torch.is_tensor(
                value
            ):
                return value

        raise RuntimeError(
            "DINOv2 forward_features devolvió tuple/list sin tensor."
        )

    if torch.is_tensor(
        features
    ):
        return features

    raise RuntimeError(
        f"Tipo inesperado de features DINOv2: {type(features)}"
    )


def get_dino_local_tokens(
    image: Image.Image,
) -> torch.Tensor:

    tensor = (
        dino_transform(
            image
        )
        .unsqueeze(0)
        .to(DEVICE)
    )

    with torch.no_grad():

        features = (
            dino_model.forward_features(
                tensor
            )
        )

    tokens = (
        _extract_tensor_from_dino_features(
            features
        )
    )

    # ======================================
    # Normalizar shape a [B, N, C]
    # ======================================

    if tokens.ndim == 2:

        tokens = (
            tokens.unsqueeze(0)
        )

    if tokens.ndim != 3:
        raise RuntimeError(
            f"Shape DINO local inesperado: {tuple(tokens.shape)}"
        )

    # ======================================
    # Quitar tokens especiales si existen.
    #
    # timm ViT suele exponer
    # num_prefix_tokens.
    #
    # Si forward_features ya devolvió
    # x_norm_patchtokens, normalmente no
    # habrá prefijos y esta comprobación
    # no elimina nada accidentalmente.
    # ======================================

    num_prefix_tokens = int(
        getattr(
            dino_model,
            "num_prefix_tokens",
            0,
        )
        or 0
    )

    patch_embed = getattr(
        dino_model,
        "patch_embed",
        None,
    )

    expected_patches = getattr(
        patch_embed,
        "num_patches",
        None,
    )

    if (
        expected_patches is not None
        and tokens.shape[1] > int(
            expected_patches
        )
    ):

        extra = (
            tokens.shape[1]
            -
            int(
                expected_patches
            )
        )

        tokens = (
            tokens[
                :,
                extra:,
                :
            ]
        )

    elif (
        num_prefix_tokens > 0
        and tokens.shape[1] > num_prefix_tokens
    ):

        # Sólo quitamos prefijos cuando el
        # número de tokens parece incluirlos.
        possible_patch_count = (
            tokens.shape[1]
            -
            num_prefix_tokens
        )

        if (
            expected_patches is None
            or possible_patch_count == int(
                expected_patches
            )
        ):
            tokens = (
                tokens[
                    :,
                    num_prefix_tokens:,
                    :
                ]
            )

    tokens = (
        tokens[
            0
        ]
        .float()
    )

    tokens = (
        torch.nn.functional.normalize(
            tokens,
            p=2,
            dim=1,
        )
    )

    return tokens


def _select_local_dino_source(
    prepared: dict,
) -> Image.Image:

    # Preferimos crop si MegaDetector lo
    # encontró. Si no, usamos original.

    crop = prepared.get(
        "crop"
    )

    if crop is not None:
        return crop

    return prepared[
        "original"
    ]


def calculate_dino_local_feature_matching(
    prepared_a: dict,
    prepared_b: dict,
) -> dict:

    image_a = (
        _select_local_dino_source(
            prepared_a
        )
    )

    image_b = (
        _select_local_dino_source(
            prepared_b
        )
    )

    tokens_a = (
        get_dino_local_tokens(
            image_a
        )
    )

    tokens_b = (
        get_dino_local_tokens(
            image_b
        )
    )

    token_count_a = int(
        tokens_a.shape[0]
    )

    token_count_b = int(
        tokens_b.shape[0]
    )

    if (
        token_count_a == 0
        or token_count_b == 0
    ):

        return {
            "enabled":
                True,

            "score":
                0.0,

            "rawSimilarity":
                0.0,

            "bestSimilarity":
                0.0,

            "meanTopSimilarity":
                0.0,

            "mutualMatches":
                0,

            "tokenCountA":
                token_count_a,

            "tokenCountB":
                token_count_b,

            "coverageA":
                0.0,

            "coverageB":
                0.0,
        }

    # ======================================
    # MATRIZ DE SIMILITUD COSENO
    #
    # tokens ya están normalizados.
    # ======================================

    similarity_matrix = (
        tokens_a
        @
        tokens_b.T
    )

    # Para cada token de A:
    # mejor token en B.

    best_b_for_a = (
        torch.argmax(
            similarity_matrix,
            dim=1,
        )
    )

    # Para cada token de B:
    # mejor token en A.

    best_a_for_b = (
        torch.argmax(
            similarity_matrix,
            dim=0,
        )
    )

    indices_a = (
        torch.arange(
            token_count_a,
            device=
                similarity_matrix.device,
        )
    )

    reciprocal_a = (
        best_a_for_b[
            best_b_for_a
        ]
    )

    mutual_mask = (
        reciprocal_a
        ==
        indices_a
    )

    mutual_a = (
        indices_a[
            mutual_mask
        ]
    )

    mutual_b = (
        best_b_for_a[
            mutual_mask
        ]
    )

    mutual_matches = int(
        mutual_a.shape[0]
    )

    if mutual_matches == 0:

        return {
            "enabled":
                True,

            "score":
                0.0,

            "rawSimilarity":
                0.0,

            "bestSimilarity":
                0.0,

            "meanTopSimilarity":
                0.0,

            "mutualMatches":
                0,

            "tokenCountA":
                token_count_a,

            "tokenCountB":
                token_count_b,

            "coverageA":
                0.0,

            "coverageB":
                0.0,
        }

    mutual_similarities = (
        similarity_matrix[
            mutual_a,
            mutual_b,
        ]
    )

    mutual_similarities = (
        torch.sort(
            mutual_similarities,
            descending=True,
        )
        .values
    )

    top_count = min(
        LOCAL_DINO_TOP_MATCHES,
        mutual_matches,
    )

    top_values = (
        mutual_similarities[
            :top_count
        ]
    )

    best_similarity = float(
        top_values[
            0
        ]
        .detach()
        .cpu()
        .item()
    )

    mean_top_similarity = float(
        top_values
        .mean()
        .detach()
        .cpu()
        .item()
    )

    # ======================================
    # Cobertura
    #
    # Una única zona muy parecida no basta.
    # Queremos múltiples matches mutuos.
    # ======================================

    coverage_a = (
        mutual_matches
        /
        max(
            1,
            token_count_a,
        )
    )

    coverage_b = (
        mutual_matches
        /
        max(
            1,
            token_count_b,
        )
    )

    # ======================================
    # Score crudo
    #
    # 85% similitud media de los mejores MNN
    # 15% mejor coincidencia.
    #
    # Esto evita depender sólo de un pico.
    # ======================================

    raw_similarity = (
        mean_top_similarity *
        0.85
        +
        best_similarity *
        0.15
    )

    # Penalización si hay muy pocos
    # matches recíprocos.

    if (
        mutual_matches
        <
        LOCAL_DINO_MIN_MUTUAL_MATCHES
    ):

        support_factor = (
            mutual_matches
            /
            LOCAL_DINO_MIN_MUTUAL_MATCHES
        )

        raw_similarity = (
            raw_similarity
            *
            support_factor
        )

    score = (
        similarity_to_unit(
            raw_similarity,
            minimum=
                LOCAL_DINO_MIN_RAW,
            maximum=
                LOCAL_DINO_MAX_RAW,
        )
    )

    print(
        "🧬 DINO LOCAL FEATURES:",
        {
            "tokensA":
                token_count_a,

            "tokensB":
                token_count_b,

            "mutualMatches":
                mutual_matches,

            "coverageA":
                round(
                    coverage_a,
                    6,
                ),

            "coverageB":
                round(
                    coverage_b,
                    6,
                ),

            "best":
                round(
                    best_similarity,
                    6,
                ),

            "meanTop":
                round(
                    mean_top_similarity,
                    6,
                ),

            "raw":
                round(
                    raw_similarity,
                    6,
                ),

            "score":
                round(
                    score,
                    6,
                ),
        }
    )

    return {
        "enabled":
            True,

        "score":
            float(
                score
            ),

        "rawSimilarity":
            float(
                raw_similarity
            ),

        "bestSimilarity":
            float(
                best_similarity
            ),

        "meanTopSimilarity":
            float(
                mean_top_similarity
            ),

        "mutualMatches":
            mutual_matches,

        "tokenCountA":
            token_count_a,

        "tokenCountB":
            token_count_b,

        "coverageA":
            float(
                coverage_a
            ),

        "coverageB":
            float(
                coverage_b
            ),
    }


# ==========================================
# SPATIALLY CONSISTENT DINO LOCAL MATCHING
#
# Sprint 1.4.3.15
#
# Problema del Paso 17:
# DINO local encontró similitudes visuales
# muy altas incluso entre perros distintos.
#
# Solución:
# ya no alcanza con que dos tokens "se vean
# parecidos". También exigimos que múltiples
# matches mantengan una geometría relativa
# coherente.
#
# Idea:
#
# 1. extraer tokens locales DINO
# 2. mutual nearest neighbor matching
# 3. recuperar coordenadas 2D de cada token
# 4. medir desplazamientos A -> B
# 5. buscar un grupo dominante de matches
#    con desplazamiento espacial parecido
# 6. combinar:
#       appearance + geometry consistency
#
# No exige posición exacta.
# Tolera traslación y cambios moderados de
# postura, pero penaliza correspondencias
# espaciales caóticas.
# ==========================================

SPATIAL_LOCAL_TOP_MATCHES = 96

SPATIAL_LOCAL_DISPLACEMENT_THRESHOLD = 0.18

SPATIAL_LOCAL_MIN_INLIERS = 8

SPATIAL_LOCAL_APPEARANCE_WEIGHT = 0.55
SPATIAL_LOCAL_GEOMETRY_WEIGHT = 0.45


def _infer_token_grid(
    token_count: int,
) -> tuple[int, int]:

    # En ViT con entrada cuadrada, la grilla
    # suele ser cuadrada.
    side = int(
        round(
            token_count ** 0.5
        )
    )

    if (
        side > 0
        and side * side == token_count
    ):
        return (
            side,
            side,
        )

    # Fallback: buscar factores cercanos.
    best_h = 1
    best_w = token_count
    best_diff = abs(
        best_w -
        best_h
    )

    for h in range(
        1,
        int(
            token_count ** 0.5
        ) + 1,
    ):

        if token_count % h != 0:
            continue

        w = (
            token_count //
            h
        )

        diff = abs(
            w -
            h
        )

        if diff < best_diff:

            best_h = h
            best_w = w
            best_diff = diff

    return (
        best_h,
        best_w,
    )


def _token_coordinates(
    token_count: int,
    device,
) -> torch.Tensor:

    rows, cols = (
        _infer_token_grid(
            token_count
        )
    )

    # Coordenadas normalizadas 0..1.
    ys = (
        torch.arange(
            rows,
            device=device,
            dtype=torch.float32,
        )
        +
        0.5
    ) / max(
        1,
        rows,
    )

    xs = (
        torch.arange(
            cols,
            device=device,
            dtype=torch.float32,
        )
        +
        0.5
    ) / max(
        1,
        cols,
    )

    grid_y, grid_x = (
        torch.meshgrid(
            ys,
            xs,
            indexing="ij",
        )
    )

    coords = (
        torch.stack(
            [
                grid_x.reshape(-1),
                grid_y.reshape(-1),
            ],
            dim=1,
        )
    )

    # Seguridad por si el número de tokens
    # no coincide exactamente con rows*cols.
    return coords[
        :token_count
    ]


def _mutual_dino_matches_with_coordinates(
    prepared_a: dict,
    prepared_b: dict,
) -> dict:

    image_a = (
        _select_local_dino_source(
            prepared_a
        )
    )

    image_b = (
        _select_local_dino_source(
            prepared_b
        )
    )

    tokens_a = (
        get_dino_local_tokens(
            image_a
        )
    )

    tokens_b = (
        get_dino_local_tokens(
            image_b
        )
    )

    count_a = int(
        tokens_a.shape[0]
    )

    count_b = int(
        tokens_b.shape[0]
    )

    coords_a = (
        _token_coordinates(
            count_a,
            tokens_a.device,
        )
    )

    coords_b = (
        _token_coordinates(
            count_b,
            tokens_b.device,
        )
    )

    similarity_matrix = (
        tokens_a
        @
        tokens_b.T
    )

    best_b_for_a = (
        torch.argmax(
            similarity_matrix,
            dim=1,
        )
    )

    best_a_for_b = (
        torch.argmax(
            similarity_matrix,
            dim=0,
        )
    )

    indices_a = (
        torch.arange(
            count_a,
            device=tokens_a.device,
        )
    )

    reciprocal_a = (
        best_a_for_b[
            best_b_for_a
        ]
    )

    mutual_mask = (
        reciprocal_a
        ==
        indices_a
    )

    mutual_a = (
        indices_a[
            mutual_mask
        ]
    )

    mutual_b = (
        best_b_for_a[
            mutual_mask
        ]
    )

    if mutual_a.numel() == 0:

        return {
            "tokensA":
                tokens_a,

            "tokensB":
                tokens_b,

            "coordsA":
                coords_a,

            "coordsB":
                coords_b,

            "mutualA":
                mutual_a,

            "mutualB":
                mutual_b,

            "mutualSimilarities":
                torch.empty(
                    0,
                    device=tokens_a.device,
                ),
        }

    mutual_similarities = (
        similarity_matrix[
            mutual_a,
            mutual_b,
        ]
    )

    # Ordenar por apariencia descendente.
    order = (
        torch.argsort(
            mutual_similarities,
            descending=True,
        )
    )

    mutual_a = (
        mutual_a[
            order
        ]
    )

    mutual_b = (
        mutual_b[
            order
        ]
    )

    mutual_similarities = (
        mutual_similarities[
            order
        ]
    )

    max_keep = min(
        SPATIAL_LOCAL_TOP_MATCHES,
        int(
            mutual_similarities.shape[0]
        ),
    )

    mutual_a = (
        mutual_a[
            :max_keep
        ]
    )

    mutual_b = (
        mutual_b[
            :max_keep
        ]
    )

    mutual_similarities = (
        mutual_similarities[
            :max_keep
        ]
    )

    return {
        "tokensA":
            tokens_a,

        "tokensB":
            tokens_b,

        "coordsA":
            coords_a,

        "coordsB":
            coords_b,

        "mutualA":
            mutual_a,

        "mutualB":
            mutual_b,

        "mutualSimilarities":
            mutual_similarities,
    }


def calculate_spatially_consistent_local_matching(
    prepared_a: dict,
    prepared_b: dict,
) -> dict:

    data = (
        _mutual_dino_matches_with_coordinates(
            prepared_a,
            prepared_b,
        )
    )

    mutual_a = data[
        "mutualA"
    ]

    mutual_b = data[
        "mutualB"
    ]

    similarities = data[
        "mutualSimilarities"
    ]

    coords_a = data[
        "coordsA"
    ]

    coords_b = data[
        "coordsB"
    ]

    token_count_a = int(
        data[
            "tokensA"
        ].shape[0]
    )

    token_count_b = int(
        data[
            "tokensB"
        ].shape[0]
    )

    mutual_matches = int(
        mutual_a.shape[0]
    )

    if mutual_matches == 0:

        return {
            "enabled":
                True,

            "score":
                0.0,

            "appearanceScore":
                0.0,

            "geometryScore":
                0.0,

            "consistency":
                0.0,

            "mutualMatches":
                0,

            "inlierMatches":
                0,

            "meanDisplacement":
                0.0,

            "displacementStd":
                0.0,

            "coverageA":
                0.0,

            "coverageB":
                0.0,
        }

    points_a = (
        coords_a[
            mutual_a
        ]
    )

    points_b = (
        coords_b[
            mutual_b
        ]
    )

    # ======================================
    # DESPLAZAMIENTO A -> B
    # ======================================

    displacements = (
        points_b
        -
        points_a
    )

    # Mediana robusta del desplazamiento.
    median_dx = (
        torch.median(
            displacements[
                :,
                0
            ]
        )
    )

    median_dy = (
        torch.median(
            displacements[
                :,
                1
            ]
        )
    )

    median_displacement = (
        torch.stack(
            [
                median_dx,
                median_dy,
            ]
        )
    )

    residuals = (
        torch.linalg.norm(
            displacements
            -
            median_displacement,
            dim=1,
        )
    )

    inlier_mask = (
        residuals
        <=
        SPATIAL_LOCAL_DISPLACEMENT_THRESHOLD
    )

    inlier_count = int(
        inlier_mask.sum()
        .detach()
        .cpu()
        .item()
    )

    consistency = (
        inlier_count
        /
        max(
            1,
            mutual_matches,
        )
    )

    if inlier_count > 0:

        inlier_similarities = (
            similarities[
                inlier_mask
            ]
        )

        appearance_raw = float(
            inlier_similarities
            .mean()
            .detach()
            .cpu()
            .item()
        )

    else:

        appearance_raw = 0.0

    appearance_score = (
        similarity_to_unit(
            appearance_raw,
            minimum=0.55,
            maximum=0.88,
        )
    )

    # ======================================
    # GEOMETRY SCORE
    #
    # 0.35 de consistencia ya es algo útil;
    # 0.75 es muy fuerte.
    # ======================================

    geometry_score = (
        similarity_to_unit(
            consistency,
            minimum=0.30,
            maximum=0.75,
        )
    )

    # Penalización si hay muy pocos inliers.
    support_factor = min(
        1.0,
        inlier_count
        /
        max(
            1,
            SPATIAL_LOCAL_MIN_INLIERS,
        ),
    )

    score = (
        appearance_score
        *
        SPATIAL_LOCAL_APPEARANCE_WEIGHT
        +
        geometry_score
        *
        SPATIAL_LOCAL_GEOMETRY_WEIGHT
    )

    score = (
        score
        *
        support_factor
    )

    mean_displacement = float(
        torch.linalg.norm(
            median_displacement
        )
        .detach()
        .cpu()
        .item()
    )

    displacement_std = float(
        residuals
        .std(
            unbiased=False
        )
        .detach()
        .cpu()
        .item()
    )

    coverage_a = (
        inlier_count
        /
        max(
            1,
            token_count_a,
        )
    )

    coverage_b = (
        inlier_count
        /
        max(
            1,
            token_count_b,
        )
    )

    print(
        "📐 SPATIAL LOCAL DINO:",
        {
            "mutual":
                mutual_matches,

            "inliers":
                inlier_count,

            "consistency":
                round(
                    consistency,
                    6,
                ),

            "appearanceRaw":
                round(
                    appearance_raw,
                    6,
                ),

            "appearanceScore":
                round(
                    appearance_score,
                    6,
                ),

            "geometryScore":
                round(
                    geometry_score,
                    6,
                ),

            "meanDisp":
                round(
                    mean_displacement,
                    6,
                ),

            "dispStd":
                round(
                    displacement_std,
                    6,
                ),

            "score":
                round(
                    score,
                    6,
                ),
        }
    )

    return {
        "enabled":
            True,

        "score":
            float(
                max(
                    0.0,
                    min(
                        1.0,
                        score,
                    ),
                )
            ),

        "appearanceScore":
            float(
                appearance_score
            ),

        "geometryScore":
            float(
                geometry_score
            ),

        "consistency":
            float(
                consistency
            ),

        "mutualMatches":
            mutual_matches,

        "inlierMatches":
            inlier_count,

        "meanDisplacement":
            mean_displacement,

        "displacementStd":
            displacement_std,

        "coverageA":
            float(
                coverage_a
            ),

        "coverageB":
            float(
                coverage_b
            ),
    }


# ==========================================
# DISTINCTIVE LOCAL DINO MATCHING
#
# Sprint 1.4.3.16
#
# Problema:
# DINO local encuentra matches de alta
# similitud también entre perros distintos.
#
# Solución:
# no alcanza con "mejor similitud".
# Medimos qué tan superior es el mejor match
# respecto del segundo mejor.
#
# margin = best_similarity - second_similarity
#
# Un match con best=0.94 y second=0.93
# es genérico.
#
# Un match con best=0.94 y second=0.75
# es mucho más distintivo.
#
# Se usa criterio bidireccional:
# A -> B y B -> A.
# ==========================================

DISTINCTIVE_LOCAL_TOP_MATCHES = 96

# Umbral inicial deliberadamente moderado.
# Primero medimos Rita vs negativos y después
# calibramos con datos reales.
DISTINCTIVE_LOCAL_MIN_MARGIN = 0.012

DISTINCTIVE_LOCAL_STRONG_MARGIN = 0.060

DISTINCTIVE_LOCAL_MIN_QUALIFIED = 8


def calculate_distinctive_local_matching(
    prepared_a: dict,
    prepared_b: dict,
) -> dict:

    image_a = (
        _select_local_dino_source(
            prepared_a
        )
    )

    image_b = (
        _select_local_dino_source(
            prepared_b
        )
    )

    tokens_a = (
        get_dino_local_tokens(
            image_a
        )
    )

    tokens_b = (
        get_dino_local_tokens(
            image_b
        )
    )

    count_a = int(
        tokens_a.shape[0]
    )

    count_b = int(
        tokens_b.shape[0]
    )

    if count_a < 2 or count_b < 2:

        return {
            "enabled": True,
            "score": 0.0,
            "meanSimilarity": 0.0,
            "meanMargin": 0.0,
            "medianMargin": 0.0,
            "bestMargin": 0.0,
            "mutualMatches": 0,
            "qualifiedMatches": 0,
            "distinctiveRatio": 0.0,
            "coverageA": 0.0,
            "coverageB": 0.0,
        }

    similarity_matrix = (
        tokens_a
        @
        tokens_b.T
    )

    # ======================================
    # TOP-2 EN CADA DIRECCIÓN
    # ======================================

    top2_a = torch.topk(
        similarity_matrix,
        k=2,
        dim=1,
        largest=True,
        sorted=True,
    )

    best_val_a = top2_a.values[:, 0]
    second_val_a = top2_a.values[:, 1]
    best_idx_b = top2_a.indices[:, 0]

    margin_a = (
        best_val_a
        -
        second_val_a
    )

    top2_b = torch.topk(
        similarity_matrix.T,
        k=2,
        dim=1,
        largest=True,
        sorted=True,
    )

    best_val_b = top2_b.values[:, 0]
    second_val_b = top2_b.values[:, 1]
    best_idx_a = top2_b.indices[:, 0]

    margin_b = (
        best_val_b
        -
        second_val_b
    )

    # ======================================
    # MUTUAL NEAREST NEIGHBOR
    # ======================================

    indices_a = torch.arange(
        count_a,
        device=similarity_matrix.device,
    )

    reciprocal_a = (
        best_idx_a[
            best_idx_b
        ]
    )

    mutual_mask = (
        reciprocal_a
        ==
        indices_a
    )

    mutual_a = (
        indices_a[
            mutual_mask
        ]
    )

    mutual_b = (
        best_idx_b[
            mutual_mask
        ]
    )

    mutual_matches = int(
        mutual_a.shape[0]
    )

    if mutual_matches == 0:

        return {
            "enabled": True,
            "score": 0.0,
            "meanSimilarity": 0.0,
            "meanMargin": 0.0,
            "medianMargin": 0.0,
            "bestMargin": 0.0,
            "mutualMatches": 0,
            "qualifiedMatches": 0,
            "distinctiveRatio": 0.0,
            "coverageA": 0.0,
            "coverageB": 0.0,
        }

    mutual_similarity = (
        similarity_matrix[
            mutual_a,
            mutual_b
        ]
    )

    # El margen del par debe ser bueno
    # en ambas direcciones.
    pair_margin = torch.minimum(
        margin_a[
            mutual_a
        ],
        margin_b[
            mutual_b
        ],
    )

    # Ordenamos por margen, no solamente por
    # similitud visual.
    order = torch.argsort(
        pair_margin,
        descending=True,
    )

    mutual_similarity = (
        mutual_similarity[
            order
        ]
    )

    pair_margin = (
        pair_margin[
            order
        ]
    )

    keep = min(
        DISTINCTIVE_LOCAL_TOP_MATCHES,
        mutual_matches,
    )

    mutual_similarity = (
        mutual_similarity[
            :keep
        ]
    )

    pair_margin = (
        pair_margin[
            :keep
        ]
    )

    qualified_mask = (
        pair_margin
        >=
        DISTINCTIVE_LOCAL_MIN_MARGIN
    )

    qualified_similarity = (
        mutual_similarity[
            qualified_mask
        ]
    )

    qualified_margin = (
        pair_margin[
            qualified_mask
        ]
    )

    qualified_matches = int(
        qualified_margin.shape[0]
    )

    distinctive_ratio = (
        qualified_matches
        /
        max(
            1,
            keep,
        )
    )

    if qualified_matches > 0:

        mean_similarity = float(
            qualified_similarity
            .mean()
            .detach()
            .cpu()
            .item()
        )

        mean_margin = float(
            qualified_margin
            .mean()
            .detach()
            .cpu()
            .item()
        )

        median_margin = float(
            qualified_margin
            .median()
            .detach()
            .cpu()
            .item()
        )

        best_margin = float(
            qualified_margin[
                0
            ]
            .detach()
            .cpu()
            .item()
        )

    else:

        mean_similarity = 0.0
        mean_margin = 0.0
        median_margin = 0.0
        best_margin = 0.0

    # ======================================
    # SCORE
    #
    # 1) apariencia de matches calificados
    # 2) fuerza del margen
    # 3) proporción de matches distintivos
    # 4) soporte mínimo
    #
    # Importante:
    # este score NO debe considerarse
    # calibrado para producción hasta probar
    # positivos y negativos reales.
    # ======================================

    appearance_score = similarity_to_unit(
        mean_similarity,
        minimum=0.55,
        maximum=0.88,
    )

    margin_score = similarity_to_unit(
        mean_margin,
        minimum=DISTINCTIVE_LOCAL_MIN_MARGIN,
        maximum=DISTINCTIVE_LOCAL_STRONG_MARGIN,
    )

    ratio_score = similarity_to_unit(
        distinctive_ratio,
        minimum=0.10,
        maximum=0.55,
    )

    support_factor = min(
        1.0,
        qualified_matches
        /
        max(
            1,
            DISTINCTIVE_LOCAL_MIN_QUALIFIED,
        ),
    )

    score = (
        appearance_score * 0.40
        +
        margin_score * 0.40
        +
        ratio_score * 0.20
    )

    score = (
        score
        *
        support_factor
    )

    score = float(
        max(
            0.0,
            min(
                1.0,
                score,
            ),
        )
    )

    coverage_a = (
        qualified_matches
        /
        max(
            1,
            count_a,
        )
    )

    coverage_b = (
        qualified_matches
        /
        max(
            1,
            count_b,
        )
    )

    print(
        "🎯 DISTINCTIVE LOCAL DINO:",
        {
            "mutual":
                mutual_matches,

            "kept":
                keep,

            "qualified":
                qualified_matches,

            "ratio":
                round(
                    distinctive_ratio,
                    6,
                ),

            "meanSimilarity":
                round(
                    mean_similarity,
                    6,
                ),

            "meanMargin":
                round(
                    mean_margin,
                    6,
                ),

            "medianMargin":
                round(
                    median_margin,
                    6,
                ),

            "bestMargin":
                round(
                    best_margin,
                    6,
                ),

            "score":
                round(
                    score,
                    6,
                ),
        }
    )

    return {
        "enabled":
            True,

        "score":
            score,

        "meanSimilarity":
            mean_similarity,

        "meanMargin":
            mean_margin,

        "medianMargin":
            median_margin,

        "bestMargin":
            best_margin,

        "mutualMatches":
            mutual_matches,

        "qualifiedMatches":
            qualified_matches,

        "distinctiveRatio":
            float(
                distinctive_ratio
            ),

        "coverageA":
            float(
                coverage_a
            ),

        "coverageB":
            float(
                coverage_b
            ),
    }


# ==========================================
# IDENTITY REGIONS / PART-AWARE RE-ID
#
# Sprint 1.4.3.17
#
# Objetivo:
# comparar regiones amplias del animal en
# lugar de depender de miles de tokens DINO
# genéricos.
#
# Cada región combina:
#
# - DINOv2 global de la región
# - color HSV
# - textura local
#
# Regiones amplias y superpuestas:
#
# - upper
# - center
# - lower
# - dorsal
# - left_body
# - right_body
# - core
#
# Al ser superpuestas, toleran mejor cambios
# moderados de encuadre y postura.
#
# IMPORTANTE:
# este motor sigue siendo experimental.
# Se valida primero con positivos y negativos
# antes de integrarlo a Node.
# ==========================================

IDENTITY_REGION_DEFINITIONS = {
    "upper": (
        0.05,
        0.00,
        0.95,
        0.48,
    ),

    "center": (
        0.08,
        0.22,
        0.92,
        0.82,
    ),

    "lower": (
        0.05,
        0.52,
        0.95,
        1.00,
    ),

    "dorsal": (
        0.05,
        0.05,
        0.95,
        0.60,
    ),

    "left_body": (
        0.00,
        0.12,
        0.62,
        0.92,
    ),

    "right_body": (
        0.38,
        0.12,
        1.00,
        0.92,
    ),

    "core": (
        0.18,
        0.18,
        0.82,
        0.86,
    ),
}


IDENTITY_REGION_ALLOWED_MATCHES = {
    "upper": [
        "upper",
        "dorsal",
    ],

    "center": [
        "center",
        "core",
    ],

    "lower": [
        "lower",
    ],

    "dorsal": [
        "dorsal",
        "upper",
    ],

    "left_body": [
        "left_body",
        "right_body",
    ],

    "right_body": [
        "right_body",
        "left_body",
    ],

    "core": [
        "core",
        "center",
    ],
}


def _crop_fraction(
    image: Image.Image,
    box: tuple[
        float,
        float,
        float,
        float,
    ],
) -> Image.Image:

    width, height = image.size

    x1, y1, x2, y2 = box

    left = int(
        max(
            0,
            min(
                width - 1,
                round(
                    x1 * width
                ),
            ),
        )
    )

    top = int(
        max(
            0,
            min(
                height - 1,
                round(
                    y1 * height
                ),
            ),
        )
    )

    right = int(
        max(
            left + 1,
            min(
                width,
                round(
                    x2 * width
                ),
            ),
        )
    )

    bottom = int(
        max(
            top + 1,
            min(
                height,
                round(
                    y2 * height
                ),
            ),
        )
    )

    return image.crop(
        (
            left,
            top,
            right,
            bottom,
        )
    )


def _build_identity_regions(
    prepared: dict,
) -> dict[
    str,
    Image.Image,
]:

    source = (
        _select_local_dino_source(
            prepared
        )
    )

    regions = {}

    for (
        name,
        box,
    ) in IDENTITY_REGION_DEFINITIONS.items():

        regions[
            name
        ] = _crop_fraction(
            source,
            box,
        )

    return regions


def _regional_color_descriptor(
    image: Image.Image,
) -> np.ndarray:

    # HSV separa mejor tono / saturación
    # que RGB para patrones de pelaje.

    resized = image.resize(
        (
            96,
            96,
        )
    )

    hsv = np.asarray(
        resized.convert(
            "HSV"
        ),
        dtype=np.uint8,
    )

    h = hsv[
        :,
        :,
        0
    ].reshape(-1)

    s = hsv[
        :,
        :,
        1
    ].reshape(-1)

    v = hsv[
        :,
        :,
        2
    ].reshape(-1)

    hist_h, _ = np.histogram(
        h,
        bins=24,
        range=(
            0,
            256,
        ),
    )

    hist_s, _ = np.histogram(
        s,
        bins=12,
        range=(
            0,
            256,
        ),
    )

    hist_v, _ = np.histogram(
        v,
        bins=12,
        range=(
            0,
            256,
        ),
    )

    descriptor = np.concatenate(
        [
            hist_h,
            hist_s,
            hist_v,
        ]
    ).astype(
        np.float32
    )

    total = float(
        descriptor.sum()
    )

    if total > 0:
        descriptor /= total

    return descriptor


def _regional_texture_descriptor(
    image: Image.Image,
) -> np.ndarray:

    gray = np.asarray(
        image
        .convert(
            "L"
        )
        .resize(
            (
                96,
                96,
            )
        ),
        dtype=np.float32,
    ) / 255.0

    # Gradientes simples.
    gx = np.diff(
        gray,
        axis=1,
        append=gray[
            :,
            -1:
        ],
    )

    gy = np.diff(
        gray,
        axis=0,
        append=gray[
            -1:,
            :
        ],
    )

    magnitude = np.sqrt(
        gx * gx
        +
        gy * gy
    )

    intensity_hist, _ = np.histogram(
        gray.reshape(-1),
        bins=20,
        range=(
            0.0,
            1.0,
        ),
    )

    gradient_hist, _ = np.histogram(
        magnitude.reshape(-1),
        bins=20,
        range=(
            0.0,
            0.75,
        ),
    )

    descriptor = np.concatenate(
        [
            intensity_hist,
            gradient_hist,
        ]
    ).astype(
        np.float32
    )

    norm = float(
        np.linalg.norm(
            descriptor
        )
    )

    if norm > 0:
        descriptor /= norm

    return descriptor


def _histogram_intersection(
    a: np.ndarray,
    b: np.ndarray,
) -> float:

    denom = max(
        1e-8,
        float(
            min(
                a.sum(),
                b.sum(),
            )
        ),
    )

    return float(
        np.minimum(
            a,
            b,
        ).sum()
        /
        denom
    )


def _descriptor_cosine(
    a: np.ndarray,
    b: np.ndarray,
) -> float:

    denom = (
        float(
            np.linalg.norm(
                a
            )
        )
        *
        float(
            np.linalg.norm(
                b
            )
        )
    )

    if denom <= 1e-8:
        return 0.0

    return float(
        np.dot(
            a,
            b,
        )
        /
        denom
    )


def _prepare_identity_region_features(
    prepared: dict,
) -> dict:

    regions = (
        _build_identity_regions(
            prepared
        )
    )

    result = {}

    for (
        name,
        region_image,
    ) in regions.items():

        dino_embedding = (
            get_dino_embedding(
                region_image
            )
        )

        color_descriptor = (
            _regional_color_descriptor(
                region_image
            )
        )

        texture_descriptor = (
            _regional_texture_descriptor(
                region_image
            )
        )

        result[
            name
        ] = {
            "dino":
                dino_embedding,

            "color":
                color_descriptor,

            "texture":
                texture_descriptor,
        }

    return result


def _identity_region_pair_score(
    features_a: dict,
    features_b: dict,
) -> dict:

    dino_raw = cosine_similarity(
        features_a[
            "dino"
        ],
        features_b[
            "dino"
        ],
    )

    dino_score = similarity_to_unit(
        dino_raw,
        minimum=0.42,
        maximum=0.82,
    )

    color_score = (
        _histogram_intersection(
            features_a[
                "color"
            ],
            features_b[
                "color"
            ],
        )
    )

    texture_score = (
        _descriptor_cosine(
            features_a[
                "texture"
            ],
            features_b[
                "texture"
            ],
        )
    )

    # DINO describe forma/apariencia general.
    # Color y textura aportan señales de
    # patrón de pelaje.
    score = (
        dino_score * 0.50
        +
        color_score * 0.30
        +
        texture_score * 0.20
    )

    return {
        "score":
            float(
                max(
                    0.0,
                    min(
                        1.0,
                        score,
                    ),
                )
            ),

        "dinoScore":
            float(
                dino_score
            ),

        "colorScore":
            float(
                color_score
            ),

        "textureScore":
            float(
                texture_score
            ),

        "dinoRaw":
            float(
                dino_raw
            ),
    }


def calculate_identity_regions_matching(
    prepared_a: dict,
    prepared_b: dict,
) -> dict:

    features_a = (
        _prepare_identity_region_features(
            prepared_a
        )
    )

    features_b = (
        _prepare_identity_region_features(
            prepared_b
        )
    )

    region_results = []

    for (
        region_a,
        allowed_b,
    ) in IDENTITY_REGION_ALLOWED_MATCHES.items():

        best_result = None
        best_region_b = None

        for region_b in allowed_b:

            pair_result = (
                _identity_region_pair_score(
                    features_a[
                        region_a
                    ],
                    features_b[
                        region_b
                    ],
                )
            )

            if (
                best_result is None
                or
                pair_result[
                    "score"
                ]
                >
                best_result[
                    "score"
                ]
            ):

                best_result = (
                    pair_result
                )

                best_region_b = (
                    region_b
                )

        region_results.append(
            {
                "regionA":
                    region_a,

                "regionB":
                    best_region_b,

                **best_result,
            }
        )

    scores = np.array(
        [
            item[
                "score"
            ]
            for item
            in region_results
        ],
        dtype=np.float32,
    )

    dino_scores = np.array(
        [
            item[
                "dinoScore"
            ]
            for item
            in region_results
        ],
        dtype=np.float32,
    )

    color_scores = np.array(
        [
            item[
                "colorScore"
            ]
            for item
            in region_results
        ],
        dtype=np.float32,
    )

    texture_scores = np.array(
        [
            item[
                "textureScore"
            ]
            for item
            in region_results
        ],
        dtype=np.float32,
    )

    order = np.argsort(
        scores
    )[
        ::-1
    ]

    best_index = int(
        order[
            0
        ]
    )

    worst_index = int(
        order[
            -1
        ]
    )

    top_count = min(
        4,
        len(
            scores
        ),
    )

    top_scores = scores[
        order[
            :top_count
        ]
    ]

    mean_score = float(
        scores.mean()
    )

    median_score = float(
        np.median(
            scores
        )
    )

    best_score = float(
        scores[
            best_index
        ]
    )

    strong_matches = int(
        np.sum(
            scores
            >=
            0.68
        )
    )

    # Exigimos consistencia en varias
    # regiones. No alcanza una sola región
    # excelente.
    robust_score = (
        median_score * 0.55
        +
        float(
            top_scores.mean()
        ) * 0.30
        +
        mean_score * 0.15
    )

    # Poco soporte -> penalización.
    support_factor = min(
        1.0,
        strong_matches
        /
        3.0,
    )

    if strong_matches < 2:
        robust_score *= 0.75

    elif strong_matches == 2:
        robust_score *= 0.90

    # Si hay 3+ regiones fuertes mantenemos
    # el score robusto sin castigo.
    robust_score = float(
        max(
            0.0,
            min(
                1.0,
                robust_score,
            ),
        )
    )

    # El support_factor se informa en logs;
    # el castigo ya se aplicó arriba.
    print(
        "🐾 IDENTITY REGIONS:",
        {
            "score":
                round(
                    robust_score,
                    6,
                ),

            "mean":
                round(
                    mean_score,
                    6,
                ),

            "median":
                round(
                    median_score,
                    6,
                ),

            "best":
                round(
                    best_score,
                    6,
                ),

            "strongMatches":
                strong_matches,

            "support":
                round(
                    support_factor,
                    6,
                ),

            "dino":
                round(
                    float(
                        dino_scores.mean()
                    ),
                    6,
                ),

            "color":
                round(
                    float(
                        color_scores.mean()
                    ),
                    6,
                ),

            "texture":
                round(
                    float(
                        texture_scores.mean()
                    ),
                    6,
                ),

            "bestRegion":
                (
                    region_results[
                        best_index
                    ][
                        "regionA"
                    ]
                    +
                    " ↔ "
                    +
                    region_results[
                        best_index
                    ][
                        "regionB"
                    ]
                ),

            "worstRegion":
                (
                    region_results[
                        worst_index
                    ][
                        "regionA"
                    ]
                    +
                    " ↔ "
                    +
                    region_results[
                        worst_index
                    ][
                        "regionB"
                    ]
                ),
        }
    )

    return {
        "enabled":
            True,

        "score":
            robust_score,

        "dinoScore":
            float(
                dino_scores.mean()
            ),

        "colorScore":
            float(
                color_scores.mean()
            ),

        "textureScore":
            float(
                texture_scores.mean()
            ),

        "meanScore":
            mean_score,

        "medianScore":
            median_score,

        "bestScore":
            best_score,

        "strongMatches":
            strong_matches,

        "compared":
            len(
                region_results
            ),

        "bestRegion":
            (
                region_results[
                    best_index
                ][
                    "regionA"
                ]
                +
                " ↔ "
                +
                region_results[
                    best_index
                ][
                    "regionB"
                ]
            ),

        "worstRegion":
            (
                region_results[
                    worst_index
                ][
                    "regionA"
                ]
                +
                " ↔ "
                +
                region_results[
                    worst_index
                ][
                    "regionB"
                ]
            ),

        "regions":
            region_results,
    }


# ==========================================
# FINE-GRAINED PET IDENTITY RE-ID
#
# Sprint 1.4.3.18
#
# A diferencia del DINO genérico, este
# modelo fue afinado específicamente para:
#
# - individual animal identification
# - pet re-identification
# - verification
#
# Se usa el animal crop si MegaDetector lo
# encontró. Si no, usa la imagen original.
#
# IMPORTANTE:
# En este primer paso el score se expone
# como diagnóstico y NO domina todavía el
# consensus. Primero medimos positivos y
# negativos reales.
# ==========================================


def _select_pet_identity_source(
    prepared: dict,
) -> Image.Image:

    crop = prepared.get(
        "crop"
    )

    if crop is not None:
        return crop

    return prepared[
        "original"
    ]


def get_pet_identity_embedding(
    image: Image.Image,
) -> np.ndarray:

    image = image.convert(
        "RGB"
    )

    inputs = (
        pet_id_processor(
            images=[
                image
            ],
            return_tensors="pt",
        )
    )

    inputs = {
        key:
            value.to(
                DEVICE
            )
        for (
            key,
            value
        )
        in inputs.items()
    }

    with torch.no_grad():

        outputs = (
            pet_id_model(
                **inputs
            )
        )

        # El model card recomienda usar
        # el token CLS.
        embedding = (
            outputs
            .last_hidden_state[
                :,
                0,
                :
            ]
        )

        embedding = torch.nn.functional.normalize(
            embedding,
            p=2,
            dim=1,
        )

    embedding = (
        embedding[
            0
        ]
        .detach()
        .cpu()
        .numpy()
        .astype(
            np.float32
        )
    )

    return embedding


def _calibrate_pet_identity_similarity(
    raw_similarity: float,
) -> float:

    # ======================================
    # CALIBRACIÓN INICIAL PAWTRACE
    #
    # Basada en las primeras pruebas reales:
    #
    # SAME Rita2/Rita3:
    #   raw = 0.835925
    #
    # DIFFERENT crop/crop:
    #   raw = 0.259762
    #
    # Esta calibración es deliberadamente
    # conservadora y deberá reajustarse con
    # una matriz mayor de validación.
    # ======================================

    if raw_similarity <= 0.35:
        return 0.0

    if raw_similarity <= 0.50:
        # 0.35 -> 0.00
        # 0.50 -> 0.25
        return (
            (raw_similarity - 0.35)
            /
            0.15
            *
            0.25
        )

    if raw_similarity <= 0.65:
        # 0.50 -> 0.25
        # 0.65 -> 0.55
        return (
            0.25
            +
            (
                (raw_similarity - 0.50)
                /
                0.15
                *
                0.30
            )
        )

    if raw_similarity <= 0.78:
        # 0.65 -> 0.55
        # 0.78 -> 0.82
        return (
            0.55
            +
            (
                (raw_similarity - 0.65)
                /
                0.13
                *
                0.27
            )
        )

    if raw_similarity <= 0.90:
        # 0.78 -> 0.82
        # 0.90 -> 1.00
        return (
            0.82
            +
            (
                (raw_similarity - 0.78)
                /
                0.12
                *
                0.18
            )
        )

    return 1.0


def _pet_identity_verdict(
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
        return "low_reliability_without_dual_crop"

    return "uncertain_identity"


def calculate_pet_identity_matching(
    prepared_a: dict,
    prepared_b: dict,
) -> dict:

    image_a = (
        _select_pet_identity_source(
            prepared_a
        )
    )

    image_b = (
        _select_pet_identity_source(
            prepared_b
        )
    )

    embedding_a = (
        get_pet_identity_embedding(
            image_a
        )
    )

    embedding_b = (
        get_pet_identity_embedding(
            image_b
        )
    )

    raw_similarity = float(
        np.dot(
            embedding_a,
            embedding_b,
        )
    )

    calibrated_score = (
        _calibrate_pet_identity_similarity(
            raw_similarity
        )
    )

    crop_a = (
        prepared_a.get(
            "crop"
        )
        is not None
    )

    crop_b = (
        prepared_b.get(
            "crop"
        )
        is not None
    )

    # ======================================
    # RELIABILITY
    #
    # La validación mostró que comparar
    # imágenes completas puede inflar la
    # similitud por fondo/encuadre.
    #
    # Por eso PetIdentity sólo actúa como
    # motor principal con crop en ambas.
    # ======================================

    if crop_a and crop_b:
        reliability = 1.0

    elif crop_a or crop_b:
        reliability = 0.60

    else:
        reliability = 0.35

    effective_score = (
        calibrated_score
        *
        reliability
    )

    effective_score = float(
        max(
            0.0,
            min(
                1.0,
                effective_score,
            ),
        )
    )

    verdict = (
        _pet_identity_verdict(
            raw_similarity,
            effective_score,
            crop_a,
            crop_b,
        )
    )

    result = {
        "enabled":
            True,

        "model":
            PET_ID_MODEL_NAME,

        "similarity":
            raw_similarity,

        "score":
            float(
                calibrated_score
            ),

        "reliability":
            float(
                reliability
            ),

        "effectiveScore":
            effective_score,

        "verdict":
            verdict,

        "embeddingSize":
            int(
                embedding_a.shape[
                    0
                ]
            ),

        "cropA":
            crop_a,

        "cropB":
            crop_b,
    }

    print(
        "🪪 PET IDENTITY PRIMARY:",
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
        }
    )

    return result


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

    with torch.no_grad():

        embedding = (
            mega_model(
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

    tensor = (
        dino_transform(
            image
        )
        .unsqueeze(0)
        .to(DEVICE)
    )

    with torch.no_grad():

        embedding = (
            dino_model(
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
# NORMALIZAR SIMILITUD 0..1
# ==========================================

def similarity_to_unit(
    similarity: float,
    minimum: float = 0.20,
    maximum: float = 0.90,
) -> float:

    if similarity <= minimum:
        return 0.0

    if similarity >= maximum:
        return 1.0

    value = (
        similarity - minimum
    ) / (
        maximum - minimum
    )

    return float(
        max(
            0.0,
            min(
                1.0,
                value,
            ),
        )
    )


# ==========================================
# CONSENSUS VERDICT
# ==========================================

def get_consensus_verdict(
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
# VISUAL CONSENSUS ENGINE
#
# DINOv2:         45%
# MegaDescriptor: 30%
# Visual clásico: 25%
# ==========================================

def calculate_consensus(
    mega_similarity: float,
    dino_similarity: float,
    visual_score: float,
    patch_score: float,
    pose_patch_score: float,
    local_dino_score: float,
    spatial_local_score: float,
    distinctive_local_score: float,
    identity_regions_score: float,
    pet_identity_score: float,
    pet_identity_raw: float,
    pet_identity_reliability: float,
    pet_identity_crop_a: bool,
    pet_identity_crop_b: bool,
) -> dict:

    # ======================================
    # Sprint 1.4.3.19
    # Consensus Engine v10
    #
    # MOTOR PRINCIPAL:
    #   PetIdentity especializado
    #
    # Con crop en ambas imágenes:
    #
    #   PetIdentity   65%
    #   DINO global   20%
    #   Mega          10%
    #   Visual         5%
    #
    # Sin crop dual:
    # PetIdentity pierde autoridad y el
    # sistema vuelve a una mezcla más
    # conservadora para evitar falsos
    # positivos por fondo/encuadre.
    #
    # Los motores experimentales locales
    # anteriores quedan diagnósticos.
    # ======================================

    mega_score = similarity_to_unit(
        mega_similarity
    )

    dino_score = similarity_to_unit(
        dino_similarity
    )

    visual_score = float(
        max(
            0.0,
            min(
                1.0,
                visual_score,
            ),
        )
    )

    pet_identity_score = float(
        max(
            0.0,
            min(
                1.0,
                pet_identity_score,
            ),
        )
    )

    pet_identity_reliability = float(
        max(
            0.0,
            min(
                1.0,
                pet_identity_reliability,
            ),
        )
    )

    both_crops = (
        pet_identity_crop_a
        and
        pet_identity_crop_b
    )

    reasons = []

    if both_crops:

        # ==================================
        # PET IDENTITY COMO MOTOR PRINCIPAL
        # ==================================

        score = (
            pet_identity_score * 0.65
            +
            dino_score * 0.20
            +
            mega_score * 0.10
            +
            visual_score * 0.05
        )

        reasons.append(
            "PetIdentity especializado es el motor principal con crop dual"
        )

        # ----------------------------------
        # NEGATIVO FUERTE
        # ----------------------------------

        if pet_identity_raw <= 0.40:

            score = min(
                score,
                0.25,
            )

            reasons.append(
                "PetIdentity indica identidades diferentes"
            )

        # ----------------------------------
        # ZONA BAJA / DUDOSA
        # ----------------------------------

        elif pet_identity_raw < 0.58:

            score = min(
                score,
                0.45,
            )

            reasons.append(
                "PetIdentity insuficiente para confirmar identidad"
            )

        # ----------------------------------
        # POSIBLE MATCH
        # ----------------------------------

        if pet_identity_raw >= 0.65:

            score = max(
                score,
                0.60,
            )

            reasons.append(
                "PetIdentity supera umbral de coincidencia posible"
            )

        # ----------------------------------
        # MATCH FUERTE
        # ----------------------------------

        if pet_identity_raw >= 0.78:

            score = max(
                score,
                0.78,
            )

            reasons.append(
                "PetIdentity especializado indica coincidencia fuerte"
            )

        # ----------------------------------
        # MATCH MUY FUERTE + RESPALDO
        # ----------------------------------

        if (
            pet_identity_raw >= 0.82
            and
            (
                dino_score >= 0.40
                or
                visual_score >= 0.60
            )
        ):

            score = max(
                score,
                0.82,
            )

            reasons.append(
                "PetIdentity muy fuerte respaldado por señal auxiliar"
            )

    else:

        # ==================================
        # SIN CROP DUAL
        #
        # No permitimos que PetIdentity
        # domine porque ya observamos un
        # negativo con imágenes completas
        # artificialmente alto.
        # ==================================

        effective_pet = (
            pet_identity_score
            *
            pet_identity_reliability
        )

        score = (
            dino_score * 0.40
            +
            mega_score * 0.25
            +
            visual_score * 0.20
            +
            effective_pet * 0.15
        )

        reasons.append(
            "PetIdentity con confiabilidad reducida por falta de crop dual"
        )

        # Nunca declarar match fuerte sin
        # recorte confiable de ambos animales.
        score = min(
            score,
            0.59,
        )

    # ======================================
    # DISCREPANCIA PROFUNDA
    # ======================================

    disagreement = abs(
        mega_score
        -
        dino_score
    )

    if (
        disagreement >= 0.60
        and
        pet_identity_raw < 0.78
    ):

        score -= 0.03

        reasons.append(
            "MegaDescriptor y DINOv2 presentan alta discrepancia"
        )

    score = float(
        max(
            0.0,
            min(
                1.0,
                score,
            ),
        )
    )

    verdict = (
        get_consensus_verdict(
            score
        )
    )

    return {
        "megaScore":
            round(
                mega_score,
                6,
            ),

        "dinoScore":
            round(
                dino_score,
                6,
            ),

        "patchScore":
            round(
                patch_score,
                6,
            ),

        "posePatchScore":
            round(
                pose_patch_score,
                6,
            ),

        "localDinoScore":
            round(
                local_dino_score,
                6,
            ),

        "spatialLocalScore":
            round(
                spatial_local_score,
                6,
            ),

        "distinctiveLocalScore":
            round(
                distinctive_local_score,
                6,
            ),

        "identityRegionsScore":
            round(
                identity_regions_score,
                6,
            ),

        "petIdentityScore":
            round(
                pet_identity_score,
                6,
            ),

        "petIdentityRaw":
            round(
                pet_identity_raw,
                6,
            ),

        "petIdentityReliability":
            round(
                pet_identity_reliability,
                6,
            ),

        "visualScore":
            round(
                visual_score,
                6,
            ),

        "consensusScore":
            round(
                score,
                6,
            ),

        "consensusPercentage":
            round(
                score *
                100
            ),

        "consensusVerdict":
            verdict,

        "consensusReason":
            "; ".join(
                reasons
            ),
    }


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
            "powtrace-animal-reid",

        "version":
            "1.4.3.15",

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

        "pipeline": (
            "MegaDetector → "
            "original/crop → "
            "MegaDescriptor + DINOv2 "
            "→ Visual Verification Engine "
            "→ DINOv2 Local Features → Spatial Consistency → Consensus Engine v10"
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
        "🐾 NUEVA COMPARACIÓN CONSENSUS"
    )

    print(
        "A:",
        payload.imageA
    )

    print(
        "B:",
        payload.imageB
    )

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

    # ======================================
    # MULTI-VIEW MEGADESCRIPTOR
    # ======================================

    mega_multiview = (
        calculate_multiview_model_similarity(
            prepared_a,
            prepared_b,
            get_mega_embedding,
        )
    )

    mega_similarity = (
        mega_multiview[
            "robustSimilarity"
        ]
    )

    # Embedding legacy sólo para conservar
    # embeddingSize y compatibilidad.
    mega_a = (
        get_robust_mega_embedding(
            prepared_a
        )
    )

    # ======================================
    # MULTI-VIEW DINOV2
    # ======================================

    dino_multiview = (
        calculate_multiview_model_similarity(
            prepared_a,
            prepared_b,
            get_dino_embedding,
        )
    )

    dino_similarity = (
        dino_multiview[
            "robustSimilarity"
        ]
    )

    # Embedding legacy sólo para conservar
    # dinoEmbeddingSize.
    dino_a = (
        get_robust_dino_embedding(
            prepared_a
        )
    )

    print(
        "🔀 MULTI-VIEW MEGA:",
        {
            "robust":
                round(
                    mega_similarity,
                    6,
                ),

            "best":
                round(
                    mega_multiview[
                        "bestSimilarity"
                    ],
                    6,
                ),

            "second":
                round(
                    mega_multiview[
                        "secondSimilarity"
                    ],
                    6,
                ),

            "bestPair":
                mega_multiview[
                    "bestPair"
                ],
        }
    )

    print(
        "🔀 MULTI-VIEW DINO:",
        {
            "robust":
                round(
                    dino_similarity,
                    6,
                ),

            "best":
                round(
                    dino_multiview[
                        "bestSimilarity"
                    ],
                    6,
                ),

            "second":
                round(
                    dino_multiview[
                        "secondSimilarity"
                    ],
                    6,
                ),

            "bestPair":
                dino_multiview[
                    "bestPair"
                ],
        }
    )

    # ======================================
    # VISUAL VERIFICATION
    # ======================================

    visual_image_a = (
        prepared_a["crop"]
        if prepared_a["crop"]
        is not None
        else prepared_a["original"]
    )

    visual_image_b = (
        prepared_b["crop"]
        if prepared_b["crop"]
        is not None
        else prepared_b["original"]
    )

    visual_result = (
        compare_visual_features(
            visual_image_a,
            visual_image_b,
        )
    )

    visual_score = float(
        visual_result.get(
            "score",
            0.0,
        )
    )

    # ======================================
    # LOCAL PATCH MATCHING
    # ======================================

    patch_result = (
        calculate_patch_matching(
            prepared_a,
            prepared_b,
        )
    )

    patch_score = float(
        patch_result[
            "score"
        ]
    )

    # ======================================
    # POSE-AGNOSTIC PATCH MATCHING
    # ======================================

    pose_patch_result = (
        calculate_pose_agnostic_patch_matching(
            prepared_a,
            prepared_b,
        )
    )

    pose_patch_score = float(
        pose_patch_result[
            "score"
        ]
    )

    # ======================================
    # DINOV2 LOCAL FEATURE MATCHING
    # ======================================

    local_dino_result = (
        calculate_dino_local_feature_matching(
            prepared_a,
            prepared_b,
        )
    )

    local_dino_score = float(
        local_dino_result[
            "score"
        ]
    )

    # ======================================
    # SPATIALLY CONSISTENT LOCAL MATCHING
    # ======================================

    spatial_local_result = (
        calculate_spatially_consistent_local_matching(
            prepared_a,
            prepared_b,
        )
    )

    spatial_local_score = float(
        spatial_local_result[
            "score"
        ]
    )

    # ======================================
    # DISTINCTIVE LOCAL MATCHING
    # ======================================

    distinctive_local_result = (
        calculate_distinctive_local_matching(
            prepared_a,
            prepared_b,
        )
    )

    distinctive_local_score = float(
        distinctive_local_result[
            "score"
        ]
    )

    # ======================================
    # IDENTITY REGIONS / PART-AWARE RE-ID
    # ======================================

    identity_regions_result = (
        calculate_identity_regions_matching(
            prepared_a,
            prepared_b,
        )
    )

    identity_regions_score = float(
        identity_regions_result[
            "score"
        ]
    )

    # ======================================
    # FINE-GRAINED PET IDENTITY RE-ID
    # ======================================

    pet_identity_result = (
        calculate_pet_identity_matching(
            prepared_a,
            prepared_b,
        )
    )

    pet_identity_score = float(
        pet_identity_result[
            "score"
        ]
    )

    pet_identity_effective_score = float(
        pet_identity_result[
            "effectiveScore"
        ]
    )

    # ======================================
    # CONSENSUS ENGINE
    # ======================================

    consensus = (
        calculate_consensus(
            mega_similarity=
                mega_similarity,

            dino_similarity=
                dino_similarity,

            visual_score=
                visual_score,

            patch_score=
                patch_score,

            pose_patch_score=
                pose_patch_score,

            local_dino_score=
                local_dino_score,

            spatial_local_score=
                spatial_local_score,

            distinctive_local_score=
                distinctive_local_score,

            identity_regions_score=
                identity_regions_score,

            pet_identity_score=
                pet_identity_result[
                    "score"
                ],

            pet_identity_raw=
                pet_identity_result[
                    "similarity"
                ],

            pet_identity_reliability=
                pet_identity_result[
                    "reliability"
                ],

            pet_identity_crop_a=
                pet_identity_result[
                    "cropA"
                ],

            pet_identity_crop_b=
                pet_identity_result[
                    "cropB"
                ],
        )
    )

    mega_percentage = (
        similarity_to_percentage(
            mega_similarity
        )
    )

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

    print(
        "🧠 CONSENSUS ENGINE:"
    )

    print(
        "   MegaDescriptor:",
        f"{mega_similarity:.6f}",
        "→",
        consensus[
            "megaScore"
        ]
    )

    print(
        "   DINOv2:",
        f"{dino_similarity:.6f}",
        "→",
        consensus[
            "dinoScore"
        ]
    )

    print(
        "   Visual:",
        visual_score,
        "→",
        visual_result.get(
            "verdict"
        )
    )

    print(
        "   Patch:",
        patch_score,
        "raw=",
        round(
            patch_result[
                "rawSimilarity"
            ],
            6,
        )
    )

    print(
        "   PosePatch:",
        pose_patch_score,
        "raw=",
        round(
            pose_patch_result[
                "rawSimilarity"
            ],
            6,
        )
    )

    print(
        "   LocalDINO:",
        local_dino_score,
        "raw=",
        round(
            local_dino_result[
                "rawSimilarity"
            ],
            6,
        ),
        "mutual=",
        local_dino_result[
            "mutualMatches"
        ]
    )

    print(
        "   SpatialLocal:",
        spatial_local_score,
        "consistency=",
        round(
            spatial_local_result[
                "consistency"
            ],
            6,
        ),
        "inliers=",
        spatial_local_result[
            "inlierMatches"
        ]
    )

    print(
        "   DistinctiveLocal:",
        distinctive_local_score,
        "qualified=",
        distinctive_local_result[
            "qualifiedMatches"
        ],
        "meanMargin=",
        round(
            distinctive_local_result[
                "meanMargin"
            ],
            6,
        ),
        "ratio=",
        round(
            distinctive_local_result[
                "distinctiveRatio"
            ],
            6,
        ),
    )

    print(
        "   IdentityRegions:",
        identity_regions_score,
        "strong=",
        identity_regions_result[
            "strongMatches"
        ],
        "median=",
        round(
            identity_regions_result[
                "medianScore"
            ],
            6,
        ),
        "best=",
        identity_regions_result[
            "bestRegion"
        ],
    )

    print(
        "   PetIdentity PRIMARY:",
        round(
            pet_identity_result[
                "similarity"
            ],
            6,
        ),
        "calibrated=",
        round(
            pet_identity_score,
            6,
        ),
        "effective=",
        round(
            pet_identity_effective_score,
            6,
        ),
        "reliability=",
        round(
            pet_identity_result[
                "reliability"
            ],
            6,
        ),
        "verdict=",
        pet_identity_result[
            "verdict"
        ],
    )

    print(
        "   FINAL:",
        consensus[
            "consensusPercentage"
        ],
        "%",
        consensus[
            "consensusVerdict"
        ]
    )

    print(
        "   Razón:",
        consensus[
            "consensusReason"
        ]
    )

    return CompareResponse(

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
            "petidentity-primary-consensus-mega-dino-visual-diagnostics",

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

        megaScore=
            consensus[
                "megaScore"
            ],

        dinoScore=
            consensus[
                "dinoScore"
            ],

        visualScore=
            round(
                visual_score,
                6,
            ),

        visualPercentage=
            round(
                visual_score *
                100
            ),

        visualVerdict=
            str(
                visual_result.get(
                    "verdict",
                    "unknown",
                )
            ),

        consensusScore=
            consensus[
                "consensusScore"
            ],

        consensusPercentage=
            consensus[
                "consensusPercentage"
            ],

        consensusVerdict=
            consensus[
                "consensusVerdict"
            ],

        consensusReason=
            consensus[
                "consensusReason"
            ],

        multiViewEnabled=
            True,

        viewsA=
            dino_multiview[
                "viewsA"
            ],

        viewsB=
            dino_multiview[
                "viewsB"
            ],

        megaBestSimilarity=
            round(
                mega_multiview[
                    "bestSimilarity"
                ],
                6,
            ),

        megaSecondSimilarity=
            round(
                mega_multiview[
                    "secondSimilarity"
                ],
                6,
            ),

        dinoBestSimilarity=
            round(
                dino_multiview[
                    "bestSimilarity"
                ],
                6,
            ),

        dinoSecondSimilarity=
            round(
                dino_multiview[
                    "secondSimilarity"
                ],
                6,
            ),

        patchEnabled=
            patch_result[
                "enabled"
            ],

        patchScore=
            round(
                patch_score,
                6,
            ),

        patchPercentage=
            round(
                patch_score *
                100
            ),

        patchRawSimilarity=
            round(
                patch_result[
                    "rawSimilarity"
                ],
                6,
            ),

        patchBestSimilarity=
            round(
                patch_result[
                    "bestSimilarity"
                ],
                6,
            ),

        patchSecondSimilarity=
            round(
                patch_result[
                    "secondSimilarity"
                ],
                6,
            ),

        patchThirdSimilarity=
            round(
                patch_result[
                    "thirdSimilarity"
                ],
                6,
            ),

        patchCountA=
            patch_result[
                "patchCountA"
            ],

        patchCountB=
            patch_result[
                "patchCountB"
            ],

        patchMatchedPairs=
            patch_result[
                "matchedPairs"
            ],

        poseAgnosticPatchEnabled=
            pose_patch_result[
                "enabled"
            ],

        poseAgnosticPatchScore=
            round(
                pose_patch_score,
                6,
            ),

        poseAgnosticPatchPercentage=
            round(
                pose_patch_score *
                100
            ),

        poseAgnosticRawSimilarity=
            round(
                pose_patch_result[
                    "rawSimilarity"
                ],
                6,
            ),

        poseAgnosticBestSimilarity=
            round(
                pose_patch_result[
                    "bestSimilarity"
                ],
                6,
            ),

        poseAgnosticSecondSimilarity=
            round(
                pose_patch_result[
                    "secondSimilarity"
                ],
                6,
            ),

        poseAgnosticThirdSimilarity=
            round(
                pose_patch_result[
                    "thirdSimilarity"
                ],
                6,
            ),

        poseAgnosticFourthSimilarity=
            round(
                pose_patch_result[
                    "fourthSimilarity"
                ],
                6,
            ),

        poseAgnosticPatchCountA=
            pose_patch_result[
                "patchCountA"
            ],

        poseAgnosticPatchCountB=
            pose_patch_result[
                "patchCountB"
            ],

        poseAgnosticMatchedPairs=
            pose_patch_result[
                "matchedPairs"
            ],

        localDinoEnabled=
            local_dino_result[
                "enabled"
            ],

        localDinoScore=
            round(
                local_dino_score,
                6,
            ),

        localDinoPercentage=
            round(
                local_dino_score *
                100
            ),

        localDinoRawSimilarity=
            round(
                local_dino_result[
                    "rawSimilarity"
                ],
                6,
            ),

        localDinoBestSimilarity=
            round(
                local_dino_result[
                    "bestSimilarity"
                ],
                6,
            ),

        localDinoMeanTopSimilarity=
            round(
                local_dino_result[
                    "meanTopSimilarity"
                ],
                6,
            ),

        localDinoMutualMatches=
            local_dino_result[
                "mutualMatches"
            ],

        localDinoTokenCountA=
            local_dino_result[
                "tokenCountA"
            ],

        localDinoTokenCountB=
            local_dino_result[
                "tokenCountB"
            ],

        localDinoCoverageA=
            round(
                local_dino_result[
                    "coverageA"
                ],
                6,
            ),

        localDinoCoverageB=
            round(
                local_dino_result[
                    "coverageB"
                ],
                6,
            ),

        spatialLocalEnabled=
            spatial_local_result[
                "enabled"
            ],

        spatialLocalScore=
            round(
                spatial_local_score,
                6,
            ),

        spatialLocalPercentage=
            round(
                spatial_local_score *
                100
            ),

        spatialLocalAppearanceScore=
            round(
                spatial_local_result[
                    "appearanceScore"
                ],
                6,
            ),

        spatialLocalGeometryScore=
            round(
                spatial_local_result[
                    "geometryScore"
                ],
                6,
            ),

        spatialLocalConsistency=
            round(
                spatial_local_result[
                    "consistency"
                ],
                6,
            ),

        spatialLocalMutualMatches=
            spatial_local_result[
                "mutualMatches"
            ],

        spatialLocalInlierMatches=
            spatial_local_result[
                "inlierMatches"
            ],

        spatialLocalMeanDisplacement=
            round(
                spatial_local_result[
                    "meanDisplacement"
                ],
                6,
            ),

        spatialLocalDisplacementStd=
            round(
                spatial_local_result[
                    "displacementStd"
                ],
                6,
            ),

        spatialLocalCoverageA=
            round(
                spatial_local_result[
                    "coverageA"
                ],
                6,
            ),

        spatialLocalCoverageB=
            round(
                spatial_local_result[
                    "coverageB"
                ],
                6,
            ),

        distinctiveLocalEnabled=
            distinctive_local_result[
                "enabled"
            ],

        distinctiveLocalScore=
            round(
                distinctive_local_score,
                6,
            ),

        distinctiveLocalPercentage=
            round(
                distinctive_local_score *
                100
            ),

        distinctiveLocalMeanSimilarity=
            round(
                distinctive_local_result[
                    "meanSimilarity"
                ],
                6,
            ),

        distinctiveLocalMeanMargin=
            round(
                distinctive_local_result[
                    "meanMargin"
                ],
                6,
            ),

        distinctiveLocalMedianMargin=
            round(
                distinctive_local_result[
                    "medianMargin"
                ],
                6,
            ),

        distinctiveLocalBestMargin=
            round(
                distinctive_local_result[
                    "bestMargin"
                ],
                6,
            ),

        distinctiveLocalMutualMatches=
            distinctive_local_result[
                "mutualMatches"
            ],

        distinctiveLocalQualifiedMatches=
            distinctive_local_result[
                "qualifiedMatches"
            ],

        distinctiveLocalDistinctiveRatio=
            round(
                distinctive_local_result[
                    "distinctiveRatio"
                ],
                6,
            ),

        distinctiveLocalCoverageA=
            round(
                distinctive_local_result[
                    "coverageA"
                ],
                6,
            ),

        distinctiveLocalCoverageB=
            round(
                distinctive_local_result[
                    "coverageB"
                ],
                6,
            ),

        identityRegionsEnabled=
            identity_regions_result[
                "enabled"
            ],

        identityRegionsScore=
            round(
                identity_regions_score,
                6,
            ),

        identityRegionsPercentage=
            round(
                identity_regions_score *
                100
            ),

        identityRegionsDinoScore=
            round(
                identity_regions_result[
                    "dinoScore"
                ],
                6,
            ),

        identityRegionsColorScore=
            round(
                identity_regions_result[
                    "colorScore"
                ],
                6,
            ),

        identityRegionsTextureScore=
            round(
                identity_regions_result[
                    "textureScore"
                ],
                6,
            ),

        identityRegionsMeanScore=
            round(
                identity_regions_result[
                    "meanScore"
                ],
                6,
            ),

        identityRegionsMedianScore=
            round(
                identity_regions_result[
                    "medianScore"
                ],
                6,
            ),

        identityRegionsBestScore=
            round(
                identity_regions_result[
                    "bestScore"
                ],
                6,
            ),

        identityRegionsStrongMatches=
            identity_regions_result[
                "strongMatches"
            ],

        identityRegionsCompared=
            identity_regions_result[
                "compared"
            ],

        identityRegionsBestRegion=
            identity_regions_result[
                "bestRegion"
            ],

        identityRegionsWorstRegion=
            identity_regions_result[
                "worstRegion"
            ],

        petIdentityEnabled=
            pet_identity_result[
                "enabled"
            ],

        petIdentityModel=
            pet_identity_result[
                "model"
            ],

        petIdentitySimilarity=
            round(
                pet_identity_result[
                    "similarity"
                ],
                6,
            ),

        petIdentityScore=
            round(
                pet_identity_score,
                6,
            ),

        petIdentityPercentage=
            round(
                pet_identity_score *
                100
            ),

        petIdentityEmbeddingSize=
            pet_identity_result[
                "embeddingSize"
            ],

        petIdentityCropA=
            pet_identity_result[
                "cropA"
            ],

        petIdentityCropB=
            pet_identity_result[
                "cropB"
            ],

        petIdentityReliability=
            round(
                pet_identity_result[
                    "reliability"
                ],
                6,
            ),

        petIdentityEffectiveScore=
            round(
                pet_identity_effective_score,
                6,
            ),

        petIdentityEffectivePercentage=
            round(
                pet_identity_effective_score *
                100
            ),

        petIdentityVerdict=
            pet_identity_result[
                "verdict"
            ],

        primaryEngine=
            "PetIdentity",

        primaryEngineScore=
            round(
                pet_identity_effective_score,
                6,
            ),
    )


# ==========================================
# VISUAL VERIFICATION ENGINE
#
# Sprint 1.4.3.7.1.1
#
# MegaDetector
#      ↓
# crop del animal
#      ↓
# ORB + SSIM + Color + Textura
# ==========================================

@app.post("/verify-visual")
def verify_visual(
    payload: VisualVerifyRequest,
):

    print(
        "================================"
    )

    print(
        "🔍 VISUAL VERIFICATION ENGINE"
    )

    print(
        "A:",
        payload.imageA
    )

    print(
        "B:",
        payload.imageB
    )

    try:

        # ==================================
        # DESCARGAR IMÁGENES
        # ==================================

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

        # ==================================
        # DETECTAR ANIMAL
        # ==================================

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

        # ==================================
        # USAR CROP SI EXISTE
        # ==================================

        image_a = (
            prepared_a["crop"]
            if prepared_a["crop"]
            is not None
            else prepared_a["original"]
        )

        image_b = (
            prepared_b["crop"]
            if prepared_b["crop"]
            is not None
            else prepared_b["original"]
        )

        print(
            "✂️ Visual Verification:",
            {
                "cropA":
                    prepared_a[
                        "cropped"
                    ],

                "cropB":
                    prepared_b[
                        "cropped"
                    ],

                "confidenceA":
                    prepared_a[
                        "confidence"
                    ],

                "confidenceB":
                    prepared_b[
                        "confidence"
                    ],
            }
        )

        # ==================================
        # COMPARAR SOLAMENTE EL ANIMAL
        # ==================================

        result = (
            compare_visual_features(
                image_a,
                image_b,
            )
        )

        # ==================================
        # INFORMACIÓN DE DETECCIÓN
        # ==================================

        result["cropA"] = (
            prepared_a["cropped"]
        )

        result["cropB"] = (
            prepared_b["cropped"]
        )

        result["detectionConfidenceA"] = (
            round(
                prepared_a["confidence"],
                6,
            )
            if prepared_a["confidence"]
            is not None
            else None
        )

        result["detectionConfidenceB"] = (
            round(
                prepared_b["confidence"],
                6,
            )
            if prepared_b["confidence"]
            is not None
            else None
        )

        result["processingMode"] = (
            "visual-crop"
            if (
                prepared_a["cropped"]
                and prepared_b["cropped"]
            )
            else "visual-original-fallback"
        )

        print(
            "✅ Resultado visual:",
            result
        )

        return result

    except HTTPException:
        raise

    except Exception as error:

        print(
            "❌ Error en Visual Verification:",
            repr(error)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Error en Visual Verification: "
                f"{str(error)}"
            ),
        )


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():

    return {
        "service":
            "PowTrace Animal Re-ID",

        "version":
            "Sprint 1.4.3.11",

        "status":
            "running",

        "pipeline": (
            "MegaDetector "
            "→ original + crop "
            "→ MegaDescriptor + DINOv2 "
            "→ Visual Verification Engine "
            "→ DINOv2 Local Features → Spatial Consistency → Consensus Engine v10"
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
            "/verify-visual",
            "/docs",
        ],
    }