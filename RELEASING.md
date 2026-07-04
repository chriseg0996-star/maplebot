# Releasing Maplebot

One-time setup, then every release is a git tag.

## One-time setup

1. **Create a GitHub repo** (public recommended for free Actions + updater).
   - Example: `https://github.com/chriseg0996-star/maplebot`

2. **Point this project at it** — already set to `chriseg0996-star/maplebot` in `package.json`.

3. **Push the code** (from the `maplebot/` folder):

   ```powershell
   git remote add origin https://github.com/chriseg0996-star/maplebot.git
   git add -A
   git commit -m "feat: ship v2.1.0 with GitHub release pipeline"
   git push -u origin master
   ```

4. **Enable Actions** on the repo (Settings → Actions → Allow).

## Cut a release

1. Bump `version` in `package.json` and add a section to `CHANGELOG.md`.

2. Commit, tag, and push:

   ```powershell
   git add package.json CHANGELOG.md
   git commit -m "chore: release v2.1.0"
   git tag v2.1.0
   git push origin master
   git push origin v2.1.0
   ```

3. **GitHub Actions** runs [`.github/workflows/release.yml`](.github/workflows/release.yml):
   - Validates guide content
   - Builds NSIS installer + portable exe
   - Publishes a GitHub Release with `latest.yml` for auto-update

4. Verify on **Releases** — you should see:
   - `Maplebot Setup X.Y.Z.exe`
   - `Maplebot X.Y.Z.exe` (portable)
   - `latest.yml`

## Local build (no upload)

```powershell
npm run dist
```

Output: `dist/Maplebot Setup 2.1.0.exe` and portable exe.

## Code signing (optional)

Unsigned builds trigger SmartScreen. To sign later:

1. Obtain a Windows code-signing certificate.
2. Set env vars before `dist:publish`:
   - `CSC_LINK` — path to `.pfx`
   - `CSC_KEY_PASSWORD`
3. Remove `"signAndEditExecutable": false` from `package.json` → `build.win`.

## Troubleshooting CI

| Issue | Fix |
|-------|-----|
| Tag pushed but no release | Check Actions tab for failed job |
| `GH_TOKEN` / permission error | Workflow needs `contents: write` (already set) |
| Version mismatch | Tag must match `package.json` version (`v2.1.0` ↔ `2.1.0`) |
| Updater never finds release | App must be built by CI publish (embeds correct repo URL) |

## electron-updater notes

- Only **packaged** installs check for updates (not `npm start`).
- Users need the installer from **your** GitHub Releases — the update feed is tied to the repo that built the exe.
