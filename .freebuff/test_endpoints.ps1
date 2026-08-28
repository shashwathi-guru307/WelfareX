Start-Sleep -Seconds 3
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -UseBasicParsing
    Write-Output "Health: $($r.StatusCode)"
} catch {
    Write-Output "Health failed: $($_.Exception.Message)"
}

$endpoints = @(
    '/reminders?per_page=5',
    '/reminders/summary',
    '/reminders/overdue',
    '/notification-preferences',
    '/alerts/counts',
    '/alerts/unread-count',
    '/renewals/breakdown',
    '/renewals/summary',
    '/activities/recent'
)

foreach ($ep in $endpoints) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5000/api$ep" -UseBasicParsing
        $j = $r.Content | ConvertFrom-Json
        Write-Output "OK $ep (status=$($r.StatusCode))"
    } catch {
        Write-Output "FAIL $ep : $($_.Exception.Message)"
    }
}

# Test creating a reminder
try {
    $body = '{"title":"Test reminder","reminder_type":"FOLLOW_UP","priority":"MEDIUM"}'
    $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/reminders' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
    Write-Output "POST /reminders OK"
} catch {
    Write-Output "POST /reminders FAIL: $($_.Exception.Message)"
}

# Test complete reminder
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/reminders/1/complete' -Method POST -UseBasicParsing
    Write-Output "POST /reminders/1/complete OK"
} catch {
    Write-Output "POST /reminders/1/complete FAIL: $($_.Exception.Message)"
}

# Test daily check
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/renewals/daily-check' -Method POST -UseBasicParsing
    Write-Output "POST /renewals/daily-check OK"
} catch {
    Write-Output "POST /renewals/daily-check FAIL: $($_.Exception.Message)"
}
