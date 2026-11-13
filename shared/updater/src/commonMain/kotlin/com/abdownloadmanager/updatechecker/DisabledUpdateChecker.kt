package com.abdownloadmanager.updatechecker

import io.github.z4kn4fein.semver.Version

/**
 * SolosGame IDM does not check for or download updates.
 * This fork must not offer AB Download Manager releases.
 */
class DisabledUpdateChecker(
    currentVersion: Version,
) : UpdateChecker(currentVersion) {
    override suspend fun getMyPlatformLatestVersion(): UpdateInfo {
        error("Update checking is disabled")
    }
}
