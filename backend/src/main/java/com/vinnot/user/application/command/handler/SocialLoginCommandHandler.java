package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.user.application.command.model.SocialLoginCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.in.SocialLoginUseCase;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.application.port.out.SocialIdentityVerifierPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.application.port.out.model.VerifiedSocialIdentity;
import com.vinnot.user.application.service.AuthSessionIssuer;
import com.vinnot.user.application.service.WelcomeEmailService;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SocialLoginCommandHandler implements SocialLoginUseCase {

    private static final int USERNAME_SUFFIX_LENGTH = 8;

    private final SocialIdentityVerifierPort identityVerifier;
    private final SocialIdentityRepositoryPort socialIdentityRepository;
    private final UserRepositoryPort userRepository;
    private final PasswordHashingPort passwordHashing;
    private final AuthSessionIssuer authSessionIssuer;
    private final WelcomeEmailService welcomeEmails;
    private final AccountSecurityNoticeService securityNotices;

    @Override
    @Transactional
    public AuthSessionResponse execute(SocialLoginCommand command) {
        VerifiedSocialIdentity verified = identityVerifier.verify(new SocialCredential(
                command.provider(), command.token(), command.nonce(),
                command.firstName(), command.lastName()));

        User user = socialIdentityRepository
                .findByProviderAndSubject(verified.provider(), verified.subject())
                .map(this::loadLinkedUser)
                .orElseGet(() -> linkOrCreateUser(verified));

        validateAccountStatus(user, command.reactivate());
        user.enrichFromIdentityProvider(
                verified.firstName(), verified.lastName(), verified.profileImageUrl());
        if (verified.emailVerified() && !user.isEmailVerified()) {
            // A local account that never verified its email is welcomed when the provider proves it.
            user.verifyEmail();
            welcomeEmails.welcome(user);
        }
        return authSessionIssuer.issue(user);
    }

    private User loadLinkedUser(SocialIdentity identity) {
        return userRepository.findById(identity.userId())
                .orElseThrow(() -> new EntityNotFoundException("User", identity.userId()));
    }

    private User linkOrCreateUser(VerifiedSocialIdentity identity) {
        if (!identity.emailVerified() || Objects.isNull(identity.email())
                || identity.email().isBlank()) {
            throw new BusinessRuleViolationException(
                    "SOCIAL_EMAIL_REQUIRED", "The provider must supply a verified email address");
        }

        Email email = Email.of(identity.email());
        Optional<User> existing = userRepository.findByEmail(email);
        User user = existing
                .map(this::revokeUnprovenLocalCredentials)
                .orElseGet(() -> createUser(identity, email));
        SocialIdentity linked = SocialIdentity.create(
                user.getId(), identity.provider(), identity.subject(), email.getValue());
        socialIdentityRepository.save(linked);
        // An existing account learns that it can now be entered another way.
        existing.ifPresent(account -> securityNotices.socialLinked(account, linked));
        return user;
    }

    /**
     * An unverified local account may have been pre-registered by someone else with this email.
     * Its password and sessions are not trusted once the provider proves email ownership.
     */
    private User revokeUnprovenLocalCredentials(User user) {
        if (!user.isEmailVerified()) {
            user.revokePassword(Password.fromHash(unusablePasswordHash()));
        }
        return user;
    }

    private String unusablePasswordHash() {
        return passwordHashing.hash(UUID.randomUUID().toString());
    }

    private User createUser(VerifiedSocialIdentity identity, Email email) {
        String username = uniqueUsername();
        String unusablePassword = unusablePasswordHash();
        User user = User.createSocial(
                username,
                email,
                Password.fromHash(unusablePassword),
                valueOrEmpty(identity.firstName()),
                valueOrEmpty(identity.lastName()));
        user.verifyEmail();
        user.enrichFromIdentityProvider(
                identity.firstName(), identity.lastName(), identity.profileImageUrl());
        User saved = userRepository.save(user);
        welcomeEmails.welcome(saved);
        return saved;
    }

    private String uniqueUsername() {
        String candidate;
        do {
            candidate = "vinnoter-" + UUID.randomUUID().toString()
                    .substring(0, USERNAME_SUFFIX_LENGTH);
        } while (userRepository.existsByUsername(candidate));
        return candidate;
    }

    private void validateAccountStatus(User user, boolean reactivate) {
        if (user.isLocked()) {
            throw new BusinessRuleViolationException("ACCOUNT_LOCKED", "Account is locked");
        }
        if (user.isActive()) {
            return;
        }
        if (!reactivate) {
            throw new BusinessRuleViolationException(
                    "ACCOUNT_DEACTIVATED",
                    "The account is deactivated and can be reactivated after confirming sign-in");
        }
        user.activate();
    }

    private String valueOrEmpty(String value) {
        return Objects.isNull(value) ? "" : value;
    }
}
