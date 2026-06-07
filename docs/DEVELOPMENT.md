# Development Setup and Network Troubleshooting

This file documents how to start the dev server and troubleshoot device connection issues (Expo/React Native).

## Quick start

- Install deps:

```powershell
npm install
```

- Validate assets (checks for missing require() assets referenced by VoiceAssets and `app.json`):

```powershell
npm run validate-assets
```

- Start Expo (recommended: tunnel mode — works across networks):

```powershell
npm start
# or explicitly
npm run start:lan
npm run start:localhost
```

## Common connection problems

If your device (iPhone/iPad/Android) shows "Could not connect to development server" or the Expo app shows a URL with your machine IP but cannot fetch the bundle, try the following checklist in order:

1. Are your phone and development machine on the same Wi‑Fi network?
   - If not, connect them to the same network or use `npm start` (tunnel mode) which uses an ngrok-like tunnel.

2. Is the dev server running and listening on the expected ports?
   - While `expo start` is running, check:

```powershell
# shows process listening on the common ports
netstat -ano | findstr 19000
netstat -ano | findstr 19001
netstat -ano | findstr 8081
netstat -ano | findstr 8083
```

- If nothing is listening, the CLI likely failed to start — check the terminal output.

3. Firewall / Windows Defender may block incoming connections to Node/Expo. Allow Node.exe and open required ports (run as admin):

```powershell
# Allow Node inbound for TCP (adjust path to node.exe if needed)
New-NetFirewallRule -DisplayName "Allow Node (Expo dev)" -Direction Inbound -Program "$(Get-Command node).Source" -Action Allow -Profile Private,Domain

# Or specifically open ports (19000/19001/8081/8083)
New-NetFirewallRule -DisplayName "Allow Expo ports" -Direction Inbound -LocalPort 19000,19001,8081,8083 -Protocol TCP -Action Allow -Profile Private,Domain
```

4. VPNs and corporate proxies can block local device discovery. Disable VPN temporarily and retry.

5. Use tunnel mode when device and host cannot reach each other directly:

```powershell
npm start # (uses --tunnel by default)
```

6. If you prefer LAN mode and your device still fails to connect, try starting with the local host explicitly and use QR code scanning:

```powershell
npm run start:lan
```

7. When using iOS devices and the bundled dev client fails to download the JS bundle, check the URL shown in the red error overlay (it will include an IP and port). From your dev machine, try fetching that URL to see if it responds:

```powershell
# Replace with the URL shown in the overlay
Invoke-WebRequest -Uri 'http://192.168.1.152:8083/apps/neuromoves/index.bundle' -UseBasicParsing -TimeoutSec 10
```

If the request times out or is refused, the device cannot reach the dev server.

## Permanent fixes we applied

- `EXPO_OFFLINE=1` is set in `.env` to avoid external manifest fetches that sometimes fail during development.
- `npm start` defaults to `expo start --tunnel` to make device connection more reliable across networks.
- `scripts/validate-assets.js` will fail early if assets referenced in `VoiceAssets.ts` or `app.json` are missing.

## If issues persist

Paste the last 200 lines of the terminal where you ran `npm start` and the output of the following commands:

```powershell
# capture expo logs
npx expo start -c > expo-start.log 2>&1
Get-Content expo-start.log -Tail 200

# check manifest endpoint
(Invoke-WebRequest -Uri 'http://127.0.0.1:19000/--/manifest?platform=ios' -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri 'http://127.0.0.1:19000/--/manifest?platform=ios' -UseBasicParsing).Content | Out-File manifest.json
Get-Content manifest.json -TotalCount 200
```

I can then point to exact failure type (bind error, fetch timeout, DNS/proxy issue, or firewall block) and provide the minimal fix.
