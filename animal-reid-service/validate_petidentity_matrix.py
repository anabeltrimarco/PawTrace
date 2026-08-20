#!/usr/bin/env python3
"""
PawTrace — Paso 24
Matriz de validación PetIdentity
Sprint 1.4.3.20

Objetivo:
- Ejecutar automáticamente múltiples comparaciones contra POST /compare.
- Separar pares SAME / DIFFERENT.
- Medir falsos positivos y falsos negativos.
- Guardar resultados CSV + JSON.
- No modifica main.py.

Uso:
    python validate_petidentity_matrix.py

Requisitos:
    pip install requests

Antes de ejecutar:
1) API:
   python -m uvicorn main:app --port 8001

2) Servidor de imágenes, desde Test-imagen:
   python -m http.server 8002

Archivos esperados por defecto:
- rita.jpg
- rita2.jpg
- rita3.jpg
- perro1.jpg
- perro2.jpg
"""

from __future__ import annotations

import csv
import itertools
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests


API_URL = "http://127.0.0.1:8001/compare"
IMAGE_BASE_URL = "http://127.0.0.1:8002"

OUTPUT_CSV = Path("petidentity_validation_matrix.csv")
OUTPUT_JSON = Path("petidentity_validation_summary.json")

REQUEST_TIMEOUT_SECONDS = 180


# ============================================================
# DATASET INICIAL
#
# Agregá más fotos siguiendo este formato.
# Dos fotos con el mismo identity_id cuentan
# como SAME. Distinto identity_id = DIFFERENT.
# ============================================================

IMAGES = [
    {
        "name": "rita",
        "identity_id": "rita",
        "url": f"{IMAGE_BASE_URL}/rita.jpg",
    },
    {
        "name": "rita2",
        "identity_id": "rita",
        "url": f"{IMAGE_BASE_URL}/rita2.jpg",
    },
    {
        "name": "rita3",
        "identity_id": "rita",
        "url": f"{IMAGE_BASE_URL}/rita3.jpg",
    },
    {
        "name": "perro1",
        "identity_id": "perro1",
        "url": f"{IMAGE_BASE_URL}/perro1.jpg",
    },
    {
        "name": "perro2",
        "identity_id": "perro2",
        "url": f"{IMAGE_BASE_URL}/perro2.jpg",
    },
]


@dataclass
class PairResult:
    image_a: str
    image_b: str
    identity_a: str
    identity_b: str
    expected_same: bool

    pet_similarity: float
    pet_score: float
    pet_effective_score: float
    pet_reliability: float
    pet_verdict: str

    crop_a: bool
    crop_b: bool

    consensus_score: float
    consensus_percentage: int
    consensus_verdict: str

    predicted_same: bool
    correct: bool

    request_seconds: float
    error: str = ""


def verdict_predicts_same(verdict: str) -> bool:
    return verdict in {
        "strong_identity_match",
        "possible_identity_match",
    }


def compare_pair(
    a: dict[str, str],
    b: dict[str, str],
) -> PairResult:

    expected_same = (
        a["identity_id"]
        ==
        b["identity_id"]
    )

    started = time.perf_counter()

    response = requests.post(
        API_URL,
        json={
            "imageA": a["url"],
            "imageB": b["url"],
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )

    elapsed = (
        time.perf_counter()
        -
        started
    )

    response.raise_for_status()
    data = response.json()

    pet_verdict = str(
        data.get(
            "petIdentityVerdict",
            "",
        )
    )

    predicted_same = (
        verdict_predicts_same(
            pet_verdict
        )
    )

    return PairResult(
        image_a=a["name"],
        image_b=b["name"],
        identity_a=a["identity_id"],
        identity_b=b["identity_id"],
        expected_same=expected_same,

        pet_similarity=float(
            data.get(
                "petIdentitySimilarity",
                0.0,
            )
        ),
        pet_score=float(
            data.get(
                "petIdentityScore",
                0.0,
            )
        ),
        pet_effective_score=float(
            data.get(
                "petIdentityEffectiveScore",
                0.0,
            )
        ),
        pet_reliability=float(
            data.get(
                "petIdentityReliability",
                0.0,
            )
        ),
        pet_verdict=pet_verdict,

        crop_a=bool(
            data.get(
                "petIdentityCropA",
                False,
            )
        ),
        crop_b=bool(
            data.get(
                "petIdentityCropB",
                False,
            )
        ),

        consensus_score=float(
            data.get(
                "consensusScore",
                0.0,
            )
        ),
        consensus_percentage=int(
            data.get(
                "consensusPercentage",
                0,
            )
        ),
        consensus_verdict=str(
            data.get(
                "consensusVerdict",
                "",
            )
        ),

        predicted_same=predicted_same,
        correct=(
            predicted_same
            ==
            expected_same
        ),

        request_seconds=round(
            elapsed,
            3,
        ),
    )


def failed_pair(
    a: dict[str, str],
    b: dict[str, str],
    exc: Exception,
) -> PairResult:

    expected_same = (
        a["identity_id"]
        ==
        b["identity_id"]
    )

    return PairResult(
        image_a=a["name"],
        image_b=b["name"],
        identity_a=a["identity_id"],
        identity_b=b["identity_id"],
        expected_same=expected_same,

        pet_similarity=0.0,
        pet_score=0.0,
        pet_effective_score=0.0,
        pet_reliability=0.0,
        pet_verdict="",

        crop_a=False,
        crop_b=False,

        consensus_score=0.0,
        consensus_percentage=0,
        consensus_verdict="",

        predicted_same=False,
        correct=False,

        request_seconds=0.0,
        error=str(exc),
    )


def safe_div(
    numerator: float,
    denominator: float,
) -> float:

    if denominator == 0:
        return 0.0

    return (
        numerator
        /
        denominator
    )


def build_summary(
    results: list[PairResult],
) -> dict[str, Any]:

    valid = [
        r
        for r in results
        if not r.error
    ]

    tp = sum(
        1
        for r in valid
        if r.expected_same
        and r.predicted_same
    )

    tn = sum(
        1
        for r in valid
        if not r.expected_same
        and not r.predicted_same
    )

    fp = sum(
        1
        for r in valid
        if not r.expected_same
        and r.predicted_same
    )

    fn = sum(
        1
        for r in valid
        if r.expected_same
        and not r.predicted_same
    )

    positive_pairs = [
        r
        for r in valid
        if r.expected_same
    ]

    negative_pairs = [
        r
        for r in valid
        if not r.expected_same
    ]

    positive_similarities = [
        r.pet_similarity
        for r in positive_pairs
    ]

    negative_similarities = [
        r.pet_similarity
        for r in negative_pairs
    ]

    min_same = (
        min(
            positive_similarities
        )
        if positive_similarities
        else None
    )

    max_different = (
        max(
            negative_similarities
        )
        if negative_similarities
        else None
    )

    raw_gap = (
        min_same
        -
        max_different
        if (
            min_same is not None
            and
            max_different is not None
        )
        else None
    )

    dual_crop = sum(
        1
        for r in valid
        if r.crop_a
        and r.crop_b
    )

    summary = {
        "pairs_total": len(results),
        "pairs_valid": len(valid),
        "pairs_failed": (
            len(results)
            -
            len(valid)
        ),

        "same_pairs": len(
            positive_pairs
        ),
        "different_pairs": len(
            negative_pairs
        ),

        "true_positive": tp,
        "true_negative": tn,
        "false_positive": fp,
        "false_negative": fn,

        "accuracy": safe_div(
            tp + tn,
            len(valid),
        ),

        "precision_same": safe_div(
            tp,
            tp + fp,
        ),

        "recall_same": safe_div(
            tp,
            tp + fn,
        ),

        "specificity_different": safe_div(
            tn,
            tn + fp,
        ),

        "false_positive_rate": safe_div(
            fp,
            fp + tn,
        ),

        "false_negative_rate": safe_div(
            fn,
            fn + tp,
        ),

        "dual_crop_pairs": dual_crop,
        "dual_crop_rate": safe_div(
            dual_crop,
            len(valid),
        ),

        "same_similarity_min": min_same,
        "same_similarity_max": (
            max(
                positive_similarities
            )
            if positive_similarities
            else None
        ),

        "different_similarity_min": (
            min(
                negative_similarities
            )
            if negative_similarities
            else None
        ),

        "different_similarity_max":
            max_different,

        "raw_separation_gap":
            raw_gap,

        "production_gate_initial": {
            "zero_false_positives":
                fp == 0,

            "zero_false_negatives":
                fn == 0,

            "positive_raw_gap":
                (
                    raw_gap is not None
                    and raw_gap > 0
                ),

            "all_pairs_dual_crop":
                (
                    len(valid) > 0
                    and dual_crop == len(valid)
                ),
        },
    }

    return summary


def save_csv(
    results: list[PairResult],
) -> None:

    fieldnames = [
        "image_a",
        "image_b",
        "identity_a",
        "identity_b",
        "expected_same",

        "pet_similarity",
        "pet_score",
        "pet_effective_score",
        "pet_reliability",
        "pet_verdict",

        "crop_a",
        "crop_b",

        "consensus_score",
        "consensus_percentage",
        "consensus_verdict",

        "predicted_same",
        "correct",

        "request_seconds",
        "error",
    ]

    with OUTPUT_CSV.open(
        "w",
        newline="",
        encoding="utf-8-sig",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        for result in results:
            writer.writerow(
                result.__dict__
            )


def save_json(
    summary: dict[str, Any],
    results: list[PairResult],
) -> None:

    payload = {
        "summary":
            summary,

        "results": [
            result.__dict__
            for result in results
        ],
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def print_pair(
    index: int,
    total: int,
    result: PairResult,
) -> None:

    expected = (
        "SAME"
        if result.expected_same
        else "DIFFERENT"
    )

    status = (
        "✅"
        if result.correct
        and not result.error
        else "❌"
    )

    print()
    print(
        f"[{index}/{total}] "
        f"{result.image_a} ↔ {result.image_b}"
    )

    if result.error:
        print(
            f"   ❌ ERROR: {result.error}"
        )
        return

    print(
        f"   esperado: {expected}"
    )

    print(
        "   PetIdentity raw:",
        round(
            result.pet_similarity,
            6,
        ),
    )

    print(
        "   efectivo:",
        round(
            result.pet_effective_score,
            6,
        ),
        f"({round(result.pet_effective_score * 100)}%)",
    )

    print(
        "   verdict:",
        result.pet_verdict,
    )

    print(
        "   crops:",
        result.crop_a,
        result.crop_b,
    )

    print(
        "   consensus:",
        result.consensus_percentage,
        "%",
        result.consensus_verdict,
    )

    print(
        "   resultado:",
        status,
    )


def main() -> int:

    print(
        "🐾 PawTrace — Paso 24"
    )
    print(
        "📊 Matriz de validación PetIdentity"
    )
    print(
        f"🔌 API: {API_URL}"
    )
    print(
        f"🖼️  Imágenes: {IMAGE_BASE_URL}"
    )

    # Todas las combinaciones sin repetir
    # una imagen contra sí misma.
    pairs = list(
        itertools.combinations(
            IMAGES,
            2,
        )
    )

    print(
        f"🧪 Pares a evaluar: {len(pairs)}"
    )

    results: list[
        PairResult
    ] = []

    for index, (
        a,
        b,
    ) in enumerate(
        pairs,
        start=1,
    ):

        try:
            result = compare_pair(
                a,
                b,
            )

        except Exception as exc:
            result = failed_pair(
                a,
                b,
                exc,
            )

        results.append(
            result
        )

        print_pair(
            index,
            len(pairs),
            result,
        )

    summary = build_summary(
        results
    )

    save_csv(
        results
    )

    save_json(
        summary,
        results,
    )

    print()
    print("=" * 60)
    print("📊 RESUMEN")
    print("=" * 60)

    print(
        "Pares válidos:",
        summary[
            "pairs_valid"
        ],
    )

    print(
        "SAME:",
        summary[
            "same_pairs"
        ],
        "| DIFFERENT:",
        summary[
            "different_pairs"
        ],
    )

    print(
        "TP:",
        summary[
            "true_positive"
        ],
        "| TN:",
        summary[
            "true_negative"
        ],
        "| FP:",
        summary[
            "false_positive"
        ],
        "| FN:",
        summary[
            "false_negative"
        ],
    )

    print(
        "Accuracy:",
        f"{summary['accuracy'] * 100:.1f}%",
    )

    print(
        "Recall SAME:",
        f"{summary['recall_same'] * 100:.1f}%",
    )

    print(
        "Specificity DIFFERENT:",
        f"{summary['specificity_different'] * 100:.1f}%",
    )

    print(
        "False Positive Rate:",
        f"{summary['false_positive_rate'] * 100:.1f}%",
    )

    print(
        "False Negative Rate:",
        f"{summary['false_negative_rate'] * 100:.1f}%",
    )

    print(
        "Dual crop rate:",
        f"{summary['dual_crop_rate'] * 100:.1f}%",
    )

    print(
        "Min SAME similarity:",
        summary[
            "same_similarity_min"
        ],
    )

    print(
        "Max DIFFERENT similarity:",
        summary[
            "different_similarity_max"
        ],
    )

    print(
        "Raw separation gap:",
        summary[
            "raw_separation_gap"
        ],
    )

    print()
    print(
        "📄 CSV:",
        OUTPUT_CSV.resolve(),
    )

    print(
        "📄 JSON:",
        OUTPUT_JSON.resolve(),
    )

    gate = summary[
        "production_gate_initial"
    ]

    print()
    print("🚦 GATE INICIAL")

    print(
        "   0 falsos positivos:",
        gate[
            "zero_false_positives"
        ],
    )

    print(
        "   0 falsos negativos:",
        gate[
            "zero_false_negatives"
        ],
    )

    print(
        "   separación raw positiva:",
        gate[
            "positive_raw_gap"
        ],
    )

    print(
        "   todos con crop dual:",
        gate[
            "all_pairs_dual_crop"
        ],
    )

    return 0


if __name__ == "__main__":
    sys.exit(
        main()
    )