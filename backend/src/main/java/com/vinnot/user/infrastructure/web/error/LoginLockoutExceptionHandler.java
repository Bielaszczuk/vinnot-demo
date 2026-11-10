package com.vinnot.user.infrastructure.web.error;

import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler.ErrorResponse;
import com.vinnot.user.domain.exception.LoginTemporarilyLockedException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Clock;
import java.time.Instant;

/**
 * Answers a temporary sign-in lock (#482) with 423 Locked and a {@code Retry-After} header in seconds. It runs before
 * {@code GlobalExceptionHandler}, which maps the same code to 423 but cannot know when the lock ends.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LoginLockoutExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(LoginLockoutExceptionHandler.class);

    private final Clock clock;

    public LoginLockoutExceptionHandler() {
        this(Clock.systemUTC());
    }

    LoginLockoutExceptionHandler(Clock clock) {
        this.clock = clock;
    }

    @ExceptionHandler(LoginTemporarilyLockedException.class)
    public ResponseEntity<ErrorResponse> handleTemporaryLock(LoginTemporarilyLockedException ex, HttpServletRequest request) {
        Instant now = clock.instant();
        LOGGER.warn("Request rejected: method={} path={} status={} code={}",
                request.getMethod(), request.getRequestURI(), HttpStatus.LOCKED.value(), ex.getCode());
        return ResponseEntity.status(HttpStatus.LOCKED)
                .header(HttpHeaders.RETRY_AFTER, Long.toString(ex.retryAfterSeconds(now)))
                .body(new ErrorResponse(now, request.getRequestURI(), HttpStatus.LOCKED.value(), ex.getCode(),
                        ex.getMessage(), null));
    }
}
