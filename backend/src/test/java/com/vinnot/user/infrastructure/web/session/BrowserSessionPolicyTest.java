package com.vinnot.user.infrastructure.web.session;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;

import static org.assertj.core.api.Assertions.*;

class BrowserSessionPolicyTest {
    private final BrowserSessionPolicy policy = new BrowserSessionPolicy("https://vinnot.com, https://dev.vinnot.com,*,", true, 604800000);

    @Test
    void requiresExactOriginAndNonSimpleHeader() {
        var request = new MockHttpServletRequest();
        assertThatThrownBy(() -> policy.verify(request)).isInstanceOf(AccessDeniedException.class);
        request.addHeader("Origin", "https://vinnot.com");
        assertThatThrownBy(() -> policy.verify(request)).isInstanceOf(AccessDeniedException.class);
        request.addHeader("X-Vinnot-Web-Session", "1");
        assertThatCode(() -> policy.verify(request)).doesNotThrowAnyException();
        request.removeHeader("Origin");
        request.addHeader("Origin", "https://vinnot.com.evil.test");
        assertThatThrownBy(() -> policy.verify(request)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void cookieIsHostOnlySecureHttpOnlyAndNotReadableInJson() {
        assertThat(policy.cookie("secret")).contains("__Host-vinnot-refresh=secret", "Path=/", "Secure", "HttpOnly", "SameSite=Strict", "Max-Age=604800").doesNotContain("Domain=");
        assertThat(policy.cookie(null)).contains("Max-Age=0", "__Host-vinnot-refresh=;");
        var local = new BrowserSessionPolicy("http://localhost:5173", false, 1000);
        assertThat(local.cookie("local")).contains("vinnot-refresh=local", "HttpOnly").doesNotContain("Secure", "__Host-");
        var request = new MockHttpServletRequest();
        request.setCookies(new Cookie("vinnot-refresh", "local"));
        assertThat(local.refreshToken(request)).isEqualTo("local");
    }

    @Test
    void readsOnlyOwnCookieAndRejectsAmbiguousDuplicates() {
        var request = new MockHttpServletRequest();
        assertThat(policy.refreshToken(request)).isNull();
        request.setCookies(new Cookie("other", "value"));
        assertThat(policy.refreshToken(request)).isNull();
        request.setCookies(new Cookie("other", "value"), new Cookie("__Host-vinnot-refresh", "secret"));
        assertThat(policy.refreshToken(request)).isEqualTo("secret");
        request.setCookies(new Cookie("__Host-vinnot-refresh", "one"), new Cookie("__Host-vinnot-refresh", "two"));
        assertThatThrownBy(() -> policy.refreshToken(request)).isInstanceOf(AccessDeniedException.class);
    }
}
