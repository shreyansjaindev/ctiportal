import os
import subprocess
import logging
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)

base_dir = r"D:\apps\ctiportal"
venv_python = os.path.join(base_dir, "venv", "Scripts", "python.exe")

ctiportal_script_path = os.path.join(base_dir, "runserver.py")
base_script_path = os.path.join(base_dir, "scripts", "domain_monitoring")

lookalike_domains_script_path = os.path.join(base_script_path, "lookalike_domains.py")
domain_monitor_script_path = os.path.join(base_script_path, "domain_monitor.py")
certstream_monitor_script_path = os.path.join(base_script_path, "certstream_monitor.py")

date_yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

scripts = [
    f'start "ctiportal" "{venv_python}" "{ctiportal_script_path}"',
    f'start "lookalike_domains" "{venv_python}" "{lookalike_domains_script_path}" {date_yesterday}',
    f'start "domain_monitor" "{venv_python}" "{domain_monitor_script_path}"',
    f'start "certstream_monitor" "{venv_python}" "{certstream_monitor_script_path}"',
]

if __name__ == "__main__":
    try:
        for script in scripts:
            subprocess.Popen(script, shell=True)
            logging.info(f"Started: {script}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
