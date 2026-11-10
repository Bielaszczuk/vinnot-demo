package com.vinnot.marketing.infrastructure.effects;

import com.vinnot.marketing.application.port.in.RenderSocialMediaUseCase;
import com.vinnot.marketing.application.port.out.SlideRenderer;
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

/** S6: the render job runs outside any transaction and lets retryable failures reach the worker's backoff. */
class SocialMediaRenderEffectHandlerTest {
    private final RenderSocialMediaUseCase render = mock(RenderSocialMediaUseCase.class);
    private final SocialMediaRenderEffectHandler handler = new SocialMediaRenderEffectHandler(render);

    @Test
    void handlesOnlyItsKindWithoutATransaction() {
        assertThat(handler.supports("social-media-render")).isTrue();
        assertThat(handler.supports("social-media-cleanup")).isFalse();
        assertThat(handler.transactional()).isFalse();
    }

    @Test
    void rendersThePostOfThePayloadAndPropagatesARetryableFailure() {
        UUID post = UUID.randomUUID();
        handler.execute("social-media-render", Map.of("postId", post.toString()));
        verify(render).render(eq(post), any());

        UUID busy = UUID.randomUUID();
        doThrow(new SlideRenderer.SlideRenderingException(SlideRenderer.Reason.BUSY, "busy")).when(render).render(eq(busy), any());
        assertThatThrownBy(() -> handler.execute("social-media-render", Map.of("postId", busy.toString())))
                .isInstanceOf(SlideRenderer.SlideRenderingException.class);
    }
}
