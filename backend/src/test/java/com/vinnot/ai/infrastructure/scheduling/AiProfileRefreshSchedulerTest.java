package com.vinnot.ai.infrastructure.scheduling;

import com.vinnot.ai.application.port.in.RefreshStaleAiProfilesUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** #528 S6: stale AI profiles refresh in the background unless the switch turns the job off. */
class AiProfileRefreshSchedulerTest {
    private final RefreshStaleAiProfilesUseCase refresh = mock(RefreshStaleAiProfilesUseCase.class);
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(RefreshStaleAiProfilesUseCase.class, () -> refresh)
            .withUserConfiguration(AiProfileRefreshScheduler.class);

    @Test
    void runsByDefaultAndStopsWhenTheSwitchIsOff() {
        runner.run(context -> assertThat(context).hasSingleBean(AiProfileRefreshScheduler.class));
        runner.withPropertyValues("ai.profile-refresh.enabled=false")
                .run(context -> assertThat(context).doesNotHaveBean(AiProfileRefreshScheduler.class));
    }

    @Test
    void eachRunCallsTheRefreshUseCaseAndSurvivesItsFailure() {
        when(refresh.refreshStaleProfiles()).thenReturn(1).thenThrow(new IllegalStateException("database down"));
        AiProfileRefreshScheduler scheduler = new AiProfileRefreshScheduler(refresh);

        scheduler.refreshStaleProfiles();
        assertThatCode(scheduler::refreshStaleProfiles).doesNotThrowAnyException();

        verify(refresh, times(2)).refreshStaleProfiles();
    }

    @Test
    void theTestClasspathKeepsTheJobOffWhileTheApplicationDefaultsStillLoad() {
        try (var context = new SpringApplicationBuilder(EmptyConfiguration.class)
                .web(WebApplicationType.NONE).logStartupInfo(false).run()) {
            assertThat(context.getEnvironment().getProperty("ai.profile-refresh.enabled")).isEqualTo("false");
            assertThat(context.getEnvironment().getProperty("ai.profile-refresh.interval")).isEqualTo("2m");
            assertThat(context.getEnvironment().getProperty("ai.profile-refresh.budget-share")).isEqualTo("0.5");
        }
    }

    @Configuration(proxyBeanMethods = false)
    static class EmptyConfiguration {
    }
}
