package com.vinnot.marketing.application.exception;

import java.util.Objects;

/**
 * A network refused or could not take a publication or a metrics read (#510). Its {@link Code} is what the publication
 * keeps as its error and tells whether another attempt may help.
 */
public class SocialPublishingException extends RuntimeException {

    /** Why the network call failed. Only {@link #RATE_LIMITED}, {@link #UNAVAILABLE} and {@link #PROCESSING_TIMEOUT} are retried. */
    public enum Code {
        NOT_CONNECTED(false),
        TOKEN_INVALID(false),
        MEDIA_REJECTED(false),
        MEDIA_NOT_PUBLIC(false),
        RATE_LIMITED(true),
        UNAVAILABLE(true),
        PROCESSING_TIMEOUT(true),
        REJECTED(false);

        private final boolean retryable;

        Code(boolean retryable) {
            this.retryable = retryable;
        }

        public boolean retryable() {
            return retryable;
        }
    }

    private final Code code;
    private final String detail;

    public SocialPublishingException(Code code, String detail) {
        this(code, detail, null);
    }

    public SocialPublishingException(Code code, String detail, Throwable cause) {
        super(Objects.requireNonNull(code, "code").name() + (Objects.isNull(detail) ? "" : ": " + detail), cause);
        this.code = code;
        this.detail = detail;
    }

    public Code code() {
        return code;
    }

    /** What the network said, for the logs; never shown as the publication's error, which is the code. */
    public String detail() {
        return detail;
    }

    public boolean retryable() {
        return code.retryable();
    }
}
