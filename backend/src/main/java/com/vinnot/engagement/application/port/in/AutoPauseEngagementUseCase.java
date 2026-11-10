package com.vinnot.engagement.application.port.in;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.List;

/**
 * Turns off an engagement type whose recipients opt out too often (#405, S17): over the window, with at least the
 * minimum number of sends, opt-outs per send above the threshold.
 */
public interface AutoPauseEngagementUseCase {
    /** @return the types paused by this check */
    List<NotificationType> pauseNoisyTypes(Instant now);
}
