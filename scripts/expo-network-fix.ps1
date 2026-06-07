<#
expo-network-fix.ps1

Diagnose common Windows issues that prevent Expo/Metro from serving bundles to devices
and optionally create Firewall rules + set the active Wi‑Fi network to Private. Run this as
Administrator to enable automatic fixes.

Usage:
  - Open PowerShell as Administrator and run:
      ./scripts/expo-network-fix.ps1
  - To run non-interactively and accept fixes, use:
      ./scripts/expo-network-fix.ps1 -AutoYes
#>

param(
    [switch]$AutoYes
)

function Is-Administrator {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Output "=== Expo Network Diagnostic/Repair ==="

# IP addresses
Write-Output "\n-- IPv4 Addresses (non-loopback) --"
$ipv4 = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object IPAddress,InterfaceIndex,InterfaceAlias
if (-not $ipv4) { Write-Output "(no IPv4 addresses found)" } else { $ipv4 | Format-Table -AutoSize }

# Find likely active private interface
$devIpEntry = $ipv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or ($_ .IPAddress -like '172.*') } | Select-Object -First 1
if ($devIpEntry) {
    $devIp = $devIpEntry.IPAddress
    $ifIndex = $devIpEntry.InterfaceIndex
    Write-Output "Detected candidate dev IP: $devIp (InterfaceIndex: $ifIndex)"
} else {
    Write-Output "No private-range IPv4 detected. If your device is on Wi-Fi, ensure it's connected to same network." 
    $devIp = $null
}

# Show current network profile for that interface
if ($devIp -and $ifIndex) {
    $profile = Get-NetConnectionProfile -InterfaceIndex $ifIndex -ErrorAction SilentlyContinue
    if ($profile) { Write-Output "Network profile: Interface '$($profile.InterfaceAlias)' - Category: $($profile.NetworkCategory)" }
}

# Check Metro/Expo ports
Write-Output "\n-- Listening ports (common Expo/Metro ports) --"
$ports = @(19000,19001,8081,8083)
foreach ($p in $ports) {
    $lines = netstat -aon | findstr ":$p"
    if ($lines) { Write-Output "Port $p:"; $lines } else { Write-Output "Port $p: no matching listeners" }
}

# Find node executable path if available
try {
    $nodeCmd = (Get-Command node.exe -ErrorAction Stop).Path
} catch {
    $nodeCmd = 'C:\Program Files\nodejs\node.exe'
}
Write-Output "\nDetected node.exe path: $nodeCmd"

# Admin-only fixes
if (-not (Is-Administrator)) {
    Write-Output "\nNOTE: Not running as Administrator. Automatic firewall/profile fixes require elevation."
    Write-Output "If you want the script to create firewall rules and set the network to Private, re-run PowerShell as Administrator and run this script again."
    Write-Output "Suggested elevated command: Start-Process powershell -Verb runAs -ArgumentList './scripts/expo-network-fix.ps1'"
    exit 0
}

Write-Output "\nRunning with Administrator privileges — offering automatic fixes." 

# If interface profile is not Private, offer to set it
if ($devIp -and $ifIndex) {
    $profile = Get-NetConnectionProfile -InterfaceIndex $ifIndex -ErrorAction SilentlyContinue
    if ($profile -and $profile.NetworkCategory -ne 'Private') {
        $do = $AutoYes -or (Read-Host "Set network '$($profile.InterfaceAlias)' to Private? (y/n)") -eq 'y'
        if ($do) {
            try {
                Set-NetConnectionProfile -InterfaceIndex $ifIndex -NetworkCategory Private -ErrorAction Stop
                Write-Output "Set interface $($profile.InterfaceAlias) to Private."
            } catch {
                Write-Output "Failed to set network profile: $_"
            }
        } else {
            Write-Output "Skipping network profile change."
        }
    } else {
        Write-Output "Network profile already Private or not detectable."
    }
}

# Create firewall rules for node and Expo ports
$ruleNameNode = 'Allow Node (Expo)'
$ruleNamePorts = 'Allow Expo Ports (19000-19001,8081,8083)'

if (-not (Get-NetFirewallRule -DisplayName $ruleNameNode -ErrorAction SilentlyContinue)) {
    $do = $AutoYes -or (Read-Host "Create inbound firewall rule to allow node.exe for Private profile? (y/n)") -eq 'y'
    if ($do) {
        try {
            New-NetFirewallRule -DisplayName $ruleNameNode -Direction Inbound -Program $nodeCmd -Action Allow -Profile Private -EdgeTraversalPolicy Allow
            Write-Output "Created firewall rule: $ruleNameNode"
        } catch {
            Write-Output "Failed to create node firewall rule: $_"
        }
    }
} else { Write-Output "Firewall rule '$ruleNameNode' already exists." }

if (-not (Get-NetFirewallRule -DisplayName $ruleNamePorts -ErrorAction SilentlyContinue)) {
    $do = $AutoYes -or (Read-Host "Create inbound firewall rule to allow Expo ports (19000-19001,8081,8083)? (y/n)") -eq 'y'
    if ($do) {
        try {
            New-NetFirewallRule -DisplayName $ruleNamePorts -Direction Inbound -LocalPort '19000-19001,8081,8083' -Protocol TCP -Action Allow -Profile Private
            Write-Output "Created firewall rule: $ruleNamePorts"
        } catch {
            Write-Output "Failed to create ports firewall rule: $_"
        }
    }
} else { Write-Output "Firewall rule '$ruleNamePorts' already exists." }

Write-Output "\nFinished. Recommended next steps:" 
Write-Output "- Ensure your development device is on the same Wi‑Fi network (not a guest network)."
Write-Output "- Disable VPNs while testing (they can interfere)."
Write-Output "- Start the project with 'npm start' (the workspace start script forces '--tunnel')."
Write-Output "- If problems persist, collect the red-overlay 'Copy' text from the device and paste here."

exit 0
