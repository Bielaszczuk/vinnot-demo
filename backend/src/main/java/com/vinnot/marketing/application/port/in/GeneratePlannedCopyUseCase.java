package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.application.model.PlannedBatch;

import java.time.Instant;

/** Writes the copy of a planned batch in the background and tells the admins it is ready (#489). */
public interface GeneratePlannedCopyUseCase {
    /**
     * Writes the copy of every post of the batch still waiting for it; a retry keeps the copy already written.
     *
     * @return how many posts of the batch now wait for approval
     */
    int execute(PlannedBatch batch, Instant now);
}
