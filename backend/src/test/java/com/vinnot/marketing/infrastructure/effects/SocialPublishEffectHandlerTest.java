package com.vinnot.marketing.infrastructure.effects;

import com.vinnot.marketing.application.exception.SocialPublishingException;
import com.vinnot.marketing.application.port.in.PublishSocialPostUseCase;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/** #510 S2: the publish job runs outside any transaction and lets a transient failure reach the worker's backoff. */
class SocialPublishEffectHandlerTest {
    private final PublishSocialPostUseCase publish = mock(PublishSocialPostUseCase.class);
    private final SocialPublishEffectHandler handler = new SocialPublishEffectHandler(publish);

    @Test
    void handlesOnlyItsKindWithoutATransaction() {
        assertThat(handler.supports("social-publish")).isTrue();
        assertThat(handler.supports("social-media-render")).isFalse();
        assertThat(handler.transactional()).isFalse();
    }

    @Test
    void publishesThePublicationAndPropagatesATransientFailure() {
        UUID publication = UUID.randomUUID();
        handler.execute("social-publish", Map.of("publicationId", publication.toString()));
        verify(publish).publish(eq(publication), any());

        UUID limited = UUID.randomUUID();
        doThrow(new SocialPublishingException(SocialPublishingException.Code.RATE_LIMITED, "slow down")).when(publish)
                .publish(eq(limited), any());
        assertThatThrownBy(() -> handler.execute("social-publish", Map.of("publicationId", limited.toString())))
                .isInstanceOf(SocialPublishingException.class);
    }
}
