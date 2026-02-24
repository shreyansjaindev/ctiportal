import sys
import re


def mha(header):
    header_dict = {}

    header = header.replace(";\n", ";").replace("\n ", " ")
    header = header.split("\n")

    for line in header:
        line = line.split(":", 1)
        if isinstance(line, list) and len(line) > 1:
            if line[0] == "Received" and header_dict.get(line[0], None):
                header_dict[line[0]] = header_dict[line[0]] + "|" + line[1].strip()
            else:
                header_dict[line[0]] = line[1].strip()

    # Removed extra whitespaces
    for key in header_dict:
        header_dict[key] = re.sub(r" +", " ", header_dict[key])

    # Received Header List
    if header_dict.get("Received", None):
        if "|" in header_dict["Received"]:
            header_dict["Received"] = header_dict["Received"].split("|")
        else:
            header_dict["Received"] = [header_dict["Received"]]

    # Rename Message-ID
    try:
        header_dict["MessageID"] = header_dict["Message-ID"]
        del header_dict["Message-ID"]
    except:
        pass

    # Rename Return-Path
    try:
        header_dict["ReturnPath"] = header_dict["Return-Path"]
        del header_dict["Return-Path"]
    except:
        pass

    return header_dict


if __name__ == "__main__":
    print(mha(sys.argv[1]))
