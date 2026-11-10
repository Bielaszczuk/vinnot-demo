package com.vinnot.admin.application.model;

import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;

import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

/** The public update policy (#428): the minimum version each platform still supports; an absent one blocks no build. */
public record MinimumAppVersions(Map<AppPlatform, AppVersion> minimums) {
    public MinimumAppVersions {
        Map<AppPlatform, AppVersion> copy = new EnumMap<>(AppPlatform.class);
        copy.putAll(minimums);
        minimums = Map.copyOf(copy);
    }

    public Optional<AppVersion> of(AppPlatform platform) {
        return Optional.ofNullable(minimums.get(platform));
    }
}
