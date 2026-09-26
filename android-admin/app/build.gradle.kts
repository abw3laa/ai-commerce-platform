plugins {
    id("com.android.application")
}

android {
    namespace = "com.abw3laa.aicommerce.admin"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.abw3laa.aicommerce.admin"
        minSdk = 26
        targetSdk = 37
        versionCode = 2
        versionName = "1.1.0"

        val adminUrl = providers.gradleProperty("ADMIN_BASE_URL")
            .orElse("https://CHANGE-ME.example/admin/app")
        buildConfigField(
            "String",
            "ADMIN_BASE_URL",
            "\"${adminUrl.get().replace("\\", "\\\\").replace("\"", "\\\"")}\""
        )
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
        }
    }

    buildFeatures {
        buildConfig = true
    }
}
