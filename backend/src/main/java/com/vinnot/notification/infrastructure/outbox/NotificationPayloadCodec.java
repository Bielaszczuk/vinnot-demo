package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** The JSON shape of a notification in the outbox. Secret data values are sealed, never stored in clear. */
@Component
public class NotificationPayloadCodec {
    private static final String TYPE = "type";
    private static final String CATEGORY = "category";
    private static final String LOCALE = "locale";
    private static final String DEDUPE_KEY = "dedupeKey";
    private static final String RECIPIENT = "recipient";
    private static final String DATA = "data";
    private static final String EMAIL = "email";
    private static final String DISPLAY_NAME = "displayName";
    private static final String USER_ID = "userId";
    private final NotificationPayloadSealer sealer;

    public NotificationPayloadCodec(NotificationPayloadSealer sealer) {
        this.sealer = sealer;
    }

    public Map<String, Object> encode(NotificationRequest request) {
        Map<String, Object> recipient = new LinkedHashMap<>();
        putIfPresent(recipient, EMAIL, request.recipient().email());
        putIfPresent(recipient, DISPLAY_NAME, request.recipient().displayName());
        putIfPresent(recipient, USER_ID, Objects.toString(request.recipient().userId(), null));
        Map<String, String> data = new LinkedHashMap<>();
        request.data().forEach((key, value) -> data.put(key, request.type().secretDataKeys().contains(key)
                ? sealer.seal(value, context(request.type(), request.dedupeKey(), key)) : value));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put(TYPE, request.type().name());
        payload.put(CATEGORY, request.category().name());
        payload.put(LOCALE, request.locale().name());
        payload.put(DEDUPE_KEY, request.dedupeKey());
        payload.put(RECIPIENT, recipient);
        payload.put(DATA, data);
        return payload;
    }

    public NotificationRequest decode(Map<String, Object> payload) {
        NotificationType type = NotificationType.valueOf(text(payload, TYPE));
        String dedupeKey = text(payload, DEDUPE_KEY);
        Map<String, String> data = new HashMap<>();
        map(payload, DATA).forEach((key, value) -> data.put(key, type.secretDataKeys().contains(key)
                ? sealer.open(String.valueOf(value), context(type, dedupeKey, key)) : String.valueOf(value)));
        return new NotificationRequest(type, recipient(map(payload, RECIPIENT)),
                NotificationLocale.valueOf(text(payload, LOCALE)), data, dedupeKey,
                NotificationCategory.valueOf(text(payload, CATEGORY)));
    }

    private NotificationRecipient recipient(Map<String, Object> recipient) {
        Object userId = recipient.get(USER_ID);
        if (Objects.nonNull(userId)) {
            return NotificationRecipient.user(UUID.fromString(userId.toString()));
        }
        return NotificationRecipient.address(text(recipient, EMAIL), (String) recipient.get(DISPLAY_NAME));
    }

    private static String context(NotificationType type, String dedupeKey, String key) {
        return type.name() + "|" + dedupeKey + "|" + key;
    }

    private static void putIfPresent(Map<String, Object> target, String key, String value) {
        if (Objects.nonNull(value)) {
            target.put(key, value);
        }
    }

    private static String text(Map<String, Object> source, String key) {
        return Objects.requireNonNull(source.get(key), "Notification payload is missing " + key).toString();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Map<String, Object> source, String key) {
        return (Map<String, Object>) Objects.requireNonNull(source.get(key), "Notification payload is missing " + key);
    }
}
