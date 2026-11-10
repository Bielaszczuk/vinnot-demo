package com.vinnot.user.infrastructure.web.session;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/** Transport policy for browser sessions; native Bearer authentication is independent. */
@Component
public class BrowserSessionPolicy {
    private final Set<String> origins;
    private final boolean secure;
    private final Duration lifetime;

    public BrowserSessionPolicy(
            @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}") String origins,
            @Value("${app.auth.browser-cookie-secure:true}") boolean secure,
            @Value("${jwt.refresh-expiration:604800000}") long lifetimeMillis) {
        this.origins = Arrays.stream(origins.split(",")).map(String::trim)
                .filter(origin -> !origin.isEmpty() && !origin.equals("*"))
                .collect(Collectors.toUnmodifiableSet());
        this.secure = secure;
        this.lifetime = Duration.ofMillis(lifetimeMillis);
    }

    public void verify(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (Objects.isNull(origin) || !origins.contains(origin)
                || !"1".equals(request.getHeader("X-Vinnot-Web-Session"))) {
            throw new AccessDeniedException("Browser session origin is not permitted");
        }
    }

    public String refreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (Objects.isNull(cookies)) {
            return null;
        }
        // Duplicate cookies are ambiguous: never choose a potentially injected value.
        String token = null;
        for (Cookie cookie : cookies) {
            if (cookie.getName().equals(cookieName())) {
                if (Objects.nonNull(token)) {
                    throw new AccessDeniedException("Ambiguous session cookie");
                }
                token = cookie.getValue();
            }
        }
        return token;
    }

    public String cookie(String token) {
        return ResponseCookie.from(cookieName(), Objects.isNull(token) ? "" : token)
                .httpOnly(true).secure(secure).sameSite("Strict")
                // __Host- requires Path=/ and no Domain, preventing subdomain cookie injection.
                .path("/").maxAge(Objects.isNull(token) ? Duration.ZERO : lifetime).build().toString();
    }

    private String cookieName() {
        return secure ? "__Host-vinnot-refresh" : "vinnot-refresh";
    }
}
