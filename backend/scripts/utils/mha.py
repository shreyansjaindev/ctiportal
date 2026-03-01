import sys
import re

import mailparser


def _collapse_whitespace(value):
    if isinstance(value, str):
        return re.sub(r"\s+", " ", value).strip()
    if isinstance(value, list):
        return [_collapse_whitespace(item) for item in value]
    if isinstance(value, dict):
        return {key: _collapse_whitespace(item) for key, item in value.items()}
    return value


def _format_addresses(addresses):
    formatted = []
    for display_name, address in addresses or []:
        if display_name:
            formatted.append(f'"{display_name}" <{address}>')
        else:
            formatted.append(address)
    return formatted


def mha(header):
    normalized_header = header.replace("\r\n", "\n").replace("\r", "\n").strip()
    parsed_mail = mailparser.parse_from_string(f"{normalized_header}\n\n")

    header_dict = {
        key: _collapse_whitespace(value)
        for key, value in parsed_mail.headers.items()
    }

    if "Received" in header_dict and not isinstance(header_dict["Received"], list):
        header_dict["Received"] = [header_dict["Received"]]

    if "Message-ID" in header_dict:
        header_dict["MessageID"] = header_dict.pop("Message-ID")

    if "Return-Path" in header_dict:
        header_dict["ReturnPath"] = header_dict.pop("Return-Path")

    from_addresses = _format_addresses(parsed_mail.from_)
    to_addresses = _format_addresses(parsed_mail.to)

    if from_addresses:
        header_dict["From"] = from_addresses[0]
        header_dict["FromParsed"] = from_addresses

    if to_addresses:
        header_dict["To"] = ", ".join(to_addresses)
        header_dict["ToParsed"] = to_addresses

    header_dict["ReceivedParsed"] = _collapse_whitespace(parsed_mail.received)
    header_dict["HasDefects"] = parsed_mail.has_defects
    header_dict["Defects"] = parsed_mail.defects
    header_dict["DefectCategories"] = sorted(parsed_mail.defects_categories)

    return header_dict


if __name__ == "__main__":
    print(mha(sys.argv[1]))
