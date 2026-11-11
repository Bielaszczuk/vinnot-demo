package com.vinnot.wine.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * One thread for long catalog maintenance (search normalization, label image embedding), so it never delays the
 * outbox, receipts or retention jobs on the shared scheduler.
 */
@Configuration
public class CatalogMaintenanceSchedulingConfiguration {

    public static final String SCHEDULER = "catalogMaintenanceTaskScheduler";

    @Bean(name = SCHEDULER)
    public ThreadPoolTaskScheduler catalogMaintenanceTaskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("catalog-maintenance-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }
}
