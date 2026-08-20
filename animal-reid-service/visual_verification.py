# ==========================================
# PAWTRACE - VISUAL VERIFICATION ENGINE
#
# Sprint 1.4.3.7.2
#
# Verificación visual clásica:
# - ORB keypoints
# - SSIM
# - Histograma HSV
# - Textura LBP
#
# IMPORTANTE:
# - No reemplaza MegaDescriptor/DINOv2.
# - Funciona como señal complementaria.
# - Esta versión reduce el peso de ORB
#   para tolerar mejor cambios de pose,
#   ángulo e iluminación.
# ==========================================

import cv2
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity
from skimage.feature import local_binary_pattern

TARGET_SIZE = 384
ORB_FEATURES = 1500
ORB_RATIO_THRESHOLD = 0.75
LBP_POINTS = 24
LBP_RADIUS = 3


def clamp01(value: float) -> float:
    return float(max(0.0, min(1.0, value)))


def pil_to_cv(image: Image.Image) -> np.ndarray:
    rgb = image.convert("RGB").resize((TARGET_SIZE, TARGET_SIZE))
    array = np.array(rgb)
    return cv2.cvtColor(array, cv2.COLOR_RGB2BGR)


def to_gray(image: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def normalize_gray(gray: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def calculate_orb_similarity(image_a: np.ndarray, image_b: np.ndarray) -> dict:
    gray_a = normalize_gray(to_gray(image_a))
    gray_b = normalize_gray(to_gray(image_b))

    orb = cv2.ORB_create(
        nfeatures=ORB_FEATURES,
        scaleFactor=1.2,
        nlevels=8,
    )

    keypoints_a, descriptors_a = orb.detectAndCompute(gray_a, None)
    keypoints_b, descriptors_b = orb.detectAndCompute(gray_b, None)

    count_a = len(keypoints_a) if keypoints_a else 0
    count_b = len(keypoints_b) if keypoints_b else 0

    if (
        descriptors_a is None
        or descriptors_b is None
        or count_a < 4
        or count_b < 4
    ):
        return {
            "score": 0.0,
            "keypointsA": count_a,
            "keypointsB": count_b,
            "goodMatches": 0,
            "matchRatio": 0.0,
            "available": False,
        }

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = matcher.knnMatch(descriptors_a, descriptors_b, k=2)

    good_matches = []
    for pair in matches:
        if len(pair) < 2:
            continue
        first, second = pair
        if first.distance < ORB_RATIO_THRESHOLD * second.distance:
            good_matches.append(first)

    reference_count = max(1, min(count_a, count_b))
    raw_ratio = len(good_matches) / reference_count
    score = clamp01(raw_ratio / 0.15)

    return {
        "score": round(score, 6),
        "keypointsA": count_a,
        "keypointsB": count_b,
        "goodMatches": len(good_matches),
        "matchRatio": round(raw_ratio, 6),
        "available": True,
    }


def calculate_ssim(image_a: np.ndarray, image_b: np.ndarray) -> float:
    gray_a = to_gray(image_a)
    gray_b = to_gray(image_b)
    score = structural_similarity(gray_a, gray_b, data_range=255)
    normalized = (score + 1.0) / 2.0
    return round(clamp01(normalized), 6)


def calculate_color_similarity(image_a: np.ndarray, image_b: np.ndarray) -> float:
    hsv_a = cv2.cvtColor(image_a, cv2.COLOR_BGR2HSV)
    hsv_b = cv2.cvtColor(image_b, cv2.COLOR_BGR2HSV)

    histogram_a = cv2.calcHist(
        [hsv_a], [0, 1], None, [50, 60], [0, 180, 0, 256]
    )
    histogram_b = cv2.calcHist(
        [hsv_b], [0, 1], None, [50, 60], [0, 180, 0, 256]
    )

    cv2.normalize(histogram_a, histogram_a, 0, 1, cv2.NORM_MINMAX)
    cv2.normalize(histogram_b, histogram_b, 0, 1, cv2.NORM_MINMAX)

    correlation = cv2.compareHist(
        histogram_a,
        histogram_b,
        cv2.HISTCMP_CORREL,
    )

    score = (correlation + 1.0) / 2.0
    return round(clamp01(score), 6)


def calculate_texture_similarity(image_a: np.ndarray, image_b: np.ndarray) -> float:
    gray_a = to_gray(image_a)
    gray_b = to_gray(image_b)

    lbp_a = local_binary_pattern(
        gray_a,
        LBP_POINTS,
        LBP_RADIUS,
        method="uniform",
    )
    lbp_b = local_binary_pattern(
        gray_b,
        LBP_POINTS,
        LBP_RADIUS,
        method="uniform",
    )

    bins = np.arange(0, LBP_POINTS + 3)

    hist_a, _ = np.histogram(
        lbp_a.ravel(),
        bins=bins,
        range=(0, LBP_POINTS + 2),
    )
    hist_b, _ = np.histogram(
        lbp_b.ravel(),
        bins=bins,
        range=(0, LBP_POINTS + 2),
    )

    hist_a = hist_a.astype(np.float32)
    hist_b = hist_b.astype(np.float32)

    hist_a /= hist_a.sum() + 1e-8
    hist_b /= hist_b.sum() + 1e-8

    distance = cv2.compareHist(
        hist_a,
        hist_b,
        cv2.HISTCMP_BHATTACHARYYA,
    )

    similarity = 1.0 - distance
    return round(clamp01(similarity), 6)


def calculate_verification_score(
    orb_score: float,
    ssim_score: float,
    color_score: float,
    texture_score: float,
) -> float:
    # Sprint 1.4.3.7.2
    # ORB      15%
    # SSIM     10%
    # Color    25%
    # Textura  50%
    score = (
        orb_score * 0.15
        + ssim_score * 0.10
        + color_score * 0.25
        + texture_score * 0.50
    )
    return round(clamp01(score), 6)


def get_verdict(score: float, orb_score: float) -> str:
    _ = orb_score

    if score >= 0.75:
        return "strong"
    if score >= 0.60:
        return "compatible"
    if score >= 0.45:
        return "uncertain"
    return "weak"


def compare_visual_features(
    image_a: Image.Image,
    image_b: Image.Image,
) -> dict:
    cv_a = pil_to_cv(image_a)
    cv_b = pil_to_cv(image_b)

    orb = calculate_orb_similarity(cv_a, cv_b)
    ssim = calculate_ssim(cv_a, cv_b)
    color = calculate_color_similarity(cv_a, cv_b)
    texture = calculate_texture_similarity(cv_a, cv_b)

    orb_score = orb.get("score", 0.0)

    score = calculate_verification_score(
        orb_score=orb_score,
        ssim_score=ssim,
        color_score=color,
        texture_score=texture,
    )

    verdict = get_verdict(score, orb_score)

    return {
        "available": True,
        "score": score,
        "percentage": round(score * 100),
        "verdict": verdict,
        "orb": {**orb},
        "ssim": ssim,
        "color": color,
        "texture": texture,
    }