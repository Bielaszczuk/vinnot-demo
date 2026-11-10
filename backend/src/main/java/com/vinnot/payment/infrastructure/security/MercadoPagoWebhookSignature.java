package com.vinnot.payment.infrastructure.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.HexFormat;
import java.util.Objects;

/** Bounded HMAC verification; only signed payment IDs from query parameters are accepted. */
public final class MercadoPagoWebhookSignature {
    private static final int MINIMUM_SECRET_LENGTH = 32;
    private static final int MAXIMUM_SIGNATURE_LENGTH = 512;

    private static final long TOLERANCE_MILLIS = 600000;
    private final byte[] secret;
    private final Clock clock;
    public MercadoPagoWebhookSignature(String secret, Clock clock) {
        if (Objects.isNull(secret) || secret.length() < MINIMUM_SECRET_LENGTH) {
            throw new IllegalArgumentException("A webhook signing secret is required");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.clock = clock;
    }

    public boolean valid(String signature, String requestId, String paymentId) {
        if (Objects.isNull(signature) || signature.length() > MAXIMUM_SIGNATURE_LENGTH || Objects.isNull(requestId)
                || !requestId.matches("[A-Za-z0-9_-]{1,128}") || Objects.isNull(paymentId) || !paymentId.matches("[1-9][0-9]{0,19}")) {
            return false;
        }
        String timestamp = null;
        String hash = null;
        for (String part : signature.split(",")) {
            var pair = part.trim().split("=", -1);
            if (pair.length != 2) {
                return false;
            }
            if ("ts".equals(pair[0]) && Objects.isNull(timestamp)) {
                timestamp = pair[1];
            } else if ("v1".equals(pair[0]) && Objects.isNull(hash)) {
                hash = pair[1];
            } else {
                return false;
            }
        }
        if (Objects.isNull(timestamp) || !timestamp.matches("[0-9]{10}|[0-9]{13}")
                || Objects.isNull(hash) || !hash.matches("[0-9a-fA-F]{64}")) {
            return false;
        }
        long millis = Long.parseLong(timestamp);
        if (timestamp.length() == 10) {
            millis *= 1000;
        }
        if (Math.abs(clock.millis() - millis) > TOLERANCE_MILLIS) {
            return false;
        }
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            String manifest = "id:" + paymentId + ";request-id:" + requestId + ";ts:" + timestamp + ";";
            return MessageDigest.isEqual(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)), HexFormat.of().parseHex(hash));
        } catch (GeneralSecurityException unavailable) {
            throw new IllegalStateException("HMAC is unavailable", unavailable);
        }
    }
}
