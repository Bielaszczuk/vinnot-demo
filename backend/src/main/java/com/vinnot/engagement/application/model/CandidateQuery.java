package com.vinnot.engagement.application.model;

import com.vinnot.engagement.domain.model.PlanningMember;

import java.time.Instant;
import java.util.List;

/** One page of accounts to find candidates for, all in one time zone, at one instant. */
public record CandidateQuery(List<PlanningMember> members, Instant now) {
    public CandidateQuery {
        members = List.copyOf(members);
    }
}
