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

## Chrome extension

`browser-extension/` is a Manifest V3 extension named **SolosGame IDM Integration**. Right-click a link, image, video, audio item, or selected http(s) URL and choose **Download with SolosGame IDM**. It `POST`s that URL to the running app at `http://127.0.0.1:15151/add` (the browser integration server, on by default). The page URL is sent as `downloadPage` and a `Referer` header, and site cookies are sent as a `Cookie` header when Chrome allows it. If the app is not running, the extension shows a badge and a notification.

When Chrome starts an http(s) download, the extension opens a small popup: **Download with SolosGame IDM** or **Download normally (Chrome)**, with **Remember my choice**. The options page can set that to Always ask, Always IDM, or Always Chrome. Choosing IDM cancels the Chrome download only after the app accepts the URL. If the app is not reachable, the Chrome download continues and a notice is shown. No answer within 30 seconds keeps the download in Chrome. `blob:`, `data:`, and `file:` URLs, and downloads this extension starts itself, are left to Chrome. The right-click menu still works.

Load it unpacked:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and choose the `browser-extension` folder (or the unzipped `SolosGame-IDM-chrome-extension` artifact).

The extension options page can change the port and, if you turn on API auth in the app, the `X-Api-Key` value.

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
