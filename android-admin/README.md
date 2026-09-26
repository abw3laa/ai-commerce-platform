# AI Commerce Admin for Android

Thin Android admin client. Authentication and RBAC remain server-controlled.

Build with:
gradle :app:assembleDebug --no-daemon -PADMIN_BASE_URL=https://your-host/admin

The client requires HTTPS, disables cleartext traffic, restricts WebView navigation to the configured admin origin, and does not embed credentials or API keys.
