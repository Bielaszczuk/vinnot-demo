package com.vinnot.marketing.infrastructure.accounts;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Objects;

/**
 * Versioned AES-256-GCM envelope for the connected accounts' tokens (#510 S5), authenticated against its context (the
 * network and the field) so a ciphertext cannot be moved to another network or field. It mirrors the Mercado Pago
 * credential cipher with its own key ({@code app.marketing.accounts.encryption-key}, base64 of 32 bytes). Without a key
 * the application starts, but nothing can be encrypted or decrypted; a malformed key stops startup.
 */
public final class SocialAccountCipher {
    private static final String PREFIX = "v1:";
    private static final int KEY_BYTES = 32;
    private static final int NONCE_BYTES = 12;
    private static final int TAG_BITS = 128;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public SocialAccountCipher(String encodedKey) {
        if (Objects.isNull(encodedKey) || encodedKey.isBlank()) {
            key = null;
            return;
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(encodedKey.strip());
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("MARKETING_ACCOUNTS_ENCRYPTION_KEY must be the base64 of 32 random bytes");
        }
        if (decoded.length != KEY_BYTES) {
            throw new IllegalArgumentException("MARKETING_ACCOUNTS_ENCRYPTION_KEY must be the base64 of 32 random bytes");
        }
        key = new SecretKeySpec(decoded, "AES");
    }

    /** False while no key is configured. */
    public boolean available() {
        return Objects.nonNull(key);
    }

    public String encrypt(String value, String context) {
        byte[] nonce = new byte[NONCE_BYTES];
        random.nextBytes(nonce);
        byte[] encrypted = transform(Cipher.ENCRYPT_MODE, value.getBytes(StandardCharsets.UTF_8), nonce, context);
        return PREFIX + Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + encrypted.length).put(nonce).put(encrypted).array());
    }

    public String decrypt(String envelope, String context) {
        if (!envelope.startsWith(PREFIX)) {
            throw new IllegalStateException("Unsupported social account token envelope");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(envelope.substring(PREFIX.length()));
        } catch (IllegalArgumentException invalid) {
            throw new IllegalStateException("Invalid social account token envelope");
        }
        if (bytes.length <= NONCE_BYTES + TAG_BITS / Byte.SIZE) {
            throw new IllegalStateException("Invalid social account token envelope");
        }
        ByteBuffer buffer = ByteBuffer.wrap(bytes);
        byte[] nonce = new byte[NONCE_BYTES];
        buffer.get(nonce);
        byte[] encrypted = new byte[buffer.remaining()];
        buffer.get(encrypted);
        return new String(transform(Cipher.DECRYPT_MODE, encrypted, nonce, context), StandardCharsets.UTF_8);
    }

    private byte[] transform(int mode, byte[] value, byte[] nonce, String context) {
        if (!available()) {
            throw new IllegalStateException("Social account tokens need MARKETING_ACCOUNTS_ENCRYPTION_KEY");
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, key, new GCMParameterSpec(TAG_BITS, nonce));
            cipher.updateAAD(context.getBytes(StandardCharsets.UTF_8));
            return cipher.doFinal(value);
        } catch (GeneralSecurityException failure) {
            // Never chain the provider exception: it says nothing useful and must not carry key material.
            throw new IllegalStateException("Social account token encryption failed");
        }
    }
}
