## NeuroMoves Recovery Manifest

Recovery completed on `2026-04-26`.

### Restored app root

- Destination: `apps/neurormoves`
- Primary source: `L:\dev\Northern Step Studio\apps\neuromoves\apps\mobile`

### Restored companion project folders

- `backend/` from `L:\dev\Northern Step Studio\apps\neuromoves\backend`
- `database/` from `L:\dev\Northern Step Studio\apps\neuromoves\database`
- `frontend/` from `L:\dev\Northern Step Studio\apps\neuromoves\frontend`
- `scripts/` from `L:\dev\Northern Step Studio\apps\neuromoves\scripts`
- `RECOVERED_PROJECT_README.md` from `L:\dev\Northern Step Studio\apps\neuromoves\README.md`

### Backups of the replaced partial app

- `recovery/neurormoves-backups/partial-app-20260426-150753`
- `recovery/neurormoves-backups/in-place-backup-copy-20260426-150824`

### Important repo context

- Public website monorepo: `D:\dev\Northern Step Studio`
- Recovered private/local source repo: `L:\dev\Northern Step Studio\apps\neuromoves`
- Remote for the recovered source repo: `https://github.com/NorthernStepStudio/NeuroMoves.git`

### Notes

- The restored Expo app is the recovered mobile client, moved from `apps/mobile` to the expected workspace root.
- The companion backend, database, static frontend, and scripts were restored alongside the Expo app without copying the nested `.git` directory.
- No generated caches or dependency folders were restored from the source tree.
