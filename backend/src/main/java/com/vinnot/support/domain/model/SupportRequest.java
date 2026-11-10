package com.vinnot.support.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import java.util.Set;
import java.util.UUID;
import java.util.Objects;

/**
 * A bounded support message, never a user-controlled email header. {@code language} is the requester's language for
 * the acknowledgement ("es" or "en"); anything else falls back to Spanish.
 */
public record SupportRequest(UUID requestId, String name, String email, String subject, String message, String language) {
    private static final Set<String> SUBJECTS = Set.of("general", "support", "privacy", "report", "appeal", "partnership", "feedback", "other");
    private static final int MAX_EMAIL = 254;
    private static final int MAX_MESSAGE = 4000;
    private static final String DEFAULT_LANGUAGE = "es";
    /** Clients generate random identifiers; name-based ones are reserved for server-side markers. */
    private static final int RANDOM_UUID_VERSION = 4;
    public SupportRequest {
        if (Objects.isNull(requestId) || requestId.version() != RANDOM_UUID_VERSION) {
            throw new DomainException("INVALID_SUPPORT_REQUEST", "A random request identifier is required");
        }
        name = bounded(name, 100);
        email = bounded(email, MAX_EMAIL);
        message = bounded(message, MAX_MESSAGE);
        language = "en".equals(language) ? language : DEFAULT_LANGUAGE;
        if (name.contains("\r") || name.contains("\n")
                || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                || !SUBJECTS.contains(Objects.requireNonNullElse(subject, ""))) {
            throw new DomainException("INVALID_SUPPORT_REQUEST", "Invalid support contact details");
        }
    }
    /** A request from a client that does not send its language. */
    public SupportRequest(UUID requestId, String name, String email, String subject, String message) {
        this(requestId, name, email, subject, message, null);
    }
    private static String bounded(String value, int max) {
        if (Objects.isNull(value) || value.isBlank() || value.length() > max || value.indexOf(0) >= 0) {
            throw new DomainException("INVALID_SUPPORT_REQUEST", "Invalid support message length");
        }
        return value.trim();
    }
}
