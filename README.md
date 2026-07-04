# Maplebot

Quest helper overlay for **MapleRoyals v83**. Step-by-step guides (job advancement, boss prequests, PQs) beside your game window.

**Display-only** — Maplebot never sends keyboard or mouse input to the game.

## Install (Windows)

1. Open **[GitHub Releases](https://github.com/chriseg0996-star/maplebot/releases)** and download **Maplebot Setup 2.3.0.exe** (or the portable `.exe`).
2. Run the installer. If SmartScreen warns, choose **More info → Run anyway** (builds are not code-signed yet).
3. Launch **Maplebot** from Start or the desktop shortcut.

MapleRoyals must run in **windowed** or **borderless windowed** mode — exclusive fullscreen covers the overlay.

## First run

1. Drag the title bar to park the overlay beside your minimap.
2. Pick your character from the profile pill in the header (default **Adventurer**).
3. Set **Level**, choose a guide, and check off steps as you play.
4. Optional: **CAL** → drag over the in-game map name → **OCR** for read-only map matching.

## Controls

| Input | Action |
|-------|--------|
| **F8** | Toggle click-through (play through the overlay) |
| **F9** | Next guide |
| **F10** | Toggle guide library |
| **◐** | Cycle opacity |
| **—** | Collapse to title bar |
| **_** | Minimize to system tray |
| **⚙** | Settings (OCR confidence, monitor, etc.) |

## Updates

Packaged builds check GitHub Releases on startup. When an update is available, the status bar shows **vX.Y.Z available — click to download**. After download, click **restart to install**.

## Build from source

```powershell
cd maplebot
npm install
npm start          # development
npm run dist       # local installer in dist/ (no upload)
```

See [RELEASING.md](RELEASING.md) for publishing a tagged release to GitHub.

## Guides included (v2.3)

21 guides — all base class 4th jobs covered, boss prequests (Zakum, HT, Pink Bean, Pap), Kerning/Ludi/Showa PQs, NLC travel, and more.

## License

MIT
