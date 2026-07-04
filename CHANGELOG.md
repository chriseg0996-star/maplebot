# Changelog

All notable changes to Maplebot are documented in this file.

## [2.2.0] - 2026-07-04

### Added
- OCR text repair pipeline (common bitmap-font misreads)
- `npm run audit-ocr` — auto-generates fuzzy map aliases in the DB
- Map match threshold slider in settings (⚙)
- Wrong-map hints show top matches; click to open DB panel
- Profile rename, delete, export, and import

### Changed
- OCR resolves raw text to canonical map names when matched
- Expanded map alias coverage for better in-game OCR accuracy

## [2.1.0] - 2026-07-04

### Added
- GitHub Actions release pipeline (`npm run dist:publish` on version tags)
- In-app update flow: download + restart from status bar
- [RELEASING.md](RELEASING.md) with ship checklist

### Changed
- Slimmer overlay chrome (merged toolbar, compact profile in titlebar)
- Removed in-overlay guide editor from UI
- `npm run dist` builds locally without publishing; CI publishes to GitHub Releases
- README updated for v2.1 install and controls

## [2.0.0] - 2026-07-04

### Added
- Character profiles with separate progress per character
- Settings panel: OCR confidence, fast tick, monitor picker, hide skipped steps
- F9 cycle guide, F10 toggle library; minimize to system tray
- 10 new guides (Bishop, IL Mage, Marksman, Corsair, Paladin, Kerning/Ludi PQ, Pink Bean, Pap, NLC)
- Grind spots link to DB; OCR "closest map" hint on wrong map
- Guide editor ref picker (datalist), save to userData
- DB panel: guides mentioning map, quest item checklist
- `npm run validate`, GitHub Actions release workflow
- electron-updater (checks on packaged start)
- Multi-monitor OCR calibration and capture

## [1.0.0] - 2026-07-03

### Added

- Windows NSIS installer and portable build via `npm run dist`
- Offline OCR bundle (`eng.traineddata`) — no network required after install
- Eight guides: Night Lord, Hero, FP Arch Mage, Bowmaster, Shadower, Buccaneer, Zakum prequest, Horntail prequest
- Companion Database with 45 maps, 15 NPCs, 25 quests, and related entities
- DB detail slide-over panel (click `[[refs]]` in step text)
- In-app guide editor with export/import JSON
- DB-driven OCR map matching with fuzzy fallback
- OCR calibration indicator on CAL button

### Changed

- Refactored renderer into `db.js`, `db-panel.js`, `ocr-match.js`, `editor.js`
- Version bumped to 1.0.0

### Notes

- Display-only: never sends input to the game
- OCR uses primary display only
- Windows SmartScreen may warn on unsigned builds
