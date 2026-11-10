package com.vinnot.payment.infrastructure.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/** Versioned AES-GCM envelope, authenticated against owner and field to prevent ciphertext swaps. */
public final class PaymentCredentialCipher {
    private static final int KEY_BYTES = 32;
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public PaymentCredentialCipher(String encodedKey) {
        byte[] decoded = Base64.getDecoder().decode(encodedKey);
        if (decoded.length != KEY_BYTES) {
            throw new IllegalArgumentException("Payment encryption requires a dedicated 256-bit key");
        }
        key = new SecretKeySpec(decoded, "AES");
    }

    public String encrypt(String value, String context) {
        byte[] nonce = new byte[NONCE_BYTES];
        random.nextBytes(nonce);
        byte[] encrypted = transform(Cipher.ENCRYPT_MODE, value.getBytes(StandardCharsets.UTF_8), nonce, context);
        return "v1:" + Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + encrypted.length)
                .put(nonce).put(encrypted).array());
    }

    public String decrypt(String envelope, String context) {
        if (!envelope.startsWith("v1:")) {
            throw new IllegalArgumentException("Unsupported payment credential envelope");
        }
        byte[] bytes = Base64.getDecoder().decode(envelope.substring("v1:".length()));
        if (bytes.length <= NONCE_BYTES + TAG_BITS / Byte.SIZE) {
            throw new IllegalArgumentException("Invalid payment credential envelope");
        }
        var buffer = ByteBuffer.wrap(bytes);
        byte[] nonce = new byte[NONCE_BYTES];
        buffer.get(nonce);
        byte[] encrypted = new byte[buffer.remaining()];
        buffer.get(encrypted);
        return new String(transform(Cipher.DECRYPT_MODE, encrypted, nonce, context), StandardCharsets.UTF_8);
    }

    private byte[] transform(int mode, byte[] value, byte[] nonce, String context) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(context.getBytes(StandardCharsets.UTF_8));
            return cipher.doFinal(value);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Payment credential encryption failed");
        }
    }
}
