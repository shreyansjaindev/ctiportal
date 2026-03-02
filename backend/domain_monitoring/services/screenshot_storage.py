import hashlib
import os
import pathlib
import uuid

from scripts.domain_monitoring.config import SCREENSHOT_DIRECTORY


def _build_screenshot_path(extension: str = ".png") -> tuple[str, pathlib.Path]:
    os.makedirs(SCREENSHOT_DIRECTORY, exist_ok=True)

    while True:
        filename = f"{uuid.uuid4()}{extension}"
        filepath = pathlib.Path.joinpath(SCREENSHOT_DIRECTORY, filename)
        if not filepath.exists():
            return filename, filepath


def save_screenshot_bytes(content: bytes, extension: str = ".png") -> tuple[str, str]:
    filename, filepath = _build_screenshot_path(extension)
    with open(filepath, "wb") as file_handle:
        file_handle.write(content)

    screenshot_hash = hashlib.sha256(content).hexdigest()
    return filename, screenshot_hash


def delete_screenshot_file(filename: str) -> None:
    filepath = pathlib.Path.joinpath(SCREENSHOT_DIRECTORY, filename)
    if filepath.exists():
        os.remove(filepath)
