package com.vinnot.user.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationRecipient;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.config.AccountActionTokenPolicy;
import com.vinnot.user.application.port.out.UserActionTokenRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.model.UserActionToken;
import com.vinnot.user.domain.valueobject.UserActionTokenStatus;
import com.vinnot.user.domain.valueobject.UserActionTokenType;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Issues single-use account links. The email is enqueued in the caller's transaction, so a provider
 * outage never fails or rolls back the account operation; the token id is the email's dedupe key.
 */
@Service
public class AccountActionTokenService {

    private static final int TOKEN_BYTES = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserActionTokenRepositoryPort tokenRepository;
    private final NotificationPort notifications;
    private final String frontendBaseUrl;
    private final Duration verificationLifetime;
    private final Duration resetLifetime;
    private final Duration emailChangeLifetime;

    public AccountActionTokenService(
            UserActionTokenRepositoryPort tokenRepository,
            NotificationPort notifications,
            AccountActionTokenPolicy policy) {
        this.tokenRepository = tokenRepository;
        this.notifications = notifications;
        this.frontendBaseUrl = removeTrailingSlash(policy.frontendBaseUrl());
        this.verificationLifetime = policy.verificationLifetime();
        this.resetLifetime = policy.resetLifetime();
        this.emailChangeLifetime = policy.emailChangeLifetime();
    }

    public void sendEmailVerification(User user) {
        IssuedToken token = createToken(user, UserActionTokenType.EMAIL_VERIFICATION,
                verificationLifetime, null);
        notify(NotificationType.ACCOUNT_EMAIL_VERIFICATION, user.getEmail().getValue(), user,
                "/verify-email?token=", token);
    }

    public void sendPasswordReset(User user) {
        IssuedToken token = createToken(user, UserActionTokenType.PASSWORD_RESET, resetLifetime, null);
        notify(NotificationType.ACCOUNT_PASSWORD_RESET, user.getEmail().getValue(), user,
                "/reset-password?token=", token);
    }

    public void sendEmailChangeConfirmation(User user, String newEmail) {
        IssuedToken token = createToken(
                user, UserActionTokenType.EMAIL_CHANGE, emailChangeLifetime, newEmail);
        notify(NotificationType.ACCOUNT_EMAIL_CHANGE_CONFIRMATION, newEmail, user,
                "/confirm-email-change?token=", token);
    }

    public UserActionToken consume(String rawToken, UserActionTokenType type) {
        Instant now = Instant.now();
        UserActionToken token = tokenRepository
                .findUsableByHashAndType(hash(rawToken), type, now)
                .filter(candidate -> candidate.isUsableAt(now))
                .orElseThrow(() -> new DomainException(
                        "INVALID_OR_EXPIRED_TOKEN", "The token is invalid or has expired"));
        return tokenRepository.save(token.markUsed(now));
    }

    public UserActionTokenStatus getStatus(String rawToken, UserActionTokenType type) {
        Instant now = Instant.now();
        return tokenRepository.findByHashAndType(hash(rawToken), type)
                .map(token -> {
                    if (Objects.nonNull(token.usedAt())) {
                        return UserActionTokenStatus.USED;
                    }
                    if (!token.expiresAt().isAfter(now)) {
                        return UserActionTokenStatus.EXPIRED;
                    }
                    return UserActionTokenStatus.VALID;
                })
                .orElse(UserActionTokenStatus.INVALID);
    }

    private void notify(NotificationType type, String recipient, User user, String path, IssuedToken token) {
        notifications.enqueue(NotificationRequest.of(type,
                NotificationRecipient.address(recipient, user.getFullName()), localeOf(user),
                Map.of(NotificationType.ACTION_URL, frontendBaseUrl + path + token.raw()),
                type.name() + ":" + token.id()));
    }

    /** Account emails are written in the language the user reads the product in. */
    public static NotificationLocale localeOf(User user) {
        return NotificationLocale.fromLanguage(user.getPreferredLanguage().getValue());
    }

    private IssuedToken createToken(
            User user, UserActionTokenType type, Duration lifetime, String targetValue) {
        Instant now = Instant.now();
        tokenRepository.invalidateActiveTokens(user.getId(), type, now);
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        UserActionToken saved = tokenRepository.save(UserActionToken.create(
                user.getId(), type, hash(rawToken), now.plus(lifetime), targetValue));
        return new IssuedToken(saved.id(), rawToken);
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 not available", exception);
        }
    }

    private static String removeTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record IssuedToken(UUID id, String raw) { }
}
