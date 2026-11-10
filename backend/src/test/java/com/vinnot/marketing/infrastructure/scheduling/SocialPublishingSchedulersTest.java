package com.vinnot.marketing.infrastructure.scheduling;

import com.vinnot.marketing.application.port.in.AutoApproveSocialPostsUseCase;
import com.vinnot.marketing.application.port.in.CollectSocialMetricsUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * #510 S6, S8 and S9: the metrics and auto-approval jobs only run when the marketing agent and their own switch are on,
 * and both switches are off by default.
 */
class SocialPublishingSchedulersTest {
    private final CollectSocialMetricsUseCase metrics = mock(CollectSocialMetricsUseCase.class);
    private final AutoApproveSocialPostsUseCase autoApprove = mock(AutoApproveSocialPostsUseCase.class);
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(CollectSocialMetricsUseCase.class, () -> metrics)
            .withBean(AutoApproveSocialPostsUseCase.class, () -> autoApprove)
            .withUserConfiguration(SocialMetricsScheduler.class, SocialAutoApproveScheduler.class);

    @Test
    void bothJobsAreOffByDefault() {
        runner.run(context -> assertThat(context).doesNotHaveBean(SocialMetricsScheduler.class)
                .doesNotHaveBean(SocialAutoApproveScheduler.class));
    }

    @Test
    void eachJobRunsOnlyWithItsOwnSwitchOn() {
        runner.withPropertyValues("app.marketing.metrics.enabled=true").run(context -> assertThat(context)
                .hasSingleBean(SocialMetricsScheduler.class).doesNotHaveBean(SocialAutoApproveScheduler.class));
        runner.withPropertyValues("app.marketing.auto-approve.enabled=true").run(context -> assertThat(context)
                .hasSingleBean(SocialAutoApproveScheduler.class).doesNotHaveBean(SocialMetricsScheduler.class));
    }

    @Test
    void turningTheMarketingAgentOffStopsBothJobs() {
        runner.withPropertyValues("app.marketing.enabled=false", "app.marketing.metrics.enabled=true", "app.marketing.auto-approve.enabled=true")
                .run(context -> assertThat(context).doesNotHaveBean(SocialMetricsScheduler.class)
                        .doesNotHaveBean(SocialAutoApproveScheduler.class));
    }

    @Test
    void theJobsCallTheirUseCases() {
        when(metrics.collect(any())).thenReturn(3);
        when(autoApprove.autoApprove(any())).thenReturn(0).thenReturn(2);

        new SocialMetricsScheduler(metrics).collect();
        SocialAutoApproveScheduler scheduler = new SocialAutoApproveScheduler(autoApprove);
        scheduler.approveEligible();
        scheduler.approveEligible();

        verify(metrics).collect(any());
        verify(autoApprove, times(2)).autoApprove(any());
    }
}
