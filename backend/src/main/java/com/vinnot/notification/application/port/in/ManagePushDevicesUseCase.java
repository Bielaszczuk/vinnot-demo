package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.PushPlatform;

import java.util.UUID;

/** Registers the devices an account receives pushes on, and forgets them on logout, password reset or deactivation. */
public interface ManagePushDevicesUseCase {
    /**
     * Registers or refreshes a device (the app calls it on every cold start, which keeps it from going stale). A token
     * last used by another account moves to this one. {@code channels} says the app created the per-category Android
     * channels.
     */
    void register(UUID userId, String token, PushPlatform platform, NotificationLocale locale, boolean channels);

    /** Forgets one device of the account; unknown tokens or tokens of other accounts are ignored. */
    void unregister(UUID userId, String token);

    /** Forgets this exact token whichever account it belongs to (a device signing out without a live session). */
    void forgetToken(String token);

    /** Forgets every device of the account. */
    void forgetUser(UUID userId);

    /**
     * Forgets devices the app has not registered for the retention period (uninstalled, or never opened again).
     *
     * @return how many were forgotten
     */
    int purgeStale();
}
