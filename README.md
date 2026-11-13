# SolosGame IDM

SolosGame IDM is a Windows desktop download manager. It is a modified version of [AB Download Manager](https://github.com/amir1376/ab-download-manager) by [amir1376](https://github.com/amir1376). The original project is Apache-2.0; this repository keeps that [LICENSE](LICENSE) and the original copyright. See [NOTICE](NOTICE) for what was changed.

This copy does not check for or install updates from the upstream AB Download Manager releases, Winget, or Homebrew.

## Features

- Faster multi-connection downloads
- Queues and schedulers
- Browser integration hooks
- Themes and a desktop UI
- Same download features as the AB Download Manager desktop app

## Install on Windows

GitHub Actions builds an unsigned NSIS installer (`.exe`) on `windows-latest`. Download the `SolosGame-IDM-windows-installer` artifact from a successful workflow run.

The installer uses its own Windows package name (`SolosGameIDM`), upgrade GUID, and install folder (`%LOCALAPPDATA%\SolosGameIDM`), and stores config in `%USERPROFILE%\.solosgame-idm`, so it can sit beside an official AB Download Manager install. The installer is not code-signed. Windows SmartScreen may warn before you run it.

## Build from source

The desktop app is Kotlin and Compose Multiplatform. It needs **JDK 25** (JetBrains Runtime, the same toolchain the Windows workflow installs).

```bash
# Windows installer (NSIS must be installed; makensis.exe on PATH or in
# "C:\Program Files (x86)\NSIS\")
./gradlew createReleaseFolderForCi
```

The installer `.exe` is written under `build/ci-release/binaries/`.

To skip the Android module while packaging (the Windows workflow does this):

```bash
SKIP_ANDROID_BUILD=true ./gradlew createReleaseFolderForCi
```

Desktop and shared/downloader tests:

```bash
./gradlew :desktop:app:test :desktop:app-utils:test :desktop:shared:test :downloader:core:desktopTest :downloader:monitor:desktopTest :shared:app:desktopTest :shared:utils:desktopTest :shared:updater:desktopTest :shared:config:test
```

## Credit

SolosGame IDM is a modified version of AB Download Manager by amir1376.

- Upstream: https://github.com/amir1376/ab-download-manager
- License: Apache License 2.0 (`LICENSE`)
- Changes: see `NOTICE`
