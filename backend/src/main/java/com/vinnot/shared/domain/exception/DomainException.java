package com.vinnot.shared.domain.exception;

public class DomainException extends RuntimeException {

    private final String code;

    /**
     * Creates a new domain exception with a message.
     *
     * @param message the error message
     */
    public DomainException(String message) {
        super(message);
        this.code = "DOMAIN_ERROR";
    }

    /**
     * Creates a new domain exception with a code and message.
     *
     * @param code    the error code
     * @param message the error message
     */
    public DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    /**
     * Creates a new domain exception with a message and cause.
     *
     * @param message the error message
     * @param cause   the underlying cause
     */
    public DomainException(String message, Throwable cause) {
        super(message, cause);
        this.code = "DOMAIN_ERROR";
    }

    /**
     * Gets the error code.
     *
     * @return the error code
     */
    public String getCode() {
        return code;
    }
}

