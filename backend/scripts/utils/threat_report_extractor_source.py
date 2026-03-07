import json
import re
from html import unescape
from urllib.parse import urljoin, urlparse

import requests
import tldextract

from scripts.utils.threat_report_extractor_constants import HREF_PATTERN, LOW_VALUE_HOST_HINTS, PRIMARY_SOURCE_HOST_HINTS, PRIMARY_SOURCE_PATH_HINTS
from scripts.utils.textformatter import FETCHABLE_CONTENT_TYPES, REQUEST_HEADERS, _strip_markup, extract_iocs


TITLE_TAG_PATTERN = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
META_CONTENT_PATTERN = re.compile(
    r"""<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>""",
    re.IGNORECASE,
)
TIME_TAG_PATTERN = re.compile(r"""<time[^>]+datetime=["']([^"']+)["'][^>]*>""", re.IGNORECASE)
JSON_LD_PATTERN = re.compile(r"""<script[^>]+type=["']application/ld\+json["'][^>]*>(.*?)</script>""", re.IGNORECASE | re.DOTALL)


def _clean_html_text(value):
    return " ".join(unescape(str(value or "")).split()).strip()


def extract_article_metadata(html):
    title = ""
    article_date = ""

    title_match = TITLE_TAG_PATTERN.search(html or "")
    if title_match:
        title = _clean_html_text(title_match.group(1))

    meta_candidates = {}
    for name, content in META_CONTENT_PATTERN.findall(html or ""):
        meta_candidates[name.strip().lower()] = _clean_html_text(content)

    for key in ("og:title", "twitter:title", "headline"):
        if meta_candidates.get(key):
            title = meta_candidates[key]
            break

    for key in (
        "article:published_time",
        "published_time",
        "date",
        "datepublished",
        "article:modified_time",
        "modified_time",
    ):
        if meta_candidates.get(key):
            article_date = meta_candidates[key]
            break

    if not article_date:
        time_match = TIME_TAG_PATTERN.search(html or "")
        if time_match:
            article_date = _clean_html_text(time_match.group(1))

    if not article_date:
        for block in JSON_LD_PATTERN.findall(html or ""):
            try:
                payload = json.loads(block.strip())
            except json.JSONDecodeError:
                continue
            payloads = payload if isinstance(payload, list) else [payload]
            for item in payloads:
                if not isinstance(item, dict):
                    continue
                if not title and item.get("headline"):
                    title = _clean_html_text(item.get("headline"))
                for key in ("datePublished", "dateCreated", "dateModified"):
                    if item.get(key):
                        article_date = _clean_html_text(item.get(key))
                        break
                if article_date:
                    break
            if article_date:
                break

    return {"title": title, "article_date": article_date}


def registered_domain(url):
    extracted = tldextract.extract(url)
    if extracted.domain and extracted.suffix:
        return f"{extracted.domain}.{extracted.suffix}"
    return extracted.domain or ""


def fetch_url_payload(url):
    response = requests.get(url, headers=REQUEST_HEADERS, timeout=15, allow_redirects=True)
    response.raise_for_status()
    content_type = response.headers.get("Content-Type", "").lower()
    if content_type and not any(value in content_type for value in FETCHABLE_CONTENT_TYPES):
        return {"url": response.url, "content_type": content_type, "html": "", "text": ""}
    html = response.text[:500000]
    return {"url": response.url, "content_type": content_type, "html": html, "text": _strip_markup(html)}


def extract_links_from_html(html, base_url):
    links = []
    seen = set()
    for href in HREF_PATTERN.findall(html or ""):
        if href.startswith(("mailto:", "javascript:", "tel:")):
            continue
        absolute = urljoin(base_url, unescape(href.strip()))
        if not absolute.startswith(("http://", "https://")):
            continue
        if absolute in seen:
            continue
        seen.add(absolute)
        links.append(absolute)
    return links


def score_source_candidate(candidate_url, article_domain):
    parsed = urlparse(candidate_url)
    host = (parsed.netloc or "").lower()
    path = (parsed.path or "").lower()
    score = 0
    if article_domain and registered_domain(candidate_url) != article_domain:
        score += 2
    if any(value in host for value in LOW_VALUE_HOST_HINTS):
        score -= 4
    if any(value in host for value in PRIMARY_SOURCE_HOST_HINTS):
        score += 4
    if any(value in path for value in PRIMARY_SOURCE_PATH_HINTS):
        score += 2
    if path.endswith((".pdf", ".txt", ".csv", ".json")):
        score += 2
    return score


def score_current_source(url):
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    path = (parsed.path or "").lower()
    score = 1
    if any(value in host for value in LOW_VALUE_HOST_HINTS):
        score -= 2
    if any(value in host for value in PRIMARY_SOURCE_HOST_HINTS):
        score += 3
    if any(value in path for value in PRIMARY_SOURCE_PATH_HINTS):
        score += 1
    return score


def score_embedded_source_candidate(candidate_url):
    parsed = urlparse(candidate_url)
    host = (parsed.netloc or "").lower()
    path = (parsed.path or "").lower()
    score = score_current_source(candidate_url)
    if path.endswith((".pdf", ".txt", ".csv", ".json")):
        score -= 4
    if "raw.githubusercontent.com" in host:
        score -= 5
    if host == "github.com" and "/blob/" in path:
        score -= 4
    return score


def select_source_url_from_text(query):
    urls = [url for url in dict.fromkeys(extract_iocs(query).get("urls", [])) if url.startswith(("http://", "https://"))]
    if not urls:
        return ""

    scored_urls = sorted(
        [{"url": url, "score": score_embedded_source_candidate(url)} for url in urls],
        key=lambda item: item["score"],
        reverse=True,
    )
    best_candidate = scored_urls[0]
    return best_candidate["url"] if best_candidate["score"] >= 1 else ""


def looks_like_html(content):
    sample = (content or "")[:2000].lower()
    return "<html" in sample or "<body" in sample or "<article" in sample or "<div" in sample


def resolve_source_input(query, source_kind):
    if source_kind == "url":
        return resolve_primary_source(query)

    embedded_source_url = select_source_url_from_text(query)
    if embedded_source_url:
        resolved = resolve_primary_source(embedded_source_url)
        resolved["source_resolution_strategy"] = "embedded_source_url"
        return resolved

    if looks_like_html(query):
        metadata = extract_article_metadata(query)
        return {
            "input_url": "",
            "fetched_url": "",
            "resolved_primary_source_url": "",
            "used_source_url": "",
            "source_resolution_strategy": "embedded_html",
            "source_resolution_confidence": 0.0,
            "warnings": [],
            "source_text": _strip_markup(query),
            "source_html": query[:500000],
            **metadata,
        }

    return {
        "input_url": "",
        "fetched_url": "",
        "resolved_primary_source_url": "",
        "used_source_url": "",
        "source_resolution_strategy": "provided_text_only",
        "source_resolution_confidence": 0.0,
        "warnings": [],
        "source_text": query,
        "source_html": "",
        "title": "",
        "article_date": "",
    }


def resolve_primary_source(url):
    article_payload = fetch_url_payload(url)
    article_meta = extract_article_metadata(article_payload["html"])
    article_domain = registered_domain(article_payload["url"])
    scored_links = sorted(
        [{"url": link, "score": score_source_candidate(link, article_domain)} for link in extract_links_from_html(article_payload["html"], article_payload["url"])],
        key=lambda item: item["score"],
        reverse=True,
    )
    current_source_score = score_current_source(article_payload["url"])
    best_candidate = next(
        (item for item in scored_links if item["score"] >= 6 and item["score"] >= current_source_score + 3),
        None,
    )
    warnings = []
    if not best_candidate:
        return {
            "input_url": url,
            "fetched_url": article_payload["url"],
            "resolved_primary_source_url": "",
            "used_source_url": article_payload["url"],
            "source_resolution_strategy": "provided_url_only",
            "source_resolution_confidence": 0.0,
            "warnings": warnings,
            "source_text": article_payload["text"] or url,
            "source_html": article_payload["html"],
            **article_meta,
        }
    try:
        primary_payload = fetch_url_payload(best_candidate["url"])
        primary_meta = extract_article_metadata(primary_payload["html"])
        return {
            "input_url": url,
            "fetched_url": article_payload["url"],
            "resolved_primary_source_url": primary_payload["url"],
            "used_source_url": primary_payload["url"],
            "source_resolution_strategy": "resolved_primary_source",
            "source_resolution_confidence": min(1.0, best_candidate["score"] / 10),
            "warnings": warnings,
            "source_text": primary_payload["text"] or article_payload["text"] or url,
            "source_html": primary_payload["html"],
            "title": primary_meta.get("title") or article_meta.get("title", ""),
            "article_date": primary_meta.get("article_date") or article_meta.get("article_date", ""),
        }
    except requests.RequestException as exc:
        warnings.append(f"Resolved source candidate could not be fetched: {exc}")
        return {
            "input_url": url,
            "fetched_url": article_payload["url"],
            "resolved_primary_source_url": best_candidate["url"],
            "used_source_url": article_payload["url"],
            "source_resolution_strategy": "candidate_failed_fallback",
            "source_resolution_confidence": min(1.0, best_candidate["score"] / 10),
            "warnings": warnings,
            "source_text": article_payload["text"] or url,
            "source_html": article_payload["html"],
            **article_meta,
        }
