$env:PORT = '5173'
$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' `
  -WorkingDirectory 'D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\frontend' `
  -RedirectStandardOutput 'D:\Nalavariyam Smart Welfare Assistant\.freebuff\frontend.log' `
  -RedirectStandardError 'D:\Nalavariyam Smart Welfare Assistant\.freebuff\frontend.log.err' `
  -WindowStyle Hidden `
  -PassThru
Write-Host "Frontend PID: $($p.Id)"
