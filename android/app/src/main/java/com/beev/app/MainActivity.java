package com.beev.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DriverDutyPlugin.class);
        super.onCreate(savedInstanceState);
        DriverOfferNotifier.ensureChannel(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        DriverRuntime.foreground = true;
        DriverOfferNotifier.openFromIntent(this, getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        DriverOfferNotifier.openFromIntent(this, intent);
    }

    @Override
    public void onPause() {
        DriverRuntime.foreground = false;
        super.onPause();
    }
}
