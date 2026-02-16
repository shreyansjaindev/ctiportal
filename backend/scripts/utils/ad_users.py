import subprocess
import sys
import re
import shlex


def escape_powershell_string(s):
    """Escape a string for use in PowerShell by using single quotes and escaping single quotes."""
    # Replace single quotes with two single quotes (PowerShell escaping)
    return "'" + s.replace("'", "''") + "'"


def get_aduser(query):
    data = []

    query_list = re.split(",|\n|;", query)

    # Filter Whitespaces
    query_list = list(filter(None, query_list))

    command_filter = ""
    field = {"name": "Name", "ecode": "SamAccountName", "email": "UserPrincipalName"}

    for value in query_list:
        # Sanitize and escape the value for PowerShell
        value = value.strip()
        escaped_value = escape_powershell_string(value)
        
        if "@" in value:
            command_filter = f"{field['email']} -like {escaped_value}"
        elif value.lower().startswith("e") or value.lower().startswith("lc"):
            command_filter = f"{field['ecode']} -like {escaped_value}"
        else:
            # For name searches, allow wildcards
            escaped_value_with_wildcards = escape_powershell_string("*" + value + "*")
            command_filter = f"{field['name']} -like {escaped_value_with_wildcards}"

        output = subprocess.run(
            ["powershell", "-Command", f"Get-ADUser -Filter {command_filter}"], 
            capture_output=True,
            timeout=10
        )
        output = output.stdout.decode("utf-8").splitlines()
        output = list(filter(None, output))
        output = [dict(map(str.strip, item.split(":")) for item in output)]
        data.append(output)

    return data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ad_users.py <query>")
        sys.exit(1)
    
    query = sys.argv[1]
    print(get_aduser(query))
