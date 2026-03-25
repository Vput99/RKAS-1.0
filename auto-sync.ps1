# auto-sync.ps1
# Script to watch for changes and automatically run 'npm run sync'

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Get-Location
$watcher.Filter = "*.tsx" # You can add more filters or use *.*
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $name = $Event.SourceEventArgs.Name
    $changeType = $Event.SourceEventArgs.ChangeType
    $timeStamp = $Event.TimeGenerated
    
    Write-Host "Change detected: $name at $timeStamp. Syncing..." -ForegroundColor Cyan
    npm run sync
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action

Write-Host "Watching for changes in $watcher.Path... Press Ctrl+C to stop." -ForegroundColor Yellow

while ($true) {
    Start-Sleep -Seconds 5
}
