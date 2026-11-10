package com.vinnot.notification.infrastructure.outbox;

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

/**
 * Seals access credentials (verification and reset links) while they wait in the outbox, so a
 * database-only leak cannot use them. The key is purpose-separated from the JWT secret, so no new
 * deployment secret is required; rotating that secret makes pending sealed messages undeliverable.
 */
@Component
public class NotificationPayloadSealer {
    private static final String PURPOSE = "vinnot-notification-payload-v1:";
    private static final String VERSION = "v1:";
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public NotificationPayloadSealer(@Value("${jwt.secret}") String secret) {
        try {
            key = new SecretKeySpec(MessageDigest.getInstance("SHA-256")
                    .digest((PURPOSE + secret).getBytes(StandardCharsets.UTF_8)), "AES");
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("SHA-256 not available", exception);
        }
    }

    /** The context binds the value to its message and field, so sealed values cannot be swapped. */
    public String seal(String value, String context) {
        byte[] nonce = new byte[NONCE_BYTES];
        random.nextBytes(nonce);
        byte[] sealed = transform(Cipher.ENCRYPT_MODE, value.getBytes(StandardCharsets.UTF_8), nonce, context);
        return VERSION + Base64.getEncoder().encodeToString(
                ByteBuffer.allocate(nonce.length + sealed.length).put(nonce).put(sealed).array());
    }

    public String open(String envelope, String context) {
        if (!envelope.startsWith(VERSION)) {
            throw new IllegalStateException("Unsupported notification payload envelope");
        }
        byte[] bytes = Base64.getDecoder().decode(envelope.substring(VERSION.length()));
        if (bytes.length <= NONCE_BYTES + TAG_BITS / Byte.SIZE) {
            throw new IllegalStateException("Invalid notification payload envelope");
        }
        var buffer = ByteBuffer.wrap(bytes);
        byte[] nonce = new byte[NONCE_BYTES];
        buffer.get(nonce);
        byte[] sealed = new byte[buffer.remaining()];
        buffer.get(sealed);
        return new String(transform(Cipher.DECRYPT_MODE, sealed, nonce, context), StandardCharsets.UTF_8);
    }

    private byte[] transform(int mode, byte[] value, byte[] nonce, String context) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(context.getBytes(StandardCharsets.UTF_8));
            return cipher.doFinal(value);
        } catch (GeneralSecurityException exception) {
            // Never include the value or the provider message.
            throw new IllegalStateException("Notification payload sealing failed");
        }
    }
}
