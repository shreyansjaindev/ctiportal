from selenium.webdriver import Chrome, ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
import sys


def blacklists(query, value_type):
    if value_type == "domain" or value_type == "ipv4":
        service = Service()
        options = ChromeOptions()
        options.add_argument("--headless")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        with Chrome(service=service, options=options) as driver:
            driver.maximize_window()
            url = f"https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a+{query}"
            driver.get(url)

            try:
                element = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "tool-result-body"))
                )
                raw_text_list = element.text.split("\n")
            except Exception as e:
                print("Error:", e)
                return {}

        blacklists = {
            line.split(" ")[1] for line in raw_text_list if line.strip().startswith("LISTED")
        }

        status = "Blacklisted" if blacklists else "Not Listed"
        data = {
            "status": status,
        }
        if status == "Blacklisted":
            data.update(
                {
                    "blacklists": list(blacklists),
                    "count": len(blacklists),
                }
            )
        return data


if __name__ == "__main__":
    print(blacklists(sys.argv[1]))
