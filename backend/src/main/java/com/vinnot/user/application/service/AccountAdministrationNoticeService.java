package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.SuspensionReason;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Tells account holders what an administrator changed on their account (#309). Account mail, so preferences never
 * turn it off. A suspended or deleted account is written to the address captured now, as it may no longer receive mail.
 */
@Service
public class AccountAdministrationNoticeService {
    private final NotificationPort notifications;

    public AccountAdministrationNoticeService(NotificationPort notifications) {
        this.notifications = notifications;
    }

    /** Call after the change; the session version identifies it. */
    public void roleChanged(User user, Role role) {
        notifications.enqueue(NotificationRequest.of(NotificationType.ACCOUNT_ROLE_CHANGED, NotificationRecipient.user(user.getId()),
                AccountActionTokenService.localeOf(user), Map.of("role", role.name()),
                "role-changed:" + user.getId() + ":" + user.getSessionVersion()));
    }

    /** @param note the administrator's detail, shared only with {@link SuspensionReason#OTHER}; otherwise null */
    public void suspended(User user, SuspensionReason reason, String note) {
        Map<String, String> data = new HashMap<>(Map.of("reasonCode", reason.name()));
        if (reason == SuspensionReason.OTHER && Objects.nonNull(note) && !note.isBlank()) {
            data.put("note", note.trim());
        }
        toAddress(NotificationType.ACCOUNT_SUSPENDED, user, data,
                "account-suspended:" + user.getId() + ":" + user.getSessionVersion());
    }

    public void reinstated(User user, Instant at) {
        notifications.enqueue(NotificationRequest.of(NotificationType.ACCOUNT_REINSTATED, NotificationRecipient.user(user.getId()),
                AccountActionTokenService.localeOf(user), Map.of(),
                "account-reinstated:" + user.getId() + ":" + at.toEpochMilli()));
    }

    /** Call before deleting: the address and name are captured while they still exist. */
    public void deletedByAdministrator(User user) {
        toAddress(NotificationType.ACCOUNT_DELETED_BY_ADMIN, user, Map.of(), "account-deleted-by-admin:" + user.getId());
    }

    private void toAddress(NotificationType type, User user, Map<String, String> data, String dedupeKey) {
        notifications.enqueue(NotificationRequest.of(type,
                NotificationRecipient.address(user.getEmail().getValue(), user.getFullName()),
                AccountActionTokenService.localeOf(user), data, dedupeKey));
    }
}
