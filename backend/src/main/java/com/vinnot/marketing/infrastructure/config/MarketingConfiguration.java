package com.vinnot.marketing.infrastructure.config;

import com.vinnot.marketing.domain.service.WeeklyPlanner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The planner's schedule from {@code app.marketing.planner.*} (#489, #513): rotating posts on Tuesday, Wednesday and Thursday
 * at 12:30 and wine days at 09:30 in Argentina, at most 4 posts a week, by default.
 */
@Configuration
public class MarketingConfiguration {

    @Bean
    WeeklyPlanner.Settings weeklyPlannerSettings(@Value("${app.marketing.planner.zone:America/Argentina/Buenos_Aires}") String zone,
            @Value("${app.marketing.planner.slot-time:12:30}") String slotTime,
            @Value("${app.marketing.planner.slot-days:TUESDAY,WEDNESDAY,THURSDAY}") String slotDays,
            @Value("${app.marketing.planner.window-days:14}") int windowDays,
            @Value("${app.marketing.planner.wine-day-time:09:30}") String wineDayTime,
            @Value("${app.marketing.planner.max-posts-per-week:4}") int maxPostsPerWeek) {
        Set<DayOfWeek> days = Arrays.stream(slotDays.split(",")).map(String::strip).filter(day -> !day.isEmpty())
                .map(day -> DayOfWeek.valueOf(day.toUpperCase(Locale.ROOT))).collect(Collectors.toSet());
        return new WeeklyPlanner.Settings(ZoneId.of(zone), LocalTime.parse(slotTime), days, windowDays, LocalTime.parse(wineDayTime),
                maxPostsPerWeek);
    }

    @Bean
    WeeklyPlanner weeklyPlanner(WeeklyPlanner.Settings settings) {
        return new WeeklyPlanner(settings);
    }
}
