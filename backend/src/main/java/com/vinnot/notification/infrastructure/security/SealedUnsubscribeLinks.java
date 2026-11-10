package com.vinnot.notification.infrastructure.security;

import com.vinnot.notification.application.port.out.UnsubscribeLinkPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Unsubscribe tokens are AES-GCM sealed "userId|category", so a link reveals nothing and cannot be altered. They do
 * not expire: mail providers and people use them long after delivery. The key is purpose-separated from the JWT
 * secret; rotating that secret invalidates old links, and the preferences page still works.
 */
@Component
public class SealedUnsubscribeLinks implements UnsubscribeLinkPort {
    private static final String PURPOSE = "vinnot-unsubscribe-v1:";
    private static final byte[] CONTEXT = "notification-unsubscribe".getBytes(StandardCharsets.UTF_8);
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final int MAX_TOKEN_LENGTH = 256;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();
    private final String website;
    private final String api;

    public SealedUnsubscribeLinks(@Value("${jwt.secret}") String secret,
            @Value("${app.auth.frontend-base-url}") String website,
            @Value("${app.notifications.public-api-base-url}") String api) {
        try {
            key = new SecretKeySpec(MessageDigest.getInstance("SHA-256")
                    .digest((PURPOSE + secret).getBytes(StandardCharsets.UTF_8)), "AES");
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("SHA-256 not available", exception);
        }
        this.website = website.replaceAll("/+$", "");
        this.api = api.replaceAll("/+$", "");
    }

    @Override
    public UnsubscribeLink issue(UUID userId, NotificationCategory category) {
        byte[] nonce = new byte[NONCE_BYTES];
        random.nextBytes(nonce);
        byte[] sealed = transform(Cipher.ENCRYPT_MODE,
                (userId + "|" + category.name()).getBytes(StandardCharsets.UTF_8), nonce);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ByteBuffer.allocate(nonce.length + sealed.length).put(nonce).put(sealed).array());
        return new UnsubscribeLink(website + "/unsubscribe?token=" + token,
                api + "/notifications/unsubscribe?token=" + token);
    }

    @Override
    public Optional<UnsubscribeTarget> verify(String token) {
        if (Objects.isNull(token) || token.isBlank() || token.length() > MAX_TOKEN_LENGTH) {
            return Optional.empty();
        }
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(token);
            if (bytes.length <= NONCE_BYTES + TAG_BITS / Byte.SIZE) {
                return Optional.empty();
            }
            var buffer = ByteBuffer.wrap(bytes);
            byte[] nonce = new byte[NONCE_BYTES];
            buffer.get(nonce);
            byte[] sealed = new byte[buffer.remaining()];
            buffer.get(sealed);
            String[] value = new String(transform(Cipher.DECRYPT_MODE, sealed, nonce), StandardCharsets.UTF_8)
                    .split("\\|", -1);
            if (value.length != 2) {
                return Optional.empty();
            }
            return Optional.of(new UnsubscribeTarget(UUID.fromString(value[0]), NotificationCategory.valueOf(value[1])));
        } catch (IllegalArgumentException | IllegalStateException exception) {
            return Optional.empty();
        }
    }

    private byte[] transform(int mode, byte[] value, byte[] nonce) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(CONTEXT);
            return cipher.doFinal(value);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Unsubscribe token sealing failed");
        }
    }
}
