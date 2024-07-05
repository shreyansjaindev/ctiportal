import subprocess
import sys
import re


def get_aduser(query):
    data = []

    query_list = re.split(",|\n|;", query)

    # Filter Whitespaces
    query_list = list(filter(None, query_list))

    command_filter = ""
    field = {"name": "Name", "ecode": "SamAccountName", "email": "UserPrincipalName"}

    for value in query_list:
        if "@" in query:
            command_filter = f"""'{field['email']} -like "{value}"'"""
        elif query.lower().startswith("e") or query.lower().startswith("lc"):
            command_filter = f"""'{field['ecode']} -like "{value}"'"""
        else:
            command_filter = f"""'{field['name']} -like "*{value}*"'"""

        output = subprocess.run(
            ["powershell", "Get-ADUser", "-Filter", command_filter], capture_output=True
        )
        output = output.stdout.decode("utf-8").splitlines()
        output = list(filter(None, output))
        output = [dict(map(str.strip, item.split(":")) for item in output)]
        data.append(output)

    return data


if __name__ == "__main__":
    query = sys.argv[1]
    print(get_aduser(query))
