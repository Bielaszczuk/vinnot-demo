package com.vinnot.user.application.command.handler;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.command.model.SocialLoginCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.SocialIdentityRepositoryPort;
import com.vinnot.user.application.port.out.SocialIdentityVerifierPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.port.out.model.SocialCredential;
import com.vinnot.user.application.port.out.model.VerifiedSocialIdentity;
import com.vinnot.user.application.service.AuthSessionIssuer;
import com.vinnot.user.domain.model.SocialIdentity;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.SocialProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import com.vinnot.user.application.service.WelcomeEmailService;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SocialLoginCommandHandlerTest {

    @Mock
    private SocialIdentityVerifierPort identityVerifier;
    @Mock
    private SocialIdentityRepositoryPort socialIdentityRepository;
    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private PasswordHashingPort passwordHashing;
    @Mock
    private AuthSessionIssuer authSessionIssuer;
    @Mock
    private WelcomeEmailService welcomeEmails;
    @Mock
    private AccountSecurityNoticeService securityNotices;

    @Test
    void createsVerifiedUserAndLinksFirstSocialIdentity() {
        VerifiedSocialIdentity identity = verifiedIdentity(true);
        when(identityVerifier.verify(any(SocialCredential.class))).thenReturn(identity);
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordHashing.hash(any())).thenReturn("unusable-hash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(authSessionIssuer.issue(any(User.class)))
                .thenReturn(sessionResponse("access-token"));
        SocialLoginCommandHandler handler = handler();

        AuthSessionResponse result = handler.execute(command());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(savedUser.isEmailVerified()).isTrue();
        assertThat(savedUser.getEmail().getValue()).isEqualTo("new.user@vinnot.com");
        assertThat(savedUser.getUsername()).matches("vinnoter-[a-f0-9]{8}");
        assertThat(savedUser.isOnboardingCompleted()).isFalse();
        assertThat(savedUser.hasPassword()).as("a social account has no password its owner knows").isFalse();
        assertThat(result.accessToken()).isEqualTo("access-token");

        ArgumentCaptor<String> passwordCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordHashing).hash(passwordCaptor.capture());
        assertThat(passwordCaptor.getValue().getBytes(StandardCharsets.UTF_8))
                .hasSizeLessThanOrEqualTo(72);

        ArgumentCaptor<SocialIdentity> identityCaptor =
                ArgumentCaptor.forClass(SocialIdentity.class);
        verify(socialIdentityRepository).save(identityCaptor.capture());
        assertThat(identityCaptor.getValue().userId()).isEqualTo(savedUser.getId());
        assertThat(identityCaptor.getValue().providerSubject()).isEqualTo("provider-user-id");
        verify(welcomeEmails).welcome(savedUser);
        verify(securityNotices, never()).socialLinked(any(), any());
    }

    @Test
    void refusesToLinkIdentityWithoutVerifiedProviderEmail() {
        when(identityVerifier.verify(any(SocialCredential.class)))
                .thenReturn(verifiedIdentity(false));
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id")).thenReturn(Optional.empty());
        SocialLoginCommandHandler handler = handler();

        assertThatThrownBy(() -> handler.execute(command()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("SOCIAL_EMAIL_REQUIRED");
        verify(userRepository, never()).save(any());
        verify(socialIdentityRepository, never()).save(any());
        verify(authSessionIssuer, never()).issue(any());
    }

    @Test
    void repeatedSocialLoginUsesTheAlreadyLinkedUser() {
        VerifiedSocialIdentity verified = verifiedIdentity(true);
        User linkedUser = verifiedUser();
        Instant linkedAt = Instant.now();
        SocialIdentity linkedIdentity = new SocialIdentity(
                UUID.randomUUID(), linkedUser.getId(), SocialProvider.GOOGLE,
                "provider-user-id", "new.user@vinnot.com", linkedAt, linkedAt);
        when(identityVerifier.verify(any(SocialCredential.class))).thenReturn(verified);
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id"))
                .thenReturn(Optional.of(linkedIdentity));
        when(userRepository.findById(linkedUser.getId())).thenReturn(Optional.of(linkedUser));
        when(authSessionIssuer.issue(linkedUser))
                .thenReturn(sessionResponse("second-access-token"));
        SocialLoginCommandHandler handler = handler();

        AuthSessionResponse result = handler.execute(command());

        assertThat(result.accessToken()).isEqualTo("second-access-token");
        assertThat(linkedUser.isOnboardingCompleted()).isTrue();
        verify(userRepository, never()).save(any());
        verify(socialIdentityRepository, never()).save(any());
        verify(welcomeEmails, never()).welcome(any());
    }

    @Test
    void everyGoogleSignInRefreshesAStoredProviderPhotoAt256PixelsAndKeepsAnUploadedOne() {
        User googlePhoto = verifiedUser();
        googlePhoto.updateProfileImage("https://lh3.googleusercontent.com/a/old=s96-c");
        User uploaded = verifiedUser();
        uploaded.updateProfileImage("/api/uploads/avatars/avatar_1.webp");
        when(identityVerifier.verify(any(SocialCredential.class))).thenReturn(new VerifiedSocialIdentity(
                SocialProvider.GOOGLE, "provider-user-id", "new.user@vinnot.com", true, "New", "User",
                "https://lh3.googleusercontent.com/a/new=s96-c"));
        when(socialIdentityRepository.findByProviderAndSubject(SocialProvider.GOOGLE, "provider-user-id"))
                .thenReturn(Optional.of(linkedIdentity(googlePhoto)), Optional.of(linkedIdentity(uploaded)));
        when(userRepository.findById(googlePhoto.getId())).thenReturn(Optional.of(googlePhoto));
        when(userRepository.findById(uploaded.getId())).thenReturn(Optional.of(uploaded));
        when(authSessionIssuer.issue(any(User.class))).thenReturn(sessionResponse("signed-in"));

        handler().execute(command());
        handler().execute(command());

        assertThat(googlePhoto.getProfileImageUrl()).isEqualTo("https://lh3.googleusercontent.com/a/new=s256-c");
        assertThat(uploaded.getProfileImageUrl()).isEqualTo("/api/uploads/avatars/avatar_1.webp");
        verify(authSessionIssuer).issue(googlePhoto);
        verify(authSessionIssuer).issue(uploaded);
    }

    @Test
    void verifiedProviderMarksAnExistingLinkedAccountAsVerified() {
        User linkedUser = User.create(
                "new.user",
                Email.of("new.user@vinnot.com"),
                Password.fromHash("existing-hash"),
                "New", "User");
        when(identityVerifier.verify(any(SocialCredential.class)))
                .thenReturn(verifiedIdentity(true));
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id"))
                .thenReturn(Optional.of(linkedIdentity(linkedUser)));
        when(userRepository.findById(linkedUser.getId())).thenReturn(Optional.of(linkedUser));
        when(authSessionIssuer.issue(linkedUser)).thenReturn(sessionResponse("verified"));

        handler().execute(command());

        assertThat(linkedUser.isEmailVerified()).isTrue();
        verify(welcomeEmails).welcome(linkedUser);
    }

    @Test
    void socialLoginRejectsLockedLinkedAccount() {
        User linkedUser = verifiedUser();
        linkedUser.lock("security review");
        when(identityVerifier.verify(any(SocialCredential.class)))
                .thenReturn(verifiedIdentity(true));
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id"))
                .thenReturn(Optional.of(linkedIdentity(linkedUser)));
        when(userRepository.findById(linkedUser.getId())).thenReturn(Optional.of(linkedUser));

        assertThatThrownBy(() -> handler().execute(command()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("ACCOUNT_LOCKED");
    }

    @Test
    void firstSocialLoginLinksToAnExistingManualAccountWithTheSameVerifiedEmail() {
        VerifiedSocialIdentity verified = verifiedIdentity(true);
        User existingUser = verifiedUser();
        when(identityVerifier.verify(any(SocialCredential.class))).thenReturn(verified);
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByEmail(existingUser.getEmail()))
                .thenReturn(Optional.of(existingUser));
        when(authSessionIssuer.issue(existingUser))
                .thenReturn(sessionResponse("linked-access-token"));
        SocialLoginCommandHandler handler = handler();

        AuthSessionResponse result = handler.execute(command());

        ArgumentCaptor<SocialIdentity> identityCaptor =
                ArgumentCaptor.forClass(SocialIdentity.class);
        verify(socialIdentityRepository).save(identityCaptor.capture());
        assertThat(identityCaptor.getValue().userId()).isEqualTo(existingUser.getId());
        assertThat(result.accessToken()).isEqualTo("linked-access-token");
        verify(userRepository, never()).save(any());
    }

    @Test
    void linkingAnUnverifiedLocalAccountInvalidatesItsPasswordAndExistingSessions() {
        User preRegistered = User.create(
                "pre.registered",
                Email.of("new.user@vinnot.com"),
                Password.fromHash("attacker-chosen-hash"),
                "Pre", "Registered");
        long previousSessionVersion = preRegistered.getSessionVersion();
        when(identityVerifier.verify(any(SocialCredential.class))).thenReturn(verifiedIdentity(true));
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByEmail(preRegistered.getEmail())).thenReturn(Optional.of(preRegistered));
        when(passwordHashing.hash(any())).thenReturn("unusable-hash");
        when(authSessionIssuer.issue(preRegistered)).thenReturn(sessionResponse("victim-session"));

        AuthSessionResponse result = handler().execute(command());

        assertThat(result.accessToken()).isEqualTo("victim-session");
        assertThat(preRegistered.getPassword().getHashedValue()).isEqualTo("unusable-hash");
        assertThat(preRegistered.hasPassword()).isFalse();
        assertThat(preRegistered.getSessionVersion()).isEqualTo(previousSessionVersion + 1);
        assertThat(preRegistered.isEmailVerified()).isTrue();
        ArgumentCaptor<String> secret = ArgumentCaptor.forClass(String.class);
        verify(passwordHashing).hash(secret.capture());
        assertThat(secret.getValue()).isNotBlank();
        verify(socialIdentityRepository).save(any(SocialIdentity.class));
    }

    @Test
    void linkingAVerifiedLocalAccountKeepsItsPasswordAndSessions() {
        User existingUser = verifiedUser();
        long previousSessionVersion = existingUser.getSessionVersion();
        when(identityVerifier.verify(any(SocialCredential.class))).thenReturn(verifiedIdentity(true));
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id")).thenReturn(Optional.empty());
        when(userRepository.findByEmail(existingUser.getEmail())).thenReturn(Optional.of(existingUser));
        when(authSessionIssuer.issue(existingUser)).thenReturn(sessionResponse("linked"));

        handler().execute(command());

        assertThat(existingUser.getPassword().getHashedValue()).isEqualTo("existing-hash");
        assertThat(existingUser.hasPassword()).as("a linked account keeps the password its owner chose").isTrue();
        assertThat(existingUser.getSessionVersion()).isEqualTo(previousSessionVersion);
        verify(passwordHashing, never()).hash(any());
        verify(welcomeEmails, never()).welcome(any());
        var linked = ArgumentCaptor.forClass(SocialIdentity.class);
        verify(socialIdentityRepository).save(linked.capture());
        verify(securityNotices).socialLinked(existingUser, linked.getValue());
    }

    @Test
    void socialLoginRequiresExplicitConfirmationBeforeReactivation() {
        User linkedUser = verifiedUser();
        linkedUser.deactivate();
        SocialIdentity linkedIdentity = linkedIdentity(linkedUser);
        when(identityVerifier.verify(any(SocialCredential.class)))
                .thenReturn(verifiedIdentity(true));
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id"))
                .thenReturn(Optional.of(linkedIdentity));
        when(userRepository.findById(linkedUser.getId())).thenReturn(Optional.of(linkedUser));
        SocialLoginCommandHandler handler = handler();

        assertThatThrownBy(() -> handler.execute(command(false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("ACCOUNT_DEACTIVATED");

        assertThat(linkedUser.isActive()).isFalse();
        verify(userRepository, never()).save(linkedUser);
        verify(authSessionIssuer, never()).issue(any());
    }

    @Test
    void socialLoginReactivatesAccountAfterExplicitConfirmation() {
        User linkedUser = verifiedUser();
        linkedUser.deactivate();
        SocialIdentity linkedIdentity = linkedIdentity(linkedUser);
        when(identityVerifier.verify(any(SocialCredential.class)))
                .thenReturn(verifiedIdentity(true));
        when(socialIdentityRepository.findByProviderAndSubject(
                SocialProvider.GOOGLE, "provider-user-id"))
                .thenReturn(Optional.of(linkedIdentity));
        when(userRepository.findById(linkedUser.getId())).thenReturn(Optional.of(linkedUser));
        when(authSessionIssuer.issue(linkedUser))
                .thenReturn(sessionResponse("reactivated"));
        SocialLoginCommandHandler handler = handler();

        AuthSessionResponse result = handler.execute(command(true));

        assertThat(linkedUser.isActive()).isTrue();
        assertThat(result.accessToken()).isEqualTo("reactivated");
        verify(authSessionIssuer).issue(linkedUser);
        verify(userRepository, never()).save(linkedUser);
    }

    private SocialLoginCommandHandler handler() {
        return new SocialLoginCommandHandler(
                identityVerifier, socialIdentityRepository, userRepository,
                passwordHashing, authSessionIssuer, welcomeEmails, securityNotices);
    }

    private AuthSessionResponse sessionResponse(String accessToken) {
        return new AuthSessionResponse(accessToken, "refresh", "Bearer", 900_000L, null);
    }

    private SocialLoginCommand command() {
        return command(false);
    }

    private SocialLoginCommand command(boolean reactivate) {
        return new SocialLoginCommand(
                SocialProvider.GOOGLE, "identity-token", null, null, null, reactivate);
    }

    private SocialIdentity linkedIdentity(User linkedUser) {
        Instant linkedAt = Instant.now();
        return new SocialIdentity(
                UUID.randomUUID(), linkedUser.getId(), SocialProvider.GOOGLE,
                "provider-user-id", "new.user@vinnot.com", linkedAt, linkedAt);
    }

    private VerifiedSocialIdentity verifiedIdentity(boolean emailVerified) {
        return new VerifiedSocialIdentity(
                SocialProvider.GOOGLE,
                "provider-user-id",
                "new.user@vinnot.com",
                emailVerified,
                "New",
                "User",
                "https://images.example/avatar.jpg");
    }

    private User verifiedUser() {
        User user = User.create(
                "new.user",
                Email.of("new.user@vinnot.com"),
                Password.fromHash("existing-hash"),
                "New",
                "User");
        user.verifyEmail();
        return user;
    }
}
