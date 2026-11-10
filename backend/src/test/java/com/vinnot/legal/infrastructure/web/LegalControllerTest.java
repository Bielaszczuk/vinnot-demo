package com.vinnot.legal.infrastructure.web;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.legal.domain.model.*;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import jakarta.annotation.Resource;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LegalController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
class LegalControllerTest {
    @MockitoBean
    private ReauthenticationProofPort reauthenticationProofs;
    @MockitoBean
    private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean LegalAgreementUseCase agreements;
    @MockitoBean JwtAuthenticationFilter jwt;
    @MockitoBean RateLimitingFilter limits;
    @Resource MockMvc mvc;
    private final TermsDocument document = new TermsDocument("v1", "r1", "es", "a".repeat(64), "Terms", "Summary",
            List.of(new TermsDocument.Section("one", "Section", "Text")));
    @BeforeEach void filters() throws Exception {
        doAnswer(call -> { call.getArgument(2, FilterChain.class).doFilter(call.getArgument(0), call.getArgument(1)); return null; })
                .when(jwt).doFilter(any(), any(), any());
        doAnswer(call -> { call.getArgument(2, FilterChain.class).doFilter(call.getArgument(0), call.getArgument(1)); return null; })
                .when(limits).doFilter(any(), any(), any());
    }
    @Test void documentsArePublicButUserStateAndAcceptanceRequireAuthentication() throws Exception {
        when(agreements.current("es")).thenReturn(document);
        when(agreements.version("v1", "es")).thenReturn(document);
        mvc.perform(get("/legal/terms/current")).andExpect(status().isOk()).andExpect(jsonPath("$.contentHash").value(document.contentHash()));
        mvc.perform(get("/legal/terms/versions/v1")).andExpect(status().isOk()).andExpect(jsonPath("$.version").value("v1"));
        mvc.perform(get("/legal/acceptance")).andExpect(status().isUnauthorized());
        mvc.perform(post("/legal/acceptance").contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
    }
    @Test void principalOwnsAcceptanceAndStaleVersionsRemainRecoverableWithoutLoggingOut() throws Exception {
        UUID user = UUID.randomUUID();
        var principal = authentication(new UsernamePasswordAuthenticationToken(user.toString(), null, List.of()));
        var selection = new TermsSelection("v1", "es", document.contentHash(), true);
        when(agreements.accept(user, selection)).thenReturn(new TermsStatus(false, Instant.now(), document));
        String payload = """
                {"version":"v1","locale":"es","contentHash":"%s","accepted":true,"userId":"untrusted"}
                """.formatted(document.contentHash());
        mvc.perform(post("/legal/acceptance").with(principal).contentType("application/json").content(payload))
                .andExpect(status().isOk()).andExpect(jsonPath("$.required").value(false));
        verify(agreements).accept(user, selection);
        when(agreements.status(user, "en")).thenReturn(new TermsStatus(false, Instant.now(), document));
        mvc.perform(get("/legal/acceptance?locale=en").with(principal)).andExpect(status().isOk());
        when(agreements.accept(user, selection)).thenThrow(new BusinessRuleViolationException("TERMS_VERSION_CHANGED", "Review the new version"));
        mvc.perform(post("/legal/acceptance").with(principal).contentType("application/json").content(payload))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("TERMS_VERSION_CHANGED"));
    }
    @Test void uncheckedOrMalformedConsentIsRejectedBeforeTheUseCase() throws Exception {
        var principal = authentication(new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null, List.of()));
        mvc.perform(post("/legal/acceptance").with(principal).contentType("application/json").content("""
                {"version":"v1","locale":"es","contentHash":"%s","accepted":false}
                """.formatted(document.contentHash()))).andExpect(status().isBadRequest());
        mvc.perform(post("/legal/acceptance").with(principal).contentType("application/json").content("{}")).andExpect(status().isBadRequest());
        verify(agreements, never()).accept(any(), any());
    }
}
