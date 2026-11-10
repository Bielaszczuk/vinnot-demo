package com.vinnot.marketing.application.exception;

import org.junit.jupiter.api.Test;

import java.util.EnumSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** #510 S2: only rate limits, outages and processing timeouts are worth another attempt. */
class SocialPublishingExceptionTest {

    @Test
    void onlyTransientCodesAreRetryable() {
        assertThat(EnumSet.allOf(SocialPublishingException.Code.class).stream().filter(SocialPublishingException.Code::retryable))
                .containsExactlyInAnyOrder(SocialPublishingException.Code.RATE_LIMITED, SocialPublishingException.Code.UNAVAILABLE,
                        SocialPublishingException.Code.PROCESSING_TIMEOUT);
        assertThat(new SocialPublishingException(SocialPublishingException.Code.UNAVAILABLE, "503").retryable()).isTrue();
        assertThat(new SocialPublishingException(SocialPublishingException.Code.MEDIA_NOT_PUBLIC, "http://").retryable()).isFalse();
    }

    @Test
    void itKeepsItsCodeDetailAndCause() {
        IllegalStateException cause = new IllegalStateException("boom");
        SocialPublishingException failure = new SocialPublishingException(SocialPublishingException.Code.TOKEN_INVALID, "expired", cause);

        assertThat(failure.code()).isEqualTo(SocialPublishingException.Code.TOKEN_INVALID);
        assertThat(failure.detail()).isEqualTo("expired");
        assertThat(failure.getCause()).isSameAs(cause);
        assertThat(failure.getMessage()).isEqualTo("TOKEN_INVALID: expired");
        assertThat(new SocialPublishingException(SocialPublishingException.Code.REJECTED, null).getMessage()).isEqualTo("REJECTED");
        assertThatThrownBy(() -> new SocialPublishingException(null, "x")).isInstanceOf(NullPointerException.class);
    }
}
