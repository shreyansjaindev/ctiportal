import os
import re

MITRE_TECHNIQUE_PATTERN = re.compile(r"\bT\d{4}(?:\.\d{3})?\b", re.IGNORECASE)
ISO_DATE_PATTERN = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
SLASH_DATE_PATTERN = re.compile(r"\b\d{1,2}/\d{1,2}/\d{4}\b")
MONTH_DATE_PATTERN = re.compile(
    r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
    r"[a-z]*\s+\d{1,2},\s+\d{4}\b",
    re.IGNORECASE,
)
JSON_BLOCK_PATTERN = re.compile(r"\{.*\}", re.DOTALL)
HREF_PATTERN = re.compile(r"""href=["']([^"'#]+)["']""", re.IGNORECASE)
A_TAG_PATTERN = re.compile(
    r"""<a[^>]*href=["']([^"'#]+)["'][^>]*>(.*?)</a>""",
    re.IGNORECASE | re.DOTALL,
)
SECTION_PATTERN = re.compile(
    r"(<h[1-6][^>]*>.*?</h[1-6]>)(.*?)(?=<h[1-6][^>]*>|$)",
    re.IGNORECASE | re.DOTALL,
)
HEADING_TEXT_PATTERN = re.compile(r"<h[1-6][^>]*>(.*?)</h[1-6]>", re.IGNORECASE | re.DOTALL)

IOCS_HEADING_HINTS = (
    "ioc",
    "indicator",
    "indicators",
    "observables",
    "artifacts",
    "infrastructure",
    "hash",
    "hashes",
    "domain",
    "domains",
    "ip",
    "ips",
)
LEGITIMATE_TOOL_HINTS = (
    "powershell",
    "cmd.exe",
    "wmic",
    "rundll32",
    "mshta",
    "schtasks",
    "certutil",
    "bitsadmin",
    "psexec",
    "adfind",
    "mimikatz",
    "cobalt strike",
    "ngrok",
    "anydesk",
    "teamviewer",
)
VICTIM_EVIDENCE_HINTS = (
    "victim",
    "victims",
    "targeted",
    "affected",
    "attacked",
    "attack",
    "hit",
    "impacted",
    "infected",
    "compromised",
    "breach",
    "breached",
    "government",
    "ministry",
    "agency",
    "department",
    "mission",
    "operator",
    "organization",
    "company",
    "entity",
    "sector",
)
MARKETING_EVIDENCE_HINTS = (
    "financial services",
    "defense",
    "healthcare",
    "life sciences",
    "public sector",
    "we protect",
    "our customers",
    "our expertise",
    "industries",
)
ENTITY_NOISE_HINTS = (
    "cookie",
    "privacy",
    "advertising",
    "newsletter",
    "our customers",
    "our expertise",
    "all rights reserved",
)
COMPARISON_EVIDENCE_HINTS = (
    "similar to",
    "similar with",
    "like ",
    "such as",
    "for example",
    "e.g.",
    "publicly available",
    "contrary to popular belief",
)
PRIMARY_SOURCE_HOST_HINTS = (
    "talosintelligence.com",
    "mandiant.com",
    "unit42.paloaltonetworks.com",
    "crowdstrike.com",
    "securelist.com",
    "microsoft.com",
    "proofpoint.com",
    "sentinelone.com",
    "recordedfuture.com",
    "bitdefender.com",
    "cisa.gov",
    "cert.org",
)
PRIMARY_SOURCE_PATH_HINTS = (
    "/blog/",
    "/research/",
    "/threat/",
    "/advisory/",
    "/report/",
    "/intelligence/",
    "/security/",
    "/news/",
)
LOW_VALUE_HOST_HINTS = (
    "x.com",
    "twitter.com",
    "facebook.com",
    "linkedin.com",
    "instagram.com",
    "youtube.com",
)

THREAT_REPORT_EXTRACTOR_BASE_URL = os.getenv("THREAT_REPORT_EXTRACTOR_BASE_URL", "https://openrouter.ai/api/v1").strip()
THREAT_REPORT_EXTRACTOR_MODEL = os.getenv(
    "THREAT_REPORT_EXTRACTOR_MODEL",
    "qwen/qwen3-next-80b-a3b-instruct:free",
).strip()
THREAT_REPORT_EXTRACTOR_API_KEY = os.getenv("THREAT_REPORT_EXTRACTOR_API_KEY", "").strip()
THREAT_REPORT_EXTRACTOR_SITE_URL = os.getenv("THREAT_REPORT_EXTRACTOR_SITE_URL", "").strip()
THREAT_REPORT_EXTRACTOR_APP_NAME = os.getenv("THREAT_REPORT_EXTRACTOR_APP_NAME", "CTIPortal Threat Report Extractor").strip()
THREAT_REPORT_EXTRACTOR_CACHE_TTL_SECONDS = int(os.getenv("THREAT_REPORT_EXTRACTOR_CACHE_TTL_SECONDS", "3600"))
THREAT_REPORT_EXTRACTOR_FALLBACK_MODELS = [
    value.strip()
    for value in os.getenv("THREAT_REPORT_EXTRACTOR_FALLBACK_MODELS", "").split(",")
    if value.strip()
]
THREAT_REPORT_EXTRACTOR_MAX_RETRIES = int(os.getenv("THREAT_REPORT_EXTRACTOR_MAX_RETRIES", "3"))
THREAT_REPORT_EXTRACTOR_RETRY_BACKOFF_SECONDS = float(os.getenv("THREAT_REPORT_EXTRACTOR_RETRY_BACKOFF_SECONDS", "2"))
MODEL_RESPONSE_CACHE = {}
RATE_LIMIT_CACHE = {}
