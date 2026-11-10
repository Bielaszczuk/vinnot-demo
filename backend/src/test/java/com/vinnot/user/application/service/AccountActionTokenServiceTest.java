package com.vinnot.user.application.service;

import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.config.AccountActionTokenPolicy;
import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.user.application.port.out.UserActionTokenRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.Email;
import com.vinnot.user.domain.valueobject.Password;
import com.vinnot.user.domain.valueobject.PreferredLanguage;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import com.vinnot.user.domain.valueobject.UserActionTokenStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class AccountActionTokenServiceTest {

    @Mock
    private UserActionTokenRepositoryPort tokenRepository;
    @Mock
    private NotificationPort notifications;

    private AccountActionTokenService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new AccountActionTokenService(
                tokenRepository,
                notifications,
                new AccountActionTokenPolicy(
                        "https://dev.vinnot.com/",
                        Duration.ofMinutes(30),
                        Duration.ofMinutes(15),
                        Duration.ofMinutes(60)));
        user = User.create(
                "token-user", Email.of("token@vinnot.com"), Password.fromHash("hash"),
                "Token", "User");
    }

    @Test
    void verificationEmailStoresOnlyHashAndBuildsFrontendUrl() throws Exception {
        when(tokenRepository.save(any(UserActionToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.sendEmailVerification(user);

        ArgumentCaptor<UserActionToken> tokenCaptor =
                ArgumentCaptor.forClass(UserActionToken.class);
        verify(tokenRepository).invalidateActiveTokens(
                eq(user.getId()), eq(UserActionTokenType.EMAIL_VERIFICATION), any(Instant.class));
        verify(tokenRepository).save(tokenCaptor.capture());
        NotificationRequest request = enqueued();
        assertThat(request.type()).isEqualTo(NotificationType.ACCOUNT_EMAIL_VERIFICATION);
        assertThat(request.recipient().email()).isEqualTo("token@vinnot.com");
        assertThat(request.recipient().displayName()).isEqualTo("Token User");
        assertThat(request.locale()).isEqualTo(NotificationLocale.ES);
        assertThat(request.dedupeKey()).isEqualTo("ACCOUNT_EMAIL_VERIFICATION:" + tokenCaptor.getValue().id());
        String url = request.data().get(NotificationType.ACTION_URL);
        assertThat(url).startsWith("https://dev.vinnot.com/verify-email?token=");

        String rawToken = url.substring(
                "https://dev.vinnot.com/verify-email?token=".length());
        assertThat(rawToken).isNotBlank();
        assertThat(tokenCaptor.getValue().tokenHash()).isEqualTo(sha256(rawToken));
        assertThat(tokenCaptor.getValue().tokenHash()).isNotEqualTo(rawToken);
        assertThat(tokenCaptor.getValue().expiresAt()).isAfter(Instant.now());
    }

    @Test
    void consumeMarksAUsableTokenAsUsed() {
        UserActionToken token = UserActionToken.create(
                user.getId(), UserActionTokenType.PASSWORD_RESET,
                sha256Unchecked("raw-token"), Instant.now().plusSeconds(60));
        when(tokenRepository.findUsableByHashAndType(
                eq(token.tokenHash()), eq(UserActionTokenType.PASSWORD_RESET), any(Instant.class)))
                .thenReturn(Optional.of(token));
        when(tokenRepository.save(any(UserActionToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserActionToken consumed = service.consume(
                "raw-token", UserActionTokenType.PASSWORD_RESET);

        assertThat(consumed.usedAt()).isNotNull();
        assertThat(consumed.isUsableAt(Instant.now())).isFalse();
    }

    @Test
    void consumeRejectsUnknownOrExpiredToken() {
        when(tokenRepository.findUsableByHashAndType(
                any(), eq(UserActionTokenType.EMAIL_VERIFICATION), any(Instant.class)))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.consume(
                "unknown", UserActionTokenType.EMAIL_VERIFICATION))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_OR_EXPIRED_TOKEN");
    }

    @Test
    void reportsPasswordResetTokenStatusWithoutConsumingIt() {
        UserActionToken valid = UserActionToken.create(
                user.getId(), UserActionTokenType.PASSWORD_RESET,
                sha256Unchecked("valid-token"), Instant.now().plusSeconds(60));
        UserActionToken used = UserActionToken.create(
                user.getId(), UserActionTokenType.PASSWORD_RESET,
                sha256Unchecked("used-token"), Instant.now().plusSeconds(60))
                .markUsed(Instant.now());
        UserActionToken expired = UserActionToken.create(
                user.getId(), UserActionTokenType.PASSWORD_RESET,
                sha256Unchecked("expired-token"), Instant.now().minusSeconds(1));

        when(tokenRepository.findByHashAndType(
                sha256Unchecked("valid-token"), UserActionTokenType.PASSWORD_RESET))
                .thenReturn(Optional.of(valid));
        when(tokenRepository.findByHashAndType(
                sha256Unchecked("used-token"), UserActionTokenType.PASSWORD_RESET))
                .thenReturn(Optional.of(used));
        when(tokenRepository.findByHashAndType(
                sha256Unchecked("expired-token"), UserActionTokenType.PASSWORD_RESET))
                .thenReturn(Optional.of(expired));
        when(tokenRepository.findByHashAndType(
                sha256Unchecked("unknown-token"), UserActionTokenType.PASSWORD_RESET))
                .thenReturn(Optional.empty());

        assertThat(service.getStatus("valid-token", UserActionTokenType.PASSWORD_RESET))
                .isEqualTo(UserActionTokenStatus.VALID);
        assertThat(service.getStatus("used-token", UserActionTokenType.PASSWORD_RESET))
                .isEqualTo(UserActionTokenStatus.USED);
        assertThat(service.getStatus("expired-token", UserActionTokenType.PASSWORD_RESET))
                .isEqualTo(UserActionTokenStatus.EXPIRED);
        assertThat(service.getStatus("unknown-token", UserActionTokenType.PASSWORD_RESET))
                .isEqualTo(UserActionTokenStatus.INVALID);
    }

    @Test
    void sendsPasswordResetAndEmailChangeLinksToTheCorrectRecipients() {
        when(tokenRepository.save(any(UserActionToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.sendPasswordReset(user);
        NotificationRequest reset = enqueued();
        service.sendEmailChangeConfirmation(user, "new@vinnot.com");
        ArgumentCaptor<NotificationRequest> requests = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(2)).enqueue(requests.capture());
        NotificationRequest change = requests.getAllValues().getLast();

        assertThat(reset.type()).isEqualTo(NotificationType.ACCOUNT_PASSWORD_RESET);
        assertThat(reset.recipient().email()).isEqualTo("token@vinnot.com");
        assertThat(reset.data().get(NotificationType.ACTION_URL)).startsWith("https://dev.vinnot.com/reset-password?token=");
        assertThat(change.type()).isEqualTo(NotificationType.ACCOUNT_EMAIL_CHANGE_CONFIRMATION);
        assertThat(change.recipient().email()).isEqualTo("new@vinnot.com");
        assertThat(change.recipient().displayName()).isEqualTo("Token User");
        assertThat(change.data().get(NotificationType.ACTION_URL)).startsWith("https://dev.vinnot.com/confirm-email-change?token=");
        assertThat(change.dedupeKey()).isNotEqualTo(reset.dedupeKey());
    }

    @Test
    void accountLinksUseTheUsersPreferredLanguage() {
        // Issue #295: account emails were always Spanish.
        when(tokenRepository.save(any(UserActionToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        user.updatePreferences(PreferredLanguage.of("en"), null);

        service.sendEmailVerification(user);
        service.sendPasswordReset(user);
        service.sendEmailChangeConfirmation(user, "new@vinnot.com");

        ArgumentCaptor<NotificationRequest> requests = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(3)).enqueue(requests.capture());
        assertThat(requests.getAllValues()).extracting(NotificationRequest::locale)
                .containsOnly(NotificationLocale.EN);
    }

    private NotificationRequest enqueued() {
        ArgumentCaptor<NotificationRequest> request = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications).enqueue(request.capture());
        return request.getValue();
    }

    @Test
    void failsClosedIfSha256IsUnavailable() {
        try (var digest = mockStatic(MessageDigest.class)) {
            digest.when(() -> MessageDigest.getInstance("SHA-256"))
                    .thenThrow(new NoSuchAlgorithmException("missing"));

            assertThatThrownBy(() -> service.getStatus(
                    "token", UserActionTokenType.PASSWORD_RESET))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("SHA-256");
        }
    }

    private String sha256Unchecked(String value) {
        try {
            return sha256(value);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String sha256(String value) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    }
}
