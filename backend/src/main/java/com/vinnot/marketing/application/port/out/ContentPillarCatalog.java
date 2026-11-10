package com.vinnot.marketing.application.port.out;

import com.vinnot.marketing.domain.model.ContentPillar;
import com.vinnot.shared.domain.exception.EntityNotFoundException;

import java.util.List;

/** The seeded content pillars in rotation order (#489), with their admin switches (#510). */
public interface ContentPillarCatalog {
    List<ContentPillar> all();

    /**
     * Turns the pillar's auto-approval on or off (#510).
     *
     * @throws EntityNotFoundException when no pillar has this code
     */
    void setAutoApprove(String code, boolean enabled);

    /**
     * Switches the pillar on or off for the planner (#510).
     *
     * @throws EntityNotFoundException when no pillar has this code
     */
    void setActive(String code, boolean enabled);
}
