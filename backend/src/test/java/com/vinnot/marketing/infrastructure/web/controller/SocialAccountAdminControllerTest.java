package com.vinnot.marketing.infrastructure.web.controller;

import com.vinnot.marketing.application.model.SocialAccountDisconnectResult;
import com.vinnot.marketing.application.model.SocialAccountResponse;
import com.vinnot.marketing.domain.model.SocialAccountStatus;
import com.vinnot.marketing.domain.model.SocialNetwork;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** #510 S5 C5: the network connections endpoints are admin only, never return tokens, and Meta cannot be removed. */
@WebMvcTest(SocialAccountAdminController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
class SocialAccountAdminControllerTest {
    private static final Instant END = Instant.parse("2026-12-24T12:00:00Z");
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

    private final UUID adminId = UUID.randomUUID();
    private final UsernamePasswordAuthenticationToken admin = token(adminId, "ROLE_ADMIN");

    @Test
    void listsEveryNetworkWithoutTokens() throws Exception {
        when(accounts.list()).thenReturn(List.of(
                new SocialAccountResponse(SocialNetwork.INSTAGRAM, SocialAccountResponse.Mode.CONFIG, true, true, "1784", null,
                        SocialAccountStatus.CONNECTED, null, null),
                new SocialAccountResponse(SocialNetwork.TIKTOK, SocialAccountResponse.Mode.OAUTH, true, false, "open-1", "Vinnot",
                        SocialAccountStatus.REFRESH_FAILED, END, "PROVIDER_REJECTED")));

        mvc.perform(get("/admin/social-accounts").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].network").value("INSTAGRAM"))
                .andExpect(jsonPath("$[0].mode").value("CONFIG"))
                .andExpect(jsonPath("$[0].connected").value(true))
                .andExpect(jsonPath("$[1].mode").value("OAUTH"))
                .andExpect(jsonPath("$[1].configured").value(true))
                .andExpect(jsonPath("$[1].accountId").value("open-1"))
                .andExpect(jsonPath("$[1].displayName").value("Vinnot"))
                .andExpect(jsonPath("$[1].status").value("REFRESH_FAILED"))
                .andExpect(jsonPath("$[1].expiresAt").value("2026-12-24T12:00:00Z"))
                .andExpect(jsonPath("$[1].lastError").value("PROVIDER_REJECTED"))
                .andExpect(content().string(not(containsString("oken\""))));
    }

    @Test
    void onlyAdministratorsMayUseIt() throws Exception {
        mvc.perform(get("/admin/social-accounts").with(authentication(token(UUID.randomUUID(), "ROLE_MODERATOR")))).andExpect(status().isForbidden());
        mvc.perform(get("/admin/social-accounts/threads/connect").with(authentication(token(UUID.randomUUID(), "ROLE_USER"))))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/admin/social-accounts/threads").with(authentication(token(UUID.randomUUID(), "ROLE_MODERATOR"))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/admin/social-accounts")).andExpect(status().isUnauthorized());
        verify(accounts, never()).list();
        verify(accounts, never()).disconnect(any());
    }

    @Test
    void connectingReturnsTheConsentUrlForTheSignedInAdmin() throws Exception {
        when(accounts.connectUrl(SocialNetwork.THREADS, adminId)).thenReturn("https://threads.com/oauth/authorize?state=abc");

        mvc.perform(get("/admin/social-accounts/Threads/connect").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorizeUrl").value("https://threads.com/oauth/authorize?state=abc"));
    }

    @Test
    void connectingAnUnconfiguredNetworkIsUnprocessableWithItsCode() throws Exception {
        when(accounts.connectUrl(SocialNetwork.TIKTOK, adminId)).thenThrow(new BusinessRuleViolationException("SOCIAL_ACCOUNT_NOT_CONFIGURED", "no app"));

        mvc.perform(get("/admin/social-accounts/tiktok/connect").with(authentication(admin)))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.code").value("SOCIAL_ACCOUNT_NOT_CONFIGURED"));
    }

    @Test
    void anUnknownNetworkIsNotFound() throws Exception {
        mvc.perform(get("/admin/social-accounts/myspace/connect").with(authentication(admin))).andExpect(status().isNotFound());
        mvc.perform(delete("/admin/social-accounts/myspace").with(authentication(admin))).andExpect(status().isNotFound());
    }

    @Test
    void removingAnAccountAnswersByOutcomeAndMetaConflicts() throws Exception {
        when(accounts.disconnect(SocialNetwork.THREADS)).thenReturn(SocialAccountDisconnectResult.REMOVED);
        when(accounts.disconnect(SocialNetwork.TIKTOK)).thenReturn(SocialAccountDisconnectResult.NOT_CONNECTED);
        when(accounts.disconnect(SocialNetwork.FACEBOOK)).thenReturn(SocialAccountDisconnectResult.CONFIGURED_BY_SECRETS);

        mvc.perform(delete("/admin/social-accounts/threads").with(authentication(admin))).andExpect(status().isNoContent());
        mvc.perform(delete("/admin/social-accounts/tiktok").with(authentication(admin))).andExpect(status().isNotFound());
        mvc.perform(delete("/admin/social-accounts/facebook").with(authentication(admin)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SOCIAL_ACCOUNT_CONFIGURED_BY_SECRETS"))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.path").value("/admin/social-accounts/facebook"));
    }
}
