$backendDir = "D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\backend"
$frontendDir = "D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\frontend"
$logDir = "D:\Nalavariyam Smart Welfare Assistant\.freebuff"

# Start backend
$be = Start-Process python -ArgumentList "server.py" -WorkingDirectory $backendDir -RedirectStandardOutput "$logDir\backend.log" -RedirectStandardError "$logDir\backend.log.err" -WindowStyle Hidden -PassThru
Write-Output "BACKEND_PID=$($be.Id)"

# Start frontend
$fe = Start-Process npm.cmd -ArgumentList "run","dev" -WorkingDirectory $frontendDir -RedirectStandardOutput "$logDir\frontend.log" -RedirectStandardError "$logDir\frontend.log.err" -WindowStyle Hidden -PassThru
Write-Output "FRONTEND_PID=$($fe.Id)"
