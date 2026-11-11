package com.vinnot.community.infrastructure.web;

import com.vinnot.community.domain.exception.CellarNotVisibleException;
import com.vinnot.community.domain.exception.InvalidTasteAdjustmentException;
import com.vinnot.community.domain.exception.InvalidTasteQuizException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.infrastructure.web.GlobalExceptionHandler.ErrorResponse;

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
 * Answers a hidden cellar (#541) with 403 and the {@code CELLAR_NOT_VISIBLE} code, invalid taste quiz answers with 400
 * and the {@code INVALID_TASTE_QUIZ} code, and an invalid manual palate change with 400 and the
 * {@code INVALID_TASTE_ADJUSTMENT} code. It runs before {@code GlobalExceptionHandler}, which would answer these
 * domain rules with 422.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CommunityExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(CommunityExceptionHandler.class);

    @ExceptionHandler(CellarNotVisibleException.class)
    public ResponseEntity<ErrorResponse> handleHiddenCellar(CellarNotVisibleException ex, HttpServletRequest request) {
        LOGGER.warn("Request rejected: method={} path={} status={} code={}",
                request.getMethod(), request.getRequestURI(), HttpStatus.FORBIDDEN.value(), ex.getCode());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(Instant.now(),
                request.getRequestURI(), HttpStatus.FORBIDDEN.value(), ex.getCode(), ex.getMessage(), null));
    }

    @ExceptionHandler({InvalidTasteQuizException.class, InvalidTasteAdjustmentException.class})
    public ResponseEntity<ErrorResponse> handleInvalidTasteInput(DomainException ex, HttpServletRequest request) {
        LOGGER.warn("Request rejected: method={} path={} status={} code={}",
                request.getMethod(), request.getRequestURI(), HttpStatus.BAD_REQUEST.value(), ex.getCode());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(Instant.now(),
                request.getRequestURI(), HttpStatus.BAD_REQUEST.value(), ex.getCode(), ex.getMessage(), null));
    }
}
