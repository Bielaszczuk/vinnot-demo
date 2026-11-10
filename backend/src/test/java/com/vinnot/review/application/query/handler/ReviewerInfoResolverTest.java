package com.vinnot.review.application.query.handler;

import java.util.Map;
import java.util.List;
import com.vinnot.review.application.port.out.ReviewerBadgePort;
import com.vinnot.review.application.port.out.UserQueryPort;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReviewerInfoResolverTest {
    private final ReviewerBadgePort badges = mock(ReviewerBadgePort.class);

    @Test
    void buildsFullNameAndFallsBackToUsernameForMissingNames() {
        UserQueryPort port = mock(UserQueryPort.class);
        ReviewerInfoResolver resolver = new ReviewerInfoResolver(port, badges);
        UUID namedId = UUID.randomUUID();
        UUID anonymousId = UUID.randomUUID();
        when(port.findById(namedId)).thenReturn(Optional.of(
                new UserQueryPort.UserData(namedId, "ana", "Ana", "Pérez", "avatar")));
        when(port.findById(anonymousId)).thenReturn(Optional.of(
                new UserQueryPort.UserData(anonymousId, "winefan", null, null, null)));

        assertThat(resolver.resolveForReview(namedId).displayName()).isEqualTo("Ana Pérez");
        assertThat(resolver.resolveForComment(anonymousId).displayName()).isEqualTo("winefan");
        assertThat(resolver.resolveForReview(UUID.randomUUID())).isNull();
        assertThat(resolver.resolveForReview(namedId).badgeTier()).isNull();
        when(badges.badgeTiers(List.of(namedId))).thenReturn(Map.of(namedId, "CRIANZA"));
        assertThat(resolver.resolveForReview(namedId).badgeTier()).isEqualTo("CRIANZA");
        assertThat(resolver.resolveForComment(namedId).badgeTier()).isEqualTo("CRIANZA");
    }
}
