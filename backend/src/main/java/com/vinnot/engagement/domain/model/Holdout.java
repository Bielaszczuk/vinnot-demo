package com.vinnot.engagement.domain.model;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

/**
 * The measurement holdout (#405, S12): a deterministic share of accounts, chosen by a hash of the account id, that
 * never gets engagement pushes, so their activity can be compared with everyone else's. The same account always falls
 * in the same bucket, on every instance and after every restart.
 */
public record Holdout(int percent) {
    private static final int BUCKETS = 100;
    private static final int BYTE_MASK = 0xff;

    public Holdout {
        if (percent < 0 || percent > BUCKETS) {
            throw new IllegalArgumentException("app.engagement.holdout-percent must be between 0 and 100");
        }
    }

    public boolean includes(UUID userId) {
        return percent > 0 && bucket(userId) < percent;
    }

    /** 0-99 from the first four bytes of the SHA-256 of the id's text. */
    static int bucket(UUID userId) {
        byte[] digest = sha256(userId.toString().getBytes(StandardCharsets.US_ASCII));
        int value = 0;
        for (int index = 0; index < Integer.BYTES; index++) {
            value = (value << Byte.SIZE) | (digest[index] & BYTE_MASK);
        }
        return Math.floorMod(value, BUCKETS);
    }

    private static byte[] sha256(byte[] bytes) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(bytes);
        } catch (NoSuchAlgorithmException missing) {
            throw new IllegalStateException("SHA-256 is required by the Java platform", missing);
        }
    }
}
