package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.SyncSocialDraftsUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** #516 S1: the TikTok draft check runs with the same switches as publishing, so it is off by default. */
class SocialDraftSyncSchedulerTest {
    private final SyncSocialDraftsUseCase drafts = mock(SyncSocialDraftsUseCase.class);
    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withBean(SyncSocialDraftsUseCase.class, () -> drafts)
            .withUserConfiguration(SocialDraftSyncScheduler.class);

    @Test
    void theDraftCheckIsOffByDefaultAndWithTheAgentOff() {
        context.run(started -> assertThat(started).doesNotHaveBean(SocialDraftSyncScheduler.class));
        context.withPropertyValues("app.marketing.publishing.enabled=true", "app.marketing.enabled=false")
                .run(started -> assertThat(started).doesNotHaveBean(SocialDraftSyncScheduler.class));
    }

    @Test
    void withPublishingEnabledTheSweepChecksTheDrafts() {
        when(drafts.syncDrafts(any())).thenReturn(1, 0);
        context.withPropertyValues("app.marketing.publishing.enabled=true").run(started -> {
            SocialDraftSyncScheduler scheduler = started.getBean(SocialDraftSyncScheduler.class);
            scheduler.syncDrafts();
            scheduler.syncDrafts();
        });
        verify(drafts, times(2)).syncDrafts(any());
    }
}
