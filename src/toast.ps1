# Shows a Windows toast notification (works from headless S4U scheduled tasks
# as long as a user session is logged in). Kept deliberately quiet on failure.
param([string]$Title = "Faceless Studio", [string]$Message = "")

$ErrorActionPreference = 'SilentlyContinue'
$AppId = 'FacelessStudio.Notifications'
New-Item -Path ("HKCU:\Software\Classes\AppUserModelId\" + $AppId) -Force -ErrorAction SilentlyContinue | Out-Null

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] 2>$null | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] 2>$null | Out-Null

$esc = { param($s) ([System.Security.SecurityElement]::Escape([string]$s)) }
$xmlText = "<toast activationType=`"foreground`"><visual><binding template=`"ToastGeneric`"><text>$(& $esc $Title)</text><text>$(& $esc $Message)</text></binding></visual></toast>"

try {
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml($xmlText)
  $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppId).Show($toast) | Out-Null
} catch {}
exit 0