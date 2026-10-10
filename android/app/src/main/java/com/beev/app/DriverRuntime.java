package com.beev.app;

final class DriverRuntime {
    static volatile boolean foreground = false;
    static volatile boolean onDuty = false;
    static boolean askedBattery = false;
    static boolean askedFullScreen = false;

    private DriverRuntime() {}
}
