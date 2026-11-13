import buildlogic.versioning.getAppDataDirName
import buildlogic.versioning.getAppName
import buildlogic.versioning.getAppVersionString
import buildlogic.versioning.getApplicationPackageName
import buildlogic.versioning.getPrettifiedAppName


plugins {
    id(MyPlugins.kotlinMultiplatform)
    id(MyPlugins.composeBase)
    id(Plugins.Kotlin.serialization)
    id(Plugins.Android.multiplatformLibrary)
    id(Plugins.buildConfig)
    id(Plugins.ksp)
}
kotlin {
    jvm("desktop")
    android {
        compileSdk = libs.versions.androidCompileSdk.get().toInt()
        namespace = "com.abdownloadmanager.shared"
        minSdk = 26
    }
    sourceSets {
        commonMain.dependencies {
            api(libs.compose.runtime)
            api(libs.compose.foundation)
            api(libs.compose.ui)

            api(project(":downloader:core"))
            api(project(":downloader:monitor"))

            api(project(":shared:config"))
            api(project(":shared:utils"))
            api(project(":shared:compose-utils"))
            api(project(":shared:resources"))
            api(project(":shared:auto-start"))
            api(project(":shared:updater"))

            api(libs.kotlin.coroutines.core)
            api(libs.kotlin.serialization.json)

            api(libs.decompose)
            api(libs.essenty.lifecycleCoroutines)
            api(libs.koin.core)

            api(libs.androidx.datastore)

            implementation(libs.okhttp.dnsoverhttps)

            implementation(libs.kotlinFileWatcher)

            //because we don't have material design, but we use ripple effect
            implementation(libs.compose.material.rippleEffect)

            api(libs.schemakt)

            // multiplatform scrollbars
            api(libs.fastscroller.core)
            api(libs.markdownRenderer.core)
            api(libs.compose.reorderable)
            api(libs.qrose.qr)
        }
        androidMain {
            dependencies {
                api(libs.androidx.core.ktx)
                api(libs.androidx.activity.compose)
            }
        }
        val androidMain = getByName("androidMain")
        val desktopMain = getByName("desktopMain")
        desktopMain.dependencies {
            implementation(libs.nucleus.darkmodeDetector)
        }
    }
}


dependencies {
    add("kspAndroid", libs.arrow.opticKsp)
    add("kspDesktop", libs.arrow.opticKsp)
}

// generate a file with these constants
buildConfig {
    packageName = "com.abdownloadmanager.shared"
    buildConfigField(
        "PACKAGE_NAME",
        provider {
            getApplicationPackageName()
        }
    )
    buildConfigField(
        "APP_DISPLAY_NAME",
        provider { getPrettifiedAppName() }
    )
    buildConfigField(
        "DATA_DIR_NAME",
        provider { getAppDataDirName() }
    )
    buildConfigField(
        "APP_VERSION",
        provider { getAppVersionString() }
    )
    buildConfigField(
        "APP_NAME",
        provider { getAppName() }
    )
    buildConfigField(
        "PROJECT_WEBSITE",
        provider {
            "https://github.com/alialmuttawa2-cpu/solosgame-idm"
        }
    )
    buildConfigField(
        "PROJECT_SOURCE_CODE",
        provider {
            "https://github.com/alialmuttawa2-cpu/solosgame-idm"
        }
    )
    buildConfigField(
        "DONATE_LINK",
        provider {
            "https://abdownloadmanager.com/donate"
        }
    )
    buildConfigField(
        "PROJECT_GITHUB_OWNER",
        provider {
            // Update checks are disabled. Do not point this fork at upstream releases.
            ""
        }
    )
    buildConfigField(
        "PROJECT_GITHUB_REPO",
        provider {
            ""
        }
    )
    buildConfigField(
        "PROJECT_TRANSLATIONS",
        provider {
            "https://crowdin.com/project/ab-download-manager"
        }
    )
    buildConfigField(
        "INTEGRATION_CHROME_LINK",
        provider {
            "https://chromewebstore.google.com/detail/ab-download-manager-brows/bbobopahenonfdgjgaleledndnnfhooj"
        }
    )
    buildConfigField(
        "INTEGRATION_FIREFOX_LINK",
        provider {
            "https://addons.mozilla.org/en-US/firefox/addon/ab-download-manager/"
        }
    )
    buildConfigField(
        "INTEGRATION_FIREFOX_EXTENSION_ID",
        provider {
            "firefox-integration@abdownloadmanager.com"
        }
    )
    buildConfigField(
        "INTEGRATION_CHROME_EXTENSION_ID",
        provider {
            "chrome-extension://bbobopahenonfdgjgaleledndnnfhooj/"
        }
    )
    buildConfigField(
        "TELEGRAM_GROUP",
        provider {
            "https://t.me/abdownloadmanager_discussion"
        }
    )
    buildConfigField(
        "TELEGRAM_CHANNEL",
        provider {
            "https://t.me/abdownloadmanager"
        }
    )
}
