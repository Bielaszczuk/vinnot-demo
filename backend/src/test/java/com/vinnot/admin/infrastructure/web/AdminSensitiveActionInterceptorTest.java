package com.vinnot.admin.infrastructure.web;

import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminSensitiveActionInterceptorTest {
    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void requiresProofOnBothAdministrativeAndAlternateCatalogDeletionPaths() {
        var proofs = mock(ReauthenticationProofPort.class);
        var interceptor = new AdminSensitiveActionInterceptor(proofs);
        UUID actor = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor.toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        for (String path : List.of("/admin/users/" + UUID.randomUUID() + "/role", "/admin/wines/" + UUID.randomUUID(), "/events/" + UUID.randomUUID(), "/wine-routes/" + UUID.randomUUID())) {
            var request = new MockHttpServletRequest("DELETE", path);
            request.setServletPath(path);
            var response = new MockHttpServletResponse();
            assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object())).isInstanceOf(BusinessRuleViolationException.class);
            request.addHeader("Authorization", "Bearer access");
            assertThatThrownBy(() -> interceptor.preHandle(request, response, new Object())).isInstanceOf(BusinessRuleViolationException.class);
            request.addHeader("X-Admin-Reauthentication", "proof");
            when(proofs.permits(eq("proof"), eq(actor), anyString())).thenReturn(true);
            assertThat(interceptor.preHandle(request, response, new Object())).isTrue();
        }
        for (String method : List.of("GET", "HEAD", "OPTIONS")) {
            var request = new MockHttpServletRequest(method, "/admin/users/id");
            request.setServletPath("/admin/users/id");
            assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
        }
        SecurityContextHolder.clearContext();
        assertThat(interceptor.preHandle(new MockHttpServletRequest("GET", "/wines"), new MockHttpServletResponse(), new Object())).isTrue();
    }

    @Test
    void changingAMinimumAppVersionRequiresProofButReadingItDoesNot() {
        var proofs = mock(ReauthenticationProofPort.class);
        var interceptor = new AdminSensitiveActionInterceptor(proofs);
        UUID actor = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor.toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        var change = new MockHttpServletRequest("PUT", "/admin/app-versions/IOS");
        change.setServletPath("/admin/app-versions/IOS");
        change.addHeader("Authorization", "Bearer access");
        assertThatThrownBy(() -> interceptor.preHandle(change, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(BusinessRuleViolationException.class)
                .extracting("code").isEqualTo("REAUTHENTICATION_REQUIRED");
        change.addHeader("X-Admin-Reauthentication", "proof");
        when(proofs.permits(eq("proof"), eq(actor), anyString())).thenReturn(true);
        assertThat(interceptor.preHandle(change, new MockHttpServletResponse(), new Object())).isTrue();

        var read = new MockHttpServletRequest("GET", "/admin/app-versions");
        read.setServletPath("/admin/app-versions");
        assertThat(interceptor.preHandle(read, new MockHttpServletResponse(), new Object())).isTrue();
        var publicPolicy = new MockHttpServletRequest("GET", "/app-versions/minimum");
        publicPolicy.setServletPath("/app-versions/minimum");
        assertThat(interceptor.preHandle(publicPolicy, new MockHttpServletResponse(), new Object())).isTrue();
    }

    @Test
    void ownEmailChangeAndPermanentDeletionRequireProofForEveryAccountHolder() {
        var proofs = mock(ReauthenticationProofPort.class);
        var interceptor = new AdminSensitiveActionInterceptor(proofs);
        UUID member = UUID.randomUUID();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(member.toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        when(proofs.permits(eq("proof"), eq(member), anyString())).thenReturn(true);
        for (String[] action : List.of(new String[]{"POST", "/users/me/email-change"}, new String[]{"DELETE", "/users/me/permanent"})) {
            var request = new MockHttpServletRequest(action[0], action[1]);
            request.setServletPath(action[1]);
            request.addHeader("Authorization", "Bearer access");
            assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                    .isInstanceOf(BusinessRuleViolationException.class)
                    .extracting("code").isEqualTo("REAUTHENTICATION_REQUIRED");
            request.addHeader("X-Admin-Reauthentication", "proof");
            assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
        }
    }

    @Test
    void ordinaryAccountActionsKeepWorkingWithoutProof() {
        var proofs = mock(ReauthenticationProofPort.class);
        var interceptor = new AdminSensitiveActionInterceptor(proofs);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        for (String[] action : List.of(new String[]{"DELETE", "/users/me"}, new String[]{"POST", "/users/me/change-password"},
                new String[]{"PATCH", "/users/me"}, new String[]{"DELETE", "/events/" + UUID.randomUUID()})) {
            var request = new MockHttpServletRequest(action[0], action[1]);
            request.setServletPath(action[1]);
            assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
        }
        verifyNoInteractions(proofs);
    }
}
