cd D:\apps\ctiportal\venv\Scripts\
.\activate
cd ..\..
$date_yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")

python backend\manage.py run_lookalike_scan --date $date_yesterday
