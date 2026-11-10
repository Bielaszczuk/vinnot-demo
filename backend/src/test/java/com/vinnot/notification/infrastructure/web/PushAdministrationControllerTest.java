package com.vinnot.notification.infrastructure.web;

import com.vinnot.admin.infrastructure.web.AdminSensitiveActionConfiguration;
import com.vinnot.admin.infrastructure.web.AdminSensitiveActionInterceptor;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.notification.application.model.PushMetrics;
import com.vinnot.notification.application.model.PushSettings;
import com.vinnot.notification.application.port.in.ManagePushTypesUseCase;
import com.vinnot.notification.application.port.out.PushTypeSwitchPort;
import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushOutcome;
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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PushAdministrationController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, AdminSensitiveActionConfiguration.class,
        AdminSensitiveActionInterceptor.class})
class PushAdministrationControllerTest {
    private static final PushSettings SETTINGS = new PushSettings("expo",
            List.of(new PushSettings.TypeSetting(NotificationType.EVENT_NEARBY, NotificationCategory.EVENTS_NEARBY, false, false)),
            List.of(new PushTypeSwitchPort.Change(NotificationType.EVENT_NEARBY, true, false, "admin@vinnot.test",
                    Instant.parse("2026-10-21T12:00:00Z"))));
    @Autowired private MockMvc mvc;
    @MockitoBean private ManagePushTypesUseCase push;
    @MockitoBean private ReauthenticationProofPort proofs;
    @MockitoBean private CheckWineReadAccessUseCase wineReadAccess;
    @MockitoBean private LegalAgreementUseCase legalAgreements;
    @MockitoBean private JwtAuthenticationFilter jwt;
    @MockitoBean private RateLimitingFilter limiter;
    private final UUID adminId = UUID.randomUUID();
    private final UsernamePasswordAuthenticationToken admin = token(adminId, "ROLE_ADMIN");

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
        when(push.settings()).thenReturn(SETTINGS);
    }

    @Test
    void onlyAdministratorsSeeTheProviderSwitchesAndTheirAudit() throws Exception {
        mvc.perform(get("/admin/notifications/push").with(authentication(token(UUID.randomUUID(), "ROLE_MODERATOR"))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/admin/notifications/push").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.provider").value("expo"))
                .andExpect(jsonPath("$.data.types[0].type").value("EVENT_NEARBY"))
                .andExpect(jsonPath("$.data.types[0].enabled").value(false))
                .andExpect(jsonPath("$.data.recentChanges[0].changedBy").value("admin@vinnot.test"));
    }

    @Test
    void changingASwitchNeedsAFreshReauthenticationAndUsesTheAuthenticatedAdministrator() throws Exception {
        when(proofs.permits(any(), any(), any())).thenReturn(false);
        mvc.perform(put("/admin/notifications/push/types/EVENT_NEARBY").with(authentication(admin))
                        .servletPath("/admin/notifications/push/types/EVENT_NEARBY").header("Authorization", "Bearer test")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("REAUTHENTICATION_REQUIRED"));
        verifyNoInteractions(push);

        when(proofs.permits(any(), any(), any())).thenReturn(true);
        when(push.setEnabled(NotificationType.EVENT_NEARBY, false, adminId)).thenReturn(SETTINGS);
        mvc.perform(put("/admin/notifications/push/types/EVENT_NEARBY").with(authentication(admin))
                        .servletPath("/admin/notifications/push/types/EVENT_NEARBY").header("Authorization", "Bearer test")
                        .header("X-Admin-Reauthentication", "proof")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.types[0].enabled").value(false));
        verify(push).setEnabled(NotificationType.EVENT_NEARBY, false, adminId);
    }

    @Test
    void anUnknownTypeOrAMissingValueIsRefused() throws Exception {
        when(proofs.permits(any(), any(), any())).thenReturn(true);
        mvc.perform(put("/admin/notifications/push/types/NOPE").with(authentication(admin))
                        .servletPath("/admin/notifications/push/types/NOPE").header("Authorization", "Bearer test")
                        .header("X-Admin-Reauthentication", "proof")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NOT_A_PUSH_TYPE"));
        mvc.perform(put("/admin/notifications/push/types/EVENT_NEARBY").with(authentication(admin))
                        .servletPath("/admin/notifications/push/types/EVENT_NEARBY").header("Authorization", "Bearer test")
                        .header("X-Admin-Reauthentication", "proof")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void metricsListEveryOutcomeForTheChosenWindow() throws Exception {
        Map<PushOutcome, Long> counts = new EnumMap<>(PushOutcome.class);
        for (PushOutcome outcome : PushOutcome.values()) {
            counts.put(outcome, 0L);
        }
        counts.put(PushOutcome.SENT, 12L);
        when(push.metrics(30)).thenReturn(new PushMetrics(30, LocalDate.parse("2026-09-22"),
                List.of(new PushMetrics.TypeCounts(NotificationType.EVENT_REMINDER, counts))));
        mvc.perform(get("/admin/notifications/push/metrics").param("days", "30").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.from").value("2026-09-22"))
                .andExpect(jsonPath("$.data.types[0].counts.SENT").value(12))
                .andExpect(jsonPath("$.data.types[0].counts.SWITCHED_OFF").value(0));
    }

    private static UsernamePasswordAuthenticationToken token(UUID id, String role) {
        return new UsernamePasswordAuthenticationToken(id.toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }
}
