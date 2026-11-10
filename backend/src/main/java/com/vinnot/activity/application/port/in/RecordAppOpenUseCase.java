package com.vinnot.activity.application.port.in;

import com.vinnot.activity.application.command.model.RecordAppOpenCommand;

/** Records an app open, at most one per user in each throttle gap (30 minutes by default). */
public interface RecordAppOpenUseCase {
    /** @return whether this open was recorded; false when one was already recorded within the gap */
    boolean execute(RecordAppOpenCommand command);
}
