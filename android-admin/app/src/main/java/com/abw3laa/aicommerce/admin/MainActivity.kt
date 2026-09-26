package com.abw3laa.aicommerce.admin

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import java.net.URI

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val baseUri by lazy { URI(BuildConfig.ADMIN_BASE_URL) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        require(baseUri.scheme == "https") { "ADMIN_BASE_URL must use HTTPS" }

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = false
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.setSupportMultipleWindows(false)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return !isAllowed(request.url.toString())
            }
        }

        CookieManager.getInstance().setAcceptCookie(true)
        setContentView(webView)

        if (savedInstanceState == null) {
            webView.loadUrl(BuildConfig.ADMIN_BASE_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    private fun isAllowed(url: String): Boolean {
        return try {
            val candidate = URI(url)
            candidate.scheme == "https" &&
                candidate.host == baseUri.host &&
                effectivePort(candidate) == effectivePort(baseUri)
        } catch (_: Exception) {
            false
        }
    }

    private fun effectivePort(uri: URI): Int = if (uri.port == -1) 443 else uri.port

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.webChromeClient = null
        webView.webViewClient = null
        webView.destroy()
        super.onDestroy()
    }
}
