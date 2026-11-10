package com.vinnot.notification.domain.model;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import java.util.ArrayList;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PushRequestTest {
    @Test
    void removesRepeatedAccountsAndTakesTheTypeCategory() {
        UUID user = UUID.randomUUID();
        var request = new PushRequest(NotificationType.EVENT_REMINDER, List.of(user, user), null, "key");

        assertThat(request.userIds()).containsExactly(user);
        assertThat(request.data()).isEmpty();
        assertThat(request.category()).isEqualTo(NotificationCategory.TICKETS);
        assertThat(request.forUsers(List.of(user), "other").dedupeKey()).isEqualTo("other");
        assertThat(request.deferrable()).isFalse();
        assertThat(request.waitsForQuietHours()).isFalse();
        assertThat(request.urgent()).isTrue();
    }

    @Test
    void aDeferrableTransactionalPushWaitsForQuietHoursAtNormalPriorityAndStaysDeferrable() {
        UUID user = UUID.randomUUID();
        var request = new PushRequest(NotificationType.EVENT_REMINDER, List.of(user), Map.of(), "key", true);
        assertThat(request.waitsForQuietHours()).isTrue();
        assertThat(request.urgent()).isFalse();
        assertThat(request.forUsers(List.of(user), "later").deferrable()).isTrue();
        var optional = new PushRequest(NotificationType.NEWSLETTER, List.of(user), Map.of(), "key");
        assertThat(optional.waitsForQuietHours()).isTrue();
        assertThat(optional.urgent()).isFalse();
    }

    @Test
    void batchesSplitAnyAudienceIntoRequestsOfAtMostOneThousandWithIndexedKeys() {
        List<UUID> users = new ArrayList<>();
        for (int index = 0; index < 2001; index++) {
            users.add(UUID.randomUUID());
        }
        users.add(users.getFirst());
        var requests = PushRequest.batches(NotificationType.EVENT_CANCELLED_ATTENDEE, users, Map.of("title", "Cata"), "key", true);
        assertThat(requests).extracting(PushRequest::dedupeKey).containsExactly("key", "key:1", "key:2");
        assertThat(requests).extracting(request -> request.userIds().size()).containsExactly(1000, 1000, 1);
        assertThat(requests).allMatch(PushRequest::deferrable);
        assertThat(PushRequest.batches(NotificationType.EVENT_CANCELLED_ATTENDEE, List.of(), Map.of(), "key", false)).isEmpty();
    }

    @Test
    void aPushWithADeadlineIsExpiredFromThatInstantAndKeepsItWhenNarrowed() {
        UUID user = UUID.randomUUID();
        Instant deadline = Instant.parse("2026-10-21T10:00:00Z");
        var request = new PushRequest(NotificationType.EVENT_REMINDER, List.of(user), Map.of(), "key", true, deadline);
        assertThat(request.expiredAt(deadline.minusSeconds(1))).isFalse();
        assertThat(request.expiredAt(deadline)).isTrue();
        assertThat(request.forUsers(List.of(user), "later").expiresAt()).isEqualTo(deadline);
        assertThat(new PushRequest(NotificationType.EVENT_REMINDER, List.of(user), Map.of(), "key").expiredAt(deadline)).isFalse();
    }

    @Test
    void boundsTheAudienceAndTheKey() {
        UUID user = UUID.randomUUID();
        assertThatThrownBy(() -> new PushRequest(NotificationType.EVENT_REMINDER, List.of(), Map.of(), "key"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PushRequest(NotificationType.EVENT_REMINDER,
                Stream.generate(UUID::randomUUID).limit(PushRequest.MAX_USERS + 1).toList(), Map.of(), "key"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PushRequest(NotificationType.EVENT_REMINDER, List.of(user), Map.of(), " "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PushRequest(NotificationType.EVENT_REMINDER, List.of(user), Map.of(),
                "k".repeat(PushRequest.MAX_DEDUPE_KEY_LENGTH + 1))).isInstanceOf(IllegalArgumentException.class);
    }
}
