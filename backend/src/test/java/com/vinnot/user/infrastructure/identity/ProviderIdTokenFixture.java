package com.vinnot.user.infrastructure.identity;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/** Locally signed provider ID tokens served through a test JWKS, so verification stays real. */
public final class ProviderIdTokenFixture {
    public static final String GOOGLE_ISSUER = "https://accounts.google.com";
    public static final String APPLE_ISSUER = "https://appleid.apple.com";

    private final RSAKey key;

    public ProviderIdTokenFixture() {
        try {
            key = new RSAKeyGenerator(2048).keyID("provider-test-key").generate();
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public String jwks() {
        return new JWKSet(key.toPublicJWK()).toString();
    }

    public String token(String issuer, String audience, String subject, Duration expiresIn) {
        return token(issuer, audience, subject, expiresIn, null);
    }

    public String token(String issuer, String audience, String subject, Duration expiresIn, String nonce) {
        Instant now = Instant.now();
        Instant issuedAt = expiresIn.isNegative() ? now.plus(expiresIn).minus(Duration.ofMinutes(5)) : now;
        var claims = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .audience(audience)
                .subject(subject)
                .issueTime(Date.from(issuedAt))
                .expirationTime(Date.from(now.plus(expiresIn)))
                .claim("email", subject + "@example.test")
                .claim("email_verified", true);
        if (nonce != null) {
            claims.claim("nonce", nonce);
        }
        try {
            var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),
                    claims.build());
            jwt.sign(new RSASSASigner(key));
            return jwt.serialize();
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
