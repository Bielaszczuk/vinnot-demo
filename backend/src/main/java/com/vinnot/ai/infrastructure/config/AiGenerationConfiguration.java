package com.vinnot.ai.infrastructure.config;

import com.vinnot.ai.application.config.AiGenerationPolicy;
import com.vinnot.ai.application.config.AiProfileRefreshPolicy;
import com.vinnot.ai.application.config.AiProviderAdmissionPolicy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.math.BigDecimal;

@Configuration
public class AiGenerationConfiguration {

    @Bean
    public AiProviderAdmissionPolicy aiProviderAdmissionPolicy(
            @Value("${ai.admission.maximum-concurrent:3}") int maximumConcurrent,
            @Value("${ai.admission.lease-duration:2m}") Duration leaseDuration,
            @Value("${ai.spending.monthly-limit-usd:10}") BigDecimal monthlyLimit,
            @Value("${ai.spending.daily-limit-usd:0}") BigDecimal dailyLimit,
            @Value("${ai.spending.paid-calls-enabled:true}") boolean paidCallsEnabled,
            @Value("${ai.admission.interactive-wait:4s}") Duration interactiveWait) {
        return new AiProviderAdmissionPolicy(maximumConcurrent, leaseDuration,
                monthlyLimit, dailyLimit, paidCallsEnabled, interactiveWait);
    }

    @Bean
    public AiProfileRefreshPolicy aiProfileRefreshPolicy(
            @Value("${ai.profile-refresh.profiles-per-run:1}") int profilesPerRun,
            @Value("${ai.profile-refresh.budget-share:0.5}") BigDecimal budgetShare) {
        return new AiProfileRefreshPolicy(profilesPerRun, budgetShare);
    }

    @Bean
    public AiGenerationPolicy aiGenerationPolicy(
            @Value("${ai.generation.lease-duration:5m}") Duration leaseDuration,
            @Value("${ai.generation.wait-timeout:95s}") Duration waitTimeout,
            @Value("${ai.generation.poll-interval:200ms}") Duration pollInterval) {
        return new AiGenerationPolicy(leaseDuration, waitTimeout, pollInterval);
    }
}
