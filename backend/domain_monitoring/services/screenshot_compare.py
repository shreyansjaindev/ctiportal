import pathlib
import logging

import cv2
import numpy as np
from skimage.metrics import structural_similarity

from domain_monitoring.services.screenshot_storage import delete_screenshot_file
from scripts.domain_monitoring.config import SCREENSHOT_DIRECTORY


logger = logging.getLogger(__name__)

SSIM_THRESHOLD = 0.96
PHASH_DISTANCE_THRESHOLD = 10


def _get_screenshot_path(filename: str) -> pathlib.Path:
    return pathlib.Path.joinpath(SCREENSHOT_DIRECTORY, filename)


def _load_screenshot_image(filename: str) -> np.ndarray | None:
    screenshot_path = _get_screenshot_path(filename)
    image = cv2.imread(str(screenshot_path))
    return image if isinstance(image, np.ndarray) else None


def _prepare_images_for_similarity(img1: np.ndarray, img2: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    grayscale1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    grayscale2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    target_width = min(grayscale1.shape[1], grayscale2.shape[1])
    target_height = min(grayscale1.shape[0], grayscale2.shape[0])
    target_size = (target_width, target_height)

    resized1 = cv2.resize(grayscale1, target_size)
    resized2 = cv2.resize(grayscale2, target_size)
    return resized1, resized2


def _get_image_similarity(img1: np.ndarray, img2: np.ndarray) -> float:
    prepared1, prepared2 = _prepare_images_for_similarity(img1, img2)
    similarity, _ = structural_similarity(prepared1, prepared2, full=True)
    return float(similarity)


def _compute_image_phash(image: np.ndarray) -> str:
    grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(grayscale, (32, 32))
    dct = cv2.dct(np.float32(resized))
    dct_low_freq = dct[:8, :8]
    median = float(np.median(dct_low_freq[1:, 1:]))
    bits = (dct_low_freq > median).flatten()
    return f"{int(''.join('1' if bit else '0' for bit in bits), 2):016x}"


def _get_phash_distance(hash1: str, hash2: str) -> int:
    return (int(hash1, 16) ^ int(hash2, 16)).bit_count()


def compute_screenshot_phash(filename: str) -> str:
    image = _load_screenshot_image(filename)
    if image is None:
        return ""
    return _compute_image_phash(image)


def matches_screenshot_phash(filename: str, pattern_phash: str) -> bool:
    if not pattern_phash:
        return False
    screenshot_phash = compute_screenshot_phash(filename)
    if not screenshot_phash:
        return False
    phash_distance = _get_phash_distance(screenshot_phash, pattern_phash)
    logger.debug(
        "Screenshot pHash comparison for %s: distance=%s threshold=%s",
        filename,
        phash_distance,
        PHASH_DISTANCE_THRESHOLD,
    )
    return phash_distance <= PHASH_DISTANCE_THRESHOLD


def matches_screenshot_image(filename: str, pattern_filename: str) -> bool:
    candidate_image = _load_screenshot_image(filename)
    pattern_image = _load_screenshot_image(pattern_filename)
    if candidate_image is None or pattern_image is None:
        return False

    similarity = _get_image_similarity(pattern_image, candidate_image)
    logger.debug(
        "Screenshot SSIM comparison for %s against %s: score=%.4f threshold=%.2f",
        filename,
        pattern_filename,
        similarity,
        SSIM_THRESHOLD,
    )
    return similarity >= SSIM_THRESHOLD


def are_screenshots_similar(old_screenshot_filename: str, new_screenshot_filename: str) -> bool:
    if matches_screenshot_image(new_screenshot_filename, old_screenshot_filename):
        delete_screenshot_file(new_screenshot_filename)
        return True

    return False
