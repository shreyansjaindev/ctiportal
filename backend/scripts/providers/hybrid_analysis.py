import requests
import sys
import os
import logging
from ..utils.api_helpers import check_api_key

logger = logging.getLogger(__name__)

API_ENDPOINT = "https://www.hybrid-analysis.com/api/v2/search/hash"
API_KEY = os.getenv("HYBRIDANALYSIS", "").split(",")[0]


def get_results(hash):
    error = check_api_key(API_KEY, "Hybrid Analysis")
    if error:
        return error

    hash_data = {}
    headers = {
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "api-key": API_KEY,
        "User-Agent": "Falcon",
    }

    data = {
        "hash": hash,
    }

    response = requests.post(API_ENDPOINT, headers=headers, data=data)

    data = response.json()

    if data:
        data = data[1]

        name = data["submit_name"]
        verdict = data["verdict"]
        score = data["threat_score"]
        malware_family = data["vx_family"]
        os = data["environment_description"]
        filetype = data["type"]
        filesize = data["size"]

        md5 = data["md5"]
        sha1 = data["sha1"]
        sha256 = data["sha256"]
        sha512 = data["sha512"]
        ssdeep = data["ssdeep"]

        hash_data = {
            "Filename": name,
            "Verdict": verdict,
            "Malware Family": malware_family,
            "Threat Score": score,
            "Operating System": os,
            "File Type": filetype,
            "File Size": filesize,
            "MD5": md5,
            "SHA1": sha1,
            "SHA256": sha256,
            "SHA512": sha512,
            "SSDEEP": ssdeep,
        }

    return hash_data


def hybridanalysis(value):
    return get_results(value)


if __name__ == "__main__":
    print(hybridanalysis(sys.argv[1]))
