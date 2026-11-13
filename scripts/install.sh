#!/usr/bin/env bash
# SolosGame IDM does not download AB Download Manager releases.
# Build the Windows installer with GitHub Actions or ./gradlew createReleaseFolderForCi.
echo "SolosGame IDM does not install AB Download Manager from upstream releases." >&2
echo "On Windows, use the SolosGame-IDM-windows-installer artifact, or build with:" >&2
echo "  SKIP_ANDROID_BUILD=true ./gradlew createReleaseFolderForCi" >&2
exit 1
