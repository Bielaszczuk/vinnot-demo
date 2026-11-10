package com.vinnot.user.infrastructure.web;

import com.vinnot.shared.infrastructure.security.RateLimitProperties;
import com.vinnot.user.application.port.out.RequestOriginPort;
import com.vinnot.user.application.port.out.model.RequestOrigin;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.Objects;

/**
 * The client address and browser of the request on this thread (#482). The address follows the rate limiter's rule:
 * the last {@code X-Forwarded-For} entry only when the proxy in front is trusted, otherwise the socket address.
 */
@Component
public class HttpRequestOriginAdapter implements RequestOriginPort {
    private static final String FORWARDED_FOR_HEADER = "X-Forwarded-For";

    private final RateLimitProperties properties;

    public HttpRequestOriginAdapter(RateLimitProperties properties) {
        this.properties = properties;
    }

    @Override
    public RequestOrigin current() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof ServletRequestAttributes servlet)) {
            return RequestOrigin.UNKNOWN;
        }
        HttpServletRequest request = servlet.getRequest();
        return new RequestOrigin(clientAddress(request), request.getHeader(HttpHeaders.USER_AGENT));
    }

    private String clientAddress(HttpServletRequest request) {
        String forwardedFor = properties.isTrustForwardedFor() ? request.getHeader(FORWARDED_FOR_HEADER) : null;
        if (Objects.isNull(forwardedFor) || forwardedFor.isBlank()) {
            return request.getRemoteAddr();
        }
        return Arrays.stream(forwardedFor.split(","))
                .map(String::trim)
                .filter(address -> !address.isBlank())
                .reduce((first, second) -> second)
                .orElse(request.getRemoteAddr());
    }
}
