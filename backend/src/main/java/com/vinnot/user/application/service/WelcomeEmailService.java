package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.domain.model.User;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Queues the welcome email. Callers invoke it only when an account's email becomes verified for the first
 * time, which happens once per user; the dedupe key also absorbs retries while the message is queued.
 */
@Service
public class WelcomeEmailService {
    private final NotificationPort notifications;

    public WelcomeEmailService(NotificationPort notifications) {
        this.notifications = notifications;
    }

    public void welcome(User user) {
        // Addressed to the user, so delivery uses their current address, name and language.
        notifications.enqueue(NotificationRequest.of(NotificationType.ACCOUNT_WELCOME,
                NotificationRecipient.user(user.getId()), AccountActionTokenService.localeOf(user), Map.of(),
                "welcome:" + user.getId()));
    }
}
