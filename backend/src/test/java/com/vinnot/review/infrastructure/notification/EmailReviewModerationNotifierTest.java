package com.vinnot.review.infrastructure.notification;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.review.domain.model.PublicationRejectionReason;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.sql.ResultSet;
import java.util.HashMap;
import org.springframework.jdbc.core.RowCallbackHandler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.doAnswer;

class EmailReviewModerationNotifierTest {
    private static final Instant AT = Instant.parse("2026-10-20T18:00:00Z");
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final EmailReviewModerationNotifier notifier = new EmailReviewModerationNotifier(notifications, jdbc);
    private final UUID author = UUID.randomUUID();
    private final UUID wine = UUID.randomUUID();
    private final ReviewPublication comment = new ReviewPublication(ReviewPublication.Type.COMMENT, UUID.randomUUID(), wine,
            UUID.randomUUID(), author, null, "", "Text", PublicationStatus.PENDING, AT, AT, true);

    @Test
    void theAuthorIsToldTheOutcomeAndOnlyOtherCarriesTheNote() {
        when(jdbc.queryForList(any(String.class), eq(String.class), eq(wine))).thenReturn(List.of("Gran Malbec"));

        notifier.publicationDecided(comment, PublicationStatus.REJECTED,
                new ReviewPublication.Decision(PublicationRejectionReason.SPAM, "internal"), AT);
        notifier.publicationDecided(comment, PublicationStatus.REJECTED,
                new ReviewPublication.Decision(PublicationRejectionReason.OTHER, "Repeated text"), AT.plusSeconds(1));
        notifier.publicationDecided(comment, PublicationStatus.APPROVED, new ReviewPublication.Decision(null, ""), AT.plusSeconds(2));
        notifier.publicationDecided(comment, PublicationStatus.REJECTED,
                new ReviewPublication.Decision(PublicationRejectionReason.OTHER, "Internal note", true), AT.plusSeconds(3));

        ArgumentCaptor<NotificationRequest> sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(4)).enqueue(sent.capture());
        Map<String, String> base = Map.of("kind", "COMMENT", "wineId", wine.toString(), "wineName", "Gran Malbec");
        assertThat(sent.getAllValues()).extracting(NotificationRequest::data).containsExactly(
                with(base, "status", "REJECTED", "reasonCode", "SPAM"),
                with(base, "status", "REJECTED", "reasonCode", "OTHER", "note", "Repeated text"),
                with(base, "status", "APPROVED"),
                with(base, "status", "REJECTED", "reasonCode", "OTHER"));
        NotificationRequest first = sent.getAllValues().get(0);
        assertThat(first.type()).isEqualTo(NotificationType.REVIEW_PUBLICATION_DECISION);
        assertThat(first.recipient()).isEqualTo(NotificationRecipient.user(author));
        assertThat(first.locale()).isEqualTo(NotificationLocale.ES);
        assertThat(first.dedupeKey()).isEqualTo("review-publication:COMMENT:" + comment.id() + ":" + AT.toEpochMilli());
    }

    @Test
    void aWineThatNoLongerExistsIsNamedNeutrally() {
        when(jdbc.queryForList(any(String.class), eq(String.class), eq(wine))).thenReturn(List.of());

        notifier.publicationDecided(comment, PublicationStatus.REJECTED,
                new ReviewPublication.Decision(PublicationRejectionReason.OTHER, ""), AT);

        ArgumentCaptor<NotificationRequest> sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(sent.capture());
        assertThat(sent.getValue().data()).containsEntry("wineName", "Vinnot").doesNotContainKey("note");
    }

    @Test
    @SuppressWarnings("unchecked")
    void aRemovalDescribesTheWineAndTheReportReasonAndIsSentOncePerContent() {
        UUID review = UUID.randomUUID();
        doAnswer(call -> {
            var row = mock(ResultSet.class);
            when(row.getString("id")).thenReturn(wine.toString());
            when(row.getString("name")).thenReturn("Gran Malbec");
            ((RowCallbackHandler) call.getArgument(1)).processRow(row);
            return null;
        }).when(jdbc).query(contains("FROM reviews r JOIN wines"),
                any(RowCallbackHandler.class), eq(review));

        notifier.contentRemoved(ReviewPublication.Type.REVIEW, review, author, "SPAM");
        notifier.contentRemoved(ReviewPublication.Type.COMMENT, comment.id(), author, null);

        ArgumentCaptor<NotificationRequest> sent = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(2)).enqueue(sent.capture());
        assertThat(sent.getAllValues().get(0).data()).isEqualTo(Map.of("kind", "REVIEW", "wineId", wine.toString(),
                "wineName", "Gran Malbec", "reportReason", "SPAM"));
        assertThat(sent.getAllValues().get(0).dedupeKey()).isEqualTo("content-removed:REVIEW:" + review);
        assertThat(sent.getAllValues().get(1).data()).isEqualTo(Map.of("kind", "COMMENT", "wineName", "Vinnot"));
        assertThat(sent.getAllValues().get(1).type()).isEqualTo(NotificationType.CONTENT_REMOVED);
    }

    private static Map<String, String> with(Map<String, String> base, String... pairs) {
        var map = new HashMap<>(base);
        for (int i = 0; i < pairs.length; i += 2) {
            map.put(pairs[i], pairs[i + 1]);
        }
        return map;
    }
}
