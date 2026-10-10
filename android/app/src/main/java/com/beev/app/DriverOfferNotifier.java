package com.beev.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.json.JSONObject;

final class DriverOfferNotifier {
    static final String CHANNEL_ID = "beev_driver_call";
    static final String DUTY_CHANNEL_ID = "beev_duty";
    static final int NOTIFICATION_ID = 7101;
    static final String EXTRA_PATH = "beev_offer_path";
    static final String EXTRA_TRIES = "beev_offer_tries";

    private static final long RING_MS = 55_000L;
    private static MediaPlayer ringtone;
    private static int ringtoneGeneration = 0;
    private static final Handler MAIN = new Handler(Looper.getMainLooper());

    private DriverOfferNotifier() {}

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "BEEV delivery",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("New delivery jobs");
            channel.enableVibration(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setSound(soundUri(context), ringtoneAttributes());
            manager.createNotificationChannel(channel);
        }
        if (manager.getNotificationChannel(DUTY_CHANNEL_ID) == null) {
            NotificationChannel duty = new NotificationChannel(
                DUTY_CHANNEL_ID,
                "BEEV on duty",
                NotificationManager.IMPORTANCE_LOW
            );
            duty.setDescription("Keeps delivery alerts available while you are on duty");
            duty.setSound(null, null);
            manager.createNotificationChannel(duty);
        }
    }

    static void handle(Context context, Map<String, String> data) {
        if (data == null || !"driver-offer".equals(data.get("kind"))) {
            return;
        }
        String path = data.get("path");
        String orderId = data.get("orderId");
        if (path == null || orderId == null || !path.matches("/(ar|en)/driver")) {
            return;
        }
        String title = data.get("title");
        String body = data.get("body");
        String origin = data.get("origin");
        String cookie = null;
        if (origin != null && origin.startsWith("https://")) {
            cookie = CookieManager.getInstance().getCookie(origin);
        }
        final String requestCookie = cookie;
        MAIN.post(() -> {
            ensureChannel(context);
            if (!DriverRuntime.foreground) {
                show(
                    context,
                    title == null || title.isEmpty() ? "BEEV" : title,
                    body == null ? "" : body,
                    path,
                    orderId
                );
            }
        });
        acknowledge(origin, orderId, requestCookie);
    }

    static void dismiss(Context context) {
        MAIN.post(() -> {
            stopRingtone();
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(NOTIFICATION_ID);
            }
        });
    }

    static void openFromIntent(BridgeActivity activity, Intent intent) {
        if (intent == null) {
            return;
        }
        String path = intent.getStringExtra(EXTRA_PATH);
        if (path == null || !path.matches("/(ar|en)/driver")) {
            return;
        }
        Bridge bridge = activity.getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            int tries = intent.getIntExtra(EXTRA_TRIES, 0);
            if (tries > 8) {
                return;
            }
            intent.putExtra(EXTRA_TRIES, tries + 1);
            MAIN.postDelayed(() -> openFromIntent(activity, intent), 300);
            return;
        }
        intent.removeExtra(EXTRA_PATH);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            activity.setShowWhenLocked(true);
            activity.setTurnScreenOn(true);
        }
        bridge.eval("window.location.assign(" + JSONObject.quote(path) + ");", null);
    }

    private static void show(Context context, String title, String body, String path, String orderId) {
        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launch.putExtra(EXTRA_PATH, path);
        launch.putExtra("beev_order_id", orderId);
        PendingIntent pending = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOngoing(true)
            .setTimeoutAfter(RING_MS)
            .setVibrate(new long[] { 0, 500, 200, 500, 200, 800 })
            .setContentIntent(pending)
            .setFullScreenIntent(pending, true);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, builder.build());
        }
        startRingtone(context);
    }

    private static void startRingtone(Context context) {
        stopRingtone();
        int generation = ++ringtoneGeneration;
        MediaPlayer player;
        try {
            player = MediaPlayer.create(context.getApplicationContext(), R.raw.beev_driver);
        } catch (RuntimeException ignored) {
            return;
        }
        if (player == null) {
            return;
        }
        player.setLooping(true);
        player.setAudioAttributes(ringtoneAttributes());
        try {
            player.start();
        } catch (IllegalStateException ignored) {
            player.release();
            return;
        }
        ringtone = player;
        MAIN.postDelayed(() -> {
            if (generation != ringtoneGeneration) {
                return;
            }
            stopRingtone();
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(NOTIFICATION_ID);
            }
        }, RING_MS);
    }

    private static void stopRingtone() {
        MediaPlayer player = ringtone;
        ringtone = null;
        if (player == null) {
            return;
        }
        try {
            player.stop();
        } catch (IllegalStateException ignored) {
            // Already stopped.
        }
        player.release();
    }

    private static void acknowledge(String origin, String orderId, String cookie) {
        if (origin == null || cookie == null || cookie.isEmpty() || !origin.startsWith("https://")) {
            return;
        }
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(origin + "/api/driver/offer/presented").openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Cookie", cookie);
                byte[] payload = ("{\"orderId\":" + JSONObject.quote(orderId) + "}").getBytes(StandardCharsets.UTF_8);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }
                connection.getResponseCode();
            } catch (Exception ignored) {
                // The open app records the ring if this request cannot leave the phone.
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }

    private static Uri soundUri(Context context) {
        return Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.beev_driver);
    }

    private static AudioAttributes ringtoneAttributes() {
        return new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
    }
}
