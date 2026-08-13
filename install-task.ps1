# Registers Windows Scheduled Tasks for @theitsupportguru (Instagram + Reel + TikTok).
# MONDAY-FRIDAY only, times local AEST (machine is UTC+10):
#   - FacelessStudio Daily        : 05:30  build cards + reel (scheduler daily)
#   - FacelessStudio IG Session   : 05:10  keep IG session alive (session-check.js, auto re-login)
#   - FacelessStudio IG Reel      : 12:00  publish reel via Meta Graph API (reel-api.js)
#   - FacelessStudio IG Slot 0..2 : 06:30 / 10:00 / 13:00  post IG cards (post-runner --slot=N)
#   - FacelessStudio TikTok Slot 0..2 : 06:30 / 10:00 / 13:00  post TikTok (tiktok-bot.js)
# Tasks use S4U Limited logon = they run HEADLESS even when no user is logged in.
# Usage: elevated:  powershell -ExecutionPolicy Bypass -File install-task.ps1
#   (non-interactive re-register:  schtasks /run /tn "FacelessStudio Reinstall")

param(
  [string]$TaskPrefix = "FacelessStudio",
  [switch]$DisableNoSleep,
  [switch]$LogonInteractive
)

$Project = $PSScriptRoot
$NodeExe = "C:\Program Files\nodejs\node.exe"
$Scheduler = Join-Path $Project "src\scheduler.js"
$ReelApi = Join-Path $Project "src\reel-api.js"
$PostRunner = Join-Path $Project "src\post-runner.js"
$SessionCheck = Join-Path $Project "src\session-check.js"
$ReelCheck = Join-Path $Project "src\reel-check.js"
$TikTokBot = Join-Path $Project "src\tiktok-bot.js"
$Days = @('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')

if (-not (Test-Path $NodeExe)) { Write-Host "Node.js not found at $NodeExe"; exit 1 }
foreach ($f in $Scheduler, $ReelApi, $PostRunner, $SessionCheck, $ReelCheck, $TikTokBot) {
  if (-not (Test-Path $f)) { Write-Host "Missing: $f"; exit 1 }
}

$UserId = "$env:USERDOMAIN\$env:USERNAME"
if ($LogonInteractive) {
  $Principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Limited
} else {
  $Principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType S4U -RunLevel Limited
}
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5)

function New-Task {
  param([string]$Name, [string]$ExeArg, [string]$At)
  $Action = New-ScheduledTaskAction -Execute $NodeExe -Argument $ExeArg -WorkingDirectory $Project
  $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $Days -At $At
  Register-ScheduledTask -TaskName $Name -Action $Action -Trigger $Trigger `
    -Settings $Settings -Principal $Principal -Force | Out-Null
  Write-Host "  '$Name' -> Mon-Fri at ${At}: $($ExeArg -replace '.*\\src\\', 'src\')"
}

New-Task "$TaskPrefix Daily" "`"$Scheduler`" daily" "05:30"
New-Task "$TaskPrefix IG Session" "`"$SessionCheck`"" "05:10"
New-Task "$TaskPrefix IG Reel" "`"$ReelApi`"" "12:00"
New-Task "$TaskPrefix IG Slot 0" "`"$PostRunner`" --slot=0" "06:30"
New-Task "$TaskPrefix IG Slot 1" "`"$PostRunner`" --slot=1" "10:00"
New-Task "$TaskPrefix IG Slot 2" "`"$PostRunner`" --slot=2" "13:00"
New-Task "$TaskPrefix TikTok Slot 0" "`"$TikTokBot`"" "06:30"
New-Task "$TaskPrefix TikTok Slot 1" "`"$TikTokBot`"" "10:00"
New-Task "$TaskPrefix TikTok Slot 2" "`"$TikTokBot`"" "13:00"

# One-time reminder: once the FB account has aged (~2 days after 2026-08-12),
# check the reel path and write out/reel-reminder.txt until a Graph token is set.
# Guarded so a later reinstall never resets or re-creates the reminder date,
# and it self-disables once config.instagramReel.api.token is configured.
$ReelCfg = (Get-Content (Join-Path $Project "config.json") -Raw | ConvertFrom-Json).instagramReel
$ReelToken = $ReelCfg.api.token
if (-not $ReelToken) {
  $existing = schtasks /query /tn "$TaskPrefix Reel Check" 2>$null
  if (-not $existing) {
    $at = (Get-Date).Date.AddDays(1).AddHours(10)   # tomorrow 10:00 AEST
    $Action = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$ReelCheck`"" -WorkingDirectory $Project
    $Trigger = New-ScheduledTaskTrigger -Once -At $at
    Register-ScheduledTask -TaskName "$TaskPrefix Reel Check" -Action $Action -Trigger $Trigger `
      -Settings $Settings -Principal $Principal -Force | Out-Null
    Write-Host "  '$TaskPrefix Reel Check' -> once at $($at.ToString('yyyy-MM-dd HH:mm')) (reminder until reel token set)"
  }
}

if (-not $DisableNoSleep) {
  powercfg /change standby-timeout-ac 0 | Out-Null
  powercfg /change hibernate-timeout-ac 0 | Out-Null
  # Lid-close must NOT put the laptop to sleep while running headless on AC.
  if ((Get-CimInstance Win32_PhysicalMedia -ErrorAction SilentlyContinue) -or (Get-CimInstance Win32_ComputerSystem).PCSystemType -le 2) {
    powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0 | Out-Null
    powercfg /setactive SCHEME_CURRENT | Out-Null
    Write-Host "  powercfg: lid-close on AC = Do nothing (headless-safe)"
  }
  Write-Host "  powercfg: sleep/hibernate on AC = Never (machine stays awake for the schedule)"
}

Write-Host ""
Write-Host "Installed: Session 05:10, Daily 05:30, IG cards 06:30/10:00/13:00, IG Reel 12:00, TikTok 06:30/10:00/13:00 (Mon-Fri, AEST)."
Write-Host "All S4U = run headless while no one is logged in."
Write-Host "Re-register silently:  schtasks /run /tn '$TaskPrefix Reinstall'"