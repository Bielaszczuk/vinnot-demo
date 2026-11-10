package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.StartSocialPublishingUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** #510 S9: the publishing sweep runs only with the agent and publishing both enabled; publishing is off by default. */
class SocialPublishingSchedulerTest {
    private final StartSocialPublishingUseCase publishing = mock(StartSocialPublishingUseCase.class);
    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withBean(StartSocialPublishingUseCase.class, () -> publishing)
            .withUserConfiguration(SocialPublishingScheduler.class);

    @Test
    void publishingIsOffByDefault() {
        context.run(started -> assertThat(started).doesNotHaveBean(SocialPublishingScheduler.class));
        context.withPropertyValues("app.marketing.publishing.enabled=true", "app.marketing.enabled=false")
                .run(started -> assertThat(started).doesNotHaveBean(SocialPublishingScheduler.class));
    }

    @Test
    void withPublishingEnabledTheSweepStartsDuePosts() {
        when(publishing.startDue(any())).thenReturn(2, 0);
        context.withPropertyValues("app.marketing.publishing.enabled=true").run(started -> {
            SocialPublishingScheduler scheduler = started.getBean(SocialPublishingScheduler.class);
            scheduler.startDue();
            scheduler.startDue();
        });
        verify(publishing, times(2)).startDue(any());
    }
}
