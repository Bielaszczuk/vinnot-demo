package com.vinnot.marketing.infrastructure.web.controller;

import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.marketing.application.port.in.ManageSocialAccountsUseCase;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * #510 S5 C5: the OAuth callback is public (and only it: SecurityConfig permits exactly GET /public/social-accounts/*\/callback),
 * and it redirects to the web admin with the network and the outcome, never the code, the state or a token.
 */
@WebMvcTest({SocialAccountCallbackController.class, SocialAccountAdminController.class})
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
@TestPropertySource(properties = "app.auth.frontend-base-url=https://vinnot.com/")
class SocialAccountCallbackControllerTest {
    @Autowired private MockMvc mvc;
    @MockitoBean private ManageSocialAccountsUseCase accounts;
    @MockitoBean private ReauthenticationProofPort proofs;
    @MockitoBean private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean private LegalAgreementUseCase legalAgreements;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter limiter;

    @BeforeEach
    void passThroughFilters() throws Exception {
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwt).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(limiter).doFilter(any(), any(), any());
    }

    private static UsernamePasswordAuthenticationToken token(UUID id, String role) {
        return new UsernamePasswordAuthenticationToken(id.toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }

    @Test
    void aSuccessfulCallbackRedirectsToTheAdminWithoutSecrets() throws Exception {
        when(accounts.completeConnection(SocialNetwork.TIKTOK, "code-secret", "state-secret", null)).thenReturn(true);

        mvc.perform(get("/public/social-accounts/tiktok/callback").param("code", "code-secret").param("state", "state-secret")
                        .param("scopes", "user.info.basic"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://vinnot.com/admin/social-posts?account=tiktok&result=connected"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"));
    }

    @Test
    void everyFailureRedirectsWithAnErrorAndNoSecrets() throws Exception {
        when(accounts.completeConnection(SocialNetwork.THREADS, "code-secret", "bad-state", null)).thenReturn(false);
        when(accounts.completeConnection(SocialNetwork.THREADS, null, "state-secret", "access_denied")).thenReturn(false);

        mvc.perform(get("/public/social-accounts/threads/callback").param("code", "code-secret").param("state", "bad-state"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", allOf(containsString("account=threads&result=error"), not(containsString("code-secret")),
                        not(containsString("bad-state")))));
        mvc.perform(get("/public/social-accounts/threads/callback").param("state", "state-secret").param("error", "access_denied")
                        .param("error_description", "The user denied"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://vinnot.com/admin/social-posts?account=threads&result=error"));
    }

    @Test
    void anUnknownNetworkRedirectsWithAnErrorWithoutTryingIt() throws Exception {
        mvc.perform(get("/public/social-accounts/myspace/callback").param("code", "c").param("state", "s"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://vinnot.com/admin/social-posts?result=error"));
        verify(accounts, never()).completeConnection(any(), any(), any(), any());
    }

    @Test
    void onlyTheCallbackBecamePublic() throws Exception {
        mvc.perform(post("/public/social-accounts/tiktok/callback").param("code", "c").param("state", "s")).andExpect(status().isUnauthorized());
        mvc.perform(get("/public/social-accounts/tiktok/connect")).andExpect(status().isUnauthorized());
        mvc.perform(get("/public/social-accounts/tiktok/callback/extra")).andExpect(status().isUnauthorized());
        mvc.perform(get("/public/social-accounts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/social-accounts/tiktok/connect")).andExpect(status().isUnauthorized());
        verify(accounts, never()).completeConnection(any(), any(), any(), any());
    }
}
