package com.vinnot.community.application.port.out;

import java.time.Instant;

public interface ClosedReportRetentionPort {
    int deleteClosedBefore(Instant cutoff, int limit);
}
