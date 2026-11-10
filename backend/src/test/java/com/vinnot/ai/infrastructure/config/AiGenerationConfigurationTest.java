package com.vinnot.ai.infrastructure.config;

import com.vinnot.ai.application.config.AiProfileRefreshPolicy;
import com.vinnot.ai.application.config.AiProviderAdmissionPolicy;
import org.junit.jupiter.api.Test;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.math.BigDecimal;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiGenerationConfigurationTest {
    @Test
    void defaultsToTheAgreedTenDollarsMonthlyWithoutAnExtraDailyLimit() {
        new ApplicationContextRunner()
                .withInitializer(context -> context.getBeanFactory()
                        .setConversionService(ApplicationConversionService.getSharedInstance()))
                .withUserConfiguration(AiGenerationConfiguration.class).run(context -> {
            var policy = context.getBean(AiProviderAdmissionPolicy.class);
            assertThat(policy.monthlyLimitUsd()).isEqualByComparingTo("10");
            assertThat(policy.dailyLimitUsd()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(policy.maximumConcurrentRequests()).isEqualTo(3);
            assertThat(policy.leaseDuration()).isEqualTo(Duration.ofMinutes(2));
            assertThat(policy.paidCallsEnabled()).isTrue();
        });
    }

    @Test
    void rejectsNonPositiveSpendingOrCapacityAndLeasesShorterThanTheTransportDeadline() {
        assertInvalid(0, Duration.ofMinutes(2), BigDecimal.TEN, BigDecimal.ZERO);
        assertInvalid(21, Duration.ofMinutes(2), BigDecimal.TEN, BigDecimal.ZERO);
        assertInvalid(3, Duration.ofSeconds(60), BigDecimal.TEN, BigDecimal.ZERO);
        assertInvalid(3, Duration.ofMinutes(6), BigDecimal.TEN, BigDecimal.ZERO);
        assertInvalid(3, Duration.ofMinutes(2), BigDecimal.ZERO, BigDecimal.ZERO);
        assertInvalid(3, Duration.ofMinutes(2), BigDecimal.TEN, BigDecimal.ONE.negate());
    }

    @Test
    void refreshesOneStaleProfilePerRunWhileHalfTheMonthlyBudgetRemainsByDefault() {
        new ApplicationContextRunner()
                .withInitializer(context -> context.getBeanFactory()
                        .setConversionService(ApplicationConversionService.getSharedInstance()))
                .withUserConfiguration(AiGenerationConfiguration.class).run(context -> {
            var policy = context.getBean(AiProfileRefreshPolicy.class);
            assertThat(policy.profilesPerRun()).isEqualTo(1);
            assertThat(policy.budgetShare()).isEqualByComparingTo("0.5");
        });
    }

    @Test
    void rejectsRefreshRunsOutsideOneToTwentyProfilesAndSharesOutsideZeroToOne() {
        assertThatThrownBy(() -> new AiProfileRefreshPolicy(0, new BigDecimal("0.5")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AiProfileRefreshPolicy(21, new BigDecimal("0.5")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AiProfileRefreshPolicy(1, BigDecimal.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AiProfileRefreshPolicy(1, new BigDecimal("1.01")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(new AiProfileRefreshPolicy(20, BigDecimal.ONE).budgetShare()).isEqualByComparingTo("1");
    }

    private void assertInvalid(int concurrent, Duration lease, BigDecimal monthly, BigDecimal daily) {
        assertThatThrownBy(() -> new AiProviderAdmissionPolicy(concurrent, lease, monthly, daily, true))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
