package com.vinnot.notification.domain.model;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotificationRequestTest {
    private final NotificationRecipient recipient = NotificationRecipient.address("ana@example.test", "Ana");

    @Test
    void derivesTheCategoryFromTheTypeAndCopiesData() {
        var data = new HashMap<>(Map.of("message", "Hello"));
        var request = NotificationRequest.of(NotificationType.SUPPORT_REQUEST, recipient, NotificationLocale.EN, data, "support:1");
        data.put("message", "Changed");
        assertThat(request.category()).isEqualTo(NotificationCategory.SUPPORT);
        assertThat(request.data()).containsEntry("message", "Hello");
        assertThat(request.toString()).doesNotContain("Hello", "ana@example.test");
    }

    @Test
    void rejectsMissingBoundedKeysAndMismatchedCategories() {
        assertThatThrownBy(() -> NotificationRequest.of(NotificationType.SUPPORT_REQUEST, recipient, NotificationLocale.EN, Map.of(), " "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> NotificationRequest.of(NotificationType.SUPPORT_REQUEST, recipient, NotificationLocale.EN, Map.of(), null))
                .isInstanceOf(IllegalArgumentException.class);
        String tooLong = "k".repeat(NotificationRequest.MAX_DEDUPE_KEY_LENGTH + 1);
        assertThatThrownBy(() -> NotificationRequest.of(NotificationType.SUPPORT_REQUEST, recipient, NotificationLocale.EN, Map.of(), tooLong))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new NotificationRequest(NotificationType.SUPPORT_REQUEST, recipient, NotificationLocale.EN, Map.of(),
                "key", NotificationCategory.ACCOUNT)).hasMessageContaining("category");
        assertThatThrownBy(() -> NotificationRequest.of(null, recipient, NotificationLocale.EN, Map.of(), "key"))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void recipientsAreEitherASafeAddressOrAUser() {
        UUID userId = UUID.randomUUID();
        assertThat(NotificationRecipient.user(userId).isAddress()).isFalse();
        assertThat(recipient.isAddress()).isTrue();
        assertThat(recipient.toString()).doesNotContain("ana@example.test");
        assertThatThrownBy(() -> NotificationRecipient.address("a@b.org\r\nBcc: x@y.org", null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> NotificationRecipient.address("a@b@c.org", null)).isInstanceOf(IllegalArgumentException.class);
        // Account emails accept dotless domains, so notifications must too.
        assertThat(NotificationRecipient.address("admin@localhost", null).email()).isEqualTo("admin@localhost");
        assertThatThrownBy(() -> new NotificationRecipient("a@b.org", null, userId)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new NotificationRecipient(null, null, null)).isInstanceOf(IllegalArgumentException.class);
        var resolved = NotificationRequest.of(NotificationType.SUPPORT_REQUEST, NotificationRecipient.user(userId), NotificationLocale.ES,
                Map.of(), "key").withRecipient(recipient);
        assertThat(resolved.recipient()).isEqualTo(recipient);
        assertThat(resolved.dedupeKey()).isEqualTo("key");
    }

    @Test
    void englishIsOnlyUsedWhenRequestedAndTypesDeclareRetention() {
        assertThat(NotificationLocale.fromLanguage("en")).isEqualTo(NotificationLocale.EN);
        assertThat(NotificationLocale.fromLanguage("es")).isEqualTo(NotificationLocale.ES);
        assertThat(NotificationLocale.fromLanguage(null)).isEqualTo(NotificationLocale.ES);
        assertThat(NotificationLocale.EN.language()).isEqualTo("en");
        assertThat(NotificationType.SUPPORT_REQUEST.undeliveredRetention()).hasValueSatisfying(value -> assertThat(value.toDays()).isEqualTo(7));
        assertThat(NotificationType.SUPPORT_REQUEST.secretDataKeys()).isEmpty();
    }

    @Test
    void addsDataWithoutChangingTheRest() {
        var request = NotificationRequest.of(NotificationType.NEWSLETTER, NotificationRecipient.user(UUID.randomUUID()),
                NotificationLocale.ES, Map.of(NotificationType.SUBJECT, "News"), "newsletter:1");

        var extended = request.withData(NotificationType.UNSUBSCRIBE_URL, "https://vinnot.example/unsubscribe");

        assertThat(extended.data()).containsOnly(
                Map.entry(NotificationType.SUBJECT, "News"),
                Map.entry(NotificationType.UNSUBSCRIBE_URL, "https://vinnot.example/unsubscribe"));
        assertThat(extended.dedupeKey()).isEqualTo(request.dedupeKey());
        assertThat(request.data()).doesNotContainKey(NotificationType.UNSUBSCRIBE_URL);
    }
}
