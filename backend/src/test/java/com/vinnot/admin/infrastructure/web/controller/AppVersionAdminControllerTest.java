package com.vinnot.admin.infrastructure.web.controller;

import com.vinnot.admin.application.model.AppVersionSettings;
import com.vinnot.admin.application.port.in.ManageAppVersionsUseCase;
import com.vinnot.admin.application.port.out.AppMinimumVersionPort;
import com.vinnot.admin.domain.model.AppPlatform;
import com.vinnot.admin.domain.model.AppVersion;
import com.vinnot.admin.infrastructure.web.AdminSensitiveActionConfiguration;
import com.vinnot.admin.infrastructure.web.AdminSensitiveActionInterceptor;
import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AppVersionAdminController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, AdminSensitiveActionConfiguration.class,
        AdminSensitiveActionInterceptor.class})
class AppVersionAdminControllerTest {
    private static final Instant AT = Instant.parse("2026-10-26T12:00:00Z");
    private static final AppVersionSettings SETTINGS = new AppVersionSettings(
            List.of(new AppMinimumVersionPort.Setting(AppPlatform.IOS, new AppVersion(0, 3, 0), AT, "admin@vinnot.test"),
                    new AppMinimumVersionPort.Setting(AppPlatform.ANDROID, null, null, null)),
            List.of(new AppMinimumVersionPort.Change(AppPlatform.IOS, null, new AppVersion(0, 3, 0), "admin@vinnot.test", AT)));
    @Autowired private MockMvc mvc;
    @MockitoBean private ManageAppVersionsUseCase appVersions;
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
        when(appVersions.settings()).thenReturn(SETTINGS);
    }

    @Test
    void onlyAdministratorsSeeBothPlatformsWithWhoChangedThemAndTheAudit() throws Exception {
        mvc.perform(get("/admin/app-versions")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/app-versions").with(authentication(token(UUID.randomUUID(), "ROLE_MODERATOR"))))
                .andExpect(status().isForbidden());
        mvc.perform(put("/admin/app-versions/IOS").with(authentication(token(UUID.randomUUID(), "ROLE_MODERATOR")))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"minimumVersion\":\"0.4.0\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/admin/app-versions").with(authentication(admin)))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"data":{"platforms":[
                          {"platform":"IOS","minimumVersion":"0.3.0","updatedAt":"2026-10-26T12:00:00Z","updatedBy":"admin@vinnot.test"},
                          {"platform":"ANDROID","minimumVersion":null,"updatedAt":null,"updatedBy":null}],
                         "recentChanges":[{"platform":"IOS","previousMinimumVersion":null,"minimumVersion":"0.3.0",
                          "changedBy":"admin@vinnot.test","changedAt":"2026-10-26T12:00:00Z"}]}}
                        """));
        verifyNoInteractions(proofs);
    }

    @Test
    void changingAMinimumNeedsAFreshReauthenticationAndUsesTheAuthenticatedAdministrator() throws Exception {
        when(proofs.permits(any(), any(), any())).thenReturn(false);
        mvc.perform(change("IOS", "{\"minimumVersion\":\"0.3.0\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("REAUTHENTICATION_REQUIRED"));
        verifyNoInteractions(appVersions);

        when(proofs.permits(any(), any(), any())).thenReturn(true);
        when(appVersions.setMinimumVersion(AppPlatform.IOS, "0.3.0", adminId)).thenReturn(SETTINGS);
        mvc.perform(change("IOS", "{\"minimumVersion\":\"0.3.0\"}").header("X-Admin-Reauthentication", "proof"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.platforms[0].minimumVersion").value("0.3.0"));
        verify(appVersions).setMinimumVersion(AppPlatform.IOS, "0.3.0", adminId);

        when(appVersions.setMinimumVersion(AppPlatform.ANDROID, null, adminId)).thenReturn(SETTINGS);
        mvc.perform(change("ANDROID", "{\"minimumVersion\":null}").header("X-Admin-Reauthentication", "proof"))
                .andExpect(status().isOk());
        verify(appVersions).setMinimumVersion(AppPlatform.ANDROID, null, adminId);
    }

    @Test
    void anUnknownPlatformAnInvalidVersionOrNoBodyIsRefused() throws Exception {
        when(proofs.permits(any(), any(), any())).thenReturn(true);
        mvc.perform(change("WEB", "{\"minimumVersion\":\"0.3.0\"}").header("X-Admin-Reauthentication", "proof"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NOT_AN_APP_PLATFORM"));
        verifyNoInteractions(appVersions);
        when(appVersions.setMinimumVersion(any(), any(), any()))
                .thenThrow(new DomainException("INVALID_APP_VERSION", "Use major.minor.patch"));
        mvc.perform(change("IOS", "{\"minimumVersion\":\"1.2\"}").header("X-Admin-Reauthentication", "proof"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_APP_VERSION"));
        mvc.perform(change("IOS", "").header("X-Admin-Reauthentication", "proof"))
                .andExpect(status().isBadRequest());
        verify(appVersions).setMinimumVersion(AppPlatform.IOS, "1.2", adminId);
    }

    private MockHttpServletRequestBuilder change(String platform, String body) {
        String path = "/admin/app-versions/" + platform;
        return put(path).with(authentication(admin)).servletPath(path).header("Authorization", "Bearer test")
                .contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private static UsernamePasswordAuthenticationToken token(UUID id, String role) {
        return new UsernamePasswordAuthenticationToken(id.toString(), null, List.of(new SimpleGrantedAuthority(role)));
    }
}
