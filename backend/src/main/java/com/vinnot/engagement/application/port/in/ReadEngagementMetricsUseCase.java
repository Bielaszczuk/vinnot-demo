package com.vinnot.engagement.application.port.in;

import com.vinnot.engagement.application.model.EngagementMetrics;

import java.util.Set;

/** Engagement results per type for administrators (#405, S17). */
public interface ReadEngagementMetricsUseCase {
    Set<Integer> WINDOWS = Set.of(1, 7, 30);

    EngagementMetrics metrics(int days);
}
