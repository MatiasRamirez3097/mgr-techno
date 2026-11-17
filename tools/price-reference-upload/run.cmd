@echo off
rem Tarea programada: lee las tiendas de referencia de precio y sube lo leido al sitio (ver README.md)
cd /d "%~dp0..\.."
call npx tsx tools\price-reference-upload\upload.ts >> "%~dp0price-reference-upload.log" 2>&1
