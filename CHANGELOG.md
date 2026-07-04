# Changelog

All notable changes to Maplebot are documented in this file.

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
