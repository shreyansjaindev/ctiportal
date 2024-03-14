cd D:\apps\ctiportal\venv\Scripts\
.\activate
cd ..\..
$date_yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
python additional_scripts\lookalike_domains.py $date_yesterday