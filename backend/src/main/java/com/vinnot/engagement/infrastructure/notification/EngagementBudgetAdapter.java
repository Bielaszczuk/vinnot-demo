package com.vinnot.engagement.infrastructure.notification;

import com.vinnot.engagement.application.model.Admission.Account;
import com.vinnot.engagement.application.model.Admission.Request;
import com.vinnot.engagement.application.model.Admission.Result;
import com.vinnot.engagement.application.port.in.AdmitEngagementUseCase;
import com.vinnot.notification.application.port.out.EngagementBudgetPort;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Notifications' engagement budget port, answered by the engagement module (#405). */
@Component
public class EngagementBudgetAdapter implements EngagementBudgetPort {
    private final AdmitEngagementUseCase admissions;

    public EngagementBudgetAdapter(AdmitEngagementUseCase admissions) {
        this.admissions = admissions;
    }

    @Override
    public EngagementBudgetPort.Admission admit(Push push, List<EngagementBudgetPort.Recipient> recipients, Instant at) {
        Result result = admissions.admit(new Request(push.type(), push.dedupeKey(), push.contentRef(),
                recipients.stream().map(recipient -> new Account(recipient.userId(), recipient.zone())).toList(), at));
        return new EngagementBudgetPort.Admission(result.admitted(), result.overBudget(), result.fatigued(), result.heldOut());
    }

    @Override
    public void release(String dedupeKey, Collection<UUID> userIds) {
        admissions.release(dedupeKey, userIds);
    }
}
