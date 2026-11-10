package com.vinnot.user.application.command.handler;

import com.vinnot.user.domain.valueobject.SecurityEventType;
import com.vinnot.user.application.service.SecurityEventRecorder;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.command.model.ConfirmEmailChangeCommand;
import com.vinnot.user.application.command.model.RequestEmailChangeCommand;
import com.vinnot.user.application.port.out.RefreshTokenRepositoryPort;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.application.service.AccountActionTokenService;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.PreferredLanguage;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailChangeCommandHandlersTest {

    private static final String CURRENT_EMAIL = "current@vinnot.com";
    private static final String NEW_EMAIL = "new@vinnot.com";

    @Mock
    private UserRepositoryPort userRepository;
    @Mock
    private RefreshTokenRepositoryPort refreshTokenRepository;
    @Mock
    private NotificationPort notifications;
    @Mock
    private AccountActionTokenService tokenService;
    @Mock
    private SecurityEventRecorder securityEvents;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.create(
                "email-owner",
                Email.of(CURRENT_EMAIL),
                Password.fromHash("hash"),
                "Email",
                "Owner");
    }

    @Test
    void requestsConfirmationForAnAvailableDifferentEmail() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        RequestEmailChangeCommandHandler handler =
                new RequestEmailChangeCommandHandler(userRepository, tokenService);

        handler.execute(new RequestEmailChangeCommand(user.getId(), NEW_EMAIL));

        verify(tokenService).sendEmailChangeConfirmation(user, NEW_EMAIL);
    }

    @Test
    void rejectsAnEmailAlreadyOwnedByAnotherAccount() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByEmail(Email.of(NEW_EMAIL))).thenReturn(true);
        RequestEmailChangeCommandHandler handler =
                new RequestEmailChangeCommandHandler(userRepository, tokenService);

        assertThatThrownBy(() ->
                handler.execute(new RequestEmailChangeCommand(user.getId(), NEW_EMAIL)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("EMAIL_ALREADY_EXISTS");

        verify(tokenService, never()).sendEmailChangeConfirmation(user, NEW_EMAIL);
    }

    @Test
    void rejectsRequestingTheCurrentEmail() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> new RequestEmailChangeCommandHandler(
                userRepository, tokenService)
                .execute(new RequestEmailChangeCommand(user.getId(), CURRENT_EMAIL)))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("EMAIL_UNCHANGED");
    }

    @Test
    void confirmsEmailChangeRevokesSessionsAndNotifiesPreviousAddress() {
        UserActionToken token = emailChangeToken(NEW_EMAIL);
        when(tokenService.consume("raw-token", UserActionTokenType.EMAIL_CHANGE))
                .thenReturn(token);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        ConfirmEmailChangeCommandHandler handler = new ConfirmEmailChangeCommandHandler(
                userRepository, refreshTokenRepository, notifications, tokenService, securityEvents);

        handler.execute(new ConfirmEmailChangeCommand("raw-token"));

        assertThat(user.getEmail()).isEqualTo(Email.of(NEW_EMAIL));
        assertThat(user.isEmailVerified()).isTrue();
        verify(userRepository).save(user);
        verify(refreshTokenRepository).deleteByUserId(user.getId());
        verify(notifications).enqueue(NotificationRequest.of(NotificationType.ACCOUNT_EMAIL_CHANGED,
                NotificationRecipient.address(CURRENT_EMAIL, "Email Owner"), NotificationLocale.ES,
                Map.of("newEmail", NEW_EMAIL), "ACCOUNT_EMAIL_CHANGED:" + token.id()));
        verify(securityEvents).record(SecurityEventType.EMAIL_CHANGED, user.getId());
    }

    @Test
    void notifiesThePreviousAddressInTheUsersPreferredLanguage() {
        // Issue #295: the email-changed notice was always Spanish.
        user.updatePreferences(PreferredLanguage.of("en"), null);
        UserActionToken token = emailChangeToken(NEW_EMAIL);
        when(tokenService.consume("raw-token", UserActionTokenType.EMAIL_CHANGE))
                .thenReturn(token);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        new ConfirmEmailChangeCommandHandler(userRepository, refreshTokenRepository, notifications, tokenService, securityEvents)
                .execute(new ConfirmEmailChangeCommand("raw-token"));

        verify(notifications).enqueue(NotificationRequest.of(NotificationType.ACCOUNT_EMAIL_CHANGED,
                NotificationRecipient.address(CURRENT_EMAIL, "Email Owner"), NotificationLocale.EN,
                Map.of("newEmail", NEW_EMAIL), "ACCOUNT_EMAIL_CHANGED:" + token.id()));
    }

    @Test
    void rejectsLegacyEmailChangeTokenWithoutTargetAddress() {
        when(tokenService.consume("raw-token", UserActionTokenType.EMAIL_CHANGE))
                .thenReturn(emailChangeToken(null));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        ConfirmEmailChangeCommandHandler handler = new ConfirmEmailChangeCommandHandler(
                userRepository, refreshTokenRepository, notifications, tokenService, securityEvents);

        assertThatThrownBy(() ->
                handler.execute(new ConfirmEmailChangeCommand("raw-token")))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_EMAIL_CHANGE_TOKEN");

        verify(userRepository, never()).save(user);
        verify(refreshTokenRepository, never()).deleteByUserId(user.getId());
        verifyNoInteractions(notifications, securityEvents);
    }

    @Test
    void rejectsConfirmationWhenTheTargetEmailWasTaken() {
        when(tokenService.consume("raw-token", UserActionTokenType.EMAIL_CHANGE))
                .thenReturn(emailChangeToken(NEW_EMAIL));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(userRepository.existsByEmail(Email.of(NEW_EMAIL))).thenReturn(true);

        assertThatThrownBy(() -> new ConfirmEmailChangeCommandHandler(
                userRepository, refreshTokenRepository, notifications, tokenService, securityEvents)
                .execute(new ConfirmEmailChangeCommand("raw-token")))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("EMAIL_ALREADY_EXISTS");
    }

    private UserActionToken emailChangeToken(String targetEmail) {
        return new UserActionToken(
                UUID.randomUUID(),
                user.getId(),
                UserActionTokenType.EMAIL_CHANGE,
                "hash",
                Instant.now().plusSeconds(300),
                null,
                Instant.now(),
                targetEmail);
    }
}
