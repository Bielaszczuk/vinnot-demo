package com.vinnot.payment.application.port.out;
import com.vinnot.payment.domain.model.CredentialRenewalClaim;
import com.vinnot.payment.domain.model.SellerCredentials;
import java.time.Instant;
import java.util.Optional;
public interface PaymentCredentialRenewalStore {
    Optional<CredentialRenewalClaim> claim(Instant now, Instant renewBefore);
    boolean complete(CredentialRenewalClaim claim, SellerCredentials credentials);
    /** Records a failed renewal; false when the claim's lease was lost and nothing changed. */
    boolean fail(CredentialRenewalClaim claim, Instant retryAt, boolean reconnectRequired);
    /**
     * Records that the organizer was asked to reconnect the claimed connection; false when that connection was
     * already noticed or has been replaced since (reconnected or renewed).
     */
    boolean markReconnectNotified(CredentialRenewalClaim claim);
}
