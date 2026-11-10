package com.vinnot.shared.infrastructure.web;

import com.vinnot.marketing.application.exception.SocialPostDateTakenException;
import com.vinnot.marketing.application.exception.SocialPublishingOffException;
import com.vinnot.marketing.domain.exception.InvalidPostTransitionException;
import com.vinnot.marketing.domain.exception.InvalidPublicationTransitionException;
import com.vinnot.marketing.domain.exception.LastRotatingPillarException;
import com.vinnot.marketing.domain.exception.SocialPostMediaNotReadyException;
import com.vinnot.marketing.domain.exception.SocialPostScheduleNotFutureException;
import com.vinnot.marketing.domain.model.PublicationStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.marketing.domain.model.SocialPostStatus;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * #510 S3: retrying a publication that did not fail conflicts like any other refused social transition. #513 S5/S6: a taken
 * date and media not ready conflict, a time not in the future is a bad request, and publishing off still conflicts.
 */
class GlobalExceptionHandlerTransitionConflictTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/admin/social-posts/x/publications/INSTAGRAM/retry");

    @Test
    void aRefusedPublicationTransitionIs409() {
        var response = handler.handleDomainException(new InvalidPublicationTransitionException(PublicationStatus.PUBLISHED, "retry"),
                request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("INVALID_PUBLICATION_TRANSITION");
    }

    @Test
    void retryingWhilePublishingIsOffIs409() {
        var response = handler.handleDomainException(new SocialPublishingOffException(SocialNetwork.THREADS), request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("SOCIAL_PUBLISHING_OFF");
    }

    @Test
    void switchingOffTheLastRotatingPillarIs409() {
        var response = handler.handleDomainException(new LastRotatingPillarException("QUIZ"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("LAST_ROTATING_PILLAR");
    }

    @Test
    void aRefusedPostTransitionIsStill409() {
        var response = handler.handleDomainException(new InvalidPostTransitionException(SocialPostStatus.PUBLISHED, "edit"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("INVALID_POST_TRANSITION");
    }

    @Test
    void reschedulingOntoATakenDateIs409() {
        var response = handler.handleDomainException(new SocialPostDateTakenException(LocalDate.of(2026, 11, 10)), request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("SOCIAL_POST_DATE_TAKEN");
    }

    @Test
    void publishingNowWithoutReadyMediaIs409() {
        var response = handler.handleDomainException(new SocialPostMediaNotReadyException(), request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("SOCIAL_POST_MEDIA_NOT_READY");
    }

    @Test
    void publishingNowWhilePublishingIsOffIs409() {
        var response = handler.handleDomainException(new SocialPublishingOffException(), request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("SOCIAL_PUBLISHING_OFF");
    }

    @Test
    void reschedulingToATimeNotInTheFutureIs400() {
        var response = handler.handleDomainException(new SocialPostScheduleNotFutureException(Instant.parse("2026-11-01T15:00:00Z")),
                request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().code()).isEqualTo("SOCIAL_POST_SCHEDULE_NOT_FUTURE");
    }
}
