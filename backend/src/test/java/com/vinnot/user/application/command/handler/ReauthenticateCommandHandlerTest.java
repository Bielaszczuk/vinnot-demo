package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.command.model.ReauthenticateCommand;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.application.port.out.SocialIdentityVerifierPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.application.port.out.model.VerifiedSocialIdentity;
import com.vinnot.user.application.service.LoginAttemptGuard;
import com.vinnot.user.application.service.LoginAttemptRecorder;
import com.vinnot.user.domain.exception.LoginTemporarilyLockedException;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.user.domain.valueobject.SocialProvider;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReauthenticateCommandHandlerTest {
    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final PasswordHashingPort passwords = mock(PasswordHashingPort.class);
    private final ReauthenticationProofPort proofs = mock(ReauthenticationProofPort.class);
    private final SocialIdentityVerifierPort verifier = mock(SocialIdentityVerifierPort.class);
    private final SocialIdentityRepositoryPort identities = mock(SocialIdentityRepositoryPort.class);
    private final LoginAttemptRecorder attempts = mock(LoginAttemptRecorder.class);
    private final ReauthenticateCommandHandler handler = new ReauthenticateCommandHandler(
            users, new LoginAttemptGuard(passwords, attempts), proofs, verifier, identities);

    @Test
    void aWrongPasswordCountsTowardTheSignInLockoutAndARightOneClearsIt() {
        var user = admin();
        when(passwords.matches("password", "hash")).thenReturn(true);
        when(proofs.issue(user.getId(), "session")).thenReturn("proof");

        assertThatThrownBy(() -> handler.execute(new ReauthenticateCommand(user.getId(), "session", "wrong")))
                .isInstanceOf(BusinessRuleViolationException.class).extracting("code").isEqualTo("AUTH_FAILED");
        verify(attempts).failed(user);

        handler.execute(new ReauthenticateCommand(user.getId(), "session", "password"));
        verify(attempts).succeeded(user);
    }

    @Test
    void whileTheSignInLockoutRunsTheRightPasswordIsRejectedAsLocked() {
        var locked = User.builder().id(UUID.randomUUID()).email(Email.of("locked@example.test"))
                .password(Password.fromHash("hash")).emailVerified(true)
                .loginLockedUntil(Instant.now().plusSeconds(600)).build();
        when(users.findById(locked.getId())).thenReturn(Optional.of(locked));

        assertThatThrownBy(() -> handler.execute(new ReauthenticateCommand(locked.getId(), "session", "password")))
                .isInstanceOf(LoginTemporarilyLockedException.class)
                .extracting("code").isEqualTo("ACCOUNT_TEMPORARILY_LOCKED");
        verifyNoInteractions(proofs, passwords);
    }

    @Test
    void theFailureThatReachesTheLimitAnswersLocked() {
        var user = admin();
        when(attempts.failed(user)).thenReturn(Optional.of(Instant.now().plusSeconds(900)));

        assertThatThrownBy(() -> handler.execute(new ReauthenticateCommand(user.getId(), "session", "wrong")))
                .isInstanceOf(LoginTemporarilyLockedException.class);
        verifyNoInteractions(proofs);
    }

    @Test
    void issuesSessionBoundProofOnlyAfterVerifyingTheCurrentAdministrator() {
        var user = admin();
        when(passwords.matches("password", "hash")).thenReturn(true);
        when(proofs.issue(user.getId(), "session")).thenReturn("proof");
        assertThat(handler.execute(new ReauthenticateCommand(user.getId(), "session", "password"))).isEqualTo("proof");
    }

    @Test
    void rejectsMissingUserWrongEmptyOrMissingCredentialsWithoutIssuingAProof() {
        var user = admin();
        for (String password : new String[]{null, "", "  ", "wrong"}) {
            assertThatThrownBy(() -> handler.execute(new ReauthenticateCommand(user.getId(), "session", password)))
                    .isInstanceOf(BusinessRuleViolationException.class);
        }
        assertThatThrownBy(() -> handler.execute(new ReauthenticateCommand(UUID.randomUUID(), "session", "password")))
                .isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(proofs);
    }

    @Test
    void deniesDisabledLockedOrUnverifiedAccounts() {
        var user = admin();
        user.deactivate();
        denied(user);
        user.activate();
        user.lock("test");
        denied(user);
        user.unlock();
        var unverified = User.create(Email.of("unverified@example.test"), Password.fromHash("hash"), "Test", "Admin");
        unverified.addRole(Role.ADMIN);
        when(users.findById(unverified.getId())).thenReturn(Optional.of(unverified));
        denied(unverified);
        verifyNoInteractions(proofs, passwords);
    }

    @Test
    void issuesProofToAnyVerifiedAccountHolderForTheirOwnSensitiveAccountChanges() {
        var member = User.create(Email.of("member@example.test"), Password.fromHash("member-hash"), "Test", "Member");
        member.verifyEmail();
        when(users.findById(member.getId())).thenReturn(Optional.of(member));
        when(passwords.matches("password", "member-hash")).thenReturn(true);
        when(proofs.issue(member.getId(), "session")).thenReturn("member-proof");

        assertThat(handler.execute(new ReauthenticateCommand(member.getId(), "session", "password")))
                .isEqualTo("member-proof");
    }

    @Test
    void issuesTheSameSessionBoundProofForAFreshProviderTokenOfALinkedIdentity() {
        var user = admin();
        linked(user.getId(), SocialProvider.GOOGLE, "google-subject");
        when(verifier.verify(new SocialCredential(SocialProvider.GOOGLE, "id-token", null, null, null)))
                .thenReturn(verified(SocialProvider.GOOGLE, "google-subject"));
        when(proofs.issue(user.getId(), "session")).thenReturn("proof");

        assertThat(handler.execute(ReauthenticateCommand.withProvider(
                user.getId(), "session", SocialProvider.GOOGLE, "id-token", null))).isEqualTo("proof");
        verifyNoInteractions(passwords);
    }

    @Test
    void forwardsTheAppleNonceToTheSameVerifierUsedBySocialLogin() {
        var user = admin();
        linked(user.getId(), SocialProvider.APPLE, "apple-subject");
        when(verifier.verify(new SocialCredential(SocialProvider.APPLE, "identity-token", "nonce", null, null)))
                .thenReturn(verified(SocialProvider.APPLE, "apple-subject"));
        when(proofs.issue(user.getId(), "session")).thenReturn("proof");

        assertThat(handler.execute(ReauthenticateCommand.withProvider(
                user.getId(), "session", SocialProvider.APPLE, "identity-token", "nonce"))).isEqualTo("proof");
    }

    @Test
    void requiresTheAppleNonceSoACapturedIdentityTokenCannotBeReplayed() {
        var user = admin();
        assertDenied(ReauthenticateCommand.withProvider(user.getId(), "session", SocialProvider.APPLE, "identity-token", null));
        assertDenied(ReauthenticateCommand.withProvider(user.getId(), "session", SocialProvider.APPLE, "identity-token", " "));
        verifyNoInteractions(proofs, verifier);
    }

    @Test
    void rejectsInvalidExpiredOrWrongAudienceProviderTokensAsFailedConfirmation() {
        var user = admin();
        when(verifier.verify(any())).thenThrow(new BusinessRuleViolationException(
                "INVALID_SOCIAL_CREDENTIAL", "The social credential is invalid or expired"));

        assertDenied(ReauthenticateCommand.withProvider(user.getId(), "session", SocialProvider.GOOGLE, "expired", null));
        verifyNoInteractions(proofs, identities);
    }

    @Test
    void rejectsAVerifiedIdentityThatIsUnlinkedOrLinkedToAnotherAccount() {
        var user = admin();
        when(verifier.verify(any())).thenReturn(verified(SocialProvider.GOOGLE, "google-subject"));
        when(identities.findByProviderAndSubject(SocialProvider.GOOGLE, "google-subject")).thenReturn(Optional.empty());
        assertDenied(ReauthenticateCommand.withProvider(user.getId(), "session", SocialProvider.GOOGLE, "token", null));

        linked(UUID.randomUUID(), SocialProvider.GOOGLE, "google-subject");
        assertDenied(ReauthenticateCommand.withProvider(user.getId(), "session", SocialProvider.GOOGLE, "token", null));
        verifyNoInteractions(proofs);
    }

    @Test
    void requiresExactlyOneCredentialAndOnlyIdTokenProviders() {
        var user = admin();
        assertDenied(new ReauthenticateCommand(user.getId(), "session", "password", SocialProvider.GOOGLE, "token", null));
        assertDenied(new ReauthenticateCommand(user.getId(), "session", null, null, null, null));
        assertDenied(new ReauthenticateCommand(user.getId(), "session", null, SocialProvider.GOOGLE, " ", null));
        assertDenied(new ReauthenticateCommand(user.getId(), "session", null, null, "token", null));
        assertDenied(ReauthenticateCommand.withProvider(user.getId(), "session", SocialProvider.FACEBOOK, "access-token", null));
        verifyNoInteractions(proofs, verifier, passwords);
    }

    @Test
    void deniesProviderConfirmationForDisabledAccountsBeforeContactingTheProvider() {
        var user = admin();
        user.lock("test");
        assertDenied(ReauthenticateCommand.withProvider(user.getId(), "session", SocialProvider.GOOGLE, "token", null));
        verifyNoInteractions(proofs, verifier);
    }

    private void assertDenied(ReauthenticateCommand command) {
        assertThatThrownBy(() -> handler.execute(command))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("AUTH_FAILED");
    }

    private void linked(UUID userId, SocialProvider provider, String subject) {
        when(identities.findByProviderAndSubject(provider, subject))
                .thenReturn(Optional.of(SocialIdentity.create(userId, provider, subject, "linked@example.test")));
    }

    private VerifiedSocialIdentity verified(SocialProvider provider, String subject) {
        return new VerifiedSocialIdentity(provider, subject, "linked@example.test", true, null, null, null);
    }

    private void denied(User user) {
        assertThatThrownBy(() -> handler.execute(new ReauthenticateCommand(user.getId(), "session", "password")))
                .isInstanceOf(BusinessRuleViolationException.class);
    }

    private User admin() {
        var user = User.create(Email.of("admin@example.test"), Password.fromHash("hash"), "Test", "Admin");
        user.addRole(Role.ADMIN);
        user.verifyEmail();
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }
}
