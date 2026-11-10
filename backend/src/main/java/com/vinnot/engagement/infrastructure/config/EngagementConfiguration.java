package com.vinnot.engagement.infrastructure.config;

import com.vinnot.engagement.domain.model.EngagementPolicy;
import com.vinnot.engagement.domain.model.Holdout;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/** The engagement budget and holdout (#405) from {@code app.engagement.*}; the defaults are the approved strategy. */
@Configuration
public class EngagementConfiguration {
    @Bean
    EngagementPolicy engagementPolicy(@Value("${app.engagement.weekly-limit:2}") int weeklyLimit,
            @Value("${app.engagement.daily-limit:1}") int dailyLimit,
            @Value("${app.engagement.minimum-gap:48h}") Duration minimumGap,
            @Value("${app.engagement.fatigue-streak:3}") int fatigueStreak,
            @Value("${app.engagement.fatigued-weekly-limit:1}") int fatiguedWeeklyLimit,
            @Value("${app.engagement.pause-after:28d}") Duration pauseAfter,
            @Value("${app.engagement.second-push-min-score:0.6}") double secondPushMinScore) {
        return new EngagementPolicy(weeklyLimit, dailyLimit, minimumGap, fatigueStreak, fatiguedWeeklyLimit, pauseAfter,
                secondPushMinScore);
    }

    @Bean
    Holdout engagementHoldout(@Value("${app.engagement.holdout-percent:5}") int percent) {
        return new Holdout(percent);
    }
}
