ResponseOS Offline Install Kit
==============================

Package: @nss/response-os
Version: 0.1.0
Tarball: artifacts/nss-response-os-0.1.0.tgz

Use on client machine (Windows PowerShell):
1. Open PowerShell in this folder.
2. Run:
   .\installer\install-responseos.ps1 -AppDir "C:\path\to\client-app" -AppId "client-app-id"

Requirements on client machine:
- Node.js 20+
- npm
- Existing app folder with package.json

What installer does:
- Installs @nss/response-os from local tarball (offline)
- Creates a starter responseos/client.js integration file (unless disabled)