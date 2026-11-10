package com.vinnot.shared.infrastructure.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.vinnot.shared.infrastructure.metrics.OperationalTelemetry;
import org.springframework.beans.factory.ObjectProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class HttpRequestLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-ID";
    public static final String REQUEST_ID_MDC_KEY = "requestId";

    private static final Logger LOGGER = LoggerFactory.getLogger(HttpRequestLoggingFilter.class);
    private static final Pattern SAFE_REQUEST_ID = Pattern.compile("[A-Za-z0-9._-]{1,100}");

    private final long slowRequestThresholdMillis;
    private final ObjectProvider<OperationalTelemetry> telemetry;

    /**
     * Creates the HTTP request logging filter.
     *
     * @param slowRequestThresholdMillis duration after which a request is logged as slow
     * @param telemetry optional infrastructure counters, absent in isolated MVC slices
     */
    public HttpRequestLoggingFilter(
            @Value("${app.observability.slow-request-threshold-ms:1000}")
            long slowRequestThresholdMillis, ObjectProvider<OperationalTelemetry> telemetry) {
        this.slowRequestThresholdMillis = slowRequestThresholdMillis;
        this.telemetry = telemetry;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();
        String requestId = resolveRequestId(request.getHeader(REQUEST_ID_HEADER));

        MDC.put(REQUEST_ID_MDC_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        boolean completed = false;
        try {
            filterChain.doFilter(request, response);
            completed = true;
        } finally {
            long durationMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
            int observedStatus = completed ? response.getStatus() : HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
            telemetry.ifAvailable(metrics -> metrics.recordHttp(observedStatus, durationMillis));
            logCompletedRequest(request, response.getStatus(), durationMillis, requestId);
            MDC.remove(REQUEST_ID_MDC_KEY);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equals(request.getMethod())
                || path.endsWith("/health")
                || path.startsWith(request.getContextPath() + "/swagger-ui")
                || path.startsWith(request.getContextPath() + "/api-docs");
    }

    private void logCompletedRequest(
            HttpServletRequest request,
            int status,
            long durationMillis,
            String requestId) {
        String message = "HTTP request completed: method={} path={} status={} durationMs={} requestId={}";
        Object[] arguments = {
                request.getMethod(),
                request.getRequestURI(),
                status,
                durationMillis,
                requestId
        };

        if (status >= HttpServletResponse.SC_INTERNAL_SERVER_ERROR) {
            LOGGER.error(message, arguments);
        } else if (durationMillis >= slowRequestThresholdMillis) {
            LOGGER.warn(message + " slow=true", arguments);
        } else {
            LOGGER.info(message, arguments);
        }
    }

    private String resolveRequestId(String candidate) {
        if (Objects.nonNull(candidate) && SAFE_REQUEST_ID.matcher(candidate).matches()) {
            return candidate;
        }
        return UUID.randomUUID().toString();
    }
}
