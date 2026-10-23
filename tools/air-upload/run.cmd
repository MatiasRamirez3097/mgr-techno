@echo off
rem Tarea programada: descarga la lista de AIR y la sube al sitio (ver README.md)
cd /d "%~dp0..\.."
call npx tsx tools\air-upload\upload.ts >> "%~dp0air-upload.log" 2>&1
