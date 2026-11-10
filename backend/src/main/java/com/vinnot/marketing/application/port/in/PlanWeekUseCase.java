package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.application.model.PlanResult;

import java.time.Instant;

/** Fills the next two weeks with posts (#489); the Monday job and the admin's "plan now" button both call it. */
public interface PlanWeekUseCase {
    PlanResult execute(Instant now);
}
