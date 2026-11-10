package com.vinnot.shared.infrastructure.security;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RateLimitClientResolverTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usesAuthenticatedPrincipalInsteadOfNetworkAddress() {
        RateLimitClientResolver resolver =
                new RateLimitClientResolver(new RateLimitProperties());
        HttpServletRequest request = request("10.0.0.10", null);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user-id", null, List.of()));

        assertThat(resolver.resolve(request)).isEqualTo("user:user-id");
    }

    @Test
    void ignoresForwardedHeaderUnlessExplicitlyTrusted() {
        RateLimitProperties properties = new RateLimitProperties();
        RateLimitClientResolver resolver = new RateLimitClientResolver(properties);
        HttpServletRequest request = request("10.0.0.10", "203.0.113.4, 10.0.0.20");

        assertThat(resolver.resolve(request)).isEqualTo("ip:10.0.0.10");
    }

    @Test
    void usesAddressAppendedByTrustedProxy() {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setTrustForwardedFor(true);
        RateLimitClientResolver resolver = new RateLimitClientResolver(properties);
        HttpServletRequest request = request("10.0.0.10", "203.0.113.4, 10.0.0.20");

        assertThat(resolver.resolve(request)).isEqualTo("ip:10.0.0.20");
    }

    private HttpServletRequest request(String remoteAddress, String forwardedFor) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn(remoteAddress);
        when(request.getHeader("X-Forwarded-For")).thenReturn(forwardedFor);
        return request;
    }
}
