package com.vinnot.marketing.application.service;

import com.vinnot.marketing.application.port.out.AdminRecipients;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** S6: every administrator gets one SOCIAL_BATCH_READY email per batch, deduplicated by the window start. */
class SocialBatchNoticeServiceTest {
    private static final LocalDate FROM = LocalDate.of(2026, 11, 2);
    private static final LocalDate TO = LocalDate.of(2026, 11, 15);
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final AdminRecipients admins = mock(AdminRecipients.class);
    private final SocialBatchNoticeService service = new SocialBatchNoticeService(notifications, admins);

    @Test
    void everyAdminGetsTheBatchNoticeWithTheWindowAndTheCount() {
        UUID owner = UUID.randomUUID();
        UUID other = UUID.randomUUID();
        when(admins.admins()).thenReturn(List.of(owner, other));

        assertThat(service.send(4, FROM, TO)).isEqualTo(2);

        ArgumentCaptor<NotificationRequest> sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(2)).enqueue(sent.capture());
        NotificationRequest first = sent.getAllValues().get(0);
        assertThat(first.type()).isEqualTo(NotificationType.SOCIAL_BATCH_READY);
        assertThat(first.recipient()).isEqualTo(NotificationRecipient.user(owner));
        assertThat(first.locale()).isEqualTo(NotificationLocale.ES);
        assertThat(first.data()).isEqualTo(Map.of("count", "4", "from", "2026-11-02", "to", "2026-11-15"));
        assertThat(first.dedupeKey()).isEqualTo("social-batch:2026-11-02:" + owner);
        assertThat(sent.getAllValues().get(1).dedupeKey()).isEqualTo("social-batch:2026-11-02:" + other);
    }

    @Test
    void nothingIsSentWithoutNewPendingPosts() {
        assertThat(service.send(0, FROM, TO)).isZero();
        verifyNoInteractions(notifications, admins);
    }
}
