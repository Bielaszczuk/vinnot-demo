package com.vinnot.legal.infrastructure.web;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.legal.domain.model.TermsStatus;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.handler.MappedInterceptor;
import org.springframework.web.util.ServletRequestPathUtils;
import java.util.List;
import java.util.UUID;
import java.time.Instant;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class LegalAccessConfigurationTest {
    private final LegalAgreementUseCase agreements = mock(LegalAgreementUseCase.class);
    private final LegalAccessConfiguration access = new LegalAccessConfiguration(agreements);
    private final MockHttpServletResponse response = new MockHttpServletResponse();
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    @Test void rolloutIsOptInAndAnonymousBrowsingIsUnaffected() {
        assertThat(access.preHandle(new MockHttpServletRequest(), response, this)).isTrue();
        when(agreements.enforcementEnabled()).thenReturn(true);
        assertThat(access.preHandle(new MockHttpServletRequest(), response, this)).isTrue();
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken("key", "anonymous",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        assertThat(access.preHandle(new MockHttpServletRequest(), response, this)).isTrue();
    }
    @Test void enforcedGateKeepsErasureAccessibleAndChecksTheAuthenticatedAccount() {
        UUID id = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(id.toString(), null, List.of()));
        when(agreements.enforcementEnabled()).thenReturn(true);
        when(agreements.status(id, "es")).thenReturn(new TermsStatus(true, null, null));
        assertThatThrownBy(() -> access.preHandle(new MockHttpServletRequest("POST", "/wines"), response, this))
                .isInstanceOf(DomainException.class);
        assertThat(access.preHandle(new MockHttpServletRequest("DELETE", "/users/me"), response, this)).isTrue();
        assertThat(access.preHandle(new MockHttpServletRequest("DELETE", "/users/me/permanent"), response, this)).isTrue();
        assertThat(access.preHandle(new MockHttpServletRequest("OPTIONS", "/wines"), response, this)).isTrue();
        when(agreements.status(id, "es")).thenReturn(new TermsStatus(false, Instant.now(), null));
        assertThat(access.preHandle(new MockHttpServletRequest("POST", "/wines"), response, this)).isTrue();
    }
    @Test void theAppUpdatePolicyStaysReachableBeforeTheTermsAreAccepted() {
        var registry = new InterceptorRegistry() {
            List<Object> registered() { return getInterceptors(); }
        };
        access.addInterceptors(registry);
        var gate = (MappedInterceptor) registry.registered().getFirst();
        assertThat(gate.matches(parsed("/app-versions/minimum"))).isFalse();
        assertThat(gate.matches(parsed("/legal/terms/current"))).isFalse();
        assertThat(gate.matches(parsed("/wines"))).isTrue();
    }
    private static MockHttpServletRequest parsed(String path) {
        var request = new MockHttpServletRequest("GET", path);
        ServletRequestPathUtils.parseAndCache(request);
        return request;
    }
}
