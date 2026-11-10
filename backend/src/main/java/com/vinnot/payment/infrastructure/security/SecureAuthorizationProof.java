package com.vinnot.payment.infrastructure.security;

import com.vinnot.payment.application.port.out.AuthorizationProof;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

public final class SecureAuthorizationProof implements AuthorizationProof {
    private static final int TOKEN_BYTES = 32;
    private final SecureRandom random = new SecureRandom();

    @Override
    public String randomToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Override
    public String digest(String value) {
        try {
            return Base64.getUrlEncoder().withoutPadding().encodeToString(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Required SHA-256 algorithm unavailable");
        }
    }
}
