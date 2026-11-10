package com.vinnot.engagement.infrastructure.web;

import com.vinnot.admin.infrastructure.web.AdminSensitiveActionConfiguration;
import com.vinnot.admin.infrastructure.web.AdminSensitiveActionInterceptor;
import com.vinnot.engagement.application.model.EngagementMetrics;
import com.vinnot.engagement.application.port.in.ReadEngagementMetricsUseCase;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.shared.domain.exception.DomainException;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** S17: administrators read sent, opened, opted out and held out per engagement type for the chosen window. */
@WebMvcTest(EngagementAdministrationController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, AdminSensitiveActionConfiguration.class,
        AdminSensitiveActionInterceptor.class})
class EngagementAdministrationControllerTest {
    private static final String PATH = "/admin/notifications/push/engagement";
    @Autowired private MockMvc mvc;
    @MockitoBean private ReadEngagementMetricsUseCase metrics;
    @MockitoBean private ReauthenticationProofPort proofs;
    @MockitoBean private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean private LegalAgreementUseCase legalAgreements;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter limiter;
    private final UsernamePasswordAuthenticationToken admin = token("ROLE_ADMIN");

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

    @Test
    void onlyAdministratorsReadTheResultsPerTypeWithTheirRates() throws Exception {
        mvc.perform(get(PATH).with(authentication(token("ROLE_MODERATOR")))).andExpect(status().isForbidden());
        verifyNoInteractions(metrics);
        when(metrics.metrics(7)).thenReturn(new EngagementMetrics(7, Instant.parse("2026-10-14T12:00:00Z"),
                List.of(new EngagementMetrics.TypeMetrics(NotificationType.TASTE_PICK, 200, 50, 4, 10, true))));

        mvc.perform(get(PATH).with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.days").value(7))
                .andExpect(jsonPath("$.data.types[0].type").value("TASTE_PICK"))
                .andExpect(jsonPath("$.data.types[0].category").value("RECOMMENDATIONS"))
                .andExpect(jsonPath("$.data.types[0].enabled").value(true))
                .andExpect(jsonPath("$.data.types[0].sent").value(200))
                .andExpect(jsonPath("$.data.types[0].opened").value(50))
                .andExpect(jsonPath("$.data.types[0].optedOut").value(4))
                .andExpect(jsonPath("$.data.types[0].heldOut").value(10))
                .andExpect(jsonPath("$.data.types[0].openRate").value(0.25))
                .andExpect(jsonPath("$.data.types[0].optOutRate").value(0.02));
    }

    @Test
    void aWindowOtherThanOneSevenOrThirtyDaysIsRefused() throws Exception {
        when(metrics.metrics(3)).thenThrow(new DomainException("INVALID_METRICS_WINDOW", "Choose a window of 1, 7 or 30 days"));

        mvc.perform(get(PATH).param("days", "3").with(authentication(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_METRICS_WINDOW"));
    }

    private static UsernamePasswordAuthenticationToken token(String role) {
        return new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }
}
