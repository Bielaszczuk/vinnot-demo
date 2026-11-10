package com.vinnot.admin.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.util.EnumNames;

/** A store the mobile app is published on; each one has its own minimum supported version (#428). */
public enum AppPlatform {
    IOS,
    ANDROID;

    /** The platform named exactly {@code name}; anything else is refused with {@code NOT_AN_APP_PLATFORM}. */
    public static AppPlatform named(String name) {
        return EnumNames.find(AppPlatform.class, name)
                .orElseThrow(() -> new DomainException("NOT_AN_APP_PLATFORM", "Choose IOS or ANDROID"));
    }
}
