package com.vinnot.payment.domain.model;
import java.util.UUID;
public record ReconciliationClaim(UUID attemptId, UUID token, long revision) { }
