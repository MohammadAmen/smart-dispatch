package com.beev.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DriverDuty")
public class DriverDutyPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        String driverId = call.getString("driverId");
        String origin = call.getString("origin");
        if (driverId == null || driverId.isEmpty() || origin == null || origin.isEmpty()) {
            call.reject("Missing duty payload");
            return;
        }
        Intent intent = new Intent(getContext(), DriverDutyService.class);
        intent.putExtra("driverId", driverId);
        intent.putExtra("origin", origin);
        intent.putExtra("title", call.getString("title", "BEEV"));
        intent.putExtra("body", call.getString("body", ""));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), DriverDutyService.class));
        call.resolve();
    }

    @PluginMethod
    public void dismissOffer(PluginCall call) {
        DriverOfferNotifier.dismiss(getContext());
        call.resolve();
    }

    @PluginMethod
    public void prepareAlerts(PluginCall call) {
        Context context = getContext();
        DriverOfferNotifier.ensureChannel(context);
        if (needsFullScreenPrompt(context) && !DriverRuntime.askedFullScreen) {
            DriverRuntime.askedFullScreen = true;
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
            return;
        }
        if (needsBatteryPrompt(context) && !DriverRuntime.askedBattery) {
            DriverRuntime.askedBattery = true;
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
        call.resolve();
    }

    private static boolean needsFullScreenPrompt(Context context) {
        if (Build.VERSION.SDK_INT < 34) {
            return false;
        }
        android.app.NotificationManager manager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        return manager != null && !manager.canUseFullScreenIntent();
    }

    private static boolean needsBatteryPrompt(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return false;
        }
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        return power != null && !power.isIgnoringBatteryOptimizations(context.getPackageName());
    }
}
