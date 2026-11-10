package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.ConnectPaymentAccountUseCase;
import com.vinnot.payment.application.port.out.AuthorizationProof;
import com.vinnot.payment.application.port.out.PaymentAccountStore;
import com.vinnot.payment.application.port.out.SellerAuthorizationGateway;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.valueobject.Role;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import java.util.UUID;

/**
 * Provider calls run outside database transactions. Replays require a new connection attempt. A completed
 * connection emails the organizer; the notice is keyed by the attempt, so a retried request sends it once.
 */
public class ConnectPaymentAccountService implements ConnectPaymentAccountUseCase {
    private static final Duration ATTEMPT_LIFETIME = Duration.ofMinutes(10);
    private static final int MAXIMUM_CODE_LENGTH = 2048;
    private final PaymentAccountStore accounts;
    private final SellerAuthorizationGateway gateway;
    private final AuthorizationProof proof;
    private final UserRepositoryPort users;
    private final PaymentAccountNoticeService notices;
    private final Clock clock;

    public ConnectPaymentAccountService(PaymentAccountStore accounts, SellerAuthorizationGateway gateway,
            AuthorizationProof proof, UserRepositoryPort users, PaymentAccountNoticeService notices, Clock clock) {
        this.accounts = accounts;
        this.gateway = gateway;
        this.proof = proof;
        this.users = users;
        this.notices = notices;
        this.clock = clock;
    }

    @Override
    public URI begin(UUID ownerId) {
        return begin(ownerId, false);
    }

    @Override
    public URI begin(UUID ownerId, boolean returnToApp) {
        requireOrganizer(ownerId);
        String state = proof.randomToken();
        String verifier = proof.randomToken();
        URI authorization = gateway.authorizationUrl(state, proof.digest(verifier));
        accounts.begin(ownerId, proof.digest(state), verifier, clock.instant().plus(ATTEMPT_LIFETIME), returnToApp);
        return authorization;
    }

    @Override
    public boolean completeCallback(String state, String code) {
        validateCallback(state, code);
        var attempt = accounts.findPending(proof.digest(state), clock.instant()).orElseThrow(this::invalidAttempt);
        complete(attempt.ownerId(), state, code);
        return attempt.returnToApp();
    }

    private void validateCallback(String state, String code) {
        if (Objects.isNull(state) || !state.matches("[A-Za-z0-9_-]{43}")
                || Objects.isNull(code) || code.isBlank() || code.length() > MAXIMUM_CODE_LENGTH) {
            throw invalidAttempt();
        }
    }

    @Override
    public void complete(UUID ownerId, String state, String code) {
        requireOrganizer(ownerId);
        validateCallback(state, code);
        String stateHash = proof.digest(state);
        String verifier = accounts.consume(ownerId, stateHash, clock.instant()).orElseThrow(this::invalidAttempt);
        var credentials = gateway.exchange(code, verifier);
        if (!credentials.expiresAt().isAfter(clock.instant()) || !accounts.complete(ownerId, stateHash, credentials)) {
            throw invalidAttempt();
        }
        notices.connected(ownerId, stateHash);
    }

    @Override
    public boolean isConnected(UUID ownerId) {
        requireOrganizer(ownerId);
        return accounts.authorizationExpiry(ownerId).filter(expiry -> expiry.isAfter(clock.instant())).isPresent();
    }

    private void requireOrganizer(UUID ownerId) {
        var user = users.findById(ownerId).orElseThrow(() -> new BusinessRuleViolationException(
                "PAYMENT_ACCOUNT_FORBIDDEN", "No pudimos vincular esta cuenta."));
        if (!user.isActive() || user.isLocked() || !(user.hasRole(Role.PARTNER) || user.hasRole(Role.ADMIN))) {
            throw new BusinessRuleViolationException("PAYMENT_ACCOUNT_FORBIDDEN", "Esta cuenta no puede recibir pagos de eventos.");
        }
    }

    private BusinessRuleViolationException invalidAttempt() {
        return new BusinessRuleViolationException("PAYMENT_CONNECTION_EXPIRED", "La vinculación venció o ya fue utilizada. Volvé a iniciarla.");
    }
}
