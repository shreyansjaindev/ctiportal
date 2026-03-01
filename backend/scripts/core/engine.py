import concurrent.futures
from datetime import datetime, timezone
import hashlib
import json
import logging

from intelligence_harvester.models import Source

# Use logger from Django settings instead of configuring here
logger = logging.getLogger(__name__)

# Import unified source registry from provider_config
from ..provider_config import SOURCE_REGISTRY


def generate_sha256_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def get_bulk_cached_data(hashed_values, sources):
    """
    Fetch cached data in bulk to avoid N+1 query problem.
    Returns dict: {(hashed_value, source): data}
    """
    from django.db.models import Q
    from functools import reduce
    import operator
    
    if not hashed_values or not sources:
        return {}
    
    timestamp_now = datetime.now(timezone.utc)
    cache_timeout_minutes = 480
    
    # Single query to fetch all relevant cache entries
    cached_entries = Source.objects.filter(
        hashed_value__in=hashed_values,
        source__in=sources
    ).values('hashed_value', 'source', 'data', 'created')
    
    cache_dict = {}
    expired_conditions = []
    
    for entry in cached_entries:
        # Handle both timezone-aware and naive datetimes
        entry_created = entry['created']
        if entry_created.tzinfo is None:
            # If entry is naive, make it aware (assume UTC)
            from django.utils.timezone import make_aware
            entry_created = make_aware(entry_created, timezone=timezone.utc)
        
        time_elapsed = (timestamp_now - entry_created).total_seconds() // 60
        
        if time_elapsed < cache_timeout_minutes:
            cache_dict[(entry['hashed_value'], entry['source'])] = entry['data']
        else:
            # Collect expired entries for bulk deletion with proper AND conditions
            expired_conditions.append(
                Q(hashed_value=entry['hashed_value']) & Q(source=entry['source'])
            )
    
    # Bulk delete expired entries using OR of (hash AND source) pairs
    if expired_conditions:
        Source.objects.filter(reduce(operator.or_, expired_conditions)).delete()
    
    return cache_dict


def _serialize_cell_data(data):
    """Convert various data types to Excel-compatible strings."""
    if data is None:
        return ""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return ", ".join(str(item) for item in data)
    if isinstance(data, dict):
        return json.dumps(data)
    return str(data)


def _append_headers(existing_headers, row):
    for key in row.keys():
        if key not in existing_headers:
            existing_headers.append(key)
    return existing_headers


def _build_sheet_rows_from_lookup_results(data):
    """Build export rows from the current harvester search response shape."""
    sheets = {}

    for indicator_entry in data.get("results", []):
        indicator_value = indicator_entry.get("indicator")
        indicator_type = indicator_entry.get("indicator_type")

        if not indicator_value:
            continue

        for result in indicator_entry.get("results", []):
            if not isinstance(result, dict):
                continue

            lookup_type = result.get("_lookup_type")
            provider = result.get("_provider") or "auto"
            if not lookup_type:
                continue

            sheet_name = f"{lookup_type} - {provider}"[:31]
            sheet_data = sheets.setdefault(
                sheet_name,
                {"headers": ["indicator", "indicator_type"], "rows": []},
            )

            row = {
                "indicator": indicator_value,
                "indicator_type": indicator_type,
            }

            if result.get("error"):
                row["error"] = result["error"]
            else:
                row.update(result.get("essential") or {})
                row.update(result.get("additional") or {})

            _append_headers(sheet_data["headers"], row)
            sheet_data["rows"].append(row)

    return sheets


def _build_sheet_rows_from_legacy_data(data):
    """Build export rows from the legacy collect_data() response shape."""
    sheets = {}

    for value, indicator_data in data.get("data", {}).items():
        value_type = indicator_data.get("value_type")
        if not value_type:
            continue

        for source, source_data in indicator_data.get("source_data", {}).items():
            if source == "screenshot" or not source_data.get("results"):
                continue

            results_data = source_data.get("results")
            if not results_data:
                logger.warning(f"Missing results for {source} - {value}")
                continue

            if source == "hostio" and isinstance(results_data, dict) and "related" in results_data:
                results_data = results_data["related"]

            if not isinstance(results_data, dict):
                logger.warning(f"Skipping {source} for {value}: results not a dict")
                continue

            sheet_name = f"{source} - {value_type}"[:31]
            sheet_data = sheets.setdefault(
                sheet_name,
                {"headers": ["value"], "rows": []},
            )

            row = {"value": value, **results_data}
            _append_headers(sheet_data["headers"], row)
            sheet_data["rows"].append(row)

    return sheets


def generate_excel(wb, data):
    """Generate Excel workbook from current or legacy harvester export data."""
    # Remove default sheet if it exists
    try:
        if wb.active:
            wb.remove(wb.active)
    except Exception as e:
        logger.warning(f"Could not remove default sheet: {e}")

    if data.get("results"):
        sheets = _build_sheet_rows_from_lookup_results(data)
    else:
        sheets = _build_sheet_rows_from_legacy_data(data)

    for sheet_name, sheet_data in sheets.items():
        headers = sheet_data["headers"]
        sheet = wb.create_sheet(sheet_name)
        sheet.append(headers)

        for row in sheet_data["rows"]:
            sheet.append([_serialize_cell_data(row.get(header)) for header in headers])

    return wb


def thread_creator(executor, value, value_type, sources):
    """Create threads for fetching data from multiple sources."""
    threads = {}
    for source in sources:
        # Validate source exists before accessing
        if source not in SOURCE_REGISTRY:
            logger.warning(f"Skipping unknown source '{source}' in thread_creator")
            continue
        if value_type in SOURCE_REGISTRY[source]["supported_types"]:
            threads[source] = executor.submit(SOURCE_REGISTRY[source]["function"], value, value_type)
    return threads


def _handle_future_result(source, future, value, value_type):
    """Process a single future result and return result data and db update info."""
    external_link = generate_external_link(source, value, value_type)
    
    try:
        result = future.result(timeout=60)
        logger.info(f"{source} completed for {value}")
        
        source_data = {"results": result, "external_link": external_link}
        
        # Skip caching for screenshots
        db_update = None if source == "screenshot" else {
            "value": value,
            "value_type": value_type,
            "hashed_value": generate_sha256_hash(value),
            "source": source,
            "data": json.dumps(result) if result else json.dumps({"error": "Empty result"}),
        }
        
        return source_data, db_update
        
    except concurrent.futures.TimeoutError:
        error_msg = "Timeout waiting for response"
        logger.error(f"{error_msg} from {source} for {value}")
        return _create_error_response(source, value, value_type, {"Error": error_msg})
        
    except Exception as e:
        logger.error(f"Error processing {source} for {value}: {e}", exc_info=True)
        return _create_error_response(source, value, value_type, {"Error": str(e)})


def _create_error_response(source, value, value_type, error_result):
    """Create error response with caching info."""
    source_data = {"results": error_result}
    
    db_update = None if source == "screenshot" else {
        "value": value,
        "value_type": value_type,
        "hashed_value": generate_sha256_hash(value),
        "source": source,
        "data": json.dumps(error_result),
    }
    
    return source_data, db_update


def update_results_and_database(threads_info, results):
    """Process thread results and batch database updates."""
    db_updates = []
    
    for thread_info in threads_info:
        for source, future in thread_info["futures"].items():
            value = thread_info["value"]
            value_type = thread_info["value_type"]
            
            source_data, db_update = _handle_future_result(source, future, value, value_type)
            results[value]["source_data"][source] = source_data
            
            if db_update:
                db_updates.append(db_update)
    
    # Bulk database update - single transaction for all updates
    if db_updates:
        _bulk_update_database(db_updates)
    
    return results


def _bulk_update_database(updates):
    """
    Perform bulk database updates to avoid N individual transactions.
    All updates happen in a single atomic transaction.
    """
    from django.db import transaction
    
    if not updates:
        return
    
    try:
        with transaction.atomic():
            for update in updates:
                Source.objects.update_or_create(
                    value=update["value"],
                    value_type=update["value_type"],
                    hashed_value=update["hashed_value"],
                    source=update["source"],
                    defaults={"data": update["data"]},
                )
    except Exception as e:
        logger.error(f"Bulk database update failed: {e}", exc_info=True)
        raise


# External link configuration
EXTERNAL_LINK_PATTERNS = {
    "ibm": {
        "base_url": "https://exchange.xforce.ibmcloud.com",
        "endpoints": {
            "ipv4": "ip", "ipv6": "ip",
            "domain": "url", "url": "url",
            "md5": "malware", "sha1": "malware", "sha256": "malware", "sha512": "malware",
            "cve": "vulnerabilities",
        },
    },
    "virustotal": {
        "base_url": "https://www.virustotal.com/gui",
        "endpoints": {
            "ipv4": "ip-address", "ipv6": "ip-address",
            "domain": "domain", "url": "domain",
            "md5": "file", "sha1": "file", "sha256": "file", "sha512": "file",
        },
    },
    "hostio": {
        "base_url": "https://host.io",
        "endpoints": {"domain": "", "url": ""},
    },
}


def generate_external_link(source, value, value_type):
    """Generate external link for a source if available."""
    if source not in EXTERNAL_LINK_PATTERNS:
        return None
    
    config = EXTERNAL_LINK_PATTERNS[source]
    base_url = config["base_url"]
    endpoint = config["endpoints"].get(value_type, "")
    
    return f"{base_url}/{endpoint}/{value}" if endpoint else f"{base_url}/{value}"


def _is_valid_indicator(data):
    """Check if indicator data is valid."""
    return (
        isinstance(data, dict) and 
        data.get("value") and 
        data.get("value_type") and 
        data.get("sources")
    )


def collect_data(input_data):
    """Collect enrichment data for indicators from multiple sources."""
    if not input_data:
        logger.warning("collect_data called with empty input_data")
        return {}
    
    results = {}

    # Optimized: Reduce max_workers to prevent connection pool exhaustion
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        threads_info = []
        
        # Collect all unique hashed values and sources for bulk cache lookup
        all_hashed_values = set()
        all_sources = set()
        
        for data in input_data:
            if not _is_valid_indicator(data):
                logger.warning(f"Skipping invalid indicator: {data}")
                continue
            
            value = data["value"].lower()
            all_hashed_values.add(generate_sha256_hash(value))
            all_sources.update(data["sources"])
        
        # Bulk fetch all cached data in ONE query instead of N queries
        bulk_cache = get_bulk_cached_data(list(all_hashed_values), list(all_sources))

        for data in input_data:
            if not _is_valid_indicator(data):
                continue
            
            value = data["value"].lower()
            hashed_value = generate_sha256_hash(value)
            value_type = data["value_type"]
            sources = data["sources"]
                
            results[value] = {"id": data.get("id"), "value_type": value_type, "source_data": {}}

            non_cached_sources = []

            for source in sources:
                # Validate source exists in SOURCE_REGISTRY
                if source not in SOURCE_REGISTRY:
                    logger.warning(f"Unknown source '{source}' for {value}")
                    continue
                    
                if value_type not in SOURCE_REGISTRY[source]["supported_types"]:
                    continue

                external_link = generate_external_link(source, value, value_type)
                
                # Check bulk cache instead of individual database query
                cache_key = (hashed_value, source)
                if cache_key in bulk_cache:
                    try:
                        cached_results = json.loads(bulk_cache[cache_key])
                        results[value]["source_data"][source] = {
                            "results": cached_results,
                            "external_link": external_link,
                        }
                        continue
                    except (json.JSONDecodeError, Exception) as e:
                        logger.error(f"Error loading cache for {value}/{source}: {e}")
                        # Fall through to fetch fresh data

                non_cached_sources.append(source)

            if non_cached_sources:
                threads_info.append({
                    "value": value,
                    "value_type": value_type,
                    "futures": thread_creator(executor, value, value_type, non_cached_sources),
                })

        if threads_info:
            results = update_results_and_database(threads_info, results)

        return results
