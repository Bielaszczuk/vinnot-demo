package com.vinnot.engagement.application.port.out;

import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.notification.domain.model.NotificationType;

import java.util.List;

/**
 * Finds the candidates of one engagement type for a whole page of accounts in a single query (set-based: never one
 * query per account), at most one per account. Content the account already rated, keeps or was suggested is left out.
 */
public interface CandidateSourcePort {
    NotificationType type();

    List<EngagementCandidate> find(CandidateQuery query);
}
