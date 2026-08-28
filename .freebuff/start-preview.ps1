$log = 'D:\Nalavariyam Smart Welfare Assistant\.freebuff\preview-b7aa0032-0484-428c-999e-03a089b633cf.log'
$errlog = $log + '.err'
$proc = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'D:\Nalavariyam Smart Welfare Assistant\nalavariyam-smart-welfare-assistant\frontend' -RedirectStandardOutput $log -RedirectStandardError $errlog -WindowStyle Hidden -PassThru
Write-Output $proc.Id
