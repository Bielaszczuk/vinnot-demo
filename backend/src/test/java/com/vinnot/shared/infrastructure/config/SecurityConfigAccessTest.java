package com.vinnot.shared.infrastructure.config;

import com.vinnot.legal.application.port.in.LegalAgreementUseCase;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.ResourceReader;
import com.vinnot.shared.infrastructure.security.JwtAuthenticationFilter;
import com.vinnot.shared.infrastructure.security.RateLimitingFilter;
import com.vinnot.shared.infrastructure.security.RestAuthenticationEntryPoint;
import com.vinnot.user.application.port.out.ReauthenticationProofPort;
import com.vinnot.wine.application.port.in.CheckWineReadAccessUseCase;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;
import jakarta.annotation.Resource;
import jakarta.servlet.DispatcherType;
import org.springframework.boot.test.context.TestComponent;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SecurityProbeController.class)
@Import({
        SecurityProbeController.class,
        SecurityConfig.class,
        RestAuthenticationEntryPoint.class
})
class SecurityConfigAccessTest {
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

    @Resource
    private MockMvc mvc;

    @BeforeEach
    void letMockedFiltersContinueTheChain() throws Exception {
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(
                    invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
        doAnswer(invocation -> {
            invocation.getArgument(2, FilterChain.class).doFilter(
                    invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(rateLimitingFilter).doFilter(any(), any(), any());
    }

    @Test
    void allowsInternalErrorDispatchWithoutExposingDirectErrorRequests() throws Exception {
        mvc.perform(get("/error-probe").with(request -> {
            request.setDispatcherType(DispatcherType.ERROR);
            return request;
        }))
                .andExpect(status().isForbidden());
        mvc.perform(get("/error-probe"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "00000000-0000-0000-0000-000000000165")
    void nestedWineResourcesEnforceVisibilityBeforeReturningContent() throws Exception {
        var id = UUID.randomUUID();
        Mockito.doThrow(new EntityNotFoundException("Wine", id))
                .when(wineReadAccess).check(ArgumentMatchers.eq(id), any());
        for (String suffix : List.of("reviews", "similar")) {
            mvc.perform(get("/wines/" + id + "/" + suffix)).andExpect(status().isNotFound());
        }
        Mockito.verify(wineReadAccess, Mockito.times(2))
                .check(id, new ResourceReader(UUID.fromString("00000000-0000-0000-0000-000000000165"), false));
    }

    @Test
    void requiresSessionForAllProductReadsIncludingCatalogAndReferenceData() throws Exception {
        for (String path : List.of("/wines", "/wines/search", "/wines/featured", "/wines/highlights", "/wines/id/reviews",
                "/wineries", "/events", "/events/discover", "/wine-routes", "/users/id/profile",
                "/grape-types", "/regions/countries", "/reference/countries")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        mvc.perform(get("/wines/submissions")).andExpect(status().isUnauthorized());
        mvc.perform(get("/wines/submissions/submission-id"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void letsAuthenticatedUsersReadTheirSubmissionRoutes() throws Exception {
        mvc.perform(get("/wines")).andExpect(status().isOk());
        mvc.perform(get("/wines/submissions")).andExpect(status().isOk());
        mvc.perform(get("/wines/submissions/submission-id"))
                .andExpect(status().isOk());
    }

    @Test
    void keepsLegalAndAccountRecoveryAccessibleWithoutSession() throws Exception {
        for (String path : List.of("/legal/terms/current", "/legal/terms/versions/v1", "/auth/reset-password/validate")) {
            mvc.perform(get(path)).andExpect(status().isOk());
        }
    }

    @Test
    @WithMockUser
    void rejectsNonAdministratorsFromModerationRoutes() throws Exception {
        mvc.perform(get("/admin/wine-submissions"))
                .andExpect(status().isForbidden());
    }

    @Test
    void keepsTheAppUpdatePolicyPublicAndItsAdministrationForAdministrators() throws Exception {
        mvc.perform(get("/app-versions/minimum")).andExpect(status().isOk());
        mvc.perform(get("/admin/app-versions")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "MODERATOR")
    void rejectsModeratorsFromTheAppVersionAdministration() throws Exception {
        mvc.perform(get("/admin/app-versions")).andExpect(status().isForbidden());
        mvc.perform(get("/admin/app-versions/IOS")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void letsAdministratorsReadTheAppVersionAdministration() throws Exception {
        mvc.perform(get("/admin/app-versions")).andExpect(status().isOk());
    }

    @Test
    void keepsBasicHealthPublicAndOperationalMetricsPrivate() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "MODERATOR")
    void rejectsOperationalMetricsForNonAdminAccounts() throws Exception {
        mvc.perform(get("/actuator/metrics")).andExpect(status().isForbidden());
        mvc.perform(get("/actuator/info")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void allowsAdministratorsToInspectOperationalMetrics() throws Exception {
        mvc.perform(get("/actuator/metrics")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void letsAdministratorsUseModerationRoutes() throws Exception {
        mvc.perform(get("/admin/wine-submissions"))
                .andExpect(status().isOk());
    }

}

@TestComponent
@RestController
class SecurityProbeController {
    @GetMapping({"/legal/terms/current", "/legal/terms/versions/v1", "/auth/reset-password/validate"})
    String publicInformation() { return "public-information"; }

    @GetMapping({"/actuator/health", "/actuator/metrics", "/actuator/info"})
    String operational() { return "probe"; }

    @GetMapping({"/wines/{wineId}/reviews", "/wines/{wineId}/similar"})
    String nestedWine() { return "private-content"; }

    @GetMapping("/error-probe")
    ResponseEntity<Void> errorProbe() {
        return ResponseEntity.status(403).build();
    }

    @GetMapping("/wines")
    String wines() {
        return "wines";
    }

    @GetMapping({"/wines/submissions", "/wines/submissions/{id}"})
    String submissions() {
        return "submissions";
    }

    @GetMapping("/admin/wine-submissions")
    String adminSubmissions() {
        return "admin";
    }

    @GetMapping({"/app-versions/minimum", "/admin/app-versions", "/admin/app-versions/IOS"})
    String appVersions() {
        return "app-versions";
    }
}
