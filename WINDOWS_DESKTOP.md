# KINGS FOOD Windows Desktop

The Windows desktop distribution is packaged with Electron and NSIS.

- Target: Windows x64
- Installer: `KINGS-FOOD-Windows-Setup-1.0.0.exe`
- Branding: uses `assets/icon-only.png` to generate a Windows multi-size `.ico` for the executable and installer
- Startup: shows a KINGS FOOD loading screen, then opens the configured live app URL; network/deployment failures display a retryable error page rather than a blank window
- Build: GitHub Actions workflow `.github/workflows/windows-exe.yml` creates and uploads the installer as `KINGS-FOOD-Windows-Setup`

**Important:** the current desktop wrapper loads `https://kings-marketplace.lovable.app`, so it requires internet access and that deployment to remain available. The Windows wrapper is not an offline POS build.
