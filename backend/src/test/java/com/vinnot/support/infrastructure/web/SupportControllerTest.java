package com.vinnot.support.infrastructure.web;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.support.application.port.in.SubmitSupportRequestUseCase;
import com.vinnot.support.domain.model.SupportRequest;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import jakarta.annotation.Resource;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SupportController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
class SupportControllerTest {
    @MockitoBean
    private ReauthenticationProofPort reauthenticationProofs;
    @MockitoBean
    private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean
    private LegalAgreementUseCase legalAgreements;
    @MockitoBean SubmitSupportRequestUseCase submit;
    @MockitoBean JwtAuthenticationFilter jwt;
    @MockitoBean RateLimitingFilter limits;
    @Resource MockMvc mvc;
    @BeforeEach void filters() throws Exception {
        doAnswer(call -> { call.getArgument(2, FilterChain.class).doFilter(call.getArgument(0), call.getArgument(1)); return null; })
                .when(jwt).doFilter(any(), any(), any());
        doAnswer(call -> { call.getArgument(2, FilterChain.class).doFilter(call.getArgument(0), call.getArgument(1)); return null; })
                .when(limits).doFilter(any(), any(), any());
    }
    @Test void publicPostReturnsDurableReceiptAndDoesNotExposeReadAccess() throws Exception {
        var id = UUID.randomUUID();
        when(submit.submit(any())).thenAnswer(call -> call.getArgument(0, SupportRequest.class).requestId());
        mvc.perform(post("/support/requests").contentType("application/json").content("""
                {"requestId":"%s","name":"Name","email":"test@example.org","subject":"privacy","message":"Please help"}
                """.formatted(id))).andExpect(status().isAccepted()).andExpect(jsonPath("$.requestId").value(id.toString()));
        verify(submit).submit(new SupportRequest(id, "Name", "test@example.org", "privacy", "Please help"));
        mvc.perform(get("/support/requests")).andExpect(status().isUnauthorized());
    }
    @Test void invalidPayloadDoesNotReachUseCase() throws Exception {
        mvc.perform(post("/support/requests").contentType("application/json").content("""
                {"name":"","email":"invalid","subject":"support","message":""}
                """)).andExpect(status().isBadRequest());
        verifyNoInteractions(submit);
    }
}
