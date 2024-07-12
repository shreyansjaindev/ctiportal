from selenium.webdriver import Chrome, ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import sys
import pytesseract
from PIL import Image
import time
import urllib.parse
import io

SITE_REVIEW_URL = "https://sitereview.bluecoat.com"
CAPTCHA_URL = f"{SITE_REVIEW_URL}/#/captcha"
TESSERACT_PATH = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe"


def url_category(weburl, driver):
    data = {}
    weburl = urllib.parse.quote(weburl, safe="")

    try:
        driver.get(SITE_REVIEW_URL)
        input_url = WebDriverWait(driver, 10, 2).until(
            EC.presence_of_element_located((By.ID, "txtUrl"))
        )
        input_url.send_keys(weburl)

        driver.find_element(By.ID, "btnLookup").click()

        WebDriverWait(driver, 10, 2).until(
            EC.presence_of_element_located((By.ID, "submissionForm"))
        )

        category = driver.find_elements(By.CLASS_NAME, "clickable-category")

        if not category:
            data["category"] = driver.find_element(By.CLASS_NAME, "search-result").text.split("\n")[
                0
            ]
        else:
            data["category"] = [value.text for value in category]

            data["last_reviewed"] = (
                driver.find_element(By.CLASS_NAME, "rating-date").text.replace("?", "").rstrip()
            )
    except TimeoutException:
        print("TimeoutException: Element not found")
    except Exception as e:
        print(f"An error occurred: {e}")

    return data


def captcha_bypass(driver):
    driver.get(CAPTCHA_URL)
    image_captcha_element = WebDriverWait(driver, 10, 2).until(
        EC.presence_of_element_located((By.ID, "imgCaptcha"))
    )

    time.sleep(1)

    png = driver.get_screenshot_as_png()
    image = Image.open(io.BytesIO(png))

    location = image_captcha_element.location
    size = image_captcha_element.size

    left = location["x"]
    top = location["y"]
    right = location["x"] + size["width"]
    bottom = location["y"] + size["height"]

    image = image.crop((left, top, right, bottom))  # defines crop points
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
    captcha = pytesseract.image_to_string(image)
    captcha = captcha.replace(" ", "").strip()

    WebDriverWait(driver, 10, 2).until(
        EC.presence_of_element_located((By.ID, "txtCaptcha")).send_keys(captcha)
    )

    WebDriverWait(driver, 10, 2).until(
        EC.presence_of_element_located((By.ID, "btnCaptcha")).click()
    )


def symantec_sitereview(value, value_type):
    results = {}
    if value_type in ["domain", "url", "ipv4"]:
        options = ChromeOptions()
        options.add_argument("--headless")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        driver = Chrome(options=options)
        with driver:
            driver.maximize_window()
            for _ in range(2):
                try:
                    results = url_category(value, driver)
                    break
                except:
                    captcha_bypass(driver)

    return results


if __name__ == "__main__":
    url = sys.argv[1]
    print(symantec_sitereview(url, "domain"))
