@echo off
REM Start the portable PostgreSQL for Sanskar Palace (listens on port 5433).
"D:\pg\pgsql\bin\pg_ctl.exe" -D "D:\pg\data" -l "D:\pg\log.txt" -o "-p 5433" start
