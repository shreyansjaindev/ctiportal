from scripts.provider_config import INDICATOR_LOOKUPS, LOOKUP_MODULES, get_category_providers, get_presets, get_provider_info


def is_lookup_applicable(lookup_type: str, indicator_type: str) -> bool:
    """Check if a lookup type is applicable for an indicator type."""
    applicable_lookups = INDICATOR_LOOKUPS.get(indicator_type, [])
    return lookup_type in applicable_lookups


def _normalize_indicator_type_for_provider(indicator_type: str) -> str:
    if indicator_type in {"md5", "sha1", "sha256", "sha512"}:
        return "hash"
    return indicator_type


def is_provider_applicable(lookup_type: str, provider_id: str | None, indicator_type: str) -> bool:
    """Check if a provider supports the given indicator type inside a lookup category."""
    if provider_id is None:
        return True

    provider_info = get_provider_info(lookup_type, provider_id)
    supported_indicators = provider_info.get("supported_indicators") or []
    if not supported_indicators:
        return True

    normalized_indicator_type = _normalize_indicator_type_for_provider(indicator_type)
    return normalized_indicator_type in supported_indicators


def build_providers_payload() -> dict:
    providers_by_type = {}

    for lookup_type in LOOKUP_MODULES:
        provider_metadata = get_category_providers(lookup_type)
        providers_by_type[lookup_type] = [
            {**meta, "available": True}
            for _, meta in provider_metadata.items()
        ]

    return {
        "providers_by_type": providers_by_type,
        "presets": get_presets(),
        "metadata": {
            "version": "1.0",
            "categories": list(providers_by_type.keys()),
        },
    }
