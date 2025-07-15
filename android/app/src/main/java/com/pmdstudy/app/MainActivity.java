package com.pmdstudy.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.App;


import java.util.ArrayList;

import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(GoogleAuth.class);

    // Override the back button behavior
    getBridge().getApp().setRouter( (path, options) -> {
      // Show the app content.
    });

    getBridge().getApp().getBridge().getWebView().setWebViewClient(new BridgeActivity.BridgeWebViewClient(getBridge()) {
        @Override
        public void onPageFinished(android.webkit.WebView view, String url) {
            super.onPageFinished(view, url);
            getBridge().getApp().getBridge().eval("window.history.pushState = function(state, title, url) { " +
                    "window.originalPushState(state, title, url); " +
                    "Capacitor.Plugins.App.fireChange(true); };", null);
        }
    });
  }

  @Override
  public void onBackPressed() {
    if (!getBridge().getWebView().canGoBack()) {
      // If there's no history, do nothing or minimize the app
      // moveTaskToBack(true);
      return; 
    }
    getBridge().getWebView().goBack();
  }
}
