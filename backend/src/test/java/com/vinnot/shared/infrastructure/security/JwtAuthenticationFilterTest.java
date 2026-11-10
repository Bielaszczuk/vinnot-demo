package com.vinnot.shared.infrastructure.security;

import com.vinnot.shared.application.port.AccountAccessPort;
import jakarta.servlet.FilterChain;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    private final JwtTokenService tokens = mock(JwtTokenService.class);
    private final AccountAccessPort accounts = mock(AccountAccessPort.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(tokens, accounts);
    private final FilterChain chain = mock(FilterChain.class);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void refusesRevokedPermissionsBeforeReachingControllers() throws Exception {
        var request = authenticatedRequest();
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(chain);
    }

    @Test
    void authenticatesWhenCurrentAccountRolesMatchTheToken() throws Exception {
        var request = authenticatedRequest();
        var response = new MockHttpServletResponse();
        when(accounts.permits(any(), eq(List.of("ROLE_ADMIN")), eq(0L))).thenReturn(true);
        filter.doFilter(request, response, chain);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting("authority").contains("ROLE_ADMIN");
        verify(chain).doFilter(request, response);
    }

    @Test
    void letsTheRefreshUseCaseValidateRefreshCredentialsDespiteStaleAccessToken() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        request.setServletPath("/auth/refresh");
        request.addHeader("Authorization", "Bearer stale");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        verifyNoInteractions(tokens, accounts);
        verify(chain).doFilter(request, response);
    }

    private MockHttpServletRequest authenticatedRequest() {
        var request = new MockHttpServletRequest("GET", "/api/admin/stats");
        request.setServletPath("/admin/stats");
        request.addHeader("Authorization", "Bearer token");
        when(tokens.validateToken("token")).thenReturn(true);
        when(tokens.extractUserId("token")).thenReturn(UUID.randomUUID());
        when(tokens.extractRoles("token")).thenReturn(List.of("ROLE_ADMIN"));
        when(tokens.extractPermissions("token")).thenReturn(List.of());
        return request;
    }

    @Test
    void staleCoverCredentialsTriggerRefreshRatherThanAnonymousNotFound() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/uploads/covers/test.webp");
        request.setServletPath("/uploads/covers/test.webp");
        request.addHeader("Authorization", "Bearer stale");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(chain, accounts);
    }

    @Test
    void anonymousCoverReadsStillReachResourceVisibilityChecks() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/uploads/covers/test.webp");
        request.setServletPath("/uploads/covers/test.webp");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        verifyNoInteractions(tokens, accounts);
        verify(chain).doFilter(request, response);
    }
}
