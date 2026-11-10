package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.model.MinimumAppVersions;
import com.vinnot.admin.application.port.in.GetMinimumAppVersionsUseCase;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.legal.domain.model.TermsStatus;
import com.vinnot.legal.infrastructure.web.LegalAccessConfiguration;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AppVersionPolicyController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, LegalAccessConfiguration.class})
class AppVersionPolicyControllerTest {
    @Autowired private MockMvc mvc;
    @MockitoBean private GetMinimumAppVersionsUseCase policy;
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
        when(policy.minimumVersions()).thenReturn(new MinimumAppVersions(Map.of(AppPlatform.IOS, new AppVersion(0, 3, 0))));
    }

    @Test
    void anyoneReadsTheMinimumOfBothPlatformsWithoutASession() throws Exception {
        mvc.perform(get("/app-versions/minimum"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"data\":{\"ios\":\"0.3.0\",\"android\":null}}"));
    }

    @Test
    void pendingTermsDoNotHideThePolicyFromASignedInAccount() throws Exception {
        UUID member = UUID.randomUUID();
        when(legalAgreements.enforcementEnabled()).thenReturn(true);
        when(legalAgreements.status(any(), any())).thenReturn(new TermsStatus(true, null, null));
        mvc.perform(get("/app-versions/minimum").with(authentication(new UsernamePasswordAuthenticationToken(member.toString(),
                        null, List.of(new SimpleGrantedAuthority("ROLE_USER"))))))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"data\":{\"ios\":\"0.3.0\",\"android\":null}}"));
    }
}
