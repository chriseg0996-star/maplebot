# Maplebot

Quest helper overlay for **MapleRoyals v83**. Shows step-by-step guides (job advancement, boss prequests) on top of your game window.

**Display-only** — Maplebot never sends keyboard or mouse input to the game.

## Install (Windows)

1. Download **Maplebot Setup 1.0.0.exe** from the [Releases](https://github.com/your-org/maplebot/releases) page (or run `npm run dist` to build locally).
2. Run the installer. If Windows SmartScreen appears, choose **More info → Run anyway** (the build is not code-signed).
3. Launch **Maplebot** from the Start menu or desktop shortcut.

MapleRoyals must run in **windowed** or **borderless windowed** mode. Exclusive fullscreen covers the overlay.

## First run

1. Position the overlay beside your minimap (drag the title bar).
2. Set your character **Level** in the header.
3. Pick a guide from the dropdown or open the **Library** (📖).
4. Click steps to mark them done as you play.

## Controls

| Control | Action |
|---------|--------|
| **F8** | Toggle click-through (play through the overlay) |
| **◐** | Cycle opacity |
| **—** | Collapse to title bar only |
| **🔓 / 🔒** | Click-through toggle |
| **EDIT / +** | Edit current guide or create a new one |

## Optional: Map OCR

OCR reads the in-game map name from your screen and highlights the matching guide step. It is optional — guides work without it.

1. Click **CAL** and drag a rectangle over the map name area in MapleRoyals.
2. Click **OCR** to turn on read-only recognition (updates every ~3 seconds).
3. **CAL** shows a green border when calibrated.

OCR works fully offline after install. It only supports the **primary monitor**.

## Guide editor

- **EDIT** — change the active guide in memory for this session.
- **Apply to session** — save edits locally (localStorage progress unchanged).
- **Export JSON** — save `guides.json` format to share or merge.
- **Import JSON** — load guides from a file.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Overlay hidden behind game | Use borderless windowed, not exclusive fullscreen |
| OCR shows "Unknown Map" | Recalibrate CAL; check map name region is visible |
| OCR never starts | Ensure `resources/tesseract/eng.traineddata` exists (re-run `npm install`) |
| Antivirus blocks installer | Allow Maplebot or build from source |

## Build from source

```bash
npm install
npm start          # development
npm run dist       # Windows installer + portable in dist/
```

## Guides included (v1.0)

- Job paths: Hero, FP Arch Mage, Bowmaster, Night Lord, Shadower, Buccaneer
- Boss prequests: Zakum, Horntail

## License

MIT
