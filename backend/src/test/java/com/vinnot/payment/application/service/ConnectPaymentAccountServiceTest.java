package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.out.AuthorizationProof;
import com.vinnot.payment.application.port.out.PaymentAccountStore;
import com.vinnot.payment.application.port.out.SellerAuthorizationGateway;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ConnectPaymentAccountServiceTest {
    private final PaymentAccountStore accounts = mock(PaymentAccountStore.class);
    private final SellerAuthorizationGateway gateway = mock(SellerAuthorizationGateway.class);
    private final AuthorizationProof proof = mock(AuthorizationProof.class);
    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final PaymentAccountNoticeService notices = mock(PaymentAccountNoticeService.class);
    private final Instant now = Instant.parse("2026-10-14T12:00:00Z");
    private final UUID owner = UUID.randomUUID();
    private final String state = "s".repeat(43);
    private final ConnectPaymentAccountService service = new ConnectPaymentAccountService(
            accounts, gateway, proof, users, notices, Clock.fixed(now, ZoneOffset.UTC));

    @BeforeEach
    void organizer() {
        when(users.findById(owner)).thenReturn(Optional.of(userBuilder().id(owner).roles(Set.of(Role.PARTNER)).build()));
        when(proof.digest(state)).thenReturn("state-hash");
    }

    @Test
    void createsExpiringProofAndStoresOnlyDigest() {
        when(proof.randomToken()).thenReturn(state, "verifier");
        when(proof.digest("verifier")).thenReturn("challenge");
        var uri = URI.create("https://auth.mercadopago.com/authorization");
        when(gateway.authorizationUrl(state, "challenge")).thenReturn(uri);
        assertThat(service.begin(owner)).isEqualTo(uri);
        verify(accounts).begin(owner, "state-hash", "verifier", now.plusSeconds(600), false);
    }

    @Test
    void consumesProofBeforeCallingProviderAndStoresVerifiedAuthorization() {
        var credentials = credentials(now.plusSeconds(1000));
        when(accounts.consume(owner, "state-hash", now)).thenReturn(Optional.of("verifier"));
        when(gateway.exchange("code", "verifier")).thenReturn(credentials);
        when(accounts.complete(owner, "state-hash", credentials)).thenReturn(true);
        service.complete(owner, state, "code");
        var order = inOrder(accounts, gateway);
        order.verify(accounts).consume(owner, "state-hash", now);
        order.verify(gateway).exchange("code", "verifier");
        order.verify(accounts).complete(owner, "state-hash", credentials);
        verify(notices).connected(owner, "state-hash");
    }

    @Test
    void rejectsMissingExpiredReplayedOrOtherOwnersStateWithoutProviderCall() {
        when(accounts.consume(owner, "state-hash", now)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.complete(owner, state, "code")).isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(gateway);
    }

    @Test
    void rejectsMalformedInputsBeforeConsumingState() {
        for (String invalid : new String[]{null, "", "x".repeat(44), "!".repeat(43)}) {
            assertThatThrownBy(() -> service.complete(owner, invalid, "code")).isInstanceOf(BusinessRuleViolationException.class);
        }
        for (String invalid : new String[]{null, " ", "c".repeat(2049)}) {
            assertThatThrownBy(() -> service.complete(owner, state, invalid)).isInstanceOf(BusinessRuleViolationException.class);
        }
        verifyNoInteractions(accounts, gateway);
    }

    @Test
    void staleCompletionAndExpiredCredentialsCannotReplaceCurrentAuthorization() {
        when(accounts.consume(owner, "state-hash", now)).thenReturn(Optional.of("verifier"));
        when(gateway.exchange("code", "verifier")).thenReturn(credentials(now));
        assertThatThrownBy(() -> service.complete(owner, state, "code")).isInstanceOf(BusinessRuleViolationException.class);
        when(gateway.exchange("code", "verifier")).thenReturn(credentials(now.plusSeconds(1000)));
        assertThatThrownBy(() -> service.complete(owner, state, "code")).isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(notices);
    }

    @Test
    void statusNeverExposesSecretsOrClaimsExpiredAuthorizationIsConnected() {
        when(accounts.authorizationExpiry(owner)).thenReturn(Optional.empty(), Optional.of(now), Optional.of(now.plusSeconds(1)));
        assertThat(service.isConnected(owner)).isFalse();
        assertThat(service.isConnected(owner)).isFalse();
        assertThat(service.isConnected(owner)).isTrue();
        when(users.findById(owner)).thenReturn(Optional.of(userBuilder().id(owner).roles(Set.of(Role.ADMIN)).build()));
        assertThat(service.isConnected(owner)).isTrue();
    }

    @Test
    void currentRolesAndAccountStateAreCheckedIncludingAtCallback() {
        for (User invalid : new User[]{userBuilder().active(false).roles(Set.of(Role.PARTNER)).build(),
                userBuilder().locked(true).roles(Set.of(Role.PARTNER)).build(),
                userBuilder().roles(Set.of(Role.USER)).build(), userBuilder().roles(Set.of(Role.MODERATOR)).build()}) {
            when(users.findById(owner)).thenReturn(Optional.of(invalid));
            assertThatThrownBy(() -> service.begin(owner)).isInstanceOf(BusinessRuleViolationException.class);
            assertThatThrownBy(() -> service.complete(owner, state, "code")).isInstanceOf(BusinessRuleViolationException.class);
            assertThatThrownBy(() -> service.isConnected(owner)).isInstanceOf(BusinessRuleViolationException.class);
        }
        when(users.findById(owner)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.begin(owner)).isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(accounts, gateway);
    }

    @Test
    void callbackResolvesOnlyServerOwnedAttemptAndReturnsItsChannel() {
        var credentials = credentials(now.plusSeconds(1000));
        when(accounts.findPending("state-hash", now)).thenReturn(Optional.of(new PaymentAccountStore.ConnectionAttempt(owner, true)));
        when(accounts.consume(owner, "state-hash", now)).thenReturn(Optional.of("verifier"));
        when(gateway.exchange("code", "verifier")).thenReturn(credentials);
        when(accounts.complete(owner, "state-hash", credentials)).thenReturn(true);
        assertThat(service.completeCallback(state, "code")).isTrue();
        verify(accounts).consume(owner, "state-hash", now);
        when(accounts.findPending("state-hash", now)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.completeCallback(state, "code")).isInstanceOf(BusinessRuleViolationException.class);
    }

    @Test
    void publicCallbackRejectsMalformedExpiredAndRevokedOwnerAttempts() {
        assertThatThrownBy(() -> service.completeCallback("bad", "code")).isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> service.completeCallback(state, "code")).isInstanceOf(BusinessRuleViolationException.class);
        when(accounts.findPending("state-hash", now)).thenReturn(Optional.of(new PaymentAccountStore.ConnectionAttempt(owner, false)));
        when(users.findById(owner)).thenReturn(Optional.of(userBuilder().roles(Set.of(Role.USER)).build()));
        assertThatThrownBy(() -> service.completeCallback(state, "code")).isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(gateway);
    }

    private User.Builder userBuilder() {
        return User.builder().id(owner).email(Email.of("organizer@example.org")).password(Password.fromHash("hash"));
    }

    private SellerCredentials credentials(Instant expires) {
        return new SellerCredentials("123", "access", "refresh", expires);
    }
}
