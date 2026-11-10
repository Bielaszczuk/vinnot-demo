package com.vinnot.shared.application.port;

/** Parses an explicitly international number; blank input means no phone. No ownership verification. */
public interface PhoneNumberNormalizer {
    String normalizeOptional(String input);
}
