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

        try:
            output = subprocess.run(
                ["powershell", "-Command", f"Get-ADUser -Filter {command_filter}"], 
                capture_output=True,
                timeout=10,
                check=False
            )
            
            # Check if command succeeded
            if output.returncode != 0:
                continue
                
            output_lines = output.stdout.decode("utf-8").splitlines()
            output_lines = list(filter(None, output_lines))
            
            # Parse key-value pairs, only including lines with colons
            parsed_data = []
            for item in output_lines:
                if ":" in item:
                    parts = item.split(":", 1)
                    parsed_data.append({parts[0].strip(): parts[1].strip()})
            
            if parsed_data:
                data.append(parsed_data)
        except subprocess.TimeoutExpired:
            continue
        except Exception as e:
            continue

    return data


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ad_users.py <query>")
        sys.exit(1)
    
    query = sys.argv[1]
    print(get_aduser(query))
