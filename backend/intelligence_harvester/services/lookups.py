import logging
from datetime import datetime, timezone

from django.utils.timezone import make_aware

from intelligence_harvester.models import Source
from scripts.aggregators import reputation
from scripts.field_schema import categorize_fields
from scripts.provider_config import LOOKUP_MODULES
from scripts.utils.hashing import generate_sha256_hash
from scripts.utils.identifier import get_indicator_type

from .providers import is_lookup_applicable, is_provider_applicable


logger = logging.getLogger(__name__)

# Cache timeout in minutes (8 hours)
CACHE_TIMEOUT_MINUTES = 480


def is_cacheable_lookup_error(error_message: str | None) -> bool:
    if not error_message:
        return False
    return error_message.endswith(" returned no data")


def _build_lookup_response(lookup_type: str, provider: str | None, result: dict) -> dict:
    categorized = categorize_fields(lookup_type, result)
    return {
        "essential": categorized["essential"],
        "additional": categorized["additional"],
        "_lookup_type": lookup_type,
        "_provider": provider or "auto",
    }


def _build_lookup_error(lookup_type: str, provider: str | None, error_message: str) -> dict:
    return {
        "error": error_message,
        "_lookup_type": lookup_type,
        "_provider": provider or "auto",
    }


def _get_cached_lookup_response(hashed_value: str, cache_source: str):
    cached_entry = Source.objects.filter(
        hashed_value=hashed_value,
        source=cache_source,
    ).first()
    if not cached_entry:
        return None

    entry_created = cached_entry.created
    if entry_created.tzinfo is None:
        entry_created = make_aware(entry_created, timezone=timezone.utc)

    timestamp_now = datetime.now(timezone.utc)
    time_elapsed = (timestamp_now - entry_created).total_seconds() // 60

    if time_elapsed < CACHE_TIMEOUT_MINUTES:
        return cached_entry.data

    cached_entry.delete()
    return None


def _cache_lookup_response(
    hashed_value: str,
    cache_source: str,
    normalized_value: str,
    indicator_type: str,
    response: dict,
    log_message: str,
):
    Source.objects.update_or_create(
        hashed_value=hashed_value,
        source=cache_source,
        defaults={
            "value": normalized_value,
            "value_type": indicator_type,
            "data": response,
        },
    )
    logger.debug(log_message)


def _run_lookup(lookup_type: str, indicator_value: str, indicator_type: str, provider: str | None):
    if lookup_type == "reputation":
        if indicator_type in ["ipv4", "ipv6"]:
            return reputation.get_ip(indicator_value, provider=provider)
        if indicator_type == "domain":
            return reputation.get_domain(indicator_value, provider=provider)
        if indicator_type in ["md5", "sha1", "sha256", "sha512"]:
            return reputation.get_hash(indicator_value, provider=provider)
        return {"error": f"Unsupported indicator type for reputation: {indicator_type}"}

    module = LOOKUP_MODULES.get(lookup_type)
    if not module:
        return {"error": f"Unsupported lookup type: {lookup_type}"}

    return module.get(indicator_value, provider=provider)


def execute_lookup(lookup_type: str, indicator_value: str, indicator_type: str, provider=None) -> dict:
    """Execute a single lookup with cache support and normalized response shape."""
    try:
        logger.debug(
            f"Executing lookup: type={lookup_type}, provider={provider}, indicator_type={indicator_type}"
        )

        normalized_value = indicator_value.lower()
        hashed_value = generate_sha256_hash(normalized_value)
        cache_source = f"{lookup_type}_{provider or 'auto'}"

        try:
            cached_data = _get_cached_lookup_response(hashed_value, cache_source)
            if cached_data is not None:
                logger.debug(f"Cache hit for {lookup_type}/{provider} on {indicator_value}")
                return cached_data
        except Exception as cache_error:
            logger.warning(f"Error checking cache: {cache_error}")

        logger.debug(
            f"Cache miss for {lookup_type}/{provider} on {indicator_value}, performing fresh lookup"
        )
        result = _run_lookup(lookup_type, indicator_value, indicator_type, provider)

        if not isinstance(result, dict):
            result = {}

        if result.get("error"):
            error_message = result.get("error")
            if (
                isinstance(error_message, str)
                and error_message.startswith("Provider ")
                and error_message.endswith(" not available")
            ):
                logger.debug(f"Skipping unavailable provider for {lookup_type}/{provider}: {error_message}")
            elif is_cacheable_lookup_error(error_message):
                logger.debug(f"No data for {lookup_type}/{provider} on {indicator_value}: {error_message}")
            else:
                logger.warning(f"Lookup error for {lookup_type}/{provider}: {error_message}")

            response = _build_lookup_error(lookup_type, provider, result["error"])

            if is_cacheable_lookup_error(error_message):
                try:
                    _cache_lookup_response(
                        hashed_value=hashed_value,
                        cache_source=cache_source,
                        normalized_value=normalized_value,
                        indicator_type=indicator_type,
                        response=response,
                        log_message=f"Cached no-data result for {lookup_type}/{provider} on {indicator_value}",
                    )
                except Exception as cache_error:
                    logger.warning(f"Error storing cache: {cache_error}")

            return response

        response = _build_lookup_response(lookup_type, provider, result)

        try:
            _cache_lookup_response(
                hashed_value=hashed_value,
                cache_source=cache_source,
                normalized_value=normalized_value,
                indicator_type=indicator_type,
                response=response,
                log_message=f"Cached result for {lookup_type}/{provider} on {indicator_value}",
            )
        except Exception as cache_error:
            logger.warning(f"Error storing cache: {cache_error}")

        logger.debug(f"Lookup completed successfully: {lookup_type}/{provider}")
        return response

    except Exception as exc:
        logger.error(f"Error in lookup {lookup_type}/{provider}: {exc}", exc_info=True)
        return _build_lookup_error(lookup_type, provider, str(exc))


def detect_indicator_types(indicators: list[str]) -> dict[str, str]:
    detected = get_indicator_type(indicators)
    return {item["value"]: item["type"] for item in detected}


def build_indicator_results(
    indicator_value: str,
    indicator_type: str,
    lookup_types: list[str],
    providers_by_type: dict[str, list[str]],
) -> dict:
    indicator_results = []

    for lookup_type in lookup_types:
        if not is_lookup_applicable(lookup_type, indicator_type):
            continue

        providers = providers_by_type.get(lookup_type) or [None]
        for provider in providers:
            if not is_provider_applicable(lookup_type, provider, indicator_type):
                continue
            result = execute_lookup(lookup_type, indicator_value, indicator_type, provider)
            indicator_results.append(result)

    return {
        "indicator": indicator_value,
        "indicator_type": indicator_type,
        "results": indicator_results,
    }


def execute_batch_lookups(indicators: list[str], providers_by_type: dict[str, list[str]]) -> dict:
    lookup_types = list(providers_by_type.keys())
    indicator_types = detect_indicator_types(indicators)
    results = []

    for indicator_value in indicators:
        indicator_type = indicator_types.get(indicator_value, "unknown")
        results.append(
            build_indicator_results(
                indicator_value=indicator_value,
                indicator_type=indicator_type,
                lookup_types=lookup_types,
                providers_by_type=providers_by_type,
            )
        )

    return {"results": results, "indicator_types": indicator_types}
