package com.vinnot.notification.application.port.in;

import com.vinnot.notification.application.model.PushMetrics;
import com.vinnot.notification.application.model.PushSettings;
import com.vinnot.notification.domain.model.NotificationType;

import java.util.Set;
import java.util.UUID;

/** Administrators' push controls (#310): per-type switches and delivery metrics. */
public interface ManagePushTypesUseCase {
    /** The windows the metrics can be read for, in days. */
    Set<Integer> METRIC_WINDOWS = Set.of(1, 7, 30);

    PushSettings settings();

    /** Turns a pushed type on or off and audits the change; a non-push type is refused. */
    PushSettings setEnabled(NotificationType type, boolean enabled, UUID actorId);

    PushMetrics metrics(int days);
}
