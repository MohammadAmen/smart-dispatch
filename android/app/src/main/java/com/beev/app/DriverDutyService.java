package com.beev.app;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.webkit.CookieManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class DriverDutyService extends Service {
    static final int NOTIFICATION_ID = 7102;
    private static final String PREFS = "beev_duty";
    private static final long MIN_POST_MS = 12_000L;

    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;
    private long lastPostedAt = 0L;
    private String driverId = "";
    private String origin = "";

    private final LocationListener listener = this::onLocation;

    @Override
    public void onCreate() {
        super.onCreate();
        DriverOfferNotifier.ensureChannel(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (intent != null) {
            driverId = stringExtra(intent, "driverId", prefs.getString("driverId", ""));
            origin = stringExtra(intent, "origin", prefs.getString("origin", ""));
            prefs.edit()
                .putString("driverId", driverId)
                .putString("origin", origin)
                .putString("title", stringExtra(intent, "title", "BEEV"))
                .putString("body", stringExtra(intent, "body", ""))
                .apply();
        } else {
            driverId = prefs.getString("driverId", "");
            origin = prefs.getString("origin", "");
        }

        String title = prefs.getString("title", "BEEV");
        String body = prefs.getString("body", "");
        startInForeground(title == null ? "BEEV" : title, body == null ? "" : body);
        DriverRuntime.onDuty = true;
        acquireWakeLock();
        watchLocation();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        DriverRuntime.onDuty = false;
        if (locationManager != null) {
            locationManager.removeUpdates(listener);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startInForeground(String title, String body) {
        Notification notification = new NotificationCompat.Builder(this, DriverOfferNotifier.DUTY_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int type = hasLocationPermission()
                ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                : ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
            startForeground(NOTIFICATION_ID, notification, type);
            return;
        }
        startForeground(NOTIFICATION_ID, notification);
    }

    @SuppressLint("MissingPermission")
    private void watchLocation() {
        if (!hasLocationPermission()) {
            return;
        }
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (locationManager == null) {
            return;
        }
        if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                MIN_POST_MS,
                20f,
                listener,
                Looper.getMainLooper()
            );
        }
        if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            locationManager.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER,
                MIN_POST_MS,
                20f,
                listener,
                Looper.getMainLooper()
            );
        }
    }

    private void onLocation(Location location) {
        long now = System.currentTimeMillis();
        if (now - lastPostedAt < MIN_POST_MS) {
            return;
        }
        lastPostedAt = now;
        postLocation(location.getLatitude(), location.getLongitude());
    }

    private void postLocation(double latitude, double longitude) {
        if (driverId.isEmpty() || !origin.startsWith("https://")) {
            return;
        }
        String cookie = CookieManager.getInstance().getCookie(origin);
        if (cookie == null || cookie.isEmpty()) {
            return;
        }
        final String requestCookie = cookie;
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(origin + "/api/driver").openConnection();
                connection.setRequestMethod("PATCH");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Cookie", requestCookie);
                String payload = String.format(
                    Locale.US,
                    "{\"driverId\":%s,\"latitude\":%f,\"longitude\":%f}",
                    org.json.JSONObject.quote(driverId),
                    latitude,
                    longitude
                );
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload.getBytes(StandardCharsets.UTF_8));
                }
                connection.getResponseCode();
            } catch (Exception ignored) {
                // The open map keeps sending location when this post fails.
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            return;
        }
        PowerManager power = (PowerManager) getSystemService(POWER_SERVICE);
        if (power == null) {
            return;
        }
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "beev:duty");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private static String stringExtra(Intent intent, String key, String fallback) {
        String value = intent.getStringExtra(key);
        return value == null || value.isEmpty() ? fallback : value;
    }
}
