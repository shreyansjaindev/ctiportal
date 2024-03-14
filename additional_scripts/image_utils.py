import cv2
import numpy as np
import pathlib
import os
from config import SCREENSHOT_DIRECTORY


def get_image_similarity(img1, img2):
    result = cv2.matchTemplate(img1, img2, cv2.TM_CCOEFF_NORMED)
    similarity = np.max(result)
    return similarity


def is_screenshots_similar(old_screenshot_filename, new_screenshot_filename):
    old_screenshot_path = pathlib.Path.joinpath(
        SCREENSHOT_DIRECTORY, old_screenshot_filename
    )
    new_screenshot_path = pathlib.Path.joinpath(
        SCREENSHOT_DIRECTORY, new_screenshot_filename
    )
    img1 = cv2.imread(str(old_screenshot_path))
    img2 = cv2.imread(str(new_screenshot_path))

    similarity = get_image_similarity(img1, img2)

    if similarity > 0.92:
        os.remove(new_screenshot_path)
        return True

    return False


def is_sponsored_listings(filename):
    file1 = pathlib.Path.joinpath(SCREENSHOT_DIRECTORY, filename)
    folder_path = pathlib.Path.joinpath(SCREENSHOT_DIRECTORY, "sponsored_listings")
    predefined_images = os.listdir(folder_path)

    img1 = cv2.imread(str(file1))

    max_similarity = 0
    for filename in predefined_images:
        file2 = pathlib.Path.joinpath(folder_path, filename)
        img2 = cv2.imread(str(file2))
        similarity = get_image_similarity(img1, img2)
        if similarity > max_similarity:
            max_similarity = similarity

    if max_similarity > 0.8:
        os.remove(file1)
        return True

    return False
