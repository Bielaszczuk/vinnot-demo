package com.vinnot.marketing.application.port.in;

import java.time.Instant;

/** Reads the metrics of the recent publications (#510). */
public interface CollectSocialMetricsUseCase {

    /** Stores today's snapshot of every recent publication its network gives metrics for; returns how many were stored. */
    int collect(Instant now);
}
