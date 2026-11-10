package com.vinnot.marketing.infrastructure.effects;

import com.vinnot.shared.infrastructure.effects.DurableEffectQueue;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/** #510 S2/S3: one durable publish job per run of a publication, so an admin retry queues it again. #513 S4: it may be due later. */
class OutboxSocialPublishQueueTest {
    private final DurableEffectQueue queue = mock(DurableEffectQueue.class);
    private final OutboxSocialPublishQueue publishes = new OutboxSocialPublishQueue(queue);

    @Test
    void eachRunGetsItsOwnKeyAndCarriesThePublication() {
        UUID publication = UUID.randomUUID();

        publishes.enqueue(publication);
        publishes.enqueue(publication);

        ArgumentCaptor<String> keys = ArgumentCaptor.forClass(String.class);
        verify(queue, times(2)).enqueue(eq("social-publish"), keys.capture(), eq(Map.of("publicationId", publication.toString())),
                eq(Duration.ZERO));
        assertThat(keys.getAllValues()).allSatisfy(key -> assertThat(key).startsWith("social-publish:" + publication + ":"))
                .doesNotHaveDuplicates();
    }

    @Test
    void aDelayedRunIsDueAfterItsDelay() {
        UUID publication = UUID.randomUUID();

        publishes.enqueue(publication, Duration.ofMinutes(29));

        verify(queue).enqueue(eq("social-publish"), any(), eq(Map.of("publicationId", publication.toString())), eq(Duration.ofMinutes(29)));
    }
}
