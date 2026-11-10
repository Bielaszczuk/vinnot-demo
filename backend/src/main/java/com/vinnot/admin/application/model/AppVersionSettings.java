package com.vinnot.admin.application.model;

import com.vinnot.admin.application.port.out.AppMinimumVersionPort;

import java.util.List;

/** What the admin app versions page shows (#428): every platform, in IOS then ANDROID order, and the latest changes. */
public record AppVersionSettings(List<AppMinimumVersionPort.Setting> platforms, List<AppMinimumVersionPort.Change> recentChanges) {
    public AppVersionSettings {
        platforms = List.copyOf(platforms);
        recentChanges = List.copyOf(recentChanges);
    }
}
