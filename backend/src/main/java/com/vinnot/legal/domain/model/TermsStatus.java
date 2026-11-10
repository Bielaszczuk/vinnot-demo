package com.vinnot.legal.domain.model;
import java.time.Instant;
/**
 * Whether the user must accept the current terms now. {@code requiredFrom} is set while a new acceptance revision is
 * in its notice period for someone who accepted an earlier one: until then they keep using the app (#309).
 */
public record TermsStatus(boolean required, Instant acceptedAt, TermsDocument document, Instant requiredFrom) {
    public TermsStatus(boolean required, Instant acceptedAt, TermsDocument document) {
        this(required, acceptedAt, document, null);
    }
}
