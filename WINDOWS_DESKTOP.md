# KINGS FOOD Windows Desktop

The Windows desktop distribution is packaged with Electron and NSIS.

- Version: `1.0.1`
- Target: Windows x64 (64-bit)
- Installer: `KINGS-FOOD-Windows-Setup-1.0.1.exe`
- Branding: a Windows multi-size `.ico` is generated from `assets/icon-only.png` and used for the executable and installer
- Startup: displays a KINGS FOOD loading screen, then opens the configured live app URL; network/deployment failures display a retryable error page instead of a blank window
- Build: GitHub Actions workflow `.github/workflows/windows-exe.yml` verifies the Electron main-process syntax, builds the installer, and uploads it as an artifact. Pushes to `main` also publish it to the `windows-v1.0.1` GitHub release.

**Important:** the desktop shell loads `https://kings-marketplace.lovable.app`, so it requires internet access and that deployment to remain available. It is not an offline POS build. The installer is not Authenticode-signed, so Windows SmartScreen may display an unknown-publisher warning.
