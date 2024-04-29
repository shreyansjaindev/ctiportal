import pathlib

BASE_DIR = pathlib.Path(__file__).parent.resolve().parents[1]
SCREENSHOT_DIRECTORY = pathlib.Path.joinpath(BASE_DIR, "media", "website_screenshots")
