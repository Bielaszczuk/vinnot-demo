package com.vinnot.engagement.application.service;

import com.vinnot.activity.application.port.in.ReadActivitySignalsUseCase;
import com.vinnot.engagement.application.model.Admission;
import com.vinnot.engagement.application.model.LedgerEntry;
import com.vinnot.engagement.application.port.in.AdmitEngagementUseCase;
import com.vinnot.engagement.application.port.out.EngagementLedgerPort;
import com.vinnot.engagement.domain.model.EngagementHistory;
import com.vinnot.engagement.domain.model.EngagementPolicy;
import com.vinnot.engagement.domain.model.EngagementVerdict;
import com.vinnot.engagement.domain.model.Holdout;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The engagement budget at delivery (#405). Holdout accounts are recorded (for measurement) and dropped; the others
 * pass when the policy allows a push at this instant in their time zone, and are recorded. It runs in delivery's
 * reservation transaction, so its reads see every engagement push already recorded and its rows commit with it.
 */
@Service
public class EngagementAdmissionService implements AdmitEngagementUseCase {
    private final EngagementHistoryReader histories;
    private final ReadActivitySignalsUseCase activity;
    private final EngagementLedgerPort ledger;
    private final EngagementPolicy policy;
    private final Holdout holdout;

    public EngagementAdmissionService(EngagementHistoryReader histories, ReadActivitySignalsUseCase activity,
            EngagementLedgerPort ledger, EngagementPolicy policy, Holdout holdout) {
        this.histories = histories;
        this.activity = activity;
        this.ledger = ledger;
        this.policy = policy;
        this.holdout = holdout;
    }

    @Override
    public Admission.Result admit(Admission.Request request) {
        if (request.recipients().isEmpty()) {
            return new Admission.Result(List.of(), 0, 0, 0);
        }
        List<UUID> ids = request.recipients().stream().map(Admission.Account::userId).toList();
        Map<UUID, Instant> lastActive = new HashMap<>();
        activity.rhythms(ids).forEach((id, rhythm) -> lastActive.put(id, rhythm.lastActiveAt()));
        Map<UUID, EngagementHistory> known = histories.read(ids, lastActive);
        List<UUID> admitted = new ArrayList<>();
        List<LedgerEntry> entries = new ArrayList<>();
        int overBudget = 0;
        int fatigued = 0;
        int heldOut = 0;
        for (Admission.Account recipient : request.recipients()) {
            UUID id = recipient.userId();
            if (holdout.includes(id)) {
                heldOut++;
                entries.add(entry(request, id, true));
                continue;
            }
            EngagementVerdict verdict = policy.admits(request.type(), known.get(id), recipient.zone(), request.at());
            if (verdict == EngagementVerdict.ALLOWED) {
                admitted.add(id);
                entries.add(entry(request, id, false));
            } else if (verdict == EngagementVerdict.OVER_BUDGET) {
                overBudget++;
            } else {
                fatigued++;
            }
        }
        ledger.record(entries);
        return new Admission.Result(admitted, overBudget, fatigued, heldOut);
    }

    @Override
    public void release(String dedupeKey, Collection<UUID> userIds) {
        if (!userIds.isEmpty()) {
            ledger.release(dedupeKey, userIds);
        }
    }

    private static LedgerEntry entry(Admission.Request request, UUID userId, boolean heldOut) {
        return new LedgerEntry(userId, request.type(), request.dedupeKey(), request.contentRef(), request.at(), heldOut);
    }
}
