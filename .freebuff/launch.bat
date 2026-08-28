@echo off
echo Starting Nalavariyam Smart Welfare Assistant...
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Nalavariyam Smart Welfare Assistant\.freebuff\launch-backend.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Nalavariyam Smart Welfare Assistant\.freebuff\launch-frontend.ps1"
echo Both servers launched.
