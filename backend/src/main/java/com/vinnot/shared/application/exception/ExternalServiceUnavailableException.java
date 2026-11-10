package com.vinnot.shared.application.exception;

public class ExternalServiceUnavailableException extends RuntimeException {

    private final String code;

    public ExternalServiceUnavailableException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
