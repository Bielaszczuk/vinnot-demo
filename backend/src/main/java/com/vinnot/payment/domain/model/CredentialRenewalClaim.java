package com.vinnot.payment.domain.model;
import java.util.UUID;
public record CredentialRenewalClaim(UUID ownerId, UUID leaseId, SellerCredentials credentials) {
    @Override public String toString() { return "CredentialRenewalClaim[REDACTED]"; }
}
