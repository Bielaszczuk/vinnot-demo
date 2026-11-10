package com.vinnot.shared.infrastructure.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Objects;

@Component
public class RateLimitClientResolver {

    private static final String FORWARDED_FOR_HEADER = "X-Forwarded-For";

    private final RateLimitProperties properties;

    public RateLimitClientResolver(RateLimitProperties properties) {
        this.properties = properties;
    }

    public String resolve(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (Objects.nonNull(authentication)
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof String principal
                && !principal.isBlank()
                && !"anonymousUser".equals(principal)) {
            return "user:" + principal;
        }
        return "ip:" + resolveClientAddress(request);
    }

    private String resolveClientAddress(HttpServletRequest request) {
        if (!properties.isTrustForwardedFor()) {
            return request.getRemoteAddr();
        }
        String forwardedFor = request.getHeader(FORWARDED_FOR_HEADER);
        if (Objects.isNull(forwardedFor) || forwardedFor.isBlank()) {
            return request.getRemoteAddr();
        }
        String[] addresses = forwardedFor.split(",");
        return Arrays.stream(addresses)
                .map(String::trim)
                .filter(address -> !address.isBlank())
                .reduce((first, second) -> second)
                .orElse(request.getRemoteAddr());
    }
}
