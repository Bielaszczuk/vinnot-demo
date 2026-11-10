package com.vinnot.marketing.infrastructure.effects;

import com.vinnot.marketing.domain.model.FactCheck;
import com.vinnot.marketing.domain.model.GenerationInfo;
import com.vinnot.marketing.domain.model.PostCopies;
import com.vinnot.marketing.domain.model.PostCopy;
import com.vinnot.marketing.domain.model.PostLanguage;
import com.vinnot.marketing.domain.model.SocialPost;
import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** S6: one durable render job per post, target (every language's copy hash, #497) and illustration version, only while the media waits. */
class OutboxSocialMediaRenderQueueTest {
    private static final Instant NOW = Instant.parse("2026-11-02T12:00:00Z");
    private final DurableEffectQueue queue = mock(DurableEffectQueue.class);
    private final OutboxSocialMediaRenderQueue renders = new OutboxSocialMediaRenderQueue(queue);

    @Test
    void aRequestIsDeduplicatedByPostTargetHashAndIllustrationVersion() {
        UUID post = UUID.randomUUID();
        renders.request(post, "abc", 3);
        verify(queue).enqueue("social-media-render", "social-render:" + post + ":abc:3", Map.of("postId", post.toString()), Duration.ZERO);
    }

    @Test
    void onlyAPostWhoseMediaWaitsIsQueued() {
        SocialPost draft = SocialPost.planned(UUID.randomUUID(), NOW, "QUIZ", null, NOW);
        renders.requestFor(draft);
        verify(queue, never()).enqueue(anyString(), anyString(), any(), any());

        SocialPost post = SocialPost.planned(UUID.randomUUID(), NOW, "QUIZ", null, NOW);
        List<PostCopy.Slide> slides = List.of(new PostCopy.Slide("Uno", "a"), new PostCopy.Slide("Dos", "b"), new PostCopy.Slide("Tres", "c"));
        List<String> tags = List.of("#vinnot", "#a", "#b", "#c", "#d");
        PostCopies copies = new PostCopies(PostCopy.of(PostLanguage.ES, "Hola", slides, "Texto", tags, "Alt", "¿Y tú?"),
                PostCopy.of(PostLanguage.EN, "Hello", slides, "Text", tags, "Alt", "And you?"));
        post.copyGenerated(copies, GenerationInfo.none().succeeded("mock", "x", true, FactCheck.SKIPPED, List.of(), NOW), NOW);
        renders.requestFor(post);
        verify(queue).enqueue("social-media-render", "social-render:" + post.id() + ":" + post.media().targetHash() + ":1",
                Map.of("postId", post.id().toString()), Duration.ZERO);
    }
}
