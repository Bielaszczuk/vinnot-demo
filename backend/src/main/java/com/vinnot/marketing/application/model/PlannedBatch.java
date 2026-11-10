package com.vinnot.marketing.application.model;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** The drafts one planner run created, in slot order, and the window they fill (#489). */
public record PlannedBatch(List<UUID> postIds, LocalDate from, LocalDate to) {
    public PlannedBatch {
        postIds = List.copyOf(postIds);
    }
}
