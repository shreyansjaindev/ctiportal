import json
import logging


logger = logging.getLogger(__name__)


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


def generate_excel(wb, data):
    """Generate Excel workbook from the current harvester search response shape."""
    try:
        if wb.active:
            wb.remove(wb.active)
    except Exception as e:
        logger.warning(f"Could not remove default sheet: {e}")

    sheets = _build_sheet_rows_from_lookup_results(data)

    for sheet_name, sheet_data in sheets.items():
        headers = sheet_data["headers"]
        sheet = wb.create_sheet(sheet_name)
        sheet.append(headers)

        for row in sheet_data["rows"]:
            sheet.append([_serialize_cell_data(row.get(header)) for header in headers])

    return wb
