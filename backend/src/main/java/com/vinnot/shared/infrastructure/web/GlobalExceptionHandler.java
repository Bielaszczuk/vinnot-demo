package com.vinnot.shared.infrastructure.web;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.infrastructure.logging.SafeFailureDetails;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles EntityNotFoundException.
     *
     * @param ex      the exception
     * @param request the HTTP request
     * @return error response
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(
            EntityNotFoundException ex, HttpServletRequest request) {
        logExpectedFailure(request, HttpStatus.NOT_FOUND, ex.getCode());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getCode(), ex.getMessage(), request, null);
    }

    /**
     * Handles BusinessRuleViolationException.
     *
     * @param ex      the exception
     * @param request the HTTP request
     * @return error response
     */
    @ExceptionHandler(BusinessRuleViolationException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRuleViolation(
            BusinessRuleViolationException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.UNPROCESSABLE_ENTITY;
        if ("FORBIDDEN".equals(ex.getCode()) || "REAUTHENTICATION_REQUIRED".equals(ex.getCode())) {
            status = HttpStatus.FORBIDDEN;
        } else if ("AUTH_FAILED".equals(ex.getCode())) {
            status = HttpStatus.UNAUTHORIZED;
        } else if ("ACCOUNT_TEMPORARILY_LOCKED".equals(ex.getCode())) {
            // Temporary sign-in lockout (#482); the user module's handler adds Retry-After when it knows the end.
            status = HttpStatus.LOCKED;
        }
        logExpectedFailure(request, status, ex.getCode());
        return buildResponse(status, ex.getCode(), ex.getMessage(), request, null);
    }

    /**
     * Handles DomainException.
     *
     * @param ex      the exception
     * @param request the HTTP request
     * @return error response
     */
    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ErrorResponse> handleDomainException(
            DomainException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        if ("EMAIL_ALREADY_EXISTS".equals(ex.getCode())
                || "USERNAME_ALREADY_EXISTS".equals(ex.getCode())
                || "INVALID_SUBMISSION_TRANSITION".equals(ex.getCode())
                || "INVALID_POST_TRANSITION".equals(ex.getCode())
                || "INVALID_PUBLICATION_TRANSITION".equals(ex.getCode())
                || "SOCIAL_PUBLISHING_OFF".equals(ex.getCode())
                || "SOCIAL_POST_DATE_TAKEN".equals(ex.getCode())
                || "SOCIAL_POST_MEDIA_NOT_READY".equals(ex.getCode())
                || "LAST_ROTATING_PILLAR".equals(ex.getCode())
                || "CONCURRENT_UPDATE".equals(ex.getCode())) {
            status = HttpStatus.CONFLICT;
        }
        logExpectedFailure(request, status, ex.getCode());
        return buildResponse(status, ex.getCode(), ex.getMessage(), request, null);
    }

    /**
     * Handles validation exceptions.
     *
     * @param ex      the exception
     * @param request the HTTP request
     * @return error response with field errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<Map<String, String>> details = new ArrayList<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            details.add(Map.of("field", fieldName, "message",
                    Objects.nonNull(errorMessage) ? errorMessage : "Invalid value"));
        });

        logExpectedFailure(request, HttpStatus.BAD_REQUEST, "E1001");

        ErrorResponse response = new ErrorResponse(
                Instant.now(),
                request.getRequestURI(),
                HttpStatus.BAD_REQUEST.value(),
                "E1001",
                "Validation failed",
                details
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * Handles data integrity violations (e.g. unique constraint).
     *
     * @param ex      the exception
     * @param request the HTTP request
     * @return error response
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        logExpectedFailure(request, HttpStatus.CONFLICT, "DUPLICATE_ENTRY");
        LOGGER.debug("Data integrity violation: {}", SafeFailureDetails.describe(ex));
        return buildResponse(HttpStatus.CONFLICT, "DUPLICATE_ENTRY",
                "A record with the same unique value already exists", request, null);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleConcurrentUpdate(
            OptimisticLockingFailureException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.CONFLICT, "CONCURRENT_UPDATE",
                "This resource changed. Reload and try again.", request, null);
    }

    @ExceptionHandler(ExternalServiceUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleExternalServiceUnavailable(
            ExternalServiceUnavailableException ex, HttpServletRequest request) {
        LOGGER.error(
                "External service unavailable: method={} path={} status={} code={} "
                        + "requestId={} failure={}",
                request.getMethod(),
                request.getRequestURI(),
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                ex.getCode(),
                currentRequestId(),
                SafeFailureDetails.describe(ex));
        return buildResponse(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getCode(),
                ex.getMessage(),
                request,
                null);
    }

    /**
     * Handles generic exceptions.
     *
     * @param ex      the exception
     * @param request the HTTP request
     * @return error response
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleMissingRoute(Exception ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource not found", request, null);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(Exception ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "Method not allowed", request, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(Exception ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", "Insufficient permissions", request, null);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleUnsupportedMediaType(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        logExpectedFailure(request, HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE");
        return buildResponse(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                "Unsupported request content type", request, null);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class,
            IllegalArgumentException.class})
    public ResponseEntity<ErrorResponse> handleInvalidRequest(Exception ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Invalid request", request, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {
        LOGGER.error(
                "Unexpected request failure: method={} path={} status={} code={} requestId={} failure={}",
                request.getMethod(),
                request.getRequestURI(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_ERROR",
                currentRequestId(),
                SafeFailureDetails.describe(ex));
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred", request, null);
    }

    private void logExpectedFailure(
            HttpServletRequest request,
            HttpStatus status,
            String code) {
        LOGGER.warn(
                "Request rejected: method={} path={} status={} code={} requestId={}",
                request.getMethod(),
                request.getRequestURI(),
                status.value(),
                code,
                currentRequestId());
    }

    private String currentRequestId() {
        return Objects.requireNonNullElse(
                MDC.get(HttpRequestLoggingFilter.REQUEST_ID_MDC_KEY),
                "unavailable");
    }

    private ResponseEntity<ErrorResponse> buildResponse(
            HttpStatus status, String code, String message,
            HttpServletRequest request, List<Map<String, String>> details) {
        ErrorResponse response = new ErrorResponse(
                Instant.now(),
                request.getRequestURI(),
                status.value(),
                code,
                message,
                details
        );
        return ResponseEntity.status(status).body(response);
    }

    /**
     * Standard error response DTO matching the API contract.
     *
     * @param timestamp the error timestamp
     * @param path      the request path
     * @param status    the HTTP status code
     * @param code      the error code
     * @param message   the error message
     * @param details   optional validation details
     */
    public record ErrorResponse(
            Instant timestamp,
            String path,
            int status,
            String code,
            String message,
            List<Map<String, String>> details
    ) {
    }
}
