package com.vinnot.wine.infrastructure.web;

import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler.ErrorResponse;
import com.vinnot.wine.application.command.exception.WineLabelScanFeedbackNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

/**
 * Answers scan feedback on an unknown scan ({@code SCAN_NOT_FOUND}) or wine ({@code WINE_NOT_FOUND}) with 404. It runs
 * before {@code GlobalExceptionHandler}, which would answer these domain codes with 400.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class WineLabelScanExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(WineLabelScanExceptionHandler.class);

    @ExceptionHandler(WineLabelScanFeedbackNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            WineLabelScanFeedbackNotFoundException ex, HttpServletRequest request) {
        LOGGER.warn("Request rejected: method={} path={} status={} code={}",
                request.getMethod(), request.getRequestURI(), HttpStatus.NOT_FOUND.value(), ex.getCode());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(Instant.now(),
                request.getRequestURI(), HttpStatus.NOT_FOUND.value(), ex.getCode(), ex.getMessage(), null));
    }
}
