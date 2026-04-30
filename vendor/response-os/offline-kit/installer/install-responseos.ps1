param(
  [Parameter(Mandatory = $true)]
  [string]$AppDir,
  [string]$AppId = "client-app",
  [switch]$NoScaffold,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Installer = Join-Path $ScriptDir "install-from-kit.mjs"

if (-not (Test-Path $Installer)) {
  throw "Installer script not found: $Installer"
}

$ArgsList = @(
  $Installer,
  "--app-dir", $AppDir,
  "--app-id", $AppId
)

if ($NoScaffold) {
  $ArgsList += "--no-scaffold"
}
if ($Force) {
  $ArgsList += "--force"
}

node @ArgsList
