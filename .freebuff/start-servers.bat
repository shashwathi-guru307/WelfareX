@echo off
cd /d "D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\backend"
start "Backend" /B python server.py > "D:\Nalavariyam Smart Welfare Assistant\.freebuff\backend.log" 2> "D:\Nalavariyam Smart Welfare Assistant\.freebuff\backend.log.err"
cd /d "D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\frontend"
start "Frontend" /B npm.cmd run dev > "D:\Nalavariyam Smart Welfare Assistant\.freebuff\frontend.log" 2> "D:\Nalavariyam Smart Welfare Assistant\.freebuff\frontend.log.err"
