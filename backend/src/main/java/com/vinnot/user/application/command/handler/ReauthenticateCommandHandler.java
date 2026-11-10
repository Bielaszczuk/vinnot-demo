package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.command.model.ReauthenticateCommand;
import com.vinnot.user.application.port.in.ReauthenticateUseCase;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.application.port.out.SocialIdentityVerifierPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.application.port.out.model.VerifiedSocialIdentity;
import com.vinnot.user.application.service.LoginAttemptGuard;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.SocialProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ReauthenticateCommandHandler implements ReauthenticateUseCase {
    /** Providers whose credential is an audience-bound, short-lived ID token. */
    private static final Set<SocialProvider> ID_TOKEN_PROVIDERS = Set.of(SocialProvider.GOOGLE, SocialProvider.APPLE);

    private final UserRepositoryPort users;
    private final LoginAttemptGuard passwordChecks;
    private final ReauthenticationProofPort proofs;
    private final SocialIdentityVerifierPort identityVerifier;
    private final SocialIdentityRepositoryPort socialIdentities;

    @Override
    public String execute(ReauthenticateCommand command) {
        boolean passwordSupplied = present(command.password());
        boolean providerSupplied = Objects.nonNull(command.provider()) || present(command.providerToken());
        if (passwordSupplied == providerSupplied) {
            throw denied();
        }
        User user = users.findById(command.userId()).orElseThrow(this::denied);
        if (!user.isActive() || user.isLocked() || !user.isEmailVerified()) {
            throw denied();
        }
        if (passwordSupplied) {
            confirmPassword(user, command.password());
        } else {
            confirmLinkedProvider(user, command);
        }
        return proofs.issue(user.getId(), command.sessionBinding());
    }

    /** Counts toward the temporary lockout like sign-in, and answers ACCOUNT_TEMPORARILY_LOCKED while it runs (#482). */
    private void confirmPassword(User user, String password) {
        if (!passwordChecks.passwordMatches(user, password)) {
            throw denied();
        }
    }

    /** Same verification as social login; the verified subject must already be linked to this account. */
    private void confirmLinkedProvider(User user, ReauthenticateCommand command) {
        if (Objects.isNull(command.provider()) || !ID_TOKEN_PROVIDERS.contains(command.provider())
                || !present(command.providerToken())) {
            throw denied();
        }
        // Apple binds its identity token to a client nonce; without it a captured token could be replayed.
        if (command.provider() == SocialProvider.APPLE && !present(command.nonce())) {
            throw denied();
        }
        VerifiedSocialIdentity verified;
        try {
            verified = identityVerifier.verify(new SocialCredential(
                    command.provider(), command.providerToken(), command.nonce(), null, null));
        } catch (BusinessRuleViolationException exception) {
            throw denied();
        }
        boolean linkedToUser = socialIdentities
                .findByProviderAndSubject(verified.provider(), verified.subject())
                .filter(identity -> identity.userId().equals(user.getId()))
                .isPresent();
        if (!linkedToUser) {
            throw denied();
        }
    }

    private static boolean present(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    private BusinessRuleViolationException denied() {
        return new BusinessRuleViolationException("AUTH_FAILED", "Identity confirmation failed");
    }
}
