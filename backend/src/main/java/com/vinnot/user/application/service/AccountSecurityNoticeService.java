package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * Queues the security notices of an account. They are security mail, so preferences never turn them off.
 * Each dedupe key names the change it reports, so a retry never sends a second notice for it.
 */
@Service
public class AccountSecurityNoticeService {
    private final NotificationPort notifications;

    public AccountSecurityNoticeService(NotificationPort notifications) {
        this.notifications = notifications;
    }

    /** Call after the change: the session version identifies this password change. */
    public void passwordChanged(User user) {
        toUser(NotificationType.ACCOUNT_PASSWORD_CHANGED, user, Map.of(),
                "password-changed:" + user.getId() + ":" + user.getSessionVersion());
    }

    /** Sign-in was blocked after too many wrong passwords (#482); one notice per lock. */
    public void loginLocked(User user, Instant lockedUntil) {
        toUser(NotificationType.ACCOUNT_LOGIN_LOCKED, user, Map.of(),
                "login-locked:" + user.getId() + ":" + lockedUntil.toEpochMilli());
    }

    public void socialLinked(User user, SocialIdentity identity) {
        toUser(NotificationType.ACCOUNT_SOCIAL_LINKED, user, Map.of(NotificationType.PROVIDER, identity.provider().name()),
                "social-linked:" + identity.id());
    }

    /** Call after deactivating; the address is captured now, as the account no longer receives mail. */
    public void deactivated(User user) {
        toAddress(NotificationType.ACCOUNT_DEACTIVATED, user,
                "account-deactivated:" + user.getId() + ":" + user.getSessionVersion());
    }

    /** Call before deleting: the address and name are captured while they still exist. */
    public void deleted(User user) {
        toAddress(NotificationType.ACCOUNT_DELETED, user, "account-deleted:" + user.getId());
    }

    private void toUser(NotificationType type, User user, Map<String, String> data, String dedupeKey) {
        notifications.enqueue(NotificationRequest.of(type, NotificationRecipient.user(user.getId()),
                AccountActionTokenService.localeOf(user), data, dedupeKey));
    }

    private void toAddress(NotificationType type, User user, String dedupeKey) {
        notifications.enqueue(NotificationRequest.of(type,
                NotificationRecipient.address(user.getEmail().getValue(), user.getFullName()),
                AccountActionTokenService.localeOf(user), Map.of(), dedupeKey));
    }
}
