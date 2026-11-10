package com.vinnot.ai.domain.valueobject;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;

/** Persisted provenance is application-owned, never accepted from a model response. */
public final class AiContentProvenance {
    public static final String KEY = "_generation";

    private AiContentProvenance() { }

    public static String fingerprint(String context) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(context.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required by the JVM", exception);
        }
    }

    public static Map<String, Object> stamp(Map<String, Object> content, String source, String fingerprint) {
        Map<String, Object> result = new HashMap<>(content);
        result.put(KEY, Map.of("source", source, "fingerprint", Objects.requireNonNullElse(fingerprint, "")));
        return result;
    }

    public static boolean isManual(Map<String, Object> content) {
        return content.get(KEY) instanceof Map<?, ?> provenance && "manual".equals(provenance.get("source"));
    }

    public static boolean matches(Map<String, Object> content, String fingerprint) {
        if (!(content.get(KEY) instanceof Map<?, ?> provenance)) {
            return false;
        }
        return "manual".equals(provenance.get("source"))
                || Objects.equals(fingerprint, provenance.get("fingerprint"));
    }
}
