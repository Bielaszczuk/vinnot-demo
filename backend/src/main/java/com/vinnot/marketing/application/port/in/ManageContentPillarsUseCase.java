package com.vinnot.marketing.application.port.in;

import com.vinnot.marketing.application.model.ContentPillarResponse;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

/** The admin's switches of a content pillar (#510). */
public interface ManageContentPillarsUseCase {

    /**
     * Turns the system approval of the pillar's pending posts on or off and returns the pillar.
     *
     * @throws EntityNotFoundException when no pillar has this code
     */
    ContentPillarResponse setAutoApprove(String code, boolean enabled);

    /**
     * Switches the pillar on or off for the planner and returns the pillar.
     *
     * @throws EntityNotFoundException when no pillar has this code
     */
    ContentPillarResponse setActive(String code, boolean enabled);
}
