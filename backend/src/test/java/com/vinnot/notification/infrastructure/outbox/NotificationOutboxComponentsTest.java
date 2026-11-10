package com.vinnot.notification.infrastructure.outbox;

import com.vinnot.notification.application.port.in.DeliverNotificationUseCase;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationOutboxComponentsTest {
    private final NotificationPayloadSealer sealer = new NotificationPayloadSealer("test-secret");
    private final NotificationPayloadCodec codec = new NotificationPayloadCodec(sealer);
    private final NotificationRequest request = NotificationRequest.of(NotificationType.SUPPORT_REQUEST,
            NotificationRecipient.address("support@example.test", "Support"), NotificationLocale.EN,
            Map.of("message", "Hello"), "support:1");

    @Test
    void storesEveryNotificationAsOneImmediateOutboxEffectWithANamespacedKey() {
        var queue = mock(DurableEffectQueue.class);
        new OutboxNotificationAdapter(queue, codec).store(request);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(queue).enqueue(eq("NOTIFICATION"), eq("notification:support:1"), payload.capture(), eq(Duration.ZERO));
        assertThat(payload.getValue()).containsEntry("type", "SUPPORT_REQUEST").containsEntry("locale", "EN")
                .containsEntry("category", "SUPPORT").containsEntry("dedupeKey", "support:1");
    }

    @Test
    void payloadsRoundTripForAddressesAndUsers() {
        assertThat(codec.decode(codec.encode(request))).isEqualTo(request);
        var user = NotificationRequest.of(NotificationType.SUPPORT_REQUEST, NotificationRecipient.user(UUID.randomUUID()),
                NotificationLocale.ES, Map.of(), "support:2");
        Map<String, Object> encoded = codec.encode(user);
        assertThat(encoded.get("recipient").toString()).startsWith("{userId=").doesNotContain("email");
        assertThat(codec.decode(encoded)).isEqualTo(user);
        assertThatThrownBy(() -> codec.decode(Map.of("type", "SUPPORT_REQUEST"))).hasMessageContaining("dedupeKey");
    }

    @Test
    void accountLinksAreSealedInThePayloadAndCannotBeMovedToAnotherMessage() {
        var reset = NotificationRequest.of(NotificationType.ACCOUNT_PASSWORD_RESET,
                NotificationRecipient.address("ana@example.test", "Ana"), NotificationLocale.ES,
                Map.of(NotificationType.ACTION_URL, "https://vinnot.example/reset-password?token=raw-secret"), "reset:1");
        Map<String, Object> payload = codec.encode(reset);
        assertThat(payload.toString()).doesNotContain("raw-secret");
        assertThat(codec.decode(payload)).isEqualTo(reset);
        Map<String, Object> moved = new HashMap<>(payload);
        moved.put("dedupeKey", "reset:2");
        assertThatThrownBy(() -> codec.decode(moved)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void sealedValuesOnlyOpenWithTheSameKeyAndContext() {
        String sealed = sealer.seal("https://vinnot.example/reset-password?token=secret", "context");
        assertThat(sealed).startsWith("v1:").doesNotContain("secret");
        assertThat(sealer.open(sealed, "context")).isEqualTo("https://vinnot.example/reset-password?token=secret");
        assertThatThrownBy(() -> sealer.open(sealed, "another-context")).hasMessage("Notification payload sealing failed");
        assertThatThrownBy(() -> new NotificationPayloadSealer("other-secret").open(sealed, "context"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> sealer.open("plain", "context")).hasMessageContaining("Unsupported");
        assertThatThrownBy(() -> sealer.open("v1:AAAA", "context")).hasMessageContaining("Invalid");
    }

    @Test
    void theEffectHandlerDeliversOnlyNotificationRows() {
        var delivery = mock(DeliverNotificationUseCase.class);
        var handler = new NotificationEffectHandler(codec, delivery, mock(OutboxAttempts.class));
        assertThat(handler.supports("NOTIFICATION")).isTrue();
        assertThat(handler.supports("SUPPORT_REQUEST")).isFalse();
        handler.execute("NOTIFICATION", codec.encode(request));
        verify(delivery).deliver(request);
        verify(delivery, never()).gaveUp(any());
    }

    @Test
    void aFailedLastAttemptTellsDeliveryItGaveUpAndStillFailsTheJob() {
        var delivery = mock(DeliverNotificationUseCase.class);
        var attempts = mock(OutboxAttempts.class);
        var handler = new NotificationEffectHandler(codec, delivery, attempts);
        doThrow(new IllegalStateException("provider down")).when(delivery).deliver(request);
        when(attempts.lastAttempt(OutboxNotificationAdapter.KEY_PREFIX + request.dedupeKey())).thenReturn(false, true);

        assertThatThrownBy(() -> handler.execute("NOTIFICATION", codec.encode(request))).hasMessage("provider down");
        verify(delivery, never()).gaveUp(any());
        assertThatThrownBy(() -> handler.execute("NOTIFICATION", codec.encode(request))).hasMessage("provider down");
        verify(delivery).gaveUp(request);
    }

    @Test
    void aProblemReportingTheGiveUpNeverReplacesTheDeliveryFailure() {
        var delivery = mock(DeliverNotificationUseCase.class);
        var attempts = mock(OutboxAttempts.class);
        var handler = new NotificationEffectHandler(codec, delivery, attempts);
        doThrow(new IllegalStateException("provider down")).when(delivery).deliver(request);
        when(attempts.lastAttempt(any())).thenThrow(new IllegalStateException("database down"));

        assertThatThrownBy(() -> handler.execute("NOTIFICATION", codec.encode(request))).hasMessage("provider down");
        verify(delivery, never()).gaveUp(any());
    }

    @Test
    void legacySupportRowsQueuedBeforeTheUpgradeAreStillDelivered() {
        var delivery = mock(DeliverNotificationUseCase.class);
        var handler = new LegacyNotificationEffectHandler(delivery);
        assertThat(handler.supports("SUPPORT_REQUEST")).isTrue();
        assertThat(handler.supports("NOTIFICATION")).isFalse();
        handler.execute("SUPPORT_REQUEST", Map.of("requestId", "id-1", "name", "Name", "email", "reply@example.org",
                "subject", "privacy", "message", "Text", "recipient", "support@example.org"));
        var delivered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(delivery).deliver(delivered.capture());
        assertThat(delivered.getValue().type()).isEqualTo(NotificationType.SUPPORT_REQUEST);
        assertThat(delivered.getValue().category()).isEqualTo(NotificationCategory.SUPPORT);
        assertThat(delivered.getValue().recipient().email()).isEqualTo("support@example.org");
        assertThat(delivered.getValue().data()).containsEntry("email", "reply@example.org").containsEntry("message", "Text")
                .doesNotContainKey("recipient");
        assertThatThrownBy(() -> handler.execute("SUPPORT_REQUEST", Map.of("requestId", "id-1")))
                .hasMessageContaining("recipient");
    }

    @Test
    void legacySubmissionRowsAreDeliveredToTheSubmitterInSpanish() {
        var delivery = mock(DeliverNotificationUseCase.class);
        var handler = new LegacyNotificationEffectHandler(delivery);
        UUID submitter = UUID.randomUUID();
        assertThat(handler.supports("submission-status")).isTrue();
        handler.execute("submission-status", Map.of("userId", submitter.toString(), "wineName", "Malbec",
                "status", "APPROVED", "reason", ""));
        var delivered = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(delivery).deliver(delivered.capture());
        assertThat(delivered.getValue().type()).isEqualTo(NotificationType.WINE_SUBMISSION_STATUS);
        assertThat(delivered.getValue().recipient()).isEqualTo(NotificationRecipient.user(submitter));
        assertThat(delivered.getValue().locale()).isEqualTo(NotificationLocale.ES);
        assertThat(delivered.getValue().data()).containsEntry("wineName", "Malbec").containsEntry("reason", "");
    }
}
