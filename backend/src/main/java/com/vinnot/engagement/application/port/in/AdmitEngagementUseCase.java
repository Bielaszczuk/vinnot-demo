package com.vinnot.engagement.application.port.in;

import com.vinnot.engagement.application.model.Admission;

import java.util.Collection;
import java.util.UUID;

/**
 * The engagement budget at delivery time (#405): decides which accounts may receive an engagement push now and records
 * them in the ledger. Delivery calls it while the accounts are locked, so concurrent pushes never both pass.
 */
public interface AdmitEngagementUseCase {
    Admission.Result admit(Admission.Request request);

    /** Forgets ledger rows of a push that never reached the provider. */
    void release(String dedupeKey, Collection<UUID> userIds);
}
