package com.vinnot.activity.infrastructure.web;

import com.vinnot.activity.application.port.in.RecordAppOpenUseCase;
import com.vinnot.activity.application.port.in.RecordContentViewUseCase;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.notification.application.port.in.PushOpenUseCase;
import com.vinnot.notification.infrastructure.web.PushOpensController;
import com.vinnot.shared.infrastructure.config.SecurityConfig;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.annotation.Resource;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The three engagement signal endpoints only accept a signed-in user (#405). */
@WebMvcTest(controllers = {ActivityController.class, PushOpensController.class})
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class})
class EngagementSignalEndpointsSecurityTest {
    private static final Map<String, String> BODIES = Map.of(
            "/users/me/activity/views", "{\"kind\":\"WINE\",\"id\":\"" + UUID.randomUUID() + "\"}",
            "/users/me/activity/app-open", "{}",
            "/users/me/push-opens", "{\"ref\":\"wine-recommendation:abc\",\"type\":\"WINE_RECOMMENDATION\"}");

    @MockitoBean
    private ReauthenticationProofPort reauthenticationProofs;
    @MockitoBean
    private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean
    private LegalAgreementUseCase legalAgreements;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private RecordContentViewUseCase views;
    @MockitoBean
    private RecordAppOpenUseCase opens;
    @MockitoBean
    private PushOpenUseCase pushOpens;

    @Resource
    private MockMvc mvc;

    @BeforeEach
    void letMockedFiltersContinueTheChain() throws Exception {
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(rateLimitingFilter).doFilter(any(), any(), any());
    }

    @Test
    void rejectsAnonymousRequestsWithoutRecordingAnything() throws Exception {
        for (var endpoint : BODIES.entrySet()) {
            mvc.perform(post(endpoint.getKey()).contentType(MediaType.APPLICATION_JSON).content(endpoint.getValue()))
                    .andExpect(status().isUnauthorized());
        }

        verifyNoInteractions(views, opens, pushOpens);
    }

    @Test
    void acceptsASignedInUser() throws Exception {
        var session = new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null, List.of());
        for (var endpoint : BODIES.entrySet()) {
            mvc.perform(post(endpoint.getKey()).with(authentication(session))
                            .contentType(MediaType.APPLICATION_JSON).content(endpoint.getValue()))
                    .andExpect(status().isNoContent());
        }
    }
}
