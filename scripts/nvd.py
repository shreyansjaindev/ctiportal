import requests
import sys
from bs4 import BeautifulSoup


def get_results(cve):
    data = {}

    try:
        url = f"https://nvd.nist.gov/vuln/detail/{cve}"
        response = requests.get(url, timeout=10)

        soup = BeautifulSoup(response.text, "html.parser")

        elements = {
            "CVSS 3.x": ["Cvss3CnaCalculatorAnchor", "Cvss3NistCalculatorAnchor"],
            "CVSS 3.x Vector": ["tooltipCvss3CnaMetrics", "tooltipCvss3NistMetrics"],
            "CVSS 2.0": ["Cvss2CalculatorAnchor"],
            "CVSS 2.0 Vector": ["tooltipCvss2NistMetrics"],
        }

        for key, values in elements.items():
            for value in values:
                element = soup.find(id=value) or soup.find("span", class_=value)
                if element:
                    data[key] = element.text
                    break

        # References:
        cwe_elements = soup.select("td[data-testid^=vuln-CWEs-link-]")
        data["CWE IDs"] = [
            cwe_element.a.text.replace("CWE-", "").strip()
            for cwe_element in cwe_elements
            if cwe_element.a
        ]

    except requests.exceptions.RequestException as e:
        print("Error occurred during the request:", e)

    except AttributeError as e:
        print("Error occurred during parsing:", e)

    except Exception as e:
        print("Unexpected error occurred:", e)

    return data


def nvd(value, value_type):
    if value_type == "cve":
        return get_results(value)


if __name__ == "__main__":
    print(get_results(sys.argv[1]))
