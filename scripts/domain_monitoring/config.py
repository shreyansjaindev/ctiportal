import pathlib

BASE_DIR = pathlib.Path(__file__).parent.resolve().parents[0]
SCREENSHOT_DIRECTORY = pathlib.Path.joinpath(BASE_DIR, "media", "website_screenshots")
