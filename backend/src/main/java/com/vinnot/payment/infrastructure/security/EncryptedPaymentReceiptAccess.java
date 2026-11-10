package com.vinnot.payment.infrastructure.security;

import com.vinnot.payment.application.port.out.PaymentReceiptAccess;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.Objects;

/** Authenticated encryption with a purpose/environment-specific context. */
public final class EncryptedPaymentReceiptAccess implements PaymentReceiptAccess {
    private static final int MAX_TOKEN_LENGTH = 512;
    private static final Duration VALIDITY = Duration.ofDays(7);
    private final PaymentCredentialCipher cipher;
    private final Clock clock;
    private final String context;

    public EncryptedPaymentReceiptAccess(
            PaymentCredentialCipher cipher, Clock clock, String environment) {
        this.cipher = cipher;
        this.clock = clock;
        this.context = "public-payment-receipt:" + environment;
    }

    @Override
    public String issue(UUID attemptId) {
        String payload = attemptId + "|" + clock.instant().plus(VALIDITY).getEpochSecond();
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(cipher.encrypt(payload, context).getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public Optional<UUID> verify(String token) {
        if (Objects.isNull(token)
                || token.isBlank()
                || token.length() > MAX_TOKEN_LENGTH) {
            return Optional.empty();
        }
        try {
            String envelope =
                    new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] value = cipher.decrypt(envelope, context).split("\\|", -1);
            if (value.length != 2) {
                return Optional.empty();
            }
            long expiry = Long.parseLong(value[1]);
            long now = clock.instant().getEpochSecond();
            if (expiry <= now || expiry > now + VALIDITY.toSeconds()) {
                return Optional.empty();
            }
            return Optional.of(UUID.fromString(value[0]));
        } catch (IllegalArgumentException | IllegalStateException exception) {
            return Optional.empty();
        }
    }
}
