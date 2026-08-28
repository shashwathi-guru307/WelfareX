$env:PORT = '5000'
$p = Start-Process -FilePath 'python.exe' -ArgumentList 'server.py' `
  -WorkingDirectory 'D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\backend' `
  -RedirectStandardOutput 'D:\Nalavariyam Smart Welfare Assistant\.freebuff\backend.log' `
  -RedirectStandardError 'D:\Nalavariyam Smart Welfare Assistant\.freebuff\backend.log.err' `
  -WindowStyle Hidden `
  -PassThru
Write-Host "Backend PID: $($p.Id)"
