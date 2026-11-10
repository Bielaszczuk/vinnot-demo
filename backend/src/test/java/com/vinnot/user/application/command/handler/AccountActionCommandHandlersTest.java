package com.vinnot.user.application.command.handler;

import com.vinnot.notification.application.port.in.ManagePushDevicesUseCase;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.command.model.ForgotPasswordCommand;
import com.vinnot.user.application.command.model.LoginCommand;
import com.vinnot.user.application.command.model.RegisterUserCommand;
import com.vinnot.user.application.command.model.ResendVerificationCommand;
import com.vinnot.user.application.command.model.ResetPasswordCommand;
import com.vinnot.user.application.command.model.VerifyEmailCommand;
import com.vinnot.user.application.command.response.AuthSessionResponse;
import com.vinnot.user.application.port.out.AccountRecoveryRequestPort;
import com.vinnot.user.application.port.out.PasswordHashingPort;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.application.service.AuthSessionIssuer;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.AccountRecoveryAction;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.user.application.service.AccountSecurityNoticeService;
import com.vinnot.user.application.service.WelcomeEmailService;
import com.vinnot.user.application.service.LoginAttemptGuard;
import com.vinnot.user.application.service.LoginAttemptRecorder;
import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.user.application.port.out.LoginAttemptPort;
import com.vinnot.user.domain.exception.LoginTemporarilyLockedException;
import com.vinnot.user.domain.valueobject.SecurityEventType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountActionCommandHandlersTest {

    private static final String EMAIL = "user@vinnot.com";
    private static final String VALID_PASSWORD = "Password1";

    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private RefreshTokenRepositoryPort refreshTokenRepository;
    @Mock
    private PasswordHashingPort passwordHashing;
    @Mock
    private AccountActionTokenService tokenService;
    @Mock
    private AuthSessionIssuer authSessionIssuer;
    @Mock
    private LegalAgreementUseCase legalAgreements;
    @Mock
    private AccountRecoveryRequestPort recoveryRequests;
    @Mock
    private WelcomeEmailService welcomeEmails;
    @Mock
    private AccountSecurityNoticeService securityNotices;
    @Mock
    private ManagePushDevicesUseCase pushDevices;
    @Mock
    private LoginAttemptRecorder loginAttempts;
    @Mock
    private LoginAttemptPort loginAttemptPort;
    @Mock
    private SecurityEventRecorder securityEvents;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.create(
                "wine-lover", Email.of(EMAIL), Password.fromHash("old-hash"),
                "Wine", "Lover");
    }

    @Test
    void registerCreatesUnverifiedUserAndSendsVerification() {
        when(passwordHashing.hash(VALID_PASSWORD)).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RegisterUserCommandHandler handler = new RegisterUserCommandHandler(
                userRepository, passwordHashing, tokenService, legalAgreements);
        UUID userId = handler.execute(new RegisterUserCommand(
                "wine-lover", EMAIL, VALID_PASSWORD, "Wine", "Lover"));

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(userId).isEqualTo(savedUser.getId());
        assertThat(savedUser.isEmailVerified()).isFalse();
        assertThat(savedUser.getPassword().getHashedValue()).isEqualTo("encoded-password");
        verify(tokenService).sendEmailVerification(savedUser);
    }

    @Test
    void registerRejectsEmailAlreadyCreatedBySocialLogin() {
        when(userRepository.existsByEmail(Email.of(EMAIL))).thenReturn(true);
        RegisterUserCommandHandler handler = new RegisterUserCommandHandler(
                userRepository, passwordHashing, tokenService, legalAgreements);

        assertThatThrownBy(() -> handler.execute(new RegisterUserCommand(
                "wine-lover", EMAIL, VALID_PASSWORD, "Wine", "Lover")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("EMAIL_ALREADY_EXISTS");

        verify(passwordHashing, never()).hash(any());
        verify(userRepository, never()).save(any());
        verify(tokenService, never()).sendEmailVerification(any());
    }

    @Test
    void registerRejectsDuplicatedUsername() {
        when(userRepository.existsByUsername("wine-lover")).thenReturn(true);
        RegisterUserCommandHandler handler = new RegisterUserCommandHandler(
                userRepository, passwordHashing, tokenService, legalAgreements);

        assertThatThrownBy(() -> handler.execute(new RegisterUserCommand(
                "wine-lover", EMAIL, VALID_PASSWORD, "Wine", "Lover")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("USERNAME_ALREADY_EXISTS");

        verify(passwordHashing, never()).hash(any());
        verify(userRepository, never()).save(any());
        verify(tokenService, never()).sendEmailVerification(any());
    }

    @Test
    void loginRejectsUnverifiedEmailBeforeIssuingSession() {
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashing.matches(VALID_PASSWORD, "old-hash")).thenReturn(true);
        LoginCommandHandler handler = loginHandler();

        assertThatThrownBy(() -> handler.execute(new LoginCommand(
                EMAIL, VALID_PASSWORD, false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("EMAIL_NOT_VERIFIED");
        verify(authSessionIssuer, never()).issue(any());
    }

    @Test
    void loginIssuesSessionForVerifiedCredentials() {
        user.verifyEmail();
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashing.matches(VALID_PASSWORD, "old-hash")).thenReturn(true);
        when(authSessionIssuer.issue(user)).thenReturn(sessionResponse("access"));
        LoginCommandHandler handler = loginHandler();

        AuthSessionResponse result = handler.execute(new LoginCommand(
                EMAIL, VALID_PASSWORD, false));

        assertThat(result.accessToken()).isEqualTo("access");
    }

    @Test
    void loginRejectsLockedAccountsAfterValidatingCredentials() {
        user.verifyEmail();
        user.lock("security review");
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashing.matches(VALID_PASSWORD, "old-hash")).thenReturn(true);

        assertThatThrownBy(() -> loginHandler()
                .execute(new LoginCommand(EMAIL, VALID_PASSWORD, false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("ACCOUNT_LOCKED");
    }

    @Test
    void loginOffersReactivationOnlyAfterValidCredentials() {
        user.verifyEmail();
        user.deactivate();
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashing.matches(VALID_PASSWORD, "old-hash")).thenReturn(true);
        LoginCommandHandler handler = loginHandler();

        assertThatThrownBy(() -> handler.execute(new LoginCommand(
                EMAIL, VALID_PASSWORD, false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("ACCOUNT_DEACTIVATED");

        assertThat(user.isActive()).isFalse();
        verify(userRepository, never()).save(user);
        verify(authSessionIssuer, never()).issue(any());
    }

    @Test
    void loginReactivatesAccountAfterExplicitConfirmation() {
        user.verifyEmail();
        user.deactivate();
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashing.matches(VALID_PASSWORD, "old-hash")).thenReturn(true);
        when(authSessionIssuer.issue(user)).thenReturn(sessionResponse("reactivated"));
        LoginCommandHandler handler = loginHandler();

        AuthSessionResponse result = handler.execute(new LoginCommand(
                EMAIL, VALID_PASSWORD, true));

        assertThat(user.isActive()).isTrue();
        assertThat(result.accessToken()).isEqualTo("reactivated");
        verify(authSessionIssuer).issue(user);
    }

    private LoginCommandHandler loginHandler() {
        return new LoginCommandHandler(
                userRepository, new LoginAttemptGuard(passwordHashing, loginAttempts), authSessionIssuer, securityEvents);
    }

    @Test
    void loginRecordsTheSuccessAndClearsEarlierFailures() {
        user.verifyEmail();
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashing.matches(VALID_PASSWORD, "old-hash")).thenReturn(true);
        when(authSessionIssuer.issue(user)).thenReturn(sessionResponse("access"));

        loginHandler().execute(new LoginCommand(EMAIL, VALID_PASSWORD, false));

        verify(loginAttempts).succeeded(user);
        verify(securityEvents).record(SecurityEventType.LOGIN_SUCCEEDED, user.getId());
    }

    @Test
    void loginWithAnUnknownIdentifierSpendsAHashComparisonAndFailsLikeAWrongPassword() {
        when(userRepository.findByEmailOrUsername("nobody@vinnot.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> loginHandler().execute(new LoginCommand("nobody@vinnot.com", "guess", false)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("AUTH_FAILED");

        verify(passwordHashing).matches(eq("guess"), startsWith("$2a$10$"));
        verify(loginAttempts).unknownAccount();
        verify(authSessionIssuer, never()).issue(any());
        verifyNoInteractions(securityEvents);
    }

    @Test
    void aWrongPasswordIsCountedAndTheFailureThatReachesTheLimitAnswersLocked() {
        user.verifyEmail();
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashing.matches("wrong-password", "old-hash")).thenReturn(false);
        when(loginAttempts.failed(user)).thenReturn(Optional.empty(), Optional.of(Instant.now().plusSeconds(900)));

        assertThatThrownBy(() -> loginHandler().execute(new LoginCommand(EMAIL, "wrong-password", false)))
                .extracting("code").isEqualTo("AUTH_FAILED");
        assertThatThrownBy(() -> loginHandler().execute(new LoginCommand(EMAIL, "wrong-password", false)))
                .isInstanceOf(LoginTemporarilyLockedException.class)
                .extracting("code").isEqualTo("ACCOUNT_TEMPORARILY_LOCKED");
        verify(authSessionIssuer, never()).issue(any());
        verify(securityEvents, never()).record(SecurityEventType.LOGIN_SUCCEEDED, user.getId());
    }

    @Test
    void whileTemporarilyLockedEvenTheRightPasswordGetsNoSession() {
        User locked = User.builder().id(user.getId()).email(Email.of(EMAIL)).password(Password.fromHash("old-hash"))
                .username("wine-lover").firstName("Wine").lastName("Lover").emailVerified(true)
                .loginLockedUntil(Instant.now().plusSeconds(600)).build();
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(locked));

        assertThatThrownBy(() -> loginHandler().execute(new LoginCommand(EMAIL, VALID_PASSWORD, false)))
                .isInstanceOf(LoginTemporarilyLockedException.class);

        verify(passwordHashing, never()).matches(any(), any());
        verify(authSessionIssuer, never()).issue(any());
        verifyNoInteractions(loginAttempts, securityEvents);
    }

    private AuthSessionResponse sessionResponse(String accessToken) {
        return new AuthSessionResponse(accessToken, "refresh", "Bearer", 900_000L, null);
    }

    @Test
    void invalidPasswordCannotRevealOrReactivateDeactivatedAccount() {
        user.verifyEmail();
        user.deactivate();
        when(userRepository.findByEmailOrUsername(EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashing.matches("wrong-password", "old-hash")).thenReturn(false);
        LoginCommandHandler handler = loginHandler();

        assertThatThrownBy(() -> handler.execute(new LoginCommand(
                EMAIL, "wrong-password", true)))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code")
                .isEqualTo("AUTH_FAILED");

        assertThat(user.isActive()).isFalse();
        verify(userRepository, never()).save(user);
        verify(authSessionIssuer, never()).issue(any());
    }

    @Test
    void forgotPasswordOnlyQueuesTheNormalizedAddress() {
        // Issue #295: looking the account up at request time revealed whether it exists.
        new ForgotPasswordCommandHandler(recoveryRequests).execute(new ForgotPasswordCommand(" User@Vinnot.com "));

        verify(recoveryRequests).request(AccountRecoveryAction.PASSWORD_RESET, Email.of(EMAIL));
        verifyNoInteractions(userRepository, tokenService);
    }

    @Test
    void resetPasswordConsumesTokenAndRevokesExistingSessions() {
        UserActionToken token = actionToken(UserActionTokenType.PASSWORD_RESET);
        when(tokenService.consume("raw-token", UserActionTokenType.PASSWORD_RESET))
                .thenReturn(token);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordHashing.hash(VALID_PASSWORD)).thenReturn("new-hash");
        ResetPasswordCommandHandler handler = new ResetPasswordCommandHandler(
                userRepository, refreshTokenRepository, tokenService, passwordHashing, securityNotices, pushDevices,
                loginAttemptPort, securityEvents);

        handler.execute(new ResetPasswordCommand("raw-token", VALID_PASSWORD));

        assertThat(user.getPassword().getHashedValue()).isEqualTo("new-hash");
        verify(userRepository).save(user);
        verify(refreshTokenRepository).deleteByUserId(user.getId());
        verify(pushDevices).forgetUser(user.getId());
        verify(securityNotices).passwordChanged(user);
        verify(loginAttemptPort).reset(user.getId());
        verify(securityEvents).record(SecurityEventType.PASSWORD_RESET, user.getId());
    }

    @Test
    void verifyEmailConsumesTokenAndPersistsVerifiedUser() {
        UserActionToken token = actionToken(UserActionTokenType.EMAIL_VERIFICATION);
        when(tokenService.consume("raw-token", UserActionTokenType.EMAIL_VERIFICATION))
                .thenReturn(token);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        VerifyEmailCommandHandler handler = new VerifyEmailCommandHandler(
                userRepository, tokenService, welcomeEmails);

        handler.execute(new VerifyEmailCommand("raw-token"));

        assertThat(user.isEmailVerified()).isTrue();
        verify(userRepository).save(user);
        verify(welcomeEmails).welcome(user);
    }

    @Test
    void verifyingAnAlreadyVerifiedEmailSendsNoSecondWelcome() {
        user.verifyEmail();
        when(tokenService.consume("raw-token", UserActionTokenType.EMAIL_VERIFICATION))
                .thenReturn(actionToken(UserActionTokenType.EMAIL_VERIFICATION));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        new VerifyEmailCommandHandler(userRepository, tokenService, welcomeEmails)
                .execute(new VerifyEmailCommand("raw-token"));

        verifyNoInteractions(welcomeEmails);
    }

    @Test
    void resendVerificationOnlyQueuesTheNormalizedAddress() {
        // Issue #295: looking the account up at request time revealed whether it exists.
        new ResendVerificationCommandHandler(recoveryRequests).execute(new ResendVerificationCommand(EMAIL));

        verify(recoveryRequests).request(AccountRecoveryAction.EMAIL_VERIFICATION, Email.of(EMAIL));
        verifyNoInteractions(userRepository, tokenService);
    }

    private UserActionToken actionToken(UserActionTokenType type) {
        return new UserActionToken(
                UUID.randomUUID(), user.getId(), type, "hash",
                Instant.now().plusSeconds(300), null, Instant.now());
    }
}
