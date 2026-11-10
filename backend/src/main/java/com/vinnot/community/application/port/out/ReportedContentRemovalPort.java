package com.vinnot.community.application.port.out;

import com.vinnot.community.domain.model.ContentTarget;

import java.util.UUID;

public interface ReportedContentRemovalPort {
    /** Removes the content as a moderator; its author is told why, from the report's reason. */
    void remove(ContentTarget target, UUID moderatorId, String reportReason);
}
