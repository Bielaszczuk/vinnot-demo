package com.vinnot.user.infrastructure.web;

import com.vinnot.shared.infrastructure.security.RateLimitProperties;
import com.vinnot.user.application.port.out.model.RequestOrigin;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;

class HttpRequestOriginAdapterTest {
    private final RateLimitProperties properties = new RateLimitProperties();
    private final HttpRequestOriginAdapter adapter = new HttpRequestOriginAdapter(properties);

    @AfterEach
    void clear() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void outsideARequestTheOriginIsUnknown() {
        assertThat(adapter.current()).isEqualTo(RequestOrigin.UNKNOWN);
    }

    @Test
    void withoutATrustedProxyTheSocketAddressIsUsedAndForwardedHeadersAreIgnored() {
        bind(request("198.51.100.7", "203.0.113.1, 203.0.113.2"));

        assertThat(adapter.current()).isEqualTo(new RequestOrigin("198.51.100.7", "Mozilla/5.0"));
    }

    @Test
    void behindTheTrustedProxyTheLastForwardedAddressIsTheClient() {
        properties.setTrustForwardedFor(true);
        bind(request("10.0.0.2", "198.51.100.66, 203.0.113.2 , "));
        assertThat(adapter.current().ipAddress()).isEqualTo("203.0.113.2");

        bind(request("10.0.0.2", "  "));
        assertThat(adapter.current().ipAddress()).isEqualTo("10.0.0.2");

        bind(request("10.0.0.2", " , "));
        assertThat(adapter.current().ipAddress()).isEqualTo("10.0.0.2");

        bind(request("10.0.0.2", null));
        assertThat(adapter.current().ipAddress()).isEqualTo("10.0.0.2");
    }

    private static MockHttpServletRequest request(String remoteAddress, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/login");
        request.setRemoteAddr(remoteAddress);
        request.addHeader("User-Agent", "Mozilla/5.0");
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    private static void bind(MockHttpServletRequest request) {
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }
}
