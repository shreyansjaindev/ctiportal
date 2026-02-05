cd D:\apps\ctiportal\venv\Scripts\
.\activate
cd ..\..
$date_yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")

python scripts\domain_monitoring\lookalike_domains.py $date_yesterday
